import type { DiscoveryEffect } from "../game/types";
export function effectTime(
  effect: DiscoveryEffect | null,
  now = performance.now(),
) {
  return effect ? Math.max(0, (now - effect.startedAt) / 1000) : Infinity;
}
export const ease = (t: number) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};
export function bloomAmount(
  open: boolean,
  effect: DiscoveryEffect | null,
  reduced: boolean,
  now?: number,
) {
  return !open
    ? 0
    : reduced || effect?.kind !== "water"
      ? 1
      : ease((effectTime(effect, now) - 0.45) / 1.4);
}
export function bridgeAmount(
  fixed: boolean,
  effect: DiscoveryEffect | null,
  reduced: boolean,
  now?: number,
) {
  return !fixed
    ? 0
    : reduced || effect?.kind !== "tie"
      ? 1
      : ease(effectTime(effect, now) / 1.4);
}
export function wakeAmount(
  awake: boolean,
  effect: DiscoveryEffect | null,
  reduced: boolean,
  now?: number,
) {
  return !awake
    ? 0
    : reduced || effect?.kind !== "wake"
      ? 1
      : ease(effectTime(effect, now) / 1.2);
}
