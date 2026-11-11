import { it, expect } from "vitest";
import { createGameStore } from "./store";
import { normalizeCozy } from "./cozy";
import { HOME_SPAWN } from "./home-world";
import { serializeBackup, parseBackup } from "./backup";
it("old saves gain a safe indoor spawn without losing gifts, postcards or village rewards", () => {
  const s = normalizeCozy({
    cookiesGiven: 4,
    village: {
      greeted: ["momo"],
      gifts: { momo: 2, pip: 0 },
      placed: { welcome: "nook" },
    },
  });
  expect(s.home).toEqual({ ...HOME_SPAWN, yaw: 0, teaMoments: 0 });
  expect(s.cookiesGiven).toBe(4);
  expect(s.village.placed.welcome).toBe("nook");
  expect(
    normalizeCozy({ ...s, home: { x: null, z: null, yaw: Infinity } }).home,
  ).toEqual({ ...HOME_SPAWN, yaw: 0, teaMoments: 0 });
});
it("indoor position and tea survive reload; blocked positions cannot replace a valid save", () => {
  const map = new Map<string, string>(),
    storage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        map.set(k, v);
      },
      removeItem: (k: string) => {
        map.delete(k);
      },
    };
  const a = createGameStore(storage);
  a.getState().saveHomePosition(1.65, 4.3, Math.PI);
  a.getState().recordHomeTea();
  a.getState().saveHomePosition(2.6, 2.7, 0);
  const b = createGameStore(storage);
  expect(b.getState().cozy.home).toEqual({
    x: 1.65,
    z: 4.3,
    yaw: Math.PI,
    teaMoments: 1,
  });
  expect(b.getState().room.owned).toEqual(a.getState().room.owned);
  const backup = parseBackup(serializeBackup(b.getState()));
  expect(backup.cozy.home).toEqual(b.getState().cozy.home);
});
