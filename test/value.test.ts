import { describe, expect, it } from "vitest";
import { assertValueConfig, displayAttribute, formatValue, fracOf, hvacStatus, resolveValue, valueAt, writeValue } from "../src/core/value";
import { entity, fakeHass, fakeHost } from "./helpers";

describe("resolveValue", () => {
  it("reads a light's brightness as a percentage", () => {
    const hass = fakeHass([entity("light.kitchen", "on", { brightness: 128 })]);
    const r = resolveValue(hass, { entity: "light.kitchen" });
    expect(r).toMatchObject({ min: 0, max: 255, step: 1, value: 128, percent: true });
    expect(formatValue(r, r.value)).toBe("50%");
  });

  it("treats a light that is off (no brightness attribute) as min", () => {
    const hass = fakeHass([entity("light.kitchen", "off")]);
    expect(resolveValue(hass, { entity: "light.kitchen" }).value).toBe(0);
  });

  it("reads media player volume 0..1 as a percentage", () => {
    const hass = fakeHass([entity("media_player.tv", "playing", { volume_level: 0.35 })]);
    const r = resolveValue(hass, { entity: "media_player.tv" });
    expect(r).toMatchObject({ min: 0, max: 1, step: 0.01, value: 0.35, percent: true });
    expect(formatValue(r, r.value)).toBe("35%");
  });

  it("takes a thermostat's range and step from its attributes", () => {
    const hass = fakeHass([entity("climate.lr", "heat", { temperature: 21.5, min_temp: 10, max_temp: 30, target_temp_step: 0.5 })]);
    const r = resolveValue(hass, { entity: "climate.lr" });
    expect(r).toMatchObject({ min: 10, max: 30, step: 0.5, value: 21.5, percent: false, unit: "°", decimals: 1 });
    expect(formatValue(r, r.value)).toBe("21.5°");
  });

  it("falls back to domain defaults when the entity has no range attributes", () => {
    const hass = fakeHass([entity("climate.lr", "heat", { temperature: 20 })]);
    expect(resolveValue(hass, { entity: "climate.lr" })).toMatchObject({ min: 7, max: 35, step: 0.5 });
  });

  it("reads number / input_number from the state with min/max/step attributes", () => {
    const hass = fakeHass([entity("input_number.level", "4", { min: 0, max: 10, step: 0.5, unit_of_measurement: "dB" })]);
    const r = resolveValue(hass, { entity: "input_number.level" });
    expect(r).toMatchObject({ min: 0, max: 10, step: 0.5, value: 4, unit: "dB" });
  });

  it("reads cover position and fan percentage", () => {
    const hass = fakeHass([entity("cover.blinds", "open", { current_position: 40 }), entity("fan.ceiling", "on", { percentage: 66, percentage_step: 33.33 })]);
    expect(resolveValue(hass, { entity: "cover.blinds" }).value).toBe(40);
    expect(resolveValue(hass, { entity: "fan.ceiling" })).toMatchObject({ value: 66, step: 33.33 });
  });

  it("uses the light color temperature spec for attribute: color_temp_kelvin", () => {
    const hass = fakeHass([entity("light.desk", "on", { color_temp_kelvin: 3000, min_color_temp_kelvin: 2200, max_color_temp_kelvin: 6500 })]);
    const r = resolveValue(hass, { entity: "light.desk", attribute: "color_temp_kelvin" });
    expect(r).toMatchObject({ min: 2200, max: 6500, step: 50, value: 3000, percent: false, unit: "K" });
  });

  it("lets config override range, unit, decimals and percent", () => {
    const hass = fakeHass([entity("light.kitchen", "on", { brightness: 100 })]);
    const r = resolveValue(hass, { entity: "light.kitchen", min: 10, max: 200, step: 5, unit: "lv", decimals: 2, percent: false });
    expect(r).toMatchObject({ min: 10, max: 200, step: 5, unit: "lv", decimals: 2, percent: false });
    expect(formatValue(r, 100)).toBe("100.00lv");
  });

  it("returns a null value for missing or non-numeric entities", () => {
    const hass = fakeHass([entity("input_number.x", "unavailable")]);
    expect(resolveValue(hass, { entity: "input_number.x" }).value).toBeNull();
    expect(resolveValue(hass, { entity: "input_number.missing" }).value).toBeNull();
    expect(resolveValue(undefined, { entity: "light.kitchen" }).value).toBeNull();
  });
});

