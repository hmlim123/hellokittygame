import { VILLAGE_PICNIC, VILLAGE_PLACES } from "./village-world.mjs";

export const CLUE_STOPS = [
  ...VILLAGE_PLACES.filter((place) => place.id !== "home"),
  { ...VILLAGE_PICNIC, name: "Picnic table", icon: "☕" },
];

const clues = {
  plaza: ["The landmark name has no apostrophe.", "Its name starts with L or M."],
  cafe: ["The landmark name has an apostrophe.", "Its name starts with L or M."],
  garden: ["The landmark name has an apostrophe.", "Its name starts with P."],
  picnic: ["The landmark name has no apostrophe.", "Its name starts with P."],
};

/** @typedef {"host" | "guest"} TrailRole */
/** @typedef {{shared: boolean, guess: string | null, searched: boolean}} TrailTurn */
/** @typedef {{revision: number, round: number, target: string | null, solved: boolean, host: TrailTurn, guest: TrailTurn}} ClueTrail */
/** @typedef {{revision: number, round: number, clue: string | null, partnerClue: string | null, ownShared: boolean, partnerShared: boolean, ownGuess: string | null, partnerGuess: string | null, wrongGuess: boolean, destination: string | null, ownSearched: boolean, partnerSearched: boolean}} ClueTrailView */

/** @param {unknown} id */
export function clueStop(id) {
  return CLUE_STOPS.find((place) => place.id === id);
}

/** @param {string | null} [target] @returns {ClueTrail} */
export function newClueTrail(target = null, round = 0, revision = 0) {
  return {
    revision, round, target, solved: false,
    host: { shared: false, guess: null, searched: false },
    guest: { shared: false, guess: null, searched: false },
  };
}

/** @param {unknown} value @returns {ClueTrail} */
export function restoreClueTrail(value) {
  const saved = /** @type {Partial<ClueTrail> | null} */ (value);
  const target = clueStop(saved?.target)?.id;
  if (!target || !Number.isSafeInteger(saved?.round) || saved.round < 1 ||
      !Number.isSafeInteger(saved?.revision) || saved.revision < saved.round) {
    return newClueTrail();
  }
  /** @param {TrailTurn | undefined} turn */
  function restoreTurn(turn) {
    const shared = turn?.shared === true;
    return { shared, guess: shared ? clueStop(turn?.guess)?.id ?? null : null, searched: false };
  }
  const host = restoreTurn(saved.host), guest = restoreTurn(saved.guest);
  const solved = host.guess === target && guest.guess === target;
  host.searched = solved && saved.host?.searched === true;
  guest.searched = solved && saved.guest?.searched === true;
  return { revision: saved.revision, round: saved.round, target, solved, host, guest };
}

/** Build a separate view for each connection so an unshared clue stays private.
 * @param {ClueTrail} trail @param {TrailRole} role @returns {ClueTrailView} */
export function clueTrailView(trail, role) {
  const own = trail[role], partner = role === "host" ? trail.guest : trail.host;
  const pair = trail.target ? clues[trail.target] : null;
  return {
    revision: trail.revision,
    round: trail.round,
    clue: pair?.[role === "host" ? 0 : 1] ?? null,
    partnerClue: partner.shared ? pair?.[role === "host" ? 1 : 0] ?? null : null,
    ownShared: own.shared,
    partnerShared: partner.shared,
    ownGuess: own.guess,
    partnerGuess: partner.guess,
    wrongGuess: !!own.guess && own.guess === partner.guess && !trail.solved,
    destination: trail.solved ? trail.target : null,
    ownSearched: own.searched,
    partnerSearched: partner.searched,
  };
}

/** @param {{x: number, z: number, area?: string}} player @param {{x: number, z: number}} stop */
export function atClueStop(player, stop) {
  return player.area === "village" && Math.hypot(player.x - stop.x, player.z - stop.z) <= 2;
}
