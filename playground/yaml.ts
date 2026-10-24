/** Tiny YAML emitter for showing configs the way users would paste them. */
const NEEDS_QUOTES = /: |:$| #|^[-?:,[\]{}#&*!|>'"%@`]|[{}[\],]|^\s|\s$|^$|^[-+]?[\d.]+$|^(true|false|yes|no|on|off|null|~)$/i;

export function toYaml(v: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (Array.isArray(v)) {
    return v.map((item) => `${pad}- ${toYaml(item, indent + 1).trimStart()}`).join("\n");
  }
  if (v && typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => {
        if (val && typeof val === "object") return `${pad}${k}:\n${toYaml(val, indent + 1)}`;
        return `${pad}${k}: ${scalar(val)}`;
      })
      .join("\n");
  }
  return `${pad}${scalar(v)}`;
}

function scalar(v: unknown): string {
  return typeof v === "string" && NEEDS_QUOTES.test(v) ? JSON.stringify(v) : String(v);
}
