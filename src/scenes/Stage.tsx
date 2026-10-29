import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { useProgress } from "@react-three/drei";
import { ACESFilmicToneMapping } from "three";
import { useGameStore } from "../game/store";
import { RoomScene } from "./RoomScene";
import { AdventureScene } from "./AdventureScene";
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
function Ready({
  mode,
  revision,
}: {
  mode: "room" | "adventure";
  revision: number;
}) {
  const set = useGameStore((s) => s.setSceneReady);
  useEffect(() => {
    set(true);
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
  const mode = useGameStore((s) => s.mode),
    ready = useGameStore((s) => s.sceneReady),
    [error, setError] = useState(false);
  useEffect(() => setError(false), [mode, revision]);
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
      <SceneBoundary key={`${mode}-${revision}`} onError={() => setError(true)}>
        <Canvas
          key={`${mode}-${revision}`}
          shadows={false}
          dpr={[1, 1.5]}
          orthographic={mode === "adventure"}
          camera={camera}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
          }}
          onCreated={({ gl }) => {
            gl.toneMapping = ACESFilmicToneMapping;
            gl.toneMappingExposure = mode === "room" ? 1.18 : 1.1;
            gl.domElement.setAttribute(
              "aria-label",
              mode === "room"
                ? "Interactive 3D Kitty room. Drag to rotate 360 degrees; arrow keys rotate the focused view."
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
            <Physics gravity={[0, 0, 0]} timeStep={1 / 60} interpolate>
              {mode === "room" ? <RoomScene /> : <AdventureScene />}
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
          <a href={assetUrl("classic/")}>Open classic version</a>
        </div>
      )}
    </div>
  );
}
