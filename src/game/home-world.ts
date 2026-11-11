import layout from "../../dist/assets/studio-home.json";
export interface HomePoint {
  x: number;
  z: number;
}
export const HOME_RADIUS = layout.navigation.radius;
export const HOME_SPAWN = {
  x: layout.anchors.kitty.position[0],
  z: layout.anchors.kitty.position[2],
};
export const HOME_LIMIT = { minX: -5.65, maxX: 5.65, minZ: -4.85, maxZ: 4.85 };
// Footprints are exported alongside the furniture, with space for Kitty's body.
export const HOME_OBSTACLES = (
  layout as unknown as {
    navigation: {
      obstacles: { x: number; z: number; w: number; d: number; name: string }[];
    };
  }
).navigation.obstacles;
export function homeWalkable(x: number, z: number, r = HOME_RADIUS) {
  return (
    Number.isFinite(x) &&
    Number.isFinite(z) &&
    x >= HOME_LIMIT.minX + r &&
    x <= HOME_LIMIT.maxX - r &&
    z >= HOME_LIMIT.minZ + r &&
    z <= HOME_LIMIT.maxZ - r &&
    !HOME_OBSTACLES.some(
      (o) => Math.abs(x - o.x) < o.w / 2 + r && Math.abs(z - o.z) < o.d / 2 + r,
    )
  );
}
export function moveHome(p: HomePoint, dx: number, dz: number) {
  let { x, z } = p;
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.08));
  for (let i = 0; i < n; i++) {
    if (homeWalkable(x + dx / n, z)) x += dx / n;
    if (homeWalkable(x, z + dz / n)) z += dz / n;
  }
  return { x, z };
}
export function straightHomePath(a: HomePoint, b: HomePoint) {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.08));
  for (let i = 0; i <= n; i++)
    if (!homeWalkable(a.x + ((b.x - a.x) * i) / n, a.z + ((b.z - a.z) * i) / n))
      return false;
  return true;
}
export function homePath(start: HomePoint, target: HomePoint): HomePoint[] {
  if (!homeWalkable(start.x, start.z) || !homeWalkable(target.x, target.z))
    return [];
  if (straightHomePath(start, target)) return [{ ...target }];
  const size = 0.25,
    key = (p: HomePoint) => p.x + "," + p.z,
    grid = (p: HomePoint) => ({ x: p.x * size, z: p.z * size }),
    center = { x: Math.round(start.x / size), z: Math.round(start.z / size) };
  const candidates = [];
  for (let x = -1; x <= 1; x++)
    for (let z = -1; z <= 1; z++)
      candidates.push({ x: center.x + x, z: center.z + z });
  candidates.sort(
    (a, b) =>
      Math.hypot(a.x * size - start.x, a.z * size - start.z) -
      Math.hypot(b.x * size - start.x, b.z * size - start.z),
  );
  const first = candidates.find((p) => straightHomePath(start, grid(p)));
  if (!first) return [];
  const queue = [first],
    parents = new Map<string, HomePoint | null>([[key(first), null]]);
  let end: HomePoint | null = null;
  for (let i = 0; i < queue.length && i < 2200; i++) {
    const cell = queue[i],
      p = grid(cell);
    if (
      Math.hypot(p.x - target.x, p.z - target.z) < 0.42 &&
      straightHomePath(p, target)
    ) {
      end = cell;
      break;
    }
    for (const [x, z] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const next = { x: cell.x + x, z: cell.z + z };
      if (parents.has(key(next)) || !straightHomePath(p, grid(next))) continue;
      parents.set(key(next), cell);
      queue.push(next);
    }
  }
  if (!end) return [];
  const points = [{ ...target }];
  let c: HomePoint | null = end;
  while (c) {
    points.unshift(grid(c));
    c = parents.get(key(c)) ?? null;
  }
  const route: HomePoint[] = [];
  let from = start,
    i = 0;
  while (i < points.length) {
    let j = i;
    while (j + 1 < points.length && straightHomePath(from, points[j + 1])) j++;
    route.push(points[j]);
    from = points[j];
    i = j + 1;
  }
  return route;
}
export type HomeAction =
  | "baking"
  | "wardrobe"
  | "letter"
  | "relax"
  | "sleep"
  | "seat"
  | "exit";
const anchor = (name: string) => {
  const a = (
    layout.anchors as Record<string, { position: number[]; yaw: number }>
  )[name];
  return { x: a.position[0], z: a.position[2], yaw: a.yaw };
};
export const HOME_ACTIONS: {
  id: HomeAction;
  label: string;
  x: number;
  z: number;
  yaw: number;
}[] = [
  { id: "baking", label: "Bake in the kitchen", ...anchor("approach_kitchen") },
  { id: "wardrobe", label: "Open wardrobe", ...anchor("approach_wardrobe") },
  { id: "letter", label: "Read Nancy’s letter", ...anchor("approach_desk") },
  { id: "relax", label: "Play together", ...anchor("approach_sofa") },
  { id: "sleep", label: "Evening lamplight", ...anchor("approach_bed") },
  { id: "seat", label: "Sit for a little tea", ...anchor("approach_seat") },
  { id: "exit", label: "Go out to the village", ...anchor("approach_exit") },
];
export const HOME_SEAT = anchor("tea_seat");
export function normalizeHome(raw: unknown) {
  const o =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const p =
    typeof o.x === "number" && typeof o.z === "number" && homeWalkable(o.x, o.z)
      ? { x: o.x, z: o.z }
      : HOME_SPAWN;
  return {
    ...p,
    yaw:
      typeof o.yaw === "number" && Number.isFinite(o.yaw)
        ? Math.atan2(Math.sin(o.yaw), Math.cos(o.yaw))
        : 0,
    teaMoments:
      typeof o.teaMoments === "number" && Number.isFinite(o.teaMoments)
        ? Math.max(0, Math.min(999999, Math.floor(o.teaMoments)))
        : 0,
  };
}

export function homeFloorHeight(p: HomePoint) {
  let height = layout.floor[0][1] + 0.015;
  for (const a of (
    layout as unknown as {
      navigation: {
        floor_areas: {
          shape: string;
          x: number;
          z: number;
          rx: number;
          rz: number;
          height: number;
        }[];
      };
    }
  ).navigation.floor_areas) {
    if (a.shape === "rectangle") {
      if (Math.abs(p.x - a.x) <= a.rx && Math.abs(p.z - a.z) <= a.rz)
        height = Math.max(height, a.height);
    } else {
      const r = ((p.x - a.x) / a.rx) ** 2 + ((p.z - a.z) / a.rz) ** 2,
        v = Math.max(0, Math.min(1, (1 - r) / 0.12));
      height = Math.max(
        height,
        layout.floor[0][1] +
          0.015 +
          (a.height - layout.floor[0][1] - 0.015) * v * v * (3 - 2 * v),
      );
    }
  }
  return height;
}
