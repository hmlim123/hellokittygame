import { useEffect, useRef, useState } from "react";
import { togetherDuration, villagePhoto } from "../game/village-together";
import { openVillageMarket, useVillageMotion, walkToVillageCompanion } from "../game/village-motion";
import { useVisitsStore, villagePartner } from "../game/visits";
import type { PostcardMemory } from "../game/cozy";
import { PostcardRoute, PostcardWalk } from "./PostcardWalk";
import { LanternEvening } from "./LanternEvening";
import { ClueTrail, ClueTrailRoute } from "./ClueTrail";
import { PetalMatch } from "./PetalMatch";
import { BenchTea } from "./BenchTea";
import { MarketInvitation } from "./VillageMarket";
import { useGameStore } from "../game/store";
import { visitTime } from "../game/visit-clock";
import { inVillagePhotoRange } from "../../shared/village-world.mjs";
import { atMarketSpot } from "../../shared/village-market.mjs";

type SharedPhoto = Omit<PostcardMemory, "image" | "place"> & {
  png: string;
};

async function framedPhoto(source: string) {
  const image = new Image();
  image.src = source;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 960;
  const c = canvas.getContext("2d");
  if (!c) throw Error("Photos are unavailable.");
  c.fillStyle = "#fff6e9";
  c.fillRect(0, 0, 800, 960);
  const scale = Math.min(752 / image.width, 760 / image.height);
  c.drawImage(
    image,
    (800 - image.width * scale) / 2,
    24 + (760 - image.height * scale) / 2,
    image.width * scale,
    image.height * scale,
  );
  c.fillStyle = "#935d7b";
  c.font = "italic 38px Georgia";
  c.textAlign = "center";
  c.fillText("A little time together ♡", 400, 860);
  return canvas.toDataURL("image/png");
}
export function TogetherActivities() {
  const moment = useVisitsStore((s) => s.together),
    role = useVisitsStore((s) => s.role),
    roomId = useVisitsStore((s) => s.roomId),
    clockOffset = useVisitsStore((s) => s.clockOffset),
    status = useVisitsStore((s) => s.status),
    available = useVisitsStore((s) => s.togetherAvailable),
    togetherAction = useVisitsStore((s) => s.togetherAction),
    [pose, setPose] = useState("wave"),
    [now, setNow] = useState(visitTime),
    [photo, setPhoto] = useState<SharedPhoto | null>(null),
    [notice, setNotice] = useState("");
  const rainSound = useGameStore((s) => s.cozy.rainSound);
  const benchOccupied = useVisitsStore((s) => !!(s.benchTea?.seated.host || s.benchTea?.seated.guest));
  const clueWaiting = useVisitsStore((s) => {
    const trail = s.clueTrail;
    if (!trail?.partnerShared || trail.destination || trail.ownGuess) return null;
    return trail.ownShared ? "Choose a clue trail landmark" : "Read your partner’s clue";
  });
  const petalWaiting = useVisitsStore((s) => !!s.petalMatch?.partnerReady && !s.petalMatch.own);
  const marketAvailable = useVisitsStore((s) => !!s.villageMarket);
  const atStall = useVisitsStore((s) => {
    const player = s.players.find((p) => p.id === s.role);
    return !!player && atMarketSpot(player, player.id);
  });
  const options = useRef<HTMLDetailsElement>(null);
  const cluePanel = useRef<HTMLDetailsElement>(null);
  const petalPanel = useRef<HTMLDetailsElement>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const marketPanel = useVillageMotion((s) => s.marketPanel);
  const marketOpen = marketPanel === "open";
  const sceneReady = useGameStore((s) => s.sceneReady);
  const photoPartner = useVisitsStore(villagePartner);
  const nearForPhoto = useVisitsStore((s) => {
    const visitor = villagePartner(s);
    const own = s.players.find((p) => p.id === s.role);
    return !!visitor && !!own && inVillagePhotoRange(own, visitor);
  });
  const photoKept = useGameStore((s) =>
    !!photo && s.cozy.postcards.some((p) => p.id === photo.id),
  );
  const captured = useRef<number | null>(null);
  useEffect(() => {
    setNow(visitTime());
    if (!moment) return;
    const end =
      moment.at -
      useVisitsStore.getState().clockOffset +
      togetherDuration(moment.action) * 1000 +
      150;
    if (visitTime() >= end) return;
    const timer = setInterval(() => {
      const current = visitTime();
      setNow(current);
      if (current >= end) clearInterval(timer);
    }, 100);
    return () => clearInterval(timer);
  }, [moment?.at, moment?.action]);
  const elapsed = moment ? (now + clockOffset - moment.at) / 1000 : Infinity;
  const countdown =
    moment?.action === "photo" && elapsed < 3
      ? Math.min(3, Math.max(1, Math.ceil(3 - elapsed)))
      : 0;
  const busy =
    !!moment &&
    moment.action !== "cancel" &&
    elapsed < togetherDuration(moment.action);
  const disabled = status !== "online";
  useEffect(() => {
    if (
      moment?.action !== "photo" ||
      !roomId ||
      elapsed < 3 ||
      elapsed >= 6 ||
      captured.current === moment.at ||
      !villagePhoto.capture
    )
      return;
    const capturePhoto = villagePhoto.capture;
    captured.current = moment.at;
    setPose(moment.pose);
    const { at, pose: framePose, weather } = moment;
    const { outfit, plush } = useGameStore.getState().equipment;
    const frame: Omit<SharedPhoto, "png"> = {
      id: `village-photo-${roomId}-${at}`,
      outfit,
      ...(plush ? { plush } : {}),
      background: weather,
      pose: framePose,
      createdAt: new Date().toISOString(),
    };
    async function capture() {
      try {
        const png = await framedPhoto(capturePhoto());
        if (captured.current !== at) return;
        setPhoto({ ...frame, png });
        setNotice(
          role === "host"
            ? "Your photo is ready to download or keep on Nancy’s wall."
            : "Your photo is ready to download.",
        );
      } catch {
        if (captured.current === at)
          setNotice("The photo could not be made. Please try again.");
      }
    }
    void capture();
  }, [moment, elapsed, role, roomId]);
  const action = (kind: string) => {
    useVillageMotion.getState().stop();
    togetherAction(kind, pose);
  };
  const keep = async () => {
    if (!photo || photoKept || role !== "host") return;
    const { png, ...frame } = photo;
    const image = new Image();
    image.src = png;
    try {
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 150;
      canvas.height = 180;
      const c = canvas.getContext("2d");
      if (!c) throw Error("Photo unavailable");
      c.fillStyle = "#fff6e9";
      c.fillRect(0, 0, 150, 180);
      const crop = Math.min(image.width, image.height);
      c.drawImage(
        image,
        (image.width - crop) / 2,
        (image.height - crop) / 2,
        crop,
        crop,
        5,
        5,
        140,
        140,
      );
      c.fillStyle = "#935d7b";
      c.font = "12px Georgia";
      c.fillText("A little time together ♡", 10, 165);
      const game = useGameStore.getState();
      game.keepPostcard({
        ...frame,
        image: canvas.toDataURL("image/jpeg", 0.7),
        place: "Together in Nancy’s village",
      });
      if (!useGameStore.getState().cozy.postcards.some((p) => p.id === frame.id))
        throw Error("Photo could not be saved");
      setNotice("Kept on Nancy’s wall ♡");
    } catch {
      setNotice("This photo could not be kept. Please try again.");
    }
  };
  const baking = moment?.baking;
  const nextBakingAction =
    role === "guest" && baking === "decorate"
      ? "decorate"
      : role === "host" && baking === "ready"
        ? "present"
        : null;
  function openPendingActivity() {
    const menu = options.current;
    const panel = clueWaiting ? cluePanel.current : petalPanel.current;
    if (!menu || !panel) return;
    menu.open = true;
    panel.open = true;
    requestAnimationFrame(() => {
      const summary = panel.querySelector("summary");
      summary?.focus({ preventScroll: true });
      summary?.scrollIntoView({ block: "nearest" });
    });
  }
  return (
    <section className="together-activities" aria-label="Time together">
      <div className="village-social-buttons">
        <button
          disabled={disabled || busy || !available || benchOccupied}
          aria-label="Dance together"
          onClick={() => action("celebrate")}
        >
          Dance
        </button>
        {busy && (
          <button disabled={disabled} onClick={() => action("cancel")}>
            Stop
          </button>
        )}
      </div>
      {nextBakingAction && available && !busy && !benchOccupied && (
        <button
          className="baking-turn"
          disabled={disabled}
          onClick={() => action(nextBakingAction)}
        >
          {nextBakingAction === "decorate" ? "Decorate cookies" : "Present cookies"}
        </button>
      )}
      {available && !optionsOpen && (clueWaiting || petalWaiting) && (
        <button className="activity-turn" disabled={disabled} onClick={openPendingActivity}>
          {clueWaiting || "Pick your petal"}
        </button>
      )}
      {marketAvailable && atStall && !optionsOpen && !marketOpen && (
        <button className="activity-turn" onClick={openVillageMarket}>Open market stall</button>
      )}
      {marketPanel === "approaching" && <span className="village-social-status" role="status">Walking to the market…</span>}
      {!marketOpen && !optionsOpen && <MarketInvitation />}
      {busy && moment?.action === "highfive" && (
        <span className="village-social-status" role="status">
          High-five!
        </span>
      )}
      {countdown > 0 && (
        <span className="village-social-status" role="status">
          Photo in {countdown}…
        </span>
      )}
      <PostcardRoute />
      <ClueTrailRoute />
      <details ref={options} className="together-options" onToggle={(event) => {
        if (event.target === event.currentTarget) setOptionsOpen(event.currentTarget.open);
      }}>
        <summary>Activities</summary>
        <div>
          {!available ? (
            <p>
              The village service needs the together update before shared
              activities are available. Chat and invitations still work.
            </p>
          ) : (
            <>
              {optionsOpen && !marketOpen && <MarketInvitation />}
              {marketAvailable && (
                <button onClick={() => {
                  if (options.current) options.current.open = false;
                  openVillageMarket();
                }}>Little Village Market</button>
              )}
              {benchOccupied && <p>Stand up from the bench together to dance, bake, or take a photo.</p>}
              <div className="visit-emotes">
                <button
                  disabled={disabled || busy || benchOccupied}
                  onClick={() => action("wave")}
                >
                  Wave together
                </button>
                <button
                  disabled={disabled || busy || benchOccupied}
                  onClick={() => action("highfive")}
                >
                  High-five ♡
                </button>
              </div>
              <details>
                <summary>Bake together</summary>
                <p>
                  {moment?.baking === "decorate"
                    ? "My Melody decorates the cookies."
                    : moment?.baking === "ready"
                      ? "Nancy, bring your cookies to the picnic."
                      : "Nancy mixes, then My Melody decorates. No timer, no rush."}
                </p>
                <button
                  disabled={
                    disabled ||
                    busy ||
                    benchOccupied ||
                    role !== "host" ||
                    (!!moment && moment.baking !== "mix")
                  }
                  onClick={() => action("stir")}
                >
                  Nancy mixes
                </button>
                <button
                  disabled={
                    disabled ||
                    busy ||
                    benchOccupied ||
                    role !== "guest" ||
                    moment?.baking !== "decorate"
                  }
                  onClick={() => action("decorate")}
                >
                  Melody decorates
                </button>
                <button
                  disabled={
                    disabled ||
                    busy ||
                    benchOccupied ||
                    role !== "host" ||
                    moment?.baking !== "ready"
                  }
                  onClick={() => action("present")}
                >
                  Bring cookies to the picnic
                </button>
              </details>
              <details>
                <summary>A photo together</summary>
                {!nearForPhoto && photoPartner && (
                  <button
                    disabled={disabled || busy || !sceneReady || benchOccupied}
                    onClick={() => walkToVillageCompanion(photoPartner)}
                  >
                    Walk to {photoPartner.name} for the photo
                  </button>
                )}
                <label>
                  Our pose{" "}
                  <select
                    aria-label="Our pose"
                    value={pose}
                    disabled={busy}
                    onChange={(e) => setPose(e.target.value)}
                  >
                    <option value="wave">Wave</option>
                    <option value="lean">Lean together</option>
                    <option value="still">Stand together</option>
                  </select>
                </label>
                <button
                  disabled={disabled || busy || !nearForPhoto || benchOccupied}
                  onClick={() => action("photo")}
                >
                  Take our photo
                </button>
                {photo && (
                  <>
                    <a href={photo.png} download="Nancy-and-Melody.png">
                      Download our photo PNG
                    </a>
                    {role === "host" && (
                      <button disabled={photoKept} onClick={() => void keep()}>
                        Keep on Nancy’s wall
                      </button>
                    )}
                  </>
                )}
              </details>
              <PostcardWalk />
              <LanternEvening />
              <ClueTrail panelRef={cluePanel} />
              <PetalMatch panelRef={petalPanel} />
              <BenchTea busy={busy} />
              <label>
                Our atmosphere{" "}
                <select
                  aria-label="Our atmosphere"
                  value={moment?.weather || "sunshine"}
                  disabled={disabled}
                  onChange={(e) => togetherAction(e.target.value)}
                >
                  <option value="sunshine">Sunshine</option>
                  <option value="sunset">Sunset</option>
                  <option value="rain">Gentle rain</option>
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={rainSound}
                  onChange={(e) => {
                    const g = useGameStore.getState();
                    g.setWeather(g.cozy.weather, e.target.checked);
                  }}
                />{" "}
                Gentle rain sounds (turn Sound on)
              </label>
              {notice && <p role="status">{notice}</p>}
            </>
          )}
        </div>
      </details>
    </section>
  );
}
