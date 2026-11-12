import type { SaveState } from "./types";
// A visitor can try activities locally without writing into this browser’s personal save.
let original: SaveState | null = null;
export const isGuestSession = () => original !== null;
export function beginGuestSession(save: SaveState) {
  if (!original)
    original = structuredClone({
      room: save.room,
      adventure: save.adventure,
      equipment: save.equipment,
      preferences: save.preferences,
      journal: save.journal,
      cozy: save.cozy,
    });
}
export function endGuestSession(restore?: (save: SaveState) => void) {
  const save = original;
  if (save && restore) restore(save);
  original = null;
  return save;
}
