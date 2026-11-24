import type { TogetherMoment } from "./visits";
import { visitTime } from "./visit-clock";

export const togetherDuration = (action: string) =>
  action === "stir" || action === "decorate" || action === "highfive"
    ? 4
    : action === "photo"
      ? 6
      : 3;

export function togetherElapsed(moment: TogetherMoment, clockOffset: number) {
  return (visitTime() + clockOffset - moment.at) / 1000;
}

// The UI reads the current village renderer after the shared photo countdown.
export const villagePhoto = { capture: null as (() => string) | null };
