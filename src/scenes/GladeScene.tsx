import { nearbyLabel } from "../game/context-action";
import { bloomAmount, bridgeAmount } from "./effect-motion";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Pip } from "./MoonPicnic";
import { makeGift } from "../../dist/gifts.js";
import { makeAdventureTool } from "./AdventureTools";
import { useGameStore } from "../game/store";
import { useReducedMotion } from "./Kitty";
import type { MapObject } from "../game/types";
function Bud({ open = false }: { open?: boolean }) {
  const effect = useGameStore((s) => s.effect),
    reduced = useReducedMotion(),
    group = useRef<THREE.Group>(null);
  useFrame(({ gl }) => {
    const root = group.current;
    if (!root) return;
    const p = bloomAmount(open, effect, reduced);
    for (let i = 0; i < 5; i++) {
      const petal = root.children[i + 1] as THREE.Mesh;
      petal.position.set(
        Math.sin((i * Math.PI * 2) / 5) * (0.07 + 0.08 * p),
        0.52 + Math.cos((i * Math.PI * 2) / 5) * 0.15 * p,
        0,
      );
      petal.scale.set(0.06 + 0.06 * p, 0.12 + 0.03 * p, 0.05 + 0.005 * p);
      (petal.material as THREE.MeshStandardMaterial).color
        .set("#c2afbf")
        .lerp(new THREE.Color("#e7a3be"), p);
    }
    gl.domElement.dataset.petalSpread = String(root.children[1].scale.x);
  });
  return (
    <group ref={group}>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.42, 8]} />
        <meshStandardMaterial color="#9ab998" />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh
          key={i}
          position={[
            Math.sin((i * Math.PI * 2) / 5) * (open ? 0.15 : 0.07),
            0.52 + (open ? Math.cos((i * Math.PI * 2) / 5) * 0.15 : 0),
            0,
          ]}
          scale={open ? [0.12, 0.15, 0.055] : [0.06, 0.12, 0.05]}
        >
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial color={open ? "#e7a3be" : "#c2afbf"} />
        </mesh>
      ))}
      <mesh position={[0, 0.52, 0.06]}>
        <sphereGeometry args={[0.07, 14, 10]} />
        <meshStandardMaterial color="#edd18e" />
      </mesh>
    </group>
  );
}
function Butterfly({ index, lit }: { index: number; lit: boolean }) {
  const group = useRef<THREE.Group>(null),
    reduced = useReducedMotion();
  useFrame(({ clock }) => {
    if (group.current && !reduced) {
      group.current.position.y =
        0.6 + Math.sin(clock.elapsedTime * 2 + index) * 0.12;
      group.current.rotation.z = Math.sin(clock.elapsedTime * 4 + index) * 0.1;
    }
  });
  return (
    <group ref={group} position={[0, 0.6, 0]}>
      {[-1, 1].map((sign) => (
        <mesh
          key={sign}
          position={[sign * 0.1, 0, 0]}
          rotation={[0, 0, sign * 0.3]}
          scale={[0.14, 0.2, 0.035]}
        >
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial
            color={lit ? "#efc6e5" : "#baafbf"}
            emissive={lit ? "#e6a9cf" : "#000"}
            emissiveIntensity={0.25}
          />
        </mesh>
      ))}
      <mesh>
        <capsuleGeometry args={[0.022, 0.19, 4, 8]} />
        <meshStandardMaterial color="#9a799e" />
      </mesh>
    </group>
  );
}
export function GladePortal({ type }: { type: "A" | "V" }) {
  const enter = useGameStore((s) => s.enter),
    a = useGameStore((s) => s.adventure);
  const show = nearbyLabel(
    a,
    type === "A" ? { x: 13, z: 11 } : { x: 1, z: 10 },
    true,
  );
  return (
    <group>
      {[-0.4, 0.4].map((x) => (
        <mesh key={x} position={[x, 0.43, 0]}>
          <cylinderGeometry args={[0.065, 0.065, 0.86, 10]} />
          <meshStandardMaterial color="#bca7d3" />
        </mesh>
      ))}
      <mesh position={[0, 0.86, 0]}>
        <torusGeometry args={[0.4, 0.07, 8, 24, Math.PI]} />
        <meshStandardMaterial color="#bca7d3" />
      </mesh>
      {show && (
        <Html center position={[0, 1.45, 0]} zIndexRange={[2, 0]}>
          <button className="world-label portal" onClick={() => enter(type)}>
            {type === "A" ? "Butterfly Glade ↗" : "Return to garden ↗"}
          </button>
        </Html>
      )}
    </group>
  );
}
export function GladeObject({ object: o }: { object: MapObject }) {
  const adventure = useGameStore((s) => s.adventure),
    effect = useGameStore((s) => s.effect),
    c = adventure.chapter,
    letter = useMemo(() => (o.type === "K" ? makeGift("letter") : null), [o]),
    lantern = useMemo(
      () => (o.type === "P" ? makeAdventureTool("lantern") : null),
      [o],
    );
  const label = (
    {
      L: "Follow the butterflies",
      W: c.flowersRevived ? "Nancy’s flower patch" : "Thirsty flowers",
      J: c.bridgeFixed ? "Friendship bridge" : "A broken bridge",
      Z: "Wishing stars",
      N: "Pip the bunny",
      K: "A sealed envelope",
      P: "A moonlit picnic",
    } as Record<string, string>
  )[o.type];
  if (o.type === "K" && (!c.friendAwake || c.letterFound)) return null;
  if (o.type === "L" && Number(o.id) < c.butterflyStep) return null;
  return (
    <group position={[o.x, 0, o.z]}>
      {label && nearbyLabel(adventure, o) && (
        <Html
          center
          position={[0, o.type === "N" ? 1.7 : 1.2, 0]}
          zIndexRange={[2, 0]}
        >
          <span className="world-label">{label}</span>
        </Html>
      )}
      {o.type === "V" && <GladePortal type="V" />}
      {o.type === "L" && (
        <Butterfly
          index={Number(o.id)}
          lit={Number(o.id) === c.butterflyStep}
        />
      )}
      {o.type === "W" && (
        <group>
          {[-0.26, 0, 0.26].map((x, i) => (
            <group key={x} position={[x, 0, (i % 2) * 0.2]}>
              <Bud open={c.flowersRevived} />
            </group>
          ))}
        </group>
      )}
      {o.type === "J" && <AnimatedBridge fixed={c.bridgeFixed} />}
      {o.type === "Z" && (
        <>
          {[-0.34, 0, 0.34].map((x, i) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh position={[0, 0.18, 0]}>
                <cylinderGeometry args={[0.14, 0.17, 0.35, 12]} />
                <meshStandardMaterial color="#e9dbc9" />
              </mesh>
              <mesh position={[0, 0.48, 0]} rotation={[0, 0, Math.PI / 4]}>
                <octahedronGeometry args={[0.15]} />
                <meshStandardMaterial
                  color={c.stars[i] ? "#f3d689" : "#c3b6cd"}
                  emissive={c.stars[i] ? "#f1c77b" : "#000"}
                  emissiveIntensity={0.25}
                />
              </mesh>
            </group>
          ))}
        </>
      )}
      {o.type === "N" && (
        <Pip
          awake={c.friendAwake}
          waking={effect?.kind === "wake" ? effect : null}
        />
      )}
      {letter && (
        <primitive object={letter} position={[0, 0.35, 0]} scale={0.85} />
      )}
      {o.type === "P" && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
            <planeGeometry args={[1.7, 1.5]} />
            <meshStandardMaterial color="#e3b1cc" />
          </mesh>
          {lantern && (
            <primitive
              object={lantern}
              position={[0.55, 0.2, -0.4]}
              scale={0.7}
            />
          )}
          <mesh position={[-0.4, 0.08, 0.1]}>
            <cylinderGeometry args={[0.22, 0.22, 0.06, 20]} />
            <meshStandardMaterial color="#fff0dd" />
          </mesh>
          <mesh position={[0, 2.7, -0.7]}>
            <sphereGeometry args={[0.4, 24, 16]} />
            <meshBasicMaterial color="#f9e2a5" />
          </mesh>
        </>
      )}
    </group>
  );
}
export function GladeScenery() {
  const c = useGameStore((s) => s.adventure.chapter);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[7, -0.005, 6]}>
        <planeGeometry args={[1, 11]} />
        <meshStandardMaterial color="#b8d6df" roughness={0.55} />
      </mesh>
      {c.butterflyStep > 0 &&
        [8, 7, 6].map((z) => (
          <mesh key={z} position={[3, 0.015, z]}>
            <cylinderGeometry args={[0.3, 0.34, 0.045, 10]} />
            <meshStandardMaterial color="#f1dfc9" />
          </mesh>
        ))}
      {c.butterflyStep === 0 && (
        <mesh position={[3, 0.25, 7]}>
          <boxGeometry args={[0.96, 0.65, 0.96]} />
          <meshStandardMaterial color="#b7c9aa" />
        </mesh>
      )}
      {[
        [2, 2],
        [4, 2],
        [12, 10],
        [9, 10],
        [13, 4],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.08, 0.12, 1, 10]} />
            <meshStandardMaterial color="#c4a58d" />
          </mesh>
          <mesh position={[0, 1.3, 0]} scale={[0.65, 0.8, 0.6]}>
            <sphereGeometry args={[1, 18, 14]} />
            <meshStandardMaterial color={i % 2 ? "#c8bddb" : "#c0d3b0"} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function AnimatedBridge({ fixed }: { fixed: boolean }) {
  const effect = useGameStore((s) => s.effect),
    reduced = useReducedMotion(),
    boards = useRef<THREE.Group>(null),
    ties = useRef<THREE.Group>(null);
  useFrame(({ gl }) => {
    const p = bridgeAmount(fixed, effect, reduced);
    boards.current?.children.forEach((board, i) => {
      board.scale.x = (0.45 + 0.75 * p) / 1.2;
      board.rotation.y = (i % 2 ? 0.3 : -0.3) * (1 - p);
    });
    if (ties.current) ties.current.scale.x = Math.max(0.001, p);
    gl.domElement.dataset.bridgeWidth = String(
      1.2 * (boards.current?.children[0].scale.x || 0.375),
    );
  });
  return (
    <>
      <group ref={boards}>
        {[-0.3, -0.1, 0.1, 0.3].map((z) => (
          <mesh key={z} position={[0, 0.04, z]}>
            <boxGeometry args={[1.2, 0.075, 0.14]} />
            <meshStandardMaterial color="#d8b294" />
          </mesh>
        ))}
      </group>
      {fixed && (
        <group ref={ties}>
          {[-0.42, 0.42].map((z) => (
            <mesh key={z} position={[0, 0.19, z]}>
              <boxGeometry args={[1.3, 0.045, 0.045]} />
              <meshStandardMaterial color="#d984ab" />
            </mesh>
          ))}
        </group>
      )}
    </>
  );
}
