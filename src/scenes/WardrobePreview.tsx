import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { ACESFilmicToneMapping } from "three";
import { Kitty } from "./Kitty";
import type { Equipment } from "../game/types";
function PreviewLabel({ label }: { label: string }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.domElement.setAttribute("aria-label", `${label}. Drag to rotate Kitty.`);
  }, [gl, label]);
  return null;
}
export default function WardrobePreview({
  equipment,
  label,
}: {
  equipment: Equipment;
  label: string;
}) {
  return (
    <Canvas
      camera={{ position: [0, 1.35, 5], fov: 35, near: 0.1, far: 25 }}
      dpr={[1, 1.25]}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
        gl.domElement.setAttribute(
          "aria-label",
          `${label}. Drag to rotate Kitty.`,
        );
      }}
    >
      <PreviewLabel label={label} />
      <color attach="background" args={["#f8e9ef"]} />
      <hemisphereLight args={["#fff4ef", "#baa6cf", 2.8]} />
      <directionalLight position={[-3, 9, 6]} color="#fff1d2" intensity={2} />
      <Suspense fallback={null}>
        <Kitty equipment={equipment} />
      </Suspense>
      <OrbitControls
        makeDefault
        target={[0, 1.13, 0]}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={0.6}
        maxPolarAngle={2.2}
      />
    </Canvas>
  );
}
