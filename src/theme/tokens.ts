import { css } from "lit";

/**
 * Design tokens (DESIGN.md §2–3). Components use these only — never raw colors.
 * Lighting model: one key light top-left. Raised = contact shadow + cast shadow + edge bevel.
 * Highlights live on the object (inset), never cast onto the body.
 */
export const tokens = css`
  :host {
    --te-font: var(--te-font-family, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Inter, Arial, sans-serif);

    --te-accent: var(--te-theme-accent, #e8551d);
    --te-accent-glow: color-mix(in srgb, var(--te-accent) 70%, transparent);
    --te-cap-orange: var(--te-accent);
    --te-cap-white: #f4f3ef;
    --te-cap-grey: #8b8a85;
    --te-cap-black: #262626;
    --te-cap-navy: #2c3550;
    --te-cap-tan: #c8925a;

    --te-r-panel: 20px;
    --te-r-tile: 10px;
    --te-r-key: 7px;

    /* silver body (default) */
    --te-body: #e3e2de;
    --te-body-shade: #d3d2cd;
    --te-plate: #efeeea;
    --te-ink: #1c1c1a;
    --te-ink-dim: rgba(28, 28, 26, 0.62);
    --te-led-off: rgba(0, 0, 0, 0.16);
    --te-key-light: #f1f0ec;
    --te-key-dark: #2a2a2a;
    --te-key-grey: #9d9c97;
    --te-groove: #151515;
    --te-screen-bg: #0d0f0c;
    /* print on dark and accent keys; the black end of brightness ramps (same in both bodies) */
    --te-ink-on-dark: #f4f3ef;
    --te-ink-on-light: #1c1c1a;
    --te-black: #0e0e0e;

    /* lighting primitives */
    --te-hi: rgba(255, 255, 255, 0.75);
    --te-lo: rgba(0, 0, 0, 0.14);
    --te-occl: rgba(0, 0, 0, 0.3);
    --te-cast: rgba(0, 0, 0, 0.2);
    --te-face: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(0, 0, 0, 0.035));

    /* elevation: 1 = key/print, 2 = button, 3 = knob cap (taller → longer cast) */
    --te-elev-1: 0 1px 1px var(--te-occl), 0 3px 5px -1px var(--te-cast), inset 0 1px 0 var(--te-hi), inset 0 -1px 0 var(--te-lo);
    --te-elev-2: 0 1px 2px var(--te-occl), 0 6px 10px -3px var(--te-cast), inset 0 1px 0 var(--te-hi), inset 0 -1px 0 var(--te-lo);
    --te-elev-3: 0 2px 2px var(--te-occl), 0 10px 16px -5px var(--te-cast), inset 0 1px 0 var(--te-hi), inset 0 -2px 3px var(--te-lo);
    --te-pressed: 0 0 1px var(--te-occl), inset 0 1px 3px var(--te-lo);
    /* sunk: shade under the rim, lip highlight on the bottom edge */
    --te-sunk-1: inset 0 1px 3px rgba(0, 0, 0, 0.3), inset 0 -1px 0 var(--te-hi);
    --te-sunk-2: inset 0 2px 6px rgba(0, 0, 0, 0.6), 0 1px 0 var(--te-hi);
    --te-tile-edge: inset 0 1px 0 var(--te-hi), inset 0 -1px 0 var(--te-lo), 0 1px 2px rgba(0, 0, 0, 0.12);
    --te-panel-shadow: 0 1px 2px rgba(0, 0, 0, 0.2), 0 18px 32px -14px rgba(0, 0, 0, 0.35), inset 0 1px 0 var(--te-hi), inset 0 -1px 0 var(--te-lo);

    --te-grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0.35 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  /* black body theme (TX-6 / TP-7 black) — same geometry, re-tuned lighting */
  :host([data-body="black"]) {
    --te-body: #1f1f1f;
    --te-body-shade: #171717;
    --te-plate: #2a2a2a;
    --te-ink: #ecebe7;
    --te-ink-dim: rgba(236, 235, 231, 0.6);
    --te-led-off: rgba(255, 255, 255, 0.12);
    --te-key-light: #3b3b3b;
    --te-key-dark: #131313;
    --te-key-grey: #5a5a5a;
    --te-cap-black: #141414;
    --te-groove: #050505;
    --te-hi: rgba(255, 255, 255, 0.13);
    --te-lo: rgba(0, 0, 0, 0.4);
    --te-occl: rgba(0, 0, 0, 0.7);
    --te-cast: rgba(0, 0, 0, 0.45);
    --te-face: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(0, 0, 0, 0.08));
  }
`;
