// Shared geometry keeps touch routes and online visitors inside the same village.
export const VILLAGE_LIMIT = { minX: -11.5, maxX: 11.5, minZ: -9, maxZ: 9 };
export const VILLAGE_SPAWN = { x: 0.8, z: 1.6 };
export const VILLAGE_OBSTACLES = [
  { x: -7, z: -6, w: 4.6, d: 3.6 },
  { x: 7, z: -6, w: 4.6, d: 3.6 },
  { x: 0, z: -0.6, w: 2.25, d: 2.25 },
  { x: -5.5, z: 5.8, w: 2.8, d: 1.4 },
  ...[4, 6, 8].map((x) => ({ x, z: 5.7, w: 1.35, d: 1.8 })),
  { x: 3.8, z: -2.2, w: 0.8, d: 0.8 },
  { x: 2.4, z: 3.3, w: 0.8, d: 0.8 },
];
export const VILLAGE_PLACES = [
  { id: "home", name: "Nancy’s home", icon: "⌂", x: -7, z: -3.1 },
  { id: "plaza", name: "Little plaza", icon: "♡", x: -1.8, z: 1.6 },
  { id: "cafe", name: "Momo’s café", icon: "☕", x: 7, z: -3.1 },
  { id: "garden", name: "Pip’s garden", icon: "✿", x: 6, z: 3.7 },
];
export const VILLAGE_ACTIONS = [
  { id: "home", label: "Go inside", x: -7, z: -3.1 },
  { id: "cafe", label: "Bake at the café", x: 7, z: -3.1 },
  { id: "momo", label: "Talk to Momo", x: 3.8, z: -2.2 },
  { id: "pip", label: "Talk to Pip", x: 2.4, z: 3.3 },
  ...[4, 6, 8].map((x, i) => ({
    id: "flowers" + i,
    label: "Tend flower bed " + (i + 1),
    x,
    z: 3.95,
  })),
  { id: "picnic", label: "Sit for a picnic", x: -5.5, z: 4.2 },
];
export function villageApproach(o) {
  return o.id === "momo"
    ? { x: o.x, z: o.z + 1.15 }
    : o.id === "pip"
      ? { x: o.x - 1.15, z: o.z }
      : { x: o.x, z: o.z };
}
export function villageWalkable(x, z, radius = 0.6) {
  const b = VILLAGE_LIMIT;
  return (
    Number.isFinite(x) &&
    Number.isFinite(z) &&
    x >= b.minX + radius &&
    x <= b.maxX - radius &&
    z >= b.minZ + radius &&
    z <= b.maxZ - radius &&
    !VILLAGE_OBSTACLES.some(
      (o) =>
        Math.abs(x - o.x) < o.w / 2 + radius &&
        Math.abs(z - o.z) < o.d / 2 + radius,
    )
  );
}
export function moveVillage(position, dx, dz) {
  let { x, z } = position;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.12));
  for (let i = 0; i < steps; i++) {
    if (villageWalkable(x + dx / steps, z)) x += dx / steps;
    if (villageWalkable(x, z + dz / steps)) z += dz / steps;
  }
  return { x, z };
}
export function straightVillagePath(a, b) {
  const n = Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / 0.12);
  for (let i = 0; i <= n; i++) {
    const t = n ? i / n : 0;
    if (!villageWalkable(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t))
      return false;
  }
  return true;
}
// A small open village needs a bounded search, not a distant tap through a wall.
export function villagePath(start, target) {
  if (
    !villageWalkable(start.x, start.z) ||
    !villageWalkable(target.x, target.z)
  )
    return [];
  if (straightVillagePath(start, target)) return [{ x: target.x, z: target.z }];
  const size = 0.5,
    key = (x, z) => x + "," + z,
    center = { x: Math.round(start.x / size), z: Math.round(start.z / size) };
  const candidates = [];
  for (let dx = -1; dx <= 1; dx++)
    for (let dz = -1; dz <= 1; dz++)
      candidates.push({ x: center.x + dx, z: center.z + dz });
  candidates.sort(
    (a, b) =>
      Math.hypot(a.x * size - start.x, a.z * size - start.z) -
      Math.hypot(b.x * size - start.x, b.z * size - start.z),
  );
  const begin = candidates.find((p) =>
    straightVillagePath(start, { x: p.x * size, z: p.z * size }),
  );
  if (!begin) return [];
  const queue = [begin],
    parents = new Map([[key(begin.x, begin.z), null]]);
  let end = null;
  for (let i = 0; i < queue.length && i < 2200; i++) {
    const cell = queue[i],
      p = { x: cell.x * size, z: cell.z * size };
    if (
      Math.hypot(p.x - target.x, p.z - target.z) < 0.75 &&
      straightVillagePath(p, target)
    ) {
      end = cell;
      break;
    }
    for (const [dx, dz] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]) {
      const next = { x: cell.x + dx, z: cell.z + dz },
        k = key(next.x, next.z),
        point = { x: next.x * size, z: next.z * size };
      if (
        parents.has(k) ||
        !villageWalkable(point.x, point.z) ||
        !straightVillagePath(p, point)
      )
        continue;
      parents.set(k, cell);
      queue.push(next);
    }
  }
  if (!end) return [];
  const points = [{ x: target.x, z: target.z }];
  let c = end;
  while (c) {
    points.unshift({ x: c.x * size, z: c.z * size });
    c = parents.get(key(c.x, c.z));
  }
  const route = [];
  let from = start,
    index = 0;
  while (index < points.length) {
    let next = index;
    while (
      next + 1 < points.length &&
      straightVillagePath(from, points[next + 1])
    )
      next++;
    route.push(points[next]);
    from = points[next];
    index = next + 1;
  }
  return route;
}
