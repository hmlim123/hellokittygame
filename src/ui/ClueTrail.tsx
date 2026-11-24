import type { Ref } from "react";
import { CLUE_STOPS, atClueStop, clueStop } from "../../shared/clue-trail.mjs";
import { useGameStore } from "../game/store";
import { useVillageMotion } from "../game/village-motion";
import { useVisitsStore } from "../game/visits";

export function ClueTrailRoute() {
  const trail = useVisitsStore((s) => s.clueTrail);
  const stop = clueStop(trail?.destination);
  const role = useVisitsStore((s) => s.role);
  const online = useVisitsStore((s) => s.status === "online");
  const ready = useGameStore((s) => s.sceneReady);
  const nearby = useVillageMotion(({ position }) =>
    !!stop && atClueStop({ ...position, area: "village" }, stop),
  );
  const paired = useVisitsStore((s) => !!stop &&
    s.players.filter((player) => player.connected && atClueStop(player, stop)).length === 2,
  );
  if (!stop || !trail || (trail.ownSearched && trail.partnerSearched)) return null;
  const play = useVisitsStore.getState().clueTrailAction;

  return (
    <div className="postcard-route">
      <span role="status">
        {trail.ownSearched ? "You found your ribbon. Waiting for your partner." :
          paired ? `You’re both at ${stop.name}.` : nearby ?
            `Waiting for your partner at ${stop.name}.` : `Clue trail · ${stop.name}`}
      </span>
      {paired && !trail.ownSearched && (
        <button disabled={!online || !ready} onClick={() => play("search")}>
          Find my ribbon
        </button>
      )}
      {!nearby && (
        <button aria-label={`Walk to ${stop.name} for the clue trail`} disabled={!online || !ready} onClick={() => {
          useVillageMotion.getState().walkTo({ x: stop.x + (role === "guest" ? 0.55 : -0.55), z: stop.z });
        }}>
          Walk to {stop.name}
        </button>
      )}
    </div>
  );
}

export function ClueTrail({ panelRef }: { panelRef: Ref<HTMLDetailsElement> }) {
  const trail = useVisitsStore((s) => s.clueTrail);
  const online = useVisitsStore((s) => s.status === "online");
  if (!trail) return null;
  const play = useVisitsStore.getState().clueTrailAction;
  const completed = trail.ownSearched && trail.partnerSearched;
  const otherGuess = clueStop(trail.partnerGuess);

  return (
    <details ref={panelRef}>
      <summary>Village clue trail</summary>
      {completed ? (
        <>
          <p role="status">You found both ribbons together. ♡</p>
          <button disabled={!online} onClick={() => play("start")}>Try another clue</button>
        </>
      ) : trail.destination ? (
        <p role="status">You solved it! Meet at {clueStop(trail.destination)?.name} and find one ribbon each.</p>
      ) : trail.clue ? (
        <>
          <p><strong>Your clue</strong><br />{trail.clue}</p>
          {!trail.ownShared && (
            <button disabled={!online} onClick={() => play("share")}>Share my clue</button>
          )}
          {trail.partnerClue ? (
            <p><strong>Your partner’s clue</strong><br />{trail.partnerClue}</p>
          ) : trail.ownShared && <p role="status">Waiting for your partner’s clue.</p>}
          {trail.ownShared && trail.partnerShared && (
            <>
              <p role="status">
                {trail.wrongGuess ? "Try another place that fits both clues." : otherGuess ?
                  `Your partner picked ${otherGuess.name}.` : "Pick a landmark that fits both clues."}
              </p>
              <div className="postcard-stops" role="group" aria-label="Clue trail landmarks">
                {CLUE_STOPS.map((place) => (
                  <button key={place.id} disabled={!online} aria-pressed={trail.ownGuess === place.id}
                    onClick={() => play("guess", place.id)}>
                    {place.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <p>Share one clue each, agree on a place, and look for ribbons together.</p>
          <button disabled={!online} onClick={() => play("start")}>Start clue trail</button>
        </>
      )}
    </details>
  );
}
