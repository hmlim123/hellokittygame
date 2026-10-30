import { describe, it, expect } from "vitest";
import { createGameStore } from "./store";
import { normalizeCozy, type PostcardMemory } from "./cozy";
import { serializeBackup, parseBackup, BACKUP_LIMIT } from "./backup";
import {
  emptyStorage,
  normalizePreferences,
  type StorageLike,
} from "./storage";
function memory() {
  const data = new Map<string, string>();
  const storage: StorageLike = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
  };
  return { data, storage };
}
const card = (id: string): PostcardMemory => ({
  id,
  image: "data:image/jpeg;base64," + "A".repeat(16000),
  outfit: "sailor",
  background: "Garden morning",
  place: "Butterfly Glade",
  pose: "wink",
  createdAt: "2026-10-30T12:00:00.000Z",
});
function decorate(store: ReturnType<typeof createGameStore>) {
  const s = store.getState();
  s.openPanel("baking");
  s.newCookie();
  s.shapeCookie("star");
  s.cookieStage("decorate");
  s.iceCookie("honey");
  s.stampCookie("heart");
  s.cookieStage("give");
}
describe("Nancy’s cozy activities", () => {
  it("starts old saves with an empty wall, a fresh cookie and readable standard text", () => {
    const s = createGameStore(emptyStorage).getState();
    expect(s.cozy.postcards).toEqual([]);
    expect(s.cozy.cookie.stage).toBe("shape");
    expect(s.cozy.tea.complete).toBe(false);
    expect(s.preferences.textSize).toBe("standard");
    expect(normalizePreferences({ textSize: "tiny" }).textSize).toBe(
      "standard",
    );
  });
  it("keeps cookie edits across reload and grants each gift once", () => {
    const m = memory(),
      store = createGameStore(m.storage);
    decorate(store);
    const next = createGameStore(m.storage);
    expect(next.getState().cozy.cookie).toMatchObject({
      shape: "star",
      icing: "honey",
      stage: "give",
    });
    next.getState().openPanel("baking");
    next.getState().giveCookie("pip");
    next.getState().giveCookie("pip");
    expect(next.getState().cozy.cookiesGiven).toBe(1);
    expect(next.getState().cozy.cookie.friend).toBe("pip");
    expect(next.getState().cozy.tea.baked).toBe(false);
  });
  it("requires decorations before giving and bounds stamps and invalid coordinates", () => {
    const store = createGameStore(emptyStorage),
      s = store.getState();
    s.openPanel("baking");
    s.cookieStage("give");
    s.giveCookie("kitty");
    expect(store.getState().cozy.cookiesGiven).toBe(0);
    s.cookieStage("decorate");
    s.stampCookie("heart", NaN, Infinity);
    expect(store.getState().cozy.cookie.stamps).toEqual([]);
    for (let i = 0; i < 20; i++) s.stampCookie("star", -999, 999);
    expect(store.getState().cozy.cookie.stamps).toHaveLength(12);
    expect(store.getState().cozy.cookie.stamps[0]).toEqual({
      kind: "star",
      x: 28,
      y: 70,
    });
  });
  it("connects an automatic leaf discovery, Momo’s cookie, table setting and one permanent souvenir", () => {
    const store = createGameStore(emptyStorage),
      s = store.getState();
    s.startTea();
    s.setSceneReady(true);
    s.requestMove("up");
    s.finishMove(false);
    expect(store.getState().cozy.tea.leaves).toBe(true);
    s.pauseTea();
    expect(store.getState().cozy.tea.leaves).toBe(true);
    expect(store.getState().cozy.tea.active).toBe(false);
    decorate(store);
    s.giveCookie("momo");
    expect(store.getState().cozy.tea.baked).toBe(true);
    const partyCookie = structuredClone(store.getState().cozy.tea.cookie);
    s.newCookie();
    s.shapeCookie("round");
    expect(store.getState().cozy.tea.cookie).toEqual(partyCookie);
    s.closePanel();
    s.startTea();
    store.setState({
      adventure: { ...store.getState().adventure, x: 4, z: 10 },
    });
    s.openPanel("tea");
    s.placeTea();
    expect(store.getState().cozy.tea.complete).toBe(false);
    s.placeTea();
    s.placeTea();
    s.placeTea();
    expect(store.getState().cozy.tea).toMatchObject({
      table: 3,
      complete: true,
      active: false,
    });
    s.openMemory("tea");
    expect(store.getState().memoryPage).toBe("tea");
  });
  it("does not complete a party or place its cups before the required tasks and location", () => {
    const store = createGameStore(emptyStorage),
      s = store.getState();
    s.openPanel("tea");
    s.placeTea();
    expect(store.getState().cozy.tea.table).toBe(0);
    expect(
      normalizeCozy({
        tea: { started: true, baked: true, table: 3, complete: true },
      }).tea.complete,
    ).toBe(false);
  });
  it("keeps six bounded thumbnails and transfers their real metadata, tea and text preferences in a backup", () => {
    const store = createGameStore(emptyStorage),
      s = store.getState();
    for (let i = 0; i < 8; i++) s.keepPostcard(card(String(i)));
    s.setPreferences({ textSize: "larger" });
    const text = serializeBackup(store.getState()),
      restored = parseBackup(text);
    expect(text.length).toBeLessThan(BACKUP_LIMIT);
    expect(restored.cozy.postcards).toHaveLength(6);
    expect(restored.cozy.postcards[0]).toMatchObject({
      id: "7",
      outfit: "sailor",
      place: "Butterfly Glade",
      pose: "wink",
    });
    expect(restored.preferences.textSize).toBe("larger");
    const old = JSON.parse(text);
    delete old.data.cozy;
    expect(parseBackup(JSON.stringify(old)).cozy.postcards).toEqual([]);
  });
  it("rejects unsafe or oversized image data instead of putting it on the wall", () => {
    expect(
      normalizeCozy({
        postcards: [
          { ...card("a"), image: "https://example.com/image.jpg" },
          { ...card("b"), image: "data:image/svg+xml;base64,AAAA" },
          {
            ...card("c"),
            image: "data:image/jpeg;base64," + "A".repeat(19000),
          },
        ],
      }).postcards,
    ).toEqual([]);
  });
  it("preserves new memories and reading preferences after an older classic save changes", () => {
    const m = memory(),
      store = createGameStore(m.storage);
    store.getState().keepPostcard(card("one"));
    store.getState().setPreferences({ textSize: "large" });
    m.data.set("kitty-room-preferences-v1", JSON.stringify({ relaxed: true }));
    m.data.set(
      "kitty-nancy-adventure-v1",
      JSON.stringify({ accepted: true, charms: ["honey"] }),
    );
    const next = createGameStore(m.storage).getState();
    expect(next.cozy.postcards[0].id).toBe("one");
    expect(next.preferences.textSize).toBe("large");
    expect(next.adventure.charms).toEqual(["honey"]);
  });
  it("keeps clean view temporary, blocks movement, and keeps a visible way back", () => {
    const m = memory(),
      store = createGameStore(m.storage),
      s = store.getState();
    s.setMode("adventure");
    s.setSceneReady(true);
    s.setViewOnly(true);
    s.requestMove("up");
    s.openPanel("inventory");
    expect(store.getState().moving).toBe(false);
    expect(store.getState().panel).toBe(null);
    expect(createGameStore(m.storage).getState().viewOnly).toBe(false);
    s.setViewOnly(false);
    s.requestMove("up");
    expect(store.getState().moving).toBe(true);
  });
});
