import type { SaveState, Preferences } from "./types";
import {
  normalizeAdventure,
  normalizeEquipment,
  normalizeRoom,
  normalizeJournal,
} from "./domain";
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}
export const emptyStorage: StorageLike = {
  getItem: () => null,
  setItem: () => undefined,
};
export function browserStorage(): StorageLike {
  try {
    return localStorage;
  } catch {
    return {
      getItem: () => null,
      setItem: () => {
        throw new Error("Saving is unavailable");
      },
    };
  }
}
export function read(storage: StorageLike, key: string): unknown {
  try {
    return JSON.parse(storage.getItem(key) || "null");
  } catch {
    return null;
  }
}
export function normalizePreferences(value: unknown): Preferences {
  const p = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >;
  return {
    relaxed: p.relaxed === true,
    letterOpened: p.letterOpened === true,
    motion: p.motion === "reduce" ? "reduce" : "system",
    quality:
      p.quality === "gentle" || p.quality === "crisp" ? p.quality : "auto",
  };
}
export function migrateLegacy(storage: StorageLike): SaveState {
  const adventure = normalizeAdventure(
    read(storage, "kitty-nancy-adventure-v1"),
  );
  return {
    adventure,
    room: normalizeRoom(
      read(storage, "kitty-room-3d-v1"),
      read(storage, "kitty-picnic-v1"),
    ),
    equipment: normalizeEquipment(
      read(storage, "kitty-nancy-equipment-v1"),
      adventure,
      read(storage, "kitty-room-preferences-v1"),
    ),
    journal: normalizeJournal(read(storage, "kitty-nancy-missions-v1")),
    preferences: normalizePreferences(
      read(storage, "kitty-room-preferences-v1"),
    ),
  };
}
export function sanitizeSave(value: unknown, fallback: SaveState): SaveState {
  const s = (
    value && typeof value === "object" ? value : {}
  ) as Partial<SaveState>;
  const adventure = normalizeAdventure(s.adventure ?? fallback.adventure);
  return {
    adventure,
    room: normalizeRoom(s.room ?? fallback.room),
    equipment: normalizeEquipment(s.equipment ?? fallback.equipment, adventure),
    journal: normalizeJournal(s.journal ?? fallback.journal),
    preferences: normalizePreferences(s.preferences ?? fallback.preferences),
  };
}
export function mirrorLegacy(storage: StorageLike, s: SaveState) {
  const old = read(storage, "kitty-room-preferences-v1");
  const values: Record<string, unknown> = {
    "kitty-room-3d-v1": s.room,
    "kitty-nancy-adventure-v1": s.adventure,
    "kitty-nancy-equipment-v1": s.equipment,
    "kitty-nancy-missions-v1": s.journal,
    "kitty-room-preferences-v1": {
      ...(old && typeof old === "object" ? old : {}),
      ...s.preferences,
      heldGift: s.equipment.item,
    },
  };
  let saved = true;
  for (const [key, value] of Object.entries(values)) {
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch {
      saved = false;
    }
  }
  return saved;
}
