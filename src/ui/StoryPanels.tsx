import { useState } from "react";
import { useGameStore } from "../game/store";
import { memoryPages, STAR_ORDER, endingUnlocked } from "../game/chapter";
import { assetUrl } from "../game/assets";
import { Dialog } from "./Dialog";
export function Storybook() {
  const adventure = useGameStore((s) => s.adventure),
    tea = useGameStore((s) => s.cozy.tea),
    requested = useGameStore((s) => s.memoryPage),
    close = useGameStore((s) => s.closePanel),
    open = useGameStore((s) => s.openPanel),
    start = useGameStore((s) => s.startGlade);
  const pages = [
      ...memoryPages(adventure),
      ...(tea.started
        ? [
            {
              id: "tea",
              title: "A cup of kindness",
              art: "picnic",
              place: "Moonlight tea garden",
              text: "A basket of mint, a cookie made for Momo, and two little cups turned an ordinary evening into something special. A tiny teacup came home with Kitty, to remember the kindness Nancy shared.",
              unlocked: tea.complete,
            },
          ]
        : []),
    ],
    unlocked = pages.filter((p) => p.unlocked);
  const [selected, setSelected] = useState(
    requested || unlocked[0]?.id || null,
  );
  const page = unlocked.find((p) => p.id === selected) || unlocked[0],
    index = page ? unlocked.indexOf(page) : 0;
  return (
    <Dialog
      title="Nancy’s little storybook"
      onClose={close}
      className="storybook-dialog"
    >
      <span className="eyebrow">SMALL KINDNESSES, KEPT FOREVER</span>
      <h2>Nancy’s little storybook</h2>
      <p>
        {unlocked.length} of {pages.length} little memories · Saved with your
        adventure.
      </p>
      {page ? (
        <article className="memory-spread" data-memory={page.id}>
          <img src={assetUrl(`assets/quest/${page.art}.svg`)} alt="" />
          <div>
            <span className="eyebrow">{page.place}</span>
            <h3>{page.title}</h3>
            <p>{page.text}</p>
            {page.id === "letter" && (
              <button className="primary" onClick={() => open("letter")}>
                Open your envelope 💌
              </button>
            )}
            {page.id === "ending" && (
              <button className="primary" onClick={() => open("ending")}>
                Watch the moonlit picnic
              </button>
            )}
            {page.id === "postcard" && (
              <button onClick={() => open("photo")}>
                Make another postcard
              </button>
            )}
            {page.id === "tea" && (
              <button className="primary" onClick={() => open("tea")}>
                Remember our tea party ☾
              </button>
            )}
          </div>
        </article>
      ) : (
        <div className="empty-story">
          <span>✧</span>
          <h3>Your little story begins here.</h3>
          <p>
            Complete a quest or follow the butterflies. Each small kindness
            becomes a page you can return to.
          </p>
        </div>
      )}
      {unlocked.length > 1 && (
        <nav className="page-turner" aria-label="Storybook pages">
          <button
            disabled={index === 0}
            onClick={() => setSelected(unlocked[index - 1].id)}
          >
            ← Previous
          </button>
          <span>
            {index + 1} / {unlocked.length}
          </span>
          <button
            disabled={index === unlocked.length - 1}
            onClick={() => setSelected(unlocked[index + 1].id)}
          >
            Next →
          </button>
        </nav>
      )}
      <div className="memory-index">
        {pages.map((p) => (
          <button
            key={p.id}
            disabled={!p.unlocked}
            aria-label={
              p.unlocked ? `Read ${p.title}` : "A memory still waiting"
            }
            aria-pressed={page?.id === p.id}
            onClick={() => setSelected(p.id)}
          >
            <img alt="" src={assetUrl(`assets/quest/${p.art}.svg`)} />
            <span>{p.unlocked ? p.title : "A memory still waiting"}</span>
          </button>
        ))}
      </div>
      <div className="memory-actions">
        <button onClick={() => open("keepsakes")}>Your keepsake wall ♡</button>
        <button onClick={start}>Visit Butterfly Glade ↗</button>
        <button onClick={() => open("photo")}>Photo corner ♡</button>
        {endingUnlocked(adventure) && (
          <button onClick={() => open("ending")}>A moonlit picnic ☾</button>
        )}
      </div>
      <button className="primary wide" onClick={close}>
        Back to Kitty
      </button>
    </Dialog>
  );
}
const symbols: Record<string, string> = { moon: "☾", flower: "✿", heart: "♡" };
export function StarsPanel() {
  const chapter = useGameStore((s) => s.adventure.chapter),
    place = useGameStore((s) => s.arrangeStar),
    close = useGameStore((s) => s.closePanel),
    notice = useGameStore((s) => s.notice);
  return (
    <Dialog title="Three wishing stars" onClose={close}>
      <span className="eyebrow">A GENTLE LITTLE PUZZLE</span>
      <h2>Three wishing stars</h2>
      <p>
        The stones remember: <strong>moon → flower → heart</strong>.
      </p>
      <p>
        Tap a picture, or drag it to the next empty stone. There is no penalty
        for trying.
      </p>
      <div className="star-stones">
        {STAR_ORDER.map((id, i) => (
          <div
            key={id}
            className={chapter.stars[i] ? "filled" : ""}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (i === chapter.stars.length)
                place(e.dataTransfer.getData("text/plain"));
            }}
            aria-label={`Stone ${i + 1}: ${chapter.stars[i] || "empty"}`}
          >
            <span>{chapter.stars[i] ? symbols[chapter.stars[i]] : "✧"}</span>
            <small>{i + 1}</small>
          </div>
        ))}
      </div>
      <div className="star-choices">
        {["heart", "moon", "flower"].map((id) => (
          <button
            key={id}
            draggable={!chapter.stars.includes(id)}
            disabled={chapter.stars.includes(id)}
            onDragStart={(e) => e.dataTransfer.setData("text/plain", id)}
            onClick={() => place(id)}
            aria-label={`Place ${id} star`}
          >
            <span>{symbols[id]}</span>
            {id}
          </button>
        ))}
      </div>
      <p className="puzzle-hint" role="status">
        {notice?.title === "No hurry"
          ? notice.text
          : `${chapter.stars.length} of 3 stars shining. Your progress is safe if you leave.`}
      </p>
      <button className="wide" onClick={close}>
        Keep exploring
      </button>
    </Dialog>
  );
}
