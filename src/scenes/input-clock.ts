import { PHYSICS_STEP } from "./tile-motor";
/** Catch-up physics must never spend time that elapsed before this input. */
export class InputClock {
  private startedAt = 0;
  private consumed = 0;
  reset(startedAt: number) {
    this.startedAt = startedAt;
    this.consumed = 0;
  }
  consume(now: number) {
    const elapsed = Math.max(0, (now - this.startedAt) / 1000);
    // One immediate tick makes the first response prompt; later ticks need
    // actual elapsed input time, even when Rapier is catching up after a pause.
    if (this.consumed > elapsed + 1e-6) return false;
    this.consumed += PHYSICS_STEP;
    return true;
  }
}
