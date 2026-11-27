import { useEffect, useState } from "react";
import { useGameStore } from "../game/store";
import {
  atVillageBakingSpot,
  atVillagePicnicSeat,
  openVillageBaking,
  useVillageMotion,
} from "../game/village-motion";
import { VILLAGE_PICNIC } from "../game/village";
import { togetherDuration } from "../game/village-together";
import { visitTime } from "../game/visit-clock";
import { useVisitsStore, villagePartner } from "../game/visits";

function useTogetherBusy() {
  const end = useVisitsStore((s) => s.together && s.together.action !== "cancel"
    ? s.together.at - s.clockOffset + togetherDuration(s.together.action) * 1000
    : 0);
  const [now, setNow] = useState(visitTime);
  useEffect(() => {
    const current = visitTime();
    setNow(current);
    if (end <= current) return;
    const timer = setTimeout(() => setNow(visitTime()), end - current + 30);
    return () => clearTimeout(timer);
  }, [end]);
  return end > now;
}

export function VillagePicnic() {
  const status = useVisitsStore((s) => s.status);
  const role = useVisitsStore((s) => s.role);
  const slots = useVisitsStore((s) => s.picnic);
  const partnerOnline = useVisitsStore((s) => !!villagePartner(s));
  const together = useVisitsStore((s) => s.togetherAvailable &&
    s.players.length === 2 && s.players.every(atVillagePicnicSeat));
  const busy = useTogetherBusy();
  const arriving = useVillageMotion((s) => s.path.length > 0);
  const complete = slots.every(Boolean);

  function raiseCup() {
    if (together) useVisitsStore.getState().togetherAction("highfive");
    else useGameStore.getState().react("sip");
  }
  return (
    <section className="village-food" aria-label="At the picnic table">
      <div className="village-food-heading">
        <h2>Picnic table</h2>
        <button onClick={() => {
          useVillageMotion.getState().stop();
          useVillageMotion.setState({ picnic: false });
        }}>Leave the table</button>
      </div>
      {role && (
        <div className="shared-picnic">
          {complete ? <h3>A little picnic, made together ♡</h3> : <>
            {status !== "online" && <p role="status">Waiting for your visit to reconnect.</p>}
            {status === "online" && !partnerOnline && <p role="status">Waiting for your partner to return to the village.</p>}
            <div className="picnic-contributions">
              {["Lay the cloth", "Bring the cookies", "Pour the tea"].map((label, i) => (
                <button key={label} aria-pressed={slots[i]}
                  disabled={status !== "online" || !partnerOnline || arriving || slots[i]}
                  onClick={() => useVisitsStore.getState().placePicnic(i)}>
                  {slots[i] ? "✓ " : ""}{label}
                </button>
              ))}
            </div>
          </>}
        </div>
      )}
      <button className="primary" disabled={arriving || (!!role && (status !== "online" || !slots[2] || busy))}
        onClick={raiseCup}>{together ? "Cheers" : "Raise your cup"}</button>
    </section>
  );
}

export function VillageBaking() {
  const role = useVisitsStore((s) => s.role);
  const status = useVisitsStore((s) => s.status);
  const stage = useVisitsStore((s) => s.together?.baking ?? "mix");
  const running = useVisitsStore((s) => s.together?.action);
  const finished = useVisitsStore((s) => s.together?.action === "present" && s.picnic[1]);
  const here = useVisitsStore((s) => s.players.some((p) => p.id === s.role && atVillageBakingSpot(p)));
  const partner = useVisitsStore((s) => {
    const visitor = villagePartner(s);
    return visitor && atVillageBakingSpot(visitor) ? visitor.name : undefined;
  });
  const route = useVillageMotion((s) => s.path.length > 0);
  const busy = useTogetherBusy();
  const action = stage === "mix" ? "stir" : stage === "decorate" ? "decorate" : "present";
  const label = stage === "mix" ? "Nancy mixes" : stage === "decorate" ? "Melody decorates" : "Bring cookies to the picnic";
  const ownTurn = role === (stage === "decorate" ? "guest" : "host");
  const bakingMotion = running === "stir" ? "Nancy is mixing the dough."
    : running === "decorate" ? "Melody is decorating the cookies."
    : running === "present" ? "Nancy is bringing the cookies." : null;

  return (
    <section className="village-food" aria-label="Bake together at the café">
      <div className="village-food-heading">
        <h2>Bake together</h2>
        <button onClick={() => {
          if (route) useVillageMotion.getState().stop();
          useVillageMotion.setState({ baking: false });
        }}>Leave the counter</button>
      </div>
      <p role="status">{status !== "online" ? "Waiting for your visit to reconnect."
        : !here || route ? "Meet at the café counter to bake together."
        : !partner ? "Waiting for your partner at the counter."
        : busy && bakingMotion ? bakingMotion
        : finished && !busy ? "Your cookies are on the picnic table."
        : stage === "decorate" ? "Melody’s turn to decorate."
        : stage === "ready" ? "Nancy’s turn to bring the cookies."
        : "Nancy’s turn to mix."}</p>
      {!here && !route && <button disabled={status !== "online"} onClick={openVillageBaking}>Walk to the café counter</button>}
      <div className="village-food-actions">
        {finished && !busy && <button className="primary" onClick={() =>
          useVillageMotion.getState().walkTo(VILLAGE_PICNIC, "picnic")}>Walk to the picnic</button>}
        {ownTurn && <button className={finished ? undefined : "primary"}
          disabled={status !== "online" || !here || !partner || route || busy}
          onClick={() => {
            useVillageMotion.getState().stop();
            useVisitsStore.getState().togetherAction(action);
          }}>{finished ? "Bake another batch" : label}</button>}
      </div>
    </section>
  );
}
