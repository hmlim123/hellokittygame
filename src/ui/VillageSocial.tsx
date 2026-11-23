import { useState } from "react";
import { useVisitsStore } from "../game/visits";
import { useVillageMotion } from "../game/village-motion";
import { TogetherActivities } from "./TogetherActivities";
import { WalkToPicnic } from "./Visits";

export function VillageSocial() {
  const status = useVisitsStore((s) => s.status);
  const together = useVisitsStore((s) =>
    s.players.some(
      (p) =>
        p.id !== s.role && p.connected && (!p.area || p.area === "village"),
    ),
  );
  const error = useVisitsStore((s) => s.error);
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState("");
  if (!together || !["online", "reconnecting"].includes(status)) return null;
  const disabled = status !== "online";
  function gesture(kind: "wave" | "softHappy") {
    useVillageMotion.getState().stop();
    useVisitsStore.getState().gesture(kind);
  }
  return (
    <div className="village-social" aria-label="With your visitor" role="group">
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
      </div>
      <TogetherActivities />
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
