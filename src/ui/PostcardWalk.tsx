import { useMemo } from "react";
import {
  atPostcardStop,
  nextPostcardStop,
  postcardStop,
  POSTCARD_STOPS,
  type PostcardWalk as Walk,
} from "../../shared/postcard-walk.mjs";
import { useGameStore } from "../game/store";
import { useVillageMotion } from "../game/village-motion";
import { useVisitsStore, villagePartner } from "../game/visits";

function drawPostcard(walk: Walk) {
  const first = postcardStop(walk.host);
  const second = postcardStop(walk.guest);
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 960;
  const c = canvas.getContext("2d");
  if (!c || !first || !second) return null;

  c.fillStyle = "#fff5e5";
  c.fillRect(0, 0, 800, 960);
  c.strokeStyle = "#ad7c8b";
  c.lineWidth = 3;
  c.strokeRect(28, 28, 744, 904);
  c.textAlign = "center";
  c.fillStyle = "#784e60";
  c.font = "52px Georgia";
  c.fillText("A village walk together", 400, 130);
  c.font = "italic 31px Georgia";
  c.fillText("Nancy & My Melody", 400, 185);

  c.strokeStyle = "#cda3af";
  c.setLineDash([6, 12]);
  c.beginPath();
  c.moveTo(400, 420);
  c.lineTo(400, 596);
  c.stroke();
  c.setLineDash([]);

  [first, second].forEach((stop, index) => {
    const y = index === 0 ? 345 : 665;
    c.fillStyle = index === 0 ? "#f1d5df" : "#dfeacb";
    c.beginPath();
    c.arc(400, y, 82, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = index === 0 ? "#a76e8f" : "#718a62";
    c.stroke();
    c.fillStyle = index === 0 ? "#784e60" : "#47623f";
    c.font = "62px Georgia";
    c.fillText(stop.icon, 400, y + 23);
    c.font = "35px Georgia";
    c.fillText(stop.name, 400, y + 140);
  });

  return canvas;
}

export function PostcardRoute() {
  const walk = useVisitsStore((s) => s.postcardWalk);
  const stop = walk && nextPostcardStop(walk);
  const role = useVisitsStore((s) => s.role);
  const ready = useGameStore((s) => s.sceneReady);
  const online = useVisitsStore((s) => s.status === "online");
  const near = useVillageMotion(({ position }) =>
    !!stop && atPostcardStop({ ...position, area: "village" }, stop),
  );
  const paired = useVisitsStore(
    (s) =>
      !!stop &&
      s.players.filter((p) => p.connected && atPostcardStop(p, stop)).length === 2,
  );
  if (!stop || !walk) return null;
  const { postcardWalkAction } = useVisitsStore.getState();
  return (
    <div className="postcard-route">
      <span role="status">
        {paired
          ? `You’re both at ${stop.name}.`
          : near
            ? `Waiting for your partner at ${stop.name}.`
            : `Next postcard stop · ${stop.name}`}
      </span>
      {paired ? (
        <button disabled={!ready || !online} onClick={() => postcardWalkAction("stamp", stop.id)}>
          Add stamp {walk.stamps + 1} of 2
        </button>
      ) : (
        !near && (
          <button
            disabled={!ready || !online}
            onClick={() =>
              useVillageMotion
                .getState()
                .walkTo({ x: stop.x + (role === "guest" ? 0.55 : -0.55), z: stop.z })
            }
          >
            Walk to {stop.name}
          </button>
        )
      )}
    </div>
  );
}

export function PostcardWalk() {
  const walk = useVisitsStore((s) => s.postcardWalk);
  const role = useVisitsStore((s) => s.role);
  const roomId = useVisitsStore((s) => s.roomId);
  const partner = useVisitsStore((s) => villagePartner(s)?.name);
  const online = useVisitsStore((s) => s.status === "online");
  const memoryId = walk?.completedAt && roomId
    ? `village-walk-${roomId}-${walk.revision}`
    : null;
  const kept = useGameStore((s) => s.cozy.postcards.some((p) => p.id === memoryId));
  const card = useMemo(() => walk?.stamps === 2 ? drawPostcard(walk) : null, [walk]);
  const png = useMemo(() => card?.toDataURL("image/png"), [card]);
  if (!walk || !role) return null;
  const chosen = postcardStop(walk[role]);
  const other = postcardStop(walk[role === "host" ? "guest" : "host"]);
  const { postcardWalkAction } = useVisitsStore.getState();

  function keep() {
    if (!walk?.completedAt || !memoryId || kept || role !== "host" || !card) return;
    const thumbnail = document.createElement("canvas");
    thumbnail.width = 150;
    thumbnail.height = 180;
    const c = thumbnail.getContext("2d");
    if (!c) return;
    c.drawImage(card, 0, 0, thumbnail.width, thumbnail.height);
    const game = useGameStore.getState();
    game.keepPostcard({
      id: memoryId,
      image: thumbnail.toDataURL("image/jpeg", 0.7),
      outfit: game.equipment.outfit,
      ...(game.equipment.plush ? { plush: game.equipment.plush } : {}),
      background: "Village postcard",
      pose: "still",
      place: "Together on a village walk",
      createdAt: new Date(walk.completedAt).toISOString(),
    });
  }

  return (
    <details>
      <summary>Postcard walk</summary>
      {walk.stamps === 2 ? (
        <>
          <p role="status">Your two-stamp postcard is ready.</p>
          {png && (
            <a href={png} download="Nancy-and-Melody-village-walk.png">
              Download village postcard
            </a>
          )}
          {role === "host" && (
            <>
              <button disabled={kept} onClick={keep}>
                {kept ? "Walk postcard kept" : "Keep walk postcard"}
              </button>
              <button disabled={!online} onClick={() => postcardWalkAction("reset")}>
                Start a new walk
              </button>
            </>
          )}
        </>
      ) : chosen && other ? (
        <p>Visit the stops together and add one stamp at each.</p>
      ) : (
        <>
          <p>
            {chosen
              ? `You chose ${chosen.name}. Waiting for ${partner || "your partner"}.`
              : "Choose one landmark each for your postcard."}
          </p>
          <div className="postcard-stops" role="group" aria-label="Your postcard stop">
            {POSTCARD_STOPS.map((stop) => (
              <button
                key={stop.id}
                disabled={!online || stop.id === other?.id}
                aria-pressed={chosen?.id === stop.id}
                onClick={() => postcardWalkAction("choose", stop.id)}
              >
                {stop.name}
              </button>
            ))}
          </div>
        </>
      )}
    </details>
  );
}
