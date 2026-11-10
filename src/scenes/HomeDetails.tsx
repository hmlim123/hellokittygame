import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { SceneHtml as Html } from "./SceneHtml";
import { GroundShadow } from "./GroundShadow";
import { Toy } from "./GameToys";
import { HOME_DOOR } from "./home-layout";
import { heartMesh } from "../../dist/models.js";
import { useGameStore } from "../game/store";

export function useHomeFurniture() {
  return useGameStore(
    (s) =>
      s.sceneReady &&
      !s.viewOnly &&
      !s.mission &&
      !s.arrival &&
      !s.petMode &&
      !s.panel &&
      !s.dialogue,
  );
}
/** A visible threshold and a compact baking corner give the cutaway a lived-in layout. */
export function HomeDetails() {
  const interactive = useHomeFurniture();
  const heart = useMemo(() => heartMesh("#b96087", 0.14), []);
  const leave = () => {
    if (interactive) useGameStore.getState().enterVillage();
  };
  return (
    <>
      <group position={[0, -0.67, 0.1]}>
        <GroundShadow size={[13, 11]} />
      </group>
      <RoundedBox
        args={[10, 0.25, 8.5]}
        radius={0.28}
        smoothness={3}
        position={[0, -0.43, 0]}
      >
        <meshStandardMaterial color="#dce3cd" roughness={1} />
      </RoundedBox>
      <RoundedBox
        args={[1.9, 0.22, 0.6]}
        radius={0.08}
        position={[1.65, -0.09, 4.12]}
      >
        <meshStandardMaterial color="#e7d4be" roughness={1} />
      </RoundedBox>
      <RoundedBox
        args={[2.1, 0.18, 0.55]}
        radius={0.08}
        position={[1.65, -0.3, 4.57]}
      >
        <meshStandardMaterial color="#f1e2d0" roughness={1} />
      </RoundedBox>
      <group
        position={[...HOME_DOOR]}
        onClick={(e) => {
          if (e.delta < 7) {
            e.stopPropagation();
            leave();
          }
        }}
      >
        <RoundedBox args={[1.6, 0.035, 0.7]} radius={0.12} smoothness={3}>
          <meshStandardMaterial color="#d9a7b7" roughness={1} />
        </RoundedBox>
        <RoundedBox
          args={[1.4, 0.012, 0.5]}
          radius={0.09}
          position={[0, 0.025, 0]}
        >
          <meshStandardMaterial color="#f9eadc" roughness={1} />
        </RoundedBox>
        <primitive
          object={heart}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.044, 0]}
        />
        {interactive && (
          <Html center position={[0, 0.25, 0.8]} zIndexRange={[3, 0]}>
            <button
              className="home-door-label"
              aria-label="Go out to the village"
              onClick={leave}
            >
              Village{" "}
              <svg
                aria-hidden="true"
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path d="M3 13 13 3M4 3h9v9" />
              </svg>
            </button>
          </Html>
        )}
      </group>
      <group
        position={[-3.2, 0, 0.25]}
        onClick={(e) => {
          if (interactive && e.delta < 7) {
            e.stopPropagation();
            useGameStore.getState().openPanel("baking");
          }
        }}
      >
        <RoundedBox
          args={[1.45, 1.15, 0.1]}
          radius={0.06}
          position={[0, 1.25, -0.7]}
        >
          <meshStandardMaterial color="#f6e8d4" roughness={1} />
        </RoundedBox>
        <RoundedBox
          args={[1.6, 0.12, 0.55]}
          radius={0.045}
          position={[0, 1.77, -0.48]}
        >
          <meshStandardMaterial color="#d3ae8e" roughness={1} />
        </RoundedBox>
        <Toy name="Bowl" scale={0.48} position={[-0.35, 1.87, -0.48]} />
        <Toy name="Cup" scale={0.48} position={[0.34, 1.86, -0.48]} />
        <RoundedBox
          args={[0.5, 0.9, 0.72]}
          radius={0.07}
          position={[-0.85, 0.57, 0]}
        >
          <meshStandardMaterial color="#f4dfda" roughness={1} />
        </RoundedBox>
        <RoundedBox
          args={[0.58, 0.09, 0.8]}
          radius={0.04}
          position={[-0.85, 1.06, 0]}
        >
          <meshStandardMaterial color="#ddbd9d" roughness={1} />
        </RoundedBox>
      </group>
    </>
  );
}
