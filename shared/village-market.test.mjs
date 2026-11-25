import assert from "node:assert/strict";
import { test } from "node:test";
import {
  atMarketSpot, marketSpot, newVillageMarket, playVillageMarket, restoreVillageMarket, villageMarketView,
} from "./village-market.mjs";
import { applyVisitAction } from "./visit-actions.mjs";
import { VILLAGE_SPAWN, villagePath } from "./village-world.mjs";

const move = (market, role, action, item) => playVillageMarket(market, role, {
  action, item, shift: market.shift, served: market.served, attempt: market.attempt,
});

test("both partners must take separate reachable places at the stall", () => {
  const room = Object.fromEntries(["host", "guest"].map((id) => [id, {
    id, ...marketSpot(id), area: "village", socket: { readyState: 1 },
  }]));
  const failures = [];
  let saves = 0;
  const send = (action, shift, item) => applyVisitAction({
    room, player: room.host, m: { type: "village-market", action, shift, served: 0, attempt: 0, item },
    now: () => 1000, broadcast() {}, dirty() { saves++; }, fail: (message) => failures.push(message),
  });
  for (const role of ["host", "guest"]) assert.ok(villagePath(VILLAGE_SPAWN, marketSpot(role)).length);
  Object.assign(room.guest, marketSpot("host"));
  assert.equal(atMarketSpot(room.guest, "guest"), false);
  send("start", 0);
  assert.equal(room.villageMarket, undefined);
  assert.match(failures.at(-1), /stall together/);
  Object.assign(room.guest, marketSpot("guest"));
  send("start", 0);
  send("start", 0);
  assert.equal(room.villageMarket.shift, 1);
  assert.equal(saves, 1);
  const active = room.villageMarket;
  Object.assign(room.guest, VILLAGE_SPAWN);
  send("wrap", 1, "shortcake");
  assert.strictEqual(room.villageMarket, active);
  assert.equal(saves, 1);
  Object.assign(room.guest, marketSpot("guest"));
  room.host.speed = 2.6;
  send("wrap", 1, "shortcake");
  assert.equal(room.host.speed, 0);
  assert.equal(room.villageMarket.parcels.host.item, "shortcake");
});

test("a market invitation reaches the partner before either player walks to the stall", () => {
  const room = Object.fromEntries(["host", "guest"].map((id) => [id, {
    id, ...VILLAGE_SPAWN, area: "village", socket: { readyState: 1 },
  }]));
  let saves = 0;
  function send(role, action, inviteSerial) {
    applyVisitAction({
      room, player: room[role], m: { type: "village-market", action, inviteSerial },
      broadcast() {}, dirty() { saves++; },
    });
  }
  send("host", "invite", 0);
  send("host", "invite", 0);
  send("guest", "invite", 1);
  assert.equal(saves, 1);
  assert.equal(room.villageMarket.shift, 0);
  room.villageMarket = restoreVillageMarket(JSON.parse(JSON.stringify(room.villageMarket)));
  assert.equal(villageMarketView(room.villageMarket, "guest").invitedBy, "host");
  send("host", "answer-invite", 1);
  assert.equal(room.villageMarket.invitedBy, "host");
  send("guest", "answer-invite", 1);
  assert.equal(room.villageMarket.invitedBy, null);
  send("guest", "invite", 1);
  send("host", "answer-invite", 1);
  assert.equal(room.villageMarket.invitedBy, "guest");
  assert.equal(room.villageMarket.inviteSerial, 2);
  send("host", "answer-invite", 2);
  assert.equal(room.villageMarket.invitedBy, null);
});

test("the two roles see different information and trade jobs after a served order", () => {
  let market = move(newVillageMarket(), "host", "start");
  const host = villageMarketView(market, "host");
  const guest = villageMarketView(market, "guest");
  assert.equal(host.reader, true);
  assert.equal(guest.ticket, null);
  assert.equal(guest.choices.length, 3);
  const { treat, drink } = host.ticket;
  assert.ok(guest.choices.includes(drink));
  assert.strictEqual(move(market, "host", "wrap", drink), market);
  assert.strictEqual(move(market, "guest", "hand-over", drink), market);
  market = move(market, "guest", "wrap", drink);
  market = move(market, "host", "wrap", treat);
  assert.equal(villageMarketView(market, "host").partnerWrapped, true);
  assert.equal(villageMarketView(market, "host").partnerWrappedAt, villageMarketView(market, "guest").own.wrappedAt);
  market = move(market, "guest", "hand-over", drink);
  assert.equal(market.served, 0);
  assert.equal(villageMarketView(market, "host").partnerHanded, true);
  assert.equal(villageMarketView(market, "host").own.item, treat);
  assert.strictEqual(move(market, "guest", "wrap", guest.choices.find((item) => item !== drink)), market);
  market = restoreVillageMarket(JSON.parse(JSON.stringify(market)));
  market = move(market, "host", "hand-over", treat);
  assert.equal(market.served, 1);
  assert.equal(market.delivery.delivered, true);
  assert.deepEqual(villageMarketView(market, "host").delivery, villageMarketView(market, "guest").delivery);
  assert.deepEqual(restoreVillageMarket(JSON.parse(JSON.stringify(market))).delivery, market.delivery);
  assert.equal(villageMarketView(market, "guest").servedCustomer, "Momo");
  assert.equal(villageMarketView(restoreVillageMarket(market), "host").servedCustomer, "Momo");
  const previousHandoff = market.delivery;
  market = move(market, "guest", "next");
  assert.equal(market.delivery, previousHandoff);
  assert.equal(villageMarketView(market, "host").ticket, null);
  assert.equal(villageMarketView(market, "guest").ticket.customer, "Pip");
});

