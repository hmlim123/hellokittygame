import { useEffect, useState } from "react";
import { useGameStore } from "../game/store";
import { questGuide } from "../game/quest-guide";
import { deliveryGoal, teaGoal } from "../game/cozy";
export function QuestGuide() {
  const a = useGameStore((s) => s.adventure),
    cozy = useGameStore((s) => s.cozy),
    equipment = useGameStore((s) => s.equipment),
    contacts = useGameStore((s) => s.physicsContacts),
    openMap = useGameStore((s) => s.openQuestMap);
  const teaActive = cozy.tea.active && !cozy.tea.complete && a.map === "glade";
  const deliveryActive = cozy.delivery.active;
  const guide = deliveryActive
      ? { ...deliveryGoal(cozy), tool: undefined }
      : teaActive
        ? { ...teaGoal(cozy), tool: undefined }
        : questGuide(a, equipment),
    [idle, setIdle] = useState(false);
  useEffect(() => {
    setIdle(false);
    const timer = setTimeout(() => setIdle(true), 25000);
    return () => clearTimeout(timer);
  }, [guide.key, a.x, a.z, contacts]);
  return (
    <aside
      className="quest-guide"
      aria-label="Your next goal"
      data-objective={guide.key}
    >
      <div aria-live="polite" aria-atomic="true">
        <span className="eyebrow">YOUR NEXT LITTLE KINDNESS</span>
        <h2>{guide.title}</h2>
        <p>{guide.instruction}</p>
        {guide.tool && <p className="guide-tool">{guide.tool}</p>}
      </div>
      <details key={guide.key} className={idle ? "hint-ready" : ""}>
        <summary>{idle ? "Need a little hint?" : "A little hint"}</summary>
        <p>{guide.hint}. You can take your time.</p>
        {!teaActive && <button onClick={openMap}>Show the walking path</button>}
      </details>
      {deliveryActive && (
        <div className="memory-actions">
          {cozy.delivery.step === "bake" && (
            <button onClick={() => useGameStore.getState().openPanel("baking")}>
              Bake for your delivery ↗
            </button>
          )}
          {cozy.delivery.step === "momo" && a.map !== "village" && (
            <button onClick={() => useGameStore.getState().travelTo("village")}>
              Return to Momo’s village ↗
            </button>
          )}
          {cozy.delivery.step === "mint" && a.map !== "glade" && (
            <button onClick={() => useGameStore.getState().startGlade()}>
              Visit Pip in the glade ↗
            </button>
          )}
          {cozy.delivery.step === "home" && (
            <button onClick={() => useGameStore.getState().setMode("room")}>
              Bring the recipe home ♡
            </button>
          )}
        </div>
      )}
      {teaActive && !deliveryActive && (
        <div className="memory-actions">
          {cozy.tea.leaves && !cozy.tea.baked && (
            <button onClick={() => useGameStore.getState().openPanel("baking")}>
              Bake a cookie ↗
            </button>
          )}
          <button onClick={() => useGameStore.getState().pauseTea()}>
            Pause this story
          </button>
        </div>
      )}
    </aside>
  );
}
