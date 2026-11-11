import { useReducedMotion } from "./use-reduced-motion";
import { KittyHeld, type Holding } from "./GameToys";
import { updateWalking, walkingRig } from "./walk-animation";
import { effectTime } from "./effect-motion";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { readKittyAsset } from "./kitty-assets";
import * as THREE from "three";
import {
  blenderClips,
  blenderExpression,
  FACE_SHAPES,
  followBlenderActivity,
  makeBlenderKitty,
  updateBlender,
  reactBlender,
  blenderTouchPart,
  setBlenderAttention,
} from "../../dist/blender-kitty.js";
import { applyHeroEquipment } from "./AdventureTools";
import { playHeldItem, updateHeldItem } from "../../dist/gifts.js";
import type { Equipment, Gesture } from "../game/types";
import { useGameStore } from "../game/store";
import { assetUrl } from "../game/assets";
export { assetUrl } from "../game/assets";
export function useKittyAsset(plush?: string) {
  return readKittyAsset(plush);
}
export { useReducedMotion } from "./use-reduced-motion";
export interface ActivityPose {
  kind: "stir" | "cut" | "placeTray" | "sprinkle" | "handoff" | "present";
  progress: number;
  active: boolean;
  renderedProgress?: number;
}
interface KittyProps {
  additionalClips?: Record<string, THREE.AnimationClip>;
  homeClip?: import("../game/home-motion").HomeClip | null;
  homeGrip?: boolean;
  heroRef?: RefObject<THREE.Group | null>;
  activity?: RefObject<ActivityPose>;
  holding?: Holding;
  id?: number;
  equipment?: Equipment;
  interactive?: boolean;
  animate?: boolean;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  onTouch?: (part: string) => void;
  performance?: { id: number; kind: Gesture };
  locomotion?: RefObject<{ speed: number }>;
  photoPose?: import("./PhotoCorner").PhotoPose;
}
export function Kitty({
  id = 0,
  equipment,
  interactive = false,
  animate = false,
  scale = 1,
  position,
  rotation,
  onTouch,
  performance,
  photoPose,
  locomotion,
  holding,
  activity,
  additionalClips,
  homeClip,
  homeGrip,
  heroRef,
}: KittyProps) {
  const asset = useKittyAsset(equipment?.plush),
    hero = useMemo(
      () =>
        makeBlenderKitty(
          additionalClips
            ? { ...asset, clips: { ...asset.clips, ...additionalClips } }
            : asset,
          id,
        ),
      [asset, id, additionalClips],
    ),
    reduced = useReducedMotion();
  const homePaused = useGameStore((s) => !!s.panel || !!s.dialogue);
  useEffect(() => {
    if (heroRef) heroRef.current = hero;
    return () => {
      if (heroRef) heroRef.current = null;
    };
  }, [hero, heroRef]);
  const effect = useGameStore((s) => s.effect);
  const petMode = useGameStore((s) => s.petMode);
  const quality = useGameStore((s) => s.preferences.quality);
  const canvas = useThree((s) => s.gl.domElement);
  const invalidate = useThree((s) => s.invalidate);
  const stroke = useRef({ down: false, x: 0, y: 0 });
  const headPoint = useMemo(() => new THREE.Vector3(), []);
  const topPoint = useMemo(() => new THREE.Vector3(), []);
  const footPoint = useMemo(() => new THREE.Vector3(), []);
  const dancePoint = useMemo(() => new THREE.Vector3(), []);
  const petCapture = useRef<{
    id: number;
    target: { releasePointerCapture(id: number): void };
  } | null>(null);
  useEffect(() => {
    const clear = () => {
      stroke.current.down = false;
      const captured = petCapture.current;
      petCapture.current = null;
      if (captured) {
        try {
          captured.target.releasePointerCapture(captured.id);
        } catch {}
      }
    };
    if (!petMode) clear();
    addEventListener("blur", clear);
    canvas.addEventListener("pointercancel", clear);
    canvas.addEventListener("lostpointercapture", clear);
    const hidden = () => {
      if (document.hidden) clear();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      clear();
      removeEventListener("blur", clear);
      canvas.removeEventListener("pointercancel", clear);
      canvas.removeEventListener("lostpointercapture", clear);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [petMode, canvas]);
  const sharedGesture = useGameStore((s) => s.gesture),
    gesture = performance || sharedGesture;
  const baseY = useMemo(
    () => hero.userData.blender.normalize.position.y,
    [hero],
  );
  useEffect(
    () => () => {
      // Materials belong to this clone; GLB geometries remain shared in Drei's cache.
      const materials = new Set<THREE.Material>();
      hero.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) {
          let ancestor: THREE.Object3D | null = object;
          while (ancestor && !ancestor.userData.sharedToy)
            ancestor = ancestor.parent;
          if (ancestor) return;
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material])
            materials.add(material);
        }
      });
      materials.forEach((material) => material.dispose());
    },
    [hero],
  );
  useEffect(() => {
    hero.userData.blender.heldAttachment = holding || (homeGrip ? "cup" : null);
  }, [hero, holding, homeGrip]);
  useEffect(() => {
    if (equipment) applyHeroEquipment(hero, equipment);
    invalidate();
  }, [hero, equipment]);
  const seenGesture = useRef<{
    hero: THREE.Group;
    gesture: { id: number; kind: Gesture };
    animate: boolean;
    reduced: boolean;
  } | null>(null);
  const hadHome = useRef(false);
  useEffect(() => {
    if (homeClip) {
      seenGesture.current = { hero, gesture, animate, reduced };
      return;
    }
    if (
      seenGesture.current?.hero === hero &&
      seenGesture.current.gesture === gesture &&
      seenGesture.current.animate === animate &&
      seenGesture.current.reduced === reduced
    )
      return;
    // Local performances can change kind without incrementing their replay ID.
    // Retain the complete request while suppressing stale gestures after sitting.
    seenGesture.current = { hero, gesture, animate, reduced };
    if (!animate || homeClip || (activity?.current.active && !reduced)) return;
    if (
      gesture.kind === "offer" &&
      equipment &&
      ["teddy", "strawberry"].includes(equipment.item)
    ) {
      const played = playHeldItem(hero, reduced);
      if (played.accepted)
        reactBlender(hero, equipment.item === "teddy" ? "hug" : "pet", reduced);
    } else reactBlender(hero, gesture.kind, reduced);
  }, [hero, gesture, animate, reduced, homeClip]);
  useEffect(() => {
    if (!homeClip) {
      const b = hero.userData.blender;
      if (
        hadHome.current &&
        [
          "sitDown",
          "sitIdle",
          "cupIdle",
          "takeCup",
          "sipSit",
          "putCup",
          "standUp",
        ].includes(b.current?.getClip().name)
      ) {
        b.current.stop();
        b.current = null;
      }
      hadHome.current = false;
      return;
    }
    hadHome.current = true;
    reactBlender(hero, homeClip, false);
    const b = hero.userData.blender,
      a = b.current;
    if (!a) return;
    a.setLoop(
      homeClip === "sitIdle" || homeClip === "cupIdle" || reduced
        ? THREE.LoopRepeat
        : THREE.LoopOnce,
      homeClip === "sitIdle" || homeClip === "cupIdle" || reduced
        ? Infinity
        : 1,
    );
    if (reduced) {
      a.time =
        homeClip === "sitDown" || homeClip === "standUp"
          ? a.getClip().duration - 0.0001
          : 0;
      a.paused = true;
      b.mixer.update(0);
    } else a.paused = false;
  }, [hero, homeClip, reduced]);
  useEffect(() => {
    if (!photoPose) return;
    const b = hero.userData.blender;
    b.mixer.stopAllAction();
    b.resetEyes(false);
    b.resetFace();
    b.current = null;
    b.gesture = null;
    b.headIdle.rotation.set(0, 0, 0);
    b.armIdle.forEach((arm: THREE.Group) => arm.rotation.set(0, 0, 0));
    b.restWeights = [1, 1];
    b.restWeight = 1;
    updateBlender(hero, 0, { idle: false, reduced: false });
    if (photoPose === "wave") {
      reactBlender(hero, "wave", false);
      updateBlender(hero, 0.72, { idle: false, reduced: false });
    }
    if (photoPose === "cuddle") {
      reactBlender(hero, "hug", false);
      updateBlender(hero, 0.65, { idle: true, reduced: false });
    }
    if (photoPose === "wink") b.resetEyes(true);
    if (photoPose in FACE_SHAPES) {
      reactBlender(hero, photoPose, false);
      updateBlender(hero, b.actions[photoPose].getClip().duration / 2, {
        idle: false,
        reduced: false,
      });
    }
    if (photoPose === "still" || photoPose === "wink")
      updateBlender(hero, 1, { idle: false, reduced: false });
  }, [hero, photoPose]);
  useFrame((state, dt) => {
    const rig = hero.userData.blender;
    state.gl.domElement.dataset.plush = rig.plush || "classic";
    state.gl.domElement.dataset.characterScale = String(
      hero.getWorldScale(dancePoint).x,
    );
    state.gl.domElement.dataset.emptyPawWeight = String(rig.restWeight);
    state.gl.domElement.dataset.emptyPawLeft = String(rig.restWeights[0]);
    state.gl.domElement.dataset.emptyPawRight = String(rig.restWeights[1]);
    state.gl.domElement.dataset.heldItem =
      hero.userData.equipment?.item || "none";
    hero.updateWorldMatrix(true, false);
    topPoint
      .set(0, rig.modelHeight, 0)
      .applyMatrix4(hero.matrixWorld)
      .project(state.camera);
    state.gl.domElement.dataset.modelTop = String(topPoint.y);
    if (rig.plush) {
      footPoint
        .set(0, 0, 0)
        .applyMatrix4(hero.matrixWorld)
        .project(state.camera);
      const pixels =
        (Math.abs(topPoint.y - footPoint.y) *
          state.size.height *
          state.gl.getPixelRatio()) /
        2;
      const detailed =
        quality !== "gentle" && pixels > (rig.pileVisible ? 90 : 115);
      if (detailed !== rig.pileVisible) {
        for (const mesh of rig.pile) mesh.visible = detailed;
        rig.pileVisible = detailed;
      }
    }
    const expression = () => blenderExpression(hero);
    if (photoPose) {
      state.gl.domElement.dataset.expression = expression();
      return;
    }
    if (animate) {
      setBlenderAttention(
        hero,
        homeClip || locomotion?.current.speed
          ? 0
          : stroke.current.down
            ? stroke.current.x
            : state.pointer.x,
        homeClip || locomotion?.current.speed
          ? 0
          : stroke.current.down
            ? stroke.current.y
            : state.pointer.y,
      );
    }
    if (
      locomotion &&
      locomotion.current.speed > 0.05 &&
      ["dance", "danceHeld"].includes(rig.current?.getClip().name)
    )
      reactBlender(hero, null, reduced);
    updateBlender(
      hero,
      homeClip ? (homePaused ? 0 : Math.min(dt, 0.1)) : Math.min(dt, 0.25),
      {
        reduced,
        idle: !homeClip || homeClip === "sitIdle" || homeClip === "cupIdle",
      },
    );
    if (activity) {
      followBlenderActivity(hero, activity.current, dt, reduced);
      activity.current.renderedProgress = reduced
        ? activity.current.progress
        : hero.userData.blender.inputPhase;
    }
    updateHeldItem(hero, Math.min(dt, 0.1));
    state.gl.domElement.dataset.expression = expression();
    if (animate) {
      state.gl.domElement.dataset.motionTime = String(rig.age);
      const danceTake = rig.current?.getClip().name;
      state.gl.domElement.dataset.danceTake =
        danceTake === "danceHeld" ? "holding" : "empty";
      if (danceTake === "dance" || danceTake === "danceHeld") {
        rig.model.getObjectByName("CTRL_Root").getWorldPosition(dancePoint);
        state.gl.domElement.dataset.danceX = String(dancePoint.x);
        state.gl.domElement.dataset.danceY = String(dancePoint.y);
        state.gl.domElement.dataset.danceDuration = String(
          rig.current.getClip().duration,
        );
      }
      state.gl.domElement.dataset.blenderAction = (
        hero.userData.blender.current?.getClip().name || "idle"
      ).replace(/^danceHeld$/, "dance");
      const arm = hero.userData.blender.model.getObjectByName("CTRL_Arm_R");
      state.gl.domElement.dataset.pawTurn = String(
        Math.abs(arm.quaternion.x) +
          Math.abs(arm.quaternion.y) +
          Math.abs(arm.quaternion.z),
      );
      state.gl.domElement.dataset.holding = holding || "none";
    }
    if (interactive) {
      state.gl.domElement.dataset.petting = String(
        petMode && stroke.current.down,
      );
      state.gl.domElement.dataset.headLook = String(
        hero.userData.blender.headIdle.rotation.y,
      );
      state.gl.domElement.dataset.gesture = gesture.kind;
      state.gl.domElement.dataset.heldItem = equipment?.item || "none";
      hero.userData.blender.headIdle.getWorldPosition(headPoint);
      headPoint.project(state.camera);
      state.gl.domElement.dataset.headX = String((headPoint.x + 1) / 2);
      state.gl.domElement.dataset.headY = String((1 - headPoint.y) / 2);
    }
    if (locomotion) {
      if (
        updateWalking(hero, dt, locomotion.current.speed, reduced, !!homeClip)
      )
        useGameStore.getState().footstep();
      const rig = walkingRig(hero);
      state.gl.domElement.dataset.walkWeight = String(rig.amount);
      state.gl.domElement.dataset.footLift = String(
        Math.max(...rig.feet.map((f) => f.pivot.position.y - f.base.y)),
      );
      const tool = hero.userData.blender.chapterTools?.get(equipment?.item);
      if (tool) {
        tool.rotation.z = 0;
        tool.position.y = 0;
        const t = effectTime(effect);
        if (
          !reduced &&
          t < 2.6 &&
          effect?.kind === "water" &&
          equipment?.item === "watering"
        ) {
          const pour = Math.sin(Math.min(1, t / 2.2) * Math.PI);
          tool.rotation.z = pour * 0.8;
          tool.position.y = pour * 0.12;
          hero.userData.blender.armIdle[1].rotation.x -= pour * 0.15;
        }
        if (
          !reduced &&
          t < 2 &&
          effect?.kind === "tie" &&
          equipment?.item === "ribbon"
        )
          tool.rotation.z =
            Math.sin(t * 8) * 0.12 * Math.sin(Math.min(1, t / 2) * Math.PI);
      }
    }
    hero.userData.blender.normalize.position.y = baseY;
  });
  const touch = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive || petMode) return;
    e.stopPropagation();
    if (e.delta > 7) return;
    onTouch?.(blenderTouchPart(e.object));
  };
  return (
    <primitive
      object={hero}
      scale={scale}
      position={position}
      rotation={rotation}
      onClick={touch}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        if (!interactive || !petMode) return;
        e.stopPropagation();
        stroke.current.down = true;
        const target = e.target as unknown as {
          setPointerCapture(id: number): void;
          releasePointerCapture(id: number): void;
        };
        target.setPointerCapture(e.pointerId);
        petCapture.current = { id: e.pointerId, target };
        useGameStore
          .getState()
          .react(
            "pet",
            "A gentle little stroke. Kitty leans toward your hand. ♡",
          );
      }}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        if (!interactive || !petMode || !stroke.current.down) return;
        e.stopPropagation();
        const canvas = e.nativeEvent.target as HTMLCanvasElement;
        const rect = canvas.getBoundingClientRect();
        stroke.current.x = Math.max(
          -1,
          Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1),
        );
        stroke.current.y = Math.max(
          -1,
          Math.min(1, 1 - ((e.clientY - rect.top) / rect.height) * 2),
        );
      }}
      onPointerUp={(e: ThreeEvent<PointerEvent>) => {
        if (!stroke.current.down) return;
        e.stopPropagation();
        stroke.current.down = false;
        if (petCapture.current) {
          petCapture.current.target.releasePointerCapture(e.pointerId);
          petCapture.current = null;
        }
      }}
      dispose={null}
    >
      {holding && <KittyHeld hero={hero} holding={holding} />}
    </primitive>
  );
}
export function useKittyTouch() {
  const react = useGameStore((s) => s.react),
    open = useGameStore((s) => s.openPanel),
    equipment = useGameStore((s) => s.equipment);
  return (part: string) => {
    if (part === "offer") {
      if (equipment.item === "letter") open("letter");
      else open("together");
      return;
    }
    react(
      (["pet", "tilt", "highfive", "tickle", "kiss"].includes(part)
        ? part
        : "pet") as Gesture,
    );
  };
}
