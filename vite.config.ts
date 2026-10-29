import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
export default defineConfig({
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
