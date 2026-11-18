import { useEffect, useRef, useState } from "react";
import { useVisitsStore, type VisitPlayer } from "../game/visits";

export function VillageSpeech({
  role,
  name,
}: {
  role: VisitPlayer["id"];
  name?: string;
}) {
  const line = useVisitsStore((s) =>
    s.chat.filter((message) => message.role === role).at(-1),
  );
  const seen = useRef(line?.id);
  const [speech, setSpeech] = useState("");
  useEffect(() => {
    if (!line || line.id === seen.current) return;
    seen.current = line.id;
    setSpeech(line.text);
    const timer = setTimeout(() => setSpeech(""), 6500);
    return () => clearTimeout(timer);
    // Position packets repeat the chat snapshot. Only new messages restart the timer.
  }, [line?.id]);
  return (
    <div className="village-speech" data-speaker={role}>
      {speech && (
        <span className="village-bubble" role="status">
          {speech}
        </span>
      )}
      {name && <span className={`visitor-name ${role}`}>{name} ♡</span>}
    </div>
  );
}
