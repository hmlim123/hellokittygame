import type { PlushId } from "./types";
export interface TaleStep {
  text: string;
  goal: string;
  hint: string;
  kind: "collect" | "sequence";
  tokens: string[];
  labels: string[];
  icons: string[];
  prop: "bow" | "star" | "flower" | "heart" | "cup";
}
export interface FriendTale {
  id: PlushId;
  friend: number;
  name: string;
  title: string;
  place: string;
  color: string;
  intro: string;
  ending: string;
  memory: string;
  steps: TaleStep[];
}
const step = (
  text: string,
  goal: string,
  hint: string,
  kind: TaleStep["kind"],
  tokens: string[],
  labels: string[],
  icons: string[],
  prop: TaleStep["prop"],
): TaleStep => ({ text, goal, hint, kind, tokens, labels, icons, prop });
export const FRIEND_TALES: FriendTale[] = [
  {
    id: "cloud",
    friend: 1,
    name: "Strawberry Cloud",
    title: "A ribbon after the rain",
    place: "The little ribbon garden",
    color: "#f2c9da",
    intro:
      "The rain has left three pink ribbons among the leaves. Strawberry Cloud wants to wrap a little parcel, but her bow basket is empty. “Could we find them together, Nancy?”",
    ending:
      "The parcel is finished, with one extra ribbon tied around its handle. “That one is for you,” Cloud says. A rainy afternoon has become a beginning.",
    memory:
      "Nancy gathered the rain-tossed ribbons, tied a bow in three gentle steps and packed a little parcel. Strawberry Cloud kept one ribbon for their new friendship.",
    steps: [
      step(
        "The ribbons shine between the wet leaves. Nothing is lost for long when someone stops to look.",
        "Find the three pink ribbons.",
        "Each ribbon needs just one gentle tap.",
        "collect",
        ["ribbon-left", "ribbon-middle", "ribbon-right"],
        [
          "Ribbon by the leaf",
          "Ribbon on the stone",
          "Ribbon beside the basket",
        ],
        ["🎀", "🎀", "🎀"],
        "bow",
      ),
      step(
        "Cloud holds the parcel still. “First a loop, then a little knot, then the other loop.”",
        "Tie the bow: first loop → knot → second loop.",
        "Follow Cloud’s three steps from left to right.",
        "sequence",
        ["loop", "knot", "second-loop"],
        ["First loop", "Little knot", "Second loop"],
        ["⌒", "♡", "⌒"],
        "bow",
      ),
      step(
        "The parcel has room for three small kindnesses. Cloud smiles when Nancy chooses each one.",
        "Pack a flower, a heart and the finished bow.",
        "All three belong in the parcel; any order is lovely.",
        "collect",
        ["flower", "heart", "bow"],
        ["Pack the flower", "Pack the little heart", "Pack the finished bow"],
        ["🌸", "♡", "🎀"],
        "heart",
      ),
    ],
  },
  {
    id: "witch",
    friend: 2,
    name: "Moonlight Witch",
    title: "A pocketful of starlight",
    place: "The lantern clearing",
    color: "#ded2ef",
    intro:
      "Moonlight Witch has brought a lantern to the clearing. Its glass is empty, but three shy fireflies are watching from the grass. “We only need enough light to find our way home.”",
    ending:
      "The lantern glows softly. Witch leaves its door open so the fireflies can come and go. “A little light is best when it is shared,” she tells Nancy.",
    memory:
      "Nancy followed three shy lights, arranged the moon, star and heart, and lit the clearing’s lanterns. Moonlight Witch brought their gentle glow home.",
    steps: [
      step(
        "The fireflies blink once, as though asking whether it is safe to come closer.",
        "Greet the three little lights.",
        "Tap each light once. They will stay close to the lantern.",
        "collect",
        ["light-1", "light-2", "light-3"],
        [
          "Greet the first light",
          "Greet the second light",
          "Greet the third light",
        ],
        ["✧", "✧", "✧"],
        "star",
      ),
      step(
        "A tiny pattern is stitched inside Witch’s hat: moon, star, heart. The lantern remembers it too.",
        "Arrange moon → star → heart.",
        "The stitched pattern is the hint: moon, then star, then heart.",
        "sequence",
        ["moon", "star", "heart"],
        ["Place the moon", "Place the star", "Place the heart"],
        ["☾", "✧", "♡"],
        "star",
      ),
      step(
        "The path home has three quiet corners. One small lantern at each corner will be enough.",
        "Light the three path lanterns.",
        "Any order is fine. The clearing only needs a little glow.",
        "collect",
        ["lantern-1", "lantern-2", "lantern-3"],
        [
          "Light the garden lantern",
          "Light the bridge lantern",
          "Light the home lantern",
        ],
        ["🏮", "🏮", "🏮"],
        "star",
      ),
    ],
  },
  {
    id: "baby",
    friend: 3,
    name: "Baby Blossom",
    title: "The sleepiest little cloud",
    place: "A soft cloud nursery",
    color: "#f3d9e5",
    intro:
      "Baby Blossom’s little cloud will not settle down. Her teddy is nearby, and the night-light is waiting for three stars. Nancy can help, without hurrying a single moment.",
    ending:
      "The little cloud finally rests. Blossom cuddles her teddy and gives Nancy one sleepy wave. The smallest goodnight can make a whole room feel safe.",
    memory:
      "Nancy found three soft stars, made a quiet moon–cloud–heart lullaby and tucked Blossom’s favorite things close. Baby Blossom’s first goodnight became a page to keep.",
    steps: [
      step(
        "Three soft stars have slipped out of the night-light. Blossom watches them with wide, sleepy eyes.",
        "Return the three stars to the night-light.",
        "Tap each soft star. There is no rhythm to keep and no timer.",
        "collect",
        ["soft-star-1", "soft-star-2", "soft-star-3"],
        [
          "Return the first soft star",
          "Return the second soft star",
          "Return the third soft star",
        ],
        ["✧", "✧", "✧"],
        "star",
      ),
      step(
        "A lullaby can be made from pictures: a moon above a cloud, and a little heart beneath it.",
        "Make moon → cloud → heart.",
        "Take your time: moon, cloud, then heart.",
        "sequence",
        ["moon", "cloud", "heart"],
        ["The quiet moon", "The sleepy cloud", "A goodnight heart"],
        ["☾", "☁", "♡"],
        "heart",
      ),
      step(
        "Her teddy, blanket and warm little night-light are ready. Blossom only needs them close by.",
        "Tuck in the teddy, blanket and night-light.",
        "Give each little comfort one gentle tap.",
        "collect",
        ["teddy", "blanket", "nightlight"],
        [
          "Tuck in the teddy",
          "Lay the soft blanket",
          "Set down the night-light",
        ],
        ["🧸", "☁", "✧"],
        "heart",
      ),
    ],
  },
  {
    id: "kitten",
    friend: 4,
    name: "Rose Kitten",
    title: "The garden’s quiet surprise",
    place: "The secret flower corner",
    color: "#efd8dd",
    intro:
      "Rose Kitten has found a small corner of the garden where nothing seems to grow. Three shy buds are waiting beneath the leaves. “Perhaps they only need someone to notice.”",
    ending:
      "The last bud opens around a little heart-shaped seed. Kitten places it in Nancy’s palm. “A garden can begin with something very small.”",
    memory:
      "Nancy watered the shy buds, followed a trail of leaf, flower and sun, and made a tiny garden bed. Rose Kitten found a heart-shaped seed to remember the day.",
    steps: [
      step(
        "The soil is dry, but the stems are still green. Kitten holds the leaves aside for Nancy.",
        "Water the three shy flowers.",
        "Tap each flower to give it a little water.",
        "collect",
        ["bud-1", "bud-2", "bud-3"],
        [
          "Water the first flower",
          "Water the second flower",
          "Water the third flower",
        ],
        ["🌱", "🌱", "🌱"],
        "flower",
      ),
      step(
        "A trail appears as the petals unfold: a leaf, a flower, and a little sun.",
        "Follow leaf → flower → sun.",
        "The garden’s trail is leaf, flower, then sun.",
        "sequence",
        ["leaf", "flower", "sun"],
        ["Follow the leaf", "Follow the flower", "Follow the sun"],
        ["🌿", "🌸", "☀"],
        "flower",
      ),
      step(
        "The garden has room for a seed, a drink of water and one soft patch of sunlight.",
        "Give the new seed its three little comforts.",
        "Any order works: seed, water and sunshine all help it grow.",
        "collect",
        ["seed", "water", "sunshine"],
        ["Plant the little seed", "Give the seed water", "Let the sunshine in"],
        ["♡", "💧", "☀"],
        "flower",
      ),
    ],
  },
  {
    id: "bunny",
    friend: 5,
    name: "Silver Bunny",
    title: "An invitation from the moon",
    place: "The moonlit picnic path",
    color: "#e0e3ef",
    intro:
      "Silver Bunny has an invitation for a picnic beneath the moon. The path is dim, and three paper lanterns have folded themselves closed. Nancy can help the evening find its sparkle.",
    ending:
      "The invitation reaches the picnic table. Bunny pours an imaginary first cup and leaves the seat beside her for Nancy. There is no grand occasion—only a lovely place to be together.",
    memory:
      "Nancy opened the moonlit lanterns, matched the invitation’s moon, flower and heart, and set three little picnic things in place. Silver Bunny saved her a seat beneath the moon.",
    steps: [
      step(
        "The lanterns are safe, just folded up like sleepy flowers. Bunny gently holds their ribbons.",
        "Open the three paper lanterns.",
        "Tap each folded lantern to let its light out.",
        "collect",
        ["paper-1", "paper-2", "paper-3"],
        [
          "Open the first lantern",
          "Open the second lantern",
          "Open the third lantern",
        ],
        ["🏮", "🏮", "🏮"],
        "star",
      ),
      step(
        "Three pictures seal the invitation. Bunny reads them aloud: moon, flower, heart.",
        "Match moon → flower → heart.",
        "The invitation says moon first, flower next, heart last.",
        "sequence",
        ["moon", "flower", "heart"],
        ["Match the moon", "Match the flower", "Match the heart"],
        ["☾", "✿", "♡"],
        "heart",
      ),
      step(
        "The picnic table is almost ready. A cup, a little plate and the invitation will make it feel like home.",
        "Set the cup, plate and invitation on the picnic blanket.",
        "There is a place for all three, in any order.",
        "collect",
        ["cup", "plate", "invitation"],
        [
          "Set down the teacup",
          "Set down the little plate",
          "Deliver the invitation",
        ],
        ["☕", "🍽", "💌"],
        "cup",
      ),
    ],
  },
];
export interface TaleProgress {
  started: boolean;
  step: number;
  found: string[];
  complete: boolean;
}
export type TaleCollection = Record<PlushId, TaleProgress>;
export const newTale = (): TaleProgress => ({
  started: false,
  step: 0,
  found: [],
  complete: false,
});
export function normalizeTales(value: unknown): TaleCollection {
  const raw =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return Object.fromEntries(
    FRIEND_TALES.map((t) => {
      const r =
        raw[t.id] && typeof raw[t.id] === "object"
          ? (raw[t.id] as Partial<TaleProgress>)
          : {};
      const step = Number.isInteger(r.step)
        ? Math.max(0, Math.min(3, r.step!))
        : 0;
      const started = r.started === true;
      const allowed = t.steps[step]?.tokens || [];
      let found: string[] = [];
      if (started && Array.isArray(r.found))
        for (const token of r.found) {
          if (!allowed.includes(token) || found.includes(token)) continue;
          if (
            t.steps[step]?.kind === "sequence" &&
            token !== allowed[found.length]
          )
            break;
          found.push(token);
          if (found.length === 2) break;
        }
      return [
        t.id,
        {
          started,
          step: started ? step : 0,
          found,
          complete: started && step === 3 && r.complete === true,
        },
      ];
    }),
  ) as TaleCollection;
}
export function advanceTale(
  tale: FriendTale,
  progress: TaleProgress,
  token: string,
): TaleProgress | null {
  const step = tale.steps[progress.step];
  if (
    !progress.started ||
    progress.complete ||
    !step ||
    !step.tokens.includes(token) ||
    progress.found.includes(token)
  )
    return null;
  if (step.kind === "sequence" && token !== step.tokens[progress.found.length])
    return null;
  const found = [...progress.found, token];
  return found.length === step.tokens.length
    ? { ...progress, step: progress.step + 1, found: [] }
    : { ...progress, found };
}
