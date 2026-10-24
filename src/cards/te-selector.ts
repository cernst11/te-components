import { css, html, unsafeCSS, type PropertyValues } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { TeBaseCard, type BaseConfig } from "../core/base-card";
import { pickEntity } from "../core/entity";
import { F } from "../core/form";
import { assertOptionsConfig, OPTION_DOMAINS, resolveOptions, selectOption, type OptionItem, type OptionsConfig } from "../core/options";
import { MODELS, registerCard } from "../registry";
import { sharedStyles } from "../theme/shared";
import type { HomeAssistant } from "../types";

const STYLES = ["rotary", "keys"] as const;
const CAPS = ["orange", "white", "grey", "black", "navy", "tan"] as const;

interface SelectorConfig extends BaseConfig, OptionsConfig {
  entity: string;
  style: (typeof STYLES)[number];
  cap: (typeof CAPS)[number];
  /** Keys per row (keys style). */
  columns?: number;
}

/** Pointer travel per detent on the rotary switch. */
const DETENT_PX = 28;
/** Keep showing the chosen option this long while HA catches up. */
const PENDING_MS = 1500;
/** Rotary geometry (px): box, knob center, label radius. */
const BOX_W = 200;
const BOX_H = 126;
const CX = BOX_W / 2;
const CY = 74;
const LABEL_R = 46;

/** SW-5 — selector: a detented rotary switch or a row of latching mode keys with LEDs. */
export class TeSelector extends TeBaseCard<SelectorConfig> {
  static properties = {
    _pending: { state: true },
    _dragIndex: { state: true },
  };

  declare _pending?: { value: string; until: number };
  declare _dragIndex?: number;
  private drag?: { x: number; y: number; index: number; moved: boolean };

  static styles = [
    sharedStyles,
    css`
      /* rotary */
      .rotary {
        position: relative;
        width: ${unsafeCSS(BOX_W)}px;
        height: ${unsafeCSS(BOX_H)}px;
        max-width: 100%;
      }
      /* labels anchor away from the knob: left side right-aligned, right side left-aligned, top centered */
      .opt {
        position: absolute;
        transform: translate(var(--ax), -50%);
        max-width: 56px;
        font-size: 9px;
        font-weight: 600;
        line-height: 1.1;
        letter-spacing: 0.06em;
        text-align: var(--align);
        color: var(--te-ink-dim);
        padding: 4px 3px;
        cursor: pointer;
      }
      .opt.on {
        color: var(--te-ink);
      }
      .tick {
        position: absolute;
        width: 4px;
        height: 4px;
        margin: -2px 0 0 -2px;
        border-radius: 50%;
        background: var(--te-led-off);
      }
      .tick.on {
        background: var(--te-accent);
        box-shadow: 0 0 4px var(--te-accent);
      }
      .knob {
        position: absolute;
        left: ${unsafeCSS(CX)}px;
        top: ${unsafeCSS(CY)}px;
        width: 56px;
        height: 56px;
        margin: -28px 0 0 -28px;
        border-radius: 50%;
        background:
          var(--te-grain),
          radial-gradient(circle at 34% 28%, color-mix(in srgb, var(--cap) 65%, white) 0%, var(--cap) 52%, color-mix(in srgb, var(--cap) 82%, black) 100%);
        background-blend-mode: overlay, normal;
        box-shadow: var(--te-elev-3);
        cursor: grab;
        touch-action: none;
      }
      .rotor {
        position: absolute;
        inset: 0;
        transform: rotate(var(--rot));
        transition: transform 0.09s ease-out;
      }
      .notch {
        position: absolute;
        top: 8%;
        left: 50%;
        width: 4px;
        height: 30%;
        transform: translateX(-50%);
        border-radius: 2px;
        background: var(--notch);
        box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.35);
      }

      /* keys */
      .keys {
        display: grid;
        grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
        gap: 10px 8px;
        width: 100%;
      }
      .mode {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .mode .led {
        margin: 0;
      }
      .key {
        width: 100%;
        max-width: 60px;
        aspect-ratio: 1;
        padding: 6px;
        display: flex;
        align-items: flex-start;
        justify-content: flex-start;
        border-radius: var(--te-r-key);
        font-size: 9px;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-align: left;
        line-height: 1.15;
        overflow: hidden;
        color: var(--te-ink);
        background: var(--te-grain), var(--te-face), var(--te-key-light);
        background-blend-mode: overlay, normal, normal;
        box-shadow: var(--te-elev-2);
        transition: box-shadow 0.08s ease-out, transform 0.08s ease-out;
      }
      /* latched: the active key stays pressed in */
      .key:active,
      .mode.on .key {
        box-shadow: var(--te-pressed);
        transform: translateY(1px);
      }
      .empty {
        font-size: 10px;
        color: var(--te-ink-dim);
      }
    `,
  ];

