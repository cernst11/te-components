import { css, html } from "lit";
import { classMap } from "lit/directives/class-map.js";
import type { ActionConfig } from "../core/actions";
import { TeBaseCard, type BaseConfig } from "../core/base-card";
import { onStateOf, pickEntity } from "../core/entity";
import { configForm, F } from "../core/form";
import { HoldGesture } from "../core/hold";
import { renderGlyph } from "../icons";
import { MODELS, registerCard } from "../registry";
import { sharedStyles } from "../theme/shared";
import type { HomeAssistant } from "../types";

interface ToggleConfig extends BaseConfig {
  entity: string;
  tap_action: ActionConfig;
  /** State value that counts as "on" (default `on`). */
  on_state: string;
  /** Printed in the LED window, e.g. "I" / "II" like the TX-6 FX buttons. */
  glyph?: string;
  /** Locks only: unlocking needs a press-and-hold (default true); locking is always a tap. */
  confirm_unlock: boolean;
  hold_time: number;
}

const DEFAULTS = { confirm_unlock: true, hold_time: 700 } satisfies Partial<ToggleConfig>;

/** TG-1 — round button with a pill LED window (TX-6 FX). */
export class TeToggle extends TeBaseCard<ToggleConfig> {
  private hold = new HoldGesture(this, {
    time: () => this._config!.hold_time,
    enabled: () => this.needsHold,
    onHold: () => this.run(this._config!.tap_action),
  });

  static styles = [
    sharedStyles,
    css`
      .btn {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--te-grain), var(--te-face), var(--te-body);
        background-blend-mode: overlay, normal, normal;
        box-shadow: var(--te-elev-2);
        transition: box-shadow 0.08s ease-out, transform 0.08s ease-out;
      }
      .btn:active {
        box-shadow: var(--te-pressed);
        transform: translateY(1px);
      }
      .pill {
        min-width: 32px;
        height: 14px;
        padding: 0 6px;
        border-radius: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 500;
        line-height: 1;
        color: color-mix(in srgb, var(--te-ink-on-dark) 85%, transparent);
        background: var(--te-key-dark);
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
        transition: background 0.18s ease-out, box-shadow 0.18s ease-out;
      }
      .pill svg {
        width: 12px;
        height: 12px;
      }
      /* hold-to-unlock: the pill fades out over the hold time */
      .holding .pill {
        opacity: 0.35;
        transition: opacity var(--hold) linear;
      }
      .on .pill {
        color: var(--te-ink-on-light);
        background: var(--te-accent);
        box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.25), 0 0 8px var(--te-accent-glow);
        transition: none;
      }
    `,
  ];

  static getStubConfig(hass?: HomeAssistant) {
    return { entity: pickEntity(hass, ["switch", "light", "input_boolean", "fan", "lock"]), label: "FX", glyph: "I" };
  }

  static getConfigForm() {
    return configForm([F.entity(), F.labels(), F.grid(F.glyph(["I", "II", "III"]), F.text("on_state")), F.grid(F.bool("confirm_unlock"), F.num("hold_time", 50)), F.action("tap_action"), F.look(F.feedback())], DEFAULTS);
  }

  protected normalizeConfig(c: Record<string, any>): ToggleConfig {
    if (!c.entity) throw new Error("entity is required");
    return {
      ...c,
      type: c.type,
      entity: c.entity,
      tap_action: c.tap_action ?? { action: "toggle" },
      on_state: c.on_state ?? onStateOf(c.entity),
      confirm_unlock: c.confirm_unlock ?? DEFAULTS.confirm_unlock,
      hold_time: c.hold_time ?? DEFAULTS.hold_time,
      tile: c.tile === true,
    };
  }

  getGridOptions() {
    return { columns: 3, rows: 2, min_rows: 2 };
  }

  /** A locked lock with confirm_unlock opens only on a hold. */
  private get needsHold() {
    const c = this._config!;
    return c.confirm_unlock && c.entity.startsWith("lock.") && this.stateObj()?.state === "locked";
  }

  private onClick = (ev: MouseEvent) => {
    if (this.hold.consumeClick()) return;
    // keyboard activation (detail 0) bypasses the hold for accessibility, as on BT-4
    if (this.needsHold && ev.detail !== 0) return;
    this.run(this._config!.tap_action);
  };

  render() {
    const c = this._config!;
    const st = this.stateObj();
    const on = st?.state === c.on_state;
    return html`
      <div class="card control ${classMap({ tile: !!c.tile, on, holding: this.hold.holding })}" style=${`--hold:${c.hold_time}ms`}>
        <div class="label">${c.label ?? ""}</div>
        <button
          class="btn"
          role="switch"
          aria-checked=${on ? "true" : "false"}
          aria-label=${c.label || st?.attributes.friendly_name || c.entity}
          @pointerdown=${this.hold.down}
          @pointerup=${this.hold.cancel}
          @pointerleave=${this.hold.cancel}
          @pointercancel=${this.hold.cancel}
          @click=${this.onClick}
        >
          <span class="pill">${renderGlyph(c.glyph, 12)}</span>
        </button>
        <div class="sublabel">${c.sublabel ?? (this.needsHold ? "HOLD" : "")}</div>
      </div>
    `;
  }
}

registerCard({ ...MODELS.toggle, description: "TX-6 FX style toggle with a pill LED." }, TeToggle);
