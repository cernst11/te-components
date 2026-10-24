import { css, html, LitElement, type PropertyValues } from "lit";
import { dotMetrics, StripCache } from "./render";
import { screenTheme } from "./themes";

/** Static pixel-font text rendered with the screen engine (no animation loop). */
export class TePixelText extends LitElement {
  static properties = {
    text: {},
    screen: {},
    size: { type: Number },
  };

  declare text: string;
  declare screen: string;
  declare size: number;
  private cache = new StripCache();

  constructor() {
    super();
    this.text = "";
    this.screen = "vfd-amber";
    this.size = 2;
  }

  static styles = css`
    :host {
      display: inline-block;
      line-height: 0;
    }
  `;

  render() {
    return html`<canvas></canvas>`;
  }

  protected updated(_: PropertyValues) {
    const canvas = this.renderRoot.querySelector("canvas")!;
    const dpr = window.devicePixelRatio || 1;
    const theme = screenTheme(this.screen);
    const strip = this.cache.get(this.text || " ", dotMetrics(this.size, dpr, theme), theme.fg, theme);
    canvas.width = strip.canvas.width;
    canvas.height = strip.canvas.height;
    canvas.style.width = `${strip.canvas.width / dpr}px`;
    canvas.style.height = `${strip.canvas.height / dpr}px`;
    // negative margin so glow padding doesn't shift the visual center
    canvas.style.margin = `${-strip.pad / dpr}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(strip.canvas, 0, 0);
  }
}

if (!customElements.get("te-pixel-text")) customElements.define("te-pixel-text", TePixelText);
