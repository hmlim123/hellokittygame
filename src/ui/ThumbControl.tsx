import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../game/store";
import { thumbStepTarget } from "../game/thumb-input";
import { homeRender, useHomeMotion } from "../game/home-motion";
import { villageRender, useVillageMotion } from "../game/village-motion";
/** A captured thumb gesture has one owner and always releases on interruption. */
export function ThumbControl({ mode }: { mode: "room" | "village" }) {
  const root = useRef<HTMLDivElement>(null),
    active = useRef<number | null>(null),
    gesture = useRef({ x: 0, z: 0, at: 0 }),
    lastVector = useRef({ x: 0, z: 0 }),
    [thumb, setThumb] = useState({ x: 0, z: 0 }),
    ready = useGameStore((s) => s.sceneReady);
  const store = mode === "room" ? useHomeMotion : useVillageMotion;
  const rendered = mode === "room" ? homeRender : villageRender;
  const available = () => {
    const s = useGameStore.getState();
    return (
      s.mode === mode &&
      s.sceneReady &&
      !s.panel &&
      !s.dialogue &&
      !s.viewOnly &&
      !s.mission &&
      !s.arrival &&
      !s.petMode &&
      (mode === "room"
        ? useHomeMotion.getState().phase === "idle" &&
          useHomeMotion.getState().camera === "follow"
        : !useVillageMotion.getState().picnic)
    );
  };
  const cancel = () => {
    const id = active.current;
    active.current = null;
    if (id !== null && root.current?.hasPointerCapture(id))
      root.current.releasePointerCapture(id);
    setThumb({ x: 0, z: 0 });
    store.getState().setInput(0, 0);
  };
  useEffect(() => {
    const hide = () => {
      if (document.hidden) cancel();
    };
    const unsub = useGameStore.subscribe(() => {
      if (!available()) cancel();
    });
    const motionOff =
      mode === "room"
        ? useHomeMotion.subscribe((s, p) => {
            if (s.phase !== p.phase || s.camera !== p.camera) cancel();
          })
        : useVillageMotion.subscribe((s, p) => {
            if (s.picnic !== p.picnic) cancel();
          });
    addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", hide);
    return () => {
      unsub();
      motionOff();
      cancel();
      removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [mode]);
  const update = (x: number, y: number) => {
    if (!root.current) return;
    const r = root.current.getBoundingClientRect(),
      dx = (x - r.left - r.width / 2) / (r.width * 0.32),
      dz = (y - r.top - r.height / 2) / (r.height * 0.32),
      n = Math.hypot(dx, dz),
      v =
        n < 0.13
          ? { x: 0, z: 0 }
          : { x: dx / Math.max(1, n), z: dz / Math.max(1, n) };
    lastVector.current = v;
    setThumb(v);
    store.getState().setInput(v.x, v.z);
  };
  return (
    <div
      className="village-thumb"
      ref={root}
      role="group"
      aria-label={
        mode === "room"
          ? "Thumb control for walking at home"
          : "Thumb control for walking"
      }
      aria-disabled={!ready}
      onPointerDown={(e) => {
        if (!available() || e.button !== 0 || active.current !== null) return;
        e.preventDefault();
        e.stopPropagation();
        const p = rendered;
        gesture.current = { ...p, at: performance.now() };
        active.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (active.current === e.pointerId) update(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (active.current !== e.pointerId) return;
        const motion = store.getState(),
          target = available()
            ? thumbStepTarget(
                gesture.current,
                rendered,
                lastVector.current,
                performance.now() - gesture.current.at,
              )
            : null;
        cancel();
        // A short flick must survive even if it fits between two render frames.
        // Cancellation/blur never queues a step.
        if (target) motion.walkTo(target);
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
