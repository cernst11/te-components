/**
 * Stand-ins for the HA editor elements the container editor uses (ha-form, hui-card-element-editor,
 * hui-card-picker). They only hold what they're given; tests fire their events by hand.
 */

class HaFormShim extends HTMLElement {
  data?: unknown;
  schema?: unknown;
}

class CardEditorShim extends HTMLElement {
  value?: Record<string, unknown>;
  guiMode = true;
  toggleMode() {
    this.guiMode = !this.guiMode;
    this.dispatchEvent(new CustomEvent("GUImode-changed", { detail: { guiMode: this.guiMode, guiModeAvailable: true }, bubbles: true, composed: true }));
  }
}

class CardPickerShim extends HTMLElement {}

for (const [tag, ctor] of [
  ["ha-form", HaFormShim],
  ["hui-card-element-editor", CardEditorShim],
  ["hui-card-picker", CardPickerShim],
] as const) {
  if (!customElements.get(tag)) customElements.define(tag, ctor);
}
