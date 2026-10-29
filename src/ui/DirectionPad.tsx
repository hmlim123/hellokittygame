import { useEffect, useRef } from "react";
import { useGameStore } from "../game/store";
import type { Direction } from "../game/types";

export function DirectionPad() {
  const root = useRef<HTMLDivElement>(null),
    pointer = useRef<{ id: number; dir: Direction | null } | null>(null),
    ready = useGameStore((s) => s.sceneReady),
    held = useGameStore((s) => s.heldDirection);

  function cancel() {
    const active = pointer.current;
    pointer.current = null;
    if (active && root.current?.hasPointerCapture(active.id))
      root.current.releasePointerCapture(active.id);
    useGameStore.getState().releaseMove();
  }

  useEffect(() => {
    const hidden = () => {
      if (document.hidden) cancel();
    };
    const available = (s: ReturnType<typeof useGameStore.getState>) =>
      s.mode === "adventure" && s.sceneReady && !s.panel && !s.dialogue;
    const unsubscribe = useGameStore.subscribe((s, previous) => {
      if (available(previous) && !available(s)) cancel();
    });
    addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      unsubscribe();
      removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", hidden);
      cancel();
    };
  }, []);

  return (
    <div
      ref={root}
      className="dpad"
      role="group"
      aria-label="Move Kitty"
      onPointerMove={(e) => {
        const active = pointer.current;
        if (!active || active.id !== e.pointerId) return;
        const button = document.elementFromPoint(e.clientX, e.clientY)
          ?.closest<HTMLButtonElement>("button[data-direction]");
        if (button && e.currentTarget.contains(button)) {
          const dir = button.dataset.direction as Direction;
          if (dir !== active.dir) {
            active.dir = dir;
            useGameStore.getState().holdMove(dir);
          }
        } else {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left || e.clientX > r.right ||
            e.clientY < r.top || e.clientY > r.bottom
          ) {
            active.dir = null;
            useGameStore.getState().releaseMove();
          }
        }
      }}
      onPointerUp={(e) => {
        if (pointer.current?.id !== e.pointerId) return;
        useGameStore.getState().releaseMove(pointer.current.dir || undefined);
        pointer.current = null;
      }}
      onPointerCancel={(e) => {
        if (pointer.current?.id === e.pointerId) cancel();
      }}
      onLostPointerCapture={(e) => {
        if (pointer.current?.id === e.pointerId) cancel();
      }}
    >
      {(["up", "left", "down", "right"] as Direction[]).map((dir, i) => (
        <button
          key={dir}
          data-direction={dir}
          aria-label={`Walk ${dir}`}
          aria-pressed={held === dir}
          disabled={!ready}
          onPointerDown={(e) => {
            if (e.button !== 0 || pointer.current) return;
            e.preventDefault();
            pointer.current = { id: e.pointerId, dir };
            root.current!.setPointerCapture(e.pointerId);
            useGameStore.getState().holdMove(dir);
          }}
          onClick={(e) => {
            if (e.detail === 0) useGameStore.getState().requestMove(dir);
          }}
        >
          {["↑", "←", "↓", "→"][i]}
        </button>
      ))}
    </div>
  );
}
