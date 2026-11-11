import { it, expect } from "vitest";
import {
  HOME_SPAWN,
  HOME_ACTIONS,
  homePath,
  homeWalkable,
  straightHomePath,
  moveHome,
  normalizeHome,
} from "./home-world";
it("every studio approach is reachable around the actual furniture, in both directions", () => {
  for (const a of [...HOME_ACTIONS, { id: "bathroom", x: 0.65, z: -3.0 }]) {
    expect(homeWalkable(a.x, a.z), a.id).toBe(true);
    const route = homePath(HOME_SPAWN, a);
    expect(route.length, a.id).toBeGreaterThan(0);
    let p = HOME_SPAWN;
    for (const to of route) {
      expect(straightHomePath(p, to), a.id).toBe(true);
      p = to;
    }
    expect(homePath(a, HOME_SPAWN).length, a.id + " return").toBeGreaterThan(0);
  }
});
it("long steps cannot tunnel through the desk or leave the room, and invalid saves recover safely", () => {
  const p = moveHome({ x: 0.6, z: 2.7 }, 8, 0);
  expect(p.x).toBeLessThan(1.3);
  expect(homeWalkable(p.x, p.z)).toBe(true);
  expect(
    normalizeHome({ x: 2.6, z: 2.7, yaw: Infinity, teaMoments: -3 }),
  ).toEqual({ ...HOME_SPAWN, yaw: 0, teaMoments: 0 });
  expect(homePath(HOME_SPAWN, { x: 2.6, z: 2.7 })).toEqual([]);
});
