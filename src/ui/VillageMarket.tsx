import { useEffect, useMemo, useRef, useState } from "react";
import {
  atMarketSpot, MARKET_ITEMS, MARKET_ORDERS_PER_SHIFT, type VillageMarketView,
} from "../../shared/village-market.mjs";
import { useGameStore } from "../game/store";
import { useVillageMotion, walkToMarket } from "../game/village-motion";
import { useVisitsStore, villagePartner } from "../game/visits";

export function MarketInvitation() {
  const market = useVisitsStore((s) => s.villageMarket);
  const role = useVisitsStore((s) => s.role);
  const online = useVisitsStore((s) => s.status === "online");
  const partner = useVisitsStore(villagePartner);
  const ready = useGameStore((s) => s.sceneReady);
  const approaching = useVillageMotion((s) => s.marketPanel === "approaching");
  if (approaching || !role || !market?.invitedBy || market.invitedBy === role || !partner) return null;
  const act = useVisitsStore.getState().marketAction;

  return (
    <div className="market-invitation" role="group" aria-label="Market invitation">
      <span role="status">{partner.name} invited you to the market.</span>
      <button disabled={!online || !ready} onClick={() => walkToMarket(role)}>Join the market</button>
      <button disabled={!online} onClick={() => act("answer-invite")}>Not now</button>
    </div>
  );
}

function InviteToMarket() {
  const market = useVisitsStore((s) => s.villageMarket);
  const role = useVisitsStore((s) => s.role);
  const online = useVisitsStore((s) => s.status === "online");
  const partner = useVisitsStore(villagePartner);
  if (market?.inviteSerial === undefined || !role || !partner || atMarketSpot(partner, partner.id)) return null;
  if (market.invitedBy === role) return <p role="status">Market invitation sent to {partner.name}.</p>;
  if (market.invitedBy) return null;
  return (
    <button disabled={!online} onClick={() => useVisitsStore.getState().marketAction("invite")}>
      Invite to the market
    </button>
  );
}

function marketKeepsake(shift: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 416;
  const paint = canvas.getContext("2d");
  if (!paint) return undefined;
  paint.fillStyle = "#fff8ec";
  paint.fillRect(0, 0, 720, 416);
  paint.strokeStyle = "#bc879f";
  paint.lineWidth = 3;
  paint.strokeRect(23, 23, 674, 370);
  paint.fillStyle = "#eed1da";
  paint.fillRect(24, 25, 672, 48);
  paint.fillStyle = "#fff6e9";
  for (let x = 48; x < 696; x += 56) paint.fillRect(x, 25, 24, 48);
  paint.fillStyle = "#67485c";
  paint.textAlign = "center";
  paint.font = "42px Georgia, serif";
  paint.fillText("Little Village Market", 360, 136);
  paint.font = "23px Georgia, serif";
  paint.fillText("Hello Kitty & My Melody", 360, 178);
  paint.font = "19px sans-serif";
  paint.fillText("Three orders served together", 360, 335);
  paint.fillText(`Market shift ${shift}`, 360, 365);
  ["#e7b3c5", "#e8c690", "#bfd2b1"].forEach((color, index) => {
    const x = 292 + index * 68;
    paint.fillStyle = color;
    paint.beginPath();
    paint.arc(x, 246, 26, 0, Math.PI * 2);
    paint.fill();
    paint.fillStyle = "#67485c";
    paint.font = "25px serif";
    paint.fillText("♡", x, 255);
  });
  return canvas.toDataURL("image/png");
}

function StallChat({ online, ticket }: { online: boolean; ticket: VillageMarketView["ticket"] }) {
  const messages = useVisitsStore((s) => s.chat);
  const [line, setLine] = useState("");
  const [expanded, setExpanded] = useState(false);
  const send = useVisitsStore.getState().sendChat;
  const request = ticket ? `Could you wrap the ${MARKET_ITEMS[ticket.drink].name.toLowerCase()}?` : "";
  return (
    <section className="market-chat" aria-label="Chat at the stall">
      <div className="market-chat-actions">
        {request && (
          <button disabled={!online || messages.at(-1)?.text === request} onClick={() => send(request)}>
            Tell partner which drink to wrap
          </button>
        )}
        <button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>Stall chat</button>
      </div>
      <div role="log" aria-label="Market chat messages" aria-live="polite">
        {messages.slice(expanded ? -4 : -1).map((message) => (
          <p key={message.id}><strong>{message.name}</strong> {message.text}</p>
        ))}
      </div>
      {expanded && <form className="visit-chat-form" onSubmit={(event) => {
        event.preventDefault();
        if (!online || !line.trim()) return;
        send(line);
        setLine("");
      }}>
        <input aria-label="Message at the market" value={line} maxLength={240} disabled={!online}
          placeholder="Message your partner" onChange={(event) => setLine(event.target.value)} />
        <button disabled={!online || !line.trim()}>Send</button>
      </form>}
    </section>
  );
}

