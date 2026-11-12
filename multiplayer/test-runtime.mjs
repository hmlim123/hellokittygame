import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const bundles = new Map();
export async function createTestWorker({
  origin = "https://hmlim123.github.io",
  setupKey = "local-worker-fixture-private-owner-setup-key",
  persist,
  port,
  instrument = false,
} = {}) {
  if (!bundles.has(instrument))
    bundles.set(
      instrument,
      build({
        absWorkingDir: root,
        stdin: {
          contents: instrument
            ? `import worker, {PrivateVillage} from "./worker.mjs";
      export default worker;
      export class TestVillage extends PrivateVillage {
        constructor(ctx,env) {super(ctx,env);this.instanceId=crypto.randomUUID();}
        fetch(request) {
          if(new URL(request.url).pathname === "/__test_runtime") return Response.json({instance:this.instanceId,persistedX:this.read("room")?.guest?.x,players:[this.publicActor(this.room?.host),this.publicActor(this.room?.guest)]});
          return super.fetch(request);
        }
      }`
            : `export {default,PrivateVillage} from "./worker.mjs";`,
          resolveDir: root + "multiplayer",
          sourcefile: "test-worker.mjs",
        },
        bundle: true,
        format: "esm",
        platform: "neutral",
        external: ["node:*", "cloudflare:workers"],
        write: false,
      }).then((r) => r.outputFiles[0].text),
    );
  return new Miniflare(
    convertV4MiniflareOptions({
      name: "nancy-village-free",
      modules: true,
      script: await bundles.get(instrument),
      compatibilityDate: "2026-11-01",
      compatibilityFlags: ["nodejs_compat"],
      bindings: { ALLOWED_ORIGINS: origin, ACCOUNT_SETUP_KEY: setupKey },
      durableObjects: {
        VILLAGE: {
          className: instrument ? "TestVillage" : "PrivateVillage",
          useSQLite: true,
          unsafePreventEviction: false,
        },
      },
      ...(persist ? { resourcePersistencePath: persist } : {}),
      ...(port ? { port, host: "127.0.0.1" } : {}),
      cf: false,
    }),
  );
}
