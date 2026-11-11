import { useHomeMotion } from "../game/home-motion";
import { SceneHtml as Html } from "./SceneHtml";
import { studioAnchor } from "./studio-layout";
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
/** Keep the visible exit available beside the actual Blender-authored threshold. */
export function HomeDetails() {
  const interactive = useHomeFurniture(),
    camera = useHomeMotion((s) => s.camera),
    p = useHomeMotion((s) => s.position),
    door = studioAnchor("door");
  const near =
    camera === "overview" || Math.hypot(p.x - door[0], p.z - door[2]) < 1.5;
  return interactive && near ? (
    <Html center position={studioAnchor("door_label")} zIndexRange={[3, 0]}>
      <button
        className="home-door-label"
        aria-label="Go out to the village"
        onClick={() => useHomeMotion.getState().visit("exit")}
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
  ) : null;
}
