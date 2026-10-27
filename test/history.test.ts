import { describe, expect, it } from "vitest";
import { bucket, fetchHistory } from "../src/core/history";
import type { HomeAssistant } from "../src/types";

const HOUR = 3600_000;
const NOW = 1_000 * HOUR;

describe("bucket", () => {
  it("averages the samples in each bucket", () => {
    const samples = [
      { t: NOW - 3.5 * HOUR, v: 10 },
      { t: NOW - 3.2 * HOUR, v: 20 },
      { t: NOW - 0.5 * HOUR, v: 5 },
    ];
    expect(bucket(samples, 4, 4, NOW)).toEqual([15, 20, 20, 5]);
  });

  it("carries a value from before the window into the empty buckets", () => {
    expect(bucket([{ t: NOW - 10 * HOUR, v: 7 }], 3, 3, NOW)).toEqual([7, 7, 7]);
  });

  it("leaves leading buckets null when there is no earlier value", () => {
    expect(bucket([{ t: NOW - 0.5 * HOUR, v: 1 }], 2, 2, NOW)).toEqual([null, 1]);
  });

  it("sorts unsorted samples", () => {
    const samples = [
      { t: NOW - 0.5 * HOUR, v: 2 },
      { t: NOW - 1.5 * HOUR, v: 1 },
    ];
    expect(bucket(samples, 2, 2, NOW)).toEqual([1, 2]);
  });

  it("returns n nulls for no samples", () => {
    expect(bucket([], 3, 1, NOW)).toEqual([null, null, null]);
  });
});

describe("fetchHistory", () => {
  it("asks the recorder for the window and keeps numeric states", async () => {
    let msg: Record<string, unknown> | undefined;
    const hass = {
      states: {},
      callService: async () => {},
      callWS: async (m: Record<string, unknown>) => {
        msg = m;
        return { "sensor.t": [{ s: "20.5", lu: 100 }, { s: "unavailable", lu: 200 }, { s: "21", lu: 300 }] };
      },
    } as unknown as HomeAssistant;
    const samples = await fetchHistory(hass, "sensor.t", 24);
    expect(samples).toEqual([
      { t: 100_000, v: 20.5 },
      { t: 300_000, v: 21 },
    ]);
    expect(msg).toMatchObject({ type: "history/history_during_period", entity_ids: ["sensor.t"], minimal_response: true, no_attributes: true });
    expect(Date.parse(msg!.end_time as string) - Date.parse(msg!.start_time as string)).toBe(24 * HOUR);
  });

  it("returns nothing without callWS", async () => {
    expect(await fetchHistory({ states: {}, callService: async () => {} } as HomeAssistant, "sensor.t", 1)).toEqual([]);
  });
});
