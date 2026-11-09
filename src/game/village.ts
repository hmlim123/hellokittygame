import { VILLAGE_SPAWN, villageWalkable } from "../../shared/village-world.mjs";
export {
  VILLAGE_SPAWN,
  VILLAGE_LIMIT,
  VILLAGE_OBSTACLES,
  VILLAGE_PLACES,
  VILLAGE_ACTIONS,
  villageWalkable,
  moveVillage,
  villagePath,
  villageApproach,
} from "../../shared/village-world.mjs";
export type VillageFriend = "momo" | "pip";
export type VillageKeepsake = "welcome" | "flowers" | "cafe";
export type VillageSpot = "window" | "nook" | "table";
export interface VillageProgress {
  version: 1;
  x: number;
  z: number;
  yaw: number;
  greeted: VillageFriend[];
  flowers: boolean[];
  colors: ("rose" | "lavender" | "honey")[];
  gifts: Record<VillageFriend, number>;
  placed: Partial<Record<VillageKeepsake, VillageSpot>>;
  returned: boolean;
}
const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
export function normalizeVillage(raw: unknown): VillageProgress {
  const v = object(raw),
    placed = object(v.placed),
    gifts = object(v.gifts);
  const x = typeof v.x === "number" ? v.x : VILLAGE_SPAWN.x,
    z = typeof v.z === "number" ? v.z : VILLAGE_SPAWN.z;
  const position = villageWalkable(x, z) ? { x, z } : VILLAGE_SPAWN;
  const result: VillageProgress = {
    version: 1,
    ...position,
    yaw:
      typeof v.yaw === "number" && Number.isFinite(v.yaw)
        ? Math.atan2(Math.sin(v.yaw), Math.cos(v.yaw))
        : 0,
    greeted: ["momo", "pip"].filter(
      (id) => Array.isArray(v.greeted) && v.greeted.includes(id),
    ) as VillageFriend[],
    flowers: [0, 1, 2].map(
      (i) => Array.isArray(v.flowers) && v.flowers[i] === true,
    ),
    colors: [0, 1, 2].map((i) =>
      Array.isArray(v.colors) &&
      ["rose", "lavender", "honey"].includes(v.colors[i])
        ? v.colors[i]
        : ["rose", "lavender", "honey"][i],
    ) as VillageProgress["colors"],
    gifts: { momo: count(gifts.momo), pip: count(gifts.pip) },
    placed: Object.fromEntries(
      ["welcome", "flowers", "cafe"]
        .filter((k) => ["window", "nook", "table"].includes(String(placed[k])))
        .map((k) => [k, placed[k]]),
    ),
    returned: v.returned === true,
  };
  const occupied = new Set<VillageSpot>();
  for (const key of ["welcome", "flowers", "cafe"] as VillageKeepsake[]) {
    const spot = result.placed[key],
      owned =
        key === "welcome"
          ? result.greeted.includes("momo")
          : key === "flowers"
            ? result.flowers.every(Boolean)
            : result.gifts.momo > 0;
    if (spot && (!owned || occupied.has(spot))) delete result.placed[key];
    else if (spot) occupied.add(spot);
  }
  return result;
}
function count(v: unknown) {
  return typeof v === "number" && Number.isFinite(v)
    ? Math.min(999999, Math.max(0, Math.floor(v)))
    : 0;
}
export const VILLAGE_KEEPSAKES = [
  {
    id: "welcome" as const,
    title: "A little welcome cushion",
    memory: "Momo welcomed Nancy to the village. A soft place to feel at home.",
    icon: "♡",
  },
  {
    id: "flowers" as const,
    title: "Pip’s flower pot",
    memory:
      "Nancy helped Pip’s three flower beds bloom. A little piece of the garden came home.",
    icon: "✿",
  },
  {
    id: "cafe" as const,
    title: "A café memory frame",
    memory:
      "A cookie made by Nancy became a little gift. Momo saved a warm café memory for her.",
    icon: "☕",
  },
];
export function villageKeepsakes(v: VillageProgress) {
  return VILLAGE_KEEPSAKES.filter((k) =>
    k.id === "welcome"
      ? v.greeted.includes("momo")
      : k.id === "flowers"
        ? v.flowers.every(Boolean)
        : v.gifts.momo > 0,
  );
}
export function villageGoal(v: VillageProgress) {
  if (!v.greeted.includes("momo"))
    return {
      text: "Momo is waiting by her café. Say a little hello.",
      action: "momo",
    };
  if (!v.flowers.some(Boolean) && !v.gifts.momo)
    return {
      text: "Spend a little time at the café or help Pip’s flowers bloom.",
      action: "pip",
    };
  if (!v.returned)
    return {
      text: "You have something lovely to bring home. Visit your little home.",
      action: "home",
    };
  return {
    text: "Your village is yours to enjoy. Visit a friend, bake, or tend the garden.",
    action: null,
  };
}
