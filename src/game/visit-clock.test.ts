import { describe, expect, it } from "vitest";
import { VisitClock } from "./visit-clock";

describe("the shared activity clock", () => {
  it("ignores delayed state delivery without moving an animation back", () => {
    const clock = new VisitClock();
    expect(clock.sample(1025, 1000)).toBe(25);
    expect(clock.sample(1525, 1900)).toBeCloseTo(24.1);
    expect(clock.sample(2025, 2000)).toBe(25);
  });

  it("settles on the quickest sample and works with old services", () => {
    const clock = new VisitClock();
    expect(clock.sample(undefined, 500)).toBe(0);
    expect(clock.sample(725, 900)).toBe(-175);
    expect(clock.sample(1000, 975)).toBe(25);
    expect(clock.sample(undefined, 1100)).toBe(25);
  });
});
