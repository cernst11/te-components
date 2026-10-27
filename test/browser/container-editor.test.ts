/** The container editor (CH-1 / PP-3 / GR-2) driven like HA's card dialog would, with stand-ins for HA's elements. */
import { afterEach, describe, expect, it } from "vitest";
import "../../playground/editor-shims";
import "../../playground/shims";
import "../../src/index";
import type { TeContainerEditor } from "../../src/editor/te-container-editor";

const a = { type: "custom:te-knob", entity: "light.kitchen" };
const b = { type: "custom:te-fader", entity: "light.hall", label: "HALL" };
const c = { type: "custom:te-button", label: "C" };
const d = { type: "custom:te-toggle", entity: "switch.d" };

type Ed = TeContainerEditor & { configs: Record<string, any>[] };

/** Mounts the editor a card's getConfigElement returns and feeds every change back via setConfig, like HA. */
async function mount(type: string, config: Record<string, unknown>): Promise<Ed> {
  const ctor = customElements.get(type) as unknown as { getConfigElement(): Promise<TeContainerEditor> };
  const el = (await ctor.getConfigElement()) as Ed;
  el.configs = [];
  el.addEventListener("config-changed", (e) => {
    const cfg = (e as CustomEvent).detail.config;
    el.configs.push(cfg);
    el.setConfig(cfg);
  });
  el.setConfig({ type: `custom:${type}`, ...config });
  document.body.append(el);
  await el.updateComplete;
  return el;
}

