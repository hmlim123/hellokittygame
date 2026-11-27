import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { BENCH_TOAST_MS, type BenchRole } from "../../shared/bench-tea.mjs";
import { assetUrl } from "../game/assets";
import { visitTime } from "../game/visit-clock";
import { useVisitsStore } from "../game/visits";
import { useGameStore } from "../game/store";
import { atVillagePicnicSeat } from "../game/village-motion";
import { melodyBenchClips } from "./melody-model";
import { useReducedMotion } from "./use-reduced-motion";
import { updateWalking } from "./walk-animation";

type SharedProps = { hero: THREE.Group; role: BenchRole; picnic?: boolean };
type BenchClips = { rest: THREE.AnimationClip; toast: THREE.AnimationClip };

function SyncedBenchPose({ hero, role, picnic, clips }: SharedProps & { clips: BenchClips }) {
  const reduced = useReducedMotion();
  const canvas = useThree((s) => s.gl.domElement);
  const invalidate = useThree((s) => s.invalidate);
  const current = useRef<THREE.AnimationAction | null>(null);
  const sip = useRef<{ id: number; at: number } | null>(null);
  const attribute = picnic ? `${role}Picnic` : `${role}Bench`;
  const model = hero.userData.blender.model as THREE.Group;
  const animation = useMemo(() => {
    const mixer = new THREE.AnimationMixer(model);
    const rest = mixer.clipAction(clips.rest), toast = mixer.clipAction(clips.toast);
    return { mixer, rest, toast };
  }, [model, clips]);

  useLayoutEffect(() => {
    const b = hero.userData.blender;
    const melody = hero.userData.melody;
    (melody?.mixer ?? b.mixer).stopAllAction();
    if (!melody) { b.current = null; b.fading = []; }
    hero.userData.benchPose = true;
    updateWalking(hero, 0, 0, true, true);
    invalidate();
    return () => {
      animation.mixer.stopAllAction();
      current.current = null;
      sip.current = null;
      delete hero.userData.benchPose;
      delete canvas.dataset[attribute];
      delete canvas.dataset[`${attribute}Phase`];
      if (melody) { melody.active = "idle"; melody.actions.idle.reset().play(); }
      invalidate();
    };
  }, [hero, animation, canvas, attribute, invalidate]);

  useFrame(({ invalidate }) => {
    const visit = useVisitsStore.getState();
    const now = visitTime();
    const serverNow = now + visit.clockOffset;
    let elapsed = serverNow - (visit.benchTea?.toastAt ?? 0);
    if (picnic) {
      const gesture = !visit.role || role === visit.role ? useGameStore.getState().gesture
        : visit.players.find((p) => p.id === role)?.gesture;
      if (gesture && gesture.id !== sip.current?.id)
        sip.current = { id: gesture.id, at: sip.current && gesture.kind === "sip" ? now : 0 };
      // Reuse the existing server-timed pair gesture when both players have cups at the table.
      const moment = visit.together;
      elapsed = moment?.action === "highfive" && visit.players.length === 2 &&
        visit.picnic[2] && visit.players.every(atVillagePicnicSeat)
        ? serverNow - moment.at : now - (sip.current?.at ?? 0);
    }
    const toasting = elapsed >= 0 && elapsed < BENCH_TOAST_MS;
    const action = toasting && !reduced ? animation.toast : animation.rest;
    if (current.current !== action) {
      current.current?.stop();
      action.reset().play();
      action.paused = true;
      current.current = action;
    }
    action.time = action === animation.toast
      ? elapsed * action.getClip().duration / BENCH_TOAST_MS
      : 0;
    animation.mixer.update(0);
    canvas.dataset[attribute] = toasting ? "toast" : "seated";
    if (toasting) canvas.dataset[`${attribute}Phase`] = String(elapsed / 1000);
    else delete canvas.dataset[`${attribute}Phase`];
    if (elapsed < BENCH_TOAST_MS) invalidate();
  }, -0.25);
  return null;
}

function KittyBenchPose({ hero, role, picnic, style }: SharedProps & { style: string }) {
  const library = useGLTF(assetUrl(`assets/home-motion/${style}.glb`));
  const clips = useMemo(() => {
    const model = hero.userData.blender.model as THREE.Group;
    function get(name: string) {
      const clip = library.animations.find((item) => item.name === name)!.clone();
      for (const track of clip.tracks) {
        const [controller, property] = track.name.split(".");
        const pivot = model.getObjectByName(controller)?.parent;
        if (property !== "position" || !pivot || !/^(Idle_|Walk_)/.test(pivot.name)) continue;
        for (let i = 0; i < track.values.length; i++)
          track.values[i] -= pivot.position.getComponent(i % 3);
      }
      return clip;
    }
    return { rest: get("cupIdle"), toast: get("sipSit") };
  }, [hero, library]);
  return <SyncedBenchPose hero={hero} role={role} picnic={picnic} clips={clips} />;
}

function MelodyBenchPose({ hero, role, picnic }: SharedProps) {
  const clips = useMemo(() => melodyBenchClips(hero), [hero]);
  return <SyncedBenchPose hero={hero} role={role} picnic={picnic} clips={clips} />;
}

export function VillageBenchPose({ style, ...seat }: SharedProps & { style: string }) {
  return style === "melody" ? <MelodyBenchPose {...seat} /> : <KittyBenchPose {...seat} style={style} />;
}
