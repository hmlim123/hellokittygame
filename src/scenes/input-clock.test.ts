import { describe, it, expect } from "vitest";
import { InputClock } from "./input-clock";
describe("input timing during physics catch-up", () => {
  it("allows an immediate response without consuming a pre-input backlog", () => {
    const clock = new InputClock();
    clock.reset(5000);
    expect(clock.consume(5000)).toBe(true);
    for (let i = 0; i < 60; i++) expect(clock.consume(5001)).toBe(false);
    expect(clock.consume(5017)).toBe(true);
  });
  it("keeps continuous time bounded at both slow and fast display refresh rates", () => {
    for (const fps of [20, 30, 60, 120, 144, 240]) {
      const clock = new InputClock();
      clock.reset(1000);
      let ticks = 0;
      for (let frame = 0; frame < fps; frame++)
        for (let pending = 0; pending < 10; pending++)
          if (clock.consume(1000 + (frame * 1000) / fps)) ticks++;
      expect(ticks).toBeGreaterThanOrEqual(57);
      expect(ticks).toBeLessThanOrEqual(61);
    }
  });
  it("starts a newer command with its own budget", () => {
    const clock = new InputClock();
    clock.reset(0);
    for (let i = 0; i < 20; i++) clock.consume(i * 17);
    clock.reset(500);
    expect(clock.consume(500)).toBe(true);
    expect(clock.consume(500)).toBe(false);
  });
});
