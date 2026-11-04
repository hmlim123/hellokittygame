import { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping } from "three";
import { Kitty } from "./Kitty";
import { Toy, ToyFriend, type Holding } from "./GameToys";
import { CozyLights, COZY_EXPOSURE } from "./CozyLights";
import { CookieMesh } from "./CookieMesh";
import { useGameStore } from "../game/store";
import type { Gesture } from "../game/types";
export default function BakingPreview() {
  const cookie = useGameStore((s) => s.cozy.cookie),
    equipment = useGameStore((s) => s.equipment),
    [replay, setReplay] = useState(0);
  const kind: Gesture =
    cookie.stage === "shape"
      ? "stir"
      : cookie.stage === "decorate"
        ? "cut"
        : cookie.stage === "give"
          ? "present"
          : "bow";
  const holding: Holding =
    cookie.stage === "shape"
      ? "spoon"
      : cookie.stage === "decorate"
        ? "cutter"
        : "tray";
  const performance = useMemo(() => ({ id: replay, kind }), [kind, replay]);
  const caption =
    cookie.stage === "shape"
      ? "Kitty stirs a little love into the dough."
      : cookie.stage === "decorate"
        ? "Kitty presses your cutter. Time to add your little touches!"
        : cookie.stage === "give"
          ? "Kitty holds your decorated cookie, ready to share."
          : "A happy little bow. Thank you for baking together, Nancy!";
  return (
    <figure className="baking-performance">
      <div className="baking-preview" data-performance={kind}>
        <Canvas
          camera={{ position: [2, 1.7, 4.3], fov: 38 }}
          dpr={[1, 1.5]}
          onCreated={({ gl, camera }) => {
            gl.toneMapping = ACESFilmicToneMapping;
            gl.toneMappingExposure = COZY_EXPOSURE;
            gl.domElement.setAttribute("aria-label", caption);
            camera.lookAt(0, 1.05, 0.2);
          }}
        >
          <color attach="background" args={["#f3dce4"]} />
          <CozyLights />
          <Suspense fallback={null}>
            <Kitty
              animate
              equipment={{ ...equipment, item: "none" }}
              performance={performance}
              holding={holding}
              position={[-0.2, 0, -0.15]}
            />
            {(cookie.stage === "shape" || cookie.stage === "decorate") && (
              <group position={[0, 0, 0.6]}>
                {[-0.55, 0.55].map((x) => (
                  <mesh key={x} position={[x, 0.3, 0]}>
                    <boxGeometry args={[0.1, 0.6, 0.5]} />
                    <meshStandardMaterial color="#d5af99" />
                  </mesh>
                ))}
                <mesh position={[0, 0.62, 0]}>
                  <boxGeometry args={[1.4, 0.12, 0.7]} />
                  <meshStandardMaterial color="#fff0da" />
                </mesh>
                {cookie.stage === "shape" ? (
                  <Toy name="Bowl" position={[0.12, 0.6, 0]} scale={0.65} />
                ) : (
                  <group position={[0.12, 0.69, 0]} scale={1.1}>
                    <CookieMesh cookie={cookie} />
                  </group>
                )}
              </group>
            )}
            <Toy name="Oven" position={[-1.5, 0, -0.6]} scale={0.8} />
            {cookie.stage === "served" && cookie.friend !== "kitty" && (
              <ToyFriend
                name={cookie.friend === "pip" ? "Pip" : "Momo"}
                position={[1, 0, 0.15]}
                scale={0.8}
                greetOnMount
              />
            )}
          </Suspense>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]}>
            <circleGeometry args={[5, 32]} />
            <meshStandardMaterial color="#ead7ca" />
          </mesh>
        </Canvas>
      </div>
      <figcaption>{caption}</figcaption>
      <button className="small" onClick={() => setReplay((n) => n + 1)}>
        Watch Kitty again ♡
      </button>
    </figure>
  );
}
