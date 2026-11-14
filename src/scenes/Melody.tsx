import { useEffect, useMemo, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  readMelodyAsset,
  makeMelody,
  reactMelody,
  updateMelody,
  disposeMelody,
} from "./melody-model";
import { useReducedMotion } from "./use-reduced-motion";
import { useGameStore } from "../game/store";
import type { Gesture } from "../game/types";
export function Melody({
  locomotion,
  performance,
  remote = false,
}: {
  locomotion?: RefObject<{ speed: number }>;
  performance?: { id: number; kind: Gesture };
  remote?: boolean;
}) {
  const invalidate = useThree(s => s.invalidate);
  const asset = readMelodyAsset(),
    hero = useMemo(() => makeMelody(asset), [asset]);
  const ownGesture = useGameStore((s) => s.gesture),
    gesture = performance || ownGesture,
    reduced = useReducedMotion();
  useEffect(() => {
    if (gesture.id) { reactMelody(hero, gesture.kind, reduced); invalidate(); }
  }, [hero, gesture.id, gesture.kind, reduced, invalidate]);
  useEffect(() => {
    const lifecycle = hero.userData.melody;
    lifecycle.mounted = true;
    return () => {
      lifecycle.mounted = false;
      // React’s development remount reuses the same model. Dispose only once
      // it has actually left the scene, rather than stopping its mixer early.
      queueMicrotask(() => {
        if (!lifecycle.mounted) disposeMelody(hero);
      });
    };
  }, [hero]);
  useFrame((state, dt) => {
    const speed = locomotion?.current.speed || 0;
    updateMelody(hero, dt, speed, reduced);
    if (hero.userData.melody.active !== "idle") state.invalidate();
    const data = state.gl.domElement.dataset;
    if (remote) {
      data.remoteModel = "melody";
      data.remoteExpression = hero.userData.melody.active;
    } else {
      data.playerCharacter = "melody";
      data.playerAnimation = hero.userData.melody.active;
    }
  });
  return <primitive object={hero} scale={0.78} dispose={null} />;
}
