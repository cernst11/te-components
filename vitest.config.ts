import { defineConfig } from "vitest/config";

// Separate from vite.config.ts, whose dev root is the playground.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
