import {
  atLanternPlaza,
  LANTERN_COLORS,
  LANTERN_PLAZA,
  type LanternColor,
} from "../../shared/lantern-evening.mjs";
import { useVisitsStore } from "../game/visits";
import { useVillageMotion } from "../game/village-motion";
import { useGameStore } from "../game/store";

const colors = Object.keys(LANTERN_COLORS) as LanternColor[];

export function LanternEvening() {
  const evening = useVisitsStore((s) => s.lanternEvening);
  const role = useVisitsStore((s) => s.role);
  const online = useVisitsStore((s) => s.status === "online");
  const sunset = useVisitsStore((s) => s.together?.weather === "sunset");
  const paired = useVisitsStore(
    (s) => s.players.filter((p) => p.connected && atLanternPlaza(p)).length === 2,
  );
  const destination = {
    x: LANTERN_PLAZA.x + (role === "guest" ? 0.55 : -0.55),
    z: LANTERN_PLAZA.z,
  };
  const closeToLanterns = useVillageMotion(({ position }) =>
    Math.hypot(position.x - destination.x, position.z - destination.z) < 0.7,
  );
  const ready = useGameStore((s) => s.sceneReady);
  if (!evening || !role) return null;
  const own = evening[role];
  const other = evening[role === "host" ? "guest" : "host"];
  const completed = own.lit && other.lit;
  const lanternAction = useVisitsStore.getState().lanternAction;

  return (
    <details>
      <summary>Lantern evening</summary>
      {completed ? (
        <>
          <p role="status">
            {sunset ? "Both lanterns are glowing at sunset." : "Both lanterns are glowing."}
          </p>
          {role === "host" && (
            <button disabled={!online} onClick={() => lanternAction("reset")}>
              Choose new lanterns
            </button>
          )}
        </>
      ) : (
        <>
          <p>Pick a color each, then meet at the plaza to light your lanterns.</p>
          <div className="lantern-colors" role="group" aria-label="Your lantern color">
            {colors.map((color) => (
              <button
                key={color}
                aria-pressed={own.color === color}
                disabled={!online || own.lit}
                onClick={() => lanternAction("choose", color)}
              >
                <span aria-hidden="true" style={{ background: LANTERN_COLORS[color].color }} />
                {LANTERN_COLORS[color].name}
              </button>
            ))}
          </div>
          {other.color && (
            <p role="status">
              {role === "host" ? "My Melody" : "Nancy"} chose {LANTERN_COLORS[other.color].name.toLowerCase()}.
            </p>
          )}
          {own.lit ? (
            <p role="status">Your lantern is lit.</p>
          ) : (
            <button
              disabled={!online || !paired || !own.color || !other.color}
              onClick={() => lanternAction("light")}
            >
              Light my lantern
            </button>
          )}
        </>
      )}
      {!closeToLanterns && (
        <button
          disabled={!online || !ready}
          onClick={() => useVillageMotion.getState().walkTo(destination)}
        >
          Walk to the lanterns
        </button>
      )}
    </details>
  );
}
