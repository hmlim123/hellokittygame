import { useState, useId, lazy, Suspense } from "react";
import { useGameStore } from "../game/store";
import {
  COOKIE_SHAPES,
  ICINGS,
  DECORATIONS,
  FRIENDS,
  type Cookie,
  type Decoration,
} from "../game/cozy";
import { OUTFITS } from "../game/domain";
import { Dialog } from "./Dialog";
const TeaPreview = lazy(() => import("../scenes/TeaParty"));
const icingColors = { rose: "#efb6cb", honey: "#f5df9f", lavender: "#cec0e8" };
const icons = { heart: "♥", star: "★", berry: "🍓" };
const names = { kitty: "Kitty", momo: "Momo", pip: "Pip" };
export function CookieArt({ cookie }: { cookie: Cookie }) {
  const clip = useId();
  const path =
    cookie.shape === "heart"
      ? "M50 84C42 77 13 58 18 36C23 16 44 18 50 32C59 16 80 19 83 36C89 58 61 78 50 84Z"
      : cookie.shape === "star"
        ? "M50 13L61 37L87 40L67 58L73 84L50 71L27 84L33 58L13 40L39 37Z"
        : "M50 15A35 35 0 1 1 49.99 15Z";
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${cookie.icing} ${cookie.shape} cookie with ${cookie.stamps.length} decorations`}
    >
      <defs>
        <clipPath id={clip}>
          <path d={path} />
        </clipPath>
      </defs>
      <ellipse cx="50" cy="88" rx="31" ry="4" fill="#c89c8933" />
      <path d={path} fill="#e2b87f" stroke="#c59764" strokeWidth="2" />
      {cookie.stage !== "shape" && (
        <path
          d={path}
          fill={icingColors[cookie.icing]}
          transform="translate(5 5) scale(.9)"
        />
      )}
      <g clipPath={`url(#${clip})`}>
        {cookie.stamps.map((s, i) => (
          <text
            key={i}
            x={s.x}
            y={s.y + 3}
            textAnchor="middle"
            fontSize="9"
            fill={s.kind === "star" ? "#fff4c9" : "#b9517a"}
          >
            {icons[s.kind]}
          </text>
        ))}
      </g>
    </svg>
  );
}
export function BakingPanel() {
  const cozy = useGameStore((s) => s.cozy),
    c = cozy.cookie,
    close = useGameStore((s) => s.closePanel);
  const [stamp, setStamp] = useState<Decoration>("heart"),
    [friend, setFriend] = useState(c.friend);
  const s = useGameStore.getState;
  const step = { shape: 1, decorate: 2, give: 3, served: 3 }[c.stage];
  return (
    <Dialog
      title="Bake cookies with Kitty"
      onClose={close}
      className="baking-dialog"
    >
      <span className="eyebrow">A LITTLE LOVE, FRESHLY BAKED</span>
      <h2>Bake cookies with Kitty</h2>
      <p>
        No timer, no mistakes. Choose a shape, decorate it, and make a friend
        smile.
      </p>
      <ol className="cozy-steps" aria-label="Cookie steps">
        {["Choose", "Decorate", "Give"].map((label, i) => (
          <li key={label} aria-current={step === i + 1 ? "step" : undefined}>
            {i + 1}. {label}
          </li>
        ))}
      </ol>
      <div className="cookie-worktop">
        {c.stage === "decorate" ? (
          <button
            className="cookie-art"
            aria-label="Add selected decoration to cookie"
            disabled={c.stamps.length >= 12}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pointer = e.detail !== 0;
              s().stampCookie(
                stamp,
                pointer
                  ? ((e.clientX - rect.left) / rect.width) * 100
                  : undefined,
                pointer
                  ? ((e.clientY - rect.top) / rect.height) * 100
                  : undefined,
              );
            }}
          >
            <CookieArt cookie={c} />
          </button>
        ) : (
          <div className="cookie-art">
            <CookieArt cookie={c} />
          </div>
        )}
        <p role="status">
          {c.stage === "shape"
            ? "What little shape shall we bake?"
            : c.stage === "decorate"
              ? `${c.stamps.length} of 12 decorations. Tap the cookie or add a sprinkle below.`
              : c.stage === "give"
                ? "A little gift tastes sweeter when shared."
                : `${names[c.friend]} holds your cookie close. “You made this for me? Thank you, Nancy!” ♡`}
        </p>
      </div>
      {c.stage === "shape" && (
        <>
          <fieldset>
            <legend>Choose a cookie cutter</legend>
            <div className="photo-options">
              {COOKIE_SHAPES.map((shape) => (
                <button
                  key={shape}
                  aria-pressed={c.shape === shape}
                  onClick={() => s().shapeCookie(shape)}
                >
                  {shape[0].toUpperCase() + shape.slice(1)}
                </button>
              ))}
            </div>
          </fieldset>
          <button
            className="primary wide"
            onClick={() => s().cookieStage("decorate")}
          >
            Bake & decorate →
          </button>
        </>
      )}
      {c.stage === "decorate" && (
        <>
          <fieldset>
            <legend>A little icing</legend>
            <div className="photo-options">
              {ICINGS.map((icing) => (
                <button
                  key={icing}
                  aria-pressed={c.icing === icing}
                  onClick={() => s().iceCookie(icing)}
                >
                  {icing[0].toUpperCase() + icing.slice(1)} icing
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Pick a sprinkle</legend>
            <div className="photo-options">
              {DECORATIONS.map((kind) => (
                <button
                  key={kind}
                  aria-pressed={stamp === kind}
                  disabled={c.stamps.length >= 12}
                  onClick={() => {
                    setStamp(kind);
                    s().stampCookie(kind);
                  }}
                >
                  Add a {kind} {icons[kind]}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="memory-actions">
            <button onClick={() => s().cookieStage("shape")}>
              Change shape
            </button>
            <button
              className="primary"
              disabled={!c.stamps.length}
              onClick={() => s().cookieStage("give")}
            >
              Ready to give →
            </button>
          </div>
        </>
      )}
      {c.stage === "give" && (
        <>
          <fieldset>
            <legend>Who is your cookie for?</legend>
            <div className="photo-options">
              {FRIENDS.map((id) => (
                <button
                  key={id}
                  aria-pressed={friend === id}
                  onClick={() => setFriend(id)}
                >
                  {names[id]} {id === "pip" ? "🐰" : id === "momo" ? "🎀" : "♡"}
                </button>
              ))}
            </div>
          </fieldset>
          {cozy.tea.leaves && !cozy.tea.baked && (
            <p className="small-note">
              Momo is hoping for a cookie for your moonlight tea party.
            </p>
          )}
          <div className="memory-actions">
            <button onClick={() => s().cookieStage("decorate")}>
              Add more love
            </button>
            <button className="primary" onClick={() => s().giveCookie(friend)}>
              Give cookie to {names[friend]} ♡
            </button>
          </div>
        </>
      )}
      {c.stage === "served" && (
        <div className="memory-actions">
          <button
            onClick={() => {
              s().newCookie();
              setFriend("momo");
            }}
          >
            Bake another cookie
          </button>
          {cozy.tea.baked && !cozy.tea.complete && (
            <button onClick={() => s().startTea()}>
              Visit the tea table ↗
            </button>
          )}
          <button className="primary" onClick={close}>
            Back to Kitty
          </button>
        </div>
      )}
      <p className="small-note">
        Your cookie saves as you go. {cozy.cookiesGiven} little gifts shared.
      </p>
    </Dialog>
  );
}
export function KeepsakePanel() {
  const postcards = useGameStore((s) => s.cozy.postcards),
    requested = useGameStore((s) => s.memoryPage),
    close = useGameStore((s) => s.closePanel);
  const [selected, setSelected] = useState(requested || postcards[0]?.id);
  const p = postcards.find((p) => p.id === selected) || postcards[0];
  return (
    <Dialog
      title="Nancy’s keepsake wall"
      onClose={close}
      className="keepsake-dialog"
    >
      <span className="eyebrow">LITTLE DAYS, LOVINGLY KEPT</span>
      <h2>Nancy’s keepsake wall</h2>
      <p>
        Your six most recent postcards live here and in Kitty’s room. Keep the
        downloaded PNGs for your own album.
      </p>
      {p ? (
        <>
          <article className="postcard-memory">
            <img src={p.image} alt={`For Nancy: ${p.background}`} />
            <div>
              <h3>For Nancy ♡</h3>
              <dl>
                <dt>Outfit</dt>
                <dd>{OUTFITS.find((o) => o.id === p.outfit)?.name}</dd>
                <dt>Where</dt>
                <dd>{p.place}</dd>
                <dt>Atmosphere</dt>
                <dd>{p.background}</dd>
                <dt>Pose</dt>
                <dd>{p.pose}</dd>
                <dt>Made on</dt>
                <dd>
                  <time dateTime={p.createdAt}>
                    {new Date(p.createdAt).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                </dd>
              </dl>
            </div>
          </article>
          <nav className="keepsake-thumbnails" aria-label="Saved postcards">
            {postcards.map((m, i) => (
              <button
                key={m.id}
                aria-label={`View postcard ${i + 1}`}
                aria-pressed={m.id === p.id}
                onClick={() => setSelected(m.id)}
              >
                <img src={m.image} alt="" />
              </button>
            ))}
          </nav>
        </>
      ) : (
        <div className="empty-story">
          <span>♡</span>
          <h3>A place for your first postcard.</h3>
          <p>
            Pick a pose in the photo corner and save a postcard. Its little
            frame will be waiting here.
          </p>
        </div>
      )}
      <div className="memory-actions">
        <button
          className="primary"
          onClick={() => useGameStore.getState().openPanel("photo")}
        >
          Make a postcard ♡
        </button>
        <button onClick={close}>Back to Kitty</button>
      </div>
    </Dialog>
  );
}
export function TeaPanel() {
  const t = useGameStore((s) => s.cozy.tea),
    a = useGameStore((s) => s.adventure),
    close = useGameStore((s) => s.closePanel);
  const canSet =
    a.map === "glade" && Math.abs(a.x - 5) + Math.abs(a.z - 10) <= 1;
  return (
    <Dialog title="Moonlight tea party" onClose={close} className="tea-dialog">
      <span className="eyebrow">THREE SMALL KINDNESSES, ONE HAPPY EVENING</span>
      <h2>Moonlight tea party</h2>
      <p>
        {t.complete
          ? "The mint smells sweet, Momo’s cookie is on the table, and Kitty has saved you a place. “Thank you for making an ordinary evening feel special, Nancy.” ♡"
          : "Momo is planning a tiny tea party. A fragrant basket, a handmade cookie, and two cups are all she needs."}
      </p>
      <ol className="tea-quests">
        <li data-done={t.leaves}>
          Gather fragrant mint in the glade {t.leaves ? "✓" : ""}
        </li>
        <li data-done={t.baked}>
          Bake and give Momo a cookie {t.baked ? "✓" : ""}
        </li>
        <li data-done={t.complete}>
          Set the moonlit table together {t.complete ? "✓" : ""}
        </li>
      </ol>
      {(t.baked || t.complete) && (
        <Suspense
          fallback={<p role="status">Setting out your little tea table…</p>}
        >
          <TeaPreview complete={t.complete} placed={t.table} />
        </Suspense>
      )}
      {!t.complete && t.baked && canSet && (
        <>
          <p role="status">{t.table} of 3 little touches ready. No rush.</p>
          <button
            className="primary wide"
            onClick={() => useGameStore.getState().placeTea()}
          >
            {
              ["Place Kitty’s cup", "Place Momo’s cup", "Set down your cookie"][
                t.table
              ]
            }
          </button>
        </>
      )}
      {!t.complete && (!t.baked || !canSet) && (
        <button
          className="primary wide"
          onClick={() => useGameStore.getState().startTea()}
        >
          Continue the tea-party story ↗
        </button>
      )}
      {t.complete && (
        <p className="small-note">
          Your tiny teacup is waiting at home. This ending is saved in your
          storybook.
        </p>
      )}
      <button className="wide" onClick={close}>
        {t.complete ? "Keep this little evening ♡" : "Keep exploring"}
      </button>
    </Dialog>
  );
}
