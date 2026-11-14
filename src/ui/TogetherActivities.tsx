import { useEffect, useRef, useState } from "react";
import { TogetherPreview } from "../scenes/TogetherPreview";
import { useVisitsStore } from "../game/visits";
import { useGameStore } from "../game/store";

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
  const s = useVisitsStore(),
    capture = useRef<(() => string) | null>(null),
    [closeup, setCloseup] = useState(true),
    [pose, setPose] = useState("wave"),
    [now, setNow] = useState(Date.now()),
    [photo, setPhoto] = useState(""),
    [notice, setNotice] = useState("");
  const rainSound = useGameStore((s) => s.cozy.rainSound);
  const captured = useRef(-1);
  useEffect(() => {
    setNow(Date.now());
    if (!s.together) return;
    const end = s.together.at - s.clockOffset + 7000;
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() > end) clearInterval(id);
    }, 200);
    return () => clearInterval(id);
  }, [s.together?.id]);
  const moment = s.together,
    elapsed = moment ? now + s.clockOffset - moment.at : 10000,
    countdown =
      moment?.action === "photo" && elapsed < 3000
        ? Math.max(1, Math.ceil((3000 - elapsed) / 1000))
        : 0,
    busy =
      !!moment &&
      elapsed <
        (moment.action === "stir" || moment.action === "decorate"
          ? 4000
          : 3600) &&
      moment.action !== "cancel",
    both = s.players.filter((p) => p.connected).length === 2,
    disabled = s.status !== "online" || !both;
  useEffect(() => {
    if (
      moment &&
      Date.now() + s.clockOffset - moment.at < 4500 &&
      moment.action !== "cancel"
    )
      setCloseup(false);
  }, [moment?.id]);
  useEffect(() => {
    if (moment?.action !== "photo" || elapsed >= 6000) return;
    setCloseup(false);
    setPose(moment.pose);
    if (
      elapsed >= 3000 &&
      elapsed < 6000 &&
      captured.current !== moment.id &&
      capture.current
    ) {
      captured.current = moment.id;
      try {
        void framedPhoto(capture.current())
          .then((image) => {
            setPhoto(image);
            setNotice(
              "Your photo is ready. Download it or keep it on Nancy’s wall.",
            );
          })
          .catch(() =>
            setNotice("The photo could not be made. Please try again."),
          );
      } catch {
        setNotice("The photo could not be made. Please try again.");
      }
    }
  }, [moment, elapsed]);
  const action = (kind: string) => {
    setCloseup(false);
    s.togetherAction(kind, pose);
  };
  const keep = async () => {
    const image = new Image();
    image.src = photo;
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
        id: crypto.randomUUID(),
        image: canvas.toDataURL("image/jpeg", 0.7),
        outfit: game.equipment.outfit,
        ...(game.equipment.plush ? { plush: game.equipment.plush } : {}),
        background: moment?.weather || "sunshine",
        pose: pose === "wave" ? "wave" : "still",
        place: "Together in Nancy’s village",
        createdAt: new Date().toISOString(),
      });
      setNotice("Kept on Nancy’s wall ♡");
    } catch {
      setNotice("This photo could not be kept. Please try again.");
    }
  };
  return (
    <section className="together-activities" aria-label="Time together">
      <TogetherPreview capture={capture} closeup={closeup} />
      <button onClick={() => setCloseup(!closeup)}>
        {closeup ? "See both of us" : "Look at my partner"}
      </button>
      {moment && ["wave", "highfive", "celebrate"].includes(moment.action) && (
        <p role="status">
          {moment.action === "highfive"
            ? "A high-five together ♡"
            : moment.action === "celebrate"
              ? "A celebration together ♡"
              : "A wave together ♡"}
        </p>
      )}
      <details className="together-options">
        <summary>Do something together ♡</summary>
        {!s.togetherAvailable ? (
          <p>
            The village service needs the together update before shared
            activities are available. Chat and invitations still work.
          </p>
        ) : (
          <>
            <div className="visit-emotes">
              <button
                disabled={disabled || busy}
                onClick={() => action("wave")}
              >
                Wave together
              </button>
              <button
                disabled={disabled || busy}
                onClick={() => action("highfive")}
              >
                High-five ♡
              </button>
              <button
                disabled={disabled || busy}
                onClick={() => action("celebrate")}
              >
                Celebrate together
              </button>
              {busy && (
                <button disabled={disabled} onClick={() => action("cancel")}>
                  Cancel reaction
                </button>
              )}
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
                  s.role !== "host" ||
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
                  s.role !== "guest" ||
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
                  s.role !== "host" ||
                  moment?.baking !== "ready"
                }
                onClick={() => action("present")}
              >
                Bring cookies to the picnic
              </button>
            </details>
            <details>
              <summary>A photo together</summary>
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
                disabled={disabled || busy}
                onClick={() => action("photo")}
              >
                Take our photo
              </button>
              {countdown > 0 && (
                <p role="status">Look at the camera… {countdown}</p>
              )}
              {photo && (
                <>
                  <a href={photo} download="Nancy-and-Melody.png">
                    Download our photo PNG
                  </a>
                  {s.role === "host" && (
                    <button onClick={() => void keep()}>
                      Keep on Nancy’s wall
                    </button>
                  )}
                </>
              )}
            </details>
            <label>
              Our atmosphere{" "}
              <select
                aria-label="Our atmosphere"
                value={moment?.weather || "sunshine"}
                disabled={disabled}
                onChange={(e) => s.togetherAction(e.target.value)}
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
      </details>
    </section>
  );
}
