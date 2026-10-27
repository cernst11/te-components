import { readFileSync } from "node:fs";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

// Separate from vite.config.ts, whose dev root is the playground.
export default defineConfig({
  define: { __VERSION__: JSON.stringify(pkg.version) },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["test/**/*.test.ts"], exclude: ["test/browser/**"], environment: "node" },
      },
      {
        extends: true,
        test: {
          name: "browser",
          include: ["test/browser/**/*.test.ts"],
          browser: { enabled: true, provider: playwright(), headless: true, instances: [{ browser: "chromium" }] },
        },
      },
    ],
  },
});
