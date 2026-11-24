/** @typedef {{revision: number, roleRevisions: {host: number, guest: number}}} VisitActivityRevision */

/** @param {number} revision @returns {VisitActivityRevision} */
export function newActivityRevision(revision) {
  return { revision, roleRevisions: { host: revision, guest: revision } };
}

/** @param {Partial<VisitActivityRevision> | null | undefined} saved */
export function restoreActivityRevision(saved) {
  const revision = Number.isSafeInteger(saved?.revision)
    ? Math.max(0, saved.revision)
    : 0;
  const roleRevisions = { host: revision, guest: revision };
  for (const role of /** @type {const} */ (["host", "guest"])) {
    const last = saved?.roleRevisions?.[role];
    if (Number.isSafeInteger(last) && last >= 0 && last <= revision) {
      roleRevisions[role] = last;
    }
  }
  return { revision, roleRevisions };
}
