import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig(({ command }) => ({
  define: { __VERSION__: JSON.stringify(pkg.version) },
  // `npm run dev` serves the playground; `npm run build` emits the HACS bundle.
  root: command === "serve" ? "playground" : undefined,
  build: {
    lib: { entry: "src/index.ts", formats: ["es"], fileName: () => "te-components.js" },
    outDir: "dist",
    emptyOutDir: true,
    target: "es2021",
    minify: true,
    // Vite 8 skips minification for ES library builds unless asked at the output level.
    rolldownOptions: { output: { minify: true } },
  },
}));
