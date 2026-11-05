import { useMemo, useRef } from "react";
import { createPortal, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../game/store";
import { useReducedMotion } from "./use-reduced-motion";
export function RainWindow({ window }: { window: THREE.Object3D }) {
  const rainy = useGameStore((s) => s.cozy.weather === "rain"),
    reduced = useReducedMotion(),
    mesh = useRef<THREE.InstancedMesh>(null),
    dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock, gl }) => {
    if (!mesh.current) return;
    for (let i = 0; i < 36; i++) {
      const x = (((i * 29) % 101) / 101) * 1.72 - 0.86,
        base = ((i * 47) % 103) / 103,
        phase = reduced ? base : (base + clock.elapsedTime * 0.42) % 1;
      dummy.position.set(x, 1 - phase * 2, 0.055);
      dummy.rotation.z = -0.16;
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    gl.domElement.dataset.weather = rainy ? "rain" : "sunny";
  });
  return createPortal(
    <instancedMesh visible={rainy} ref={mesh} args={[undefined, undefined, 36]}>
      <cylinderGeometry args={[0.003, 0.003, 0.13, 4]} />
      <meshBasicMaterial color="#88a9ba" />
    </instancedMesh>,
    window,
  );
}
