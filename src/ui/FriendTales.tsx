import { lazy, Suspense, useState } from "react";
import { FRIEND_TALES } from "../game/friend-tales";
import { useGameStore } from "../game/store";
import { assetUrl } from "../game/assets";
import { Dialog } from "./Dialog";
const Scene = lazy(() => import("../scenes/FriendTaleScene"));
export function FriendTalesPanel() {
  const active = useGameStore((s) => s.activeTale),
    cozy = useGameStore((s) => s.cozy),
    room = useGameStore((s) => s.room),
    start = useGameStore((s) => s.startFriendTale),
    play = useGameStore((s) => s.playFriendTale),
    finish = useGameStore((s) => s.finishFriendTale),
    close = useGameStore((s) => s.closePanel);
  const [hint, setHint] = useState("");
  const tale = FRIEND_TALES.find((t) => t.id === active),
    progress = tale ? cozy.tales[tale.id] : null,
    step = tale && progress ? tale.steps[progress.step] : null;
  const act = (token: string) => {
    if (!play(token)) setHint(step?.hint || "Take your time.");
    else setHint("");
  };
  return (
    <Dialog
      title={tale ? tale.title : "Five little friendship stories"}
      onClose={close}
      className="friend-tales-dialog"
    >
      <span className="eyebrow">LITTLE FRIENDS, LOVELY BEGINNINGS</span>
      <h2>{tale ? tale.title : "Five little friendship stories"}</h2>
      {!tale || !progress ? (
        <>
          <p>
            Help a new friend with a small kindness. No timer, no penalties.
            Your place is saved whenever you leave.
          </p>
          <div className="tale-index">
            {FRIEND_TALES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setHint("");
                  start(t.id);
                }}
                aria-label={
                  (cozy.tales[t.id].complete
                    ? "Read "
                    : cozy.tales[t.id].started
                      ? "Continue "
                      : "Begin ") + t.title
                }
              >
                <img alt="" src={assetUrl("assets/plush/" + t.id + ".png")} />
                <span>
                  <strong>{t.title}</strong>
                  <small>
                    {t.name} ·{" "}
                    {cozy.tales[t.id].complete
                      ? "A story to keep"
                      : cozy.tales[t.id].started
                        ? "Continue where you left off"
                        : room.owned.includes(t.friend)
                          ? "A new story with your friend"
                          : "Meet a new friend"}
                  </small>
                </span>
                <b aria-hidden="true">↗</b>
              </button>
            ))}
          </div>
          <button className="wide" onClick={close}>
            Back to Kitty
          </button>
        </>
      ) : (
        <>
          <span className="tale-place">
            {tale.name} · {tale.place}
          </span>
          <div className="tale-preview">
            <Suspense
              fallback={
                <img
                  alt=""
                  src={assetUrl("assets/plush/" + tale.id + ".png")}
                />
              }
            >
              <Scene tale={tale} progress={progress} onAction={act} />
            </Suspense>
          </div>
          {progress.complete ? (
            <article className="tale-reading">
              <p>{tale.intro}</p>
              {tale.steps.map((part, i) => (
                <p key={i}>{part.text}</p>
              ))}
              <p>{tale.ending}</p>
              <button className="primary wide" onClick={close}>
                Back to Kitty
              </button>
            </article>
          ) : step ? (
            <>
              <span className="eyebrow">CHAPTER {progress.step + 1} OF 3</span>
              <p>{progress.step === 0 ? tale.intro : step.text}</p>
              <h3 className="tale-goal">{step.goal}</h3>
              <p className="small-note">
                Tap the little objects, or their pictures below.
              </p>
              <div className="tale-actions" key={tale.id + "-" + progress.step}>
                {(step.kind === "sequence" ? [2, 0, 1] : [0, 1, 2]).map((i) => (
                  <button
                    key={step.tokens[i]}
                    data-tale-action={step.tokens[i]}
                    disabled={progress.found.includes(step.tokens[i])}
                    onClick={() => act(step.tokens[i])}
                  >
                    <span aria-hidden="true">{step.icons[i]}</span>
                    <strong>{step.labels[i]}</strong>
                    <small>
                      {progress.found.includes(step.tokens[i])
                        ? "Lovely ♡"
                        : "Tap gently"}
                    </small>
                  </button>
                ))}
              </div>
              <p role="status" className="tale-feedback">
                {hint || progress.found.length + " of 3 little kindnesses"}
              </p>
              <details className="tale-hint">
                <summary>A gentle hint</summary>
                <p>{step.hint}</p>
              </details>
            </>
          ) : (
            <article className="tale-ending">
              <span className="eyebrow">A LITTLE KINDNESS, KEPT FOREVER</span>
              <p>{tale.ending}</p>
              <p>A new page is ready for your storybook.</p>
              <button className="primary wide" onClick={finish}>
                {room.owned.includes(tale.friend)
                  ? "Keep this story ♡"
                  : "Invite " + tale.name + " home ♡"}
              </button>
            </article>
          )}
          <div className="memory-actions">
            <button
              onClick={() => {
                setHint("");
                start();
              }}
            >
              ← All five stories
            </button>
            {!progress.complete && (
              <button onClick={close}>Save & pause</button>
            )}
          </div>
        </>
      )}
    </Dialog>
  );
}
