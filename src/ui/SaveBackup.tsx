import { useRef, useState } from "react";
import { useGameStore } from "../game/store";
import {
  BACKUP_LIMIT,
  serializeBackup,
  parseBackup,
  downloadText,
} from "../game/backup";
import { memoryPages } from "../game/chapter";
import { OUTFITS } from "../game/domain";
import type { SaveState } from "../game/types";
const summary = (s: SaveState) =>
  `${s.room.owned.filter((id) => id !== 0).length} friends invited · ${memoryPages(s.adventure).filter((p) => p.unlocked).length + (s.cozy.tea.complete ? 1 : 0)} memories · ${s.cozy.postcards.length} postcards · ${s.cozy.cookiesGiven} cookie gifts · ${OUTFITS.find((o) => o.id === s.equipment.outfit)?.name}`;
export function SaveBackup({ onFreshStart }: { onFreshStart?: () => void }) {
  const input = useRef<HTMLInputElement>(null),
    [candidate, setCandidate] = useState<{
      text: string;
      save: SaveState;
    } | null>(null),
    [status, setStatus] = useState(
      "Download a save to keep it safe or move your progress to another device.",
    ),
    [previous, setPrevious] = useState(() =>
      useGameStore.getState().previousBackup(),
    );
  const selectFile = async (file: File | undefined) => {
    setCandidate(null);
    if (!file) return;
    if (file.size > BACKUP_LIMIT) {
      setStatus(
        "This file is too large to be a Kitty save. Choose a backup downloaded from Settings.",
      );
      return;
    }
    try {
      const text = await file.text(),
        save = parseBackup(text);
      setCandidate({ text, save });
      setStatus("Review this backup before restoring it.");
    } catch (e) {
      setStatus(
        e instanceof Error
          ? e.message
          : "This file could not be read. Your current game is unchanged.",
      );
    }
  };
  const restore = () => {
    if (!candidate) return;
    const result = useGameStore.getState().restoreBackup(candidate.text);
    if (result.ok) {
      setCandidate(null);
      setPrevious(useGameStore.getState().previousBackup());
      setStatus(
        "Your progress is restored. You can also download the previous save below.",
      );
    } else setStatus(result.error || "Your current game is unchanged.");
  };
  return (
    <details className="save-backup">
      <summary>Keep your progress ♡</summary>
      <p className="small-note">
        Saves stay in this browser. Download a backup, then choose that file on
        another phone or laptop to continue there.
      </p>
      <div className="memory-actions">
        <button
          onClick={() => {
            downloadText(
              serializeBackup(useGameStore.getState()),
              "Nancy-Kitty-Progress.json",
            );
            setStatus(
              "Your save is ready to download. Keep the JSON file for restoring on another device.",
            );
          }}
        >
          Download save
        </button>
        <button onClick={() => input.current?.click()}>
          Choose backup file
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        aria-label="Choose Kitty save backup"
        className="sr-only"
        onChange={(e) => {
          void selectFile(e.currentTarget.files?.[0]);
          e.currentTarget.value = "";
        }}
      />
      {candidate && (
        <section className="backup-preview" aria-label="Backup preview">
          <p>
            <strong>Current game</strong>
            <br />
            {summary(useGameStore.getState())}
          </p>
          <p>
            <strong>Selected backup</strong>
            <br />
            {summary(candidate.save)}
          </p>
          <p className="small-note">
            Restoring replaces this browser’s progress. The current save is kept
            as your previous save.
          </p>
          <div className="memory-actions">
            <button className="primary" onClick={restore}>
              Restore this backup
            </button>
            <button
              onClick={() => {
                setCandidate(null);
                setStatus("Your current game is unchanged.");
              }}
            >
              Keep current game
            </button>
          </div>
        </section>
      )}
      <p className="small-note" role="status">
        {status}
      </p>
      {previous && (
        <button
          className="text-button"
          onClick={() =>
            downloadText(previous, "Nancy-Kitty-Previous-Save.json")
          }
        >
          Download previous save
        </button>
      )}
      <details className="fresh-start">
        <summary>Start fresh</summary>
        <p className="small-note">
          Reset this browser’s quests, outfits, collection, cookies and
          postcards for a first visit. Nancy’s letter stays. Your current
          progress downloads as a backup and is kept as the previous save. Other
          browsers and devices are unaffected.
        </p>
        <button
          onClick={() => {
            downloadText(
              serializeBackup(useGameStore.getState()),
              "Nancy-Kitty-Before-Reset.json",
            );
            const result = useGameStore.getState().resetProgress();
            if (result.ok) onFreshStart?.();
            else setStatus(result.error || "Your current game is unchanged.");
          }}
        >
          Download backup & start fresh
        </button>
      </details>
    </details>
  );
}
