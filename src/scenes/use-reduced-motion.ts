import { useGameStore } from "../game/store";
export function useReducedMotion() {
  const motion = useGameStore((s) => s.preferences.motion);
  const system =
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  return motion === "reduce" || system;
}
