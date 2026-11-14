import { describe, expect, it } from "vitest";
import { VisitMovementCadence } from "./visit-movement-cadence";

describe("visit movement traffic", () => {
  it("keeps stationary visits quiet, with a fifteen-second keepalive", () => {
    const traffic = new VisitMovementCadence({ x: 0, z: -3 });
    expect(traffic.shouldSend("idle", { x: 0, z: -3 }, 0)).toBe(true);
    expect(traffic.shouldSend("idle", { x: 0, z: -3 }, 100)).toBe(false);
    expect(traffic.shouldSend("idle", { x: 0, z: -3 }, 14999)).toBe(false);
    expect(traffic.shouldSend("idle", { x: 0, z: -3 }, 15000)).toBe(true);
  });
  it("settles an authoritative relocation even when local input was already idle", () => {
    const traffic = new VisitMovementCadence({ x: 0, z: -3 });
    expect(traffic.shouldSend("idle", { x: 1, z: -3 }, 0)).toBe(true);
    expect(traffic.shouldSend("idle", { x: 1, z: -3 }, 100)).toBe(true);
    expect(traffic.shouldSend("idle", { x: 1, z: -3 }, 200)).toBe(false);
  });
  it("publishes walking, one final stop, and changed props promptly", () => {
    const traffic = new VisitMovementCadence({ x: 0, z: -3 });
    for (let x = 1; x <= 3; x++)
      expect(traffic.shouldSend("walking", { x, z: -3 }, x * 100)).toBe(true);
    expect(traffic.shouldSend("stopped", { x: 3, z: -3 }, 400)).toBe(true);
    expect(traffic.shouldSend("stopped", { x: 3, z: -3 }, 500)).toBe(false);
    expect(traffic.shouldSend("holding tea", { x: 3, z: -3 }, 600)).toBe(true);
  });
});
