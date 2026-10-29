import { MAPS } from "./domain";
import type { Adventure, ItemId, MapObject } from "./types";
export interface ItemAction {
  item: ItemId;
  label: string;
  source: MapObject;
}
/** Only offer an action whose prerequisites are satisfied at the current tile. */
export function nearbyItemAction(s: Adventure): ItemAction | null {
  const near = MAPS[s.map].objects.filter(
    (o) => Math.abs(o.x - s.x) + Math.abs(o.z - s.z) <= 1,
  );
  for (const source of near) {
    const c = s.chapter;
    if (s.map === "glade") {
      if (source.type === "L" && Number(source.id) === c.butterflyStep)
        return { item: "lantern", label: "Use butterfly lantern", source };
      if (source.type === "W" && c.butterflyStep === 3 && !c.flowersRevived)
        return { item: "watering", label: "Use watering can", source };
      if (source.type === "J" && c.flowersRevived && !c.bridgeFixed)
        return { item: "ribbon", label: "Tie friendship ribbon", source };
      if (source.type === "N" && c.stars.length === 3 && !c.friendAwake)
        return { item: "teddy", label: "Offer cuddle teddy", source };
    }
    if (
      source.type === "M" &&
      s.berries.length === 2 &&
      !s.picnicDelivered &&
      !(s.ribbons.length === 3 && !s.ribbonReturned)
    )
      return { item: "strawberry", label: "Share strawberry picnic", source };
  }
  return null;
}
export function nearbyLabel(
  player: { x: number; z: number },
  object: { x: number; z: number },
  portal = false,
) {
  return (
    Math.abs(player.x - object.x) + Math.abs(player.z - object.z) <=
    (portal ? 4 : 3)
  );
}
