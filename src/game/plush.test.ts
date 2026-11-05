import { describe, it, expect } from "vitest";
import { createGameStore } from "./store";
import { normalizeEquipment } from "./domain";
import { normalizeCozy } from "./cozy";
import { serializeBackup, parseBackup } from "./backup";
import type { PlushId } from "./types";
function memory() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => {
      m.set(k, v);
    },
    removeItem: (k: string) => {
      m.delete(k);
    },
  };
}
describe("shared Blender plush collection", () => {
  it("keeps the old equipment schema exact and rejects unknown models", () => {
    expect(normalizeEquipment({ outfit: "sailor", item: "none" })).toEqual({
      version: 1,
      outfit: "sailor",
      item: "none",
    });
    expect(
      normalizeEquipment({ plush: "unknown", outfit: "classic", item: "none" }),
    ).toEqual({ version: 1, outfit: "classic", item: "none" });
  });
  it("saves each real edition without changing clothes, items or earned adventure progress", () => {
    const storage = memory(),
      st = createGameStore(storage),
      s = st.getState();
    s.equip("outfit", "sailor");
    s.equip("item", "strawberry");
    const adventure = structuredClone(st.getState().adventure),
      room = structuredClone(st.getState().room);
    for (const id of [
      "cloud",
      "witch",
      "baby",
      "kitten",
      "bunny",
    ] as PlushId[]) {
      s.setPlush(id);
      expect(st.getState().equipment).toMatchObject({
        plush: id,
        outfit: "sailor",
        item: "strawberry",
      });
      expect(createGameStore(storage).getState().equipment.plush).toBe(id);
      expect(st.getState().adventure).toEqual(adventure);
      expect(st.getState().room).toEqual(room);
      expect(parseBackup(serializeBackup(st.getState())).equipment.plush).toBe(
        id,
      );
    }
  });
  it("retains the plush when dressing or travelling and safely returns to original Kitty", () => {
    const st = createGameStore(memory()),
      s = st.getState();
    s.setPlush("kitten");
    s.equip("outfit", "sailor");
    s.setMode("adventure");
    s.setMode("room");
    expect(st.getState().equipment.plush).toBe("kitten");
    s.setPlush("invented");
    expect(st.getState().equipment.plush).toBe("kitten");
    s.setPlush("classic");
    expect(st.getState().equipment).not.toHaveProperty("plush");
    expect(st.getState().equipment.outfit).toBe("sailor");
  });
  it("keeps the photographed plush in a keepsake and sanitizes invalid postcard styles", () => {
    const card = {
      id: "plush-memory",
      image: "data:image/jpeg;base64,YQ==",
      createdAt: "2026-11-05T12:00:00.000Z",
      outfit: "classic",
      plush: "bunny",
      background: "Rose milk",
      place: "Kitty’s room",
      pose: "wink",
    };
    expect(normalizeCozy({ postcards: [card] }).postcards[0].plush).toBe(
      "bunny",
    );
    expect(
      normalizeCozy({ postcards: [{ ...card, plush: "unknown" }] })
        .postcards[0],
    ).not.toHaveProperty("plush");
  });
});
