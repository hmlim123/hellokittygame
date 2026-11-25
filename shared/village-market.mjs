export const MARKET_STALL = { x: -0.45, z: -8.85 };
export const MARKET_ORDERS_PER_SHIFT = 3;

export const MARKET_ITEMS = {
  cookie: { name: "Butter cookie", color: "#dbab6c" },
  shortcake: { name: "Strawberry shortcake", color: "#dc94ad" },
  bun: { name: "Honey bun", color: "#d5a466" },
  tea: { name: "Peach tea", color: "#dd9776" },
  cocoa: { name: "Warm cocoa", color: "#ac8278" },
  lemonade: { name: "Lavender lemonade", color: "#a69ac8" },
  milk: { name: "Strawberry milk", color: "#e49bb5" },
};

/** @typedef {"host" | "guest"} MarketRole */
/** @typedef {keyof typeof MARKET_ITEMS} MarketItem */
/** @typedef {{customer: string, treat: MarketItem, drink: MarketItem}} MarketTicket */
/** @typedef {{item: MarketItem | null, handed: boolean}} MarketParcel */
/** @typedef {{revision: number, shift: number, served: number, attempt: number, awaitingCustomer: boolean, parcels: Record<MarketRole, MarketParcel>}} VillageMarket */
/** @typedef {{revision: number, shift: number, served: number, attempt: number, reader: boolean, customer: string | null, ticket: MarketTicket | null, choices: MarketItem[], own: MarketParcel, partnerHanded: boolean, completedShifts: number, servedCustomer: string | null}} VillageMarketView */
/** @typedef {"start" | "wrap" | "hand-over" | "next"} MarketAction */

/** @type {MarketItem[]} */
const treats = ["cookie", "shortcake", "bun"];
/** @type {MarketItem[]} */
const drinks = ["tea", "cocoa", "lemonade", "milk"];
/** @type {MarketTicket[]} */
const orders = [
  { customer: "Momo", treat: "shortcake", drink: "tea" },
  { customer: "Pip", treat: "bun", drink: "lemonade" },
  { customer: "Momo", treat: "cookie", drink: "milk" },
  { customer: "Pip", treat: "shortcake", drink: "cocoa" },
  { customer: "Momo", treat: "bun", drink: "tea" },
  { customer: "Pip", treat: "cookie", drink: "lemonade" },
];

/** @param {MarketRole} role */
export function marketSpot(role) {
  return { x: MARKET_STALL.x + (role === "host" ? 0.82 : -0.82), z: -7.43 };
}

/** @param {{x: number, z: number, area?: string}} actor @param {MarketRole} role */
export function atMarketSpot(actor, role) {
  const spot = marketSpot(role);
  return actor.area === "village" && Math.hypot(actor.x - spot.x, actor.z - spot.z) <= 0.68;
}

/** @returns {Record<MarketRole, MarketParcel>} */
const emptyParcels = () => ({ host: { item: null, handed: false }, guest: { item: null, handed: false } });

/** @returns {VillageMarket} */
export function newVillageMarket(shift = 0, revision = 0) {
  return { revision, shift, served: 0, attempt: 0, awaitingCustomer: false, parcels: emptyParcels() };
}

/** @param {VillageMarket} market @param {number} index */
const ticketAt = (market, index) => orders[((market.shift - 1) % 2) * MARKET_ORDERS_PER_SHIFT + index];

/** @param {VillageMarket} market */
function packing(market) {
  return market.shift > 0 && market.served < MARKET_ORDERS_PER_SHIFT && !market.awaitingCustomer;
}

/** @param {VillageMarket} market @param {MarketRole} role */
function readsTicket(market, role) {
  return role === ((market.shift + market.served) % 2 ? "host" : "guest");
}

/** @param {VillageMarket} market @param {MarketRole} role */
function stockFor(market, role) {
  if (readsTicket(market, role)) return treats;
  const ticket = ticketAt(market, market.served);
  const omitted = drinks[(market.shift + market.served) % drinks.length];
  const unavailable = omitted === ticket.drink ? drinks[(drinks.indexOf(omitted) + 1) % drinks.length] : omitted;
  return drinks.filter((item) => item !== unavailable);
}

