import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

/** The bundle is what gets distributed, so it carries the license notice (added after minification). */
const BANNER = `/*! te-components v${pkg.version} | (c) 2026 cernst11 | GPL-3.0-or-later | https://github.com/cernst11/te-components */\n`;

const licenseBanner = (): Plugin => ({
  name: "license-banner",
  apply: "build",
  generateBundle(_, bundle) {
    for (const file of Object.values(bundle)) if (file.type === "chunk") file.code = BANNER + file.code;
  },
});

export default defineConfig(({ command }) => ({
  plugins: [licenseBanner()],
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
    rolldownOptions: {
      output: { minify: true },
    },
  },
}));
