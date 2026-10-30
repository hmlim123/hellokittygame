import { describe, it, expect } from "vitest";
import { createGameStore } from "./store";
function fixture(failKey: string | null = null) {
  const data = new Map<string, string>();
  let writes = 0,
    blocked = failKey;
  const store = createGameStore({
    getItem: (k) => data.get(k) || null,
    setItem: (k, v) => {
      writes++;
      if (k === blocked) throw Error("quota");
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
  });
  return {
    store,
    data,
    writes: () => writes,
    recover: () => {
      blocked = null;
    },
  };
}
describe("dependable saves and safe refresh", () => {
  for (const key of ["kitty-world-v2", "kitty-nancy-equipment-v1"])
    it(`reports and recovers a failure writing ${key}`, () => {
      const f = fixture(key);
      f.store.getState().equip("outfit", "sailor");
      expect(f.store.getState().saveFailed).toBe(true);
      expect(f.store.getState().equipment.outfit).toBe("sailor");
      expect(f.writes()).toBeLessThan(20);
      f.recover();
      expect(f.store.getState().retrySave()).toBe(true);
      expect(f.store.getState().lastSavedAt).not.toBe(null);
      expect(
        JSON.parse(f.data.get("kitty-world-v2")!).state.equipment.outfit,
      ).toBe("sailor");
      const writes = f.writes(),
        last = f.store.getState().lastSavedAt;
      f.store.getState().react("wave");
      f.store.getState().footstep();
      expect(f.writes()).toBe(writes);
      expect(f.store.getState().lastSavedAt).toBe(last);
    });
  it("rehydrates new coordinates atomically and stops the old physics command", async () => {
    const f = fixture(),
      s = f.store;
    s.getState().setMode("adventure");
    s.getState().setSceneReady(true);
    s.getState().holdMove("right");
    const revision = s.getState().worldRevision;
    f.data.set(
      "kitty-nancy-adventure-v1",
      JSON.stringify({
        ...s.getState().adventure,
        map: "garden",
        accepted: true,
        x: 10,
        z: 10,
      }),
    );
    await s.persist.rehydrate();
    expect(s.getState().adventure).toMatchObject({
      map: "garden",
      accepted: true,
      x: 10,
      z: 10,
    });
    expect(s.getState().worldRevision).toBe(revision + 1);
    expect(s.getState()).toMatchObject({
      sceneReady: false,
      moving: false,
      heldDirection: null,
      moveCommand: null,
    });
    s.getState().setSceneReady(true);
    const next = s.getState().worldRevision;
    await s.persist.rehydrate();
    expect(s.getState().worldRevision).toBe(next);
    expect(s.getState().sceneReady).toBe(true);
  });
  it("preserves repaired chapter outfits and new preferences when classic omits those fields", async () => {
    const f = fixture(),
      s = f.store;
    f.data.set(
      "kitty-nancy-adventure-v1",
      JSON.stringify({
        map: "glade",
        x: 5,
        z: 6,
        chapter: { butterflyStep: 3, flowersRevived: true },
      }),
    );
    await s.persist.rehydrate();
    s.getState().equip("outfit", "blossom");
    s.getState().setPreferences({ quality: "gentle", motion: "reduce" });
    const raw = JSON.parse(f.data.get("kitty-nancy-adventure-v1")!);
    delete raw.chapter;
    f.data.set("kitty-nancy-adventure-v1", JSON.stringify(raw));
    f.data.set("kitty-room-preferences-v1", JSON.stringify({ relaxed: true }));
    await s.persist.rehydrate();
    expect(s.getState().adventure.chapter.flowersRevived).toBe(true);
    expect(s.getState().equipment.outfit).toBe("blossom");
    expect(s.getState().preferences).toMatchObject({
      quality: "gentle",
      motion: "reduce",
      relaxed: true,
    });
  });
});
