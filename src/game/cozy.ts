import type { Adventure, OutfitId } from "./types";
export const COOKIE_SHAPES = ["heart", "star", "round"] as const;
export const ICINGS = ["rose", "honey", "lavender"] as const;
export const DECORATIONS = ["heart", "star", "berry"] as const;
export const FRIENDS = ["kitty", "momo", "pip"] as const;
export type CookieShape = (typeof COOKIE_SHAPES)[number];
export type Icing = (typeof ICINGS)[number];
export type Decoration = (typeof DECORATIONS)[number];
export type CookieFriend = (typeof FRIENDS)[number];
export interface CookieStamp {
  kind: Decoration;
  x: number;
  y: number;
}
export interface Cookie {
  shape: CookieShape;
  icing: Icing;
  stamps: CookieStamp[];
  stage: "shape" | "decorate" | "give" | "served";
  friend: CookieFriend;
}
export interface PostcardMemory {
  id: string;
  image: string;
  outfit: OutfitId;
  background: string;
  place: string;
  pose: string;
  createdAt: string;
}
export interface CozyProgress {
  version: 1;
  cookie: Cookie;
  cookiesGiven: number;
  postcards: PostcardMemory[];
  tea: {
    active: boolean;
    started: boolean;
    leaves: boolean;
    baked: boolean;
    cookie: Cookie | null;
    table: number;
    complete: boolean;
  };
}
const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const member = <T extends string>(
  v: unknown,
  options: readonly T[],
  fallback: T,
): T => (options.includes(v as T) ? (v as T) : fallback);
const count = (v: unknown, max: number) =>
  typeof v === "number" && Number.isFinite(v)
    ? Math.max(0, Math.min(max, Math.floor(v)))
    : 0;
export const newCookie = (): Cookie => ({
  shape: "heart",
  icing: "rose",
  stamps: [],
  stage: "shape",
  friend: "momo",
});
function normalizeCookie(value: unknown): Cookie {
  const c = record(value);
  const stamps = (Array.isArray(c.stamps) ? c.stamps : [])
    .slice(0, 12)
    .flatMap((v) => {
      const s = record(v);
      return DECORATIONS.includes(s.kind as Decoration) &&
        typeof s.x === "number" &&
        Number.isFinite(s.x) &&
        typeof s.y === "number" &&
        Number.isFinite(s.y)
        ? [
            {
              kind: s.kind as Decoration,
              x: Math.max(28, Math.min(72, s.x)),
              y: Math.max(30, Math.min(70, s.y)),
            },
          ]
        : [];
    });
  return {
    shape: member(c.shape, COOKIE_SHAPES, "heart"),
    icing: member(c.icing, ICINGS, "rose"),
    stamps,
    stage: stamps.length
      ? member(c.stage, ["shape", "decorate", "give", "served"], "shape")
      : member(c.stage, ["shape", "decorate"], "shape"),
    friend: member(c.friend, FRIENDS, "momo"),
  };
}
export function normalizeCozy(value: unknown): CozyProgress {
  const raw = record(value),
    t = record(raw.tea);
  const leaves = t.started === true && t.leaves === true,
    baked = leaves && t.baked === true;
  const table = baked ? count(t.table, 3) : 0;
  const complete = table === 3 && t.complete === true;
  const postcards: PostcardMemory[] = [];
  for (const item of Array.isArray(raw.postcards) ? raw.postcards : []) {
    const p = record(item);
    if (postcards.length === 6) break;
    if (
      typeof p.id !== "string" ||
      p.id.length > 80 ||
      postcards.some((m) => m.id === p.id) ||
      typeof p.image !== "string" ||
      p.image.length > 18000 ||
      !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.image) ||
      typeof p.createdAt !== "string" ||
      !Number.isFinite(Date.parse(p.createdAt))
    )
      continue;
    postcards.push({
      id: p.id,
      image: p.image,
      createdAt: new Date(p.createdAt).toISOString(),
      outfit: member(
        p.outfit,
        ["classic", "sailor", "picnic", "moonlight", "berry", "blossom"],
        "classic",
      ),
      background:
        typeof p.background === "string"
          ? p.background.slice(0, 40)
          : "Rose milk",
      place:
        typeof p.place === "string" ? p.place.slice(0, 60) : "Kitty’s room",
      pose: typeof p.pose === "string" ? p.pose.slice(0, 30) : "still",
    });
  }
  return {
    version: 1,
    cookie: normalizeCookie(raw.cookie),
    cookiesGiven: count(raw.cookiesGiven, 999999),
    postcards,
    tea: {
      active: t.started === true && t.active !== false && !complete,
      started: t.started === true,
      leaves,
      baked,
      cookie: baked ? normalizeCookie(t.cookie ?? raw.cookie) : null,
      table,
      complete,
    },
  };
}
export const TEA_LEAVES = { x: 2, z: 8 };
export const TEA_TABLE = { x: 5, z: 10 };
export const nearTea = (a: Adventure, p: { x: number; z: number }) =>
  a.map === "glade" && Math.abs(a.x - p.x) + Math.abs(a.z - p.z) <= 1;
export function teaGoal(c: CozyProgress) {
  if (!c.tea.leaves)
    return {
      key: "tea-leaves",
      title: "A fragrant little invitation",
      instruction:
        "Find the mint leaves beside the glade entrance. Walk up to gather them.",
      hint: "From the glade entrance, walk north toward the mint sprigs. You do not need a tool.",
    };
  if (!c.tea.baked)
    return {
      key: "tea-cookie",
      title: "Something sweet for Momo",
      instruction: "Bake and decorate a cookie, then give it to Momo.",
      hint: "Choose Bake a cookie below. Your leaf basket is safe while you bake.",
    };
  return {
    key: "tea-table",
    title: "Tea beneath the little moon",
    instruction:
      "Find the pink table east of the glade entrance. Set out two cups and your cookie.",
    hint: "The tea table is on the entrance side of the stream, near the southern path. Approach it to set the table.",
  };
}
