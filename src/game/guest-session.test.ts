import { describe, it, expect, afterEach } from "vitest";
import { createGameStore } from "./store";
import {
  beginGuestSession,
  endGuestSession,
  isGuestSession,
} from "./guest-session";
afterEach(() => endGuestSession());
describe("a visitor’s personal save", () => {
  it("keeps the entire original save unchanged through activities and restores it on leaving", () => {
    const data = new Map<string, string>();
    const store = createGameStore({
      getItem: (k) => data.get(k) || null,
      setItem: (k, v) => {
        data.set(k, v);
      },
    });
    store.getState().equip("outfit", "sailor");
    const before = new Map(data),
      original = store.getState();
    beginGuestSession(original);
    store.getState().equip("outfit", "classic");
    store.getState().newCookie();
    expect(store.getState().equipment.outfit).toBe("classic");
    expect(data).toEqual(before);
    expect(store.getState().retrySave()).toBe(false);
    expect(store.getState().resetProgress().ok).toBe(false);
    expect(isGuestSession()).toBe(true);
    // A reconnect must retain the original, rather than snapshotting temporary activity state.
    beginGuestSession(store.getState());
    endGuestSession((save) => store.setState(save));
    expect(store.getState().equipment).toEqual(original.equipment);
    expect(store.getState().cozy).toEqual(original.cozy);
    expect(data).toEqual(before);
    expect(isGuestSession()).toBe(false);
  });
});
