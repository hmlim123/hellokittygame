import {
  normalizeJourney,
  rememberStop,
  travelAdventure,
} from "./travel-state";
import type { AreaId } from "./types";
import { nearbyItemAction } from "./context-action";
import { parseBackup, commitRestoredSave, PREVIOUS_BACKUP } from "./backup";
import type { DiscoveryEffect } from "./types";
import {
  STAR_ORDER,
  endingUnlocked,
  memoryPages,
  normalizeChapter,
} from "./chapter";
import { create } from "zustand";
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from "zustand/middleware";
import type {
  Adventure,
  Direction,
  Equipment,
  Gesture,
  ItemId,
  Mission,
  MissionId,
  Mode,
  Notice,
  OutfitId,
  Panel,
  Preferences,
  QuestId,
  Room,
  SaveState,
  Story,
  Theme,
} from "./types";
import {
  actMission,
  createMission,
  EncounterTracker,
  enterPath,
  interactAdventure,
  kittyReply,
  MAPS,
  moveAdventure,
  nearbyObject,
  normalizeEquipment,
  OUTFITS,
  ITEMS,
  questJournal,
  recordMission,
  replayMemory,
  rewardDoll,
  tickMission,
} from "./domain";
import {
  browserStorage,
  emptyStorage,
  migrateLegacy,
  mirrorLegacy,
  read,
  sanitizeSave,
  type StorageLike,
} from "./storage";
const copy = <T>(v: T): T => structuredClone(v);
const initialMode = (): Mode =>
  typeof location !== "undefined" &&
  location.pathname.endsWith("adventure.html")
    ? "adventure"
    : "room";
