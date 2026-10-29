import { describe, it, expect } from "vitest";
import { normalizeAdventure, moveAdventure, MAPS, walkable } from "./domain";
import {
  navigationGoal,
  navigationDirection,
  routeTo,
  journeyObjective,
} from "./navigation";
import { travelAdventure, rememberStop } from "./travel-state";
import { createGameStore } from "./store";
import { serializeBackup } from "./backup";
function memory(raw: unknown = {}) {
  const data = new Map([["kitty-nancy-adventure-v1", JSON.stringify(raw)]]);
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
describe("connected quest navigation", () => {
  it("follows the selected original quest out of the glade instead of pointing to its local puzzle", () => {
    const s = normalizeAdventure({ map: "glade", trackedQuest: "ribbons" });
    expect(navigationGoal(s)?.object.type).toBe("V");
    s.trackedQuest = "moonflower";
    expect(navigationGoal(s)?.object.type).toBe("V");
    expect(journeyObjective(s)).toContain("Return to Moonflower Garden");
  });
  it("guides a glade quest through the village and garden entrances, then to its first butterfly", () => {
    const s = normalizeAdventure({ trackedQuest: "glade" });
    expect(navigationGoal(s)?.object.type).toBe("D");
    s.map = "garden";
    [s.x, s.z] = MAPS.garden.spawn;
    expect(navigationGoal(s)?.object.type).toBe("A");
    s.map = "glade";
    [s.x, s.z] = MAPS.glade.spawn;
    expect(navigationDirection(s)).toBe("↑ Butterflies · 1 step away");
  });
  it("keeps the glade quest selected during its moonflower prerequisite and then points back to the picnic", () => {
    const s = normalizeAdventure({
      map: "glade",
      trackedQuest: "glade",
      chapter: {
        butterflyStep: 3,
        flowersRevived: true,
        bridgeFixed: true,
        stars: ["moon", "flower", "heart"],
        friendAwake: true,
        letterFound: true,
      },
    });
    expect(navigationGoal(s)?.prerequisite).toBe(true);
    s.map = "garden";
    s.x = 7;
    s.z = 10;
    expect(navigationGoal(s)?.object.type).toBe("C");
    Object.assign(s, {
      complete: true,
      gate: true,
      guardian: true,
      charms: ["rose", "honey", "sky"],
    });
    expect(navigationGoal(s)?.object.type).toBe("A");
    s.map = "glade";
    expect(navigationGoal(s)?.object.type).toBe("P");
  });
  it("routes toward a reachable charm without crossing a closed gate or teleporting through another entrance", () => {
    const s = normalizeAdventure({ accepted: true, map: "garden" });
    const goal = navigationGoal(s)!;
    expect(goal.object.type).toBe("C");
    expect(goal.route?.points.every((p) => walkable(s, p.x, p.z))).toBe(true);
    expect(
      goal.route?.points.every(
        (p) => !["A", "E", "G"].includes(MAPS.garden.rows[p.z][p.x]),
      ),
    ).toBe(true);
    expect(
      routeTo(
        s,
        MAPS.garden.objects.find((o) => o.type === "S")!,
      ),
    ).toBe(null);
  });
  it("routes lanterns through their prerequisite and reports completed quests without inventing another pickup", () => {
    const s = normalizeAdventure({ trackedQuest: "lanterns" });
    expect(navigationGoal(s)?.prerequisite).toBe(true);
    s.trackedQuest = "ribbons";
    s.ribbonReturned = true;
    expect(navigationGoal(s)).toBe(null);
    expect(navigationDirection(s)).toContain("choose another quest");
  });
});
describe("returning to the same little world", () => {
  it("choosing the original chapter from the glade follows its own story instead of routing back to the glade", () => {
    const store = createGameStore(
      memory({
        map: "glade",
        trackedQuest: "glade",
        chapter: { butterflyStep: 1 },
      }),
    );
    store.getState().startMoonflower();
    expect(store.getState().adventure.map).toBe("village");
    expect(store.getState().adventure.trackedQuest).toBe("moonflower");
    expect(navigationGoal(store.getState().adventure)?.object.type).toBe("D");
  });
  it("records entrance visits, remembers source and destination stops, and never grants a quest reward for traveling", () => {
    const s = normalizeAdventure({
      accepted: true,
      map: "garden",
      x: 13,
      z: 10,
    });
    moveAdventure(s, "down");
    expect(s.journey.visited).toEqual(["village", "garden", "glade"]);
    expect(s.journey.stops.garden).toMatchObject({ x: 13, z: 10 });
    moveAdventure(s, "up");
    expect(s.z).toBe(9);
    travelAdventure(s, "garden");
    expect([s.x, s.z]).toEqual([13, 10]);
    travelAdventure(s, "glade");
    expect([s.x, s.z]).toEqual([2, 9]);
    expect(s.charms).toEqual([]);
    expect(s.chapter.butterflyStep).toBe(0);
  });
  it("resumes the exact glade position from the room and preserves it on repeated glade entry", () => {
    const m = memory({
        map: "glade",
        x: 4,
        z: 6,
        chapter: { butterflyStep: 3 },
      }),
      store = createGameStore(m);
    store.getState().continueAdventure();
    expect([
      store.getState().adventure.x,
      store.getState().adventure.z,
    ]).toEqual([4, 6]);
    store.getState().setMode("room");
    store.getState().startGlade();
    expect([
      store.getState().adventure.x,
      store.getState().adventure.z,
    ]).toEqual([4, 6]);
    expect(
      createGameStore(m).getState().adventure.journey.stops.glade,
    ).toMatchObject({ x: 4, z: 6 });
  });
  it("does not teleport to an unvisited place or while walking, and repairs blocked bookmarked stops", () => {
    const m = memory(),
      store = createGameStore(m);
    store.getState().travelTo("garden");
    expect(store.getState().mode).toBe("room");
    const s = normalizeAdventure({
      journey: {
        visited: ["garden", "glade"],
        stops: {
          glade: { x: 10, z: 8, facing: "down" },
          garden: { x: 5, z: 8, facing: "down" },
        },
      },
    });
    expect(s.journey.stops.glade).toBeUndefined();
    expect(s.journey.stops.garden).toBeUndefined();
    travelAdventure(s, "glade");
    expect([s.x, s.z]).toEqual([2, 10]);
    store.getState().setMode("adventure");
    store.getState().setSceneReady(true);
    store.getState().requestMove("up");
    store.getState().startGlade();
    expect(store.getState().adventure.map).toBe("village");
  });
  it("migrates old progress and retains visited places across classic writes and backup restore", () => {
    const m = memory({ map: "garden", accepted: true, charms: ["honey"] });
    const store = createGameStore(m);
    store.getState().startGlade();
    const a = store.getState().adventure;
    a.x = 4;
    a.z = 8;
    rememberStop(a);
    store.getState().savePostcard();
    m.data.set(
      "kitty-nancy-adventure-v1",
      JSON.stringify({
        accepted: true,
        charms: ["honey"],
        map: "village",
        x: 7,
        z: 8,
      }),
    );
    const resumed = createGameStore(m);
    expect(resumed.getState().adventure.journey.visited).toContain("glade");
    expect(resumed.getState().adventure.journey.stops.glade).toMatchObject({
      x: 4,
      z: 8,
    });
    const receiver = createGameStore(memory());
    expect(
      receiver.getState().restoreBackup(serializeBackup(resumed.getState())).ok,
    ).toBe(true);
    expect(receiver.getState().adventure.journey.stops.glade).toMatchObject({
      x: 4,
      z: 8,
    });
  });
});
