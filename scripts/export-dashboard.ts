// Writes the playground's example dashboard to examples/dashboard.yaml (Node ≥ 23 strips TS types).
import { writeFileSync } from "node:fs";
import { DASHBOARD } from "../playground/dashboard.ts";
import { toYaml } from "../playground/yaml.ts";

const header = `# TE Components example dashboard (sections view).
# Settings → Dashboards → Add dashboard → ⋮ → Raw configuration editor, then paste.
# Replace the entity ids with your own.
`;
writeFileSync(new URL("../examples/dashboard.yaml", import.meta.url), `${header}${toYaml(DASHBOARD)}\n`);
console.log("wrote examples/dashboard.yaml");
