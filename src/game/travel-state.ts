import type { Adventure, AreaId, Journey, TravelStop } from "./types";
import { MAPS, validStop } from "./world-map";
export const AREAS: AreaId[] = ["village", "garden", "glade"];
const area = (value: unknown): value is AreaId =>
  AREAS.includes(value as AreaId);
/** Infer old discoveries without marking quests complete or guessing a position. */
export function normalizeJourney(raw: unknown, s: Adventure): Journey {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Journey>;
  const visited: AreaId[] = ["village"];
  if (s.charms.length || s.berries.length || s.guardian || s.complete)
    visited.push("garden");
  if (
    s.chapter.butterflyStep ||
    s.chapter.flowersRevived ||
    s.chapter.friendAwake ||
    s.chapter.letterFound ||
    s.chapter.endingSeen
  )
    visited.push("glade");
  if (Array.isArray(r.visited))
    for (const id of r.visited) if (area(id)) visited.push(id);
  visited.push(s.map);
  const stops: Journey["stops"] = {};
  for (const id of AREAS) {
    const stop = r.stops?.[id];
    if (stop && typeof stop === "object" && validStop(s, id, stop))
      stops[id] = {
        x: stop.x,
        z: stop.z,
        facing: ["up", "down", "left", "right"].includes(stop.facing)
          ? stop.facing
          : "down",
      };
  }
  stops[s.map] = { x: s.x, z: s.z, facing: s.facing };
  return { version: 1, visited: [...new Set(visited)], stops };
}
export function rememberStop(s: Adventure) {
  s.journey ??= normalizeJourney(null, s);
  if (!s.journey.visited.includes(s.map)) s.journey.visited.push(s.map);
  s.journey.stops[s.map] = { x: s.x, z: s.z, facing: s.facing };
}
export function travelAdventure(
  s: Adventure,
  destination: AreaId,
  allowFirstGlade = false,
): boolean {
  if (
    !area(destination) ||
    (!s.journey.visited.includes(destination) &&
      !(allowFirstGlade && destination === "glade"))
  )
    return false;
  if (destination === s.map) {
    rememberStop(s);
    return true;
  }
  rememberStop(s);
  const saved = s.journey.stops[destination];
  const stop: TravelStop =
    saved && validStop(s, destination, saved)
      ? saved
      : {
          x: MAPS[destination].spawn[0],
          z: MAPS[destination].spawn[1],
          facing: "down",
        };
  s.map = destination;
  s.x = stop.x;
  s.z = stop.z;
  s.facing = stop.facing;
  if (destination !== "village") s.accepted = true;
  rememberStop(s);
  return true;
}
