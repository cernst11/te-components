export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const clamp01 = (v: number) => clamp(v, 0, 1);

export function toNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

export function decimalsOf(step: number): number {
  if (!Number.isFinite(step) || step >= 1) return 0;
  const s = String(step);
  const i = s.indexOf(".");
  return i === -1 ? 0 : s.length - i - 1;
}

export const domainOf = (entityId: string | undefined) => (entityId ? entityId.split(".")[0] : "");
