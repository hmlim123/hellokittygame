import { cp, mkdir } from "node:fs/promises";
await mkdir("public/assets", { recursive: true });
await cp("dist/assets", "public/assets", { recursive: true });

await cp("dist", "public/classic", { recursive: true });
