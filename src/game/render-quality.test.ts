import { describe, expect, it } from "vitest";
import { QualityController, qualityCap } from "./render-quality";
import { migrateLegacy, emptyStorage } from "./storage";
function feed(q: QualityController, fps: number, seconds: number) {
  for (let i = 0; i < fps * seconds; i++) q.sample(1 / fps);
}
describe("comfortable rendering", () => {
  it("migrates older saves to automatic and offers bounded manual detail", () => {
    expect(migrateLegacy(emptyStorage).preferences.quality).toBe("auto");
    expect(qualityCap("auto", true)).toBe(1.25);
    expect(qualityCap("gentle", false)).toBe(1);
    expect(qualityCap("crisp", true)).toBe(1.5);
  });
  it("ignores startup and isolated pauses, then lowers detail for sustained low FPS", () => {
    const q = new QualityController(1.5);
    feed(q, 30, 2);
    expect(q.dpr).toBe(1.5);
    q.sample(4);
    q.sample(NaN);
    expect(q.dpr).toBe(1.5);
    feed(q, 30, 3);
    expect(q.dpr).toBe(1.25);
    feed(q, 30, 4);
    expect(q.dpr).toBe(1);
  });
  it("requires a sustained recovery and never exceeds the device cap", () => {
    const q = new QualityController(1.25);
    feed(q, 20, 8);
    expect(q.dpr).toBe(1);
    feed(q, 60, 3);
    expect(q.dpr).toBe(1);
    feed(q, 60, 10);
    expect(q.dpr).toBe(1.25);
    feed(q, 60, 20);
    expect(q.dpr).toBe(1.25);
  });
});
