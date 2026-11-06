import { describe, it, expect } from "vitest";
import { InputClock } from "./input-clock";
describe("input timing during physics catch-up", () => {
  it("allows an immediate response without consuming a pre-input backlog", () => {
    const clock = new InputClock();
    clock.reset(5000);
    clock.beginFrame(5000);
    expect(clock.consume()).toBe(true);
    for (let i = 0; i < 60; i++) expect(clock.consume()).toBe(false);
    clock.beginFrame(5017);
    expect(clock.consume()).toBe(true);
  });
  it("keeps continuous time bounded at both slow and fast display refresh rates", () => {
    for (const fps of [20, 30, 60, 120, 144, 240]) {
      const clock = new InputClock();
      clock.reset(1000);
      let ticks = 0;
      for (let frame = 0; frame < fps; frame++) {
        clock.beginFrame(1000 + (frame * 1000) / fps);
        for (let pending = 0; pending < 10; pending++)
          if (clock.consume()) ticks++;
      }
      expect(ticks).toBeGreaterThanOrEqual(57);
      expect(ticks).toBeLessThanOrEqual(61);
    }
  });
  it("does not spend an earlier frame or processing backlog on input received after the frame boundary", () => {
    const clock = new InputClock();
    clock.beginFrame(1000);
    clock.reset(1350);
    expect(clock.consume()).toBe(true);
    for (let catchup = 0; catchup < 120; catchup++) expect(clock.consume()).toBe(false);
    clock.beginFrame(1367);
    expect(clock.consume()).toBe(true);
    expect(clock.consume()).toBe(false);
  });
  it("starts a newer command with its own budget", () => {
    const clock = new InputClock();
    clock.reset(0);
    for (let i = 0; i < 20; i++) { clock.beginFrame(i * 17); clock.consume(); }
    clock.reset(500);
    clock.beginFrame(500);
    expect(clock.consume()).toBe(true);
    expect(clock.consume()).toBe(false);
  });
});
