import { MAPS as classicMaps } from "../../dist/adventure-state.js";
import { gladeMap } from "./chapter";
import type { Adventure, GameMap, AreaId, TravelStop } from "./types";
const garden = classicMaps.garden;
export const MAPS: Record<AreaId, GameMap> = {
  ...classicMaps,
  garden: {
    ...garden,
    rows: garden.rows.map((r: string, z: number) =>
      z === 11 ? r.slice(0, 13) + "A" + r.slice(14) : r,
    ),
    objects: [...garden.objects, { type: "A", x: 13, z: 11 }],
  },
  glade: gladeMap(),
};
export function walkable(s: Adventure, x: number, z: number): boolean {
  if (s.map === "glade" && x === 3 && z === 7)
    return s.chapter.butterflyStep > 0;
  const t = MAPS[s.map]?.rows[z]?.[x];
  return (
    !!t &&
    ((" .DERBLAVKP".includes(t) && t !== " ") ||
      (t === "G" && s.gate) ||
      (t === "J" && s.chapter.bridgeFixed) ||
      (t === "h" && s.chapter.butterflyStep > 0))
  );
}
export function validStop(
  s: Adventure,
  map: AreaId,
  stop: TravelStop,
): boolean {
  return (
    Number.isInteger(stop.x) &&
    Number.isInteger(stop.z) &&
    walkable({ ...s, map }, stop.x, stop.z) &&
    !(
      map === "glade" &&
      ((!s.chapter.bridgeFixed && stop.x >= 7) ||
        (s.chapter.butterflyStep === 0 && stop.x < 7 && stop.z < 7))
    )
  );
}
