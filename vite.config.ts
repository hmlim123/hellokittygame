import { execFileSync } from "node:child_process";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
const revision =
  process.env.GITHUB_SHA?.slice(0, 7) ||
  (() => {
    try {
      return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
        encoding: "utf8",
      }).trim();
    } catch {
      return "local";
    }
  })();
export default defineConfig({
  define: { "import.meta.env.VITE_BUILD_REVISION": JSON.stringify(revision) },
  base: "./",
  plugins: [react()],
  build: {
    outDir: "build",
    rollupOptions: {
      input: {
        room: resolve(import.meta.dirname, "index.html"),
        adventure: resolve(import.meta.dirname, "adventure.html"),
      },
    },
  },
  server: { host: "0.0.0.0" },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
