import { useEffect, useRef, useState } from "react";
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
    goal = villageGoal(progress);
  return (
    <div className="village-guide">
      <p>{goal.text}</p>
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
function ThumbControl() {
  const root = useRef<HTMLDivElement>(null),
    active = useRef<number | null>(null),
    [thumb, setThumb] = useState({ x: 0, z: 0 });
  const ready = useGameStore((s) => s.sceneReady);
  const cancel = () => {
    const id = active.current;
    active.current = null;
    if (id !== null && root.current?.hasPointerCapture(id))
      root.current.releasePointerCapture(id);
    setThumb({ x: 0, z: 0 });
    useVillageMotion.getState().setInput(0, 0);
  };
  useEffect(() => {
    const hide = () => {
      if (document.hidden) cancel();
    };
    const unsubscribe = useGameStore.subscribe((s) => {
      if (
        s.mode !== "village" ||
        s.panel ||
        s.dialogue ||
        s.viewOnly ||
        !s.sceneReady
      )
        cancel();
    });
    const offMotion = useVillageMotion.subscribe((s, previous) => {
      if (s.picnic && !previous.picnic) cancel();
    });
    addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", hide);
    return () => {
      unsubscribe();
      offMotion();
      cancel();
      removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  const update = (x: number, y: number) => {
    if (!root.current) return;
    const r = root.current.getBoundingClientRect(),
      dx = (x - r.left - r.width / 2) / (r.width * 0.32),
      dz = (y - r.top - r.height / 2) / (r.height * 0.32),
      length = Math.hypot(dx, dz),
      v =
        length < 0.13
          ? { x: 0, z: 0 }
          : { x: dx / Math.max(1, length), z: dz / Math.max(1, length) };
    setThumb(v);
    useVillageMotion.getState().setInput(v.x, v.z);
  };
  return (
    <div
      className="village-thumb"
      ref={root}
      role="group"
      aria-label="Thumb control for walking"
      aria-disabled={!ready}
      onPointerDown={(e) => {
        if (!ready || e.button !== 0 || active.current !== null) return;
        e.preventDefault();
        active.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (active.current === e.pointerId) update(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (active.current === e.pointerId) cancel();
      }}
      onPointerCancel={cancel}
      onLostPointerCapture={() => {
        if (active.current !== null) cancel();
      }}
    >
      <span className="thumb-directions" aria-hidden="true">
        ✧
      </span>
      <span
        className="thumb-handle"
        style={{ transform: `translate(${thumb.x * 30}px,${thumb.z * 30}px)` }}
        aria-hidden="true"
      >
        ♡
      </span>
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
    v = useGameStore((s) => s.cozy.village),
    goal = villageGoal(v),
    next = VILLAGE_ACTIONS.find((o) => o.id === (goal.action || "cafe"));
  return (
    <>
      <div className="village-controls">
        <div className="village-steer">
          <ThumbControl />
          <span>Hold to walk</span>
        </div>
        <div className="village-actions">
          <button
            className="primary village-context"
            disabled={!ready || picnic}
            onClick={() => {
              if (near) actInVillage();
              else if (next) useVillageMotion.getState().walkTo(next, next.id);
            }}
            aria-keyshortcuts="E"
          >
            {near
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
