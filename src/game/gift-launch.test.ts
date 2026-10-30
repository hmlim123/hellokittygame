import { describe, it, expect } from "vitest";
import { createGameStore } from "./store";
import { GIFT_START_KEY, prepareGiftVisit } from "./gift-launch";
import { parseBackup, PREVIOUS_BACKUP } from "./backup";
import { normalizeAdventure } from "./domain";
import { normalizeCozy } from "./cozy";
import type { StorageLike } from "./storage";
function fixture(failMarker = false) {
  const data = new Map<string, string>();
  const storage: StorageLike = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      if (failMarker && k === GIFT_START_KEY) throw Error("blocked");
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
  };
  data.set(
    "kitty-picnic-v1",
    JSON.stringify({ owned: [0, 2, 4], otherScore: 40 }),
  );
  data.set("another-game", "untouched");
  const store = createGameStore(storage);
  store.setState({
    adventure: normalizeAdventure({
      accepted: true,
      charms: ["rose", "honey", "sky"],
      guardian: true,
      gate: true,
      complete: true,
      ribbons: ["rose", "honey", "sky"],
      ribbonReturned: true,
      berries: ["west", "east"],
      picnicDelivered: true,
      litLanterns: ["west", "east"],
      lanternsBlessed: true,
      map: "garden",
      x: 7,
      z: 3,
      chapter: {
        version: 1,
        butterflyStep: 3,
        flowersRevived: true,
        bridgeFixed: true,
        stars: ["moon", "flower", "heart"],
        friendAwake: true,
        letterFound: true,
        endingSeen: true,
        postcardSaved: true,
      },
    }),
    room: { ...store.getState().room, best: 500, rounds: 8 },
    cozy: normalizeCozy({
      cookiesGiven: 5,
      tea: {
        started: true,
        leaves: true,
        baked: true,
        table: 3,
        complete: true,
      },
      postcards: [
        {
          id: "test",
          image: "data:image/jpeg;base64,AAAA",
          createdAt: "2026-10-30T12:00:00Z",
        },
      ],
    }),
    journal: { completed: { bows: 3, strawberries: 2, hearts: 1, picnic: 4 } },
  });
  store.getState().equip("outfit", "moonlight");
  store.getState().setPreferences({ letterOpened: true, textSize: "larger" });
  return { data, storage };
}
describe("Nancy’s first gift opening", () => {
  it("automatically starts existing test saves at zero before the first room render", () => {
    const m = fixture(),
      launch = prepareGiftVisit(m.storage, "?v=gift-19"),
      s = createGameStore(launch.storage).getState();
    expect(launch.started).toBe(true);
    expect(m.data.get(GIFT_START_KEY)).toBe("1");
    expect(s.room.owned).toEqual([0]);
    expect(s.room.best).toBe(0);
    expect(s.room.rounds).toBe(0);
    expect(Object.values(s.journal.completed)).toEqual([0, 0, 0, 0]);
    expect(s.adventure.accepted).toBe(false);
    expect(s.adventure.complete).toBe(false);
    expect(s.adventure.charms).toEqual([]);
    expect(s.adventure.map).toBe("village");
    expect(s.adventure.chapter).toMatchObject({
      butterflyStep: 0,
      flowersRevived: false,
      bridgeFixed: false,
      stars: [],
      friendAwake: false,
      letterFound: false,
      endingSeen: false,
      postcardSaved: false,
    });
    expect(s.equipment.outfit).toBe("classic");
    expect(s.preferences.letterOpened).toBe(false);
    expect(s.cozy.cookiesGiven).toBe(0);
    expect(s.cozy.postcards).toEqual([]);
    expect(s.cozy.tea.complete).toBe(false);
    const old = parseBackup(m.data.get(PREVIOUS_BACKUP)!);
    expect(old.room.best).toBe(500);
    expect(old.cozy.cookiesGiven).toBe(5);
    expect(old.cozy.postcards).toHaveLength(1);
    expect(old.equipment.outfit).toBe("moonlight");
    expect(m.data.get("another-game")).toBe("untouched");
    expect(JSON.parse(m.data.get("kitty-picnic-v1")!).otherScore).toBe(40);
  });
  it("never repeats on reload, another gift alias, or a future normal visit", () => {
    const m = fixture();
    prepareGiftVisit(m.storage, "?v=gift-19");
    const store = createGameStore(m.storage);
    store.getState().equip("outfit", "sailor");
    store.getState().setPreferences({ letterOpened: true });
    for (const search of ["?v=gift-19", "?v=gift-20", ""]) {
      expect(prepareGiftVisit(m.storage, search).started).toBe(false);
      expect(createGameStore(m.storage).getState().equipment.outfit).toBe(
        "sailor",
      );
      expect(
        createGameStore(m.storage).getState().preferences.letterOpened,
      ).toBe(true);
    }
  });
  it("also starts the cache-refreshed gift link at zero", () => {
    const m = fixture();
    expect(prepareGiftVisit(m.storage, "?v=gift-20").started).toBe(true);
    expect(createGameStore(m.storage).getState().room.best).toBe(0);
  });
  it("leaves unrelated URLs and existing normal saves alone", () => {
    const m = fixture(),
      before = new Map(m.data);
    for (const search of ["", "?v=cozy-18", "?v=other"])
      expect(prepareGiftVisit(m.storage, search).started).toBe(false);
    expect(m.data).toEqual(before);
  });
  it("rolls back a marker failure, shows a fresh unsaved session, and preserves that session across focus refresh", () => {
    const m = fixture(true),
      before = new Map(m.data),
      launch = prepareGiftVisit(m.storage, "?v=gift-19");
    expect(m.data).toEqual(before);
    expect(launch.started).toBe(true);
    const store = createGameStore(launch.storage);
    expect(store.getState().room.best).toBe(0);
    expect(store.getState().cozy.cookiesGiven).toBe(0);
    store.getState().equip("outfit", "sailor");
    expect(store.getState().saveFailed).toBe(true);
    store.persist.rehydrate();
    expect(store.getState().equipment.outfit).toBe("sailor");
    expect(m.data).toEqual(before);
  });
});
