import { Toy, ToyFriend } from "./GameToys";
import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { ACESFilmicToneMapping } from "three";
import { CozyLights, COZY_EXPOSURE } from "./CozyLights";
import { Kitty } from "./Kitty";
import { useGameStore } from "../game/store";
import { CookieMesh } from "./CookieMesh";
export function TeaCup() {
  return <Toy name="Cup" scale={0.9} />;
}
export function TeaTable({ placed = 0 }: { placed?: number }) {
  const cookie = useGameStore((s) => s.cozy.tea.cookie ?? s.cozy.cookie);
  return (
    <group>
      <mesh position={[0, 0.48, 0]}>
        <cylinderGeometry args={[0.82, 0.82, 0.09, 32]} />
        <meshStandardMaterial color="#e8bbd0" />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.1, 0.17, 0.45, 16]} />
        <meshStandardMaterial color="#c5a589" />
      </mesh>
      <mesh position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.4, 0.45, 0.07, 24]} />
        <meshStandardMaterial color="#c5a589" />
      </mesh>
      {placed > 0 && (
        <group position={[-0.38, 0.54, 0.12]}>
          <TeaCup />
        </group>
      )}
      {placed > 1 && (
        <group position={[0.38, 0.54, 0.12]} rotation={[0, Math.PI, 0]}>
          <TeaCup />
        </group>
      )}
      {placed > 2 && (
        <group position={[0, 0.55, -0.24]}>
          <mesh>
            <cylinderGeometry args={[0.25, 0.25, 0.04, 24]} />
            <meshStandardMaterial color="#fff2df" />
          </mesh>
          <group position={[0, 0.03, 0]}>
            <CookieMesh cookie={cookie} />
          </group>
        </group>
      )}
    </group>
  );
}
export default function TeaPreview({
  complete,
  placed,
}: {
  complete: boolean;
  placed: number;
}) {
  const equipment = useGameStore((s) => s.equipment),
    performance = useMemo(() => ({ id: 1, kind: "sip" as const }), []);
  return (
    <div className="tea-preview">
      <Canvas
        camera={{ position: [2, 1.8, 3.7], fov: 36 }}
        dpr={[1, 1.5]}
        onCreated={({ gl, camera }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = COZY_EXPOSURE;
          gl.domElement.setAttribute(
            "aria-label",
            "Kitty and Momo’s moonlight tea table",
          );
          camera.lookAt(0, 0.7, 0);
        }}
      >
        <color attach="background" args={["#e4dced"]} />
        <CozyLights evening />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]}>
          <circleGeometry args={[5, 48]} />
          <meshStandardMaterial color="#c3d2b7" />
        </mesh>
        <mesh position={[1.6, 2.3, -2]}>
          <sphereGeometry args={[0.4, 24, 16]} />
          <meshBasicMaterial color="#fff0bf" />
        </mesh>
        <group position={[0, 0, 0.45]}>
          <TeaTable placed={placed} />
        </group>
        <Suspense fallback={null}>
          <Kitty
            equipment={{ ...equipment, item: "none" }}
            position={[-0.85, 0.02, -0.5]}
            scale={0.72}
            rotation={[0, 0.4, 0]}
            animate
            performance={performance}
            holding="cup"
          />
        </Suspense>
        {complete && (
          <ToyFriend
            name="Momo"
            position={[0.8, 0.02, -0.4]}
            scale={1.1}
            rotation={[0, -0.3, 0]}
            greetOnMount
          />
        )}
        <OrbitControls
          target={[0, 0.7, 0]}
          enablePan={false}
          enableZoom={false}
          minPolarAngle={0.6}
          maxPolarAngle={1.35}
        />
      </Canvas>
    </div>
  );
}
