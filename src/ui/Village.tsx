import { ThumbControl } from "./ThumbControl";
import { useGameStore } from "../game/store";
import {
  actInVillage,
  nearbyVillageAction,
  useVillageInput,
  useVillageMotion,
} from "../game/village-motion";
import {
  VILLAGE_ACTIONS,
  VILLAGE_PLACES,
  villageGoal,
  villageKeepsakes,
  VILLAGE_KEEPSAKES,
  type VillageSpot,
} from "../game/village";
import { Dialog } from "./Dialog";
import { SharedPicnic } from "./Visits";

export function VillageGuide() {
  const progress = useGameStore((s) => s.cozy.village),
    goal = villageGoal(progress),
    packed = useGameStore((s) => !!s.cozy.cookie.packed);
  return (
    <div className="village-guide">
      <p>
        {packed
          ? "Your cookie is ready. Bring it to Momo or Pip. ♡"
          : goal.text}
      </p>
      <details>
        <summary>A gentle hint</summary>
        <p>
          Tap open ground to walk there, tap a friend to visit, or use the thumb
          control below. Your home has a pink roof on the left; the café has a
          striped awning on the right.
        </p>
        {goal.action && (
          <button
            onClick={() => {
              const o = VILLAGE_ACTIONS.find((o) => o.id === goal.action);
              if (o) useVillageMotion.getState().walkTo(o, goal.action!);
            }}
          >
            Walk there ♡
          </button>
        )}
      </details>
    </div>
  );
}
export function VillageControls() {
  useVillageInput();
  const closePicnic = () => {
    useVillageMotion.setState({ picnic: false });
    useGameStore.getState().react("softHappy");
  };
  const p = useVillageMotion((s) => s.position),
    near = nearbyVillageAction(p),
    ready = useGameStore((s) => s.sceneReady),
    open = useGameStore((s) => s.openPanel),
    picnic = useVillageMotion((s) => s.picnic),
    packed = useGameStore((s) => !!s.cozy.cookie.packed),
    v = useGameStore((s) => s.cozy.village),
    goal = villageGoal(v),
    next = VILLAGE_ACTIONS.find((o) => o.id === (goal.action || "cafe")),
    deliver = packed && near?.id !== "momo" && near?.id !== "pip";
  return (
    <>
      <div className="village-controls">
        <div className="village-steer">
          <ThumbControl mode="village" />
          <span>Hold to walk</span>
        </div>
        <div className="village-actions">
          <button
            className="primary village-context"
            disabled={!ready || picnic}
            onClick={() => {
              if (deliver) {
                const friend = VILLAGE_ACTIONS.find((o) => o.id === "momo")!;
                useVillageMotion.getState().walkTo(friend, "momo");
              } else if (near) actInVillage();
              else if (next) useVillageMotion.getState().walkTo(next, next.id);
            }}
            aria-keyshortcuts="E"
          >
            {deliver
              ? "Bring your cookie to Momo"
              : near
                ? near.label
                : next?.id === "momo"
                  ? "Walk to Momo"
                  : next?.id === "pip"
                    ? "Walk to Pip"
                    : next?.id === "home"
                      ? "Walk home"
                      : "Walk to the café"}{" "}
            <span aria-hidden="true">♡</span>
          </button>
          <div className="village-small-actions">
            <button disabled={!ready} onClick={() => open("village")}>
              Places & memories
            </button>
            <button disabled={!ready} onClick={() => open("visits")}>
              Private visits ♡
            </button>
          </div>
        </div>
      </div>
      <p className="village-input-note">
        Tap a place to walk there · Arrow keys / WASD also work
      </p>
      {picnic && (
        <Dialog title="A picnic in the village" onClose={closePicnic}>
          <span className="eyebrow">A LITTLE TIME TOGETHER</span>
          <h2>A seat in the sunshine.</h2>
          <p>
            Tea tastes sweeter with a little breeze and a friend nearby. Stay as
            long as you like.
          </p>
          <SharedPicnic />
          <button className="primary wide" onClick={closePicnic}>
            Back to the village ♡
          </button>
        </Dialog>
      )}
    </>
  );
}
export function VillagePanel() {
  const v = useGameStore((s) => s.cozy.village),
    mode = useGameStore((s) => s.mode),
    close = useGameStore((s) => s.closePanel),
    keepsakes = villageKeepsakes(v);
  return (
    <Dialog title="Your village" onClose={close} className="village-dialog">
      <span className="eyebrow">SMALL PLACES. LOVELY MEMORIES.</span>
      <h2>Your little village.</h2>
      <div className="village-place-grid">
        {VILLAGE_PLACES.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              close();
              if (mode !== "village") {
                useGameStore.getState().enterVillage();
                return;
              }
              useVillageMotion
                .getState()
                .walkTo(
                  p,
                  p.id === "home" || p.id === "cafe" ? p.id : undefined,
                );
            }}
          >
            <span aria-hidden="true">{p.icon}</span>
            <strong>{p.name}</strong>
            <small>
              {mode === "village" ? "Walk here" : "Visit the village"}
            </small>
          </button>
        ))}
      </div>
      <h3>A home made by Nancy</h3>
      <p>
        Bring a little piece of the village home. Choose a neat spot for each
        keepsake.
      </p>
      {VILLAGE_KEEPSAKES.map((item) => {
        const owned = keepsakes.some((k) => k.id === item.id);
        return (
          <article
            className="village-memory"
            key={item.id}
            data-village-keepsake={item.id}
            data-owned={owned}
          >
            <span aria-hidden="true">{item.icon}</span>
            <div>
              <h3>{item.title}</h3>
              <p>
                {owned
                  ? item.memory
                  : item.id === "welcome"
                    ? "Say hello to Momo by the café."
                    : item.id === "flowers"
                      ? "Help Pip’s three flower beds bloom."
                      : "Bake a cookie and bring it to Momo yourself."}
              </p>
              {owned && (
                <div
                  className="village-placement"
                  role="group"
                  aria-label={"Place " + item.title}
                >
                  {(["window", "nook", "table"] as VillageSpot[]).map(
                    (spot) => (
                      <button
                        key={spot}
                        aria-pressed={v.placed[item.id] === spot}
                        onClick={() =>
                          useGameStore
                            .getState()
                            .placeVillageKeepsake(item.id, spot)
                        }
                      >
                        {spot === "window"
                          ? "Windowsill"
                          : spot === "nook"
                            ? "Reading nook"
                            : "Little table"}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          </article>
        );
      })}
      <button
        className="primary wide"
        onClick={() => {
          close();
          useGameStore.getState().setMode("room");
        }}
      >
        Go to Nancy’s room ♡
      </button>
      <details className="movement-options">
        <summary>Movement options</summary>
        <p>
          Tap the ground or a friend to walk there. The thumb control supports
          diagonal movement. You can also use arrow keys or WASD and press E for
          the nearby action.
        </p>
        {[
          ["North", 0, -1],
          ["South", 0, 1],
          ["West", -1, 0],
          ["East", 1, 0],
        ].map(([label, x, z]) => (
          <button
            key={String(label)}
            onClick={() => {
              close();
              const p = useVillageMotion.getState().position;
              useVillageMotion
                .getState()
                .walkTo({ x: p.x + Number(x), z: p.z + Number(z) });
            }}
          >
            Walk {label}
          </button>
        ))}
      </details>
    </Dialog>
  );
}
