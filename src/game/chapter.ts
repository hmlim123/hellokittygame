import type {
  Adventure,
  ChapterProgress,
  Equipment,
  GameMap,
  MapObject,
  Story,
} from "./types";
export const STAR_ORDER = ["moon", "flower", "heart"] as const;
export const TOOLS = [
  {
    id: "lantern" as const,
    name: "Butterfly lantern",
    detail: "Reveal the hidden butterfly path in the glade.",
  },
  {
    id: "watering" as const,
    name: "Little watering can",
    detail: "Help the thirsty glade flowers bloom.",
  },
  {
    id: "ribbon" as const,
    name: "Friendship ribbon",
    detail: "Tie the bridge to the flowers’ strong new vines.",
  },
];
export function normalizeChapter(
  raw: unknown,
  complete = false,
): ChapterProgress {
  const r = (
    raw && typeof raw === "object" ? raw : {}
  ) as Partial<ChapterProgress>;
  const butterflyStep = Math.min(
    3,
    Math.max(0, Number.isInteger(r.butterflyStep) ? r.butterflyStep! : 0),
  );
  const flowersRevived = r.flowersRevived === true && butterflyStep === 3,
    bridgeFixed = r.bridgeFixed === true && flowersRevived;
  const stars: string[] = [];
  if (bridgeFixed && Array.isArray(r.stars))
    for (let i = 0; i < 3; i++) {
      if (r.stars[i] !== STAR_ORDER[i]) break;
      stars.push(STAR_ORDER[i]);
    }
  const friendAwake = r.friendAwake === true && stars.length === 3,
    letterFound = r.letterFound === true && friendAwake;
  return {
    version: 1,
    butterflyStep,
    flowersRevived,
    bridgeFixed,
    stars,
    friendAwake,
    letterFound,
    endingSeen: r.endingSeen === true && letterFound && complete,
    postcardSaved: r.postcardSaved === true,
  };
}
export function gladeMap(): GameMap {
  const w = 15,
    h = 13;
  const rows: string[][] = Array.from({ length: h }, (_, z) =>
    Array.from({ length: w }, (_, x) =>
      x === 0 || x === w - 1 || z === 0 || z === h - 1 ? "#" : ".",
    ),
  );
  for (let z = 1; z < h - 1; z++) rows[z][7] = "~";
  for (let x = 1; x <= 6; x++) rows[7][x] = "#";
  rows[7][3] = "h";
  rows[8][7] = "J";
  const objects: MapObject[] = [
    { type: "V", x: 1, z: 10 },
    { type: "L", id: "0", x: 3, z: 9 },
    { type: "L", id: "1", x: 3, z: 7 },
    { type: "L", id: "2", x: 5, z: 6 },
    { type: "W", x: 5, z: 5 },
    { type: "J", x: 7, z: 8 },
    { type: "Z", x: 10, z: 5 },
    { type: "N", x: 11, z: 7 },
    { type: "K", x: 12, z: 8 },
    { type: "P", x: 11, z: 2 },
  ];
  for (const o of objects) rows[o.z][o.x] = o.type;
  return {
    w,
    h,
    rows: rows.map((r) => r.join("")),
    objects,
    spawn: [2, 10],
    title: "Butterfly Glade",
  };
}
export function chapterObjective(s: Adventure): string {
  const c = s.chapter;
  if (!c.butterflyStep)
    return "Follow the first butterflies. Use Butterfly lantern below when you are nearby.";
  if (c.butterflyStep < 3)
    return `Follow the glowing butterflies with your lantern: ${c.butterflyStep} / 3 trail markers.`;
  if (!c.flowersRevived)
    return "Find the thirsty flowers north of the hidden path. Choose Use watering can when nearby.";
  if (!c.bridgeFixed)
    return "Approach the broken bridge to the east. Choose Tie friendship ribbon to help.";
  if (c.stars.length < 3)
    return "Across the bridge, arrange the stars: moon → flower → heart.";
  if (!c.friendAwake)
    return "Find the sleepy bunny beside the stars. Offer Cuddle teddy for a gentle hello.";
  if (!c.letterFound)
    return "A sealed envelope is waiting beside the bunny. Walk up to discover it.";
  if (!s.complete)
    return "Your letter is safe. Restore the moonflower, then visit the glade picnic under the moon.";
  return c.endingSeen
    ? "Your Butterfly Glade story is complete. Revisit it in your storybook. ♡"
    : "Your moonlit picnic is ready at the north end of Butterfly Glade. ♡";
}
export const endingUnlocked = (s: Adventure) =>
  s.complete && s.chapter.letterFound;
