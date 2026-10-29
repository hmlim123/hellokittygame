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
} from "./types";
export const normalizeAdventure = adventure.normalizeAdventure as (
  raw?: unknown,
) => Adventure;
export const normalizeEquipment = outfits.normalizeEquipment as (
  raw?: unknown,
  quest?: Adventure,
  legacy?: unknown,
) => Equipment;
export const normalizeRoom = room.normalizeState as (
  raw?: unknown,
  legacy?: unknown,
) => Room;
export const normalizeJournal = missions.normalizeJournal as (
  raw?: unknown,
) => Journal;
export const MAPS = adventure.MAPS as Record<Adventure["map"], GameMap>;
export const questText = adventure.questText as (state: Adventure) => string;
export const walkable = adventure.walkable as (
  state: Adventure,
  x: number,
  z: number,
) => boolean;
export const moveAdventure = adventure.moveAdventure as (
  state: Adventure,
  dir: string,
) => { moved: boolean; changedMap?: boolean; message?: string };
export const interactAdventure = adventure.interactAdventure as (
  state: Adventure,
  choice?: string,
  target?: MapObject,
  equipment?: Equipment,
) => Story;
export const nearbyObject = adventure.nearbyObject as (
  state: Adventure,
) => MapObject | undefined;
export const enterPath = adventure.enterAdventurePath as (
  state: Adventure,
  tile: string,
) => { moved: boolean; changedMap?: boolean };
export const directions = adventure.villageDirections as (
  state: Adventure,
) => string;
export interface Encounters {
  take(s: Adventure, e?: Equipment): MapObject | undefined;
  mark(s: Adventure, o: MapObject | undefined, e?: Equipment): void;
}
export const EncounterTracker =
  adventure.AdventureEncounters as unknown as new () => Encounters;
export const OUTFITS = outfits.OUTFITS as {
  id: Equipment["outfit"];
  name: string;
  color: string;
  accent: string;
  detail: string;
  hint?: string;
  unlock: (s: Adventure) => boolean;
}[];
export const ITEMS = outfits.HELD_ITEMS as {
  id: Equipment["item"];
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
export const questJournal = quests.questJournal as (
  s: Adventure,
) => {
  id: QuestId;
  title: string;
  done: boolean;
  progress: string;
  reward: string;
}[];
export const kittyReply = reply as (
  text: string,
  name?: string,
  turn?: number,
) => { text: string; emotion: string };
export { LOVE_LETTER } from "../../dist/letter.js";
export { PICNIC_SPOTS } from "../../dist/item-play.js";
