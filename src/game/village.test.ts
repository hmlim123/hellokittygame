import { describe, it, expect } from "vitest";
import { createGameStore } from "./store";
import {
  normalizeVillage,
  VILLAGE_PLACES,
  VILLAGE_ACTIONS,
  VILLAGE_SPAWN,
  villagePath,
  villageWalkable,
  moveVillage,
  villageKeepsakes,
  villageApproach,
} from "./village";
import { straightVillagePath } from "../../shared/village-world.mjs";
import { parseBackup, serializeBackup } from "./backup";
const memory = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) || null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
  };
};
function game() {
  const storage = memory(),
    store = createGameStore(storage);
  store.getState().enterVillage();
  store.getState().setSceneReady(true);
  return { store, storage };
}
function go(store: ReturnType<typeof createGameStore>, id: string) {
  const o = VILLAGE_ACTIONS.find((o) => o.id === id)!;
  const p = villageApproach(o);
  store.getState().saveVillagePosition(p.x, p.z, 0);
}
describe("open village navigation", () => {
  it("connects every landmark with a route that stays outside buildings and the fountain", () => {
    for (const a of VILLAGE_PLACES)
      for (const b of VILLAGE_PLACES) {
        const route = villagePath(a, b);
        expect(route.length).toBeGreaterThan(0);
        let from = a;
        for (const p of route) {
          expect(villageWalkable(p.x, p.z)).toBe(true);
          expect(straightVillagePath(from, p)).toBe(true);
          from = { ...a, ...p };
        }
        expect(route.at(-1)).toEqual({ x: b.x, z: b.z });
      }
  });
  it("rejects a ground tap inside a building, outside the village or on a flower bed", () => {
    for (const p of [
      { x: -7, z: -6 },
      { x: 0, z: -0.6 },
      { x: 6, z: 5.7 },
      { x: 99, z: 0 },
      { x: NaN, z: 0 },
    ])
      expect(villagePath(VILLAGE_SPAWN, p)).toEqual([]);
  });
  it("keeps continuous walking outside walls at low and high frame rates", () => {
    for (const fps of [15, 30, 60, 120]) {
      let p = { x: 0, z: 3 };
      for (let i = 0; i < fps * 3; i++) p = moveVillage(p, 0, -2.65 / fps);
      expect(p.z).toBeGreaterThan(1.1);
      expect(p.z).toBeLessThan(1.4);
      expect(villageWalkable(p.x, p.z)).toBe(true);
    }
  });
  it("slides along a building rather than stopping a diagonal walk completely", () => {
    let p = { x: -3.9, z: -4.3 };
    for (let i = 0; i < 120; i++) p = moveVillage(p, -0.025, -0.025);
    expect(villageWalkable(p.x, p.z)).toBe(true);
    expect(p.z).toBeLessThan(-6.5);
    expect(p.x).toBeGreaterThan(-4.15);
  });
});
describe("village life and the trip home", () => {
  it("migrates old progress into a safe village spawn without changing the old adventure", () => {
    const { store } = game(),
      a = structuredClone(store.getState().adventure);
    expect(store.getState().mode).toBe("village");
    expect(store.getState().cozy.village.x).toBe(VILLAGE_SPAWN.x);
    expect(store.getState().adventure).toEqual(a);
    expect(normalizeVillage({ x: Infinity, z: 0, yaw: NaN }).x).toBe(
      VILLAGE_SPAWN.x,
    );
  });
  it("requires walking to Momo, remembers the greeting and grants one welcome keepsake", () => {
    const { store } = game();
    store.getState().villageHello("momo");
    expect(store.getState().dialogue).toBeNull();
    go(store, "momo");
    store.getState().villageHello("momo");
    expect(store.getState().dialogue?.source?.type).toBe("VM");
    store.getState().closeDialogue();
    store.getState().villageHello("momo");
    expect(store.getState().cozy.village.greeted).toEqual(["momo"]);
    expect(
      villageKeepsakes(store.getState().cozy.village).map((k) => k.id),
    ).toEqual(["welcome"]);
    expect(store.getState().cozy.friends.momo.visits).toBe(2);
  });
  it("blooms three beds and grants a single flower pot, with no timer or repeat reward", () => {
    const { store } = game();
    store.getState().villageWater(0);
    expect(store.getState().cozy.village.flowers).toEqual([
      false,
      false,
      false,
    ]);
    for (let i = 0; i < 3; i++) {
      go(store, "flowers" + i);
      store.getState().villageWater(i);
    }
    expect(
      villageKeepsakes(store.getState().cozy.village).map((k) => k.id),
    ).toEqual(["flowers"]);
    store.getState().villageWater(2);
    expect(villageKeepsakes(store.getState().cozy.village)).toHaveLength(1);
  });
  it("wraps a decorated cookie and delivers it only once to a nearby friend", () => {
    const { store } = game(),
      s = store.getState();
    go(store, "cafe");
    s.openPanel("baking");
    s.newCookie();
    s.cookieStage("decorate");
    s.stampCookie("heart");
    s.cookieStage("give");
    s.packVillageCookie();
    expect(store.getState().cozy.cookie.packed).toBe(true);
    s.villageGift("momo");
    expect(store.getState().cozy.village.gifts.momo).toBe(0);
    go(store, "momo");
    s.villageGift("momo");
    s.villageGift("momo");
    expect(store.getState().cozy.village.gifts.momo).toBe(1);
    expect(store.getState().cozy.cookie.packed).toBe(false);
    expect(store.getState().cozy.friends.momo.last?.stamps).toHaveLength(1);
    expect(
      villageKeepsakes(store.getState().cozy.village).map((k) => k.id),
    ).toContain("cafe");
  });
  it("places earned memories, swaps occupied spots and preserves them on reload", () => {
    const { store, storage } = game(),
      s = store.getState();
    s.placeVillageKeepsake("cafe", "table");
    expect(store.getState().cozy.village.placed).toEqual({});
    go(store, "momo");
    s.villageHello("momo");
    s.closeDialogue();
    for (let i = 0; i < 3; i++) {
      go(store, "flowers" + i);
      s.villageWater(i);
    }
    s.placeVillageKeepsake("welcome", "nook");
    s.placeVillageKeepsake("flowers", "window");
    s.placeVillageKeepsake("welcome", "window");
    expect(store.getState().cozy.village.placed).toEqual({
      welcome: "window",
      flowers: "nook",
    });
    s.setMode("room");
    expect(store.getState().cozy.village.returned).toBe(true);
    const again = createGameStore(storage);
    expect(again.getState().cozy.village.placed).toEqual({
      welcome: "window",
      flowers: "nook",
    });
  });
  it("includes village progress in the existing backup and restore format", () => {
    const { store } = game();
    go(store, "pip");
    store.getState().villageHello("pip");
    const state = store.getState(),
      backup = parseBackup(serializeBackup(state));
    expect(backup.cozy.village).toEqual(state.cozy.village);
    expect(backup.adventure).toEqual(state.adventure);
    expect(backup.equipment).toEqual(state.equipment);
  });
});