/** @param {VillageMarket} market @param {MarketRole} role @returns {VillageMarketView} */
export function villageMarketView(market, role) {
  const choosing = packing(market);
  const reader = readsTicket(market, role);
  const ticket = choosing ? ticketAt(market, market.served) : null;
  return {
    revision: market.revision,
    shift: market.shift,
    served: market.served,
    attempt: market.attempt,
    reader,
    customer: ticket?.customer ?? null,
    ticket: reader ? ticket : null,
    choices: choosing ? stockFor(market, role) : [],
    own: market.parcels[role],
    partnerHanded: market.parcels[role === "host" ? "guest" : "host"].handed,
    completedShifts: market.served === MARKET_ORDERS_PER_SHIFT ? market.shift : Math.max(0, market.shift - 1),
    servedCustomer: !choosing && market.served ? ticketAt(market, market.served - 1).customer : null,
  };
}

/** @param {unknown} value @returns {VillageMarket} */
export function restoreVillageMarket(value) {
  const saved = /** @type {Partial<VillageMarket> | null} */ (value);
  if (!Number.isSafeInteger(saved?.revision) || saved.revision < 0) return newVillageMarket();
  if (!Number.isSafeInteger(saved.shift) || saved.shift < 1 || saved.shift > saved.revision ||
      !Number.isInteger(saved.served) || saved.served < 0 || saved.served > MARKET_ORDERS_PER_SHIFT ||
      !Number.isSafeInteger(saved.attempt) || saved.attempt < 0 || saved.attempt > saved.revision) {
    return newVillageMarket(0, saved.revision);
  }
  const market = newVillageMarket(saved.shift, saved.revision);
  market.served = saved.served;
  market.attempt = saved.attempt;
  market.awaitingCustomer = market.served > 0 && saved.awaitingCustomer === true;
  if (!packing(market)) return market;
  for (const role of /** @type {MarketRole[]} */ (["host", "guest"])) {
    const source = saved.parcels?.[role];
    if (source?.item && stockFor(market, role).includes(source.item)) {
      market.parcels[role] = { item: source.item, handed: source.handed === true };
    }
  }
  if (market.parcels.host.handed && market.parcels.guest.handed) market.parcels = emptyParcels();
  return market;
}

/** @param {VillageMarket} market @param {MarketRole} role @param {{action?: string, shift?: number, served?: number, attempt?: number, item?: unknown}} message @returns {VillageMarket} */
export function playVillageMarket(market, role, message) {
  if (message.shift !== market.shift || message.served !== market.served || message.attempt !== market.attempt) return market;
  const revision = market.revision + 1;
  if (message.action === "start" && (!market.shift || market.served === MARKET_ORDERS_PER_SHIFT)) {
    return newVillageMarket(market.shift + 1, revision);
  }
  if (message.action === "next" && market.awaitingCustomer && market.served < MARKET_ORDERS_PER_SHIFT) {
    return { ...market, revision, attempt: 0, awaitingCustomer: false };
  }
  const own = market.parcels[role];
  if (!packing(market) || own.handed) return market;
  if (message.action === "wrap") {
    const item = /** @type {MarketItem} */ (message.item);
    if (item === own.item || !stockFor(market, role).includes(item)) return market;
    return { ...market, revision, parcels: { ...market.parcels, [role]: { item, handed: false } } };
  }
  if (message.action !== "hand-over" || !own.item || message.item !== own.item) return market;
  const partner = market.parcels[role === "host" ? "guest" : "host"];
  const parcels = { ...market.parcels, [role]: { item: own.item, handed: true } };
  if (!partner.handed) return { ...market, revision, parcels };
  const ticket = ticketAt(market, market.served);
  const correct = readsTicket(market, role)
    ? own.item === ticket.treat && partner.item === ticket.drink
    : own.item === ticket.drink && partner.item === ticket.treat;
  return correct ? { ...market, revision, parcels: emptyParcels(), served: market.served + 1, awaitingCustomer: true }
    : { ...market, revision, parcels: emptyParcels(), attempt: market.attempt + 1 };
}
