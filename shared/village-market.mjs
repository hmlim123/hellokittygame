export const MARKET_STALL = { x: -0.45, z: -8.85 };
export const MARKET_ORDERS_PER_SHIFT = 3;
export const MARKET_WRAP_MS = 600;
export const MARKET_HANDOFF_MS = 540;
export const MARKET_COLLECTION_DELAY_MS = 650;
export const MARKET_COLLECTION_MS = 680;

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
/** @typedef {{customer: string, treat: MarketItem, drink: MarketItem, special?: boolean}} MarketTicket */
/** @typedef {{item: MarketItem | null, handed: boolean, wrappedAt?: number}} MarketParcel */
/** @typedef {{host: number, guest: number, completedAt: number, delivered: boolean, customer: string | null}} MarketDelivery */
/**
 * @typedef {object} VillageMarket
 * @property {number} revision
 * @property {number} shift
 * @property {number} served
 * @property {number} attempt
 * @property {boolean} awaitingCustomer
 * @property {Record<MarketRole, MarketParcel>} parcels
 * @property {MarketRole | null} invitedBy
 * @property {number} inviteSerial
 * @property {MarketDelivery} delivery
 * @property {number | null} specialIndex
 */
/**
 * @typedef {object} VillageMarketView
 * @property {number} revision
 * @property {number} shift
 * @property {number} served
 * @property {number} attempt
 * @property {boolean} reader
 * @property {string | null} customer
 * @property {MarketTicket | null} ticket
 * @property {MarketItem[]} choices
 * @property {MarketParcel} own
 * @property {boolean} partnerHanded
 * @property {number} completedShifts
 * @property {string | null} servedCustomer
 * @property {boolean} [partnerWrapped]
 * @property {number} [partnerWrappedAt]
 * @property {MarketRole | null} [invitedBy]
 * @property {number} [inviteSerial]
 * @property {MarketDelivery} [delivery]
 * @property {boolean} [specialOrder]
 */
/** @typedef {"start" | "wrap" | "hand-over" | "next" | "invite" | "answer-invite"} MarketAction */

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
/** @type {MarketTicket[]} */
const specials = [
  { customer: "Momo", treat: "cookie", drink: "cocoa", special: true },
  { customer: "Pip", treat: "bun", drink: "milk", special: true },
  { customer: "Momo", treat: "shortcake", drink: "lemonade", special: true },
  { customer: "Pip", treat: "cookie", drink: "tea", special: true },
  { customer: "Momo", treat: "bun", drink: "cocoa", special: true },
  { customer: "Pip", treat: "shortcake", drink: "milk", special: true },
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

/** @returns {MarketDelivery} */
const emptyDelivery = () => ({ host: 0, guest: 0, completedAt: 0, delivered: false, customer: null });

/** @returns {VillageMarket} */
export function newVillageMarket(shift = 0, revision = 0) {
  return {
    revision, shift, served: 0, attempt: 0, awaitingCustomer: false,
    parcels: emptyParcels(), invitedBy: null, inviteSerial: 0, delivery: emptyDelivery(), specialIndex: null,
  };
}

/** @param {VillageMarket} market @param {number} index */
function ticketAt(market, index) {
  if (index === MARKET_ORDERS_PER_SHIFT - 1 && market.specialIndex !== null) return specials[market.specialIndex];
  return orders[((market.shift - 1) % 2) * MARKET_ORDERS_PER_SHIFT + index];
}

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
  const offset = ticket.special ? market.specialIndex ?? 0 : 0;
  const omitted = drinks[(market.shift + market.served + offset) % drinks.length];
  const unavailable = omitted === ticket.drink ? drinks[(drinks.indexOf(omitted) + 1) % drinks.length] : omitted;
  return drinks.filter((item) => item !== unavailable);
}

/** @param {VillageMarket} market @param {MarketRole} role @returns {VillageMarketView} */
export function villageMarketView(market, role) {
  const choosing = packing(market);
  const reader = readsTicket(market, role);
  const ticket = choosing ? ticketAt(market, market.served) : null;
  const partner = market.parcels[role === "host" ? "guest" : "host"];
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
    partnerHanded: partner.handed,
    partnerWrapped: !!partner.item,
    partnerWrappedAt: partner.wrappedAt ?? 0,
    completedShifts: market.served === MARKET_ORDERS_PER_SHIFT ? market.shift : Math.max(0, market.shift - 1),
    servedCustomer: !choosing && market.served ? ticketAt(market, market.served - 1).customer : null,
    invitedBy: market.invitedBy,
    inviteSerial: market.inviteSerial,
    delivery: market.delivery,
    specialOrder: !!ticket?.special,
  };
}

/** @param {Partial<MarketDelivery> | undefined} saved @returns {MarketDelivery} */
function restoreMarketDelivery(saved) {
  const delivery = emptyDelivery();
  for (const role of ["host", "guest"]) {
    if (Number.isSafeInteger(saved?.[role]) && saved[role] > 0) delivery[role] = saved[role];
  }
  if (!delivery.host || !delivery.guest) return delivery;
  delivery.completedAt = Math.max(delivery.host, delivery.guest);
  delivery.delivered = saved?.delivered === true;
  if (saved?.customer === "Momo" || saved?.customer === "Pip") delivery.customer = saved.customer;
  return delivery;
}

