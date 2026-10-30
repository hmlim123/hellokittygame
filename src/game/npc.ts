import { MAPS, walkable } from "./world-map";
import type { Adventure, MapObject } from "./types";
export const NPC_NAMES: Record<string, string> = {
  M: "Momo",
  Q: "Cloud guardian",
  N: "Pip",
};
export const isNpc = (o: MapObject | null | undefined) =>
  !!o && o.type in NPC_NAMES;
/** A generous speaking distance, with no talking through hedges, houses or gates. */
export function canTalkToNpc(a: Adventure, o: MapObject) {
  if (
    !isNpc(o) ||
    !MAPS[a.map].objects.includes(o) ||
    Math.abs(a.x - o.x) + Math.abs(a.z - o.z) > 3
  )
    return false;
  let px = a.x,
    pz = a.z;
  const steps = Math.max(Math.abs(o.x - a.x), Math.abs(o.z - a.z)) * 4;
  for (let i = 1; i <= steps; i++) {
    const x = Math.round(a.x + ((o.x - a.x) * i) / steps),
      z = Math.round(a.z + ((o.z - a.z) * i) / steps);
    if (x !== px && z !== pz && (!walkable(a, x, pz) || !walkable(a, px, z)))
      return false;
    if (
      (x !== o.x || z !== o.z) &&
      (!walkable(a, x, z) ||
        ["D", "E", "A", "V"].includes(MAPS[a.map].rows[z][x]))
    )
      return false;
    px = x;
    pz = z;
  }
  return true;
}
export function nearbyNpc(a: Adventure) {
  return MAPS[a.map].objects
    .filter((o) => canTalkToNpc(a, o))
    .sort(
      (p, q) =>
        Math.abs(p.x - a.x) +
        Math.abs(p.z - a.z) -
        (Math.abs(q.x - a.x) + Math.abs(q.z - a.z)),
    )[0];
}
/** Keep an adjacent chest, portal or puzzle as the primary interaction. */
export function preferredNpc(a: Adventure, target: MapObject | undefined) {
  return !target || isNpc(target) || ["H", "F", "o"].includes(target.type)
    ? nearbyNpc(a)
    : undefined;
}
