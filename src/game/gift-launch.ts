import {
  browserStorage,
  emptyStorage,
  migrateLegacy,
  sanitizeSave,
  read,
  type StorageLike,
} from "./storage";
import { commitRestoredSave } from "./backup";
export const GIFT_START_KEY = "kitty-nancy-gift-start-v1";
/** A deliberate first-play reset, once for this gift, never once per release. */
export function prepareGiftVisit(
  storage: StorageLike,
  search: string,
): { storage: StorageLike; started: boolean } {
  const version = new URLSearchParams(search).get("v");
  if (version !== "gift-19" && version !== "gift-20")
    return { storage, started: false };
  try {
    if (storage.getItem(GIFT_START_KEY) === "1")
      return { storage, started: false };
    const legacy = migrateLegacy(storage);
    const current = sanitizeSave(
      (read(storage, "kitty-world-v2") as { state?: unknown } | null)?.state,
      legacy,
    );
    commitRestoredSave(
      storage,
      current,
      migrateLegacy(emptyStorage),
      true,
      GIFT_START_KEY,
    );
    return { storage, started: true };
  } catch {
    // Start at zero even when browser storage is blocked. Preserve the old
    // disk save, keep this session in memory, and report writes as unsaved.
    const memory = new Map<string, string>([
      [
        "kitty-world-v2",
        JSON.stringify({ state: migrateLegacy(emptyStorage), version: 2 }),
      ],
    ]);
    return {
      started: true,
      storage: {
        getItem: (key) => memory.get(key) ?? null,
        setItem: (key, value) => {
          memory.set(key, value);
          throw Error("Saving is unavailable");
        },
        removeItem: (key) => {
          memory.delete(key);
        },
      },
    };
  }
}
export function giftVisitStorage() {
  return prepareGiftVisit(
    browserStorage(),
    typeof location === "undefined" ? "" : location.search,
  );
}
