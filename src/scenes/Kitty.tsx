import { useEffect, useMemo, useRef } from "react";
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
}: KittyProps) {
  const asset = useKittyAsset(),
    hero = useMemo(() => makeBlenderKitty(asset, id), [asset, id]),
    reduced = useReducedMotion();
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
      setBlenderAttention(hero, state.pointer.x, state.pointer.y);
    }
    updateBlender(hero, Math.min(dt, 0.1), { reduced, idle: true });
    updateHeldItem(hero, Math.min(dt, 0.1));
    hero.userData.blender.normalize.position.y =
      baseY +
      (animate &&
      !reduced &&
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
