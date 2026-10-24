import { css, html } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { styleMap } from "lit/directives/style-map.js";
import type { ActionConfig } from "../core/actions";
import { TeBaseCard, type BaseConfig } from "../core/base-card";
import { F } from "../core/form";
import { HoldGesture } from "../core/hold";
import { GLYPH_NAMES, renderGlyph, renderIcon } from "../icons";
import { MODELS, registerCard } from "../registry";
import { sharedStyles } from "../theme/shared";

const SHAPES = ["round", "square", "key"] as const;
const COLORS = ["light", "dark", "grey", "accent"] as const;

interface ButtonConfig extends BaseConfig {
  shape: (typeof SHAPES)[number];
  color: (typeof COLORS)[number];
  icon?: string;
  glyph?: string;
  tap_action: ActionConfig;
  hold_action?: ActionConfig;
  hold_time: number;
  /** Tap does nothing; holding for `hold_time` runs `tap_action` (destructive actions). */
  hold_to_confirm: boolean;
  /** Lights the LED when `active_entity`(.`active_attribute`) equals `active_state`. */
  active_entity?: string;
  active_attribute?: string;
  active_state?: string;
}

/** BT-4 — momentary button: round, square, or K.O.-style key with printed label. */
export class TeButton extends TeBaseCard<ButtonConfig> {
  private hold = new HoldGesture(this, {
    time: () => this._config!.hold_time,
    enabled: () => this._config!.hold_to_confirm || !!this._config!.hold_action,
    onHold: () => this.run(this._config!.hold_to_confirm ? this._config!.tap_action : this._config!.hold_action),
  });

  static styles = [
    sharedStyles,
    css`
      .btn {
        position: relative;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--ink);
        background: var(--te-grain), var(--te-face), var(--face);
        background-blend-mode: overlay, normal, normal;
        box-shadow: var(--te-elev-2);
        touch-action: manipulation;
        transition: box-shadow 0.08s ease-out, transform 0.08s ease-out;
      }
      .btn:active {
        box-shadow: var(--te-pressed);
        transform: translateY(1px);
      }
      .square .btn {
        border-radius: 14px;
      }
      .key .btn {
        width: 60px;
        height: 60px;
        border-radius: var(--te-r-key);
        box-shadow: var(--te-elev-1), 0 4px 0 -1px color-mix(in srgb, var(--face) 70%, black);
        align-items: flex-start;
        justify-content: flex-start;
        padding: 6px 7px;
      }
      .key .btn:active {
        box-shadow: var(--te-pressed);
        transform: translateY(3px);
      }
      .content {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .key .content {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
        font-size: 10px;
        font-weight: 500;
        text-align: left;
      }
      .fill {
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: color-mix(in srgb, var(--te-accent) 55%, transparent);
        transform: scale(0);
        transition: transform 0.15s ease-out;
        pointer-events: none;
      }
      .holding .fill {
        transform: scale(1.4);
        transition: transform var(--hold) linear;
      }
    `,
  ];

  static getStubConfig() {
    return { label: "PLAY", glyph: "play", tap_action: { action: "none" } };
  }

  static getConfigForm() {
    return {
      schema: [
        F.entity(),
        F.labels(),
        F.grid(F.select("shape", SHAPES), F.select("color", COLORS), F.icon(), F.select("glyph", GLYPH_NAMES)),
        F.action("tap_action"),
        F.action("hold_action"),
        F.grid(F.num("hold_time", 50), F.bool("hold_to_confirm")),
        { type: "expandable", name: "", title: "Active LED", schema: [{ name: "active_entity", selector: { entity: {} } }, F.text("active_attribute"), F.text("active_state")] },
        F.look(F.feedback()),
      ].map((s: any) => (s.name === "entity" ? { ...s, required: false } : s)),
    };
  }

  protected normalizeConfig(c: Record<string, any>): ButtonConfig {
    return {
      ...c,
      type: c.type,
      shape: SHAPES.includes(c.shape) ? c.shape : "round",
      color: COLORS.includes(c.color) ? c.color : "light",
      tap_action: c.tap_action ?? (c.entity ? { action: "toggle" } : { action: "none" }),
      hold_time: c.hold_time ?? 600,
      hold_to_confirm: c.hold_to_confirm === true,
      active_entity: c.active_entity ?? c.entity,
      tile: c.tile === true,
    };
  }

  protected watchedEntities() {
    return [this._config?.active_entity].filter(Boolean) as string[];
  }

  getGridOptions() {
    return { columns: 3, rows: 2, min_rows: 2 };
  }

  private get active(): boolean | undefined {
    const c = this._config!;
    if (c.active_state === undefined || !c.active_entity) return undefined;
    const st = this.stateObj(c.active_entity);
    if (!st) return false;
    const raw = c.active_attribute ? st.attributes[c.active_attribute] : st.state;
    return String(raw) === String(c.active_state);
  }

  private onClick = (ev: MouseEvent) => {
    if (this.hold.consumeClick()) return;
    const c = this._config!;
    // keyboard activation (detail 0) bypasses hold-to-confirm for accessibility
    if (c.hold_to_confirm && ev.detail !== 0) return;
    this.run(c.tap_action);
  };

  render() {
    const c = this._config!;
    const active = this.active;
    const dark = c.color === "dark" || c.color === "accent";
    const content = c.icon ? renderIcon(c.icon, c.shape === "key" ? 16 : 22) : renderGlyph(c.glyph, c.shape === "key" ? 14 : 22);
    const led = active === undefined ? "" : html`<span class="led ${classMap({ on: active })}"></span>`;
    return html`
      <div class="card control ${classMap({ tile: !!c.tile, [c.shape]: true, holding: this.hold.holding })}">
        ${c.shape === "key" ? html`<div class="label">${led}</div>` : html`<div class="label">${led}${c.label ?? ""}</div>`}
        <button
          class="btn"
          aria-label=${c.label || c.glyph || c.icon || "button"}
          aria-pressed=${ifDefined(active === undefined ? undefined : String(active))}
          style=${styleMap({
            "--face": `var(--te-${c.color === "accent" ? "accent" : `key-${c.color}`})`,
            "--ink": dark ? "#f4f3ef" : "var(--te-ink)",
            "--hold": `${c.hold_time}ms`,
            "--te-glyph-record": c.color === "accent" ? "currentColor" : undefined,
          })}
          @pointerdown=${this.hold.down}
          @pointerup=${this.hold.cancel}
          @pointerleave=${this.hold.cancel}
          @pointercancel=${this.hold.cancel}
          @click=${this.onClick}
        >
          <span class="fill"></span>
          <span class="content">${c.shape === "key" ? html`<span>${c.label ?? ""}</span>${content}` : content}</span>
        </button>
        <div class="sublabel">${c.sublabel ?? ""}</div>
      </div>
    `;
  }
}

registerCard({ ...MODELS.button, description: "Momentary button (round, square or K.O. key) with optional hold action." }, TeButton);
