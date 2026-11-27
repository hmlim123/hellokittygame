import { Suspense, useEffect, useMemo, type RefObject } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Toy } from "./GameToys";
import {
  readMelodyAsset,
  makeMelody,
  reactMelody,
  updateMelody,
  disposeMelody,
  MELODY_CUP_GRIP,
} from "./melody-model";
import { useReducedMotion } from "./use-reduced-motion";
import { useGameStore } from "../game/store";
import { VillagePerformance } from "./VillagePerformance";
import { VillageBenchPose } from "./VillageBenchPose";
import type { VisitPlayer } from "../game/visits";
import type { Gesture } from "../game/types";
function MelodyCup({ hero }: { hero: THREE.Group }) {
  const arm = hero.userData.blender.model.getObjectByName("CTRL_Arm_R") as THREE.Object3D;
  const socket = useMemo(() => {
    const grip = new THREE.Group();
    grip.position.fromArray(MELODY_CUP_GRIP);
    return grip;
  }, []);
  const inverseArm = useMemo(() => new THREE.Quaternion(), []);
  const facing = useMemo(() => new THREE.Quaternion(), []);
  useEffect(() => {
    arm.add(socket);
    return () => { socket.removeFromParent(); };
  }, [arm, socket]);
  useFrame(() => {
    arm.getWorldQuaternion(inverseArm).invert();
    socket.quaternion.copy(inverseArm.multiply(hero.getWorldQuaternion(facing)));
  });
  return createPortal(<Toy name="Cup" scale={0.78} />, socket);
}

export function Melody({
  locomotion,
  performance,
  remote = false,
  holdingCup = false,
  villageRole,
  benchRole,
  picnicRole,
}: {
  locomotion?: RefObject<{ speed: number }>;
  performance?: { id: number; kind: Gesture };
  remote?: boolean;
  holdingCup?: boolean;
  villageRole?: VisitPlayer["id"];
  benchRole?: VisitPlayer["id"];
  picnicRole?: VisitPlayer["id"];
}) {
  const invalidate = useThree(s => s.invalidate);
  const asset = readMelodyAsset(),
    hero = useMemo(() => makeMelody(asset), [asset]);
  const ownGesture = useGameStore((s) => s.gesture),
    gesture = performance || ownGesture,
    reduced = useReducedMotion();
  const seatRole = benchRole ?? picnicRole;
  useEffect(() => {
    if (gesture.id && !hero.userData.benchPose) { reactMelody(hero, gesture.kind, reduced); invalidate(); }
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
    if (!hero.userData.villagePerformance && !hero.userData.benchPose) updateMelody(hero, dt, speed, reduced);
    if (!hero.userData.benchPose && hero.userData.melody.active !== "idle") state.invalidate();
    const data = state.gl.domElement.dataset;
    if (remote) {
      data.remoteModel = "melody";
      data.remoteExpression = hero.userData.melody.active;
      data.remoteHolding = holdingCup ? "cup" : "none";
    } else {
      data.playerCharacter = "melody";
      data.playerAnimation = hero.userData.melody.active;
      data.playerHolding = holdingCup ? "cup" : "none";
    }
  }, villageRole ? -0.5 : 0);
  return (
    <primitive object={hero} scale={0.78} dispose={null}>
      {holdingCup && <MelodyCup hero={hero} />}
      {seatRole ? <VillageBenchPose hero={hero} role={seatRole} picnic={!!picnicRole} style="melody" /> : villageRole && (
        <Suspense fallback={null}>
          <VillagePerformance hero={hero} role={villageRole} style="melody" />
        </Suspense>
      )}
    </primitive>
  );
}
