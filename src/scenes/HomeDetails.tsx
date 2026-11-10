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
  const interactive = useHomeFurniture();
  return interactive ? (
    <Html center position={studioAnchor("door_label")} zIndexRange={[3, 0]}>
      <button
        className="home-door-label"
        aria-label="Go out to the village"
        onClick={() => useGameStore.getState().enterVillage()}
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