export function chapterEligible(s: Adventure, o: MapObject): boolean {
  const c = s.chapter;
  return o.type === "L"
    ? Number(o.id) === c.butterflyStep
    : o.type === "W"
      ? !c.flowersRevived
      : o.type === "J"
        ? !c.bridgeFixed
        : o.type === "Z"
          ? c.bridgeFixed && c.stars.length < 3
          : o.type === "N"
            ? !c.friendAwake
            : o.type === "K"
              ? c.friendAwake && !c.letterFound
              : o.type === "P"
                ? endingUnlocked(s) && !c.endingSeen
                : false;
}
export function interactChapter(
  s: Adventure,
  o: MapObject,
  e: Equipment,
): Story {
  const c = s.chapter;
  const say = (
    speaker: string,
    text: string,
    art: string,
    extra: Partial<Story> = {},
  ): Story => ({ speaker, text, art, source: o, ...extra });
  if (o.type === "L") {
    if (Number(o.id) !== c.butterflyStep)
      return say(
        "Little butterflies",
        "The next glowing butterflies will guide you. Keep your lantern close.",
        "butterfly",
      );
    if (e.item !== "lantern")
      return say(
        "A path in the leaves",
        "Choose Use butterfly lantern below, or equip Butterfly lantern in Inventory → Items.",
        "lantern",
      );
    c.butterflyStep++;
    return say(
      "Follow the butterflies",
      c.butterflyStep === 1
        ? "Your lantern reveals stepping stones through the hedge. Follow the butterflies north."
        : c.butterflyStep === 3
          ? "You found the secret flower patch! The little flowers look thirsty. Try your watering can."
          : "The butterflies flutter toward the flower patch to the northeast.",
      "butterfly",
      { chime: true, wave: true },
    );
  }
  if (o.type === "W") {
    if (c.flowersRevived)
      return say(
        "A flower patch for Nancy",
        "The flowers remember your kindness. Their vines are strong enough to anchor the bridge.",
        "bloom",
      );
    if (c.butterflyStep < 3)
      return say(
        "Thirsty little flowers",
        "Follow all three butterfly markers with your lantern first.",
        "bloom",
      );
    if (e.item !== "watering")
      return say(
        "A sip of water?",
        "Choose Use watering can below, or equip Little watering can in Inventory → Items.",
        "watering",
      );
    c.flowersRevived = true;
    return say(
      "A little garden awakens",
      "The flowers bloom and reach toward the stream. Bring your Friendship ribbon to the broken bridge.",
      "bloom",
      { chime: true, wave: true },
    );
  }
  if (o.type === "J") {
    if (c.bridgeFixed)
      return say(
        "A bridge between friends",
        "Your ribbon holds the bridge safely. The star clearing is across the stream.",
        "bridge",
      );
    if (!c.flowersRevived)
      return say(
        "A bridge waiting for kindness",
        "The bridge needs an anchor. Help the thirsty flowers beyond the butterfly path first.",
        "bridge",
      );
    if (e.item !== "ribbon")
      return say(
        "One little knot",
        "Choose Tie friendship ribbon below, or equip Friendship ribbon in Inventory → Items.",
        "ribbon",
      );
    c.bridgeFixed = true;
    return say(
      "Tied with a little friendship",
      "A ribbon and the flowers’ strong vines mend the bridge. The star clearing is open!",
      "bridge",
      { chime: true, wave: true },
    );
  }
  if (o.type === "Z")
    return say(
      "Three wishing stars",
      c.stars.length === 3
        ? "Moon, flower, heart. The stars are glowing together."
        : "Arrange the stars in the order carved into the stones. There is no rush.",
      "stars",
      {
        choices:
          c.stars.length === 3
            ? []
            : [{ id: "stars", label: "Arrange the stars" }],
      },
    );
  if (o.type === "N") {
    if (c.friendAwake)
      return say(
        "Pip the bunny",
        "Thank you for a gentle hello, Nancy. A sealed envelope is waiting just beside me.",
        "bunny",
      );
    if (c.stars.length < 3)
      return say(
        "A sleepy forest friend",
        "Pip is dreaming under three dim stars. Arrange the wishing stars to make this clearing cozy.",
        "bunny",
      );
    if (e.item !== "teddy")
      return say(
        "A soft little hello",
        "Choose Offer cuddle teddy below, or equip Cuddle teddy to give Pip a gentle hello.",
        "bunny",
      );
    c.friendAwake = true;
    return say(
      "Good evening, Pip",
      "Pip wakes with a happy wiggle and points to a heart-sealed envelope beside the path.",
      "bunny",
      { chime: true, wave: true },
    );
  }
  if (o.type === "K") {
    if (!c.friendAwake)
      return say(
        "A quiet little clearing",
        "Help the sleepy bunny first. There may be a surprise waiting.",
        "envelope",
      );
    if (c.letterFound)
      return say(
        "Your letter is safe",
        "Your envelope is waiting at home and in your storybook.",
        "envelope",
      );
    c.letterFound = true;
    return say(
      "A letter for Nancy",
      "You found a heart-sealed envelope. Kitty tucks it into her paws to bring home. Your own special message is still being written.",
      "envelope",
      { chime: true, wave: true },
    );
  }
  return say(
    "A picnic beneath the moon",
    endingUnlocked(s)
      ? "Your friends are ready for a quiet picnic. Shall we sit together?"
      : "A blanket waits under the moon. Help Pip, find the envelope, and restore the moonflower to gather your friends here.",
    "picnic",
    {
      choices: endingUnlocked(s)
        ? [{ id: "ending", label: "Sit under the moon" }]
        : [],
    },
  );
}
export interface MemoryPage {
  id: string;
  title: string;
  art: string;
  place: string;
  text: string;
  unlocked: boolean;
}
export function memoryPages(s: Adventure): MemoryPage[] {
  const c = s.chapter;
  return [
    {
      id: "moonflower",
      title: "A garden glowing again",
      art: "moonflower",
      place: "Moonflower Garden",
      text: "Three charms, a listening ear, and a friendly wave brought the moonflower back to life.",
      unlocked: s.complete,
    },
    {
      id: "ribbons",
      title: "Little ribbons, brought home",
      art: "ribbon",
      place: "Rosemilk Village",
      text: "You found Momo’s three ribbons. A berry pink outfit remembers the day.",
      unlocked: s.ribbonReturned,
    },
    {
      id: "picnic",
      title: "A picnic for Momo",
      art: "berry",
      place: "By the village fountain",
      text: "Two berry bushes and a sweet strawberry became a little picnic shared with Momo.",
      unlocked: s.picnicDelivered,
    },
    {
      id: "lanterns",
      title: "A little light for home",
      art: "lantern",
      place: "The northern garden",
      text: "Two garden lanterns lit the way. One warm little memory followed Kitty home.",
      unlocked: s.lanternsBlessed,
    },
    {
      id: "butterflies",
      title: "Where the butterflies go",
      art: "butterfly",
      place: "Butterfly Glade",
      text: "With a lantern in your paws, you followed three small lights through a hidden path.",
      unlocked: c.butterflyStep === 3,
    },
    {
      id: "flowers",
      title: "A garden remembers kindness",
      art: "bloom",
      place: "The secret flower patch",
      text: "A little water helped the thirsty flowers bloom. Their new vines reached toward the stream. Your Blossom keepsake dress and the flower souvenir at home remember this kindness.",
      unlocked: c.flowersRevived,
    },
    {
      id: "bridge",
      title: "One little knot",
      art: "bridge",
      place: "The glade stream",
      text: "A friendship ribbon and the flowers’ vines made a bridge to somewhere new.",
      unlocked: c.bridgeFixed,
    },
    {
      id: "stars",
      title: "Moon, flower, heart",
      art: "stars",
      place: "The wishing-star clearing",
      text: "You arranged three stars without hurrying. Together, they made a sleepy corner feel cozy.",
      unlocked: c.stars.length === 3,
    },
    {
      id: "bunny",
      title: "A gentle hello for Pip",
      art: "bunny",
      place: "The forest clearing",
      text: "A cuddle teddy helped Pip wake softly. A new friend, and a little surprise, were waiting.",
      unlocked: c.friendAwake,
    },
    {
      id: "letter",
      title: "An envelope to bring home",
      art: "envelope",
      place: "Beside Pip’s tree",
      text: "Kitty found a heart-sealed envelope and carried it home for Nancy. Its words belong to the person writing it.",
      unlocked: c.letterFound,
    },
    {
      id: "ending",
      title: "Under the same little moon",
      art: "picnic",
      place: "A moonlit picnic",
      text: "Kitty, Momo, Pip, and the cloud guardian sat beneath the moon. A quiet ending to a day of small kindnesses.",
      unlocked: c.endingSeen,
    },
    {
      id: "postcard",
      title: "For Nancy ♡",
      art: "postcard",
      place: "Kitty’s photo corner",
      text: "An outfit, a pose, and a little happy moment saved as a postcard.",
      unlocked: c.postcardSaved,
    },
  ];
}
