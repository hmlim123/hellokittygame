import { describe, it, expect } from "vitest";
import { createGameStore } from "./store";
import { MAPS, normalizeAdventure } from "./domain";
import { canTalkToNpc, preferredNpc } from "./npc";
import { parseBackup } from "./backup";
import type { StorageLike } from "./storage";
function memory() {
  const data = new Map<string, string>();
  let fail = "";
  const storage: StorageLike = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      if (k === fail) throw Error("blocked");
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
  };
  return {
    data,
    storage,
    fail: (key: string) => {
      fail = key;
    },
  };
}
describe("easy conversations", () => {
  it("lets Momo hear Kitty from three clear tiles away, including diagonals without facing her", () => {
    const momo = MAPS.village.objects.find((o) => o.type === "M")!;
    for (const [x, z] of [
      [5, 8],
      [6, 6],
    ])
      expect(
        canTalkToNpc(normalizeAdventure({ x, z, facing: "down" }), momo),
      ).toBe(true);
    expect(canTalkToNpc(normalizeAdventure({ x: 9, z: 8 }), momo)).toBe(false);
    expect(canTalkToNpc(normalizeAdventure({ x: 5, z: 8 }), { ...momo })).toBe(
      false,
    );
  });
  it("does not talk through walls or steal a nearby puzzle", () => {
    const momo = MAPS.village.objects.find((o) => o.type === "M")!;
    const a = normalizeAdventure({ x: 7, z: 6 });
    const guardian = MAPS.garden.objects.find((o) => o.type === "Q")!;
    expect(
      canTalkToNpc(
        normalizeAdventure({ map: "garden", accepted: true, x: 8, z: 4 }),
        guardian,
      ),
    ).toBe(false);
    expect(
      canTalkToNpc(
        normalizeAdventure({ map: "garden", accepted: true, x: 7, z: 6 }),
        guardian,
      ),
    ).toBe(true);
    const target = MAPS.village.objects.find((o) => o.type === "R")!;
    expect(preferredNpc(a, target)).toBeUndefined();
    expect(
      canTalkToNpc(
        normalizeAdventure({ map: "garden", accepted: true, x: 8, z: 3 }),
        momo,
      ),
    ).toBe(false);
  });
  it("opens one persistent conversation, supports choices and leaves quests unchanged when out of range", () => {
    const m = memory();
    m.data.set(
      "kitty-nancy-adventure-v1",
      JSON.stringify({ x: 5, z: 8, facing: "down" }),
    );
    const store = createGameStore(m.storage),
      s = store.getState(),
      momo = MAPS.village.objects.find((o) => o.type === "M")!;
    s.setMode("adventure");
    s.setSceneReady(true);
    s.talkToNpc(momo);
    expect(store.getState().dialogue?.speaker).toBe("Momo");
    expect(store.getState().adventure.accepted).toBe(false);
    s.interact("accept");
    expect(store.getState().adventure.accepted).toBe(true);
    expect(store.getState().dialogue?.speaker).toBe("Momo");
    s.closeDialogue();
    expect(store.getState().dialogue).toBeNull();
    store.setState({
      adventure: { ...store.getState().adventure, x: 12, z: 9 },
    });
    s.talkToNpc(momo);
    expect(store.getState().dialogue).toBeNull();
  });
});
describe("a fresh gift visit", () => {
  it("resets modern progress and the merged collection, retains a restorable backup and leaves other sites alone", () => {
    const m = memory();
    m.data.set("kitty-picnic-v1", JSON.stringify({ owned: [0, 2, 4] }));
    m.data.set("kitty-adventures-v1", JSON.stringify({ balance: 40 }));
    m.data.set("other-game", "keep");
    const store = createGameStore(m.storage),
      s = store.getState();
    s.equip("outfit", "sailor");
    s.setPreferences({ letterOpened: true });
    s.setMode("adventure");
    expect(s.resetProgress().ok).toBe(true);
    let fresh = store.getState();
    expect(fresh.mode).toBe("room");
    expect(fresh.room.owned).toEqual([0]);
    expect(fresh.equipment.outfit).toBe("classic");
    expect(fresh.adventure.accepted).toBe(false);
    expect(fresh.preferences.letterOpened).toBe(false);
    expect(fresh.cozy.cookiesGiven).toBe(0);
    expect(fresh.cozy.postcards).toEqual([]);
    const old = parseBackup(s.previousBackup()!);
    expect(old.room.owned).toEqual([0, 2, 4]);
    expect(old.equipment.outfit).toBe("sailor");
    expect(m.data.get("other-game")).toBe("keep");
    expect(JSON.parse(m.data.get("kitty-adventures-v1")!)).toEqual({
      balance: 40,
    });
    fresh = createGameStore(m.storage).getState();
    expect(fresh.room.owned).toEqual([0]);
    expect(fresh.adventure.map).toBe("village");
    expect(fresh.equipment.outfit).toBe("classic");
    expect(s.restoreBackup(s.previousBackup()!).ok).toBe(true);
    expect(store.getState().equipment.outfit).toBe("sailor");
  });
  it("rolls back a failed reset and keeps the live game intact", () => {
    const m = memory(),
      store = createGameStore(m.storage);
    store.getState().equip("outfit", "sailor");
    m.data.set("kitty-picnic-v1", JSON.stringify({ owned: [0, 3] }));
    const before = new Map(m.data);
    m.fail("kitty-nancy-cozy-v1");
    expect(store.getState().resetProgress().ok).toBe(false);
    expect(store.getState().equipment.outfit).toBe("sailor");
    expect(m.data.get("kitty-picnic-v1")).toBe(before.get("kitty-picnic-v1"));
    expect(m.data.get("kitty-world-v2")).toBe(before.get("kitty-world-v2"));
  });
});
