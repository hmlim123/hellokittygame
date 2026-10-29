import { describe, it, expect } from "vitest";
import {
  normalizeAdventure,
  MAPS,
  walkable,
  moveAdventure,
  interactAdventure,
  EncounterTracker,
  normalizeEquipment,
  directions,
} from "./domain";
import {
  normalizeChapter,
  STAR_ORDER,
  memoryPages,
  endingUnlocked,
} from "./chapter";
import { createGameStore } from "./store";
import type { StorageLike } from "./storage";
import type { Adventure, Equipment } from "./types";
function storage(values: Record<string, unknown> = {}) {
  const data = new Map(
    Object.entries(values).map(([k, v]) => [k, JSON.stringify(v)]),
  );
  return {
    data,
    getItem: (k: string) => data.get(k) || null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  } satisfies StorageLike & { data: Map<string, string> };
}
const e = (item: Equipment["item"]): Equipment => ({
  version: 1,
  outfit: "classic",
  item,
});
function at(s: Adventure, type: string, id?: string) {
  const o = MAPS.glade.objects.find(
    (o) => o.type === type && (id === undefined || o.id === id),
  )!;
  s.x = o.x - 1;
  s.z = o.z;
  return o;
}
function progress(s: Adventure) {
  for (let i = 0; i < 3; i++)
    interactAdventure(s, undefined, at(s, "L", String(i)), e("lantern"));
  interactAdventure(s, undefined, at(s, "W"), e("watering"));
  interactAdventure(s, undefined, at(s, "J"), e("ribbon"));
}
describe("Butterfly Glade chapter", () => {
  it("guides a new player to the first butterfly without directing them through the hidden hedge", () => {
    const s = normalizeAdventure({ map: "glade" });
    expect(directions(s)).toBe("↑ Butterflies · 1 step away");
    moveAdventure(s, "up");
    expect(directions(s)).toContain("right beside you");
  });
  it("inspecting an empty clearing gives a useful hint and never calls a legacy map handler", () => {
    const s = normalizeAdventure({ map: "glade", x: 2, z: 4 });
    expect(interactAdventure(s).text).toContain("Butterfly lantern");
    expect(s.map).toBe("glade");
  });
  it("migrates old completed adventures without granting the new chapter, and repairs invalid dependencies", () => {
    const s = normalizeAdventure({
      complete: true,
      accepted: true,
      charms: ["rose", "honey", "sky"],
      guardian: true,
      gate: true,
    });
    expect(s.complete).toBe(true);
    expect(s.chapter).toEqual(normalizeChapter(null, true));
    expect(memoryPages(s).find((p) => p.id === "moonflower")?.unlocked).toBe(
      true,
    );
    const broken = normalizeChapter(
      {
        bridgeFixed: true,
        stars: [...STAR_ORDER],
        friendAwake: true,
        letterFound: true,
        endingSeen: true,
      },
      true,
    );
    expect(broken.bridgeFixed).toBe(false);
    expect(broken.stars).toEqual([]);
    expect(broken.letterFound).toBe(false);
  });
  it("requires the right tool and butterfly order, keeps the path open after changing tools, and physically gates the bridge", () => {
    const s = normalizeAdventure({ map: "glade" });
    expect(s.map).toBe("glade");
    expect(walkable(s, 3, 7)).toBe(false);
    expect(walkable(s, 7, 8)).toBe(false);
    interactAdventure(s, undefined, at(s, "L", "1"), e("lantern"));
    expect(s.chapter.butterflyStep).toBe(0);
    interactAdventure(s, undefined, at(s, "L", "0"), e("watering"));
    expect(s.chapter.butterflyStep).toBe(0);
    interactAdventure(s, undefined, at(s, "L", "0"), e("lantern"));
    expect(walkable(s, 3, 7)).toBe(true);
    interactAdventure(s, undefined, at(s, "W"), e("watering"));
    expect(s.chapter.flowersRevived).toBe(false);
    for (const i of ["1", "2"])
      interactAdventure(s, undefined, at(s, "L", i), e("lantern"));
    interactAdventure(s, undefined, at(s, "W"), e("ribbon"));
    expect(s.chapter.flowersRevived).toBe(false);
    interactAdventure(s, undefined, at(s, "W"), e("watering"));
    interactAdventure(s, undefined, at(s, "J"), e("ribbon"));
    expect(walkable(s, 7, 8)).toBe(true);
    expect(walkable(s, 3, 7)).toBe(true);
  });
  it("connects the garden and glade with reachable return paths and preserves main quest progress", () => {
    const s = normalizeAdventure({
      map: "garden",
      accepted: true,
      charms: ["honey"],
      x: 13,
      z: 10,
    });
    expect(moveAdventure(s, "down").changedMap).toBe(true);
    expect(s.map).toBe("glade");
    expect(s.charms).toEqual(["honey"]);
    expect(moveAdventure(s, "left").changedMap).toBe(true);
    expect(s.map).toBe("garden");
    expect([s.x, s.z]).toEqual([13, 10]);
  });
  it("rearms a nearby tool interaction after equipping and never repeats completed pickups", () => {
    const s = normalizeAdventure({ map: "glade", x: 2, z: 9 }),
      tracker = new EncounterTracker();
    const o = tracker.take(s, e("flowers"))!;
    expect(o.type).toBe("L");
    interactAdventure(s, undefined, o, e("flowers"));
    expect(tracker.take(s, e("flowers"))).toBeUndefined();
    const ready = tracker.take(s, e("lantern"))!;
    interactAdventure(s, undefined, ready, e("lantern"));
    expect(s.chapter.butterflyStep).toBe(1);
    expect(tracker.take(s, e("lantern"))).toBeUndefined();
  });
  it("accepts ordered stars without penalizing mistakes, resumes after reload, and awards the letter once", () => {
    const s = normalizeAdventure({ map: "glade" });
    progress(s);
    s.x = 10;
    s.z = 6;
    const m = storage({ "kitty-nancy-adventure-v1": s }),
      store = createGameStore(m);
    store.getState().openPanel("stars");
    store.getState().arrangeStar("heart");
    expect(store.getState().adventure.chapter.stars).toEqual([]);
    store.getState().arrangeStar("moon");
    store.getState().arrangeStar("heart");
    expect(store.getState().adventure.chapter.stars).toEqual(["moon"]);
    const resumed = createGameStore(m);
    resumed.getState().openPanel("stars");
    resumed.getState().arrangeStar("flower");
    resumed.getState().arrangeStar("heart");
    expect(resumed.getState().adventure.chapter.stars).toEqual([...STAR_ORDER]);
    expect(resumed.getState().panel).toBe(null);
    const next = resumed.getState().adventure;
    interactAdventure(next, undefined, at(next, "N"), e("none"));
    expect(next.chapter.friendAwake).toBe(false);
    interactAdventure(next, undefined, at(next, "N"), e("teddy"));
    const found = interactAdventure(next, undefined, at(next, "K"), e("teddy"));
    expect(found.chime).toBe(true);
    expect(
      interactAdventure(next, undefined, at(next, "K"), e("teddy")).chime,
    ).toBeUndefined();
    expect(endingUnlocked(next)).toBe(false);
  });
  it("requires completion before the picnic, saves its memory once, and preserves every souvenir on reload", () => {
    const s = normalizeAdventure({
        map: "glade",
        accepted: true,
        charms: ["rose", "honey", "sky"],
        guardian: true,
        gate: true,
        complete: true,
        chapter: {
          butterflyStep: 3,
          flowersRevived: true,
          bridgeFixed: true,
          stars: [...STAR_ORDER],
          friendAwake: true,
          letterFound: true,
        },
      }),
      m = storage({ "kitty-nancy-adventure-v1": s }),
      store = createGameStore(m);
    expect(endingUnlocked(s)).toBe(true);
    store.getState().finishEnding();
    store.getState().finishEnding();
    expect(
      memoryPages(store.getState().adventure).filter(
        (p) => p.id === "ending" && p.unlocked,
      ),
    ).toHaveLength(1);
    expect(createGameStore(m).getState().adventure.chapter.endingSeen).toBe(
      true,
    );
  });
  it("keeps modern chapter memories when the classic version writes an older save, and keeps tools equipped", () => {
    const m = storage(),
      store = createGameStore(m);
    store.getState().savePostcard();
    store.getState().equip("item", "watering");
    m.data.set(
      "kitty-nancy-adventure-v1",
      JSON.stringify({ accepted: true, charms: ["honey"] }),
    );
    const restored = createGameStore(m).getState();
    expect(restored.adventure.chapter.postcardSaved).toBe(true);
    expect(restored.adventure.charms).toEqual(["honey"]);
    expect(restored.equipment.item).toBe("watering");
    expect(normalizeEquipment({ item: "not-a-tool" }).item).toBe("flowers");
  });
});
