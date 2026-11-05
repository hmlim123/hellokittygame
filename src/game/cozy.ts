import { normalizeTales, type TaleCollection } from "./friend-tales";
import { normalizePlush } from "../../dist/plush-state.js";
import type { Adventure, OutfitId, PlushId } from "./types";
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
export type RecipeId = "butter" | "strawberry" | "moon" | "cupcake";
export interface Prep {
  stir: number;
  pressed: boolean;
  oven: number;
  extra: boolean;
}
export interface FriendMemory {
  gifts: number;
  visits: number;
  last: Cookie | null;
}
export type CornerSpot = "rug" | "chair" | "nook";
export interface Cookie {
  packed?: boolean;
  recipe?: RecipeId;
  prep?: Prep;
  shape: CookieShape;
  icing: Icing;
  stamps: CookieStamp[];
  stage: "shape" | "decorate" | "give" | "served";
  friend: CookieFriend;
}
export interface PostcardMemory {
  plush?: PlushId;
  id: string;
  image: string;
  outfit: OutfitId;
  background: string;
  place: string;
  pose: string;
  createdAt: string;
}
export interface CozyProgress {
  tales: TaleCollection;
  version: 1;
  weather: "sunny" | "rain";
  rainSound: boolean;
  corner: Record<"cushion" | "frame" | "flowers", CornerSpot>;
  friends: Record<"momo" | "pip", FriendMemory>;
  delivery: {
    active: boolean;
    step: "bake" | "momo" | "mint" | "home" | "done";
    cookie: Cookie | null;
  };
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
  packed: false,
  recipe: "butter",
  prep: { stir: 0, pressed: false, oven: 0, extra: false },
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
  const prep = record(c.prep);
  return {
    packed: c.packed === true && c.stage === "served",
    recipe: member<RecipeId>(
      c.recipe,
      ["butter", "strawberry", "moon", "cupcake"],
      "butter",
    ),
    prep: {
      stir: bounded(prep.stir),
      pressed: prep.pressed === true,
      oven: bounded(prep.oven),
      extra: prep.extra === true,
    },
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
      ...(normalizePlush(p.plush) ? { plush: normalizePlush(p.plush) } : {}),
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
    weather: raw.weather === "rain" ? "rain" : "sunny",
    rainSound: raw.rainSound === true,
    corner: Object.fromEntries(
      ["cushion", "frame", "flowers"].map((k) => [
        k,
        member(record(raw.corner)[k], ["rug", "chair", "nook"], "rug"),
      ]),
    ) as CozyProgress["corner"],
    friends: Object.fromEntries(
      ["momo", "pip"].map((k) => {
        const f = record(record(raw.friends)[k]);
        return [
          k,
          {
            gifts: count(f.gifts, 999999),
            visits: count(f.visits, 999999),
            last:
              count(f.gifts, 999999) > 0 &&
              f.last &&
              COOKIE_SHAPES.includes(record(f.last).shape as CookieShape)
                ? normalizeCookie(f.last)
                : null,
          },
        ];
      }),
    ) as CozyProgress["friends"],
    tales: normalizeTales(raw.tales),
    delivery: normalizeDelivery(raw.delivery),
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

export function bounded(n: unknown) {
  return typeof n === "number" && Number.isFinite(n)
    ? Math.max(0, Math.min(1, n))
    : 0;
}
function normalizeDelivery(value: unknown): CozyProgress["delivery"] {
  const r = record(value),
    step = member(r.step, ["bake", "momo", "mint", "home", "done"], "bake"),
    cookie = r.cookie ? normalizeCookie(r.cookie) : null;
  // A malformed carried parcel returns to baking, without granting a reward.
  const safeStep = step !== "bake" && !cookie ? "bake" : step;
  return {
    active: r.active === true && safeStep !== "done",
    step: safeStep,
    cookie,
  };
}
export const RECIPES: {
  id: RecipeId;
  name: string;
  hint: string;
  action: string;
}[] = [
  {
    id: "butter",
    name: "Little butter cookies",
    hint: "A recipe Kitty always knows.",
    action: "Press the cutter",
  },
  {
    id: "strawberry",
    name: "Strawberry biscuits",
    hint: "Complete your cookie delivery and bring the recipe home.",
    action: "Mash the berries",
  },
  {
    id: "moon",
    name: "Moon-shaped cookies",
    hint: "Discover all three moon charms in Moonflower Garden.",
    action: "Stamp a little moon",
  },
  {
    id: "cupcake",
    name: "Tiny cupcakes",
    hint: "Finish the moonlight tea party with Momo.",
    action: "Swirl the icing",
  },
];
export function recipeUnlocked(id: RecipeId, c: CozyProgress, a: Adventure) {
  return (
    id === "butter" ||
    (id === "strawberry" && c.delivery.step === "done") ||
    (id === "moon" && a.charms.length === 3) ||
    (id === "cupcake" && c.tea.complete)
  );
}
export function cookieName(c: Cookie) {
  return c.recipe && c.recipe !== "butter"
    ? RECIPES.find((r) => r.id === c.recipe)!.name.toLowerCase()
    : `${c.shape} cookie with ${c.icing} icing`;
}
export function friendLine(
  name: "momo" | "pip",
  memory: FriendMemory,
  gatheredMint = false,
) {
  if (memory.last)
    return `I still remember the ${cookieName(memory.last)} you made for me, Nancy. ${["That was such a sweet little surprise.", "Shall we sit together for a moment?", "You always bring a little sunshine with you."][memory.visits % 3]}`;
  if (name === "pip" && gatheredMint)
    return "I loved gathering mint with you, Nancy. Shall we make another quiet afternoon of it?";
  return [
    "It is lovely to spend a little time with you, Nancy.",
    "I saved a quiet little spot for us.",
    "Welcome back, Nancy. There is no hurry today.",
  ][memory.visits % 3];
}
export function decorationUnlocked(
  id: "cushion" | "frame" | "flowers",
  c: CozyProgress,
  a: Adventure,
) {
  return id === "cushion"
    ? c.delivery.step === "done"
    : id === "frame"
      ? c.postcards.length > 0
      : a.chapter.flowersRevived;
}
export function deliveryGoal(c: CozyProgress) {
  const step = c.delivery.step;
  return {
    key: "delivery-" + step,
    title:
      step === "bake"
        ? "A cookie to carry"
        : step === "momo"
          ? "A little gift for Momo"
          : step === "mint"
            ? "Gather mint with Pip"
            : "Bring your recipe card home",
    instruction:
      step === "bake"
        ? "Bake, decorate, and pack a cookie for your walk."
        : step === "momo"
          ? "Visit Momo by the village fountain. Talk to her to hand over your cookie."
          : step === "mint"
            ? "Visit Butterfly Glade. Walk north from the entrance to the mint beside Pip."
            : "Return to Kitty’s room. Your strawberry recipe and cushion are waiting.",
    hint:
      step === "momo"
        ? "Momo is at the fountain: from the village entrance walk left twice, then up three times."
        : step === "mint"
          ? "The mint is beside the glade entrance; no bridge or tool is needed."
          : "Choose Her room above the scene. Your parcel and memories save automatically.",
  };
}
