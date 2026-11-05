import { describe, it, expect } from "vitest";
import {
  FRIEND_TALES,
  advanceTale,
  newTale,
  normalizeTales,
} from "./friend-tales";
import { createGameStore } from "./store";
import { serializeBackup, parseBackup } from "./backup";
const memory = () => {
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
};
function finish(
  store: ReturnType<typeof createGameStore>,
  id: (typeof FRIEND_TALES)[number]["id"],
) {
  const tale = FRIEND_TALES.find((t) => t.id === id)!;
  store.getState().startFriendTale(id);
  for (const step of tale.steps)
    for (const token of step.tokens)
      expect(store.getState().playFriendTale(token)).toBe(true);
  store.getState().finishFriendTale();
  store.getState().finishArrival();
  store.getState().closeResult();
}
describe("five friendship stories and the actual shelf collection", () => {
  it("keeps wrong/duplicate actions harmless and advances only the complete current step", () => {
    const tale = FRIEND_TALES[0];
    let p = { ...newTale(), started: true };
    expect(advanceTale(tale, p, "invented")).toBeNull();
    for (const token of tale.steps[0].tokens) p = advanceTale(tale, p, token)!;
    expect(p.step).toBe(1);
    expect(advanceTale(tale, p, "second-loop")).toBeNull();
    p = advanceTale(tale, p, "loop")!;
    expect(advanceTale(tale, p, "loop")).toBeNull();
    expect(p.found).toEqual(["loop"]);
  });
  it("normalizes only known stories, safe steps and valid sequence prefixes", () => {
    const normalized = normalizeTales({
      cloud: { started: true, step: 1, found: ["loop", "second-loop", "knot"] },
      witch: { started: true, step: 99, complete: true },
      bunny: { started: false, step: 3, complete: true },
      unknown: { complete: true },
    });
    expect(normalized.cloud.found).toEqual(["loop"]);
    expect(normalized.witch.step).toBe(3);
    expect(normalized.bunny.complete).toBe(false);
    expect(Object.keys(normalized)).toHaveLength(5);
  });
  it("resumes partial progress after reload, pause and backup restore without inviting early", () => {
    const storage = memory(),
      store = createGameStore(storage);
    store.getState().startFriendTale("kitten");
    store.getState().playFriendTale("bud-1");
    store.getState().closePanel();
    const reload = createGameStore(storage);
    expect(reload.getState().cozy.tales.kitten.found).toEqual(["bud-1"]);
    expect(reload.getState().room.owned).toEqual([0]);
    const restored = parseBackup(serializeBackup(reload.getState()));
    expect(restored.cozy.tales.kitten.found).toEqual(["bud-1"]);
    reload.getState().startFriendTale("kitten");
    expect(reload.getState().playFriendTale("bud-1")).toBe(false);
    expect(reload.getState().playFriendTale("bud-2")).toBe(true);
  });
  it("invites the matching friend in any order exactly once and preserves existing invitations and clothes", () => {
    const store = createGameStore(memory());
    store.getState().equip("outfit", "sailor");
    store.getState().equip("item", "teddy");
    const adventure = structuredClone(store.getState().adventure);
    for (const id of ["bunny", "cloud", "kitten", "baby", "witch"] as const)
      finish(store, id);
    expect(store.getState().room.owned).toEqual([0, 1, 2, 3, 4, 5]);
    expect(new Set(store.getState().room.slots).size).toBe(6);
    expect(store.getState().equipment).toMatchObject({
      outfit: "sailor",
      item: "teddy",
    });
    expect(store.getState().adventure).toEqual(adventure);
    const room = structuredClone(store.getState().room);
    store.getState().startFriendTale("bunny");
    store.getState().finishFriendTale();
    expect(store.getState().room).toEqual(room);
    expect(store.getState().arrival).toBeNull();
  });
  it("uses the chosen invited edition throughout the shared equipment and rejects locked cards", () => {
    const store = createGameStore(memory());
    store.getState().setFriend(5);
    expect(store.getState().room.selected).toBe(0);
    finish(store, "bunny");
    store.getState().equip("outfit", "sailor");
    store.getState().equip("item", "strawberry");
    store.getState().setFriend(5);
    expect(store.getState().equipment).toMatchObject({
      plush: "bunny",
      outfit: "sailor",
      item: "strawberry",
    });
    store.getState().setMode("adventure");
    expect(store.getState().equipment.plush).toBe("bunny");
    store.getState().setMode("room");
    store.getState().setFriend(0);
    expect(store.getState().equipment.plush).toBeUndefined();
  });
  it("preserves new story progress if an older classic save omits the added field", async () => {
    const storage = memory(),
      store = createGameStore(storage);
    finish(store, "witch");
    const old = JSON.parse(storage.getItem("kitty-nancy-cozy-v1")!);
    delete old.tales;
    storage.setItem("kitty-nancy-cozy-v1", JSON.stringify(old));
    await store.persist.rehydrate();
    expect(store.getState().cozy.tales.witch.complete).toBe(true);
    expect(store.getState().room.owned).toContain(2);
  });
});
