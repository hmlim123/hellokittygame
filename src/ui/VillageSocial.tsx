import { useState } from "react";
import { useVisitsStore, villagePartner } from "../game/visits";
import { useVillageMotion } from "../game/village-motion";
import { useGameStore } from "../game/store";
import { VILLAGE_PLACES } from "../game/village";
import { TogetherActivities } from "./TogetherActivities";
import { WalkToPicnic } from "./Visits";

const garden = VILLAGE_PLACES.find((place) => place.id === "garden")!;

function GardenProgress() {
  const near = useVillageMotion(({ position }) =>
    Math.hypot(position.x - garden.x, position.z - garden.z) < 3.4,
  );
  const blooming = useVisitsStore((s) => s.garden.filter(Boolean).length);
  if (!near) return null;
  return (
    <p className="village-social-status garden-progress" role="status">
      {blooming === 3
        ? "All three flower beds are blooming."
        : `${blooming} of 3 flower beds blooming. Tap a dry bed to water it.`}
    </p>
  );
}

export function VillageSocial() {
  const status = useVisitsStore((s) => s.status);
  const together = useVisitsStore((s) => !!villagePartner(s));
  const hasPartner = useVisitsStore((s) => !!s.role && s.players.some((player) => player.id !== s.role));
  const ready = useGameStore((s) => s.sceneReady);
  const error = useVisitsStore((s) => s.error);
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState("");
  if (!hasPartner || !["online", "reconnecting"].includes(status)) return null;
  const disabled = status !== "online";
  function gesture(kind: "wave" | "softHappy") {
    useVillageMotion.getState().stop();
    useVisitsStore.getState().gesture(kind);
  }
  return (
    <div className="village-social" aria-label="With your visitor" role="group" hidden={!together}>
      <div className="village-social-buttons">
        <button disabled={disabled} onClick={() => gesture("wave")}>
          Wave
        </button>
        <button disabled={disabled} onClick={() => gesture("softHappy")}>
          Smile
        </button>
        <button
          aria-expanded={chatOpen}
          onClick={() => {
            useVillageMotion.getState().stop();
            setChatOpen(!chatOpen);
          }}
        >
          Chat
        </button>
        <WalkToPicnic inVillage />
        <button
          disabled={disabled || !ready}
          onClick={() => {
            const motion = useVillageMotion.getState();
            motion.walkTo({ ...garden, x: garden.x + (motion.guestVisit ? 0.5 : -0.5) });
          }}
        >
          Garden
        </button>
      </div>
      <TogetherActivities />
      <GardenProgress />
      {chatOpen && (
        <form
          className="visit-chat-form village-message"
          onSubmit={(event) => {
            event.preventDefault();
            if (!disabled && message.trim()) {
              useVisitsStore.getState().sendChat(message);
              setMessage("");
              setChatOpen(false);
            }
          }}
        >
          <input
            autoFocus
            aria-label="Message to your visitor"
            maxLength={240}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setChatOpen(false);
            }}
            placeholder="A little hello…"
            disabled={disabled}
          />
          <button type="submit" disabled={disabled || !message.trim()}>
            Send
          </button>
        </form>
      )}
      {error && (
        <p role="status" className="village-social-status">
          {error}
        </p>
      )}
    </div>
  );
}