  static getStubConfig(hass?: HomeAssistant) {
    return { entity: pickEntity(hass, ["input_select", "select", "climate"]), label: "MODE" };
  }

  static getConfigForm() {
    return {
      schema: [
        F.entity(OPTION_DOMAINS),
        F.labels(),
        F.grid(F.select("style", STYLES), F.select("cap", CAPS), F.num("columns", 1)),
        F.attribute(),
        F.look(),
      ],
    };
  }

  protected normalizeConfig(c: Record<string, any>): SelectorConfig {
    assertOptionsConfig(c);
    return {
      ...c,
      type: c.type,
      entity: c.entity,
      style: STYLES.includes(c.style) ? c.style : "rotary",
      cap: CAPS.includes(c.cap) ? c.cap : "grey",
      tile: c.tile === true,
    };
  }

  getGridOptions() {
    return this._config?.style === "keys" ? { columns: 6, rows: 2, min_columns: 3 } : { columns: 4, rows: 3, min_columns: 3 };
  }

  protected willUpdate(changed: PropertyValues) {
    super.willUpdate(changed);
    // drop the optimistic value once HA reports it (or it times out)
    const p = this._pending;
    if (p && (Date.now() > p.until || resolveOptions(this.hass, this._config!).current === p.value)) this._pending = undefined;
  }

  private state(): { items: OptionItem[]; index: number } {
    const { items, current } = resolveOptions(this.hass, this._config!);
    const shown = this._pending?.value ?? current;
    return { items, index: items.findIndex((o) => o.value === shown) };
  }

  private choose(item: OptionItem) {
    if (!this.hass) return;
    this._pending = { value: item.value, until: Date.now() + PENDING_MS };
    setTimeout(() => this.requestUpdate(), PENDING_MS + 50);
    selectOption(this, this.hass, this._config!, item.value);
  }

  private step(delta: number) {
    const { items, index } = this.state();
    if (!items.length) return;
    const next = Math.max(0, Math.min(items.length - 1, (index < 0 ? 0 : index) + delta));
    if (next !== index) this.choose(items[next]);
  }

