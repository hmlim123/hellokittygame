import { useEffect } from "react";
import { ThumbControl } from "./ThumbControl";
import {
  useHomeMotion,
  nearbyHomeAction,
  arriveHomeAction,
} from "../game/home-motion";
import { useGameStore } from "../game/store";
export function HomeControls() {
  const m = useHomeMotion(),
    ready = useGameStore((s) => s.sceneReady),
    blocked = useGameStore(
      (s) =>
        !!s.panel ||
        !!s.dialogue ||
        s.viewOnly ||
        !!s.mission ||
        !!s.arrival ||
        s.petMode,
    );
  useEffect(() => {
    const keys = new Set<string>(),
      dirs: Record<string, [number, number]> = {
        arrowup: [0, -1],
        w: [0, -1],
        arrowdown: [0, 1],
        s: [0, 1],
        arrowleft: [-1, 0],
        a: [-1, 0],
        arrowright: [1, 0],
        d: [1, 0],
      };
    const available = () => {
      const s = useGameStore.getState(),
        m = useHomeMotion.getState();
      return (
        s.mode === "room" &&
        s.sceneReady &&
        !s.panel &&
        !s.dialogue &&
        !s.viewOnly &&
        !s.mission &&
        !s.arrival &&
        !s.petMode &&
        m.phase === "idle" &&
        m.camera === "follow"
      );
    };
    const clear = () => {
      keys.clear();
      useHomeMotion.getState().stop();
    };
    const update = () => {
      let x = 0,
        z = 0;
      for (const k of keys) {
        x += dirs[k][0];
        z += dirs[k][1];
      }
      useHomeMotion.getState().setInput(x, z);
    };
    const down = (e: KeyboardEvent) => {
      if (
        !available() ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        (e.target instanceof HTMLElement &&
          ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName))
      )
        return;
      const k = e.key.toLowerCase();
      if (dirs[k]) {
        e.preventDefault();
        keys.add(k);
        update();
      } else if (k === "e" && !e.repeat) {
        const near = nearbyHomeAction(useHomeMotion.getState().position);
        if (near) arriveHomeAction(near.id);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (keys.delete(e.key.toLowerCase())) {
        e.preventDefault();
        update();
      }
    };
    const hidden = () => {
      if (document.hidden) clear();
    };
    const off = useGameStore.subscribe((s, previous) => {
      const motion = useHomeMotion.getState();
      if (s.petMode && !previous.petMode) {
        motion.setCamera("follow");
        useHomeMotion.setState({ yaw: 0 });
        if (motion.phase !== "idle") {
          useGameStore.setState({ petMode: false });
          motion.stand({ type: "pet" });
        }
      }
      if (
        s.gesture.id !== previous.gesture.id &&
        motion.phase !== "idle" &&
        !(motion.afterStand?.type === "pet" && s.gesture.kind === "pet")
      )
        motion.stand({ type: "gesture", kind: s.gesture.kind });
      if (!available()) clear();
    });
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    addEventListener("blur", clear);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      off();
      clear();
      removeEventListener("keydown", down);
      removeEventListener("keyup", up);
      removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  if (blocked || !ready) return null;
  const near = nearbyHomeAction(m.position),
    moving = m.path.length > 0,
    transition = !["idle", "seated"].includes(m.phase);
  return (
    <div
      className="home-hud"
      data-home-phase={m.phase}
      aria-label="Explore Kitty’s home"
    >
      {m.camera === "follow" && m.phase === "idle" && (
        <div className="home-steer">
          <ThumbControl mode="room" />
          <span>Hold to walk</span>
        </div>
      )}
      <div className="home-context">
        {m.camera === "overview" ? (
          <button className="primary" onClick={() => m.setCamera("follow")}>
            Back to Kitty ♡
          </button>
        ) : m.phase !== "idle" ? (
          <>
            <button
              className="primary"
              disabled={transition}
              onClick={() => m.tea()}
            >
              {transition
                ? "A little moment…"
                : m.heldCup
                  ? "Take a little sip ☕"
                  : "Pick up the teacup ☕"}
            </button>
            <button disabled={transition} onClick={() => m.stand()}>
              {m.heldCup ? "Put back & stand up" : "Stand up ♡"}
            </button>
          </>
        ) : (
          <button
            className="primary"
            onClick={() => {
              if (moving) m.stop();
              else if (near) arriveHomeAction(near.id);
              else m.visit("seat");
            }}
          >
            {moving ? "Stop here" : (near?.label ?? "A little tea ☕")}
          </button>
        )}
      </div>
      {m.message && (
        <p className="home-feedback" role="status">
          {m.message}
        </p>
      )}
    </div>
  );
}
export function HomeCameraSwitch() {
  const camera = useHomeMotion((s) => s.camera);
  return (
    <button
      aria-pressed={camera === "overview"}
      onClick={() =>
        useHomeMotion
          .getState()
          .setCamera(camera === "follow" ? "overview" : "follow")
      }
    >
      {camera === "follow" ? "Whole house ⌂" : "Follow Kitty ♡"}
    </button>
  );
}
