import { describe, expect, it } from "vitest";
import { runAction, substitute } from "../src/core/actions";
import { entity, fakeHass, fakeHost } from "./helpers";

describe("substitute", () => {
  it("keeps the type of an exact placeholder", () => {
    expect(substitute("{{ value }}", { value: 42 })).toBe(42);
    expect(substitute("{{value}}", { value: true })).toBe(true);
  });

  it("interpolates placeholders inside longer strings", () => {
    expect(substitute("level {{ value }}%", { value: 42 })).toBe("level 42%");
  });

  it("leaves unknown placeholders alone", () => {
    expect(substitute("{{ other }}", { value: 1 })).toBe("{{ other }}");
    expect(substitute("a {{ other }} b", { value: 1 })).toBe("a {{ other }} b");
  });

  it("walks nested objects and arrays", () => {
    expect(substitute({ a: ["{{ value }}", 2], b: { c: "x{{ value }}" }, d: null }, { value: 5 })).toEqual({ a: [5, 2], b: { c: "x5" }, d: null });
  });
});

describe("runAction", () => {
  it("does nothing without hass or action, or for none", () => {
    const hass = fakeHass();
    runAction(fakeHost().host, undefined, { action: "toggle" }, "light.x");
    runAction(fakeHost().host, hass, undefined, "light.x");
    runAction(fakeHost().host, hass, { action: "none" }, "light.x");
    expect(hass.calls).toEqual([]);
  });

  it("toggles through homeassistant.toggle", () => {
    const hass = fakeHass();
    runAction(fakeHost().host, hass, { action: "toggle" }, "switch.fx");
    expect(hass.calls).toEqual([{ domain: "homeassistant", service: "toggle", data: { entity_id: "switch.fx" } }]);
  });

  it("toggles locks with lock.lock / lock.unlock", () => {
    const hass = fakeHass([entity("lock.front", "locked"), entity("lock.back", "unlocked")]);
    runAction(fakeHost().host, hass, { action: "toggle" }, "lock.front");
    runAction(fakeHost().host, hass, { action: "toggle" }, "lock.back");
    expect(hass.calls.map((c) => `${c.domain}.${c.service}`)).toEqual(["lock.unlock", "lock.lock"]);
  });

  it("ignores toggle without an entity", () => {
    const hass = fakeHass();
    runAction(fakeHost().host, hass, { action: "toggle" }, undefined);
    expect(hass.calls).toEqual([]);
  });

  it("fires hass-more-info for the card's entity or the action's own", () => {
    const { host, events } = fakeHost();
    runAction(host, fakeHass(), { action: "more-info" }, "light.a");
    runAction(host, fakeHass(), { action: "more-info", entity: "light.b" }, "light.a");
    runAction(host, fakeHass(), { action: "light-dialog" }, "light.c");
    expect(events.map((e) => e.detail)).toEqual([{ entityId: "light.a" }, { entityId: "light.b" }, { entityId: "light.c" }]);
  });

  describe("perform-action", () => {
    it("targets the card's entity when no target is given", () => {
      const hass = fakeHass();
      runAction(fakeHost().host, hass, { action: "perform-action", perform_action: "light.turn_on", data: { brightness: 10 } }, "light.x");
      expect(hass.calls).toEqual([{ domain: "light", service: "turn_on", data: { brightness: 10 }, target: { entity_id: "light.x" } }]);
    });

    it("keeps an explicit target or entity_id in data", () => {
      const hass = fakeHass();
      runAction(fakeHost().host, hass, { action: "perform-action", perform_action: "light.turn_on", target: { area_id: "kitchen" } }, "light.x");
      runAction(fakeHost().host, hass, { action: "perform-action", perform_action: "light.turn_on", data: { entity_id: "light.y" } }, "light.x");
      expect(hass.calls).toEqual([
        { domain: "light", service: "turn_on", data: {}, target: { area_id: "kitchen" } },
        { domain: "light", service: "turn_on", data: { entity_id: "light.y" } },
      ]);
    });

    it("substitutes vars into data and target", () => {
      const hass = fakeHass();
      runAction(
        fakeHost().host,
        hass,
        { action: "perform-action", perform_action: "input_select.select_option", data: { option: "{{ value }}" }, target: { entity_id: "{{ target }}" } },
        "sensor.x",
        { value: "Spotify", target: "input_select.src" },
      );
      expect(hass.calls).toEqual([{ domain: "input_select", service: "select_option", data: { option: "Spotify" }, target: { entity_id: "input_select.src" } }]);
    });

    it("accepts the legacy call-service shape", () => {
      const hass = fakeHass();
      runAction(fakeHost().host, hass, { action: "call-service", service: "script.go", service_data: { a: 1 } });
      expect(hass.calls).toEqual([{ domain: "script", service: "go", data: { a: 1 } }]);
    });

    it("ignores a malformed action name", () => {
      const hass = fakeHass();
      runAction(fakeHost().host, hass, { action: "perform-action", perform_action: "nodot" }, "light.x");
      runAction(fakeHost().host, hass, { action: "perform-action" }, "light.x");
      expect(hass.calls).toEqual([]);
    });
  });

  describe("media extras", () => {
    const tv = (source: string) => entity("media_player.tv", "on", { source_list: ["HDMI 1", "HDMI 2", "TV"], source, is_volume_muted: false });

    it("cycle-source steps to the next source and wraps", () => {
      const hass = fakeHass([tv("HDMI 2")]);
      runAction(fakeHost().host, hass, { action: "cycle-source" }, "media_player.tv");
      hass.states["media_player.tv"] = tv("TV");
      runAction(fakeHost().host, hass, { action: "cycle-source" }, "media_player.tv");
      expect(hass.calls.map((c) => c.data?.source)).toEqual(["TV", "HDMI 1"]);
    });

    it("cycle-source does nothing without a source list", () => {
      const hass = fakeHass([entity("media_player.tv", "on")]);
      runAction(fakeHost().host, hass, { action: "cycle-source" }, "media_player.tv");
      expect(hass.calls).toEqual([]);
    });

    it("mute flips is_volume_muted", () => {
      const hass = fakeHass([tv("TV")]);
      runAction(fakeHost().host, hass, { action: "mute" }, "media_player.tv");
      expect(hass.calls).toEqual([{ domain: "media_player", service: "volume_mute", data: { entity_id: "media_player.tv", is_volume_muted: true } }]);
    });
  });
});
