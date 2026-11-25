export function visitTime() {
  return performance.timeOrigin + performance.now();
}

/** Estimate the server clock without adding traffic to an idle visit. */
export class VisitClock {
  private offset = -Infinity;
  private sampledAt = 0;

  sample(serverTime: unknown, receivedAt: number) {
    if (typeof serverTime === "number" && Number.isFinite(serverTime)) {
      // Delivery or rendering delays can only push a sample lower. Trust the
      // quickest sample, allowing a little drift during a long connection.
      const drift = Math.max(0, receivedAt - this.sampledAt) / 1000;
      this.offset = Math.max(serverTime - receivedAt, this.offset - drift);
      this.sampledAt = receivedAt;
    }
    return Number.isFinite(this.offset) ? this.offset : 0;
  }
}
