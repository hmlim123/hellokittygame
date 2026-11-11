import { COZY_EXPOSURE } from "./CozyLights";
import { AdaptiveQuality } from "./AdaptiveQuality";
import { PHYSICS_STEP } from "./tile-motor";
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { useProgress } from "@react-three/drei";
import { ACESFilmicToneMapping } from "three";
import { useGameStore } from "../game/store";
import { RoomScene } from "./RoomScene";
import { AdventureScene } from "./AdventureScene";
import { VillageScene } from "./VillageScene";
import type { Mode } from "../game/types";
import { assetUrl } from "./Kitty";
class SceneBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Kitty scene could not load", error, info);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function Ready({ mode, revision }: { mode: Mode; revision: number }) {
  const set = useGameStore((s) => s.setSceneReady);
  const frames = useRef(0);
  // Let the first scene draw compile/upload its materials before enabling input.
  useFrame(({ invalidate }) => {
    frames.current++;
    if (frames.current === 1) invalidate();
    if (frames.current === 2) set(true);
  });
  useEffect(() => {
    return () => {
      if (
        useGameStore.getState().mode === mode &&
        useGameStore.getState().worldRevision === revision
      )
        set(false);
    };
  }, [set, mode, revision]);
  return null;
}
function Loader() {
  const progress = useProgress((s) => s.progress);
  return (
    <div className="scene-loading" id="loading" role="status">
      <span className="loading-bow">🎀</span>
      <span>Getting your little world ready…</span>
      {progress > 0 && progress < 100 && <small>{Math.round(progress)}%</small>}
    </div>
  );
}
export function Stage() {
  const revision = useGameStore((s) => s.worldRevision);
  const plush = useGameStore((s) => s.equipment.plush);
  const previewOpen = useGameStore((s) =>
    ["inventory", "baking", "photo", "ending", "friend-tales"].includes(
      s.panel || "",
    ),
  );
  const mode = useGameStore((s) => s.mode),
    ready = useGameStore((s) => s.sceneReady),
    [error, setError] = useState(false);
  useEffect(() => setError(false), [mode, revision, plush]);
  const camera = useMemo(
    () => ({
      fov: 37,
      position: [2.1, 2.8, 6.5] as [number, number, number],
      near: 0.1,
      far: 80,
    }),
    [mode],
  );
  return (
    <div className={`stage ${mode}`} id={mode === "room" ? "stage" : "world"}>
      <SceneBoundary
        key={`${mode}-${revision}-${plush || "classic"}`}
        onError={() => setError(true)}
      >
        <Canvas
          key={`${mode}-${revision}-${plush || "classic"}`}
          shadows={false}
          frameloop={previewOpen ? "demand" : "always"}
          dpr={[1, 1.5]}
          orthographic
          camera={camera}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
          }}
          onCreated={({ gl }) => {
            gl.toneMapping = ACESFilmicToneMapping;
            gl.toneMappingExposure = COZY_EXPOSURE;
            gl.domElement.setAttribute(
              "aria-label",
              mode === "room"
                ? "Nancy’s home. Tap the floor or use the thumb control to walk. Pinch to look closer. Choose Whole house to rotate."
                : mode === "village"
                  ? "Nancy’s village. Tap to walk or use the thumb control. Press E for a nearby action."
                  : "Moonflower Adventure. Arrow keys or WASD to walk.",
            );
            gl.domElement.dataset.renderer = "react-three-fiber";
          }}
          fallback={
            <div className="scene-failure">
              This browser couldn’t start 3D.{" "}
              <a href={assetUrl("classic/")}>Open the classic version</a>
            </div>
          }
        >
          <Suspense fallback={null}>
            <AdaptiveQuality />
            <Physics
              paused={previewOpen}
              gravity={[0, 0, 0]}
              timeStep={PHYSICS_STEP}
              interpolate
              updatePriority={-1}
            >
              {mode === "room" ? (
                <RoomScene />
              ) : mode === "village" ? (
                <VillageScene />
              ) : (
                <AdventureScene />
              )}
              <Ready mode={mode} revision={revision} />
            </Physics>
          </Suspense>
        </Canvas>
      </SceneBoundary>
      {!ready && !error && <Loader />}
      {error && (
        <div className="scene-failure" role="alert">
          <h2>Kitty needs a moment.</h2>
          <p>
            The 3D world couldn’t load. Try refreshing, or open the classic
            version.
          </p>
          <button onClick={() => location.reload()}>Try again</button>
          {plush && (
            <button onClick={() => useGameStore.getState().setPlush("classic")}>
              Use original Kitty
            </button>
          )}
          <a href={assetUrl("classic/")}>Open classic version</a>
        </div>
      )}
    </div>
  );
}