describe("valueAt / fracOf", () => {
  const r = { min: 10, max: 30, step: 0.5, value: null, percent: false, unit: "", decimals: 1 };

  it("maps a fraction to a stepped value", () => {
    expect(valueAt(r, 0)).toBe(10);
    expect(valueAt(r, 1)).toBe(30);
    expect(valueAt(r, 0.5)).toBe(20);
    expect(valueAt(r, 0.512)).toBe(20.0); // 20.24 → nearest 0.5
    expect(valueAt(r, 0.52)).toBe(20.5);
  });

  it("clamps out-of-range fractions", () => {
    expect(valueAt(r, -1)).toBe(10);
    expect(valueAt(r, 2)).toBe(30);
  });

  it("avoids float noise from fractional steps", () => {
    const vol = { ...r, min: 0, max: 1, step: 0.01 };
    expect(valueAt(vol, 0.07)).toBe(0.07);
  });

  it("is the inverse of fracOf", () => {
    expect(fracOf(r, 25)).toBe(0.75);
    expect(fracOf(r, 100)).toBe(1);
    expect(fracOf({ ...r, max: 10 }, 10)).toBe(0);
  });

  it("formats null as --", () => {
    expect(formatValue(r, null)).toBe("--");
  });
});

describe("writeValue", () => {
  const cases: [string, string, string, Record<string, unknown>][] = [
    ["light.kitchen", "light", "turn_on", { brightness: 128 }],
    ["media_player.tv", "media_player", "volume_set", { volume_level: 128 }],
    ["climate.lr", "climate", "set_temperature", { temperature: 128 }],
    ["water_heater.boiler", "water_heater", "set_temperature", { temperature: 128 }],
    ["number.x", "number", "set_value", { value: 128 }],
    ["input_number.x", "input_number", "set_value", { value: 128 }],
    ["fan.ceiling", "fan", "set_percentage", { percentage: 128 }],
    ["cover.blinds", "cover", "set_cover_position", { position: 128 }],
    ["valve.water", "valve", "set_valve_position", { position: 128 }],
  ];

  it.each(cases)("%s calls %s.%s", (id, domain, service, data) => {
    const hass = fakeHass();
    writeValue(fakeHost().host, hass, { entity: id }, 128);
    expect(hass.calls).toEqual([{ domain, service, data: { entity_id: id, ...data } }]);
  });

  it("writes color temperature through light.turn_on", () => {
    const hass = fakeHass();
    writeValue(fakeHost().host, hass, { entity: "light.desk", attribute: "color_temp_kelvin" }, 2700);
    expect(hass.calls).toEqual([{ domain: "light", service: "turn_on", data: { entity_id: "light.desk", color_temp_kelvin: 2700 } }]);
  });

  it("uses set_action with {{ value }} for other entities", () => {
    const hass = fakeHass();
    const set_action = { action: "perform-action" as const, perform_action: "script.set_level", data: { level: "{{ value }}" } };
    writeValue(fakeHost().host, hass, { entity: "sensor.anything", set_action }, 7);
    expect(hass.calls).toEqual([{ domain: "script", service: "set_level", data: { level: 7 }, target: { entity_id: "sensor.anything" } }]);
  });
});

describe("assertValueConfig", () => {
  it("requires an entity", () => {
    expect(() => assertValueConfig({})).toThrow("entity is required");
  });

  it("requires set_action for unsupported domains", () => {
    expect(() => assertValueConfig({ entity: "sensor.x" })).toThrow("set_action is required for sensor");
    expect(() => assertValueConfig({ entity: "sensor.x", set_action: { action: "none" } })).not.toThrow();
    expect(() => assertValueConfig({ entity: "light.x" })).not.toThrow();
  });
});

describe("hvacStatus", () => {
  it("shows the running action in upper case", () => {
    expect(hvacStatus(entity("climate.lr", "heat", { hvac_action: "heating" }))).toEqual({ text: "HEATING", running: true });
    expect(hvacStatus(entity("climate.lr", "cool", { hvac_action: "fan" }))).toEqual({ text: "FAN", running: true });
  });

  it("shows ON / OFF when idle", () => {
    expect(hvacStatus(entity("climate.lr", "heat", { hvac_action: "idle" }))).toEqual({ text: "ON", running: false });
    expect(hvacStatus(entity("climate.lr", "off"))).toEqual({ text: "OFF", running: false });
    expect(hvacStatus(entity("water_heater.b", "eco", { hvac_action: "off" }))).toEqual({ text: "OFF", running: false });
  });

  it("shows -- when unavailable and nothing for other domains", () => {
    expect(hvacStatus(entity("climate.lr", "unavailable"))).toEqual({ text: "--", running: false });
    expect(hvacStatus(entity("light.x", "on"))).toBeUndefined();
    expect(hvacStatus(undefined)).toBeUndefined();
  });
});

describe("displayAttribute", () => {
  it("shows light brightness as a percentage, 0 when off", () => {
    expect(displayAttribute(entity("light.x", "on", { brightness: 255 }), "brightness")).toEqual({ raw: 100, unit: "%" });
    expect(displayAttribute(entity("light.x", "off"), "brightness")).toEqual({ raw: 0, unit: "%" });
  });

  it("passes other attributes through", () => {
    expect(displayAttribute(entity("sensor.x", "1", { voltage: 230 }), "voltage")).toEqual({ raw: 230, unit: "" });
  });
});