const last = (el: Ed) => el.configs[el.configs.length - 1];
const $ = (el: Ed, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement & Record<string, any>;
const $$ = (el: Ed, sel: string) => [...el.shadowRoot!.querySelectorAll(sel)] as (HTMLElement & Record<string, any>)[];
const chips = (el: Ed) => $$(el, ".chip:not(.add)").map((x) => x.textContent!.trim());
const click = async (el: Ed, target: HTMLElement | undefined) => {
  if (!target) throw new Error("nothing to click");
  target.click();
  await el.updateComplete;
};
const button = (el: Ed, label: string) => $$(el, "button").find((x) => x.getAttribute("aria-label") === label || x.textContent!.trim() === label);
const fire = async (el: Ed, target: HTMLElement, type: string, detail: unknown) => {
  target.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  await el.updateComplete;
};

afterEach(() => {
  document.body.replaceChildren();
});

describe("CH-1 panel editor", () => {
  it("shows the settings form and the rows as chips", async () => {
    const el = await mount("te-panel", { title: "HOME", cards: [a, [b, c]] });
    expect($(el, "ha-form").schema.length).toBeGreaterThan(0);
    expect($(el, "ha-form").computeHelper).toBeTypeOf("function");
    expect(chips(el)).toEqual(["KN-3 · kitchen", "FD-6 · HALL", "BT-4 · C"]);
    expect($$(el, ".row").length).toBe(2);
  });

  it("edits the selected card in HA's card editor and writes back the same row shape", async () => {
    const el = await mount("te-panel", { cards: [a, [b, c]] });
    expect($(el, "hui-card-element-editor").value).toEqual(a);
    await click(el, $$(el, ".chip")[2]); // b
    const editor = $(el, "hui-card-element-editor");
    expect(editor.value).toEqual(b);
    await fire(el, editor, "config-changed", { config: { ...b, label: "HALLWAY" } });
    expect(last(el).cards).toEqual([a, [{ ...b, label: "HALLWAY" }, c]]);
    // typing doesn't rebuild the child editor
    expect($(el, "hui-card-element-editor")).toBe(editor);
  });

  it("moves cards within and between rows", async () => {
    const el = await mount("te-panel", { cards: [a, [b, c]] });
    await click(el, $$(el, ".chip")[2]); // b
    await click(el, button(el, "Move right"));
    expect(last(el).cards).toEqual([a, [c, b]]);
    await click(el, button(el, "Move to the row above"));
    expect(last(el).cards).toEqual([[a, b], c]);
    expect($(el, "hui-card-element-editor").value).toEqual(b);
  });

  it("adds a card to a row and a new row from the picker", async () => {
    const el = await mount("te-panel", { cards: [a] });
    await click(el, $$(el, ".chip.add")[0]); // + Card on row 1
    await fire(el, $(el, "hui-card-picker"), "config-changed", { config: b });
    expect(last(el).cards).toEqual([[a, b]]);
    expect($(el, "hui-card-element-editor").value).toEqual(b);
    await click(el, $(el, ".new-row"));
    await fire(el, $(el, "hui-card-picker"), "config-changed", { config: c });
    expect(last(el).cards).toEqual([[a, b], c]);
  });

  it("duplicates and deletes cards", async () => {
    const el = await mount("te-panel", { cards: [a, b] });
    await click(el, button(el, "Duplicate"));
    expect(last(el).cards).toEqual([[a, a], b]);
    await click(el, button(el, "Delete card"));
    await click(el, button(el, "Delete card"));
    expect(last(el).cards).toEqual([b]);
  });

  it("moves and deletes rows", async () => {
    const el = await mount("te-panel", { cards: [a, b, c] });
    await click(el, $$(el, "button[aria-label='Move row down']")[0]);
    expect(last(el).cards).toEqual([b, a, c]);
    await click(el, $$(el, "button[aria-label='Delete row']")[2]);
    expect(last(el).cards).toEqual([b, a]);
  });

  it("sets a bracket label on the selected row", async () => {
    const el = await mount("te-panel", { cards: [[a, b]] });
    await fire(el, $(el, "ha-form.bracket"), "value-changed", { value: { bracket: "TRANSPORT" } });
    expect(last(el).cards).toEqual([{ bracket: "TRANSPORT", cards: [a, b] }]);
    await fire(el, $(el, "ha-form.bracket"), "value-changed", { value: { bracket: "" } });
    expect(last(el).cards).toEqual([[a, b]]);
  });

  it("merges settings from the form", async () => {
    const el = await mount("te-panel", { title: "A", cards: [a] });
    await fire(el, $(el, "ha-form"), "value-changed", { value: { title: "B", faceplate: true } });
    expect(last(el)).toMatchObject({ title: "B", faceplate: true, cards: [a] });
  });

  it("adds a tab, fills its page, renames and removes it", async () => {
    const el = await mount("te-panel", { cards: [a], tabs: ["Info"] });
    await click(el, button(el, "Add tab"));
    expect(last(el).tabs).toEqual([{ label: "Info" }, { label: "Tab 2" }]);
    expect($(el, ".page[aria-selected='true']").textContent).toContain("Tab 2");
    await fire(el, $(el, "hui-card-picker"), "config-changed", { config: d });
    expect(last(el).tabs[1]).toEqual({ label: "Tab 2", cards: [d] });
    expect(last(el).cards).toEqual([a]);
    await fire(el, $(el, ".tab-settings ha-form"), "value-changed", { value: { label: "Lights", color: "grey", cards: [d] } });
    expect(last(el).tabs[1]).toEqual({ label: "Lights", color: "grey", cards: [d] });
    await click(el, button(el, "Delete card"));
    expect(last(el).tabs[1]).toEqual({ label: "Lights", color: "grey" });
    await click(el, button(el, "Remove tab"));
    expect(last(el).tabs).toEqual([{ label: "Info" }]);
    expect($(el, ".page[aria-selected='true']").textContent).toContain("Always shown");
  });
});

describe("PP-3 popup editor", () => {
  it("edits rows without tabs", async () => {
    const el = await mount("te-popup", { label: "Car", cards: [] });
    expect($(el, ".pages")).toBeNull();
    await fire(el, $(el, "hui-card-picker"), "config-changed", { config: a });
    expect(last(el)).toMatchObject({ label: "Car", cards: [a] });
  });
});

describe("GR-2 group editor", () => {
  it("edits a flat list of cards: no rows, brackets or row moves", async () => {
    const el = await mount("te-group", { cards: [a, b] });
    expect($(el, ".row-head")).toBeNull();
    expect($(el, ".new-row")).toBeNull();
    expect(button(el, "Move to the row above")).toBeUndefined();
    await click(el, button(el, "Move right"));
    expect(last(el).cards).toEqual([b, a]);
    await click(el, $(el, ".chip.add"));
    await fire(el, $(el, "hui-card-picker"), "config-changed", { config: c });
    expect(last(el).cards).toEqual([b, a, c]);
  });

  it("starts empty with the picker open", async () => {
    const el = await mount("te-group", { cards: [] });
    expect($(el, "hui-card-picker")).not.toBeNull();
    await fire(el, $(el, "hui-card-picker"), "config-changed", { config: a });
    expect(last(el).cards).toEqual([a]);
  });
});

describe("chip labels", () => {
  it("name cards by label, entity, glyph or icon", async () => {
    const el = await mount("te-group", {
      cards: [{ type: "custom:te-button", glyph: "play" }, { type: "custom:te-button", icon: "mdi:car" }, { type: "custom:te-segment", clock: true }, { type: "entities" }],
    });
    expect(chips(el)).toEqual(["BT-4 · play", "BT-4 · car", "SG-7 · clock", "entities"]);
  });
});
