import { CozyLights, WORLD_COLORS } from "./CozyLights";
import { adventureFraming } from "./adventure-camera";
import { InputClock } from "./input-clock";
import { TileMotor, PHYSICS_STEP } from "./tile-motor";
import { DiscoveryEffects } from "./DiscoveryEffects";
import { turnToward } from "./walk-animation";
import { nearbyLabel } from "../game/context-action";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, OrthographicCamera } from "@react-three/drei";
import {
  CuboidCollider,
  CapsuleCollider,
  RigidBody,
  useRapier,
  useBeforePhysicsStep,
  useAfterPhysicsStep,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import { GladeObject, GladePortal, GladeScenery } from "./GladeScene";
import { makeGift } from "../../dist/gifts.js";
import { makeBow } from "../../dist/models.js";
import { MAPS, walkable } from "../game/domain";
import { useGameStore } from "../game/store";
import { assetUrl } from "../game/assets";
import { Kitty, useReducedMotion } from "./Kitty";
import type { MapObject } from "../game/types";
const dirs = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
} as const;
function SoftBox({
  position,
  size,
  color,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}
function Ball({
  position,
  scale,
  color,
}: {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position} scale={scale}>
      <sphereGeometry args={[1, 14, 10]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}
function Arch() {
  return (
    <group>
      {[-0.43, 0.43].map((x) => (
        <mesh key={x} position={[x, 0.4, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.8, 10]} />
          <meshStandardMaterial color="#d992b3" />
        </mesh>
      ))}
      <mesh position={[0, 0.8, 0]}>
        <torusGeometry args={[0.43, 0.075, 8, 22, Math.PI]} />
        <meshStandardMaterial color="#d992b3" />
      </mesh>
    </group>
  );
}
function Prop({ object: o }: { object: MapObject }) {
  const a = useGameStore((s) => s.adventure),
    enter = useGameStore((s) => s.enter),
    lid = useRef<THREE.Group>(null),
    reduced = useReducedMotion();
  const gift = useMemo(
    () =>
      o.type === "M"
        ? makeGift("teddy")
        : o.type === "B"
          ? makeGift("strawberry")
          : o.type === "R"
            ? makeBow("#d992b3", 0.8)
            : null,
    [o],
  );
  useFrame((_, dt) => {
    if (lid.current) {
      const target = a.charms.includes(o.id || "") ? -0.85 : 0;
      lid.current.rotation.x = reduced
        ? target
        : THREE.MathUtils.lerp(
            lid.current.rotation.x,
            target,
            1 - Math.exp(-dt * 9),
          );
    }
  });
  if (
    (o.type === "R" && a.ribbons.includes(o.id || "")) ||
    (o.type === "G" && a.gate)
  )
    return null;
  const label = (
    {
      M: "Momo",
      Q: "Cloud guardian",
      G: "Moon gate",
      S: "Moonflower",
      R: "Lost ribbon",
      B: "Picnic berries",
      T: "Garden lantern",
    } as Record<string, string>
  )[o.type];
  if (o.type === "A")
    return (
      <group position={[o.x, 0, o.z]}>
        <GladePortal type="A" />
      </group>
    );
  return (
    <group position={[o.x, 0, o.z]}>
      {label && nearbyLabel(a, o) && (
        <Html
          position={[0, o.type === "M" ? 1.45 : 1.3, 0]}
          center
          zIndexRange={[2, 0]}
        >
          <span className="world-label">{label}</span>
        </Html>
      )}
      {o.type === "H" && (
        <>
          <SoftBox
            position={[0, 0.65, 0]}
            size={[2.25, 1.3, 2.25]}
            color="#fff0da"
          />
          <mesh position={[0, 1.7, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[1.85, 0.85, 4]} />
            <meshStandardMaterial color="#d992b3" />
          </mesh>
          <SoftBox
            position={[0, 0.43, 1.14]}
            size={[0.48, 0.86, 0.04]}
            color="#eed395"
          />
          {[-0.75, 0.75].map((x) => (
            <SoftBox
              key={x}
              position={[x, 0.82, 1.15]}
              size={[0.43, 0.43, 0.04]}
              color="#b8dce4"
            />
          ))}
        </>
      )}
      {o.type === "T" && (
        <>
          <SoftBox
            position={[0, 0.28, 0]}
            size={[0.15, 0.55, 0.15]}
            color="#d992b3"
          />
          <Ball
            position={[0, 0.65, 0]}
            scale={[0.17, 0.22, 0.17]}
            color={a.litLanterns.includes(o.id || "") ? "#ffe9ac" : "#cbb8c6"}
          />
          <mesh position={[0, 0.92, 0]}>
            <coneGeometry args={[0.24, 0.18, 6]} />
            <meshStandardMaterial color="#fff0da" />
          </mesh>
        </>
      )}
      {gift && (
        <primitive
          object={gift}
          position={o.type === "R" ? [0, 0.35, 0] : [0, 0.25, 0]}
          scale={
            o.type === "R"
              ? 0.55
              : o.type === "B" && a.berries.includes(o.id || "")
                ? 1
                : 1.5
          }
        />
      )}
      {o.type === "Q" && (
        <>
          {[
            [-0.28, 0.65, 0.29],
            [0, 0.78, 0.37],
            [0.29, 0.65, 0.27],
          ].map(([x, y, s]) => (
            <Ball
              key={x}
              position={[x, y, 0]}
              scale={[s, s * 0.8, s * 0.7]}
              color="#fff0da"
            />
          ))}
          {[-0.1, 0.1].map((x) => (
            <Ball
              key={x}
              position={[x, 0.78, 0.255]}
              scale={[0.026, 0.036, 0.018]}
              color="#4a354b"
            />
          ))}
        </>
      )}
      {o.type === "C" && (
        <>
          <group ref={lid} position={[0, 0.32, -0.22]}>
            <SoftBox
              position={[0, 0, 0.22]}
              size={[0.63, 0.12, 0.48]}
              color="#eed395"
            />
          </group>
          <SoftBox
            position={[0, 0.17, 0]}
            size={[0.61, 0.31, 0.45]}
            color="#d992b3"
          />
          <SoftBox
            position={[0, 0.24, 0.235]}
            size={[0.12, 0.17, 0.025]}
            color="#fff0da"
          />
        </>
      )}
      {o.type === "G" && (
        <>
          <Arch />
          <SoftBox
            position={[0, 0.55, 0]}
            size={[0.7, 0.75, 0.08]}
            color="#eed395"
          />
        </>
      )}
      {(o.type === "D" || o.type === "E") && (
        <>
          <Arch />
          <SoftBox
            position={[0, 0.015, 0]}
            size={[0.8, 0.04, 0.8]}
            color="#fff0da"
          />
          {nearbyLabel(a, o, true) && (
            <Html position={[0, 1.5, 0]} center zIndexRange={[2, 0]}>
              <button
                className="world-label portal"
                onClick={() => enter(o.type as "D" | "E")}
              >
                {o.type === "D" ? "Enter dungeon ↗" : "Return to village ↗"}
              </button>
            </Html>
          )}
        </>
      )}
      {o.type === "F" && (
        <>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.55, 0.55, 0.25, 20]} />
            <meshStandardMaterial color="#fff0da" />
          </mesh>
          <mesh position={[0, 0.26, 0]}>
            <cylinderGeometry args={[0.45, 0.45, 0.02, 20]} />
            <meshStandardMaterial color="#b8dce4" />
          </mesh>
          <SoftBox
            position={[0, 0.45, 0]}
            size={[0.14, 0.65, 0.14]}
            color="#fff0da"
          />
        </>
      )}
      {(o.type === "S" || o.type === "o") && (
        <>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry
              args={[
                o.type === "S" ? 0.5 : 0.12,
                o.type === "S" ? 0.55 : 0.12,
                o.type === "S" ? 0.35 : 0.1,
                16,
              ]}
            />
            <meshStandardMaterial color="#fff0da" />
          </mesh>
          <SoftBox
            position={[0, 0.5, 0]}
            size={[0.04, 0.5, 0.04]}
            color="#b6c99f"
          />
          {Array.from({ length: 5 }, (_, i) => (
            <Ball
              key={i}
              position={[
                Math.sin((i * Math.PI * 2) / 5) * 0.16,
                0.72 + Math.cos((i * Math.PI * 2) / 5) * 0.16,
                0,
              ]}
              scale={[0.12, 0.14, 0.06]}
              color="#d992b3"
            />
          ))}
          <Ball
            position={[0, 0.72, 0.07]}
            scale={[0.095, 0.095, 0.04]}
            color="#eed395"
          />
        </>
      )}
    </group>
  );
}
function ForegroundWalls({
  walls,
  anchor,
  color,
}: {
  walls: { x: number; z: number }[];
  anchor: RefObject<THREE.Group | null>;
  color: string;
}) {
  const group = useRef<THREE.Group>(null),
    point = useRef(new THREE.Vector3()),
    reduced = useReducedMotion();
  useFrame(({ gl }, dt) => {
    if (!group.current || !anchor.current) return;
    anchor.current.getWorldPosition(point.current);
    let faded = 0;
    for (const child of group.current.children) {
      const mesh = child as THREE.Mesh<
        THREE.BoxGeometry,
        THREE.MeshStandardMaterial
      >;
      const dz = mesh.position.z - point.current.z;
      const foreground =
        dz > 0.2 && dz < 3 && Math.abs(mesh.position.x - point.current.x) < 1.5;
      if (foreground) faded++;
      mesh.material.opacity = reduced
        ? foreground
          ? 0.15
          : 1
        : THREE.MathUtils.lerp(
            mesh.material.opacity,
            foreground ? 0.15 : 1,
            1 - Math.exp(-Math.min(dt, 0.1) * 12),
          );
    }
    gl.domElement.dataset.cutawayWalls = String(faded);
  });
  return (
    <group ref={group}>
      {walls.map(({ x, z }) => (
        <mesh key={`${x}-${z}`} position={[x, 0.25, z]}>
          <boxGeometry args={[0.96, 0.65, 0.96]} />
          <meshStandardMaterial
            color={color}
            roughness={0.9}
            transparent
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
function Terrain({ anchor }: { anchor: RefObject<THREE.Group | null> }) {
  const a = useGameStore((s) => s.adventure),
    map = MAPS[a.map],
    garden = a.map !== "village";
  const floors = useMemo(() => {
    const mesh = new THREE.InstancedMesh(
        new THREE.BoxGeometry(0.995, 0.2, 0.995),
        new THREE.MeshStandardMaterial({ roughness: 0.9 }),
        map.w * map.h,
      ),
      matrix = new THREE.Matrix4();
    let i = 0;
    for (let z = 0; z < map.h; z++)
      for (let x = 0; x < map.w; x++) {
        const path =
          a.map === "glade"
            ? x === 3 || z === 8
            : garden
              ? x === 7 || z === 7 || z === 10
              : x === 7 ||
                z === 5 ||
                (z === 8 && x < 8) ||
                (x === 12 && z <= 5) ||
                (z === 2 && x >= 7);
        matrix.makeTranslation(x, -0.11, z);
        mesh.setMatrixAt(i, matrix);
        mesh.setColorAt(
          i++,
          new THREE.Color(
            a.map === "glade" && x === 7
              ? "#b8d6df"
              : path
                ? "#fff0da"
                : garden
                  ? (x + z) % 2
                    ? "#d3cbe2"
                    : "#d9d1e7"
                  : (x + z) % 2
                    ? "#d2dfba"
                    : "#d7e4c1",
          ),
        );
      }
    return mesh;
  }, [map, garden]);
  const blocked = map.rows.flatMap((row, z) =>
    Array.from(row).flatMap((_, x) =>
      walkable(a, x, z) ? [] : [{ x, z, wall: row[x] === "#" }],
    ),
  );
  return (
    <>
      <primitive object={floors} />
      <RigidBody key={a.map} type="fixed" colliders={false}>
        <CuboidCollider
          args={[map.w / 2, 0.15, map.h / 2]}
          position={[map.w / 2 - 0.5, -0.16, map.h / 2 - 0.5]}
        />
        {blocked.map(({ x, z }) => (
          <CuboidCollider
            key={`${x}-${z}`}
            args={[0.48, 0.7, 0.48]}
            position={[x, 0.7, z]}
          />
        ))}
      </RigidBody>
      <ForegroundWalls
        walls={blocked.filter((b) => b.wall)}
        anchor={anchor}
        color={garden ? "#b8a9ce" : "#b6c99f"}
      />
      {a.map === "glade" && <GladeScenery />}
      {map.objects.map((o) =>
        a.map === "glade" ? (
          <GladeObject key={`${o.type}-${o.id || o.x}`} object={o} />
        ) : (
          <Prop
            key={`${a.map}-${o.type}-${o.id || `${o.x}-${o.z}`}`}
            object={o}
          />
        ),
      )}
    </>
  );
}
function Player({ anchor }: { anchor: RefObject<THREE.Group | null> }) {
  const a = useGameStore((s) => s.adventure),
    equipment = useGameStore((s) => s.equipment),
    command = useGameStore((s) => s.moveCommand),
    body = useRef<RapierRigidBody>(null),
    { world } = useRapier(),
    reduced = useReducedMotion();
  const locomotion = useRef({ speed: 0 }),
    inputClock = useRef(new InputClock()),
    motor = useRef<TileMotor | null>(null),
    activeCommand = useRef<number | null>(null);
  const spawn = useMemo(() => [a.x, 0, a.z] as [number, number, number], []);
  useEffect(() => {
    const c = world.createCharacterController(0.015);
    motor.current = new TileMotor(world, body.current!, c);
    return () => {
      motor.current = null;
      world.removeCharacterController(c);
    };
  }, [world]);
  useBeforePhysicsStep(() => {
    const s = useGameStore.getState(),
      cmd = s.moveCommand,
      m = motor.current;
    if (!m) return;
    if (cmd && activeCommand.current !== cmd.id) {
      const [dx, dz] = dirs[cmd.dir],
        x = s.adventure.x + dx,
        z = s.adventure.z + dz;
      activeCommand.current = cmd.id;
      // Automatic held steps belong to the same input budget. Resetting it at
      // each tile discarded catch-up time and caused a visible boundary pause.
      if (!cmd.continuous) inputClock.current.reset(cmd.issuedAt);
      m.begin(
        { x, z },
        walkable(s.adventure, x, z),
        s.heldDirection === cmd.dir,
      );
    }
    if (cmd && !inputClock.current.consume(performance.now())) return;
    m.beforeStep(PHYSICS_STEP);
    locomotion.current.speed = m.speed;
  });
  useAfterPhysicsStep(() => {
    const result = motor.current?.afterStep();
    if (result) {
      useGameStore.getState().finishMove(result === "blocked");
      locomotion.current.speed = useGameStore.getState().moveCommand
        ? motor.current!.speed
        : 0;
    }
  });
  const facing = command?.dir || a.facing;
  useFrame(({ gl }, dt) => {
    gl.domElement.dataset.moving = String(useGameStore.getState().moving);
    if (anchor.current) {
      anchor.current.rotation.y = turnToward(
        anchor.current.rotation.y,
        { up: Math.PI, down: 0, left: -Math.PI / 2, right: Math.PI / 2 }[
          facing
        ],
        Math.min(dt, 0.1),
        reduced,
      );
      gl.domElement.dataset.playerYaw = String(anchor.current.rotation.y);
      const p = anchor.current.getWorldPosition(new THREE.Vector3());
      gl.domElement.dataset.renderX = String(p.x);
      gl.domElement.dataset.renderZ = String(p.z);
    }
    const p = body.current?.translation();
    if (p) {
      gl.domElement.dataset.bodyX = String(p.x);
      gl.domElement.dataset.bodyZ = String(p.z);
    }
  });
  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={spawn}
      enabledRotations={[false, false, false]}
    >
      <CapsuleCollider args={[0.18, 0.18]} position={[0, 0.39, 0]} />
      <group ref={anchor}>
        <Kitty
          equipment={equipment}
          animate
          scale={0.48}
          locomotion={locomotion}
        />
      </group>
    </RigidBody>
  );
}
function FollowCamera({ anchor }: { anchor: RefObject<THREE.Group | null> }) {
  const a = useGameStore((s) => s.adventure),
    { size } = useThree();
  const { half, aspect, marginX, marginZ } = adventureFraming(
    size.width,
    size.height,
  );
  useFrame(({ camera, gl }) => {
    if (camera instanceof THREE.OrthographicCamera) {
      camera.left = -half * aspect;
      camera.right = half * aspect;
      camera.top = half;
      camera.bottom = -half;
      camera.zoom = 1;
      camera.updateProjectionMatrix();
    }
    const m = MAPS[a.map],
      p =
        anchor.current?.getWorldPosition(new THREE.Vector3()) ||
        new THREE.Vector3(a.x, 0, a.z),
      x = THREE.MathUtils.clamp(p.x, marginX, m.w - 1 - marginX),
      z = THREE.MathUtils.clamp(p.z, marginZ, m.h - 1 - marginZ);
    camera.position.set(x, 7, z + 8);
    gl.domElement.dataset.cameraX = String(x);
    gl.domElement.dataset.cameraZ = String(z);
    camera.lookAt(camera.position.x, 0, camera.position.z - 8);
    camera.updateMatrixWorld(true);
    const screen = p
      .clone()
      .add(new THREE.Vector3(0, 0.6, 0))
      .project(camera);
    gl.domElement.dataset.playerScreenX = String((screen.x + 1) / 2);
    gl.domElement.dataset.playerScreenY = String((1 - screen.y) / 2);
    gl.domElement.dataset.cameraType = camera.type;
    gl.domElement.dataset.cameraHalf = String(half);
    gl.domElement.dataset.physicsContacts = String(
      useGameStore.getState().physicsContacts,
    );
    gl.domElement.dataset.tile = `${a.x},${a.z}`;
  }, -0.5);
  return (
    <OrthographicCamera
      makeDefault
      manual
      position={[a.x, 7, a.z + 8]}
      left={-half * aspect}
      right={half * aspect}
      top={half}
      bottom={-half}
      zoom={1}
      near={0.1}
      far={60}
    />
  );
}
function Discovery() {
  const notice = useGameStore((s) => s.notice),
    group = useRef<THREE.Group>(null),
    age = useRef(0),
    reduced = useReducedMotion();
  useEffect(() => {
    age.current = 0;
  }, [notice?.id]);
  useFrame((_, dt) => {
    if (!group.current) return;
    age.current += Math.min(dt, 0.1);
    group.current.visible = age.current < 2.6;
    group.current.position.y = reduced
      ? 1.2
      : 0.8 + Math.min(age.current, 2) * 0.55;
  });
  return notice?.at && notice.art ? (
    <group ref={group} position={[notice.at[0], 1, notice.at[1]]}>
      <Html center zIndexRange={[2, 0]}>
        <div className={`world-discovery ${reduced ? "still" : ""}`}>
          <span>✧ ♡ ✧</span>
          <img alt="" src={assetUrl(`assets/quest/${notice.art}.svg`)} />
          <span>♡ ✧ ♡</span>
        </div>
      </Html>
    </group>
  ) : null;
}
export function AdventureScene() {
  const map = useGameStore((s) => s.adventure.map),
    anchor = useRef<THREE.Group>(null);
  return (
    <>
      <color attach="background" args={[WORLD_COLORS[map]]} />
      <CozyLights />
      <Terrain anchor={anchor} />
      <Player key={map} anchor={anchor} />
      <FollowCamera anchor={anchor} />
      <Discovery />
      <DiscoveryEffects />
    </>
  );
}
