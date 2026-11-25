import type { Ref } from "react";
import { PETALS, petal, type Petal } from "../../shared/petal-match.mjs";
import { useVisitsStore } from "../game/visits";

const choices = Object.keys(PETALS) as Petal[];

export function PetalMatch({ panelRef }: { panelRef: Ref<HTMLDetailsElement> }) {
  const match = useVisitsStore((s) => s.petalMatch);
  const online = useVisitsStore((s) => s.status === "online");
  if (!match) return null;
  const play = useVisitsStore.getState().petalMatchAction;
  const own = petal(match.own);
  const partner = petal(match.partner);

  return (
    <details ref={panelRef}>
      <summary>Petal match</summary>
      {!match.round ? (
        <>
          <p>Pick a flower in secret and see if your partner chooses the same one.</p>
          <button disabled={!online} onClick={() => play("start")}>Play petal match</button>
        </>
      ) : match.finished && own && partner ? (
        <>
          <p role="status">
            {own === partner ? `You matched on ${PETALS[own].name.toLowerCase()}! ♡` :
              `You picked ${PETALS[own].name.toLowerCase()}. Your partner picked ${PETALS[partner].name.toLowerCase()}.`}
          </p>
          <p>{match.matches} {match.matches === 1 ? "match" : "matches"} in {match.round} {match.round === 1 ? "round" : "rounds"} together</p>
          <button disabled={!online} onClick={() => play("start")}>Play another round</button>
        </>
      ) : own ? (
        <p role="status">You picked {PETALS[own].name.toLowerCase()}. Waiting for your partner.</p>
      ) : (
        <>
          <p role="status">{match.partnerReady ? "Your partner has picked. Now choose your flower." : "Choose your flower."}</p>
          <div className="lantern-colors" role="group" aria-label="Pick a petal">
            {choices.map((choice) => {
              const flower = PETALS[choice];
              return (
                <button key={choice} disabled={!online} onClick={() => play("pick", choice)}>
                  <span aria-hidden="true" style={{ background: flower.color }} />{flower.name}
                </button>
              );
            })}
          </div>
        </>
      )}
    </details>
  );
}
