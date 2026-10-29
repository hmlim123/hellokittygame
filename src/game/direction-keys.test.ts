import { describe, it, expect } from "vitest";
import { DirectionKeys, directionForKey } from "./direction-keys";
describe("adventure keyboard input", () => {
  it("accepts uppercase WASD and physical keys regardless of the typed letter", () => {
    expect(directionForKey({ key: "W" })).toBe("up");
    expect(directionForKey({ key: "Z", code: "KeyW" })).toBe("up");
    expect(directionForKey({ key: "ArrowLeft" })).toBe("left");
    expect(directionForKey({ key: "e", code: "KeyE" })).toBeUndefined();
  });
  it("restores a still-held key after a temporary turn, without duplicating repeats", () => {
    const keys = new DirectionKeys();
    expect(keys.press({ key: "w", code: "KeyW" })).toBe("up");
    expect(keys.press({ key: "w", code: "KeyW" })).toBeUndefined();
    expect(keys.press({ key: "d", code: "KeyD" })).toBe("right");
    expect(keys.release({ key: "d", code: "KeyD" })).toBe("up");
    expect(keys.release({ key: "W", code: "KeyW" })).toBeNull();
  });
  it("releasing an older key or one of two equivalent keys does not stop movement", () => {
    const keys = new DirectionKeys();
    keys.press({ key: "w" }); keys.press({ key: "ArrowUp" });
    expect(keys.release({ key: "w" })).toBeUndefined();
    keys.press({ key: "ArrowRight" });
    expect(keys.release({ key: "ArrowUp" })).toBeUndefined();
    expect(keys.release({ key: "ArrowRight" })).toBeNull();
  });
  it("clears all keys on lost focus or a story choice", () => {
    const keys = new DirectionKeys();
    keys.press({ key: "w" }); keys.press({ key: "d" }); keys.clear();
    expect(keys.release({ key: "d" })).toBeUndefined();
    expect(keys.press({ key: "w" })).toBe("up");
  });
});
