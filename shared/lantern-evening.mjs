import { VILLAGE_PLACES } from "./village-world.mjs";

const plaza = VILLAGE_PLACES.find((p) => p.id === "plaza");
if (!plaza) throw Error("The village map needs a plaza for its lanterns.");
export const LANTERN_PLAZA = plaza;
export const LANTERN_COLORS = {
  rose: { name: "Rose", color: "#e999af" },
  honey: { name: "Honey", color: "#f3c976" },
  lavender: { name: "Lavender", color: "#baabe6" },
  mint: { name: "Mint", color: "#a7d3b0" },
};

/** @typedef {keyof typeof LANTERN_COLORS} LanternColor */
/** @typedef {{color: LanternColor | null, lit: boolean}} Lantern */
/** @typedef {{revision: number, host: Lantern, guest: Lantern}} LanternEvening */

/** @param {unknown} value @returns {LanternColor | null} */
export function lanternColor(value) {
  return typeof value === "string" && Object.hasOwn(LANTERN_COLORS, value)
    ? /** @type {LanternColor} */ (value)
    : null;
}

/** @returns {LanternEvening} */
export function newLanternEvening(revision = 0) {
  return {
    revision,
    host: { color: null, lit: false },
    guest: { color: null, lit: false },
  };
}

/** @param {unknown} value @returns {LanternEvening} */
export function normalizeLanternEvening(value) {
  const saved = /** @type {Partial<LanternEvening> | null} */ (value);
  const revision = Number.isSafeInteger(saved?.revision)
    ? Math.max(0, saved.revision)
    : 0;
  /** @param {Lantern | undefined} lamp */
  function restore(lamp) {
    const color = lanternColor(lamp?.color);
    return { color, lit: !!color && lamp?.lit === true };
  }
  return { revision, host: restore(saved?.host), guest: restore(saved?.guest) };
}

/** @param {{x: number, z: number, area?: string}} player */
export function atLanternPlaza(player) {
  return player.area === "village" &&
    Math.hypot(player.x - LANTERN_PLAZA.x, player.z - LANTERN_PLAZA.z) <= 2.5;
}
