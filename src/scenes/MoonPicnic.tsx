import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { ACESFilmicToneMapping } from "three";
import { Kitty, useReducedMotion } from "./Kitty";
import { makeGift } from "../../dist/gifts.js";
import { Dialog } from "../ui/Dialog";
import { useGameStore } from "../game/store";
import { endingUnlocked } from "../game/chapter";
export function Pip({ awake = true }: { awake?: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.32, 0]} scale={[0.3, 0.35, 0.23]}>
        <sphereGeometry args={[1, 18, 14]} />
        <meshStandardMaterial color="#eee0d0" />
      </mesh>
      <mesh position={[0, 0.78, 0]} scale={[0.37, 0.31, 0.25]}>
        <sphereGeometry args={[1, 20, 16]} />
        <meshStandardMaterial color="#f2e6d9" />
      </mesh>
      {[-1, 1].map((sign) => (
        <group key={sign}>
          <mesh
            position={[sign * 0.19, 1.12, 0]}
            rotation={[0, 0, -sign * 0.16]}
            scale={[0.11, 0.36, 0.09]}
          >
            <sphereGeometry args={[1, 18, 14]} />
            <meshStandardMaterial color="#eee0d0" />
          </mesh>
          <mesh
            position={[sign * 0.19, 1.14, 0.07]}
            rotation={[0, 0, -sign * 0.16]}
            scale={[0.054, 0.26, 0.024]}
          >
            <sphereGeometry args={[1, 14, 12]} />
            <meshStandardMaterial color="#e8bacb" />
          </mesh>
          <mesh
            position={[sign * 0.13, 0.8, 0.237]}
            scale={[0.026, awake ? 0.038 : 0.009, 0.014]}
          >
            <sphereGeometry args={[1, 12, 10]} />
            <meshBasicMaterial color="#644756" />
          </mesh>
          <mesh
            position={[sign * 0.2, 0.66, 0.22]}
            scale={[0.07, 0.025, 0.012]}
          >
            <sphereGeometry args={[1, 12, 10]} />
            <meshStandardMaterial color="#e5b2c6" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.72, 0.26]} scale={[0.032, 0.024, 0.018]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial color="#ce94ae" />
      </mesh>
    </group>
  );
}
const LINES = [
  "The moonflower glows. A blanket waits beneath the moon.",
  "Momo brings something sweet. Pip has found a cozy little place.",
  "The cloud guardian feels brave enough to join the picnic.",
  "No rush, Nancy. Just a little happy moment together. ♡",
];
function PicnicScene({
  paused,
  onLine,
  reduced,
}: {
  paused: boolean;
  onLine: (n: number) => void;
  reduced: boolean;
}) {
  const equipment = useGameStore((s) => s.equipment),
    teddy = useMemo(() => makeGift("teddy"), []),
    time = useRef(0),
    line = useRef(-1),
    cameraMoved = useRef(false),
    performance = useMemo(() => ({ id: 1, kind: "wave" as const }), []);
  useFrame(({ camera }, dt) => {
    if (!paused && !reduced)
      time.current = Math.min(16, time.current + Math.min(dt, 0.1));
    const next = reduced ? 3 : Math.min(3, Math.floor(time.current / 4));
    if (next !== line.current) {
      line.current = next;
      onLine(next);
    }
    if (!cameraMoved.current) {
      camera.lookAt(0, 0.8, 0);
      cameraMoved.current = true;
    }
  });
  return (
    <>
      <color attach="background" args={["#e5daee"]} />
      <hemisphereLight args={["#fff1e6", "#bca6ca", 2.7]} />
      <directionalLight position={[-3, 6, 4]} intensity={2} color="#ffe9c5" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]}>
        <circleGeometry args={[8, 64]} />
        <meshStandardMaterial color="#b9cbb4" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.3]}>
        <planeGeometry args={[3.5, 2.4]} />
        <meshStandardMaterial color="#e3aec7" />
      </mesh>
      {[-1, 0, 1].map((i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[i, 0.02, 0.3]}>
          <planeGeometry args={[0.08, 2.4]} />
          <meshStandardMaterial color="#fff1df" />
        </mesh>
      ))}
      <Kitty
        equipment={{ ...equipment, item: "flowers" }}
        scale={0.74}
        position={[0, 0.03, -0.35]}
        animate
        performance={performance}
      />
      <primitive object={teddy} scale={1.4} position={[-1.2, 0.05, 0.2]} />
      <group position={[1.15, 0.03, 0.15]} rotation={[0, -0.3, 0]}>
        <Pip />
      </group>
      <group position={[-1.1, 1.15, -0.8]}>
        {[-0.24, 0, 0.24].map((x, i) => (
          <mesh
            key={x}
            position={[x, i === 1 ? 0.08 : 0, 0]}
            scale={[0.28, 0.22, 0.23]}
          >
            <sphereGeometry args={[1, 16, 12]} />
            <meshStandardMaterial color="#fff1dd" />
          </mesh>
        ))}
        {[-0.08, 0.08].map((x) => (
          <mesh key={x} position={[x, 0.08, 0.23]}>
            <sphereGeometry args={[0.018, 10, 8]} />
            <meshBasicMaterial color="#665062" />
          </mesh>
        ))}
      </group>
      <mesh position={[2.5, 3, -3]}>
        <sphereGeometry args={[0.7, 32, 20]} />
        <meshBasicMaterial color="#f9e3a6" />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh
          key={i}
          position={[-3 + i * 0.7, 2.8 + Math.sin(i * 3) * 0.7, -3.3]}
          rotation={[0, 0, Math.PI / 4]}
        >
          <octahedronGeometry args={[0.04 + (i % 3) * 0.015]} />
          <meshBasicMaterial color="#fff2d0" />
        </mesh>
      ))}
      <mesh position={[0, 0.13, 1]}>
        <cylinderGeometry args={[0.38, 0.38, 0.08, 24]} />
        <meshStandardMaterial color="#fff0dc" />
      </mesh>
      {[-0.17, 0.17].map((x) => (
        <mesh key={x} position={[x, 0.25, 1]} scale={[0.12, 0.14, 0.12]}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color="#e894ab" />
        </mesh>
      ))}
      <OrbitControls
        target={[0, 0.8, 0]}
        enablePan={false}
        minDistance={4}
        maxDistance={9}
        minPolarAngle={0.6}
        maxPolarAngle={1.4}
        autoRotate={!paused && !reduced}
        autoRotateSpeed={0.3}
      />
    </>
  );
}
export default function MoonPicnic() {
  const a = useGameStore((s) => s.adventure),
    close = useGameStore((s) => s.closePanel),
    finish = useGameStore((s) => s.finishEnding),
    reduced = useReducedMotion(),
    [paused, setPaused] = useState(false),
    [line, setLine] = useState(0),
    camera = useMemo(
      () => ({ position: [3, 2.5, 6] as [number, number, number], fov: 40 }),
      [],
    );
  return (
    <Dialog
      title="A picnic beneath the moon"
      onClose={close}
      className="ending-dialog"
    >
      <span className="eyebrow">A QUIET ENDING, JUST FOR NANCY</span>
      <h2>A picnic beneath the moon</h2>
      {endingUnlocked(a) ? (
        <>
          <div className="ending-preview">
            <Canvas
              camera={camera}
              dpr={[1, 1.5]}
              onCreated={({ gl }) => {
                gl.toneMapping = ACESFilmicToneMapping;
                gl.toneMappingExposure = 1.1;
                gl.domElement.setAttribute(
                  "aria-label",
                  "Kitty, Momo, Pip and the cloud guardian at a moonlit picnic.",
                );
              }}
            >
              <Suspense fallback={null}>
                <PicnicScene
                  paused={paused}
                  onLine={setLine}
                  reduced={reduced}
                />
              </Suspense>
            </Canvas>
          </div>
          <p className="ending-line" role="status">
            {LINES[line]}
          </p>
          <div className="memory-actions">
            {!reduced && (
              <button aria-pressed={paused} onClick={() => setPaused(!paused)}>
                {paused ? "Let the moment continue" : "Pause this moment"}
              </button>
            )}
            <button className="primary" onClick={finish}>
              Keep this memory ♡
            </button>
          </div>
        </>
      ) : (
        <>
          <p>
            Restore the moonflower, help Pip in Butterfly Glade, and find the
            sealed envelope. Your friends will gather here when the story is
            ready.
          </p>
          <button onClick={() => useGameStore.getState().startGlade()}>
            Visit Butterfly Glade
          </button>
        </>
      )}
    </Dialog>
  );
}