test("a mix-up resets both parcels, and three successful orders grant one keepsake per shift", () => {
  let market = move(newVillageMarket(), "host", "start");
  const first = villageMarketView(market, "host").ticket;
  const incorrect = villageMarketView(market, "guest").choices.find((item) => item !== first.drink);
  market = move(market, "host", "wrap", first.treat);
  market = move(market, "guest", "wrap", incorrect);
  market = move(market, "host", "hand-over", first.treat);
  market = move(market, "guest", "hand-over", incorrect);
  assert.equal(market.attempt, 1);
  assert.equal(market.delivery.delivered, false);
  assert.ok(market.delivery.host > 0 && market.delivery.guest > 0);
  assert.equal(market.served, 0);
  assert.equal(market.parcels.host.item, null);
  assert.equal(market.parcels.guest.handed, false);
  assert.strictEqual(playVillageMarket(market, "host", { action: "wrap", shift: 1, served: 0, attempt: 0, item: first.treat }), market);

  for (let i = 0; i < 3; i++) {
    const reader = i % 2 ? "guest" : "host";
    const stock = reader === "host" ? "guest" : "host";
    const { treat, drink } = villageMarketView(market, reader).ticket;
    market = move(market, reader, "wrap", treat);
    market = move(market, stock, "wrap", drink);
    market = move(market, stock, "hand-over", drink);
    market = move(market, reader, "hand-over", treat);
    if (i < 2) market = move(market, stock, "next");
  }
  assert.equal(villageMarketView(restoreVillageMarket(market), "guest").completedShifts, 1);
  assert.strictEqual(move(market, "host", "hand-over", first.treat), market);
  market = move(market, "guest", "start");
  assert.equal(villageMarketView(market, "host").completedShifts, 1);
  assert.equal(villageMarketView(market, "guest").reader, true);
  assert.notDeepEqual(villageMarketView(market, "guest").ticket, first);
});

test("new shifts rotate the special while an older unfinished order keeps its recipe", () => {
  const old = {
    revision: 18, shift: 1, served: 2, attempt: 0, awaitingCustomer: false,
    parcels: { host: { item: "cookie", handed: true }, guest: { item: null, handed: false } },
  };
  let market = restoreVillageMarket(old);
  const original = villageMarketView(market, "host");
  assert.equal(original.ticket.drink, "milk");
  assert.equal(original.own.handed, true);
  assert.equal(original.specialOrder, false);
  market = move(market, "guest", "wrap", "milk");
  market = move(market, "guest", "hand-over", "milk");
  assert.equal(market.delivery.delivered, true);
  const first = move(market, "host", "start");
  const completed = { ...first, served: 3 };
  const second = move(restoreVillageMarket(completed), "guest", "start");
  assert.notEqual(second.specialIndex, first.specialIndex);
  for (const active of [first, second]) {
    const saved = restoreVillageMarket({ ...active, served: 2 });
    const reader = saved.shift % 2 ? "host" : "guest";
    const stock = reader === "host" ? "guest" : "host";
    const ticket = villageMarketView(saved, reader).ticket;
    assert.equal(ticket.special, true);
    assert.equal(villageMarketView(saved, stock).ticket, null);
    assert.ok(villageMarketView(saved, stock).choices.includes(ticket.drink));
  }
  const pairings = new Set();
  for (let draw = 0; draw < 6; draw++) {
    const selection = playVillageMarket(newVillageMarket(), "host", {
      action: "start", shift: 0, served: 0, attempt: 0,
    }, 1000, () => draw);
    const saved = restoreVillageMarket({ ...selection, served: 2 });
    const ticket = villageMarketView(saved, "host").ticket;
    assert.ok(villageMarketView(saved, "guest").choices.includes(ticket.drink));
    pairings.add(`${ticket.treat}-${ticket.drink}`);
  }
  assert.equal(pairings.size, 6);
});
