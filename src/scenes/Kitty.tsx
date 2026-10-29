import { updateWalking, walkingRig } from "./walk-animation";
import { effectTime } from "./effect-motion";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
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
export function useKittyAsset() {
  const gltf = useGLTF(assetUrl("assets/hello-kitty.glb"));
  return useMemo(() => {
    const full = new THREE.AnimationClip(
      "Blender performance",
      -1,
      gltf.animations.flatMap((a) => a.tracks),
    );
    return {
      scene: gltf.scene,
      clips: {
        wave: THREE.AnimationUtils.subclip(full, "Wave and wink", 48, 96, 24),
        dance: THREE.AnimationUtils.subclip(full, "Little dance", 0, 49, 24),
        offer: THREE.AnimationUtils.subclip(
          full,
          "Flowers for you",
          96,
          139,
          24,
        ),
      },
    };
  }, [gltf]);
}
export function useReducedMotion() {
  const motion = useGameStore((s) => s.preferences.motion);
  const system =
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  return motion === "reduce" || system;
}
interface KittyProps {
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
  photoPose?: "still" | "wave" | "cuddle" | "wink";
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
}: KittyProps) {
  const asset = useKittyAsset(),
    hero = useMemo(() => makeBlenderKitty(asset, id), [asset, id]),
    reduced = useReducedMotion();
  const effect = useGameStore((s) => s.effect);
  const sharedGesture = useGameStore((s) => s.gesture),
    gesture = performance || sharedGesture;
  const baseY = useMemo(
    () => hero.userData.blender.normalize.position.y,
    [hero],
  );
  const reaction = useRef({ time: 10, kind: "wave" as Gesture });
  useEffect(
    () => () => {
      // Materials belong to this clone; GLB geometries remain shared in Drei's cache.
      const materials = new Set<THREE.Material>();
      hero.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) {
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
    if (equipment) applyHeroEquipment(hero, equipment);
  }, [hero, equipment]);
  useEffect(() => {
    if (!animate) return;
    reaction.current = { time: 0, kind: gesture.kind };
    if (
      gesture.kind === "offer" &&
      equipment &&
      ["teddy", "strawberry"].includes(equipment.item)
    ) {
      const played = playHeldItem(hero, reduced);
      if (played.accepted)
        reactBlender(hero, equipment.item === "teddy" ? "hug" : "pet", reduced);
    } else
      reactBlender(
        hero,
        gesture.kind === "excited" ? "pet" : gesture.kind,
        reduced,
      );
  }, [hero, gesture, animate, reduced]);
  useEffect(() => {
    if (!photoPose) return;
    const b = hero.userData.blender;
    b.mixer.stopAllAction();
    b.resetEyes(false);
    b.current = null;
    b.gesture = null;
    b.headIdle.rotation.set(0, 0, 0);
    b.armIdle.forEach((arm: THREE.Group) => arm.rotation.set(0, 0, 0));
    if (photoPose === "wave") {
      reactBlender(hero, "wave", false);
      updateBlender(hero, 0.72, { idle: false, reduced: false });
    }
    if (photoPose === "cuddle") {
      reactBlender(hero, "hug", false);
      updateBlender(hero, 0.65, { idle: true, reduced: false });
    }
    if (photoPose === "wink") b.resetEyes(true);
  }, [hero, photoPose]);
  useFrame((state, dt) => {
    if (photoPose) return;
    if (animate) {
      reaction.current.time += dt;
      setBlenderAttention(
        hero,
        locomotion?.current.speed ? 0 : state.pointer.x,
        locomotion?.current.speed ? 0 : state.pointer.y,
      );
    }
    updateBlender(hero, Math.min(dt, 0.1), { reduced, idle: true });
    updateHeldItem(hero, Math.min(dt, 0.1));
    if (locomotion) {
      if (updateWalking(hero, dt, locomotion.current.speed, reduced))
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
    hero.userData.blender.normalize.position.y =
      baseY +
      (animate &&
      !reduced &&
      (!locomotion || locomotion.current.speed < 0.05) &&
      reaction.current.kind === "excited" &&
      reaction.current.time < 3
        ? Math.abs(Math.sin(reaction.current.time * Math.PI)) * 0.18
        : 0);
  });
  const touch = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive) return;
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
      dispose={null}
    />
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
