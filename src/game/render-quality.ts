import type { Preferences } from "./types";
export function qualityCap(quality: Preferences["quality"], compact: boolean) {
  return quality === "gentle" ? 1 : quality === "crisp" ? 1.5 : compact ? 1.25 : 1.5;
}
/** Lower detail after sustained slow frames; recover slowly to prevent flicker. */
export class QualityController {
  dpr: number;
  private grace = 2;
  private elapsed = 0;
  private frames = 0;
  private slow = 0;
  private fast = 0;
  constructor(private cap: number) { this.dpr = cap; }
  sample(dt: number): number | null {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.25) return null;
    if (this.grace > 0) { this.grace -= dt; return null; }
    this.elapsed += dt; this.frames++;
    if (this.elapsed < 1) return null;
    const fps = this.frames / this.elapsed;
    this.elapsed = 0; this.frames = 0;
    this.slow = fps < 38 ? this.slow + 1 : 0;
    this.fast = fps > 56 ? this.fast + 1 : 0;
    const next = this.slow >= 2 ? Math.max(1, this.dpr - 0.25)
      : this.fast >= 8 ? Math.min(this.cap, this.dpr + 0.25) : this.dpr;
    if (next === this.dpr) return null;
    this.slow = 0; this.fast = 0; this.dpr = next;
    return next;
  }
}
