export const TEA_BENCH = { x: -3.6, z: 0.2 };
export const BENCH_TOAST_MS = 2000;

/** @typedef {"host" | "guest"} BenchRole */
/** @typedef {{revision: number, seated: Record<BenchRole, boolean>, ready: Record<BenchRole, boolean>, toastAt: number}} BenchTea */

/** @param {BenchRole} role */
export function teaBenchSeat(role) {
  return { x: TEA_BENCH.x + (role === "host" ? 0.72 : -0.72), z: TEA_BENCH.z };
}

/** @param {{x: number, z: number, area?: string}} actor @param {BenchRole} role */
export function atTeaBenchSeat(actor, role) {
  const seat = teaBenchSeat(role);
  return actor.area === "village" && Math.hypot(actor.x - seat.x, actor.z - seat.z) <= 0.48;
}

/** @returns {BenchTea} */
export function newBenchTea() {
  return { revision: 0, seated: { host: false, guest: false }, ready: { host: false, guest: false }, toastAt: 0 };
}

/** @param {unknown} value @returns {BenchTea} */
export function restoreBenchTea(value) {
  const saved = /** @type {Partial<BenchTea> | null} */ (value);
  const tea = newBenchTea();
  if (Number.isSafeInteger(saved?.revision)) tea.revision = Math.max(0, saved.revision);
  tea.seated.host = saved?.seated?.host === true;
  tea.seated.guest = saved?.seated?.guest === true;
  if (tea.seated.host && tea.seated.guest) {
    tea.ready.host = saved?.ready?.host === true;
    tea.ready.guest = saved?.ready?.guest === true;
    if (Number.isFinite(saved?.toastAt)) tea.toastAt = Math.max(0, saved.toastAt);
  }
  return tea;
}

/** @param {BenchTea} tea @param {BenchRole} role @returns {BenchTea} */
export function standAtTeaBench(tea, role) {
  if (!tea.seated[role]) return tea;
  return {
    revision: tea.revision + 1,
    seated: { ...tea.seated, [role]: false },
    ready: { host: false, guest: false },
    toastAt: 0,
  };
}
