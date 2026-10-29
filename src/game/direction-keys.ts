import type { Direction } from "./types";
type Key = { key: string; code?: string };
const codes: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};
const letters: Record<string, Direction> = {
  w: "up", s: "down", a: "left", d: "right",
};
export function directionForKey(e: Key): Direction | undefined {
  return codes[e.code || e.key] || letters[e.key.toLowerCase()];
}
/** Last pressed wins; releasing it restores the direction still held beneath it. */
export class DirectionKeys {
  private keys = new Map<string, Direction>();
  private current() {
    return [...this.keys.values()].at(-1) || null;
  }
  press(e: Key): Direction | undefined {
    const dir = directionForKey(e),
      id = e.code || e.key.toLowerCase();
    if (!dir || this.keys.has(id)) return;
    this.keys.set(id, dir);
    return dir;
  }
  release(e: Key): Direction | null | undefined {
    const before = this.current();
    this.keys.delete(e.code || e.key.toLowerCase());
    const after = this.current();
    return before === after ? undefined : after;
  }
  clear() {
    this.keys.clear();
  }
}
