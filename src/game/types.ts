export type Mode = "room" | "adventure";
export type Direction = "up" | "down" | "left" | "right";
export type Theme = "rose" | "lavender" | "peach" | "mint";
export type OutfitId = "classic" | "sailor" | "picnic" | "moonlight" | "berry";
export type ItemId =
  | "none"
  | "flowers"
  | "teddy"
  | "strawberry"
  | "letter"
  | "lantern"
  | "watering"
  | "ribbon";
export type QuestId =
  "moonflower" | "ribbons" | "picnic" | "lanterns" | "glade";
export type MissionId = "bows" | "strawberries" | "hearts" | "picnic";
export type Gesture =
  | "excited"
  | "wave"
  | "dance"
  | "offer"
  | "pet"
  | "tilt"
  | "hug"
  | "highfive"
  | "tickle"
  | "kiss";
export interface Equipment {
  version: number;
  outfit: OutfitId;
  item: ItemId;
}
export interface ChapterProgress {
  version: 1;
  butterflyStep: number;
  flowersRevived: boolean;
  bridgeFixed: boolean;
  stars: string[];
  friendAwake: boolean;
  letterFound: boolean;
  endingSeen: boolean;
  postcardSaved: boolean;
}
export interface Adventure {
  version: number;
  map: "village" | "garden" | "glade";
  chapter: ChapterProgress;
  x: number;
  z: number;
  facing: Direction;
  accepted: boolean;
  charms: string[];
  guardianStep: number;
  guardian: boolean;
  gate: boolean;
  complete: boolean;
  ribbons: string[];
  berries: string[];
  litLanterns: string[];
  ribbonReturned: boolean;
  picnicDelivered: boolean;
  lanternsBlessed: boolean;
  trackedQuest: QuestId;
}
export interface Room {
  owned: number[];
  slots: (number | null)[];
  selected: number;
  theme: Theme;
  night: boolean;
  adventureRewarded: boolean;
  best: number;
  rounds: number;
}
export interface Preferences {
  relaxed: boolean;
  letterOpened: boolean;
  motion: "system" | "reduce";
}
export interface Journal {
  completed: Record<MissionId, number>;
}
export interface MapObject {
  type: string;
  id?: string;
  x: number;
  z: number;
}
export interface GameMap {
  rows: string[];
  objects: MapObject[];
  w: number;
  h: number;
  title: string;
  spawn: number[];
}
export interface Story {
  speaker: string;
  text: string;
  art?: string | null;
  source?: MapObject | null;
  choices?: { id: string; label: string }[];
  complete?: boolean;
  questComplete?: string;
  chime?: boolean;
  wave?: boolean;
  changedMap?: boolean;
}
export interface Mission {
  id: MissionId;
  goal: number;
  active: boolean;
  paused: boolean;
  hits: number;
  time: number | null;
  complete: boolean;
  relaxed: boolean;
  phase: "show" | "play";
  clock: number;
  flash: number;
  sequence: number[];
}
export interface SaveState {
  room: Room;
  adventure: Adventure;
  equipment: Equipment;
  preferences: Preferences;
  journal: Journal;
}
export type Panel =
  | "missions"
  | "inventory"
  | "together"
  | "letter"
  | "settings"
  | "storybook"
  | "photo"
  | "stars"
  | "ending"
  | null;
export interface Notice {
  id: number;
  title: string;
  text: string;
  art?: string | null;
  at?: [number, number];
}
