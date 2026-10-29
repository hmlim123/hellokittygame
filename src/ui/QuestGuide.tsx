import { useEffect, useState } from "react";
import { useGameStore } from "../game/store";
import { questGuide } from "../game/quest-guide";
export function QuestGuide() {
  const a = useGameStore((s) => s.adventure), equipment = useGameStore((s) => s.equipment),
    contacts = useGameStore((s) => s.physicsContacts), openMap = useGameStore((s) => s.openQuestMap);
  const guide = questGuide(a, equipment), [idle, setIdle] = useState(false);
  useEffect(() => {
    setIdle(false);
    const timer = setTimeout(() => setIdle(true), 25000);
    return () => clearTimeout(timer);
  }, [guide.key, a.x, a.z, contacts]);
  return (
    <aside className="quest-guide" aria-label="Your next goal" data-objective={guide.key}>
      <div aria-live="polite" aria-atomic="true">
        <span className="eyebrow">YOUR NEXT LITTLE KINDNESS</span>
        <h2>{guide.title}</h2>
        <p>{guide.instruction}</p>
        {guide.tool && <p className="guide-tool">{guide.tool}</p>}
      </div>
      <details key={guide.key} className={idle ? "hint-ready" : ""}>
        <summary>{idle ? "Need a little hint?" : "A little hint"}</summary>
        <p>{guide.hint}. You can take your time.</p>
        <button onClick={openMap}>Show the walking path</button>
      </details>
    </aside>
  );
}