/** @param {unknown} value @returns {VillageMarket} */
export function restoreVillageMarket(value) {
  const saved = /** @type {Partial<VillageMarket> | null} */ (value);
  if (!Number.isSafeInteger(saved?.revision) || saved.revision < 0) return newVillageMarket();
  const market = newVillageMarket(0, saved.revision);
  if (Number.isSafeInteger(saved.inviteSerial) && saved.inviteSerial > 0 && saved.inviteSerial <= saved.revision) {
    market.inviteSerial = saved.inviteSerial;
    if (saved.invitedBy === "host" || saved.invitedBy === "guest") market.invitedBy = saved.invitedBy;
  }
  if (!Number.isSafeInteger(saved.shift) || saved.shift < 1 || saved.shift > saved.revision ||
      !Number.isInteger(saved.served) || saved.served < 0 || saved.served > MARKET_ORDERS_PER_SHIFT ||
      !Number.isSafeInteger(saved.attempt) || saved.attempt < 0 || saved.attempt > saved.revision) {
    return market;
  }
  market.shift = saved.shift;
  market.served = saved.served;
  market.attempt = saved.attempt;
  market.delivery = restoreMarketDelivery(saved.delivery);
  if (Number.isInteger(saved.specialIndex) && saved.specialIndex >= 0 && saved.specialIndex < specials.length)
    market.specialIndex = saved.specialIndex;
  market.awaitingCustomer = market.served > 0 && saved.awaitingCustomer === true;
  if (!packing(market)) return market;
  for (const role of /** @type {MarketRole[]} */ (["host", "guest"])) {
    const source = saved.parcels?.[role];
    if (source?.item && stockFor(market, role).includes(source.item)) {
      market.parcels[role] = { item: source.item, handed: source.handed === true };
      if (Number.isSafeInteger(source.wrappedAt) && source.wrappedAt > 0)
        market.parcels[role].wrappedAt = source.wrappedAt;
    }
  }
  if (market.parcels.host.handed && market.parcels.guest.handed) market.parcels = emptyParcels();
  return market;
}

/** @param {VillageMarket} market @param {MarketRole} role @param {{action?: string, inviteSerial?: number}} message @returns {VillageMarket} */
export function updateMarketInvitation(market, role, message) {
  if (message.inviteSerial !== market.inviteSerial) return market;
  const revision = market.revision + 1;
  if (message.action === "invite" && !market.invitedBy) {
    return { ...market, revision, invitedBy: role, inviteSerial: market.inviteSerial + 1 };
  }
  if (message.action === "answer-invite" && market.invitedBy && market.invitedBy !== role) {
    return { ...market, revision, invitedBy: null };
  }
  return market;
}

/**
 * @param {VillageMarket} market
 * @param {MarketRole} role
 * @param {{action?: string, shift?: number, served?: number, attempt?: number, item?: unknown}} message
 * @param {number} now
 * @param {(count: number) => number} pick
 * @returns {VillageMarket}
 */
export function playVillageMarket(market, role, message, now = Date.now(), pick = () => 0) {
  if (message.shift !== market.shift || message.served !== market.served || message.attempt !== market.attempt) return market;
  const revision = market.revision + 1;
  if (message.action === "start" && (!market.shift || market.served === MARKET_ORDERS_PER_SHIFT)) {
    const index = pick(specials.length - Number(market.specialIndex !== null));
    const specialIndex = market.specialIndex !== null && index >= market.specialIndex ? index + 1 : index;
    return { ...newVillageMarket(market.shift + 1, revision), inviteSerial: market.inviteSerial, delivery: market.delivery, specialIndex };
  }
  if (message.action === "next" && market.awaitingCustomer && market.served < MARKET_ORDERS_PER_SHIFT) {
    return { ...market, revision, attempt: 0, awaitingCustomer: false };
  }
  const own = market.parcels[role];
  if (!packing(market) || own.handed) return market;
  if (message.action === "wrap") {
    const item = /** @type {MarketItem} */ (message.item);
    if (item === own.item || !stockFor(market, role).includes(item)) return market;
    return { ...market, revision, parcels: { ...market.parcels, [role]: { item, handed: false, wrappedAt: now + 90 } } };
  }
  if (message.action !== "hand-over" || !own.item || message.item !== own.item) return market;
  const partner = market.parcels[role === "host" ? "guest" : "host"];
  const parcels = { ...market.parcels, [role]: { ...own, handed: true } };
  const ticket = ticketAt(market, market.served);
  const delivery = { ...(market.delivery.completedAt ? emptyDelivery() : market.delivery), [role]: now + 120 };
  if (!partner.handed) return { ...market, revision, parcels, delivery };
  const correct = readsTicket(market, role)
    ? own.item === ticket.treat && partner.item === ticket.drink
    : own.item === ticket.drink && partner.item === ticket.treat;
  // A parcel may have been handed over before the animation update was deployed.
  const partnerRole = role === "host" ? "guest" : "host";
  delivery[partnerRole] ||= Math.max(1, now - MARKET_HANDOFF_MS);
  delivery.completedAt = Math.max(delivery.host, delivery.guest);
  delivery.delivered = correct;
  delivery.customer = ticket.customer;
  return correct ? { ...market, revision, delivery, parcels: emptyParcels(), served: market.served + 1, awaitingCustomer: true }
    : { ...market, revision, delivery, parcels: emptyParcels(), attempt: market.attempt + 1 };
}
