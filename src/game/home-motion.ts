import type { Gesture } from "./types";
import { create } from "zustand";
import { useGameStore } from "./store";
import {
  HOME_ACTIONS,
  HOME_SEAT,
  homePath,
  HOME_SPAWN,
  type HomePoint,
  type HomeAction,
} from "./home-world";
export type HomePhase =
  | "idle"
  | "turning"
  | "sitting"
  | "seated"
  | "picking"
  | "sipping"
  | "putting"
  | "standing";
export type HomeClip =
  | "sitDown"
  | "sitIdle"
  | "takeCup"
  | "sipSit"
  | "putCup"
  | "standUp"
  | "cupIdle";
export type HomeQueue =
  | { type: "walk"; point: HomePoint; action?: HomeAction }
  | { type: "gesture"; kind: Gesture }
  | { type: "pet" };
interface HomeMotion {
  position: HomePoint;
  visual: HomePoint;
  yaw: number;
  speed: number;
  input: HomePoint;
  inputAt: number;
  path: HomePoint[];
  pending: HomeAction | null;
  phase: HomePhase;
  phaseTime: number;
  heldCup: boolean;
  afterStand: HomeQueue | null;
  camera: "follow" | "overview";
  cameraScale: number;
  heading: number;
  message: string;
  setInput(x: number, z: number): void;
  stop(): void;
  walkTo(point: HomePoint, action?: HomeAction): boolean;
  visit(action: HomeAction): boolean;
  stand(queue?: HomeQueue): void;
  tea(): void;
  setCamera(mode: "follow" | "overview"): void;
}
export const homeRender = { x: HOME_SPAWN.x, z: HOME_SPAWN.z };
export const useHomeMotion = create<HomeMotion>((set, get) => ({
  position: { ...HOME_SPAWN },
  visual: { ...HOME_SPAWN },
  yaw: 0,
  speed: 0,
  input: { x: 0, z: 0 },
  inputAt: 0,
  path: [],
  pending: null,
  phase: "idle",
  phaseTime: 0,
  heldCup: false,
  afterStand: null,
  camera: "follow",
  cameraScale: 1,
  heading: 0,
  message: "Tap the floor to walk · Tap furniture to visit it",
  setInput(x, z) {
    if (get().phase !== "idle" || get().camera !== "follow") return;
    const n = Math.hypot(x, z);
    set({
      input: { x: x / Math.max(1, n), z: z / Math.max(1, n) },
      inputAt: performance.now(),
      path: [],
      pending: null,
      message: "",
    });
  },
  stop() {
    set({ input: { x: 0, z: 0 }, path: [], pending: null, speed: 0 });
  },
  walkTo(point, action) {
    const s = useGameStore.getState();
    if (
      s.mode !== "room" ||
      !s.sceneReady ||
      s.panel ||
      s.dialogue ||
      s.viewOnly ||
      s.mission ||
      s.arrival ||
      s.petMode
    )
      return false;
    if (get().phase !== "idle") {
      get().stand({ type: "walk", point, action });
      return true;
    }
    const path = homePath(get().position, point);
    if (!path.length) {
      set({
        message:
          "Try a clear spot on the floor. Kitty will go around the furniture. ♡",
      });
      return false;
    }
    set({
      camera: "follow",
      inputAt: performance.now(),
      input: { x: 0, z: 0 },
      path,
      pending: action ?? null,
      message: action ? "Kitty is on her way. ♡" : "",
    });
    return true;
  },
  visit(action) {
    const target = HOME_ACTIONS.find((a) => a.id === action);
    return target ? get().walkTo(target, action) : false;
  },
  stand(queue) {
    const phase = get().phase;
    if (phase === "idle") {
      if (queue) runHomeQueue(queue);
      return;
    }
    if (
      [
        "turning",
        "sitting",
        "picking",
        "sipping",
        "putting",
        "standing",
      ].includes(phase)
    ) {
      set({ afterStand: queue ?? null });
      return;
    }
    set({
      afterStand: queue ?? null,
      phase: get().heldCup ? "putting" : "standing",
      phaseTime: 0,
      message: "A little stretch, then we’re ready. ♡",
    });
  },
  tea() {
    const s = get();
    if (s.phase !== "seated") return;
    set({
      phase: s.heldCup ? "sipping" : "picking",
      phaseTime: 0,
      message: s.heldCup
        ? "A quiet sip, just for Nancy. ♡"
        : "Kitty reaches for her little cup. ♡",
    });
  },
  setCamera(camera) {
    get().stop();
    set({
      camera,
      message:
        camera === "overview"
          ? "Drag to rotate · Pinch to look closer"
          : "Tap the floor or use the thumb control",
    });
  },
}));
export function runHomeQueue(q: HomeQueue) {
  if (q.type === "walk") useHomeMotion.getState().walkTo(q.point, q.action);
  else if (q.type === "pet") useGameStore.getState().startPetting();
  else {
    useHomeMotion.setState({ yaw: 0 });
    useGameStore.getState().react(q.kind);
  }
}
export function homeGesture(kind: "wave" | "dance") {
  const m = useHomeMotion.getState();
  m.setCamera("follow");
  if (m.phase !== "idle") m.stand({ type: "gesture", kind });
  else {
    useHomeMotion.setState({ yaw: 0 });
    useGameStore.getState().react(kind);
  }
}
export function nearbyHomeAction(p: HomePoint) {
  return HOME_ACTIONS.map((a) => ({
    ...a,
    distance: Math.hypot(a.x - p.x, a.z - p.z),
  }))
    .filter((a) => a.distance < 1.05)
    .sort((a, b) => a.distance - b.distance)[0];
}
export function arriveHomeAction(id: HomeAction) {
  const s = useGameStore.getState(),
    m = useHomeMotion.getState();
  m.stop();
  const a = HOME_ACTIONS.find((a) => a.id === id)!;
  useHomeMotion.setState({ yaw: a.yaw });
  if (id === "seat")
    useHomeMotion.setState({
      phase: "turning",
      phaseTime: 0,
      message: "A soft seat and a little time for tea. ♡",
    });
  else if (id === "baking") s.openPanel("baking");
  else if (id === "wardrobe") s.openPanel("inventory");
  else if (id === "letter") s.openPanel("letter");
  else if (id === "relax") s.openPanel("together");
  else if (id === "exit") s.enterVillage();
  else if (id === "sleep") {
    s.setNight(!s.room.night);
    s.react(
      s.room.night ? "wave" : "sleepy",
      s.room.night
        ? "Soft daylight fills your studio. ♡"
        : "Your lamps are on. A cozy evening together. ♡",
    );
  }
}
export const homeClipFor = (phase: HomePhase): HomeClip | null =>
  (
    ({
      sitting: "sitDown",
      seated: "sitIdle",
      picking: "takeCup",
      sipping: "sipSit",
      putting: "putCup",
      standing: "standUp",
    }) as Partial<Record<HomePhase, HomeClip>>
  )[phase] ?? null;
export const homeInteractionPoint = () =>
  useHomeMotion.getState().phase === "idle"
    ? useHomeMotion.getState().position
    : HOME_SEAT;
