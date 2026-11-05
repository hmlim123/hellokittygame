/** Low-poly toys and greetings authored in hellokitty3D/hello_kitty_game.blend. */
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { createPortal, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { assetUrl } from "../game/assets";
import { useReducedMotion } from "./use-reduced-motion";
import { useGameStore } from "../game/store";
import { CookieMesh } from "./CookieMesh";
export type ToyName =
  | "Cushion"
  | "Frame"
  | "Oven"
  | "Tray"
  | "Cup"
  | "Bowl"
  | "Spoon"
  | "Cutter"
  | "Cutter_Heart"
  | "Cutter_Star"
  | "Parcel"
  | "Flowers"
  | "Cutter_Moon";
export function Toy({
  name,
  position,
  scale = 1,
  rotation,
  open = 0,
}: {
  open?: number;
  name: ToyName;
  position?: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
}) {
  const gltf = useGLTF(assetUrl("assets/cozy-props.glb"));
  const object = useMemo(() => {
    const o = gltf.scene.getObjectByName("Toy_" + name)!.clone(true);
    o.userData.sharedToy = true;
    return o;
  }, [gltf, name]);
  useFrame(() => {
    const hinge = object.getObjectByName("Oven_Door");
    if (hinge)
      hinge.rotation.x += (open * Math.PI * 0.46 - hinge.rotation.x) * 0.25;
  });
  return (
    <primitive
      object={object}
      position={position}
      scale={scale}
      rotation={rotation}
      dispose={null}
    />
  );
}
export type Holding = "tray" | "cup" | "spoon" | "cutter" | "parcel";
export function KittyHeld({
  hero,
  holding,
}: {
  hero: THREE.Group;
  holding: Holding;
}) {
  const b = hero.userData.blender;
  const socket = b.model.getObjectByName(
    holding === "tray" || holding === "parcel"
      ? "Socket_Tray"
      : holding === "cup"
        ? "Socket_Teacup"
        : "Socket_Paw_R",
  );
  const cookie = useGameStore((s) => s.cozy.cookie);
  const heldGroup = useRef<THREE.Group>(null);
  useEffect(() => {
    if (holding === "parcel") b.parcelGiven = false;
  }, [holding, b]);
  const point = useMemo(() => new THREE.Vector3(), []),
    other = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (holding === "parcel" && heldGroup.current) {
      if (b.current?.getClip().name === "handoff" && b.age > 0.9)
        b.parcelGiven = true;
      heldGroup.current.visible = !b.parcelGiven;
    }
    // Recompute the grip from the live paws, including additive gaze/walking
    // layers, rather than depending only on baked constraint keys.
    if (holding !== "tray" && holding !== "parcel") return;
    hero.updateMatrixWorld(true);
    b.model.getObjectByName("Socket_Paw_L").getWorldPosition(point);
    b.model.getObjectByName("Socket_Paw_R").getWorldPosition(other);
    const midpoint = b.model.getObjectByName("Grip_Midpoint");
    midpoint.position.copy(
      midpoint.parent.worldToLocal(point.add(other).multiplyScalar(0.5)),
    );
  });
  if (!socket) return null;
  return createPortal(
    <group name={"Held_" + holding} ref={heldGroup}>
      <Toy
        name={
          holding === "parcel"
            ? "Parcel"
            : holding === "tray"
              ? "Tray"
              : holding === "cup"
                ? "Cup"
                : holding === "spoon"
                  ? "Spoon"
                  : cookie.recipe === "moon"
                    ? "Cutter_Moon"
                    : cookie.shape === "round"
                      ? "Cutter"
                      : cookie.shape === "heart"
                        ? "Cutter_Heart"
                        : "Cutter_Star"
        }
      />
      {holding === "tray" && (
        <group position={[0, 0.045, 0]} scale={1.5}>
          <CookieMesh cookie={cookie} />
        </group>
      )}
    </group>,
    socket,
  );
}
export function ToyFriend({
  name,
  awake = true,
  position,
  scale = 1,
  rotation,
  greetOnMount = false,
  eyeAmount,
}: {
  name: "Momo" | "Pip";
  awake?: boolean;
  position?: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
  greetOnMount?: boolean;
  eyeAmount?: RefObject<number>;
}) {
  const gltf = useGLTF(assetUrl("assets/cozy-friends.glb")),
    reduced = useReducedMotion();
  const greeting = useGameStore((s) =>
    s.dialogue?.source?.type === (name === "Momo" ? "M" : "N")
      ? s.dialogue
      : s.notice?.title.includes(name)
        ? s.notice
        : null,
  );
  const instance = useMemo(() => {
    const model = gltf.scene.getObjectByName(name)!.clone(true),
      mixer = new THREE.AnimationMixer(model);
    const clip = gltf.animations.find((a) => a.name === "greet")!.clone();
    clip.tracks = clip.tracks.filter((t) => t.name.startsWith(name));
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    return { model, mixer, action, time: 10 };
  }, [gltf, name]);
  const hadGreeting = useRef(false);
  useEffect(() => {
    // The reading dialog can cover the friend. Repeat the short greeting on
    // dismissal, so Nancy sees it after returning her attention to the world.
    const respond = !!greeting || hadGreeting.current || greetOnMount;
    hadGreeting.current = !!greeting;
    if (!awake || reduced || !respond) return;
    instance.time = 0;
    instance.action.reset().fadeIn(0.12).play();
  }, [instance, greeting, greetOnMount, reduced, awake]);
  useEffect(
    () => () => {
      instance.mixer.stopAllAction();
      instance.mixer.uncacheRoot(instance.model);
    },
    [instance],
  );
  useFrame(({ gl }, dt) => {
    if (reduced || !awake) {
      instance.mixer.stopAllAction();
      instance.time = 10;
    } else {
      instance.time += Math.min(dt, 0.1);
      instance.mixer.update(Math.min(dt, 0.1));
      if (instance.time > 2.15) instance.action.stop();
    }
    if (name === "Pip") {
      for (const side of [-1, 1]) {
        const eye = instance.model.getObjectByName("Pip_Eye_" + side)!;
        eye.scale.y = 0.009 + 0.029 * (eyeAmount?.current ?? (awake ? 1 : 0));
        gl.domElement.dataset.pipEyeOpen = String(eye.scale.y);
      }
      gl.domElement.dataset.pipGreeting = String(instance.action.isRunning());
    } else
      gl.domElement.dataset.momoGreeting = String(instance.action.isRunning());
  });
  return (
    <group position={position} scale={scale} rotation={rotation}>
      <primitive object={instance.model} dispose={null} />
    </group>
  );
}
