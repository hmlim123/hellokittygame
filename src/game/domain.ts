import {
  normalizeChapter,
  gladeMap,
  TOOLS,
  chapterEligible,
  interactChapter,
  chapterObjective,
} from "./chapter";
// Existing, well-tested game rules remain behind a typed boundary during migration.
import * as adventure from "../../dist/adventure-state.js";
import * as outfits from "../../dist/equipment-state.js";
import * as room from "../../dist/state.js";
import * as missions from "../../dist/missions.js";
import * as quests from "../../dist/adventure-quests.js";
import { kittyReply as reply } from "../../dist/chat.js";
import type {
  Adventure,
  Equipment,
  Room,
  Journal,
  GameMap,
  MapObject,
  Story,
  Mission,
  MissionId,
  QuestId,
  ItemId,
} from "./types";
export function normalizeAdventure(raw: unknown = {}): Adventure {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Adventure>;
  const base = adventure.normalizeAdventure(
    r.map === "glade" ? { ...r, map: "garden", accepted: true } : r,
  ) as Adventure;
  const result = {
    ...base,
    chapter: normalizeChapter(r.chapter, base.complete),
    trackedQuest: r.trackedQuest === "glade" ? "glade" : base.trackedQuest,
  } as Adventure;
  if (r.map === "glade") {
    result.map = "glade";
    result.x = r.x!;
    result.z = r.z!;
    if (
      !Number.isInteger(result.x) ||
      !Number.isInteger(result.z) ||
      !walkable(result, result.x, result.z) ||
      (!result.chapter.bridgeFixed && result.x >= 7) ||
      (result.chapter.butterflyStep === 0 && result.x < 7 && result.z < 7)
    )
      [result.x, result.z] = MAPS.glade.spawn;
  }
  return result;
}
export function normalizeEquipment(
  raw: unknown = {},
  quest?: Adventure,
  legacy?: unknown,
): Equipment {
  const base = outfits.normalizeEquipment(
    raw as {},
    quest,
    legacy as {},
  ) as Equipment;
  const item =
    raw && typeof raw === "object" ? (raw as Equipment).item : undefined;
  return TOOLS.some((t) => t.id === item)
    ? { ...base, item: item as ItemId }
    : base;
}
export const normalizeRoom = room.normalizeState as (
  raw?: unknown,
  legacy?: unknown,
) => Room;
export const normalizeJournal = missions.normalizeJournal as (
  raw?: unknown,
) => Journal;
const garden = adventure.MAPS.garden;
const gardenRows = garden.rows.map((r: string, z: number) =>
  z === 11 ? r.slice(0, 13) + "A" + r.slice(14) : r,
);
export const MAPS: Record<Adventure["map"], GameMap> = {
  ...adventure.MAPS,
  garden: {
    ...garden,
    rows: gardenRows,
    objects: [...garden.objects, { type: "A", x: 13, z: 11 }],
  },
  glade: gladeMap(),
};
export const questText = (s: Adventure) =>
  s.map === "glade" || s.trackedQuest === "glade"
    ? chapterObjective(s)
    : s.complete && s.ribbonReturned && s.picnicDelivered && s.lanternsBlessed
      ? s.chapter.endingSeen
        ? "All five quests complete. Nancy’s little world is glowing. ♡"
        : "The garden stories are complete. A new little chapter awaits in Butterfly Glade."
      : adventure.questText(s);
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
export function enterPath(
  s: Adventure,
  tile: string,
): { moved: boolean; changedMap?: boolean } {
  if (!MAPS[s.map].objects.some((o) => o.type === tile))
    return { moved: false };
  if (tile === "A") {
    s.accepted = true;
    s.map = "glade";
    s.trackedQuest = "glade";
    [s.x, s.z] = MAPS.glade.spawn;
    return { moved: true, changedMap: true };
  }
  if (tile === "V") {
    if (s.chapter.letterFound && !s.complete) s.trackedQuest = "moonflower";
    s.map = "garden";
    [s.x, s.z] = [13, 10];
    return { moved: true, changedMap: true };
  }
  return adventure.enterAdventurePath(s, tile);
}
export function moveAdventure(
  s: Adventure,
  dir: string,
): { moved: boolean; changedMap?: boolean } {
  const d = (
    { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as Record<
      string,
      number[]
    >
  )[dir];
  if (!d) return { moved: false };
  s.facing = dir as Adventure["facing"];
  const x = s.x + d[0],
    z = s.z + d[1];
  if (!walkable(s, x, z)) return { moved: false };
  const t = MAPS[s.map].rows[z][x];
  if (["D", "E", "A", "V"].includes(t)) return enterPath(s, t);
  s.x = x;
  s.z = z;
  return { moved: true };
}
export function nearbyObject(s: Adventure): MapObject | undefined {
  const [dx, dz] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[
    s.facing
  ];
  return (
    MAPS[s.map].objects.find((o) => o.x === s.x + dx && o.z === s.z + dz) ||
    MAPS[s.map].objects.find(
      (o) =>
        Math.abs(o.x - s.x) + Math.abs(o.z - s.z) <= 1 ||
        (o.type === "H" &&
          Math.max(Math.abs(o.x - s.x), Math.abs(o.z - s.z)) === 2),
    )
  );
}
export function interactAdventure(
  s: Adventure,
  choice?: string,
  target = nearbyObject(s),
  equipment?: Equipment,
): Story {
  if (
    target &&
    MAPS[s.map].objects.includes(target) &&
    ["A", "V"].includes(target.type)
  ) {
    enterPath(s, target.type);
    return {
      speaker: MAPS[s.map].title,
      text: "Follow the little path. Your discoveries are safe.",
      changedMap: true,
    };
  }
  if (s.map === "glade" && target && MAPS.glade.objects.includes(target))
    return interactChapter(
      s,
      target,
      equipment || { version: 1, outfit: "classic", item: "none" },
    );
  if (s.map === "glade")
    return { speaker: "Kitty", text: chapterObjective(s), art: "butterfly" };
  return adventure.interactAdventure(s, choice, target, equipment) as Story;
}
export function directions(s: Adventure): string {
  if (s.map !== "glade")
    return s.trackedQuest === "glade"
      ? "Butterfly Glade · the lilac arch in the garden’s southeast"
      : adventure.villageDirections(s);
  const c = s.chapter,
    type =
      c.butterflyStep < 3
        ? "L"
        : !c.flowersRevived
          ? "W"
          : !c.bridgeFixed
            ? "J"
            : c.stars.length < 3
              ? "Z"
              : !c.friendAwake
                ? "N"
                : !c.letterFound
                  ? "K"
                  : !s.complete
                    ? "V"
                    : "P";
  const target = MAPS.glade.objects.find(
    (o) =>
      o.type === type && (type !== "L" || Number(o.id) === c.butterflyStep),
  )!;
  const label = (
    {
      L: "Butterflies",
      W: "Thirsty flowers",
      J: "Friendship bridge",
      Z: "Wishing stars",
      N: "Pip the bunny",
      K: "Nancy’s envelope",
      V: "Garden path",
      P: "Moonlit picnic",
    } as Record<string, string>
  )[type];
  const queue = [{ x: s.x, z: s.z, first: "", steps: 0 }],
    seen = new Set([`${s.x},${s.z}`]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (Math.abs(p.x - target.x) + Math.abs(p.z - target.z) <= 1)
      return p.steps
        ? `${({ up: "↑", down: "↓", left: "←", right: "→" } as Record<string, string>)[p.first]} ${label} · ${p.steps} ${p.steps === 1 ? "step" : "steps"} away`
        : `${label} · right beside you`;
    for (const [d, dx, dz] of [
      ["up", 0, -1],
      ["down", 0, 1],
      ["left", -1, 0],
      ["right", 1, 0],
    ] as [string, number, number][]) {
      const x = p.x + dx,
        z = p.z + dz,
        key = `${x},${z}`;
      if (
        !seen.has(key) &&
        walkable(s, x, z) &&
        MAPS.glade.rows[z][x] !== "V"
      ) {
        seen.add(key);
        queue.push({ x, z, first: p.first || d, steps: p.steps + 1 });
      }
    }
  }
  return `${label} · follow the cream path`;
}
export interface Encounters {
  take(s: Adventure, e?: Equipment): MapObject | undefined;
  mark(s: Adventure, o: MapObject | undefined, e?: Equipment): void;
}
export class EncounterTracker implements Encounters {
  private base = new adventure.AdventureEncounters();
  private contacts = new Set<string>();
  private key(s: Adventure, o: MapObject, e?: Equipment) {
    return `${o.type}:${o.id || ""}:${e?.item}:${JSON.stringify(s.chapter)}`;
  }
  take(s: Adventure, e?: Equipment) {
    if (s.map !== "glade") {
      this.contacts.clear();
      return this.base.take(s, e) as MapObject | undefined;
    }
    const near = MAPS.glade.objects.filter(
        (o) => Math.abs(o.x - s.x) + Math.abs(o.z - s.z) <= 1,
      ),
      keys = new Set(near.map((o) => this.key(s, o, e)));
    this.contacts = new Set([...this.contacts].filter((k) => keys.has(k)));
    const o = near.find(
      (o) => chapterEligible(s, o) && !this.contacts.has(this.key(s, o, e)),
    );
    if (o) this.contacts.add(this.key(s, o, e));
    return o;
  }
  mark(s: Adventure, o: MapObject | undefined, e?: Equipment) {
    if (s.map === "glade") {
      if (o) this.contacts.add(this.key(s, o, e));
    } else this.base.mark(s, o, e);
  }
}
export const OUTFITS = outfits.OUTFITS as {
  id: Equipment["outfit"];
  name: string;
  color: string;
  accent: string;
  detail: string;
  hint?: string;
  unlock: (s: Adventure) => boolean;
}[];
export const ITEMS = [...outfits.HELD_ITEMS, ...TOOLS] as {
  id: ItemId;
  name: string;
  detail: string;
}[];
export const DOLLS = room.DOLLS as {
  id: number;
  name: string;
  short: string;
  color: string;
  accent: string;
  tag: string;
}[];
export const THEMES = room.THEMES as Record<
  Room["theme"],
  { name: string; wall: string; rug: string; accent: string }
>;
export const rewardDoll = room.rewardDoll as (
  state: Room,
) => (typeof DOLLS)[number] | null;
export const placeDoll = room.placeDoll as (
  state: Room,
  id: number,
  slot: number,
) => boolean;
export const MISSIONS = missions.MISSIONS as {
  id: MissionId;
  title: string;
  icon: string;
  description: string;
  goal: number;
  seconds: number | null;
}[];
export const KEEPSAKES = missions.KEEPSAKES as Record<
  MissionId,
  { title: string; note: string }
>;
export const createMission = missions.createMission as (
  id: MissionId,
  options?: { relaxed?: boolean; random?: () => number },
) => Mission;
export const tickMission = missions.tickMission as (
  run: Mission,
  dt: number,
) => void;
export const actMission = missions.actMission as (
  run: Mission,
  index: number,
) => { accepted: boolean; mistake?: boolean; complete?: boolean };
export const replayMemory = missions.replayMemory as (run: Mission) => boolean;
export const recordMission = missions.recordMission as (
  journal: Journal,
  id: MissionId,
) => boolean;
export const questJournal = (
  s: Adventure,
): {
  id: QuestId;
  title: string;
  done: boolean;
  progress: string;
  reward: string;
}[] => [
  ...(quests.questJournal(s) as {
    id: QuestId;
    title: string;
    done: boolean;
    progress: string;
    reward: string;
  }[]),
  {
    id: "glade",
    title: "The Butterfly Glade promise",
    done: s.chapter.endingSeen,
    progress: chapterObjective(s),
    reward: "A storybook, souvenirs, and a moonlit picnic",
  },
];
export const kittyReply = reply as (
  text: string,
  name?: string,
  turn?: number,
) => { text: string; emotion: string };
export { LOVE_LETTER } from "../../dist/letter.js";
export { PICNIC_SPOTS } from "../../dist/item-play.js";
