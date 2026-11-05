import { Component, Suspense, useEffect, useMemo, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping } from "three";
import { Kitty } from "./Kitty";
import { CozyLights, COZY_EXPOSURE } from "./CozyLights";
import { makeBow, heartMesh } from "../../dist/models.js";
import { makeGift } from "../../dist/gifts.js";
import { assetUrl } from "../game/assets";
import type { FriendTale, TaleProgress } from "../game/friend-tales";
import type { Gesture } from "../game/types";
import { useGameStore } from "../game/store";
class PreviewBoundary extends Component<
  { image: string; children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <img className="tale-fallback" alt="" src={this.props.image} />
    ) : (
      this.props.children
    );
  }
}
function Token({
  kind,
  color,
  lit,
}: {
  kind: string;
  color: string;
  lit: boolean;
}) {
  const object = useMemo(
    () =>
      kind === "bow"
        ? makeBow(color, 0.6)
        : kind === "teddy"
          ? makeGift("teddy")
          : kind === "heart"
            ? heartMesh(color, 0.22)
            : null,
    [kind, color],
  );
  useEffect(
    () => () => {
      if (object)
        object.traverse((o) => {
          if ("material" in o) {
            const m = o.material as
              | import("three").Material
              | import("three").Material[];
            (Array.isArray(m) ? m : [m]).forEach((mat) => mat.dispose());
          }
          if (kind === "heart" && "geometry" in o)
            (o.geometry as import("three").BufferGeometry).dispose();
        });
    },
    [object, kind],
  );
  if (kind === "moon")
    return (
      <mesh rotation={[0, 0, -0.5]}>
        <torusGeometry args={[0.18, 0.065, 10, 30, Math.PI * 1.5]} />
        <meshStandardMaterial color="#e4c875" />
      </mesh>
    );
  if (kind === "cloud" || kind === "blanket")
    return (
      <group>
        {[-1, 0, 1].map((i) => (
          <mesh
            key={i}
            position={[i * 0.13, i === 0 ? 0.05 : 0, 0]}
            scale={kind === "blanket" ? [0.18, 0.08, 0.12] : [0.15, 0.12, 0.11]}
          >
            <sphereGeometry args={[1, 16, 10]} />
            <meshStandardMaterial
              color={kind === "blanket" ? "#d6c8e5" : "#fff7ef"}
            />
          </mesh>
        ))}
      </group>
    );
  if (kind === "leaf")
    return (
      <mesh rotation={[0, 0, -0.4]} scale={[0.12, 0.25, 0.07]}>
        <sphereGeometry args={[1, 16, 10]} />
        <meshStandardMaterial color="#87a782" />
      </mesh>
    );
  if (kind === "water")
    return (
      <mesh>
        <sphereGeometry args={[0.14, 16, 12]} />
        <meshStandardMaterial color="#9dc7dd" roughness={0.35} />
      </mesh>
    );
  if (kind === "plate")
    return (
      <mesh rotation={[0.3, 0, 0]}>
        <cylinderGeometry args={[0.23, 0.22, 0.035, 24]} />
        <meshStandardMaterial color="#fff5e8" />
      </mesh>
    );
  if (kind === "invitation")
    return (
      <group>
        <mesh>
          <boxGeometry args={[0.42, 0.28, 0.025]} />
          <meshStandardMaterial color="#fff5e8" />
        </mesh>
        <mesh position={[0, 0, 0.02]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.1, 0.1, 0.015]} />
          <meshStandardMaterial color="#d79bb6" />
        </mesh>
      </group>
    );
  if (kind === "star")
    return (
      <group rotation={[0, 0, 0.1]}>
        <mesh>
          <sphereGeometry args={[0.2, 16, 12]} />
          <meshStandardMaterial
            color={lit ? "#fff7c8" : color}
            emissive={lit ? "#dec674" : "#000000"}
            emissiveIntensity={0.2}
          />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            position={[
              Math.sin(i * Math.PI * 0.4) * 0.22,
              Math.cos(i * Math.PI * 0.4) * 0.22,
              0,
            ]}
            rotation={[0, 0, -i * Math.PI * 0.4]}
          >
            <coneGeometry args={[0.12, 0.27, 3]} />
            <meshStandardMaterial color={lit ? "#fff7c8" : color} />
          </mesh>
        ))}
      </group>
    );
  if (kind === "flower")
    return (
      <group>
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.42, 8]} />
          <meshStandardMaterial color="#86a77d" />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            position={[
              Math.sin(i * Math.PI * 0.4) * 0.17,
              0.38 + Math.cos(i * Math.PI * 0.4) * 0.17,
              0,
            ]}
            scale={[0.12, 0.17, 0.09]}
          >
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color={lit ? "#f2a8c3" : color} />
          </mesh>
        ))}
        <mesh position={[0, 0.38, -0.01]}>
          <sphereGeometry args={[0.1, 12, 8]} />
          <meshStandardMaterial color="#eac570" />
        </mesh>
      </group>
    );
  if (kind === "cup")
    return (
      <group>
        <mesh>
          <cylinderGeometry args={[0.17, 0.13, 0.23, 20]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0.17, 0, 0]}>
          <torusGeometry args={[0.08, 0.025, 8, 16]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>
    );
  return object ? (
    <primitive
      object={object}
      scale={kind === "teddy" ? 0.5 : lit ? 1.15 : 1}
      dispose={null}
    />
  ) : null;
}
const tokenKind = (token: string, fallback: string) =>
  token.includes("loop") ||
  token.includes("knot") ||
  token.includes("ribbon") ||
  token === "bow"
    ? "bow"
    : token.includes("star") ||
        token.includes("light") ||
        token.includes("lantern") ||
        token.includes("paper") ||
        token === "sun" ||
        token === "sunshine"
      ? "star"
      : token.includes("flower") || token.includes("bud") || token === "seed"
        ? "flower"
        : [
              "moon",
              "heart",
              "cloud",
              "leaf",
              "water",
              "teddy",
              "blanket",
              "cup",
              "plate",
              "invitation",
            ].includes(token)
          ? token
          : fallback;
