import {
  migrateLegacy,
  emptyStorage,
  sanitizeSave,
  mirrorLegacy,
  read,
  type StorageLike,
} from "./storage";
import type { SaveState } from "./types";
export const BACKUP_LIMIT = 256 * 1024;
export const PREVIOUS_BACKUP = "kitty-backup-before-restore-v1";
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
export function serializeBackup(save: SaveState) {
  return JSON.stringify(
    {
      format: "nancy-kitty-save",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        room: save.room,
        adventure: save.adventure,
        equipment: save.equipment,
        preferences: save.preferences,
        journal: save.journal,
        cozy: save.cozy,
      },
    },
    null,
    2,
  );
}
export function parseBackup(text: string): SaveState {
  if (text.length > BACKUP_LIMIT)
    throw Error(
      "This file is too large to be a Kitty save. Choose a backup downloaded from Settings.",
    );
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    throw Error(
      "This file is not valid JSON. Choose a Kitty save downloaded from Settings.",
    );
  }
  if (
    !record(file) ||
    file.format !== "nancy-kitty-save" ||
    file.version !== 1 ||
    !record(file.data)
  )
    throw Error(
      "This backup format is not supported. Your current progress is unchanged.",
    );
  const s = file.data;
  if (
    !record(s.room) ||
    !Array.isArray(s.room.owned) ||
    !record(s.adventure) ||
    !["village", "garden", "glade"].includes(String(s.adventure.map)) ||
    !Array.isArray(s.adventure.charms) ||
    !record(s.equipment) ||
    !record(s.preferences) ||
    !record(s.journal)
  )
    throw Error(
      "This backup is missing game progress. Your current progress is unchanged.",
    );
  return sanitizeSave(s, migrateLegacy(emptyStorage));
}
const SAVE_KEYS = [
  "kitty-world-v2",
  "kitty-room-3d-v1",
  "kitty-nancy-adventure-v1",
  "kitty-nancy-equipment-v1",
  "kitty-nancy-missions-v1",
  "kitty-nancy-cozy-v1",
  "kitty-room-preferences-v1",
  "kitty-picnic-v1",
  PREVIOUS_BACKUP,
];
/** Keep the current save and roll back partial storage writes before changing the live game. */
export function commitRestoredSave(
  storage: StorageLike,
  current: SaveState,
  next: SaveState,
  resetLegacy = false,
  giftStartKey?: string,
): string {
  let before: Map<string, string | null>;
  try {
    before = new Map(
      [...SAVE_KEYS, ...(giftStartKey ? [giftStartKey] : [])].map((key) => [
        key,
        storage.getItem(key),
      ]),
    );
  } catch {
    throw Error("Saving is unavailable. Your current game has not changed.");
  }
  const json = JSON.stringify({ state: next, version: 2 });
  try {
    storage.setItem(PREVIOUS_BACKUP, serializeBackup(current));
    if (resetLegacy) {
      const picnic = read(storage, "kitty-picnic-v1");
      // Only clear the collection merged into this game, preserving unrelated
      // classic picnic fields and the separately owned classic wallet.
      storage.setItem(
        "kitty-picnic-v1",
        JSON.stringify({ ...(record(picnic) ? picnic : {}), owned: [0] }),
      );
    }
    if (!mirrorLegacy(storage, next)) throw Error("Saving is unavailable.");
    storage.setItem("kitty-world-v2", json);
    if (giftStartKey) storage.setItem(giftStartKey, "1");
  } catch {
    for (const [key, value] of before) {
      try {
        if (value === null) storage.removeItem?.(key);
        else storage.setItem(key, value);
      } catch {
        /* The original downloadable backup is still available to its owner. */
      }
    }
    throw Error(
      "The backup could not be saved. Your current game has not changed. Download your progress and try again.",
    );
  }
  return json;
}
export function downloadText(text: string, name: string) {
  const url = URL.createObjectURL(
      new Blob([text], { type: "application/json" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
