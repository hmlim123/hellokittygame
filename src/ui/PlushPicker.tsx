import { Expressions } from "./Expressions";
import { useEffect, useRef, useState } from "react";
import { PLUSH_STYLES } from "../../dist/plush-state.js";
import { useGameStore } from "../game/store";
import { assetUrl } from "../game/assets";
import { prepareKittyStyle } from "../scenes/kitty-assets";
import type { Gesture } from "../game/types";
export function PlushPicker({
  onPreview,
}: {
  onPreview: (kind: Gesture) => void;
}) {
  const selected = useGameStore((s) => s.equipment.plush || "classic");
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  const choose = async (id: string) => {
    const token = ++request.current;
    setPending(id);
    setMessage("");
    try {
      await prepareKittyStyle(id);
      if (token !== request.current) return;
      useGameStore.getState().setPlush(id);
      setMessage(
        `${PLUSH_STYLES.find((s) => s.id === id)!.name} is ready for Nancy. ♡`,
      );
    } catch {
      if (token === request.current)
        setMessage("Kitty needs a moment to get ready. Try that style again.");
    } finally {
      if (token === request.current) setPending(null);
    }
  };
  return (
    <>
    <details className="plush-picker">
      <summary>
        Kitty’s plush collection ·{" "}
        {PLUSH_STYLES.find((s) => s.id === selected)!.name}
      </summary>
      <p>
        A softer little look. Your clothes, items and story stay with Kitty.
      </p>
      <div className="equipment-grid plush-grid">
        {PLUSH_STYLES.map((style) => (
          <button
            key={style.id}
            type="button"
            aria-label={`Choose ${style.name}`}
            aria-pressed={selected === style.id}
            onClick={() => void choose(style.id)}
            disabled={pending === style.id}
          >
            <img
              alt=""
              loading="lazy"
              src={assetUrl(
                style.id === "classic"
                  ? "assets/inventory/classic.svg"
                  : `assets/plush/${style.id}.png`,
              )}
            />
            <strong>{style.name}</strong>
            <small>
              {pending === style.id
                ? "Getting ready…"
                : selected === style.id
                  ? "Here with you"
                  : style.detail}
            </small>
          </button>
        ))}
      </div>
      <div
        className="plush-preview-actions"
        aria-label="Preview Kitty’s motions"
      >
        <button type="button" onClick={() => onPreview("dance")}>
          Preview a dance
        </button>
        <button type="button" onClick={() => onPreview("wave")}>
          Preview a wink
        </button>
        <button type="button" onClick={() => onPreview("celebrate")}>
          Preview a happy face
        </button>
      </div>
      <p role="status" className="small-note">
        {pending ? "Kitty is getting her soft little outfit ready…" : message}
      </p>
    </details>
    <Expressions onPreview={onPreview} />
    </>
  );
}
