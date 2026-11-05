import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
await mkdir("public/assets", { recursive: true });
await cp("dist/assets", "public/assets", { recursive: true });

await cp("dist", "public/classic", { recursive: true });

// Version the entire classic module graph, so an older cached normalizer cannot
// silently discard a newly selected plush when Nancy opens the fallback.
const { version } = JSON.parse(await readFile("package.json", "utf8"));
for (const file of await readdir("public/classic", { recursive: true })) {
  if (!/\.(js|html)$/.test(file)) continue;
  const path = `public/classic/${file}`;
  const source = await readFile(path, "utf8");
  const revised = source.replace(
    /(["'])(\.{1,2}\/[^"'\s]+\.js)(?:\?v=[^"'\s]+)?\1/g,
    (_, quote, module) => `${quote}${module}?v=classic-${version}${quote}`,
  );
  if (revised !== source) await writeFile(path, revised);
}