export interface GameState extends SaveState {
  mode: Mode;
  panel: Panel;
  inventoryTab: "clothes" | "items" | "quest";
  memoryPage: string | null;
  greet(): void;
  startGlade(): void;
  startMoonflower(): void;
  continueAdventure(): void;
  travelTo(area: AreaId): void;
  mapOnOpen: boolean;
  openQuestMap(): void;
  openMemory(id?: string): void;
  arrangeStar(id: string): void;
  finishEnding(): void;
  savePostcard(): void;
  worldRevision: number;
  stepPulse: number;
  footstep(): void;
  effect: DiscoveryEffect | null;
  clearEffect(id: number): void;
  useNearbyItem(): void;
  restoreBackup(text: string): { ok: boolean; error?: string };
  previousBackup(): string | null;
  notice: Notice | null;
  dialogue: Story | null;
  arrival: { friend: number; result: { title: string; text: string } } | null;
  finishArrival(): void;
  gesture: { id: number; kind: Gesture };
  mission: Mission | null;
  result: { title: string; text: string } | null;
  messages: { role: "nancy" | "kitty"; text: string }[];
  heldDirection: Direction | null;
  holdMove(dir: Direction): void;
  releaseMove(dir?: Direction): void;
  moving: boolean;
  moveCommand: { id: number; dir: Direction } | null;
  queuedDirection: Direction | null;
  sceneReady: boolean;
  saveFailed: boolean;
  physicsContacts: number;
  cameraReset: number;
  setMode(mode: Mode): void;
  openPanel(panel: Panel, tab?: "clothes" | "items" | "quest"): void;
  closePanel(): void;
  equip(kind: "outfit" | "item", id: string): void;
  followQuest(id: QuestId): void;
  react(kind: Gesture, text?: string): void;
  chat(message: string): void;
  requestMove(dir: Direction): void;
  finishMove(blocked: boolean): void;
  interact(choice?: string): void;
  enter(type: "D" | "E" | "A" | "V"): void;
  closeDialogue(): void;
  startMission(id: MissionId): void;
  missionAction(index: number): void;
  tick(dt: number): void;
  pauseMission(): void;
  replayMemory(): void;
  endMission(): void;
  closeResult(): void;
  setTheme(theme: Theme): void;
  setPreferences(patch: Partial<Preferences>): void;
  setFriend(id: number): void;
  markLetterOpened(): void;
  setSceneReady(ready: boolean): void;
  resetCamera(): void;
  clearNotice(id: number): void;
}
export function createGameStore(storage: StorageLike = browserStorage()) {
  const legacy = migrateLegacy(storage);
  let tracker = new EncounterTracker(),
    serial = 0,
    lastMirror = "";
  // Persist only durable state; animation frames and chat never generate disk writes.
  const cache = new Map<string, string>();
  const stableStorage: StateStorage = {
    getItem: (k) => {
      try {
        return storage.getItem(k);
      } catch {
        return null;
      }
    },
    setItem: (k, v) => {
      if (cache.get(k) === v) return;
      try {
        storage.setItem(k, v);
        cache.set(k, v);
      } catch {
        /* The UI also reports unavailable saves through legacy mirroring. */
      }
    },
    removeItem: (k) => {
      try {
        storage.removeItem?.(k);
      } catch {}
    },
  };
  const selectSave = (s: SaveState): SaveState => ({
    room: s.room,
    adventure: s.adventure,
    equipment: s.equipment,
    preferences: s.preferences,
    journal: s.journal,
  });
  const useStore = create<GameState>()(
    persist<GameState, [], [], SaveState>(
      (set, get) => {
        const notify = (
          title: string,
          text: string,
          art?: string | null,
        ): Notice => ({ id: ++serial, title, text, art });
        const applyStory = (
          a: Adventure,
          result?: Story,
          extra: Partial<GameState> = {},
        ) => {
          rememberStop(a);
          const before = get().adventure;
          if (result?.source) {
            const kind =
              !before.chapter.flowersRevived && a.chapter.flowersRevived
                ? "water"
                : !before.chapter.bridgeFixed && a.chapter.bridgeFixed
                  ? "tie"
                  : !before.chapter.friendAwake && a.chapter.friendAwake
                    ? "wake"
                    : a.chapter.butterflyStep > before.chapter.butterflyStep
                      ? "light"
                      : a.chapter.stars.length > before.chapter.stars.length
                        ? "stars"
                        : null;
            if (kind)
              extra.effect = {
                id: ++serial,
                kind,
                map: a.map,
                at: [result.source.x, result.source.z],
                startedAt: performance.now(),
                duration: kind === "water" ? 2.6 : 2,
              };
          }
          const room = copy(get().room);
          if (a.complete && !room.adventureRewarded) {
            const friend = rewardDoll(room);
            room.adventureRewarded = true;
            if (result?.complete && friend)
              result = {
                ...result,
                text:
                  result.text +
                  ` ${friend.name} is waiting on your shelf at home.`,
              };
          }
          if (result?.questComplete && a.trackedQuest === result.questComplete)
            a.trackedQuest =
              questJournal(a).find((q) => !q.done)?.id || "moonflower";
          if (result?.chime || result?.wave)
            extra.gesture = { id: ++serial, kind: "excited" };
          if (result?.source?.type === "K" && a.chapter.letterFound)
            extra.equipment = { ...get().equipment, item: "letter" };
          if (result?.source?.type === "Z" && a.chapter.stars.length < 3) {
            extra.panel = "stars";
            result = { ...result, choices: [] };
          }
          const dialogue =
            result && (result.choices?.length || result.complete)
              ? result
              : null;
          if (dialogue || extra.panel) {
            extra.heldDirection = null;
            extra.queuedDirection = null;
          }
          set({
            adventure: a,
            room,
            ...extra,
            ...(result
              ? {
                  dialogue,
                  notice: dialogue
                    ? null
                    : {
                        ...notify(
                          result.speaker || MAPS[a.map].title,
                          result.text || "A little path to somewhere sweet.",
                          result.art,
                        ),
                        ...(result.chime && result.source
                          ? {
                              at: [result.source.x, result.source.z] as [
                                number,
                                number,
                              ],
                            }
                          : {}),
                      },
                }
              : {}),
          });
        };
        const autoEncounter = (a: Adventure) => {
          const s = get(),
            object = tracker.take(a, s.equipment);
          return object
            ? interactAdventure(
                a,
                object.type === "M" ? "accept" : undefined,
                object,
                s.equipment,
              )
            : undefined;
        };
        const finishMission = (mission: Mission) => {
          const room = copy(get().room),
            journal = copy(get().journal);
          let title = "Lovely playing together.",
            text = `You made ${mission.hits} of ${mission.goal} little steps. Try again whenever you like.`;
          let friendId: number | null = null;
          if (mission.complete) {
            recordMission(journal, mission.id);
            const friend = rewardDoll(room);
            friendId = friend?.id ?? null;
            room.best = Math.max(
              room.best,
              mission.id === "bows"
                ? 80 + (mission.relaxed ? 0 : Math.ceil(mission.time || 0) * 2)
                : 0,
            );
            title = friend
              ? `Hello, ${friend.short.toLowerCase()}.`
              : "A happy little memory.";
            text = friend
              ? `${friend.name} is joining your shelf. A keepsake is ready in the mission journal.`
              : "All your friends are home. Your little keepsake is saved.";
          }
          set({
            mission: null,
            room,
            journal,
            result: friendId === null ? { title, text } : null,
            arrival:
              friendId === null
                ? null
                : { friend: friendId, result: { title, text } },
            gesture: { id: ++serial, kind: "wave" },
          });
        };
        return {
          ...legacy,
          mapOnOpen: false,
          openQuestMap() {
            if (get().moving || get().mission?.active || get().arrival) return;
            set({ panel: "inventory", inventoryTab: "quest", mapOnOpen: true });
          },
          worldRevision: 0,
          stepPulse: 0,
          effect: null,
          footstep() {
            set({ stepPulse: get().stepPulse + 1 });
          },
          clearEffect(id) {
            if (get().effect?.id === id) set({ effect: null });
          },
          useNearbyItem() {
            const s = get();
            if (
              s.mode !== "adventure" ||
              s.moving ||
              s.panel ||
              s.dialogue ||
              !s.sceneReady
            )
              return;
            const action = nearbyItemAction(s.adventure);
            if (!action) return;
            const a = copy(s.adventure),
              equipment = normalizeEquipment(
                { ...s.equipment, item: action.item },
                a,
              );
            tracker.mark(a, action.source, equipment);
            const result = interactAdventure(
              a,
              undefined,
              action.source,
              equipment,
            );
            applyStory(a, result, { equipment });
          },
          previousBackup() {
            try {
              return storage.getItem(PREVIOUS_BACKUP);
            } catch {
              return null;
            }
          },
          restoreBackup(text) {
            try {
              const restored = parseBackup(text),
                save = selectSave(restored),
                json = commitRestoredSave(storage, selectSave(get()), save);
              cache.set("kitty-world-v2", json);
              lastMirror = JSON.stringify(save);
              tracker = new EncounterTracker();
              set({
                ...save,
                worldRevision: get().worldRevision + 1,
                sceneReady: false,
                saveFailed: false,
                heldDirection: null,
                moving: false,
                moveCommand: null,
                queuedDirection: null,
                mission: null,
                dialogue: null,
                arrival: null,
                result: null,
                effect: null,
                memoryPage: null,
                gesture: { id: ++serial, kind: "wave" },
                notice: notify(
                  "Your little world is back",
                  "Your collection, outfits, quests, and memories are ready. Your previous save is also available in Settings.",
                ),
              });
              return { ok: true };
            } catch (e) {
              return {
                ok: false,
                error:
                  e instanceof Error
                    ? e.message
                    : "This backup could not be restored.",
              };
            }
          },
          memoryPage: null,
          greet() {
            set({
              gesture: { id: ++serial, kind: "wave" },
              notice: notify(
                "Hello, Nancy ♡",
                get().adventure.chapter.endingSeen
                  ? "Your friends are keeping your little picnic memory safe. Shall we make another lovely moment?"
                  : "Kitty saved you a little happy place. A small adventure, or a moment together?",
              ),
            });
          },
          startMoonflower() {
            const s = get();
            if (s.moving || s.mission?.active) return;
            const adventure = copy(s.adventure);
            adventure.trackedQuest = !adventure.complete
              ? "moonflower"
              : !adventure.ribbonReturned
                ? "ribbons"
                : !adventure.picnicDelivered
                  ? "picnic"
                  : !adventure.lanternsBlessed
                    ? "lanterns"
                    : "moonflower";
            if (adventure.map === "glade")
              travelAdventure(
                adventure,
                adventure.journey.visited.includes("garden")
                  ? "garden"
                  : "village",
              );
            get().setMode("adventure");
            tracker = new EncounterTracker();
            set({
              adventure,
              panel: null,
              dialogue: null,
              effect: null,
              heldDirection: null,
              moving: false,
              moveCommand: null,
              queuedDirection: null,
            });
          },
          continueAdventure() {
            if (get().moving) return;
            get().setMode("adventure");
          },
          travelTo(area) {
            const s = get();
            if (s.moving || s.mission?.active) return;
            const adventure = copy(s.adventure);
            if (!travelAdventure(adventure, area)) return;
            get().setMode("adventure");
            tracker = new EncounterTracker();
            set({
              adventure,
              panel: null,
              dialogue: null,
              effect: null,
              heldDirection: null,
              moving: false,
              moveCommand: null,
              queuedDirection: null,
              notice: notify(
                MAPS[area].title,
                "Your little story continues. Your discoveries and outfit are safe.",
              ),
            });
          },
          startGlade() {
            if (get().moving || get().mission?.active) return;
            const adventure = copy(get().adventure);
            travelAdventure(adventure, "glade", true);
            adventure.trackedQuest = "glade";
            get().setMode("adventure");
            tracker = new EncounterTracker();
            set({
              adventure,
              panel: null,
              dialogue: null,
              effect: null,
              heldDirection: null,
              moving: false,
              moveCommand: null,
              queuedDirection: null,
            });
          },
          openMemory(id) {
            const page = memoryPages(get().adventure).find(
              (p) => p.id === id && p.unlocked,
            );
            set({ panel: "storybook", memoryPage: page?.id || null });
          },
          arrangeStar(id) {
            const s = get();
            if (
              s.panel !== "stars" ||
              s.adventure.map !== "glade" ||
              !s.adventure.chapter.bridgeFixed
            )
              return;
            const target = MAPS.glade.objects.find((o) => o.type === "Z")!;
            if (
              Math.abs(s.adventure.x - target.x) +
                Math.abs(s.adventure.z - target.z) >
              1
            )
              return;
            const a = copy(s.adventure),
              c = a.chapter;
            if (c.stars.length === 3) return;
            if (id !== STAR_ORDER[c.stars.length]) {
              set({
                notice: notify(
                  "No hurry",
                  "Try the next picture carved on the stones: moon → flower → heart.",
                  "stars",
                ),
              });
              return;
            }
            c.stars.push(id);
            applyStory(
              a,
              {
                speaker:
                  c.stars.length === 3
                    ? "The stars glow together"
                    : "A wishing star",
                text:
                  c.stars.length === 3
                    ? "Moon, flower, heart. Pip is stirring nearby. Bring a Cuddle teddy for a gentle hello."
                    : `${c.stars.length} of 3 stars are shining.`,
                art: "stars",
                chime: true,
                source: target,
              },
              c.stars.length === 3 ? { panel: null } : {},
            );
          },
          finishEnding() {
            const s = get();
            if (!endingUnlocked(s.adventure)) return;
            const adventure = copy(s.adventure);
            adventure.chapter.endingSeen = true;
            set({
              adventure,
              panel: null,
              memoryPage: "ending",
              gesture: { id: ++serial, kind: "hug" },
              notice: notify(
                "A memory to keep",
                "Your moonlit picnic is now a page in your storybook. Revisit it whenever you like.",
                "picnic",
              ),
            });
          },
          savePostcard() {
            const adventure = copy(get().adventure);
            adventure.chapter.postcardSaved = true;
            set({ adventure });
          },
          arrival: null,
          finishArrival() {
            const arrival = get().arrival;
            if (arrival) set({ arrival: null, result: arrival.result });
          },
          mode: initialMode(),
          panel: null,
          inventoryTab: "clothes",
          notice: null,
          dialogue: null,
          gesture: { id: 0, kind: "wave" },
          mission: null,
          result: null,
          messages: [],
          heldDirection: null,
          holdMove(dir) {
            const s = get();
            if (
              s.mode !== "adventure" ||
              s.panel ||
              s.dialogue ||
              !s.sceneReady
            )
              return;
            set({ heldDirection: dir });
            get().requestMove(dir);
          },
          releaseMove(dir) {
            if (!dir || get().heldDirection === dir)
              set({ heldDirection: null, queuedDirection: null });
          },
          moving: false,
          moveCommand: null,
          queuedDirection: null,
          sceneReady: false,
          saveFailed: false,
          physicsContacts: 0,
          cameraReset: 0,
          setMode(mode) {
            if (get().mode === mode) {
              set({ panel: null, dialogue: null });
              return;
            }
            set({
              mode,
              effect: null,
              arrival: null,
              panel: null,
              dialogue: null,
              mission: null,
              result: null,
              heldDirection: null,
              moving: false,
              moveCommand: null,
              queuedDirection: null,
              sceneReady: false,
              notice: null,
            });
            tracker = new EncounterTracker();
          },
          openPanel(panel, tab) {
            if (get().moving || get().mission?.active || get().arrival) return;
            set({
              panel,
              inventoryTab: tab || get().inventoryTab,
              ...(panel === "inventory" ? { mapOnOpen: false } : {}),
            });
          },
          closePanel() {
            if (get().panel === "stars") {
              const s = get();
              tracker.mark(
                s.adventure,
                MAPS.glade.objects.find((o) => o.type === "Z"),
                s.equipment,
              );
            }
            set({ panel: null });
            if (get().mode === "adventure") {
              const a = copy(get().adventure);
              applyStory(a, autoEncounter(a));
            }
          },
          equip(kind, id) {
            const s = get();
            if (kind === "item" && !ITEMS.some((i) => i.id === id)) return;
            if (
              kind === "outfit" &&
              !OUTFITS.some((o) => o.id === id && o.unlock(s.adventure))
            )
              return;
            const equipment = normalizeEquipment(
              { ...s.equipment, [kind]: id },
              s.adventure,
            );
            set({
              equipment,
              ...(kind === "outfit" && equipment.outfit !== s.equipment.outfit
                ? {
                    gesture: { id: ++serial, kind: "tilt" as const },
                    notice: notify(
                      "A lovely little change",
                      `Kitty gives her ${OUTFITS.find((o) => o.id === equipment.outfit)?.name.toLowerCase()} a happy little bow, just for Nancy.`,
                    ),
                  }
                : {}),
            });
          },
          followQuest(id) {
            const adventure = { ...get().adventure, trackedQuest: id };
            set({ adventure });
          },
          react(kind, text) {
            set({
              gesture: { id: ++serial, kind },
              notice: notify(
                "A little moment",
                text ||
                  {
                    excited: "Three happy little hops for Nancy. ♡",
                    wave: "A paw and a wink, just for Nancy. ♡",
                    dance: "A tiny dance makes a lovely little day. ♫",
                    hug: "A soft little cuddle for Nancy. ♡",
                    highfive: "High five! A tiny paw and a happy wink. ♡",
                    tickle: "Tiny tickles, happy wiggles! ♡",
                    kiss: "A little kiss, just for Nancy. ♡",
                    pet: "A gentle head pat. A little love back. ♡",
                    tilt: "A bow, a little tilt, and a hello. ♡",
                    offer: "A little present, just for Nancy. ♡",
                  }[kind],
              ),
            });
          },
          chat(message) {
            const text = message.trim().slice(0, 240);
            if (!text) return;
            const s = get(),
              answer = kittyReply(text, "Nancy", s.messages.length / 2);
            const kind: Gesture =
              answer.emotion === "excited"
                ? "excited"
                : answer.emotion === "dance"
                  ? "dance"
                  : answer.emotion === "hug"
                    ? "hug"
                    : answer.emotion === "wave"
                      ? "wave"
                      : "tilt";
            set({
              messages: [
                ...s.messages,
                { role: "nancy" as const, text },
                { role: "kitty" as const, text: answer.text },
              ].slice(-24),
              gesture: { id: ++serial, kind },
            });
          },
          requestMove(dir) {
            const s = get();
            if (
              s.mode !== "adventure" ||
              s.panel ||
              s.dialogue ||
              !s.sceneReady
            )
              return;
            if (s.moving) {
              set({ queuedDirection: dir });
              return;
            }
            set({ moving: true, moveCommand: { id: ++serial, dir } });
          },
          finishMove(blocked) {
            const s = get();
            if (!s.moveCommand) return;
            const a = copy(s.adventure),
              dir = s.moveCommand.dir;
            a.facing = dir;
            if (!blocked) moveAdventure(a, dir);
            const changedMap = a.map !== s.adventure.map;
            const queued =
              blocked || changedMap
                ? null
                : s.heldDirection || s.queuedDirection;
            applyStory(a, autoEncounter(a), {
              moving: false,
              moveCommand: null,
              queuedDirection: null,
              physicsContacts: s.physicsContacts + (blocked ? 1 : 0),
              ...(blocked || changedMap ? { heldDirection: null } : {}),
            });
            if (queued && !get().dialogue) get().requestMove(queued);
          },
          interact(choice) {
            const s = get();
            if (s.moving) return;
            const a = copy(s.adventure);
            const source = choice ? s.dialogue?.source : nearbyObject(a);
            if (source && ["D", "E", "A", "V"].includes(source.type)) {
              get().enter(source!.type as "D" | "E" | "A" | "V");
              return;
            }
            if (choice === "stars") {
              set({ dialogue: null, panel: "stars" });
              return;
            }
            if (choice === "ending" && endingUnlocked(a)) {
              set({ dialogue: null, panel: "ending" });
              return;
            }
            tracker.mark(a, source || undefined, s.equipment);
            const result = interactAdventure(
              a,
              choice,
              source || undefined,
              s.equipment,
            );
            applyStory(a, result);
            if (!get().dialogue) {
              const next = autoEncounter(a);
              if (next) applyStory(a, next);
            }
          },
          enter(type) {
            const a = copy(get().adventure);
            if (enterPath(a, type).changedMap)
              applyStory(a, undefined, {
                dialogue: null,
                notice: notify(
                  MAPS[a.map].title,
                  a.map === "glade"
                    ? "Follow the butterflies. Your little tools are in Inventory → Items."
                    : a.map === "garden"
                      ? "Your little garden adventure continues."
                      : "Welcome back to the village.",
                ),
                heldDirection: null,
                moving: false,
                moveCommand: null,
                queuedDirection: null,
              });
          },
          closeDialogue() {
            set({ dialogue: null });
            const a = copy(get().adventure);
            applyStory(a, autoEncounter(a));
          },
          startMission(id) {
            set({
              panel: null,
              result: null,
              mission: createMission(id, {
                relaxed: get().preferences.relaxed,
              }),
            });
          },
          missionAction(index) {
            const mission = get().mission;
            if (!mission) return;
            const next = copy(mission),
              result = actMission(next, index);
            if (!result.accepted) return;
            if (next.complete) finishMission(next);
            else
              set({
                mission: next,
                gesture: { id: ++serial, kind: "pet" },
                ...(result.mistake
                  ? {
                      notice: notify(
                        "No rush",
                        "Watch the hearts and try that little pattern again.",
                      ),
                    }
                  : {}),
              });
          },
          tick(dt) {
            const mission = get().mission;
            if (
              !mission ||
              !mission.active ||
              mission.paused ||
              mission.id === "picnic"
            )
              return;
            const next = copy(mission);
            tickMission(next, Math.min(dt, 0.1));
            if (!next.active) finishMission(next);
            else set({ mission: next });
          },
          pauseMission() {
            const mission = get().mission;
            if (mission)
              set({ mission: { ...mission, paused: !mission.paused } });
          },
          replayMemory() {
            const mission = get().mission;
            if (!mission) return;
            const next = copy(mission);
            replayMemory(next);
            set({ mission: next });
          },
          endMission() {
            const mission = get().mission;
            if (mission) finishMission({ ...mission, active: false });
          },
          closeResult() {
            set({ result: null });
          },
          setTheme(theme) {
            set({ room: { ...get().room, theme } });
          },
          setPreferences(patch) {
            set({ preferences: { ...get().preferences, ...patch } });
          },
          setFriend(id) {
            if (get().room.owned.includes(id))
              set({
                room: { ...get().room, selected: id },
                gesture: { id: ++serial, kind: "wave" },
              });
          },
          markLetterOpened() {
            set({ preferences: { ...get().preferences, letterOpened: true } });
          },
          setSceneReady(sceneReady) {
            set({ sceneReady });
          },
          resetCamera() {
            set({ cameraReset: get().cameraReset + 1 });
          },
          clearNotice(id) {
            if (get().notice?.id === id) set({ notice: null });
          },
        };
      },
      {
        name: "kitty-world-v2",
        version: 2,
        storage: createJSONStorage(() => stableStorage),
        partialize: selectSave,
        merge: (saved, current) => {
          const previous = sanitizeSave(saved, legacy),
            fresh = migrateLegacy(storage);
          const rawAdventure = read(storage, "kitty-nancy-adventure-v1") as {
            chapter?: unknown;
            journey?: unknown;
          } | null;
          fresh.adventure.chapter = normalizeChapter(
            rawAdventure?.chapter ?? previous.adventure.chapter,
            fresh.adventure.complete,
          );
          fresh.adventure.journey = normalizeJourney(
            rawAdventure?.journey ?? previous.adventure.journey,
            fresh.adventure,
          );
          return {
            ...current,
            ...previous,
            room: read(storage, "kitty-room-3d-v1")
              ? fresh.room
              : previous.room,
            adventure: read(storage, "kitty-nancy-adventure-v1")
              ? fresh.adventure
              : previous.adventure,
            equipment: read(storage, "kitty-nancy-equipment-v1")
              ? fresh.equipment
              : previous.equipment,
            journal: read(storage, "kitty-nancy-missions-v1")
              ? fresh.journal
              : previous.journal,
            preferences: read(storage, "kitty-room-preferences-v1")
              ? fresh.preferences
              : previous.preferences,
          };
        },
        migrate: (saved) => sanitizeSave(saved, legacy),
      },
    ),
  );
  useStore.subscribe((s) => {
    const save = selectSave(s),
      json = JSON.stringify(save);
    if (json === lastMirror) return;
    lastMirror = json;
    const saved = mirrorLegacy(storage, save);
    if (!saved && !s.saveFailed) useStore.setState({ saveFailed: true });
  });
  return useStore;
}
export const useGameStore = createGameStore();
export const resetForTests = () => createGameStore(emptyStorage);
