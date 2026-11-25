import { useEffect, useState } from "react";
import { atTeaBenchSeat, BENCH_TOAST_MS, teaBenchSeat } from "../../shared/bench-tea.mjs";
import { useGameStore } from "../game/store";
import { useVillageMotion } from "../game/village-motion";
import { useVisitsStore, villagePartner } from "../game/visits";
import { visitTime } from "../game/visit-clock";

export function BenchTea({ busy }: { busy: boolean }) {
  const supported = useVisitsStore((s) => !!s.benchTea);
  const role = useVisitsStore((s) => s.role);
  const seated = useVisitsStore((s) => !!s.role && !!s.benchTea?.seated[s.role]);
  const atSeat = useVisitsStore((s) => {
    const own = s.players.find((player) => player.id === s.role);
    return !!own && atTeaBenchSeat(own, own.id);
  });
  const online = useVisitsStore((s) => s.status === "online");
  const ready = useGameStore((s) => s.sceneReady);
  if (!supported || !role) return null;

  return (
    <details>
      <summary>Bench tea</summary>
      {seated ? <p>Use the bench controls to share a toast.</p> : (
        <>
          <p>Meet by the bench near the plaza. Take a seat and raise your cups together.</p>
          {atSeat ? (
            <button disabled={!online || !ready || busy} onClick={(event) => {
              useVillageMotion.getState().stop();
              useVisitsStore.getState().benchTeaAction("sit");
              const menu = event.currentTarget.closest("details.together-options");
              if (menu instanceof HTMLDetailsElement) menu.open = false;
            }}>Sit at the tea bench</button>
          ) : (
            <button disabled={!online || !ready} onClick={() => {
              useVillageMotion.getState().walkTo(teaBenchSeat(role));
            }}>Walk to my bench seat</button>
          )}
        </>
      )}
    </details>
  );
}

export function BenchTeaControls() {
  const tea = useVisitsStore((s) => s.benchTea);
  const role = useVisitsStore((s) => s.role);
  const nearbyPartner = useVisitsStore((s) => !!villagePartner(s));
  const online = useVisitsStore((s) => s.status === "online");
  const offset = useVisitsStore((s) => s.clockOffset);
  const [now, setNow] = useState(visitTime);
  const ends = tea?.toastAt ? tea.toastAt + BENCH_TOAST_MS - offset : 0;
  useEffect(() => {
    if (!ends) return;
    setNow(visitTime());
    const timer = setTimeout(() => setNow(visitTime()), Math.max(0, ends - visitTime()) + 30);
    return () => clearTimeout(timer);
  }, [ends]);
  if (!tea || !role) return null;
  const both = nearbyPartner && tea.seated.host && tea.seated.guest;
  const clinking = ends > now;
  const waiting = tea.ready[role];
  const act = useVisitsStore.getState().benchTeaAction;
  return (
    <div className="village-controls">
      <div className="village-table-actions" role="group" aria-label="At the tea bench">
        <p className="village-social-status bench-tea-status" role="status">
          {clinking ? "Cheers! ♡" : waiting ? "You’re ready. Waiting for your partner." :
            both ? "Both cups are ready." : "There’s a seat for your partner."}
        </p>
        <button className="primary village-context" disabled={!both || !online || clinking || waiting}
          onClick={() => act("ready")}>
          Ready to toast
        </button>
        <div className="village-small-actions">
          <button disabled={!online} onClick={() => act("stand")}>Stand up</button>
        </div>
      </div>
    </div>
  );
}
