import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../game/store";
import {
  DOLLS,
  ITEMS,
  KEEPSAKES,
  LOVE_LETTER,
  MISSIONS,
  PICNIC_SPOTS,
  THEMES,
} from "../game/domain";
import type { Gesture, MissionId, Theme } from "../game/types";
import { Dialog } from "./Dialog";
import { assetUrl } from "../game/assets";
export function MissionsPanel() {
  const close = useGameStore((s) => s.closePanel),
    start = useGameStore((s) => s.startMission),
    journal = useGameStore((s) => s.journal),
    preferences = useGameStore((s) => s.preferences),
    setPreferences = useGameStore((s) => s.setPreferences),
    setMode = useGameStore((s) => s.setMode);
  return (
    <Dialog title="Nancy’s little adventures" onClose={close}>
      <span className="eyebrow">A LITTLE WORLD MADE FOR YOU</span>
      <h2>Nancy’s little adventures</h2>
      <p>Pick a cozy little game, or continue your Moonflower story.</p>
      <div className="mission-grid">
        {MISSIONS.map((m) => (
          <button
            key={m.id}
            data-mission={m.id}
            className="mission-card"
            onClick={() => start(m.id)}
          >
            <span>{m.icon}</span>
            <strong>{m.title}</strong>
            <small>{m.description}</small>
            <em>
              {journal.completed[m.id]
                ? `${journal.completed[m.id]} completed`
                : "A keepsake to discover"}
            </em>
          </button>
        ))}
      </div>
      <button className="adventure-link" onClick={() => setMode("adventure")}>
        ☾{" "}
        <span>
          <strong>Moonflower Adventure</strong>
          <small>
            A village, a gentle dungeon, and four quests for Nancy ↗
          </small>
        </span>
      </button>
      <label className="check-setting">
        <input
          type="checkbox"
          checked={preferences.relaxed}
          onChange={(e) => setPreferences({ relaxed: e.target.checked })}
        />
        Relaxed hunt <small>No timer</small>
      </label>
      <details className="keepsakes">
        <summary>Your little keepsakes</summary>
        {MISSIONS.map((m) => (
          <article key={m.id}>
            <h3>{journal.completed[m.id] ? KEEPSAKES[m.id].title : m.title}</h3>
            <p>
              {journal.completed[m.id]
                ? KEEPSAKES[m.id].note
                : `Complete ${m.title} to open this little note.`}
            </p>
          </article>
        ))}
      </details>
    </Dialog>
  );
}
export function TogetherPanel() {
  const close = useGameStore((s) => s.closePanel),
    react = useGameStore((s) => s.react),
    chat = useGameStore((s) => s.chat),
    messages = useGameStore((s) => s.messages),
    equipment = useGameStore((s) => s.equipment),
    open = useGameStore((s) => s.openPanel),
    start = useGameStore((s) => s.startMission),
    [text, setText] = useState(""),
    list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages]);
  const play = (kind: Gesture) => {
    close();
    react(kind);
  };
  return (
    <Dialog title="Play together" onClose={close}>
      <span className="eyebrow">A LITTLE TIME WITH KITTY</span>
      <h2>Play together</h2>
      <p>Tap Kitty’s bow, paws, nose, or head in the room, too.</p>
      <div className="together-grid">
        {(
          [
            ["hug", "Cuddle ♡"],
            ["highfive", "High five ✧"],
            ["tickle", "Tickle ♫"],
            ["kiss", "Send a kiss ♡"],
          ] as [Gesture, string][]
        ).map(([kind, name]) => (
          <button key={kind} onClick={() => play(kind)}>
            {name}
          </button>
        ))}
      </div>
      <div className="present-play">
        <span>
          In Kitty’s paws · {ITEMS.find((i) => i.id === equipment.item)?.name}
        </span>
        <button
          className="primary"
          onClick={() => {
            if (equipment.item === "letter") open("letter");
            else if (equipment.item === "flowers") start("picnic");
            else if (equipment.item === "none") open("inventory", "items");
            else play("offer");
          }}
        >
          {equipment.item === "strawberry"
            ? "Feed Kitty"
            : equipment.item === "teddy"
              ? "Cuddle the teddy"
              : equipment.item === "letter"
                ? "Open your letter"
                : equipment.item === "flowers"
                  ? "Set up a picnic"
                  : "Choose a little gift"}
        </button>
        <button onClick={() => open("inventory", "items")}>Change item</button>
      </div>
      <h3>A little chat</h3>
      <p className="small-note">
        Kitty knows a few playful replies to greetings, feelings, and little
        requests.
      </p>
      <div
        className="chat-list"
        ref={list}
        role="log"
        aria-label="A little chat with Kitty"
      >
        {messages.length ? (
          messages.map((m, i) => (
            <p key={i} className={m.role}>
              <span>{m.role === "nancy" ? "You" : "Kitty"}</span>
              {m.text}
            </p>
          ))
        ) : (
          <p className="kitty">
            <span>Kitty</span>Hello, Nancy. Want a cuddle or a tiny dance? ♡
          </p>
        )}
      </div>
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          chat(text);
          setText("");
        }}
      >
        <input
          aria-label="Message to Kitty"
          placeholder="Say hello, or ask for a dance…"
          maxLength={240}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" disabled={!text.trim()}>
          Send ♡
        </button>
      </form>
      <button className="text-button" onClick={() => open("letter")}>
        Nancy’s letter 💌
      </button>
    </Dialog>
  );
}
export function LetterPanel() {
  const close = useGameStore((s) => s.closePanel),
    mark = useGameStore((s) => s.markLetterOpened),
    [opened, setOpened] = useState(false);
  const available = !LOVE_LETTER.pending && LOVE_LETTER.paragraphs.length > 0;
  return (
    <Dialog title="A letter for Nancy" onClose={close}>
      <span className="eyebrow">A LITTLE LETTER, JUST FOR YOU</span>
      <h2>For Nancy</h2>
      {!opened ? (
        <div className="sealed-letter" aria-hidden="true">
          💌
        </div>
      ) : (
        <article className="letter-paper">
          <h3>Dear Nancy,</h3>
          {available ? (
            <>
              {LOVE_LETTER.paragraphs.map((p: string, i: number) => (
                <p key={i}>{p}</p>
              ))}
              <p>{LOVE_LETTER.signoff}</p>
              <p>{LOVE_LETTER.signature}</p>
            </>
          ) : (
            <p>
              Your special letter is being written. This little place is waiting
              for your words.
            </p>
          )}
        </article>
      )}
      <button
        className="primary wide"
        aria-expanded={opened}
        onClick={() => {
          setOpened(!opened);
          if (!opened) mark();
        }}
      >
        {opened ? "Fold the letter" : "Break the heart seal"}
      </button>
    </Dialog>
  );
}
export function SettingsPanel({
  sound,
  setSound,
}: {
  sound: boolean;
  setSound: (enabled: boolean) => void;
}) {
  const close = useGameStore((s) => s.closePanel),
    room = useGameStore((s) => s.room),
    setTheme = useGameStore((s) => s.setTheme),
    preferences = useGameStore((s) => s.preferences),
    set = useGameStore((s) => s.setPreferences);
  return (
    <Dialog title="Game settings" onClose={close}>
      <span className="eyebrow">MAKE YOURSELF COZY</span>
      <h2>Game settings</h2>
      <fieldset>
        <legend>Room color</legend>
        <div className="theme-options">
          {Object.entries(THEMES).map(([id, t]) => (
            <button
              key={id}
              onClick={() => setTheme(id as Theme)}
              aria-pressed={room.theme === id}
              style={{ "--swatch": t.wall } as React.CSSProperties}
            >
              {t.name}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="check-setting">
        <input
          type="checkbox"
          checked={sound}
          onChange={(e) => setSound(e.target.checked)}
        />
        Music-box melody and little chimes
      </label>
      <label className="check-setting">
        <input
          type="checkbox"
          checked={preferences.relaxed}
          onChange={(e) => set({ relaxed: e.target.checked })}
        />
        Relaxed hunts, without a timer
      </label>
      <label className="check-setting">
        <input
          type="checkbox"
          checked={preferences.motion === "reduce"}
          onChange={(e) =>
            set({ motion: e.target.checked ? "reduce" : "system" })
          }
        />
        Reduce motion
      </label>
      <p className="small-note">
        Your device’s reduced-motion setting is also respected. Progress saves
        in this browser.
      </p>
      <button className="primary wide" onClick={close}>
        Back to Kitty
      </button>
    </Dialog>
  );
}
export function Picnic() {
  const mission = useGameStore((s) => s.mission),
    act = useGameStore((s) => s.missionAction),
    end = useGameStore((s) => s.endMission),
    [selected, setSelected] = useState<string | null>(null),
    [placed, setPlaced] = useState<Record<string, string>>({}),
    [hint, setHint] = useState(
      "Drag a gift to its cozy place, or tap a gift and then a spot.",
    );
  if (mission?.id !== "picnic") return null;
  const place = (item: string | null, spot: string) => {
    if (!item || Object.values(placed).includes(item)) return;
    const target = PICNIC_SPOTS.find((s) => s.id === spot);
    if (target?.item !== item) {
      setHint(
        `Try the ${PICNIC_SPOTS.find((s) => s.item === item)?.name.toLowerCase()}. There’s no rush.`,
      );
      return;
    }
    setPlaced({ ...placed, [spot]: item });
    setSelected(null);
    setHint(
      `${Object.keys(placed).length + 1} of 4 gifts in their cozy places.`,
    );
    act(0);
  };
  return (
    <Dialog title="A picnic for Nancy" onClose={end}>
      <span className="eyebrow">FOUR GIFTS, ONE COZY PICNIC</span>
      <h2>A picnic for Nancy</h2>
      <div className="picnic-spots">
        {PICNIC_SPOTS.map((s) => (
          <button
            key={s.id}
            data-picnic-slot={s.id}
            onClick={() => place(selected, s.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              place(e.dataTransfer.getData("text/plain"), s.id);
            }}
          >
            <span>
              {placed[s.id]
                ? (
                    {
                      teddy: "🧸",
                      flowers: "🌼",
                      strawberry: "🍓",
                      letter: "💌",
                    } as Record<string, string>
                  )[placed[s.id]]
                : s.icon}
            </span>
            <strong>{s.name}</strong>
          </button>
        ))}
      </div>
      <div className="picnic-items">
        {[
          ["teddy", "🧸"],
          ["strawberry", "🍓"],
          ["flowers", "🌼"],
          ["letter", "💌"],
        ].map(([id, icon]) => (
          <button
            key={id}
            draggable={!Object.values(placed).includes(id)}
            onDragStart={(e) => {
              setSelected(id);
              e.dataTransfer.setData("text/plain", id);
            }}
            data-picnic-item={id}
            aria-label={id}
            aria-pressed={selected === id}
            disabled={Object.values(placed).includes(id)}
            onClick={() => setSelected(id)}
          >
            {icon}
          </button>
        ))}
      </div>
      <p role="status">{hint}</p>
    </Dialog>
  );
}
export function Shelf() {
  const room = useGameStore((s) => s.room),
    select = useGameStore((s) => s.setFriend);
  return (
    <details className="shelf-panel">
      <summary>
        Your little shelf <small>{room.owned.length} of 6 friends</small>
      </summary>
      <p>Choose a friend to play with. Your shared outfit stays equipped.</p>
      <div className="collection-grid">
        {DOLLS.map((d) => (
          <button
            key={d.id}
            disabled={!room.owned.includes(d.id)}
            aria-pressed={room.selected === d.id}
            onClick={() => select(d.id)}
          >
            <span style={{ color: d.color }}>🎀</span>
            <strong>{d.short}</strong>
            <small>
              {room.owned.includes(d.id)
                ? "Your friend"
                : "Play a mission to unlock"}
            </small>
          </button>
        ))}
      </div>
    </details>
  );
}
