export const PETALS = {
  rose: { name: "Rose", color: "#d87498" },
  daisy: { name: "Daisy", color: "#d9983f" },
  lavender: { name: "Lavender", color: "#9376b8" },
};

/** @typedef {keyof typeof PETALS} Petal */
/** @typedef {{revision: number, round: number, matches: number, host: Petal | null, guest: Petal | null}} PetalMatch */
/** @typedef {{revision: number, round: number, matches: number, own: Petal | null, partner: Petal | null, partnerReady: boolean, finished: boolean}} PetalMatchView */

/** @param {unknown} value @returns {Petal | null} */
export function petal(value) {
  return typeof value === "string" && Object.hasOwn(PETALS, value)
    ? /** @type {Petal} */ (value) : null;
}

/** @returns {PetalMatch} */
export function newPetalMatch(round = 0, revision = 0, matches = 0) {
  return { round, revision, matches, host: null, guest: null };
}

/** @param {unknown} value @returns {PetalMatch} */
export function restorePetalMatch(value) {
  const saved = /** @type {Partial<PetalMatch> | null} */ (value);
  if (!Number.isSafeInteger(saved?.round) || saved.round < 1 ||
      !Number.isSafeInteger(saved?.revision) || saved.revision < saved.round) {
    return newPetalMatch();
  }
  const host = petal(saved.host), guest = petal(saved.guest);
  const limit = host && guest ? saved.round : saved.round - 1;
  const matches = Number.isSafeInteger(saved.matches) ? Math.max(0, Math.min(limit, saved.matches)) : 0;
  return { round: saved.round, revision: saved.revision, matches, host, guest };
}

/** @param {PetalMatch} match @param {"host" | "guest"} role @returns {PetalMatchView} */
export function petalMatchView(match, role) {
  const finished = !!(match.host && match.guest);
  const partner = match[role === "host" ? "guest" : "host"];
  return {
    revision: match.revision,
    round: match.round,
    matches: match.matches,
    own: match[role],
    partner: finished ? partner : null,
    partnerReady: !!partner,
    finished,
  };
}
