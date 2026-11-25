import { Melody } from "./Melody";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SceneHtml as Html } from "./SceneHtml";
import { useVisitsStore, type VisitPlayer } from "../game/visits";
import { useKittyAsset, useReducedMotion } from "./Kitty";
import {
  makeBlenderKitty,
  reactBlender,
  updateBlender,
  blenderExpression,
} from "../../dist/blender-kitty.js";
import { applyHeroEquipment } from "./AdventureTools";
import { updateWalking, turnToward } from "./walk-animation";
import { KittyHeld } from "./GameToys";
import { GroundShadow } from "./GroundShadow";
import { VillagePerformance } from "./VillagePerformance";
import { VillageBenchPose } from "./VillageBenchPose";
import { teaBenchSeat } from "../../shared/bench-tea.mjs";
import { VillageSpeech } from "./VillageSpeech";
type VisitorProps = { actor: VisitPlayer; seated: boolean };

function KittyVisitor({ actor, seated }: VisitorProps) {
  const invalidate = useThree(s => s.invalidate);
  const asset = useKittyAsset(actor.appearance.plush || undefined),
    hero = useMemo(() => makeBlenderKitty(asset, 0), [asset]),
    group = useRef<THREE.Group>(null),
    reduced = useReducedMotion(),
    last = useRef(actor.gesture.id);
  const target = useRef(actor),
    initial = useRef({
      position: [actor.x, 0, actor.z] as [number, number, number],
      rotation: [0, actor.yaw, 0] as [number, number, number],
    });
  target.current = actor;
  const holding = seated ? "cup" : actor.holding;
  useEffect(() => {
    applyHeroEquipment(hero, {
      version: 1,
      outfit: actor.appearance.outfit,
      item: seated ? "none" : actor.tool || actor.appearance.item || "none",
      ...(actor.appearance.plush ? { plush: actor.appearance.plush } : {}),
    });
  }, [
    hero,
    actor.appearance.outfit,
    actor.appearance.plush,
    actor.appearance.item,
    actor.tool,
    seated,
  ]);
  useEffect(() => {
    hero.userData.blender.heldAttachment = holding || null;
  }, [hero, holding]);
  useEffect(() => {
    if (last.current !== actor.gesture.id) {
      last.current = actor.gesture.id;
      if (!seated) reactBlender(hero, actor.gesture.kind, reduced);
      invalidate();
    }
  }, [hero, actor.gesture.id, actor.gesture.kind, reduced, invalidate, seated]);
  useEffect(
    () => () => {
      hero.userData.blender.mixer.stopAllAction();
      const materials = new Set<THREE.Material>();
      hero.traverse((o: THREE.Object3D) => {
        if (o instanceof THREE.Mesh) {
          let parent: THREE.Object3D | null = o;
          while (parent && !parent.userData.sharedToy) parent = parent.parent;
          if (parent) return;
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            materials.add(m);
        }
      });
      materials.forEach((m) => m.dispose());
    },
    [hero],
  );
  useFrame(({ gl, invalidate }, dt) => {
    const a = target.current;
    if (
      a.speed > 0.1 &&
      ["dance", "danceHeld"].includes(
        hero.userData.blender.current?.getClip().name,
      )
    )
      reactBlender(hero, null, reduced);
    if (!hero.userData.villagePerformance && !hero.userData.benchPose)
      updateBlender(hero, Math.min(dt, 0.1), { reduced });
    if (hero.userData.blender.current || hero.userData.blender.fading.length) invalidate();
    updateWalking(hero, dt, a.speed, reduced, hero.userData.villagePerformance || seated);
    if (group.current) {
      const point = seated ? teaBenchSeat(a.id) : a;
      group.current.position.x +=
        (point.x - group.current.position.x) *
        (1 - Math.exp(-Math.min(dt, 0.1) * 12));
      group.current.position.z +=
        (point.z - group.current.position.z) *
        (1 - Math.exp(-Math.min(dt, 0.1) * 12));
      group.current.rotation.y = turnToward(
        group.current.rotation.y,
        seated ? 0 : a.yaw,
        dt,
        reduced,
      );
      gl.domElement.dataset.remoteX = String(group.current.position.x);
      gl.domElement.dataset.remoteZ = String(group.current.position.z);
      gl.domElement.dataset.remoteOutfit = a.appearance.outfit;
      gl.domElement.dataset.remoteExpression = blenderExpression(hero);
      gl.domElement.dataset.remoteModel = hero.userData.source;
      gl.domElement.dataset.remoteHolding = holding || "none";
    }
  }, -0.5);
  return (
    <group
      ref={group}
      position={initial.current.position}
      rotation={initial.current.rotation}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <ringGeometry args={[0.44, 0.5, 24]} />
        <meshBasicMaterial
          color={actor.id === "host" ? "#d58cae" : "#8bb8ae"}
          transparent
          opacity={0.6}
        />
      </mesh>
      <GroundShadow />
      <group scale={0.78}>
        <primitive object={hero} dispose={null}>
          <Suspense fallback={null}>
            {seated ? <VillageBenchPose hero={hero} role={actor.id} style={actor.appearance.plush || "classic"} /> :
              <VillagePerformance hero={hero} role={actor.id} style={actor.appearance.plush || "classic"} />}
          </Suspense>
        </primitive>
        {holding && <KittyHeld hero={hero} holding={holding} />}
      </group>
      <Html
        center
        position={[0, hero.userData.blender.modelHeight * 0.78 + (seated ? 0.65 : 0.25), 0]}
        zIndexRange={[4, 0]}
      >
        <VillageSpeech role={actor.id} name={actor.name} />
      </Html>
    </group>
  );
}
function MelodyVisitor({ actor, seated }: VisitorProps) {
  const initial = useRef({
    position: [actor.x, 0, actor.z] as [number, number, number],
    rotation: [0, actor.yaw, 0] as [number, number, number],
  });
  const group = useRef<THREE.Group>(null),
    target = useMemo(() => new THREE.Vector3(), []),
    locomotion = useRef({ speed: 0 }),
    reduced = useReducedMotion();
  locomotion.current.speed = seated ? 0 : actor.speed;
  useFrame((state, dt) => {
    if (!group.current) return;
    const point = seated ? teaBenchSeat(actor.id) : actor;
    group.current.position.lerp(
      target.set(point.x, 0, point.z),
      reduced ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) * 12),
    );
    group.current.rotation.y = turnToward(
      group.current.rotation.y,
      seated ? 0 : actor.yaw,
      dt,
      reduced,
    );
    Object.assign(state.gl.domElement.dataset, {
      remoteX: String(group.current.position.x),
      remoteZ: String(group.current.position.z),
      remoteOutfit: "melody",
    });
  });
  return (
    <group
      ref={group}
      position={initial.current.position}
      rotation={initial.current.rotation}
    >
      <GroundShadow />
      <Melody remote locomotion={locomotion} performance={actor.gesture} holdingCup={seated || actor.holding === "cup"} villageRole={actor.id} benchRole={seated ? actor.id : undefined} />
      <Html center position={[0, 2.27 * 0.78 + (seated ? 0.65 : 0.25), 0]} zIndexRange={[4, 0]}>
        <VillageSpeech role={actor.id} name={actor.name} />
      </Html>
    </group>
  );
}
function Visitor({ actor }: { actor: VisitPlayer }) {
  const seated = useVisitsStore((s) => !!s.benchTea?.seated[actor.id]);
  return actor.character === "melody" ? (
    <MelodyVisitor actor={actor} seated={seated} />
  ) : (
    <KittyVisitor actor={actor} seated={seated} />
  );
}
export function VisitAvatars() {
  const players = useVisitsStore((s) => s.players),
    role = useVisitsStore((s) => s.role),
    status = useVisitsStore((s) => s.status);
  return ["online", "reconnecting"].includes(status) ? (
    <>
      {players
        .filter(
          (a) =>
            a.id !== role && a.connected && (!a.area || a.area === "village"),
        )
        .map((a) => (
          <Suspense key={a.id} fallback={null}>
            <Visitor actor={a} />
          </Suspense>
        ))}
    </>
  ) : null;
}
