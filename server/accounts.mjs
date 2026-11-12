import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname } from "node:path";
import { createAccountState } from "./account-state.mjs";
export { PROFILES } from "./account-state.mjs";
/** Optional Node hosting uses the same account rules as the free Worker. */
export function createAccounts({ storeFile, setupKey, now = Date.now } = {}) {
  if (!storeFile)
    throw Error(
      "Private accounts require a persistent ACCOUNT_STORE_FILE and an ACCOUNT_SETUP_KEY of at least 32 characters.",
    );
  return createAccountState({
    setupKey,
    now,
    storage: {
      load() {
        try {
          return JSON.parse(readFileSync(storeFile, "utf8"));
        } catch (error) {
          if (error.code === "ENOENT") return null;
          throw error;
        }
      },
      save(next) {
        mkdirSync(dirname(storeFile), { recursive: true, mode: 0o700 });
        writeFileSync(storeFile + ".tmp", JSON.stringify(next), {
          mode: 0o600,
        });
        renameSync(storeFile + ".tmp", storeFile);
      },
    },
  });
}
