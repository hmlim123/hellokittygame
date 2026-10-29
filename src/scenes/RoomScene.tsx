import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { Souvenirs } from "./Souvenirs";
import { createRoomGeometry } from "../../dist/scene.js";
import { FriendArrival } from "../../dist/friend-arrival.js";
import { makeBow, heartMesh } from "../../dist/models.js";
import { makeStrawberry } from "../../dist/gifts.js";
import { useGameStore } from "../game/store";
import { Kitty, useKittyTouch, useReducedMotion } from "./Kitty";
import type { Adventure, Theme } from "../game/types";
interface RoomGeometry {
  group: THREE.Group;
  backWall: THREE.Group;
  leftWall: THREE.Group;
  cabinet: THREE.Group;
  petals: THREE.Mesh[];
  setTheme(theme: Theme): void;
  setRewards(s: Adventure): void;
}
const slots: [number, number, number][] = [
  [-0.44, 0.65, -2.65],
  [1, 0.65, -2.65],
  [2.44, 0.65, -2.65],
  [-0.44, 2.01, -2.65],
  [1, 2.01, -2.65],
  [2.44, 2.01, -2.65],
];
function RoomEnvironment() {
  const theme = useGameStore((s) => s.room.theme),
    quest = useGameStore((s) => s.adventure),
    model = useMemo(() => createRoomGeometry(theme) as RoomGeometry, []),
    reduced = useReducedMotion();
  useEffect(() => model.setTheme(theme), [model, theme]);
  useEffect(() => model.setRewards(quest), [model, quest]);
  useFrame(({ camera, clock }) => {
    model.backWall.visible = model.cabinet.visible = camera.position.z > 0.35;
    model.leftWall.visible = camera.position.x > -0.42;
    if (!reduced)
      model.petals.forEach((p, i) => {
        const phase = (i / 5 + clock.elapsedTime * 0.035) % 1;
        p.position.set(Math.sin(phase * 5 + i) * 0.65, 1 - phase * 2, 0.06);
      });
  });
  return (
    <>
      <primitive object={model.group} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[4.6, 0.2, 3.9]} position={[0, -0.2, 0]} />
      </RigidBody>
    </>
  );
}
function Shelf() {
  const arrival = useGameStore((s) => s.arrival),
    ids = useGameStore((s) => s.room.slots),
    group = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    if (group.current) group.current.visible = camera.position.z > 0.35;
  });
  return (
    <group ref={group}>
      {ids.map((id, i) =>
        id === null || id === arrival?.friend ? null : (
          <Kitty key={`${i}-${id}`} id={id} position={slots[i]} scale={0.43} />
        ),
      )}
    </group>
  );
}
function Arrival() {
  const arrival = useGameStore((s) => s.arrival),
    slotsState = useGameStore((s) => s.room.slots),
    reduced = useReducedMotion(),
    group = useRef<THREE.Group>(null);
  const destination = arrival
    ? slots[Math.max(0, slotsState.indexOf(arrival.friend))]
    : slots[0];
  const clock = useMemo(
    () => new FriendArrival(destination, reduced),
    [arrival, reduced, destination],
  );
  const performance = useMemo(
    () => ({ id: 1, kind: "wave" as const }),
    [arrival],
  );
  useEffect(() => {
    const skip = (e: KeyboardEvent) => {
      if (e.key === "Escape") useGameStore.getState().finishArrival();
    };
    addEventListener("keydown", skip);
    return () => removeEventListener("keydown", skip);
  }, []);
  useFrame((_, dt) => {
    if (!arrival || !group.current) return;
    const pose = clock.advance(Math.min(dt, 0.1));
    group.current.position.set(...(pose.position as [number, number, number]));
    group.current.scale.setScalar(pose.scale);
    if (pose.justFinished) useGameStore.getState().finishArrival();
  });
  return arrival ? (
    <group ref={group}>
      <Kitty id={arrival.friend} animate performance={performance} />
    </group>
  ) : null;
}
function HuntTargets() {
  const reduced = useReducedMotion(),
    mission = useGameStore((s) => s.mission),
    act = useGameStore((s) => s.missionAction);
  const group = useRef<THREE.Group>(null);
  const objects = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) =>
        mission?.id === "strawberries"
          ? makeStrawberry()
          : mission?.id === "hearts"
            ? heartMesh(["#d77b9e", "#b6a2da", "#eaca77", "#94bdc9"][i], 0.24)
            : makeBow(["#df7799", "#c99bce", "#dbb76f", "#9dbcb4"][i], 0.55),
      ),
    [mission?.id],
  );
  useFrame(({ clock }) => {
    if (group.current)
      group.current.children.forEach(
        (child, i) =>
          (child.position.y =
            2.1 + (reduced ? 0 : Math.sin(clock.elapsedTime + i) * 0.12)),
      );
  });
  if (!mission || mission.id === "picnic" || mission.paused) return null;
  return (
    <group ref={group}>
      {objects.map((object, i) => (
        <group key={i} position={[-2.25 + i * 1.45, 2.2, 1.8]}>
          <primitive object={object} />
          <Html center position={[0, 0.45, 0]} zIndexRange={[2, 0]}>
            <button
              className={`hunt-target ${mission.flash === i ? "lit" : ""}`}
              aria-label={
                mission.id === "hearts"
                  ? `Heart ${i + 1}`
                  : `Collect ${mission.id === "bows" ? "bow" : "strawberry"} ${i + 1}`
              }
              disabled={mission.phase === "show"}
              onClick={() => act(i)}
            >
              {mission.id === "hearts" ? i + 1 : "♡"}
            </button>
          </Html>
        </group>
      ))}
    </group>
  );
}
export function RoomScene() {
  const equipment = useGameStore((s) => s.equipment),
    id = useGameStore((s) => s.room.selected),
    reset = useGameStore((s) => s.cameraReset),
    touch = useKittyTouch(),
    controls = useRef<OrbitControlsImpl>(null),
    { camera, gl } = useThree();
  useEffect(() => {
    camera.position.set(2.1, 2.8, 6.5);
    controls.current?.target.set(-0.12, 1.35, 0.65);
    controls.current?.update();
  }, [camera, reset]);
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.tabIndex = 0;
    const onKey = (e: KeyboardEvent) => {
      if (
        !["ArrowLeft", "ArrowRight"].includes(e.key) ||
        useGameStore.getState().mission
      )
        return;
      e.preventDefault();
      const target = controls.current?.target || new THREE.Vector3(0, 1.35, 0),
        s = new THREE.Spherical().setFromVector3(
          camera.position.clone().sub(target),
        );
      s.theta += e.key === "ArrowRight" ? 0.25 : -0.25;
      camera.position.copy(new THREE.Vector3().setFromSpherical(s).add(target));
      controls.current?.update();
    };
    canvas.addEventListener("keydown", onKey);
    return () => canvas.removeEventListener("keydown", onKey);
  }, [camera, gl]);
  useFrame(() => {
    gl.domElement.dataset.viewAngle = String(
      controls.current?.getAzimuthalAngle() || 0,
    );
    gl.domElement.dataset.outfit = equipment.outfit;
  });
  return (
    <>
      <color attach="background" args={["#f5ece5"]} />
      <hemisphereLight args={["#fff8ef", "#b8a5a6", 2.6]} />
      <directionalLight position={[-3, 9, 6]} color="#fff1d5" intensity={2.3} />
      <directionalLight position={[5, 3, 0]} color="#f9d4e0" intensity={0.8} />
      <RoomEnvironment />
      <Shelf />
      <Souvenirs />
      <Arrival />
      <Kitty
        id={id}
        equipment={equipment}
        animate
        interactive
        onTouch={touch}
        position={[-0.12, 0.08, 0.65]}
        rotation={[0, 0.3, 0]}
        scale={1.25}
      />
      <HuntTargets />
      <OrbitControls
        ref={controls}
        makeDefault
        target={[-0.12, 1.35, 0.65]}
        minDistance={3.3}
        maxDistance={10}
        minPolarAngle={0.48}
        maxPolarAngle={1.3}
        enablePan={false}
        enableDamping
        rotateSpeed={0.65}
      />
    </>
  );
}
