import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { assetUrl } from "../game/assets";
import { useVisitsStore, type VisitPlayer } from "../game/visits";
import { togetherDuration, togetherElapsed } from "../game/village-together";
import { useReducedMotion } from "./use-reduced-motion";

export function VillagePerformance({
  hero,
  role,
  style,
}: {
  hero: THREE.Group;
  role: VisitPlayer["id"];
  style: string;
}) {
  const library = useGLTF(assetUrl(`assets/together-motion/${style}.glb`));
  const reduced = useReducedMotion();
  const canvas = useThree(s => s.gl.domElement);
  const attribute = `${role}Together`;
  const host = role === "host",
    melody = style === "melody";
  const [propAction, setPropAction] = useState("");
  const prop = useRef("");
  const position = useMemo(() => new THREE.Vector3(), []);
  const rotation = useMemo(() => new THREE.Quaternion(), []);
  const mixing = propAction === "stir" && host;
  const decorating = propAction === "decorate" && !host;
  const presenting = propAction === "present" && host;
  const rig = hero.userData.blender;
  const model = rig.model as THREE.Group;
  const animation = useMemo(() => {
    const mixer = new THREE.AnimationMixer(model);
    const clips = Object.fromEntries(
      library.animations.map((source) => {
        const clip = source.clone();
        clip.tracks = clip.tracks.filter((track) =>
          model.getObjectByName(track.name.split(".")[0]),
        );
        for (const track of clip.tracks) {
          const [name, property] = track.name.split(".");
          const pivot = model.getObjectByName(name)?.parent;
          if (
            property === "position" &&
            pivot &&
            /^(Idle_|Walk_)/.test(pivot.name)
          ) {
            for (let i = 0; i < track.values.length; i++) {
              track.values[i] -= pivot.position.getComponent(i % 3);
            }
          }
        }
        return [clip.name, mixer.clipAction(clip)];
      }),
    );
    return { mixer, clips, current: null as THREE.AnimationAction | null };
  }, [model, library]);
  const grip = useMemo(() => {
    const socket = new THREE.Group();
    const source = library.scene.getObjectByName("Together_Grip_R");
    if (source) socket.position.copy(source.position);
    return socket;
  }, [library]);
  useEffect(() => {
    model.getObjectByName("CTRL_Arm_R")?.add(grip);
    return () => {
      grip.removeFromParent();
    };
  }, [grip, model]);
  useEffect(
    () => () => {
      animation.mixer.stopAllAction();
      animation.mixer.uncacheRoot(model);
      delete hero.userData.villagePerformance;
      delete canvas.dataset[attribute];
      delete canvas.dataset[`${attribute}Phase`];
      hero.rotation.set(0, 0, 0);
    },
    [animation, model, hero, canvas, attribute],
  );

  // Run after each avatar's normal pose update. The village still owns movement
  // and outfits, and both browsers sample the same server-started performance.
  useFrame(({ camera }) => {
    const visit = useVisitsStore.getState();
    const moment = visit.together;
    const partner = visit.players.find((player) => player.id !== role);
    const kind = moment?.action;
    const elapsed = moment ? togetherElapsed(moment, visit.clockOffset) : -1;
    const active =
      kind &&
      kind !== "cancel" &&
      partner?.connected &&
      (!partner.area || partner.area === "village") &&
      elapsed >= 0 &&
      elapsed < togetherDuration(kind);
    const baking = kind === "stir" || kind === "decorate" || kind === "present";
    const nextProp = active && baking ? kind : "";
    if (prop.current !== nextProp) {
      prop.current = nextProp;
      setPropAction(nextProp);
    }
    const dance = kind === "celebrate";
    const photo = kind === "photo";
    const held =
      rig.heldAttachment ||
      (hero.userData.equipment?.item &&
        hero.userData.equipment.item !== "none");
    const danceClip = melody
      ? hero.userData.melody.actions.dance?.getClip()
      : (held
          ? rig.actions.danceHeld || rig.actions.dance
          : rig.actions.dance
        )?.getClip();
    const clip =
      kind === "highfive"
        ? host
          ? "togetherHighfiveR"
          : "togetherHighfiveL"
        : kind === "stir" && host
          ? "togetherStir"
          : kind === "decorate" && !host
            ? "togetherDecorate"
            : kind === "present" && host
              ? "togetherPresent"
              : "togetherWave";
    const action = !active
      ? null
      : dance && danceClip
        ? animation.mixer.clipAction(danceClip)
        : animation.clips[clip];
    if (animation.current !== action) {
      animation.current?.stop();
      action?.reset().play();
      animation.current = action;
      hero.userData.villagePerformance = !!action;
      if (!action) {
        delete canvas.dataset[attribute];
        delete canvas.dataset[`${attribute}Phase`];
        hero.rotation.set(0, 0, 0);
      }
    }
    if (!action || !kind) return;
    const duration = action.getClip().duration;
    const time = dance
      ? (elapsed * duration) / togetherDuration(kind)
      : kind === "highfive"
        ? Math.max(0, elapsed - 0.6)
        : elapsed;
    action.paused = true;
    action.time = reduced
      ? dance || kind === "wave"
        ? duration * 0.33
        : duration - 0.001
      : photo
        ? moment.pose === "wave"
          ? 1
          : duration - 0.001
        : Math.min(time, duration - 0.001);
    animation.mixer.update(0);
    canvas.dataset[attribute] = dance ? "dance" : kind;
    if (dance) canvas.dataset[`${attribute}Phase`] = String(elapsed);
    else delete canvas.dataset[`${attribute}Phase`];
    hero.rotation.set(
      0,
      0,
      photo && moment.pose === "lean" ? (host ? -0.08 : 0.08) : 0,
    );
    if (
      hero.parent &&
      (photo || (kind === "highfive" && partner && !reduced))
    ) {
      hero.getWorldPosition(position);
      const target = photo ? camera.position : partner!;
      const direction = Math.atan2(
        target.x - position.x,
        target.z - position.z,
      );
      hero.parent.getWorldQuaternion(rotation);
      position.set(0, 0, 1).applyQuaternion(rotation);
      const amount = photo
        ? 1
        : THREE.MathUtils.smoothstep(elapsed, 0, 0.6) *
          (1 - THREE.MathUtils.smoothstep(elapsed, 3.6, 4));
      const turn = direction - Math.atan2(position.x, position.z);
      hero.rotation.y = Math.atan2(Math.sin(turn), Math.cos(turn)) * amount;
    }
    const occupied =
      ((kind === "stir" || kind === "present") && host) ||
      (kind === "decorate" && !host);
    if (occupied && !reduced) {
      const progress = time / duration;
      const envelope =
        THREE.MathUtils.smoothstep(progress, 0.125, 0.333) *
        (1 - THREE.MathUtils.smoothstep(progress, 0.417, 0.875));
      for (const mesh of rig.morphs || []) {
        const index = mesh.morphTargetDictionary.EmptyRest;
        if (index !== undefined)
          mesh.morphTargetInfluences[index] = 1 - envelope;
      }
    }
  });
  return (
    <>
      {(mixing || decorating) && (
        <group position={[0.24, melody ? 0.43 : 0.48, melody ? 0.21 : 0.4]}>
          <mesh position={[0, -0.12, 0]}>
            <cylinderGeometry args={[0.27, 0.3, 0.07, 24]} />
            <meshStandardMaterial color="#cda58b" />
          </mesh>
          <mesh>
            <sphereGeometry
              args={[0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
            <meshStandardMaterial
              color={mixing ? "#ead0a0" : "#edbbce"}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}
      {mixing &&
        createPortal(
          <mesh position={[0, -0.07, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.22, 12]} />
            <meshStandardMaterial color="#bd9478" />
          </mesh>,
          grip,
        )}
      {decorating &&
        createPortal(
          <mesh position={[0, -0.04, 0]}>
            <coneGeometry args={[0.065, 0.19, 16]} />
            <meshStandardMaterial color="#e8a9c5" />
          </mesh>,
          grip,
        )}
      {presenting &&
        createPortal(
          <group position={[0, -0.04, 0]}>
            <mesh>
              <boxGeometry args={[0.45, 0.035, 0.27]} />
              <meshStandardMaterial color="#f2c4d2" />
            </mesh>
            {[-0.13, 0, 0.13].map((x) => (
              <mesh
                key={x}
                position={[x, 0.035, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[0.055, 0.055, 0.025, 16]} />
                <meshStandardMaterial color="#d7aa76" />
              </mesh>
            ))}
          </group>,
          grip,
        )}
    </>
  );
}