export default function FriendTaleScene({
  tale,
  progress,
  onAction,
}: {
  tale: FriendTale;
  progress: TaleProgress;
  onAction(token: string): void;
}) {
  const gesture = useGameStore((s) => s.gesture),
    step = tale.steps[progress.step],
    performance = useMemo(
      () => ({ id: gesture.id, kind: gesture.kind as Gesture }),
      [gesture],
    );
  return (
    <PreviewBoundary
      key={tale.id}
      image={assetUrl("assets/plush/" + tale.id + ".png")}
    >
      <Canvas
        dpr={[1, 1.25]}
        camera={{ position: [0, 1.6, 6.7], fov: 35 }}
        gl={{ antialias: true }}
        onCreated={({ gl, camera }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = COZY_EXPOSURE;
          camera.lookAt(0, 1.25, 0);
        }}
      >
        <color attach="background" args={[tale.color]} />
        <CozyLights />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]}>
          <circleGeometry args={[2.8, 48]} />
          <meshStandardMaterial color="#fff7ef" />
        </mesh>
        {tale.id === "cloud" && (
          <group>
            <mesh
              position={[-1.3, 0.04, 1.26]}
              rotation={[0, 0.3, 0]}
              scale={[0.38, 0.045, 0.18]}
            >
              <sphereGeometry args={[1, 16, 10]} />
              <meshStandardMaterial color="#a4bb98" />
            </mesh>
            <mesh position={[0, 0.045, 1.2]} scale={[0.34, 0.07, 0.2]}>
              <sphereGeometry args={[1, 16, 10]} />
              <meshStandardMaterial color="#d8ced0" />
            </mesh>
            <group position={[1.25, 0.11, 1.1]}>
              <mesh>
                <cylinderGeometry args={[0.26, 0.21, 0.2, 20]} />
                <meshStandardMaterial color="#d5b596" />
              </mesh>
              <mesh position={[0, 0.13, 0]}>
                <torusGeometry args={[0.22, 0.025, 8, 20, Math.PI]} />
                <meshStandardMaterial color="#c6a17c" />
              </mesh>
            </group>
          </group>
        )}
        {tale.id === "bunny" && (
          <mesh position={[0, 0.015, 0.95]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[3.1, 1.15]} />
            <meshStandardMaterial color="#efd5dc" />
          </mesh>
        )}
        <Suspense fallback={null}>
          <Kitty
            equipment={{
              version: 1,
              outfit: "classic",
              item: "none",
              plush: tale.id,
            }}
            animate
            performance={performance}
          />
        </Suspense>
        {step?.tokens.map((token, i) => (
          <group
            key={progress.step + "-" + token}
            position={[-1.25 + i * 1.25, 0.36, 1.05]}
            scale={
              progress.found.includes(token)
                ? step.prop === "flower"
                  ? 1.15
                  : 0.65
                : 1
            }
            onClick={(e) => {
              if (e.delta < 7 && !progress.found.includes(token)) {
                e.stopPropagation();
                onAction(token);
              }
            }}
          >
            <mesh>
              <sphereGeometry args={[0.42, 12, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <Token
              kind={tokenKind(token, step.prop)}
              color={
                (tale.id === "cloud"
                  ? ["#df9db7", "#e5afc0", "#d98eab"]
                  : tale.id === "kitten" && progress.step === 0
                    ? ["#9ebd98", "#acc6a4", "#94b58b"]
                    : ["#df9db7", "#bca7da", "#d4b969"])[i]
              }
              lit={progress.found.includes(token)}
            />
          </group>
        ))}
      </Canvas>
    </PreviewBoundary>
  );
}
