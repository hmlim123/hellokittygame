import { nearbyItemAction } from "./game/context-action";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Storybook, StarsPanel } from "./ui/StoryPanels";
const PhotoCorner = lazy(() => import("./scenes/PhotoCorner"));
const MoonPicnic = lazy(() => import("./scenes/MoonPicnic"));
const Stage = lazy(() =>
  import("./scenes/Stage").then((m) => ({ default: m.Stage })),
);
import { assetUrl } from "./game/assets";
import { useGameStore } from "./game/store";
import { directions, MAPS } from "./game/domain";
import { DirectionPad } from "./ui/DirectionPad";
import { QuestGuide } from "./ui/QuestGuide";
import { DirectionKeys, directionForKey } from "./game/direction-keys";
import { Inventory } from "./ui/Inventory";
import { Dialog } from "./ui/Dialog";
import {
  LetterPanel,
  MissionsPanel,
  Picnic,
  SettingsPanel,
  Shelf,
  TogetherPanel,
} from "./ui/Panels";
import { RoomSound } from "../dist/sound.js";
function useNavigation() {
  const mode = useGameStore((s) => s.mode),
    base = useMemo(() => new URL(import.meta.env.BASE_URL, location.href), []);
  useEffect(() => {
    const path = mode === "adventure" ? new URL("adventure.html", base) : base;
    if (path.pathname !== location.pathname)
      history.pushState({}, "", path.pathname + location.search);
  }, [mode, base]);
  useEffect(() => {
    const onPop = () =>
      useGameStore
        .getState()
        .setMode(
          location.pathname.endsWith("adventure.html") ? "adventure" : "room",
        );
    addEventListener("popstate", onPop);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "kitty-world-v2") void useGameStore.persist.rehydrate();
    };
    const resume = () => {
      if (!document.hidden) void useGameStore.persist.rehydrate();
    };
    addEventListener("storage", onStorage);
    addEventListener("pageshow", resume);
    addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      removeEventListener("popstate", onPop);
      removeEventListener("storage", onStorage);
      removeEventListener("pageshow", resume);
      removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);
}
function useGameLoop() {
  useEffect(() => {
    let frame = 0,
      last = performance.now();
    const loop = (now: number) => {
      useGameStore.getState().tick((now - last) / 1000);
      last = now;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    const hidden = () => {
      const s = useGameStore.getState();
      if (document.hidden && s.mission && !s.mission.paused) s.pauseMission();
    };
    const pause = (e: KeyboardEvent) => {
      const s = useGameStore.getState();
      if (
        e.key === "Escape" &&
        s.mission &&
        s.mission.id !== "picnic" &&
        !s.panel
      ) {
        e.preventDefault();
        s.pauseMission();
      }
    };
    document.addEventListener("keydown", pause);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", hidden);
      document.removeEventListener("keydown", pause);
    };
  }, []);
}
function useAdventureInput() {
  useEffect(() => {
    const keys = new DirectionKeys();
    const down = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useGameStore.getState();
      if (s.mode !== "adventure" || s.panel || s.dialogue || !s.sceneReady)
        return;
      if (
        e.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)
      )
        return;
      const dir = directionForKey(e);
      if (dir) {
        e.preventDefault();
        if (!e.repeat) {
          const next = keys.press(e);
          if (next) s.holdMove(next);
        }
      } else if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        if (nearbyItemAction(s.adventure)) s.useNearbyItem();
        else s.interact();
      } else if (
        (e.key === "Enter" || e.key === " ") &&
        !(e.target instanceof HTMLButtonElement)
      ) {
        e.preventDefault();
        s.interact();
      }
    };
    const up = (e: KeyboardEvent) => {
      const next = keys.release(e),
        s = useGameStore.getState();
      // A still-held key resumes after the buffered tap, without erasing it.
      if (next) s.holdMove(next, { restore: true });
      else if (next === null) s.releaseMove(directionForKey(e));
    };
    const blur = () => {
      keys.clear();
      useGameStore.getState().releaseMove();
    };
    const canWalk = (s: ReturnType<typeof useGameStore.getState>) =>
      s.mode === "adventure" && !s.panel && !s.dialogue && s.sceneReady;
    const unsubscribe = useGameStore.subscribe((s, prev) => {
      if (canWalk(prev) && !canWalk(s)) blur();
    });
    const visibility = () => {
      if (document.hidden) blur();
    };
    document.addEventListener("visibilitychange", visibility);
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    addEventListener("blur", blur);
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", visibility);
      blur();
      removeEventListener("keydown", down);
      removeEventListener("keyup", up);
      removeEventListener("blur", blur);
    };
  }, []);
}
function MissionHUD() {
  const mission = useGameStore((s) => s.mission),
    pause = useGameStore((s) => s.pauseMission),
    replay = useGameStore((s) => s.replayMemory),
    end = useGameStore((s) => s.endMission);
  if (!mission || mission.id === "picnic") return null;
  return (
    <>
      <div className="mission-hud">
        <span>
          <b>{mission.hits}</b> / {mission.goal}{" "}
          {mission.id === "bows"
            ? "bows"
            : mission.id === "strawberries"
              ? "berries"
              : "hearts"}
        </span>
        <span>
          {mission.id === "hearts"
            ? mission.phase === "show"
              ? "Watch…"
              : "Your turn"
            : mission.relaxed
              ? "No timer"
              : `0:${String(Math.ceil(mission.time || 0)).padStart(2, "0")}`}
        </span>
        {mission.id === "hearts" && (
          <button onClick={replay}>Watch again</button>
        )}
        <button onClick={pause}>Pause</button>
        <button onClick={end}>Finish early</button>
      </div>
      {mission.paused && (
        <div className="pause-overlay">
          <h2>A little pause.</h2>
          <button className="primary" onClick={pause}>
            Keep playing
          </button>
        </div>
      )}
    </>
  );
}
function Notification() {
  const notice = useGameStore((s) => s.notice),
    clear = useGameStore((s) => s.clearNotice);
  useEffect(() => {
    if (!notice || notice.rewardOutfit) return;
    const timer = setTimeout(() => clear(notice.id), 7000);
    return () => clearTimeout(timer);
  }, [notice, clear]);
  if (!notice) return null;
  return (
    <aside
      className={`notification ${notice.art ? "illustrated" : ""} ${notice.rewardOutfit ? "reward-notification" : ""}`}
      role="status"
    >
      {notice.art && !notice.rewardOutfit && (
        <img alt="" src={assetUrl(`assets/quest/${notice.art}.svg`)} />
      )}
      <div>
        {notice.rewardOutfit && <button className="dismiss-notice" aria-label="Keep exploring" onClick={() => clear(notice.id)}>×</button>}
        <small>{notice.art ? "A LITTLE DISCOVERY" : "A LITTLE MOMENT"}</small>
        <h3>{notice.title}</h3>
        <p>{notice.text}</p>
        {notice.rewardOutfit && (
          <div className="earned-reward" data-reward={notice.rewardOutfit}>
            <img alt="Blossom keepsake dress" src={assetUrl("assets/inventory/blossom.svg")} />
            <div>
              <strong>You earned Blossom keepsake ♡</strong>
              <p>A flower dress to wear here or at home. Your room has a new flower memory, too.</p>
              <div className="reward-actions">
                <button onClick={() => {
                  const s = useGameStore.getState();
                  s.equip("outfit", notice.rewardOutfit!);
                  s.setMode("room");
                }}>Try it at home</button>
                <button onClick={() => {
                  useGameStore.getState().equip("outfit", notice.rewardOutfit!);
                  clear(notice.id);
                }}>Wear it here</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
function AdventureControls() {
  const state = useGameStore((s) => s.adventure),
    interact = useGameStore((s) => s.interact),
    ready = useGameStore((s) => s.sceneReady),
    moving = useGameStore((s) => s.moving);
  const action = nearbyItemAction(state);
  return (
    <div className="adventure-controls">
      <DirectionPad />
      <p>
        Arrow keys or WASD to walk.
        <br />
        Walk up to friends and treasure to discover them.
      </p>
      <div className="adventure-action-stack">
        {action && (
          <button
            className="primary context-action"
            disabled={!ready || moving}
            aria-keyshortcuts="E"
            aria-label={action.label}
            onClick={() => useGameStore.getState().useNearbyItem()}
          >
            {action.label} <kbd aria-hidden="true">E</kbd>
          </button>
        )}
        <button
          className={action ? "text-button" : "primary"}
          disabled={!ready || moving}
          onClick={() => interact()}
        >
          Talk / inspect ♡
        </button>
      </div>
      <span className="sr-only">
        Kitty is at {state.x}, {state.z}
      </span>
    </div>
  );
}
export default function App() {
  useNavigation();
  useGameLoop();
  useAdventureInput();
  const greeted = useRef(false);
  useEffect(() => {
    if (!greeted.current) {
      greeted.current = true;
      useGameStore.getState().greet();
    }
  }, []);
  const mode = useGameStore((s) => s.mode),
    panel = useGameStore((s) => s.panel),
    ready = useGameStore((s) => s.sceneReady),
    open = useGameStore((s) => s.openPanel),
    react = useGameStore((s) => s.react),
    setMode = useGameStore((s) => s.setMode),
    quest = useGameStore((s) => s.adventure),
    mission = useGameStore((s) => s.mission),
    dialogue = useGameStore((s) => s.dialogue),
    result = useGameStore((s) => s.result),
    saveFailed = useGameStore((s) => s.saveFailed);
  const [soundOn, setSoundOn] = useState(false),
    sound = useMemo(() => new RoomSound(), []),
    notice = useGameStore((s) => s.notice);
  const stepPulse = useGameStore((s) => s.stepPulse),
    effect = useGameStore((s) => s.effect);
  useEffect(() => {
    if (stepPulse) sound.footstep();
  }, [stepPulse, sound]);
  useEffect(() => {
    if (!effect) return;
    const timer = setTimeout(
      () => useGameStore.getState().clearEffect(effect.id),
      effect.duration * 1000,
    );
    return () => clearTimeout(timer);
  }, [effect]);
  useEffect(() => () => sound.stop(), [sound]);
  useEffect(() => {
    if (notice) sound.chime(notice.art ? "arrival" : "catch");
  }, [notice, sound]);
  useEffect(() => {
    const visibility = () =>
      document.hidden ? sound.suspend() : sound.resume();
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, [sound]);
  const toggleSound = (enabled: boolean) => {
    if (sound.enabled === enabled) return;
    void sound.toggle().then(setSoundOn);
  };
  return (
    <main>
      <header>
        <button
          className="brand"
          onClick={() => setMode("room")}
          aria-label="Hello Kitty home"
        >
          <span className="brand-bow">🎀</span>
          <span>
            hello kitty<small>A LITTLE GIFT FOR NANCY</small>
          </span>
        </button>
        <div className="header-actions">
          {mode === "adventure" && (
            <button className="text-button" onClick={() => setMode("room")}>
              ← Her room
            </button>
          )}
          <button onClick={() => open("settings")} aria-label="Game settings">
            ⚙
          </button>
          <button
            id="openWardrobe"
            disabled={!ready || !!mission}
            onClick={() => open("inventory")}
          >
            Inventory ♡
          </button>
        </div>
      </header>
      <section className="intro">
        <span className="eyebrow">
          {mode === "room"
            ? "SLOW DAYS. SMALL JOYS."
            : "A LITTLE STORY, JUST FOR NANCY"}
        </span>
        <h1>
          {mode === "room" ? (
            <>
              Nancy’s little <em>happy place.</em>
            </>
          ) : (
            <>
              {quest.map === "glade" ? "Butterfly" : "Moonflower"}{" "}
              <em>{quest.map === "glade" ? "Glade." : "Adventure."}</em>
            </>
          )}
        </h1>
        {mode === "room" ? (
          <p>Little adventures, sweet surprises, and a room made just for you.</p>
        ) : <QuestGuide />}
      </section>
      <section className="room-card">
        <div className="scene-container">
          <Suspense
            fallback={
              <div className="stage">
                <div className="scene-loading" role="status">
                  Getting your little world ready…
                </div>
              </div>
            }
          >
            <Stage />
          </Suspense>
          <span className="scene-label">
            {mode === "room" ? "KITTY’S LITTLE ROOM ♡" : MAPS[quest.map].title}
          </span>
          <div className="scene-tools">
            <button
              aria-label={soundOn ? "Turn sound off" : "Turn sound on"}
              aria-pressed={soundOn}
              onClick={() => toggleSound(!soundOn)}
            >
              ♫ {soundOn ? "On" : "Off"}
            </button>
            {mode === "room" && (
              <button
                id="resetCamera"
                onClick={() => useGameStore.getState().resetCamera()}
                disabled={!!mission}
              >
                Reset view ↺
              </button>
            )}
          </div>
          <MissionHUD />
          <Notification />
          {mode === "room" ? (
            <span className="scene-hint">
              Tap Kitty to play · Drag for a 360° view
            </span>
          ) : (
            directions(quest) && (
              <button
                className="wayfinder"
                aria-label="Open quest map"
                onClick={() => useGameStore.getState().openQuestMap()}
              >
                {directions(quest)} <span aria-hidden="true">⌖</span>
              </button>
            )
          )}
        </div>
        {mode === "room" ? (
          <div className="action-bar">
            <button
              id="wave"
              disabled={!ready || !!mission}
              onClick={() => react("wave")}
            >
              <span>♡</span>
              <strong>Wave hello</strong>
              <small>A paw &amp; a wink</small>
            </button>
            <button
              id="dance"
              disabled={!ready || !!mission}
              onClick={() => react("dance")}
            >
              <span>♫</span>
              <strong>Little dance</strong>
              <small>A happy wiggle</small>
            </button>
            <button
              id="startHunt"
              disabled={!ready || !!mission}
              onClick={() => open("missions")}
            >
              <span>✧</span>
              <strong>Play a mission</strong>
              <small>Missions &amp; little adventures</small>
            </button>
          </div>
        ) : (
          <AdventureControls />
        )}
      </section>
      {mode === "room" ? (
        <>
          <p className="room-message">
            No rush, Nancy. This little happy place is yours. ♡{" "}
            <button
              className="inline-button"
              onClick={() => open("together")}
              disabled={!ready || !!mission}
            >
              Play together ↗
            </button>
          </p>
          {saveFailed && (
            <p className="save-note" role="status">
              Saving unavailable. Keep this tab open to continue.
            </p>
          )}
          <Shelf />
        </>
      ) : (
        <p className="save-note">
          {saveFailed
            ? "Saving unavailable. Keep this tab open to continue."
            : "A gentle adventure. Your steps and discoveries save automatically."}
        </p>
      )}
      <footer>Unofficial fan-made gift · Hello Kitty © Sanrio</footer>
      {panel === "storybook" && <Storybook />}
      {panel === "stars" && <StarsPanel />}
      <Suspense fallback={null}>
        {panel === "photo" && <PhotoCorner />}
        {panel === "ending" && <MoonPicnic />}
      </Suspense>
      {panel === "inventory" && <Inventory />}
      {panel === "missions" && <MissionsPanel />}
      {panel === "together" && <TogetherPanel />}
      {panel === "letter" && <LetterPanel />}
      {panel === "settings" && (
        <SettingsPanel sound={soundOn} setSound={toggleSound} />
      )}
      {mission?.id === "picnic" && <Picnic />}
      {dialogue && (
        <Dialog
          title={dialogue.speaker}
          onClose={() => useGameStore.getState().closeDialogue()}
        >
          <span className="eyebrow">A LITTLE MOMENT</span>
          {dialogue.art && (
            <img
              className="story-image"
              alt=""
              src={assetUrl(`assets/quest/${dialogue.art}.svg`)}
            />
          )}
          <h2>{dialogue.speaker}</h2>
          <p>{dialogue.text}</p>
          {dialogue.complete && (
            <p>
              Your Moonlight dress is unlocked. More little quests are waiting
              in Inventory → Quest.
            </p>
          )}
          <div className="story-choices">
            {dialogue.choices?.map((c) => (
              <button
                key={c.id}
                onClick={() => useGameStore.getState().interact(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <button
            className="primary wide"
            onClick={() => useGameStore.getState().closeDialogue()}
          >
            Keep exploring
          </button>
          {dialogue.complete && (
            <button className="wide" onClick={() => setMode("room")}>
              Back to Nancy’s room ♡
            </button>
          )}
        </Dialog>
      )}
      {result && (
        <Dialog
          title={result.title}
          onClose={() => useGameStore.getState().closeResult()}
        >
          <span className="result-heart">♡</span>
          <h2>{result.title}</h2>
          <p>{result.text}</p>
          <button
            className="primary wide"
            onClick={() => useGameStore.getState().closeResult()}
          >
            Back to Kitty
          </button>
        </Dialog>
      )}
    </main>
  );
}
