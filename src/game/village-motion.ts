import { create } from "zustand";
import { useEffect } from "react";
import { useGameStore } from "./store";
import {
  VILLAGE_ACTIONS,
  VILLAGE_SPAWN,
  villagePath,
  villageApproach,
} from "./village";
export interface VillagePoint {
  x: number;
  z: number;
}
interface VillageMotion {
  position: VillagePoint;
  yaw: number;
  speed: number;
  input: VillagePoint;
  path: VillagePoint[];
  pending: string | null;
  picnic: boolean;
  givingUntil: number;
  guestName: string;
  guestVisit: boolean;
  relocate: { x: number; z: number; yaw: number } | null;
  setInput(x: number, z: number): void;
  stop(): void;
  walkTo(p: VillagePoint, action?: string): boolean;
}
export const useVillageMotion = create<VillageMotion>((set, get) => ({
  position: { ...VILLAGE_SPAWN },
  yaw: 0,
  speed: 0,
  input: { x: 0, z: 0 },
  path: [],
  pending: null,
  picnic: false,
  relocate: null,
  givingUntil: 0,
  guestName: "Your friend",
  guestVisit: false,
  setInput(x, z) {
    const length = Math.hypot(x, z);
    set({
      input: length > 1 ? { x: x / length, z: z / length } : { x, z },
      path: [],
      pending: null,
    });
  },
  stop() {
    set({ input: { x: 0, z: 0 }, path: [], pending: null, speed: 0 });
  },
  walkTo(p, action) {
    const s = useGameStore.getState();
    if (
      s.mode !== "village" ||
      !s.sceneReady ||
      s.panel ||
      s.dialogue ||
      s.viewOnly
    )
      return false;
    const destination =
      action === "momo" || action === "pip"
        ? villageApproach({ ...p, id: action })
        : action === "picnic"
          ? { x: p.x + (get().guestVisit ? 0.95 : -0.95), z: p.z }
          : p;
    const path = villagePath(get().position, destination);
    if (!path.length) return false;
    set({ input: { x: 0, z: 0 }, path, pending: action || null });
    return true;
  },
}));
export function nearbyVillageAction(position: VillagePoint) {
  return VILLAGE_ACTIONS.map((o) => ({
    ...o,
    distance: Math.hypot(o.x - position.x, o.z - position.z),
  }))
    .filter((o) => o.distance < 1.9)
    .sort((a, b) => a.distance - b.distance)[0];
}
export function actInVillage(id?: string) {
  const s = useGameStore.getState(),
    motion = useVillageMotion.getState();
  if (
    s.mode !== "village" ||
    s.panel ||
    s.dialogue ||
    !s.sceneReady ||
    s.viewOnly
  )
    return;
  const near = nearbyVillageAction(motion.position);
  if (
    !near ||
    (id &&
      near.id !== id &&
      Math.hypot(
        (VILLAGE_ACTIONS.find((o) => o.id === id)?.x ?? 99) - motion.position.x,
        (VILLAGE_ACTIONS.find((o) => o.id === id)?.z ?? 99) - motion.position.z,
      ) > 1.9)
  )
    return;
  const action = id || near.id;
  motion.stop();
  s.saveVillagePosition(motion.position.x, motion.position.z, motion.yaw);
  if (action === "home") {
    if (motion.guestVisit) {
      s.react(
        "wave",
        "A little wave at Nancy’s doorstep. Her room stays her own cozy space; your visit together continues in the village. ♡",
      );
      return;
    }
    s.setMode("room");
    const v = s.cozy.village;
    if (Object.values(v.placed).length === 0 && v.greeted.length)
      s.openPanel("village");
  } else if (action === "cafe") {
    if (s.cozy.cookie.stage === "served" && !s.cozy.cookie.packed)
      s.newCookie();
    s.openPanel("baking");
  } else if (action === "momo" || action === "pip")
    s.villageHello(action, motion.guestVisit ? motion.guestName : undefined);
  else if (action.startsWith("flowers"))
    s.villageWater(Number(action.slice(-1)));
  else if (action === "picnic") {
    useVillageMotion.setState({ picnic: true });
    s.react(
      "sip",
      "A little tea, a little breeze, and a place to slow down together. ♡",
    );
  }
}
export function giveVillageGift(friend: "momo" | "pip") {
  const s = useGameStore.getState(),
    before = s.cozy.cookiesGiven;
  s.villageGift(friend);
  if (useGameStore.getState().cozy.cookiesGiven > before)
    useVillageMotion.setState({ givingUntil: performance.now() + 3300 });
}
export function useVillageInput() {
  useEffect(() => {
    const pressed = new Set<string>(),
      keys: Record<string, [number, number]> = {
        arrowup: [0, -1],
        w: [0, -1],
        arrowdown: [0, 1],
        s: [0, 1],
        arrowleft: [-1, 0],
        a: [-1, 0],
        arrowright: [1, 0],
        d: [1, 0],
      };
    const available = () => {
      const s = useGameStore.getState();
      return (
        s.mode === "village" &&
        s.sceneReady &&
        !s.viewOnly &&
        !s.panel &&
        !s.dialogue &&
        !useVillageMotion.getState().picnic
      );
    };
    const clear = () => {
      pressed.clear();
      const m = useVillageMotion.getState();
      useGameStore
        .getState()
        .saveVillagePosition(m.position.x, m.position.z, m.yaw);
      m.stop();
    };
    const update = () => {
      let x = 0,
        z = 0;
      for (const k of pressed) {
        x += keys[k][0];
        z += keys[k][1];
      }
      useVillageMotion.getState().setInput(x, z);
    };
    const down = (e: KeyboardEvent) => {
      if (
        !available() ||
        e.ctrlKey ||
        e.altKey ||
        e.metaKey ||
        (e.target instanceof HTMLElement &&
          ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName))
      )
        return;
      const k = e.key.toLowerCase();
      if (keys[k]) {
        e.preventDefault();
        pressed.add(k);
        update();
      } else if (k === "e" && !e.repeat) {
        e.preventDefault();
        actInVillage();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (pressed.delete(e.key.toLowerCase())) {
        e.preventDefault();
        update();
      }
    };
    const hidden = () => {
      if (document.hidden) clear();
    };
    const un = useGameStore.subscribe((s, previous) => {
      if (
        previous.mode === "village" &&
        (s.mode !== "village" ||
          s.panel ||
          s.dialogue ||
          s.viewOnly ||
          !s.sceneReady)
      )
        clear();
    });
    const offMotion = useVillageMotion.subscribe((s, previous) => {
      if (s.picnic && !previous.picnic) clear();
    });
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    addEventListener("blur", clear);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      un();
      offMotion();
      clear();
      removeEventListener("keydown", down);
      removeEventListener("keyup", up);
      removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
}
