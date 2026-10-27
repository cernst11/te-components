import { describe, expect, it } from "vitest";
import { isToggleable, onStateOf, pickEntities, pickEntity } from "../src/core/entity";
import { detentOf, feedbackMode } from "../src/core/feedback";
import { hexToRgb, hsvToRgb, kelvinToRgb, rgbToHex, rgbToHsv } from "../src/utils/color";
import { clamp, decimalsOf, domainOf, toNumber } from "../src/utils/math";
import { entity, fakeHass } from "./helpers";

describe("math", () => {
  it("toNumber treats empty and non-numeric values as missing", () => {
    expect(toNumber("12.5")).toBe(12.5);
    expect(toNumber(0)).toBe(0);
    expect(toNumber("")).toBeUndefined();
    expect(toNumber(null)).toBeUndefined();
    expect(toNumber("unavailable")).toBeUndefined();
  });

  it("decimalsOf counts a step's decimals", () => {
    expect(decimalsOf(1)).toBe(0);
    expect(decimalsOf(0.5)).toBe(1);
    expect(decimalsOf(0.01)).toBe(2);
    expect(decimalsOf(Number.NaN)).toBe(0);
  });

  it("clamp and domainOf", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(domainOf("light.kitchen")).toBe("light");
    expect(domainOf(undefined)).toBe("");
  });
});

describe("color", () => {
  it("round-trips hsv ↔ rgb ↔ hex", () => {
    expect(hsvToRgb(0, 100, 100)).toEqual([255, 0, 0]);
    expect(hsvToRgb(240, 100, 100)).toEqual([0, 0, 255]);
    expect(hsvToRgb(-120, 100, 100)).toEqual([0, 0, 255]);
    expect(rgbToHsv(0, 255, 0)).toEqual([120, 100, 100]);
    expect(rgbToHex([232, 85, 29])).toBe("#e8551d");
    expect(hexToRgb("#e8551d")).toEqual([232, 85, 29]);
    expect(hexToRgb("e8551d")).toEqual([232, 85, 29]);
    expect(hexToRgb("red")).toBeNull();
  });

  it("kelvinToRgb runs warm to cool", () => {
    const [r1, , b1] = kelvinToRgb(2000);
    const [r2, , b2] = kelvinToRgb(6500);
    expect(r1).toBe(255);
    expect(b1).toBeLessThan(b2);
    expect(r2).toBeLessThanOrEqual(255);
  });
});

describe("entity", () => {
  const hass = fakeHass([entity("sensor.t", "1"), entity("switch.a", "on"), entity("light.b", "on"), entity("light.c", "off")]);

  it("pickEntity takes the first match in domain order", () => {
    expect(pickEntity(hass, ["fan", "light", "switch"])).toBe("light.b");
    expect(pickEntity(hass, ["fan"])).toBe("");
    expect(pickEntity(undefined, ["light"])).toBe("");
  });

  it("pickEntities orders by domain, then preference", () => {
    expect(pickEntities(hass, ["switch", "light"], 3, (id) => id === "light.c")).toEqual(["switch.a", "light.c", "light.b"]);
    expect(pickEntities(hass, ["light"], 1)).toHaveLength(1);
  });

  it("isToggleable / onStateOf", () => {
    expect(isToggleable("lock.front")).toBe(true);
    expect(isToggleable("sensor.t")).toBe(false);
    expect(isToggleable(undefined)).toBe(false);
    expect(onStateOf("lock.front")).toBe("locked");
    expect(onStateOf("switch.a")).toBe("on");
  });
});

describe("feedback", () => {
  it("feedbackMode parses config and theme values", () => {
    expect(feedbackMode("Haptic")).toBe("haptic");
    expect(feedbackMode(" both ")).toBe("both");
    expect(feedbackMode(true)).toBe("both");
    expect(feedbackMode("none")).toBe("off");
    expect(feedbackMode("loud")).toBeUndefined();
    expect(feedbackMode(undefined)).toBeUndefined();
  });

  it("detentOf: one detent per step for coarse ranges, 24 per travel otherwise", () => {
    expect(detentOf(0.5, 4)).toBe(2);
    expect(detentOf(1, 4)).toBe(4);
    expect(detentOf(0.5, 255)).toBe(12);
    expect(detentOf(0.5, 0)).toBe(12);
  });
});
