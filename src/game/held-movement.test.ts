import { describe, it, expect } from "vitest";
import { createGameStore } from "./store";
function store() {
  const values = new Map<string, string>();
  const s = createGameStore({
    getItem: (k) => values.get(k) || null,
    setItem: (k, v) => {
      values.set(k, v);
    },
  });
  s.getState().setMode("adventure");
  s.getState().setSceneReady(true);
  return s;
}
describe("continuous movement input", () => {
  it("stops held input at an area entrance before the old physics body can move in the next area", () => {
    const data = new Map([
        [
          "kitty-nancy-adventure-v1",
          JSON.stringify({ map: "garden", accepted: true, x: 13, z: 10 }),
        ],
      ]),
      s = createGameStore({
        getItem: (k) => data.get(k) || null,
        setItem: (k, v) => {
          data.set(k, v);
        },
      });
    s.getState().setMode("adventure");
    s.getState().setSceneReady(true);
    s.getState().holdMove("down");
    s.getState().finishMove(false);
    expect(s.getState().adventure.map).toBe("glade");
    expect(s.getState().heldDirection).toBe(null);
    expect(s.getState().moving).toBe(false);
  });
  it("queues the next held tile immediately and stops queuing on release", () => {
    const s = store();
    s.getState().holdMove("right");
    const first = s.getState().moveCommand?.id;
    s.getState().finishMove(false);
    expect(s.getState().adventure.x).toBe(8);
    expect(s.getState().moving).toBe(true);
    expect(s.getState().moveCommand?.id).not.toBe(first);
    expect(s.getState().heldDirection).toBe("right");
    s.getState().releaseMove("right");
    s.getState().finishMove(false);
    expect(s.getState().adventure.x).toBe(9);
    expect(s.getState().moving).toBe(false);
  });
  it("stops against a wall without repeatedly retrying while a direction remains held", () => {
    const s = store();
    s.getState().holdMove("left");
    s.getState().finishMove(true);
    expect(s.getState().heldDirection).toBe(null);
    expect(s.getState().moving).toBe(false);
    expect(s.getState().physicsContacts).toBe(1);
  });
  it("does not let release of an older key cancel the newer direction", () => {
    const s = store();
    s.getState().holdMove("up");
    s.getState().holdMove("right");
    s.getState().releaseMove("up");
    expect(s.getState().heldDirection).toBe("right");
    s.getState().releaseMove();
    expect(s.getState().heldDirection).toBe(null);
    expect(s.getState().queuedDirection).toBe(null);
  });
});
