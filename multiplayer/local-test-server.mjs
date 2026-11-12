import { createTestWorker } from "./test-runtime.mjs";
const mf = await createTestWorker({
  origin: process.env.ALLOWED_ORIGINS,
  setupKey: process.env.ACCOUNT_SETUP_KEY,
  persist: process.env.FREE_VISITS_DATA,
  port: Number(process.env.PORT || 8787),
});
await mf.ready;
console.log("Free village local test service is ready.");
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, async () => {
    await mf.dispose();
    process.exit(0);
  });
