import { TogetherActivities } from "./TogetherActivities";
import { AccountAccess } from "./AccountAccess";
import { useAccounts } from "../game/accounts";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "./Dialog";
import { useGameStore } from "../game/store";
import { useVisitsStore, parseVisitLink } from "../game/visits";
import { useVillageMotion } from "../game/village-motion";
import { VILLAGE_ACTIONS, villageWalkable } from "../game/village";

export function SharedPicnic() {
  const status = useVisitsStore((s) => s.status),
    players = useVisitsStore((s) => s.players),
    picnic = useVisitsStore((s) => s.picnic),
    p = useVillageMotion((s) => s.position);
  if (status !== "online") return null;
  const together = players.filter((p) => p.connected).length === 2,
    near = Math.hypot(p.x + 5.5, p.z - 4.2) < 2.5;
  return (
    <section className="shared-picnic" aria-label="Our shared picnic">
      <h3>
        {picnic.every(Boolean)
          ? "A little picnic, made together ♡"
          : "Our little picnic"}
      </h3>
      <p>
        {!together
          ? "Invite your friend, then set the table together."
          : !near
            ? "The picnic table is on the left of the garden. Walk over together."
            : picnic.every(Boolean)
              ? "The cloth, cookies and tea are ready. Stay a little while together."
              : "Each of you can add a little something. No timer, no rush."}
      </p>
      <div className="picnic-contributions">
        {["Lay the cloth", "Bring the cookies", "Pour the tea"].map(
          (label, i) => (
            <button
              key={label}
              disabled={!together || !near || picnic[i]}
              aria-pressed={picnic[i]}
              onClick={() => useVisitsStore.getState().placePicnic(i)}
            >
              {picnic[i] ? "✓ " : ""}
              {label}
            </button>
          ),
        )}
      </div>
      {!near && (
        <button
          onClick={() => {
            useGameStore.getState().closePanel();
            const table = VILLAGE_ACTIONS.find((o) => o.id === "picnic")!;
            useVillageMotion.getState().walkTo(table, "picnic");
          }}
        >
          Walk to the picnic table ↗
        </button>
      )}
    </section>
  );
}
export function VisitPresence() {
  const status = useVisitsStore((s) => s.status),
    players = useVisitsStore((s) => s.players),
    role = useVisitsStore((s) => s.role),
    chat = useVisitsStore((s) => s.chat),
    other = players.find((p) => p.id !== role),
    last = chat.at(-1);
  if (!["connecting", "online", "reconnecting"].includes(status)) return null;
  return (
    <button
      className="visit-presence"
      onClick={() => useGameStore.getState().openPanel("visits")}
    >
      <span
        className={status === "online" ? "visit-dot online" : "visit-dot"}
      />
      <span>
        {status === "connecting"
          ? "Joining your village…"
          : status === "reconnecting"
            ? "Reconnecting your visit…"
            : other?.connected
              ? `${other.name}${other.area === "home" ? " is at home" : other.area === "story" ? " is reading a story" : " is here"} ♡`
              : "Your invitation is open ♡"}
        {last && last.role !== role && (
          <small>
            {last.name}: {last.text.slice(0, 65)}
          </small>
        )}
      </span>
    </button>
  );
}
export function VisitsPanel() {
  const state = useVisitsStore(),
    close = useGameStore((s) => s.closePanel),
    [view, setView] = useState<"host" | "join">(
      state.invitation ? "join" : "host",
    ),
    [name, setName] = useState(state.invitation ? "Your friend" : "Nancy"),
    [link, setLink] = useState(""),
    [server, setServer] = useState(state.server),
    [message, setMessage] = useState(""),
    [copied, setCopied] = useState(false),
    log = useRef<HTMLDivElement>(null);
  const active = state.status === "online" || state.status === "reconnecting",
    busy = state.status === "connecting",
    other = state.players.find((p) => p.id !== state.role);
  const accounts = useAccounts();
  const connectedServer = state.invitation?.server || state.server;
  useEffect(() => {
    if (connectedServer) void useAccounts.getState().inspect(connectedServer);
  }, [connectedServer]);
  useEffect(() => {
    if (state.players.some((p) => p.profile === "melody"))
      useAccounts.setState({ melodyRegistered: true });
  }, [state.players]);
  const lastMessage = state.chat.at(-1)?.id;
  useEffect(() => setCopied(false), [state.link]);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [lastMessage]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.link);
      setCopied(true);
    } catch {
      const input = document.querySelector<HTMLInputElement>(
        "#village-invitation",
      );
      input?.focus();
      input?.select();
    }
  };
  return (
    <Dialog
      title="Private village visits"
      onClose={close}
      className={"visits-dialog" + (active ? " visit-active" : "")}
    >
      <span className="eyebrow">A LITTLE PLACE FOR TWO</span>
      <h2>A little time together.</h2>
      <p>
        Share a private invitation, walk around the village together, and make a
        little picnic. Your own home and progress stay yours.
      </p>
      {state.error && (
        <p className="visit-error" role="alert">
          {state.error}
        </p>
      )}
      {connectedServer && accounts.privateAccounts === true && (
        <AccountAccess server={connectedServer} active={active} />
      )}
      {connectedServer && accounts.privateAccounts === null && !active && (
        <p role="status">
          {accounts.error || "Connecting to your private village service…"}{" "}
          {accounts.error && (
            <button onClick={() => void accounts.inspect(connectedServer)}>
              Try again
            </button>
          )}
        </p>
      )}
      {connectedServer && accounts.privateAccounts !== false && !active && (
        <details className="visit-service-setup">
          <summary>Connection settings</summary>
          <label className="visit-field">
            Village service address
            <input
              type="url"
              value={server}
              onChange={(e) => setServer(e.target.value)}
              placeholder="https://nancy-village-free.your-name.workers.dev"
            />
          </label>
          <button
            onClick={() => {
              if (state.configure(server)) {
                if (state.invitation?.server !== server) {
                  useVisitsStore.setState({ invitation: null });
                  useAccounts.setState({ pendingInvite: "" });
                  if (location.hash.startsWith("#account="))
                    history.replaceState(
                      {},
                      "",
                      location.pathname + location.search,
                    );
                }
                void accounts.inspect(server);
              }
            }}
          >
            Connect service
          </button>
        </details>
      )}
      {active ? (
        <>
          <p className="visit-connection" role="status">
            {state.status === "reconnecting"
              ? "Reconnecting… You can keep exploring."
              : other?.connected
                ? `${other.name} is visiting with you. ♡`
                : "Your village is open. Send your invitation to your friend."}
          </p>
          {state.role === "host" &&
            state.link &&
            (!accounts.privateAccounts || accounts.melodyRegistered) && (
              <details className="visit-invitation" open={!other?.connected}>
                <summary>Invitation options</summary>
                <label htmlFor="village-invitation">
                  Your private invitation
                </label>
                <input
                  id="village-invitation"
                  value={state.link}
                  readOnly
                  onFocus={(e) => e.currentTarget.select()}
                />
                <div>
                  <button onClick={copy}>
                    {copied ? "Copied ♡" : "Copy invitation"}
                  </button>
                  {typeof navigator.share === "function" && (
                    <button
                      onClick={() =>
                        void navigator
                          .share({
                            title: "A little Hello Kitty village",
                            text: "Come spend a little time with me ♡",
                            url: state.link,
                          })
                          .catch(() => {})
                      }
                    >
                      Share…
                    </button>
                  )}
                </div>
              </details>
            )}
          <div className="visit-friends">
            {state.players.map((p) => (
              <span key={p.id} className={p.connected ? "connected" : ""}>
                {p.id === state.role ? "You" : p.name} ·{" "}
                {p.connected
                  ? p.area === "home"
                    ? "at home"
                    : "here"
                  : "reconnecting"}
              </span>
            ))}
          </div>
          <TogetherActivities />
          <div
            className="visit-chat"
            role="log"
            aria-label="Visit messages"
            aria-live="polite"
            ref={log}
          >
            {!state.chat.length ? (
              <p>
                Say a little hello. Messages are shared only during this private
                visit.
              </p>
            ) : (
              state.chat.map((m) => (
                <p key={m.id}>
                  <strong>{m.name}</strong>
                  <span>{m.text}</span>
                </p>
              ))
            )}
          </div>
          <form
            className="visit-chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (message.trim()) {
                state.sendChat(message);
                setMessage("");
              }
            }}
          >
            <input
              aria-label="Message to your visitor"
              maxLength={240}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="A little hello…"
              disabled={state.status !== "online"}
            />
            <button
              type="submit"
              disabled={state.status !== "online" || !message.trim()}
            >
              Send ♡
            </button>
          </form>
          <div className="visit-emotes">
            <button onClick={() => state.gesture("wave")}>Wave hello ♡</button>
            <button onClick={() => state.gesture("dance")}>
              Happy dance ♫
            </button>
            {other?.connected && other.area === "village" && (
              <button
                onClick={() => {
                  close();
                  const target = [
                    { x: other.x + 1.5, z: other.z },
                    { x: other.x - 1.5, z: other.z },
                    { x: other.x, z: other.z + 1.5 },
                  ].find((p) => villageWalkable(p.x, p.z));
                  if (target) useVillageMotion.getState().walkTo(target);
                }}
              >
                Walk to {other.name} ↗
              </button>
            )}
          </div>
          <SharedPicnic />
          <button
            className="primary wide"
            onClick={() => {
              close();
              useGameStore.getState().enterVillage();
            }}
          >
            Back to the village ♡
          </button>
          <button className="text-button wide" onClick={() => state.leave()}>
            {state.role === "host"
              ? "Close this private visit"
              : "Leave this visit"}
          </button>
        </>
      ) : !connectedServer || accounts.privateAccounts === false ? (
        <>
          <div
            className="visit-tabs"
            role="group"
            aria-label="Choose a private visit"
          >
            <button
              aria-pressed={view === "host"}
              onClick={() => {
                setView("host");
                if (name === "Your friend") setName("Nancy");
              }}
            >
              Open my village
            </button>
            <button
              aria-pressed={view === "join"}
              onClick={() => {
                setView("join");
                if (name === "Nancy") setName("Your friend");
              }}
            >
              Visit a friend
            </button>
          </div>
          <label className="visit-field">
            Your name
            <input
              maxLength={24}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="nickname"
            />
          </label>
          {view === "host" ? (
            <>
              {!state.server && (
                <p className="visit-setup-note">
                  Private visits are ready to connect. The gift’s creator needs
                  to connect the village service once.
                </p>
              )}
              <button
                className="primary wide"
                disabled={!state.server || busy}
                onClick={() => void state.host(name)}
              >
                {busy ? "Getting your village ready…" : "Open my village ♡"}
              </button>
              <details className="visit-service-setup">
                <summary>Connect the village service</summary>
                <p>
                  For the gift’s creator: deploy the prepared service, then
                  paste its HTTPS address here once. Invitations will include
                  the connection for your friend.
                </p>
                <a
                  href="https://github.com/hmlim123/hellokittygame/blob/master/docs/private-visits-setup.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  Set up free hosting ↗
                </a>
                <label className="visit-field">
                  Village service address
                  <input
                    type="url"
                    value={server}
                    onChange={(e) => setServer(e.target.value)}
                    placeholder="https://nancy-village-free.your-name.workers.dev"
                  />
                </label>
                <button onClick={() => state.configure(server)}>
                  Connect service
                </button>
                <p className="small-note">
                  Cloudflare’s free plan keeps your two logins in persistent
                  storage. Your personal game progress stays in each browser.
                </p>
              </details>
            </>
          ) : (
            <>
              {state.invitation ? (
                <p className="visit-connection">
                  Your private invitation is ready. Join when you’re
                  comfortable.
                </p>
              ) : (
                <label className="visit-field">
                  Private invitation link
                  <textarea
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="Paste the link your friend sent"
                    rows={3}
                  />
                </label>
              )}
              <button
                className="primary wide"
                disabled={busy || (!state.invitation && !parseVisitLink(link))}
                onClick={() =>
                  state.join(name, state.invitation ? undefined : link)
                }
              >
                {busy ? "Joining your friend…" : "Join the village ♡"}
              </button>
            </>
          )}
          {busy && (
            <>
              <p role="status">
                Getting your private village ready. The first connection may
                take a little while.
              </p>
              <button onClick={() => state.leave()}>Cancel connection</button>
            </>
          )}
        </>
      ) : null}
    </Dialog>
  );
}
