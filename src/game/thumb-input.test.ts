import { describe, expect, it } from "vitest";
import { thumbStepTarget } from "./thumb-input";
describe("small thumb steps across different frame timings", () => {
  it("finishes one consistent step when a quick tap spans zero through four physics ticks", () => {
    for (const ticks of [0, 1, 2, 3, 4]) {
      expect(
        thumbStepTarget(
          { x: 1, z: 2 },
          { x: 1 + (ticks * 2.35) / 60, z: 2 },
          { x: 1, z: 0 },
          70,
        ),
      ).toEqual({ x: 1.18, z: 2 });
    }
  });
  it("never adds another step or walks backward after the held input already moved far enough", () => {
    expect(
      thumbStepTarget({ x: 1, z: 2 }, { x: 1.2, z: 2 }, { x: 1, z: 0 }, 70),
    ).toBeNull();
    expect(
      thumbStepTarget({ x: 1, z: 2 }, { x: 1.3, z: 2 }, { x: 1, z: 0 }, 1000),
    ).toBeNull();
  });
  it("keeps a central touch still and retains the intended diagonal without a longer step", () => {
    expect(
      thumbStepTarget({ x: 0, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 0 }, 30),
    ).toBeNull();
    const d = Math.SQRT1_2,
      target = thumbStepTarget(
        { x: 0, z: 0 },
        { x: 0.03, z: -0.03 },
        { x: d, z: -d },
        80,
      )!;
    expect(Math.hypot(target.x, target.z)).toBeCloseTo(0.18);
    expect(target.x).toBeGreaterThan(0);
    expect(target.z).toBeLessThan(0);
  });
});
