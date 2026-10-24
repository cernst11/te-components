import type { HomeAssistant } from "../types";
import { toNumber } from "../utils/math";

export interface Sample {
  /** ms since epoch */
  t: number;
  v: number;
}

/** Compressed state rows from `history/history_during_period` with `minimal_response`. */
interface CompressedState {
  s: string;
  lu: number;
  lc?: number;
}

/** Numeric history for one entity (or one of its attributes, via `significant_changes_only: false`). */
export async function fetchHistory(hass: HomeAssistant, entityId: string, hours: number): Promise<Sample[]> {
  if (!hass.callWS) return [];
  const end = new Date();
  const start = new Date(end.getTime() - hours * 3600_000);
  const res = await hass.callWS<Record<string, CompressedState[]>>({
    type: "history/history_during_period",
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    entity_ids: [entityId],
    minimal_response: true,
    no_attributes: true,
    significant_changes_only: false,
  });
  const rows = res?.[entityId] ?? [];
  const out: Sample[] = [];
  for (const row of rows) {
    const v = toNumber(row.s);
    if (v !== undefined) out.push({ t: (row.lu ?? row.lc ?? 0) * 1000, v });
  }
  return out;
}

/**
 * Resamples samples into `n` equal time buckets ending now: mean of the samples in each bucket,
 * carrying the last known value through empty ones (sensors only report on change).
 */
export function bucket(samples: Sample[], n: number, hours: number, now = Date.now()): (number | null)[] {
  const span = hours * 3600_000;
  const start = now - span;
  const sorted = [...samples].sort((a, b) => a.t - b.t);
  const out: (number | null)[] = [];
  let i = 0;
  let last: number | null = null;
  while (i < sorted.length && sorted[i].t < start) last = sorted[i++].v;
  for (let b = 0; b < n; b++) {
    const end = start + ((b + 1) * span) / n;
    let sum = 0;
    let count = 0;
    while (i < sorted.length && sorted[i].t < end) {
      sum += sorted[i].v;
      count++;
      last = sorted[i++].v;
    }
    out.push(count ? sum / count : last);
  }
  return out;
}
