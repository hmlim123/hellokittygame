import { createAccounts } from "./accounts.mjs";
import { createVisitService } from "./visits.mjs";
if (process.env.RENDER && process.env.PRIVATE_ACCOUNTS !== "true")
  throw Error(
    "Render visits require PRIVATE_ACCOUNTS=true and persistent account storage.",
  );
const port = Number(process.env.PORT || 8787);
const origins = (
  process.env.ALLOWED_ORIGINS ||
  "http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:8081"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const service = createVisitService({
  accounts:
    process.env.PRIVATE_ACCOUNTS === "true"
      ? createAccounts({
          storeFile: process.env.ACCOUNT_STORE_FILE,
          setupKey: process.env.ACCOUNT_SETUP_KEY,
        })
      : null,
  origins,
  storeFile: process.env.VISIT_STORE_FILE || null,
});
await service.listen(port, "0.0.0.0");
console.log("Nancy’s private village visits are ready on port", port);
let stopping = false;
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, async () => {
    if (stopping) return;
    stopping = true;
    await service.close();
    process.exit(0);
  });
