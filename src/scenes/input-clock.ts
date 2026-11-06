import { PHYSICS_STEP } from "./tile-motor";
/** Catch-up physics must never spend time that elapsed before this input. */
export class InputClock {
  private startedAt = 0;
  private consumed = 0;
  private frameTime = 0;
  beginFrame(now: number) {
    this.frameTime = now;
  }
  reset(startedAt: number) {
    this.startedAt = startedAt;
    this.consumed = 0;
  }
  consume() {
    // The budget is fixed before physics. CPU time spent processing a catch-up
    // batch cannot count as additional time holding a key during that batch.
    const elapsed = Math.max(0, (this.frameTime - this.startedAt) / 1000);
    // One immediate tick makes the first response prompt; later ticks need
    // actual elapsed input time, even when Rapier is catching up after a pause.
    if (this.consumed > elapsed + 1e-6) return false;
    this.consumed += PHYSICS_STEP;
    return true;
  }
}
