import { Melody } from "./Melody";
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera, RoundedBox } from "@react-three/drei";
import {
  RigidBody,
  CapsuleCollider,
  CuboidCollider,
  useBeforePhysicsStep,
  useAfterPhysicsStep,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import { SceneHtml as Html } from "./SceneHtml";
import { Kitty, useReducedMotion } from "./Kitty";
import { ToyFriend, Toy } from "./GameToys";
import { CozyLights } from "./CozyLights";
import { turnToward } from "./walk-animation";
import { useGameStore } from "../game/store";
import {
  VILLAGE_ACTIONS,
  VILLAGE_OBSTACLES,
  moveVillage,
} from "../game/village";
import {
  actInVillage,
  useVillageMotion,
  villageRender,
} from "../game/village-motion";
import { VisitAvatars } from "./VisitAvatars";
import { useVisitsStore } from "../game/visits";
import { GroundShadow } from "./GroundShadow";

function Blob({
  at,
  scale,
  color,
}: {
  at: [number, number, number];
  scale: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={at} scale={scale}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshStandardMaterial color={color} roughness={0.96} />
    </mesh>
  );
}
function Label({ text, at }: { text: string; at: [number, number, number] }) {
  return (
    <Html center position={at} zIndexRange={[3, 0]}>
      <span className="village-landmark">{text}</span>
    </Html>
  );
}
function House({ cafe = false }: { cafe?: boolean }) {
  const x = cafe ? 7 : -7,
    id = cafe ? "cafe" : "home";
  return (
    <group
      position={[x, 0, -6]}
      onClick={(e) => {
        if (e.delta < 8) {
          e.stopPropagation();
          const o = VILLAGE_ACTIONS.find((o) => o.id === id)!;
          useVillageMotion.getState().walkTo(o, id);
        }
      }}
    >
      <RoundedBox
        args={[4.3, 2.7, 3.3]}
        radius={0.22}
        smoothness={2}
        position={[0, 1.35, 0]}
      >
        <meshStandardMaterial
          color={cafe ? "#fff2d8" : "#fff0e8"}
          roughness={0.95}
        />
      </RoundedBox>
      <mesh
        position={[0, 3.12, 0]}
        rotation={[0, Math.PI / 4, 0]}
        scale={[1, 1, 0.9]}
      >
        <coneGeometry args={[3.3, 1.5, 4]} />
        <meshStandardMaterial
          color={cafe ? "#d593a9" : "#e2a5bd"}
          roughness={0.94}
        />
      </mesh>
      <RoundedBox
        args={[0.9, 1.75, 0.11]}
        radius={0.15}
        position={[0, 0.88, 1.69]}
      >
        <meshStandardMaterial color={cafe ? "#b8d1b9" : "#d4b3d9"} />
      </RoundedBox>
      <Blob at={[0.26, 0.9, 1.78]} scale={[0.06, 0.06, 0.06]} color="#e6bf77" />
      {[-1.25, 1.25].map((side) => (
        <group key={side} position={[side, 1.55, 1.69]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.42, 0.42, 0.11, 20]} />
            <meshStandardMaterial color="#bcdce1" />
          </mesh>
          <mesh>
            <boxGeometry args={[0.85, 0.07, 0.14]} />
            <meshStandardMaterial color="#fffaf0" />
          </mesh>
          <mesh>
            <boxGeometry args={[0.07, 0.85, 0.14]} />
            <meshStandardMaterial color="#fffaf0" />
          </mesh>
        </group>
      ))}
      {cafe &&
        Array.from({ length: 7 }, (_, i) => (
          <mesh
            key={i}
            position={[-1.5 + i * 0.5, 2.02, 2]}
            rotation={[-0.18, 0, 0]}
          >
            <boxGeometry args={[0.5, 0.13, 0.95]} />
            <meshStandardMaterial color={i % 2 ? "#f5dce4" : "#c97c99"} />
          </mesh>
        ))}
      <Label
        text={cafe ? "MOMO’S CAFÉ ☕" : "NANCY’S HOME ♡"}
        at={[0, 3.8, 0]}
      />
    </group>
  );
}
function Trees() {
  const group = useMemo(() => {
    const g = new THREE.Group(),
      positions = [
        [-10, -8],
        [-3, -8],
        [2, -8],
        [10, -8],
        [-10, 0],
        [-10, 6],
        [-8, 8],
        [-2, 8],
        [1, 8],
        [10, 8],
        [10, 1],
        [-3, -5],
        [3, -5],
      ];
    const trunk = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.15, 0.2, 1.6, 8),
      new THREE.MeshStandardMaterial({ color: "#c4a789", roughness: 1 }),
      positions.length,
    );
    const crowns = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 12, 8),
      new THREE.MeshStandardMaterial({ color: "#a4c8ab", roughness: 1 }),
      positions.length,
    );
    const m = new THREE.Matrix4(),
      q = new THREE.Quaternion();
    positions.forEach(([x, z], i) => {
      m.compose(new THREE.Vector3(x, 0.8, z), q, new THREE.Vector3(1, 1, 1));
      trunk.setMatrixAt(i, m);
      m.compose(
        new THREE.Vector3(x, 2, z),
        q,
        new THREE.Vector3(0.95, 1.2, 0.95),
      );
      crowns.setMatrixAt(i, m);
    });
    g.add(trunk, crowns);
    return g;
  }, []);
  useEffect(
    () => () => {
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
    },
    [group],
  );
  return <primitive object={group} />;
}
function GardenBed({ index }: { index: number }) {
  const player = useVillageMotion((s) => s.position);
  const ownBloom = useGameStore((s) => s.cozy.village.flowers[index]),
    sharedBloom = useVisitsStore((s) =>
      s.status === "online" ? s.garden[index] : undefined,
    ),
    bloomed = sharedBloom ?? ownBloom,
    flowers = useRef<THREE.Group>(null),
    growth = useRef(bloomed ? 1 : 0.12),
    reduced = useReducedMotion();
  useFrame((_, dt) => {
    growth.current +=
      ((bloomed ? 1 : 0.12) - growth.current) *
      (reduced ? 1 : 1 - Math.exp(-dt * 2.8));
    if (flowers.current) flowers.current.scale.setScalar(growth.current);
  });
  const x = [4, 6, 8][index],
    color = ["#e7a0bb", "#c9b4dc", "#f4d181"][index];
  return (
    <group
      position={[x, 0, 5.7]}
      onClick={(e) => {
        if (e.delta < 8) {
          e.stopPropagation();
          useVillageMotion.getState().walkTo({ x, z: 3.95 }, "flowers" + index);
        }
      }}
    >
      <RoundedBox args={[1.4, 0.3, 1.85]} radius={0.12} position={[0, 0.13, 0]}>
        <meshStandardMaterial color="#b99883" roughness={1} />
      </RoundedBox>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.15, 0.03, 1.58]} />
        <meshStandardMaterial color="#a88879" />
      </mesh>
      <group ref={flowers} position={[0, 0.3, 0]}>
        {[-0.4, 0, 0.4].map((z, i) => (
          <group key={i} position={[(i % 2 ? 1 : -1) * 0.23, 0, z]}>
            <mesh position={[0, 0.36, 0]}>
              <cylinderGeometry args={[0.035, 0.035, 0.72, 6]} />
              <meshStandardMaterial color="#81a887" />
            </mesh>
            {Array.from({ length: 5 }, (_, p) => (
              <Blob
                key={p}
                at={[
                  Math.sin((p * Math.PI * 2) / 5) * 0.15,
                  0.78,
                  Math.cos((p * Math.PI * 2) / 5) * 0.15,
                ]}
                scale={[0.14, 0.08, 0.14]}
                color={color}
              />
            ))}
            <Blob at={[0, 0.82, 0]} scale={[0.1, 0.08, 0.1]} color="#f3d68a" />
          </group>
        ))}
      </group>
      {!bloomed && Math.hypot(player.x - x, player.z - 3.95) < 4 && (
        <Html center position={[0, 0.5, -1.05]} zIndexRange={[4, 0]}>
          <button
            className="village-garden-label"
            aria-label={"Water flower bed " + (index + 1)}
            onClick={() =>
              useVillageMotion
                .getState()
                .walkTo({ x, z: 3.95 }, "flowers" + index)
            }
          >
            Water ✿
          </button>
        </Html>
      )}
    </group>
  );
}
function Fountain() {
  return (
    <group position={[0, 0, -0.6]}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[1.15, 1.25, 0.3, 24]} />
        <meshStandardMaterial color="#e3c6c5" />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.98, 0.98, 0.05, 24]} />
        <meshStandardMaterial color="#bcdde0" roughness={0.3} />
      </mesh>
      <Blob at={[0, 0.62, 0]} scale={[0.38, 0.38, 0.38]} color="#fff0dc" />
      <Blob at={[0, 1.04, 0]} scale={[0.17, 0.14, 0.17]} color="#ebafc7" />
    </group>
  );
}
function Neighbour({ id }: { id: "momo" | "pip" }) {
  const group = useRef<THREE.Group>(null),
    attention = useRef({ yaw: 0, nod: 0 }),
    [greetSignal, setGreetSignal] = useState(0),
    lastGreeting = useRef(-30),
    wasNear = useRef(false),
    reduced = useReducedMotion();
  const o = VILLAGE_ACTIONS.find((o) => o.id === id)!,
    p = useVillageMotion((s) => s.position),
    near = Math.hypot(p.x - o.x, p.z - o.z) < 5;
  useFrame(({ clock, gl }, dt) => {
    const player = useVillageMotion.getState().position,
      distance = Math.hypot(player.x - o.x, player.z - o.z),
      close = distance < 3.4,
      t = clock.elapsedTime,
      checking =
        id === "momo" ? t % 24 > 13 && t % 24 < 18 : t % 21 > 9 && t % 21 < 15;
    const desired = close
      ? Math.atan2(player.x - o.x, player.z - o.z)
      : checking
        ? id === "momo"
          ? 2.3
          : 1.0
        : 0;
    if (group.current)
      group.current.rotation.y = turnToward(
        group.current.rotation.y,
        desired,
        Math.min(dt, 0.1) * 0.5,
        reduced,
      );
    attention.current.nod = close ? -0.025 : checking ? 0.1 : 0;
    attention.current.yaw = close
      ? Math.sin(t * 0.7) * 0.035
      : Math.sin(t * 0.4) * 0.045;
    if (close && !wasNear.current && t - lastGreeting.current > 18) {
      lastGreeting.current = t;
      setGreetSignal((n) => n + 1);
    }
    wasNear.current = close;
    gl.domElement.dataset[id + "Routine"] = close
      ? "greeting"
      : checking
        ? id === "momo"
          ? "cafe"
          : "garden"
        : "rest";
  });
  return (
    <group
      ref={group}
      position={[o.x, 0, o.z]}
      onClick={(e) => {
        if (e.delta < 8) {
          e.stopPropagation();
          useVillageMotion.getState().walkTo(o, id);
        }
      }}
    >
      <ToyFriend
        name={id === "momo" ? "Momo" : "Pip"}
        scale={id === "momo" ? 1.25 : 1.15}
        awake
        attention={attention}
        greetSignal={greetSignal}
      />
      <GroundShadow size={[1.2, 0.8]} />
      {near && (
        <Html center position={[0, 1.7, 0]} zIndexRange={[5, 0]}>
          <button
            className="village-friend-label"
            onClick={() => {
              if (Math.hypot(p.x - o.x, p.z - o.z) < 1.9) actInVillage(id);
              else useVillageMotion.getState().walkTo(o, id);
            }}
          >
            {id === "momo" ? "Momo" : "Pip"} ♡
          </button>
        </Html>
      )}
    </group>
  );
}
function Watering() {
  const event = useGameStore((s) => s.effect),
    group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (group.current && event) {
      const t = (performance.now() - event.startedAt) / 1000;
      group.current.children.forEach((o, i) => {
        o.position.set(
          Math.sin(i * 2.4) * 0.35,
          0.9 - ((t * 1.4 + i * 0.13) % 1) * 0.8,
          Math.cos(i * 2.4) * 0.4,
        );
        o.scale.setScalar(t < 2.3 ? 1 : 0);
      });
    }
  });
  if (event?.kind !== "water") return null;
  return (
    <group position={[event.at[0], 0.4, 5.7]} ref={group}>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.04, 6, 5]} />
          <meshStandardMaterial color="#acdae5" />
        </mesh>
      ))}
    </group>
  );
}
function PicnicTable() {
  const slots = useVisitsStore((s) => s.picnic),
    online = useVisitsStore((s) => s.status === "online"),
    placed = online ? slots : [true, true, true];
  return (
    <group
      position={[-5.5, 0, 5.8]}
      onClick={(e) => {
        if (e.delta < 8) {
          e.stopPropagation();
          useVillageMotion.getState().walkTo({ x: -5.5, z: 4.2 }, "picnic");
        }
      }}
    >
      <RoundedBox args={[2.7, 0.14, 1.5]} radius={0.15} position={[0, 0.82, 0]}>
        <meshStandardMaterial color="#e6b9bb" />
      </RoundedBox>
      {[-0.85, 0.85].map((x) => (
        <mesh key={x} position={[x, 0.4, 0]}>
          <boxGeometry args={[0.14, 0.8, 0.8]} />
          <meshStandardMaterial color="#c5a58c" />
        </mesh>
      ))}
      {placed[0] && (
        <RoundedBox
          args={[2.58, 0.025, 1.38]}
          radius={0.08}
          position={[0, 0.91, 0]}
        >
          <meshStandardMaterial color="#fff1d8" />
        </RoundedBox>
      )}
      {placed[1] && (
        <group position={[0, 0.94, 0]}>
          <mesh>
            <cylinderGeometry args={[0.36, 0.36, 0.035, 20]} />
            <meshStandardMaterial color="#faf8ed" />
          </mesh>
          {[-0.14, 0, 0.14].map((x, i) => (
            <Blob
              key={i}
              at={[x, 0.06, i === 1 ? 0.12 : -0.1]}
              scale={[0.13, 0.045, 0.13]}
              color="#d4aa7d"
            />
          ))}
        </group>
      )}
      {placed[2] && <Toy name="Cup" position={[-0.75, 0.95, 0]} scale={0.65} />}
      <Toy name="Flowers" position={[0.7, 0.95, 0]} scale={0.38} />
    </group>
  );
}
function Landscape() {
  return (
    <>
      <mesh
        position={[0, -0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => {
          if (e.delta < 8) {
            e.stopPropagation();
            useVillageMotion.getState().walkTo({ x: e.point.x, z: e.point.z });
          }
        }}
      >
        <planeGeometry args={[70, 70]} />
        <meshStandardMaterial color="#d5e4c6" roughness={1} />
      </mesh>
      <mesh position={[0, -0.008, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.4, 40]} />
        <meshStandardMaterial color="#f1e5d1" />
      </mesh>
      {[
        { x: 0, z: -2.6, w: 17, d: 2 },
        { x: 0, z: 3.9, w: 17, d: 1.6 },
        { x: -7, z: 0.5, w: 1.8, d: 7 },
        { x: 6, z: 0.5, w: 1.8, d: 7 },
      ].map((o, i) => (
        <mesh
          key={i}
          position={[o.x, -0.009, o.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(e) => {
            if (e.delta < 8) {
              e.stopPropagation();
              useVillageMotion
                .getState()
                .walkTo({ x: e.point.x, z: e.point.z });
            }
          }}
        >
          <planeGeometry args={[o.w, o.d]} />
          <meshStandardMaterial color="#f1e5d1" />
        </mesh>
      ))}
      <House />
      <House cafe />
      <Trees />
      <Fountain />
      <Label text="LITTLE PLAZA ♡" at={[0, 1.9, -0.6]} />
      <Label text="PIP’S GARDEN ✿" at={[6, 0.7, 7.6]} />
      {[0, 1, 2].map((i) => (
        <GardenBed key={i} index={i} />
      ))}
      <Neighbour id="momo" />
      <Neighbour id="pip" />
      <PicnicTable />
      <RigidBody type="fixed" colliders={false}>
        {VILLAGE_OBSTACLES.map((o, i) => (
          <CuboidCollider
            key={i}
            args={[o.w / 2, 1, o.d / 2]}
            position={[o.x, 1, o.z]}
          />
        ))}
      </RigidBody>
      <Watering />
    </>
  );
}
function Player() {
  const s = useGameStore.getState(),
    spawn = useMemo(() => s.cozy.village, []),
    body = useRef<RapierRigidBody>(null),
    anchor = useRef<THREE.Group>(null),
    locomotion = useRef({ speed: 0 }),
    yaw = useRef(spawn.yaw),
    saveTime = useRef(0),
    publishTime = useRef(0),
    pending = useRef<string | null>(null),
    follow = useRef(new THREE.Vector3(spawn.x, 0.7, spawn.z)),
    reduced = useReducedMotion();
  const playerCharacter = useVisitsStore(
    (s) => s.players.find((p) => p.id === s.role)?.character,
  );
  const equipment = useGameStore((s) => s.equipment),
    packed = useGameStore((s) => !!s.cozy.cookie.packed),
    effect = useGameStore((s) => s.effect),
    picnic = useVillageMotion((s) => s.picnic),
    giving = useVillageMotion((s) => s.givingUntil);
  useEffect(() => {
    if (!giving) return;
    const timer = setTimeout(
      () => useVillageMotion.setState({ givingUntil: 0 }),
      Math.max(0, giving - performance.now()),
    );
    return () => clearTimeout(timer);
  }, [giving]);
  useEffect(() => {
    useVillageMotion.setState({
      position: { x: spawn.x, z: spawn.z },
      yaw: spawn.yaw,
      speed: 0,
      path: [],
      pending: null,
      input: { x: 0, z: 0 },
      picnic: false,
    });
    return () => {
      const m = useVillageMotion.getState();
      useGameStore
        .getState()
        .saveVillagePosition(m.position.x, m.position.z, m.yaw);
      m.stop();
    };
  }, []);
  useBeforePhysicsStep(() => {
    const state = useGameStore.getState(),
      m = useVillageMotion.getState(),
      p = body.current?.translation();
    if (!p) return;
    if (m.relocate) {
      const pos = m.relocate;
      body.current!.setTranslation({ x: pos.x, y: 0, z: pos.z }, true);
      body.current!.setNextKinematicTranslation({ x: pos.x, y: 0, z: pos.z });
      latest.current = { x: pos.x, z: pos.z };
      yaw.current = pos.yaw;
      useVillageMotion.setState({
        relocate: null,
        position: { x: pos.x, z: pos.z },
        yaw: pos.yaw,
      });
      return;
    }
    if (
      !state.sceneReady ||
      state.panel ||
      state.dialogue ||
      state.viewOnly ||
      m.picnic
    ) {
      locomotion.current.speed = 0;
      return;
    }
    let dx = m.input.x,
      dz = m.input.z;
    if (m.path.length) {
      const target = m.path[0],
        distance = Math.hypot(target.x - p.x, target.z - p.z);
      if (distance < 0.09) {
        const path = m.path.slice(1);
        useVillageMotion.setState({ path });
        if (!path.length) {
          pending.current = m.pending;
          useVillageMotion.setState({ pending: null });
        }
      } else {
        dx = (target.x - p.x) / distance;
        dz = (target.z - p.z) / distance;
      }
    }
    const next = moveVillage(p, (dx * 2.65) / 60, (dz * 2.65) / 60);
    body.current!.setNextKinematicTranslation({ x: next.x, y: 0, z: next.z });
    locomotion.current.speed = Math.hypot(next.x - p.x, next.z - p.z) * 60;
    if (locomotion.current.speed > 0.03)
      yaw.current = Math.atan2(next.x - p.x, next.z - p.z);
  });
  useAfterPhysicsStep(() => {
    if (body.current) {
      const p = body.current.translation();
      latest.current = { x: p.x, z: p.z };
    }
  });
  const latest = useRef({ x: spawn.x, z: spawn.z });
  useFrame(({ camera, size, gl }, dt) => {
    const game = useGameStore.getState();
    if (useVillageMotion.getState().picnic) yaw.current = 0;
    if (game.panel || game.dialogue || useVillageMotion.getState().picnic)
      locomotion.current.speed = 0;
    const p = latest.current;
    villageRender.x = p.x;
    villageRender.z = p.z;
    saveTime.current += dt;
    publishTime.current += dt;
    if (publishTime.current > 0.08) {
      useVillageMotion.setState({
        position: { ...p },
        yaw: yaw.current,
        speed: locomotion.current.speed,
      });
      publishTime.current = 0;
    }
    if (saveTime.current > 0.5 || pending.current) {
      useGameStore.getState().saveVillagePosition(p.x, p.z, yaw.current);
      saveTime.current = 0;
    }
    if (pending.current) {
      const action = pending.current;
      pending.current = null;
      actInVillage(action);
    }
    if (anchor.current)
      anchor.current.rotation.y = turnToward(
        anchor.current.rotation.y,
        yaw.current,
        dt,
        reduced,
      );
    const target = new THREE.Vector3(p.x, 0.9, p.z),
      desired = target.clone().add(new THREE.Vector3(0, 7.2, 10.2));
    follow.current.lerp(
      target,
      reduced ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) * 8),
    );
    camera.position.copy(follow.current).add(new THREE.Vector3(0, 7.2, 10.2));
    camera.lookAt(follow.current);
    const cam = camera as THREE.OrthographicCamera,
      zoom = Math.min(size.width / 5, (size.height - 110) / 5.4);
    if (Math.abs(cam.zoom - zoom) > 0.01) {
      cam.zoom = zoom;
      cam.updateProjectionMatrix();
    }
    if (playerCharacter !== "melody")
      gl.domElement.dataset.playerCharacter = "kitty";
    gl.domElement.dataset.village = "true";
    gl.domElement.dataset.villageX = String(p.x);
    gl.domElement.dataset.villageZ = String(p.z);
    gl.domElement.dataset.villageSpeed = String(locomotion.current.speed);
    gl.domElement.dataset.villageYaw = String(anchor.current?.rotation.y || 0);
    gl.domElement.dataset.villageRoute = String(
      useVillageMotion.getState().path.length,
    );
  });
  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={[spawn.x, 0, spawn.z]}
    >
      <CapsuleCollider args={[0.35, 0.28]} position={[0, 0.65, 0]} />
      <GroundShadow />
      <group ref={anchor} rotation={[0, spawn.yaw, 0]}>
        <Suspense fallback={null}>
          {playerCharacter === "melody" ? (
            <Melody locomotion={locomotion} />
          ) : (
            <Kitty
              equipment={
                effect?.kind === "water"
                  ? { ...equipment, item: "watering" }
                  : packed || giving
                    ? { ...equipment, item: "none" }
                    : equipment
              }
              holding={packed || giving ? "parcel" : picnic ? "cup" : undefined}
              animate
              scale={0.78}
              locomotion={locomotion}
            />
          )}
        </Suspense>
      </group>
    </RigidBody>
  );
}
function Destination() {
  const path = useVillageMotion((s) => s.path),
    end = path.at(-1);
  return end ? (
    <mesh position={[end.x, 0.035, end.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.22, 0.32, 24]} />
      <meshBasicMaterial color="#c57b9f" transparent opacity={0.8} />
    </mesh>
  ) : null;
}
export function VillageScene() {
  return (
    <>
      <color attach="background" args={["#e9eddd"]} />
      <fog attach="fog" args={["#e9eddd", 28, 65]} />
      <CozyLights />
      <OrthographicCamera
        makeDefault
        position={[0, 13, 15]}
        zoom={50}
        near={0.1}
        far={100}
      />
      <Landscape />
      <Player />
      <Destination />
      <VisitAvatars />
    </>
  );
}
