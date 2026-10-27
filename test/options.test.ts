import { describe, expect, it } from "vitest";
import { assertOptionsConfig, resolveOptions, selectOption, shortLabel } from "../src/core/options";
import { entity, fakeHass, fakeHost } from "./helpers";

const climate = entity("climate.lr", "heat", {
  hvac_modes: ["off", "heat", "heat_cool"],
  preset_modes: ["home", "away"],
  preset_mode: "away",
  fan_modes: ["auto", "low"],
  fan_mode: "low",
  swing_modes: ["on", "off"],
  swing_mode: "off",
});

describe("resolveOptions", () => {
  const cases: [string, ReturnType<typeof entity>, string[], string | undefined][] = [
    ["input_select", entity("input_select.src", "Radio", { options: ["Radio", "Spotify"] }), ["Radio", "Spotify"], "Radio"],
    ["select", entity("select.mode", "eco", { options: ["eco", "boost"] }), ["eco", "boost"], "eco"],
    ["climate", climate, ["off", "heat", "heat_cool"], "heat"],
    ["fan", entity("fan.x", "on", { preset_modes: ["auto", "sleep"], preset_mode: "sleep" }), ["auto", "sleep"], "sleep"],
    ["media_player", entity("media_player.tv", "on", { source_list: ["TV", "HDMI"], source: "HDMI" }), ["TV", "HDMI"], "HDMI"],
    ["light", entity("light.strip", "on", { effect_list: ["rainbow", "solid"], effect: "solid" }), ["rainbow", "solid"], "solid"],
    ["humidifier", entity("humidifier.h", "on", { available_modes: ["normal", "eco"], mode: "eco" }), ["normal", "eco"], "eco"],
    ["water_heater", entity("water_heater.b", "eco", { operation_list: ["eco", "electric"] }), ["eco", "electric"], "eco"],
  ];

  it.each(cases)("%s: options and current choice from the domain defaults", (_, st, values, current) => {
    const r = resolveOptions(fakeHass([st]), { entity: st.entity_id });
    expect(r.items.map((i) => i.value)).toEqual(values);
    expect(r.current).toBe(current);
  });

  it("picks another list with list:", () => {
    const hass = fakeHass([climate]);
    expect(resolveOptions(hass, { entity: "climate.lr", list: "preset_modes" })).toEqual({
      items: [
        { value: "home", label: "HOME" },
        { value: "away", label: "AWAY" },
      ],
      current: "away",
    });
    expect(resolveOptions(hass, { entity: "climate.lr", list: "fan_modes" }).current).toBe("low");
    expect(resolveOptions(hass, { entity: "climate.lr", list: "swing_modes" }).current).toBe("off");
  });

  it("offers forward / reverse for a fan's direction", () => {
    const hass = fakeHass([entity("fan.x", "on", { direction: "reverse" })]);
    expect(resolveOptions(hass, { entity: "fan.x", list: "direction" })).toMatchObject({ current: "reverse", items: [{ value: "forward" }, { value: "reverse" }] });
  });

  it("relabels and limits with options:", () => {
    const hass = fakeHass([entity("media_player.tv", "on", { source_list: ["TV", "Spotify", "HDMI"], source: "Spotify" })]);
    const r = resolveOptions(hass, { entity: "media_player.tv", options: [{ value: "Spotify", label: "SPOT" }, "TV"] });
    expect(r.items).toEqual([
      { value: "Spotify", label: "SPOT" },
      { value: "TV", label: "TV" },
    ]);
  });

  it("reads the current choice from attribute: when given", () => {
    const hass = fakeHass([entity("sensor.x", "1", { choice: "b" })]);
    expect(resolveOptions(hass, { entity: "sensor.x", attribute: "choice", options: ["a", "b"] }).current).toBe("b");
  });

  it("returns no items for a missing entity", () => {
    expect(resolveOptions(fakeHass(), { entity: "input_select.missing" })).toEqual({ items: [], current: undefined });
  });
});

describe("selectOption", () => {
  it("calls the domain's service with its key", () => {
    const hass = fakeHass();
    const host = fakeHost().host;
    selectOption(host, hass, { entity: "climate.lr" }, "heat");
    selectOption(host, hass, { entity: "climate.lr", list: "preset_modes" }, "away");
    selectOption(host, hass, { entity: "media_player.tv", list: "sound_mode_list" }, "movie");
    selectOption(host, hass, { entity: "light.strip" }, "rainbow");
    expect(hass.calls).toEqual([
      { domain: "climate", service: "set_hvac_mode", data: { entity_id: "climate.lr", hvac_mode: "heat" } },
      { domain: "climate", service: "set_preset_mode", data: { entity_id: "climate.lr", preset_mode: "away" } },
      { domain: "media_player", service: "select_sound_mode", data: { entity_id: "media_player.tv", sound_mode: "movie" } },
      { domain: "light", service: "turn_on", data: { entity_id: "light.strip", effect: "rainbow" } },
    ]);
  });

  it("uses set_action with {{ value }} when given", () => {
    const hass = fakeHass();
    selectOption(fakeHost().host, hass, { entity: "sensor.x", set_action: { action: "perform-action", perform_action: "script.pick", data: { v: "{{ value }}" } } }, "b");
    expect(hass.calls).toEqual([{ domain: "script", service: "pick", data: { v: "b" }, target: { entity_id: "sensor.x" } }]);
  });
});

describe("assertOptionsConfig", () => {
  it("requires an entity", () => {
    expect(() => assertOptionsConfig({})).toThrow("entity is required");
  });

  it("rejects an unknown list and names the valid ones", () => {
    expect(() => assertOptionsConfig({ entity: "climate.lr", list: "nope" })).toThrow("list must be one of hvac_modes, preset_modes, fan_modes, swing_modes");
    expect(() => assertOptionsConfig({ entity: "select.x", list: "nope" })).toThrow("select entities have no lists");
  });

  it("needs options and set_action for other domains", () => {
    expect(() => assertOptionsConfig({ entity: "sensor.x" })).toThrow("options and set_action are required");
    expect(() => assertOptionsConfig({ entity: "sensor.x", options: ["a"], set_action: { action: "none" } })).not.toThrow();
  });
});

it("shortLabel upper-cases and drops underscores", () => {
  expect(shortLabel("heat_cool")).toBe("HEAT COOL");
});
