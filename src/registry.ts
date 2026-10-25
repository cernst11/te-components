export interface CardMeta {
  type: string;
  model: string;
  subtitle: string;
  name: string;
  description: string;
  preview?: boolean;
}

/** TE-style model names, see DESIGN.md §6a. */
export const MODELS = {
  panel: { type: "te-panel", model: "CH-1", subtitle: "シャーシ", name: "Panel" },
  group: { type: "te-group", model: "GR-2", subtitle: "グループ", name: "Group" },
  knob: { type: "te-knob", model: "KN-3", subtitle: "ノブ", name: "Knob" },
  fader: { type: "te-fader", model: "FD-6", subtitle: "フェーダー", name: "Fader" },
  dial: { type: "te-dial", model: "DL-7", subtitle: "ダイヤル", name: "Dial" },
  toggle: { type: "te-toggle", model: "TG-1", subtitle: "トグル", name: "Toggle" },
  button: { type: "te-button", model: "BT-4", subtitle: "ボタン", name: "Button" },
  dpad: { type: "te-dpad", model: "DP-5", subtitle: "十字キー", name: "D-Pad" },
  display: { type: "te-display", model: "DS-8", subtitle: "ディスプレイ", name: "Display" },
  miniDisplay: { type: "te-mini-display", model: "DS-2", subtitle: "ミニ", name: "Mini Display" },
  colorPicker: { type: "te-color-picker", model: "CL-16", subtitle: "カラー", name: "Color Picker" },
  colorTemp: { type: "te-color-temp", model: "CT-27", subtitle: "色温度", name: "Color Temp" },
  matrix: { type: "te-matrix", model: "DS-64", subtitle: "マトリクス", name: "Matrix" },
  popup: { type: "te-popup", model: "PP-3", subtitle: "ポップアップ", name: "Popup" },
  selector: { type: "te-selector", model: "SW-5", subtitle: "セレクター", name: "Selector" },
  pads: { type: "te-pads", model: "PD-16", subtitle: "パッド", name: "Pads" },
  segment: { type: "te-segment", model: "SG-7", subtitle: "セグメント", name: "Segment" },
  slide: { type: "te-slide", model: "SL-2", subtitle: "スライド", name: "Slide Switch" },
  leds: { type: "te-leds", model: "LD-8", subtitle: "インジケーター", name: "LED Strip" },
  meter: { type: "te-meter", model: "VU-10", subtitle: "メーター", name: "Meter" },
  keypad: { type: "te-keypad", model: "KP-12", subtitle: "テンキー", name: "Alarm Keypad" },
  grille: { type: "te-grille", model: "SP-1", subtitle: "スピーカー", name: "Grille" },
} as const;

declare global {
  interface Window {
    customCards?: Array<Record<string, unknown>>;
  }
}

export function registerCard(meta: CardMeta, ctor: CustomElementConstructor) {
  const existing = customElements.get(meta.type);
  if (!existing) customElements.define(meta.type, ctor);
  // usually the old single-file te-compoents.js still loaded as a resource: its classes win and have no editor
  else if (existing !== ctor) console.warn(`te-components: <${meta.type}> is already defined by another script; remove the old resource`);
  window.customCards = window.customCards || [];
  if (window.customCards.some((c) => c.type === meta.type)) return;
  window.customCards.push({
    type: meta.type,
    name: `${meta.model} ${meta.name}`,
    description: meta.description,
    preview: meta.preview ?? true,
  });
}
