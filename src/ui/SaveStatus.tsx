import { useGameStore } from "../game/store";
import { downloadText, serializeBackup } from "../game/backup";
import { BUILD_REVISION, RELEASE_VERSION } from "../game/release";
export function SaveStatus() {
  const failed = useGameStore((s) => s.saveFailed),
    saved = useGameStore((s) => s.lastSavedAt !== null),
    retry = useGameStore((s) => s.retrySave);
  return (
    <aside
      className={`save-health ${failed ? "save-error" : ""}`}
      role={failed ? "alert" : "status"}
      data-save-state={failed ? "failed" : saved ? "saved" : "ready"}
    >
      <p>
        {failed
          ? "Your progress is not fully saved yet. Keep this tab open; you can download a backup."
          : saved
            ? "Progress saved in this browser. ♡"
            : "Your steps and discoveries save in this browser."}
      </p>
      {failed && (
        <div className="memory-actions">
          <button onClick={retry}>Retry saving</button>
          <button
            onClick={() =>
              downloadText(
                serializeBackup(useGameStore.getState()),
                "Nancy-Kitty-Progress.json",
              )
            }
          >
            Download backup
          </button>
        </div>
      )}
    </aside>
  );
}
export function SaveDetails() {
  const last = useGameStore((s) => s.lastSavedAt),
    failed = useGameStore((s) => s.saveFailed);
  return (
    <p className="small-note release-details">
      Version {RELEASE_VERSION} · Build {BUILD_REVISION}
      <br />
      {failed
        ? "Saving needs attention. Download a backup before leaving."
        : last
          ? `Saved in this browser at ${new Date(last).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`
          : "Progress saves in this browser."}
    </p>
  );
}
