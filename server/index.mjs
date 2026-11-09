import { createVisitService } from "./visits.mjs";
const port = Number(process.env.PORT || 8787);
const origins = (
  process.env.ALLOWED_ORIGINS ||
  "http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:8081"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const service = createVisitService({
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
