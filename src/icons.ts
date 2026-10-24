import { html, svg, type TemplateResult } from "lit";

/** Brand icons not in MDI. */
const BRAND: Record<string, string> = {
  jellyfin:
    "M12 .002C8.826.002-1.398 18.537.16 21.666c1.56 3.129 22.14 3.094 23.682 0C25.384 18.573 15.177 0 12 0zm7.76 18.949c-1.008 2.028-14.493 2.05-15.514 0C3.224 16.9 9.92 4.755 12.003 4.755c2.081 0 8.77 12.166 7.759 14.196zM12 9.198c-1.054 0-4.446 6.15-3.93 7.189.518 1.04 7.348 1.027 7.86 0 .511-1.027-2.874-7.19-3.93-7.19z",
};

/** TE transport/utility glyphs (TP-7, K.O. II, TX-6). */
const GLYPHS: Record<string, TemplateResult> = {
  record: svg`<circle cx="12" cy="12" r="6" fill="var(--te-glyph-record, var(--te-accent))"/>`,
  play: svg`<path d="M8 5.5v13l10-6.5z" fill="currentColor"/>`,
  stop: svg`<rect x="6.5" y="6.5" width="11" height="11" fill="currentColor"/>`,
  pause: svg`<path d="M7 6h3.5v12H7zM13.5 6H17v12h-3.5z" fill="currentColor"/>`,
  prev: svg`<path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" fill="currentColor"/>`,
  next: svg`<path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z" fill="currentColor"/>`,
  plus: svg`<path d="M11.25 5h1.5v6.25H19v1.5h-6.25V19h-1.5v-6.25H5v-1.5h6.25z" fill="currentColor"/>`,
  minus: svg`<path d="M5 11.25h14v1.5H5z" fill="currentColor"/>`,
  dot: svg`<circle cx="12" cy="12" r="2.5" fill="currentColor"/>`,
};

export const GLYPH_NAMES = Object.keys(GLYPHS);

export function renderIcon(icon: string | undefined, size = 22): TemplateResult | string {
  if (!icon) return "";
  const path = BRAND[icon];
  if (path) return html`<svg viewBox="0 0 24 24" width=${size} height=${size}><path fill="currentColor" d=${path} /></svg>`;
  return html`<ha-icon .icon=${icon} style="--mdc-icon-size:${size}px"></ha-icon>`;
}

/** Named glyph → SVG, anything else is printed as text. */
export function renderGlyph(glyph: string | undefined, size = 22): TemplateResult | string {
  if (!glyph) return "";
  const g = GLYPHS[glyph];
  return g ? html`<svg viewBox="0 0 24 24" width=${size} height=${size}>${g}</svg>` : glyph;
}
