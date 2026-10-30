import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../game/store";
import { useReducedMotion } from "./Kitty";
import { effectTime } from "./effect-motion";
export function DiscoveryEffects() {
  const dpr = useThree((s) => s.viewport.dpr), count = dpr <= 1 ? 6 : 12;
  const effect = useGameStore((s) => s.effect),
    map = useGameStore((s) => s.adventure.map),
    group = useRef<THREE.Group>(null),
    reduced = useReducedMotion();
  useFrame(({ gl }) => {
    const root = group.current;
    if (!root) return;
    const t = effectTime(effect),
      active = !!effect && effect.map === map && t < effect.duration;
    root.visible = active && !reduced;
    gl.domElement.dataset.discoveryEffect = active ? effect!.kind : "";
    gl.domElement.dataset.effectAge = String(t);
    if (!active || reduced) return;
    root.children.forEach((child, i) => {
      if (effect.kind === "water") {
        const phase = (t * 1.4 + i / 12) % 1;
        child.position.set(
          Math.sin(i * 2.4) * 0.25,
          1.4 - phase * 0.95,
          0.15 + Math.cos(i * 3) * 0.22,
        );
        child.scale.set(0.035, 0.075, 0.035);
      } else {
        const p = Math.min(1, t / 1.4),
          angle = (i * Math.PI * 2) / count;
        child.position.set(
          Math.cos(angle) * p * 0.65,
          0.4 + Math.sin(p * Math.PI) * 0.65,
          Math.sin(angle) * p * 0.4,
        );
        child.scale.setScalar(0.045 * (1 - p * 0.5));
        child.rotation.z = t + i;
      }
    });
  });
  if (!effect || effect.map !== map) return null;
  return (
    <group
      ref={group}
      position={[effect.at[0], 0, effect.at[1]]}
      name="Discovery animation"
    >
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i}>
          {effect.kind === "water" ? (
            <sphereGeometry args={[1, 10, 8]} />
          ) : (
            <octahedronGeometry args={[1]} />
          )}
          <meshStandardMaterial
            color={
              effect.kind === "water"
                ? "#92c6e4"
                : i % 2
                  ? "#ebc785"
                  : "#e6a2c4"
            }
            roughness={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}
