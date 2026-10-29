import { describe, it, expect } from "vitest";
import { createGameStore } from "./store";
import { normalizeAdventure } from "./domain";
import { nearbyItemAction, nearbyLabel } from "./context-action";
import {
  parseBackup,
  serializeBackup,
  commitRestoredSave,
  PREVIOUS_BACKUP,
  BACKUP_LIMIT,
} from "./backup";
import { migrateLegacy, type StorageLike } from "./storage";
function memory(values: Record<string, unknown> = {}) {
  const data = new Map(
    Object.entries(values).map(([k, v]) => [k, JSON.stringify(v)]),
  );
  return {
    data,
    getItem: (k: string) => data.get(k) || null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
  };
}
const flowers = { map: "glade", x: 5, z: 6, chapter: { butterflyStep: 3 } };
describe("nearby item actions", () => {
  it("offers only adjacent ready actions, with one item and no early bridge repair", () => {
    const s = normalizeAdventure(flowers);
    expect(nearbyItemAction(s)?.item).toBe("watering");
    s.x = 6;
    s.z = 8;
    expect(nearbyItemAction(s)).toBe(null);
    s.chapter.flowersRevived = true;
    expect(nearbyItemAction(s)?.item).toBe("ribbon");
    s.x = 8;
    expect(nearbyItemAction(s)?.item).toBe("ribbon");
    s.x = 10;
    s.z = 10;
    expect(nearbyItemAction(s)).toBe(null);
  });
  it("equips and uses the item once, saves its result, and starts the matching animation", () => {
    const m = memory({ "kitty-nancy-adventure-v1": flowers }),
      store = createGameStore(m);
    store.getState().setMode("adventure");
    store.getState().setSceneReady(true);
    store.getState().useNearbyItem();
    expect(store.getState().equipment.item).toBe("watering");
    expect(store.getState().adventure.chapter.flowersRevived).toBe(true);
    expect(store.getState().effect?.kind).toBe("water");
    const id = store.getState().effect?.id;
    store.getState().useNearbyItem();
    expect(store.getState().effect?.id).toBe(id);
    expect(createGameStore(m).getState().adventure.chapter.flowersRevived).toBe(
      true,
    );
    expect(createGameStore(m).getState().effect).toBe(null);
  });
  it("does not use a stale prompt while moving or in a modal", () => {
    const store = createGameStore(
      memory({ "kitty-nancy-adventure-v1": flowers }),
    );
    store.getState().setMode("adventure");
    store.getState().setSceneReady(true);
    store.getState().openPanel("settings");
    store.getState().useNearbyItem();
    expect(store.getState().adventure.chapter.flowersRevived).toBe(false);
    store.getState().closePanel();
    store.getState().requestMove("left");
    store.getState().useNearbyItem();
    expect(store.getState().adventure.chapter.flowersRevived).toBe(false);
  });
  it("keeps distant labels quiet while preserving a longer range for entrances", () => {
    expect(nearbyLabel({ x: 2, z: 2 }, { x: 8, z: 5 })).toBe(false);
    expect(nearbyLabel({ x: 2, z: 2 }, { x: 4, z: 3 })).toBe(true);
    expect(nearbyLabel({ x: 2, z: 2 }, { x: 6, z: 2 }, true)).toBe(true);
  });
});
describe("progress backups", () => {
  it("exports durable state only and restores cross-device gear, quests and preferences", () => {
    const a = createGameStore(memory({ "kitty-nancy-adventure-v1": flowers }));
    a.getState().equip("item", "lantern");
    a.getState().setPreferences({ relaxed: true });
    a.getState().chat("a private little chat");
    a.getState().footstep();
    const text = serializeBackup(a.getState());
    expect(text).not.toContain("private little chat");
    expect(text).not.toContain("stepPulse");
    expect(text).not.toContain("sceneReady");
    const b = createGameStore(memory());
    expect(b.getState().restoreBackup(text).ok).toBe(true);
    expect(b.getState().equipment.item).toBe("lantern");
    expect(b.getState().adventure.chapter.butterflyStep).toBe(3);
    expect(b.getState().preferences.relaxed).toBe(true);
    expect(b.getState().worldRevision).toBe(1);
    expect(b.getState().messages).toEqual([]);
  });
  it("rejects unrelated, broken, oversized and future files without changing the current game", () => {
    const store = createGameStore(memory());
    store.getState().equip("outfit", "sailor");
    for (const text of [
      "{broken",
      "{}",
      JSON.stringify({ format: "nancy-kitty-save", version: 99, data: {} }),
      " ".repeat(BACKUP_LIMIT + 1),
    ]) {
      expect(store.getState().restoreBackup(text).ok).toBe(false);
      expect(store.getState().equipment.outfit).toBe("sailor");
      expect(store.getState().worldRevision).toBe(0);
    }
  });
  it("retains the previous save and leaves unrelated wallet data intact", () => {
    const m = memory({ "kitty-adventures-v1": { balance: 55 } }),
      store = createGameStore(m);
    store.getState().equip("outfit", "sailor");
    const before = serializeBackup(store.getState());
    store.getState().equip("item", "teddy");
    expect(store.getState().restoreBackup(before).ok).toBe(true);
    expect(parseBackup(m.getItem(PREVIOUS_BACKUP)!).equipment.item).toBe(
      "teddy",
    );
    expect(JSON.parse(m.getItem("kitty-adventures-v1")!).balance).toBe(55);
    expect(createGameStore(m).getState().equipment.outfit).toBe("sailor");
  });
  it("repairs impossible quest unlocks and rolls back partial storage writes on failure", () => {
    const m = memory(),
      current = migrateLegacy(m),
      next = parseBackup(
        serializeBackup({
          ...current,
          adventure: normalizeAdventure({
            ...flowers,
            chapter: { bridgeFixed: true, endingSeen: true },
          }),
        }),
      );
    expect(next.adventure.chapter.bridgeFixed).toBe(false);
    expect([next.adventure.x, next.adventure.z]).toEqual([2, 10]);
    let once = true;
    const fail: StorageLike = {
      ...m,
      setItem: (k, v) => {
        if (k === "kitty-nancy-equipment-v1" && once) {
          once = false;
          throw Error("quota");
        }
        m.setItem(k, v);
      },
    };
    expect(() => commitRestoredSave(fail, current, next)).toThrow(
      "current game has not changed",
    );
    expect(m.data.size).toBe(0);
  });
});
