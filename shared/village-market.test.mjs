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
  const attempt = () => applyVisitAction({
    room, player: room.host, m: { type: "village-market", action: "start", shift: 0, served: 0, attempt: 0 },
    broadcast() {}, dirty() { saves++; }, fail: (message) => failures.push(message),
  });
  for (const role of ["host", "guest"]) assert.ok(villagePath(VILLAGE_SPAWN, marketSpot(role)).length);
  Object.assign(room.guest, marketSpot("host"));
  assert.equal(atMarketSpot(room.guest, "guest"), false);
  attempt();
  assert.equal(room.villageMarket, undefined);
  assert.match(failures.at(-1), /stall together/);
  Object.assign(room.guest, marketSpot("guest"));
  attempt();
  attempt();
  assert.equal(room.villageMarket.shift, 1);
  assert.equal(saves, 1);
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
  market = move(market, "guest", "hand-over", drink);
  assert.equal(market.served, 0);
  assert.equal(villageMarketView(market, "host").partnerHanded, true);
  assert.equal(villageMarketView(market, "host").own.item, treat);
  assert.strictEqual(move(market, "guest", "wrap", guest.choices.find((item) => item !== drink)), market);
  market = restoreVillageMarket(JSON.parse(JSON.stringify(market)));
  market = move(market, "host", "hand-over", treat);
  assert.equal(market.served, 1);
  assert.equal(villageMarketView(market, "guest").servedCustomer, "Momo");
  assert.equal(villageMarketView(restoreVillageMarket(market), "host").servedCustomer, "Momo");
  market = move(market, "guest", "next");
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
