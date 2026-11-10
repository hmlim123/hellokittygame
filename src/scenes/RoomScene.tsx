import { Suspense, useState } from "react";
import { DOLLS } from "../game/domain";
import { ShelfFriend } from "./ShelfFriend";
import { prepareKittyStyle } from "./kitty-assets";
import { CozyCorner } from "./CozyCorner";
import { VillageHome } from "./VillageHome";
import { HomeDetails } from "./HomeDetails";
import { StudioHouse } from "./StudioHouse";
import {
  STUDIO_SLOTS,
  STUDIO_SHELF_SCALE,
  STUDIO_KITTY,
  STUDIO_SHADOW,
  studioAnchor,
  studioYaw,
} from "./studio-layout";
import {
  frameHome,
  frameHomePlay,
  HOME_TARGET,
  HOME_PLAY_TARGET,
  HOME_FLOOR,
} from "./home-layout";
import { CozyLights } from "./CozyLights";
import { GroundShadow } from "./GroundShadow";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { SceneHtml as Html } from "./SceneHtml";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { Souvenirs } from "./Souvenirs";
import { KeepsakeWall } from "./KeepsakeWall";
import { FriendArrival } from "../../dist/friend-arrival.js";
import { makeBow, heartMesh } from "../../dist/models.js";
import { makeStrawberry } from "../../dist/gifts.js";
import { useGameStore } from "../game/store";
import { Kitty, useKittyTouch, useReducedMotion } from "./Kitty";
const friendEquipment = (id: number) => ({
  version: 1,
  outfit: "classic" as const,
  item: "none" as const,
  ...(DOLLS[id]?.plush ? { plush: DOLLS[id].plush } : {}),
});
const slots = STUDIO_SLOTS;
function Shelf() {
  const arrival = useGameStore((s) => s.arrival),
    ids = useGameStore((s) => s.room.slots),
    group = useRef<THREE.Group>(null);
  useFrame(({ camera, gl }) => {
    if (group.current) {
      group.current.visible = camera.position.x > -0.42;
      const styles: string[] = [];
      group.current.traverse((o) => {
        if (o.userData.shelf_style) styles.push(o.userData.shelf_style);
      });
      gl.domElement.dataset.shelfFriends = styles.sort().join(",");
    }
  });
  return (
    <group ref={group}>
      {ids.map((id, i) =>
        id === null ? null : (
          <ShelfFriend
            key={`${i}-${id}`}
            id={id}
            visible={id !== arrival?.friend}
            style={DOLLS[id].plush || "classic"}
            position={slots[i]}
            scale={STUDIO_SHELF_SCALE}
            rotation={[0, studioYaw("shelf_0"), 0]}
          />
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
  const [assetReady, setAssetReady] = useState(false);
  useEffect(() => {
    let active = true;
    setAssetReady(false);
    if (arrival)
      prepareKittyStyle(DOLLS[arrival.friend].plush || "classic")
        .then(() => {
          if (active) setAssetReady(true);
        })
        .catch(() => {
          if (active) useGameStore.getState().finishArrival();
        });
    return () => {
      active = false;
    };
  }, [arrival]);
  const destination = arrival
    ? slots[Math.max(0, slotsState.indexOf(arrival.friend))]
    : slots[0];
  const clock = useMemo(
    () => new FriendArrival(destination, reduced, STUDIO_SHELF_SCALE),
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
    if (!arrival || !group.current || !assetReady) return;
    const pose = clock.advance(Math.min(dt, 0.1));
    group.current.position.set(...(pose.position as [number, number, number]));
    group.current.scale.setScalar(pose.scale);
    const turn =
      pose.phase === "settle" || pose.phase === "done"
        ? studioYaw("shelf_0")
        : 0;
    group.current.rotation.y +=
      (turn - group.current.rotation.y) *
      (reduced ? 1 : 1 - Math.exp(-dt * 10));
    if (pose.justFinished) useGameStore.getState().finishArrival();
  });
  return arrival && assetReady ? (
    <group ref={group}>
      <Suspense fallback={null}>
        <Kitty
          id={arrival.friend}
          equipment={friendEquipment(arrival.friend)}
          animate
          performance={performance}
        />
      </Suspense>
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
  const rainy = useGameStore((s) => s.cozy.weather === "rain"),
    night = useGameStore((s) => s.room.night);
  const petMode = useGameStore((s) => s.petMode),
    viewOnly = useGameStore((s) => s.viewOnly);
  const equipment = useGameStore((s) => s.equipment),
    id = useGameStore((s) => s.room.selected),
    reset = useGameStore((s) => s.cameraReset),
    mission = useGameStore((s) => s.mission?.id),
    touch = useKittyTouch(),
    controls = useRef<OrbitControlsImpl>(null),
    { camera, gl, size } = useThree(),
    [homeZoom, setHomeZoom] = useState(40),
    roomPoint = useMemo(() => new THREE.Vector3(), []),
    floorPoints = useMemo(
      () => HOME_FLOOR.map((p) => new THREE.Vector3(...p)),
      [],
    );
  useEffect(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    const play =
      mission && mission !== "picnic"
        ? frameHomePlay(camera, size.width, size.height)
        : null;
    const zoom = play?.zoom ?? frameHome(camera, size.width, size.height);
    setHomeZoom(zoom);
    if (controls.current) {
      controls.current.minZoom = zoom * 0.8;
      controls.current.maxZoom = zoom * 3.2;
      controls.current.target.copy(play?.target ?? HOME_TARGET);
      controls.current.update();
    }
  }, [camera, reset, size.width, size.height, mission]);
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.tabIndex = 0;
    const onKey = (e: KeyboardEvent) => {
      if (
        !["ArrowLeft", "ArrowRight"].includes(e.key) ||
        useGameStore.getState().viewOnly ||
        useGameStore.getState().petMode ||
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
    gl.domElement.dataset.homeView =
      mission && mission !== "picnic" ? "play" : "dollhouse";
    roomPoint.set(...STUDIO_KITTY).project(camera);
    gl.domElement.dataset.homeKittyFoot = String((1 - roomPoint.y) / 2);
    roomPoint.set(...studioAnchor("oven")).project(camera);
    gl.domElement.dataset.homeOven = JSON.stringify([
      (roomPoint.x + 1) / 2,
      (1 - roomPoint.y) / 2,
    ]);
    const areas: Record<string, number[]> = {};
    for (const name of ["bed", "wardrobe", "desk", "reading"]) {
      roomPoint.set(...studioAnchor(name)).project(camera);
      areas[name] = [(roomPoint.x + 1) / 2, (1 - roomPoint.y) / 2];
    }
    gl.domElement.dataset.studioAreas = JSON.stringify(areas);
    gl.domElement.dataset.homeZoom = String(
      (camera as THREE.OrthographicCamera).zoom,
    );
    gl.domElement.dataset.homeFloor = JSON.stringify(
      floorPoints.map((p, i) => {
        p.set(HOME_FLOOR[i][0], HOME_FLOOR[i][1], HOME_FLOOR[i][2]).project(
          camera,
        );
        return [(p.x + 1) / 2, (1 - p.y) / 2];
      }),
    );
    gl.domElement.dataset.outfit = equipment.outfit;
    gl.domElement.dataset.corner = JSON.stringify(
      useGameStore.getState().cozy.corner,
    );
  });
  return (
    <>
      <color attach="background" args={["#f5ece5"]} />
      <CozyLights
        rainy={rainy}
        evening={night}
        ambientScale={night ? 0.72 : 1}
      />
      <StudioHouse />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[5.8, 0.2, 5]} position={[0, -0.1, 0]} />
      </RigidBody>
      <HomeDetails />
      <Shelf />
      <Souvenirs />
      <KeepsakeWall />
      <CozyCorner />
      <VillageHome />
      <Arrival />
      <group position={STUDIO_SHADOW}>
        <GroundShadow size={[1.65, 1.1]} />
      </group>
      <Kitty
        id={id}
        equipment={equipment}
        animate
        interactive={!viewOnly}
        onTouch={touch}
        position={STUDIO_KITTY}
        rotation={[0, 0.3, 0]}
        scale={1.25}
      />
      <HuntTargets />
      <OrbitControls
        ref={controls}
        makeDefault
        target={(mission && mission !== "picnic"
          ? HOME_PLAY_TARGET
          : HOME_TARGET
        ).toArray()}
        minZoom={homeZoom * 0.8}
        maxZoom={homeZoom * 3.2}
        minPolarAngle={0.48}
        maxPolarAngle={1.3}
        enablePan={false}
        enableRotate={!petMode}
        enableDamping
        rotateSpeed={0.65}
      />
    </>
  );
}
