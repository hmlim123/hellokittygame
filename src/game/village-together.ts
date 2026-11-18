import type { TogetherMoment } from "./visits";

export const togetherDuration = (action: string) =>
  action === "stir" || action === "decorate" || action === "highfive"
    ? 4
    : action === "photo"
      ? 6
      : 3;

export function togetherElapsed(moment: TogetherMoment, clockOffset: number) {
  return (Date.now() + clockOffset - moment.at) / 1000;
}

// The UI reads the current village renderer after the shared photo countdown.
export const villagePhoto = { capture: null as (() => string) | null };