  private onKey = (e: KeyboardEvent) => {
    const map: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, Home: -999, End: 999 };
    if (!(e.key in map)) return;
    e.preventDefault();
    this.step(map[e.key]);
  };

  // Rotary drag: relative, one detent per DETENT_PX; commits on release. A tap advances (wrapping).
  private onDown = (e: PointerEvent) => {
    const { index } = this.state();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.drag = { x: e.clientX, y: e.clientY, index: Math.max(0, index), moved: false };
  };

  private onMove = (e: PointerEvent) => {
    const d = this.drag;
    if (!d) return;
    const travel = d.y - e.clientY + (e.clientX - d.x);
    if (Math.abs(travel) > 3) d.moved = true;
    if (!d.moved) return;
    const n = this.state().items.length;
    this._dragIndex = Math.max(0, Math.min(n - 1, d.index + Math.round(travel / DETENT_PX)));
  };

  private onUp = () => {
    const d = this.drag;
    this.drag = undefined;
    if (!d) return;
    const { items, index } = this.state();
    const target = d.moved ? this._dragIndex : items.length ? (Math.max(0, index) + 1) % items.length : undefined;
    this._dragIndex = undefined;
    if (target !== undefined && target !== index && items[target]) this.choose(items[target]);
  };

  private angleOf(i: number, n: number) {
    const span = n <= 1 ? 0 : Math.min(270, (n - 1) * 52);
    return -90 - span / 2 + (n <= 1 ? 0 : (i * span) / (n - 1));
  }

  private renderRotary(items: OptionItem[], index: number) {
    const c = this._config!;
    const shown = this._dragIndex ?? index;
    const rad = (deg: number) => (deg * Math.PI) / 180;
    const rot = shown >= 0 ? this.angleOf(shown, items.length) + 90 : -135;
    const dark = c.cap === "black" || c.cap === "navy";
    return html`
      <div class="rotary">
        ${items.map((o, i) => {
          const a = rad(this.angleOf(i, items.length));
          const side = Math.cos(a) < -0.3 ? "left" : Math.cos(a) > 0.3 ? "right" : "top";
          const anchor = { left: ["-100%", "right"], right: ["0%", "left"], top: ["-50%", "center"] }[side];
          return html`
            <span class="tick ${classMap({ on: i === shown })}" style=${styleMap({ left: `${CX + Math.cos(a) * 36}px`, top: `${CY + Math.sin(a) * 36}px` })}></span>
            <span
              class="opt ${classMap({ on: i === shown })}"
              style=${styleMap({ left: `${CX + Math.cos(a) * LABEL_R}px`, top: `${CY + Math.sin(a) * LABEL_R - (side === "top" ? 4 : 0)}px`, "--ax": anchor[0], "--align": anchor[1] })}
              @click=${() => this.choose(o)}
              >${o.label}</span
            >
          `;
        })}
        <div
          class="knob"
          role="slider"
          tabindex="0"
          aria-label=${c.label || c.entity}
          aria-valuemin="0"
          aria-valuemax=${Math.max(0, items.length - 1)}
          aria-valuenow=${Math.max(0, shown)}
          aria-valuetext=${items[shown]?.label ?? "--"}
          style=${styleMap({ "--cap": `var(--te-cap-${c.cap})`, "--notch": dark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.55)", "--rot": `${rot}deg` })}
          @pointerdown=${this.onDown}
          @pointermove=${this.onMove}
          @pointerup=${this.onUp}
          @pointercancel=${this.onUp}
          @keydown=${this.onKey}
        >
          <div class="rotor"><div class="notch"></div></div>
        </div>
      </div>
    `;
  }

  private renderKeys(items: OptionItem[], index: number) {
    const cols = this._config!.columns ?? Math.min(items.length, 4);
    return html`
      <div class="keys" role="radiogroup" aria-label=${this._config!.label || this._config!.entity} style=${styleMap({ "--cols": String(Math.max(1, cols)) })} @keydown=${this.onKey}>
        ${items.map(
          (o, i) => html`
            <div class="mode ${classMap({ on: i === index })}">
              <span class="led ${classMap({ on: i === index })}"></span>
              <button class="key" role="radio" aria-checked=${i === index ? "true" : "false"} @click=${() => this.choose(o)}>${o.label}</button>
            </div>
          `,
        )}
      </div>
    `;
  }

  render() {
    const c = this._config!;
    const { items, index } = this.state();
    return html`
      <div class="card control ${classMap({ tile: !!c.tile })}">
        <div class="label">${c.label ?? ""}</div>
        ${items.length
          ? c.style === "keys"
            ? this.renderKeys(items, index)
            : this.renderRotary(items, index)
          : html`<div class="empty">NO OPTIONS</div>`}
        <div class="sublabel">${c.sublabel ?? ""}</div>
      </div>
    `;
  }
}

registerCard({ ...MODELS.selector, description: "Mode selector: detented rotary switch or latching mode keys. input_select, select, HVAC mode, fan preset, media source." }, TeSelector);