function MarketOrder({ market, canServe }: { market: VillageMarketView; canServe: boolean }) {
  const act = useVisitsStore.getState().marketAction;
  const { ticket, own } = market;
  return (
    <>
      <section className="market-ticket" aria-label={market.reader ? "Your order ticket" : "Your stock shelf"}>
        {market.specialOrder && <p className="market-special">Market special</p>}
        <h3>{market.reader ? `${market.customer}’s order ticket` : "Your stock shelf"}</h3>
        <p>{ticket ? (
          <>Wrap the <strong>{MARKET_ITEMS[ticket.treat].name.toLowerCase()}</strong>. Ask your partner for the <strong>{MARKET_ITEMS[ticket.drink].name.toLowerCase()}</strong>.</>
        ) : <>Ask your partner which drink to wrap for {market.customer}.</>}</p>
      </section>
      {market.attempt > 0 && <p className="market-feedback" role="status">Something was different from the order. Check the ticket together and try again.</p>}
      <div className="market-stock" role="group" aria-label="Items you can wrap">
        {market.choices.map((item) => (
          <button key={item} aria-pressed={own.item === item} disabled={!canServe || own.handed}
            onClick={() => act("wrap", item)}>
            <span aria-hidden="true" style={{ background: MARKET_ITEMS[item].color }} />{MARKET_ITEMS[item].name}
          </button>
        ))}
      </div>
      {own.handed ? <p role="status">Your parcel is on the counter. Waiting for your partner.</p> : (
        <button className="primary wide" disabled={!canServe || !own.item}
          onClick={() => act("hand-over", own.item ?? undefined)}>Hand over my parcel</button>
      )}
      {market.partnerHanded && <p className="market-feedback" role="status">Your partner’s parcel is on the counter.</p>}
    </>
  );
}

export function VillageMarket({ onClose }: { onClose: () => void }) {
  const market = useVisitsStore((s) => s.villageMarket);
  const role = useVisitsStore((s) => s.role);
  const online = useVisitsStore((s) => s.status === "online");
  const error = useVisitsStore((s) => s.error);
  const ready = useGameStore((s) => s.sceneReady);
  const partner = useVisitsStore(villagePartner);
  const atStall = useVisitsStore((s) => {
    const own = s.players.find((player) => player.id === s.role);
    return !!own && atMarketSpot(own, own.id);
  });
  const bothAtStall = online && atStall && !!partner && atMarketSpot(partner, partner.id);
  const completed = market?.completedShifts ?? 0;
  const keepsake = useMemo(() => completed ? marketKeepsake(completed) : undefined, [completed]);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => panel.current?.focus({ preventScroll: true }), []);
  if (!market || !role) return null;
  const act = useVisitsStore.getState().marketAction;
  const closed = market.served === MARKET_ORDERS_PER_SHIFT;

  return (
    <section className="market-workbench" data-at-stall={atStall} aria-label="Little Village Market"
      ref={panel} tabIndex={-1} onKeyDown={(event) => {
        if (event.key === "Escape") { event.stopPropagation(); onClose(); }
      }}>
      <div className="market-heading">
        <div>
          <h2>Little Village Market</h2>
          {market.shift > 0 && <p className="market-order-count" aria-live="polite">
            {market.served} of {MARKET_ORDERS_PER_SHIFT} orders served
          </p>}
        </div>
        <button aria-label="Close Little Village Market" onClick={onClose}>Done</button>
      </div>
      <MarketInvitation />
      {!atStall && (
        <button className="primary" disabled={!online || !ready} onClick={() => walkToMarket(role)}>
          Walk to my stall spot
        </button>
      )}
      {!bothAtStall && <InviteToMarket />}
      {!market.shift ? (
        <>
          <p>Read the order or check the stock, then hand over one parcel each.</p>
          <button className="primary wide" disabled={!bothAtStall} onClick={() => act("start")}>Open the stall</button>
        </>
      ) : closed ? (
        <>
          <p role="status">The stall is closed. You earned a market keepsake together! ♡</p>
          <button disabled={!bothAtStall} onClick={() => act("start")}>Start another shift</button>
        </>
      ) : market.servedCustomer ? (
        <>
          <p role="status">{market.servedCustomer} loved the order! Swap jobs for the next customer.</p>
          <button className="primary wide" disabled={!bothAtStall} onClick={() => act("next")}>Next customer</button>
        </>
      ) : <MarketOrder market={market} canServe={bothAtStall} />}
      {atStall && !bothAtStall && <p className="market-feedback" role="status">Waiting for your partner at the stall.</p>}
      {keepsake && <a className="market-keepsake" href={keepsake} download={`little-village-market-${completed}.png`}>Download market keepsake</a>}
      {error && <p className="market-feedback" role="status">{error}</p>}
      {atStall && market.shift > 0 && <StallChat online={online && !!partner} ticket={market.ticket} />}
    </section>
  );
}
