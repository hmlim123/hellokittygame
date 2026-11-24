import { VILLAGE_PLACES } from "./village-world.mjs";
import { newActivityRevision, restoreActivityRevision } from "./visit-activity.mjs";

export const POSTCARD_STOPS = VILLAGE_PLACES.filter((place) => place.id !== "home");

/** @typedef {import('./visit-activity.mjs').VisitActivityRevision & {host: string | null, guest: string | null, stamps: number, completedAt: number | null}} PostcardWalk */

/** @returns {PostcardWalk} */
export function newPostcardWalk(revision = 0) {
  return { ...newActivityRevision(revision), host: null, guest: null, stamps: 0, completedAt: null };
}

/** @param {unknown} id */
export function postcardStop(id) {
  return POSTCARD_STOPS.find((place) => place.id === id);
}

/** @param {unknown} value @returns {PostcardWalk} */
export function normalizePostcardWalk(value) {
  const saved = /** @type {Partial<PostcardWalk> | null} */ (value);
  const host = postcardStop(saved?.host)?.id ?? null;
  const guest = saved?.guest !== host ? postcardStop(saved?.guest)?.id ?? null : null;
  const stamps = host && guest && Number.isInteger(saved?.stamps)
    ? Math.min(2, Math.max(0, saved.stamps))
    : 0;
  const completedAt = stamps === 2 &&
    typeof saved?.completedAt === "number" &&
    Number.isFinite(new Date(saved.completedAt).getTime())
      ? saved.completedAt
      : null;
  return { ...restoreActivityRevision(saved), host, guest, stamps, completedAt };
}

/** @param {PostcardWalk} walk */
export function nextPostcardStop(walk) {
  if (!walk.host || !walk.guest || walk.stamps === 2) return undefined;
  return postcardStop(walk.stamps === 0 ? walk.host : walk.guest);
}

/**
 * @param {{x: number, z: number, area?: string}} player
 * @param {{x: number, z: number}} stop
 */
export function atPostcardStop(player, stop) {
  return player.area === "village" && Math.hypot(player.x - stop.x, player.z - stop.z) <= 2.5;
}
