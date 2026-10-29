import { describe, it, expect } from "vitest";
import { createGameStore } from "./store";
import { migrateLegacy, type StorageLike } from "./storage";
function memory(values: Record<string, unknown> = {}) {
  const data = new Map(
    Object.entries(values).map(([k, v]) => [k, JSON.stringify(v)]),
  );
  let writes = 0;
  const storage: StorageLike = {
    getItem: (k) => data.get(k) || null,
    setItem: (k, v) => {
      data.set(k, v);
      writes++;
    },
    removeItem: (k) => {
      data.delete(k);
    },
  };
  return { storage, data, writes: () => writes };
}
describe("Zustand save migration", () => {
  it("migrates quests, earned clothes, collections, keepsakes and the sealed letter preference", () => {
    const m = memory({
      "kitty-room-3d-v1": { owned: [0, 2], selected: 2, theme: "mint" },
      "kitty-picnic-v1": { owned: [4] },
      "kitty-nancy-adventure-v1": {
        accepted: true,
        charms: ["honey"],
        ribbons: ["rose", "sky", "honey"],
        ribbonReturned: true,
      },
      "kitty-nancy-equipment-v1": { outfit: "berry", item: "teddy" },
      "kitty-room-preferences-v1": { relaxed: true, letterOpened: true },
      "kitty-nancy-missions-v1": { completed: { bows: 2 } },
    });
    const s = createGameStore(m.storage).getState();
    expect(s.room.owned).toEqual([0, 2, 4]);
    expect(s.room.theme).toBe("mint");
    expect(s.equipment).toMatchObject({ outfit: "berry", item: "teddy" });
    expect(s.adventure.ribbonReturned).toBe(true);
    expect(s.journal.completed.bows).toBe(2);
    expect(s.preferences).toMatchObject({ relaxed: true, letterOpened: true });
  });
  it("keeps classic-version progress made after a modern save and preserves unrelated older features", () => {
    const m = memory({ "kitty-adventures-v1": { balance: 55 } }),
      first = createGameStore(m.storage);
    first.getState().equip("outfit", "sailor");
    m.data.set(
      "kitty-nancy-adventure-v1",
      JSON.stringify({ accepted: true, charms: ["honey"] }),
    );
    m.data.set(
      "kitty-nancy-equipment-v1",
      JSON.stringify({ outfit: "picnic", item: "letter" }),
    );
    const second = createGameStore(m.storage).getState();
    expect(second.equipment.outfit).toBe("picnic");
    expect(second.adventure.charms).toEqual(["honey"]);
    expect(JSON.parse(m.data.get("kitty-adventures-v1")!)).toEqual({
      balance: 55,
    });
  });
  it("persists durable state but avoids writes for animation and chat frames", () => {
    const m = memory(),
      store = createGameStore(m.storage);
    store.getState().react("wave");
    const writes = m.writes();
    store.getState().react("hug");
    store.getState().chat("hello");
    store.getState().openPanel("settings");
    expect(m.writes()).toBe(writes);
    store.getState().equip("outfit", "sailor");
    expect(m.writes()).toBeGreaterThan(writes);
    const s = createGameStore(m.storage).getState();
    expect(s.equipment.outfit).toBe("sailor");
    expect(s.messages).toEqual([]);
    expect(s.panel).toBe(null);
  });
  it("repairs corrupt saves and remains playable when storage is blocked", () => {
    const m = memory();
    m.data.set("kitty-world-v2", "{broken");
    m.data.set("kitty-room-3d-v1", "17");
    expect(createGameStore(m.storage).getState().room.owned).toEqual([0]);
    const store = createGameStore({
      getItem: () => {
        throw Error("blocked");
      },
      setItem: () => {
        throw Error("blocked");
      },
    });
    store.getState().equip("outfit", "sailor");
    expect(store.getState().equipment.outfit).toBe("sailor");
    expect(store.getState().saveFailed).toBe(true);
  });
});
describe("typed game transitions", () => {
  it("gates earned outfits and keeps the room and adventure on one equipment state", () => {
    const m = memory(),
      store = createGameStore(m.storage);
    store.getState().equip("outfit", "moonlight");
    expect(store.getState().equipment.outfit).toBe("classic");
    store.getState().equip("outfit", "sailor");
    store.getState().setMode("adventure");
    expect(store.getState().equipment.outfit).toBe("sailor");
    store.getState().equip("item", "none");
    store.getState().setMode("room");
    expect(store.getState().equipment.item).toBe("none");
  });
  it("commits a successful physics step and rejects a blocked one without losing tile alignment", () => {
    const store = createGameStore(memory().storage);
    store.getState().setMode("adventure");
    store.getState().setSceneReady(true);
    store.getState().requestMove("left");
    store.getState().finishMove(false);
    expect(store.getState().adventure.x).toBe(6);
    store.getState().requestMove("left");
    store.getState().finishMove(true);
    expect(store.getState().adventure.x).toBe(6);
    expect(store.getState().physicsContacts).toBe(1);
  });
  it("the shrine grants its friend exactly once, including after reload", () => {
    const m = memory({
        "kitty-nancy-adventure-v1": {
          accepted: true,
          map: "garden",
          x: 7,
          z: 3,
          facing: "up",
          charms: ["rose", "honey", "sky"],
          guardian: true,
          gate: true,
        },
      }),
      store = createGameStore(m.storage);
    store.getState().interact();
    expect(store.getState().adventure.complete).toBe(true);
    expect(store.getState().room.owned).toHaveLength(2);
    store.getState().closeDialogue();
    store.getState().interact();
    expect(store.getState().room.owned).toHaveLength(2);
    expect(createGameStore(m.storage).getState().room.adventureRewarded).toBe(
      true,
    );
  });
  it("finishing a mission records its keepsake and a room friend, without duplicate rewards", () => {
    const store = createGameStore(memory().storage);
    store.getState().startMission("bows");
    for (let i = 0; i < 8; i++) store.getState().missionAction(i % 4);
    expect(store.getState().mission).toBe(null);
    expect(store.getState().journal.completed.bows).toBe(1);
    expect(store.getState().room.owned).toHaveLength(2);
    store.getState().missionAction(0);
    expect(store.getState().room.owned).toHaveLength(2);
  });
  it("same-mode navigation preserves readiness and mission ownership precedes arrival", () => {
    const store = createGameStore(memory().storage);
    store.getState().setSceneReady(true);
    store.getState().setMode("room");
    expect(store.getState().sceneReady).toBe(true);
    store.getState().startMission("bows");
    for (let i = 0; i < 8; i++) store.getState().missionAction(0);
    expect(store.getState().arrival).not.toBe(null);
    expect(store.getState().room.owned).toHaveLength(2);
    expect(store.getState().result).toBe(null);
    store.getState().finishArrival();
    expect(store.getState().result).not.toBe(null);
    store.getState().finishArrival();
    expect(store.getState().room.owned).toHaveLength(2);
  });
  it("local chat drives a character reaction while retaining only the current conversation", () => {
    const store = createGameStore(memory().storage);
    store.getState().chat("I am sad today");
    expect(store.getState().gesture.kind).toBe("hug");
    expect(store.getState().messages).toHaveLength(2);
    expect(store.getState().messages[1].text).toContain("Nancy");
  });
});
