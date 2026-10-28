// Fails when the built bundle outgrows its budget (`npm run size`, after `npm run build`).
// Raise the budget in the same PR when growth is intended, so the cost shows up in review.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const BUDGET_KB = 70; // gzipped; 60.8 kB at 0.3.2

const file = new URL("../dist/te-components.js", import.meta.url);
const kb = gzipSync(readFileSync(file)).length / 1024;
const line = `te-components.js: ${kb.toFixed(1)} kB gzipped (budget ${BUDGET_KB} kB)`;
if (kb > BUDGET_KB) {
  console.error(`✗ ${line}`);
  process.exit(1);
}
console.log(`✓ ${line}`);
