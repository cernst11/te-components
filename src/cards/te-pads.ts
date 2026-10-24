import { css, html } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import type { ActionConfig } from "../core/actions";
import { TeBaseCard, type BaseConfig } from "../core/base-card";
import { F } from "../core/form";
import { HoldGesture } from "../core/hold";
import { renderGlyph, renderIcon } from "../icons";
import { MODELS, registerCard } from "../registry";
import { sharedStyles } from "../theme/shared";
import type { HomeAssistant } from "../types";
import { domainOf } from "../utils/math";

const COLORS = ["light", "grey", "dark", "accent"] as const;

interface PadConfig {
  entity?: string;
  label?: string;
  icon?: string;
  glyph?: string;
  color: (typeof COLORS)[number];
  tap_action: ActionConfig;
  hold_action?: ActionConfig;
}

interface PadsConfig extends BaseConfig {
  pads: PadConfig[];
  columns: number;
  hold_time: number;
}

/** What tapping a pad does for its entity's domain. */
function defaultAction(entity?: string): ActionConfig {
  const domain = domainOf(entity);
  const perform = (service: string): ActionConfig => ({ action: "perform-action", perform_action: service, target: { entity_id: entity } });
  if (domain === "scene") return perform("scene.turn_on");
  if (domain === "script") return perform("script.turn_on");
  if (domain === "automation") return perform("automation.trigger");
  if (domain === "button" || domain === "input_button") return perform(`${domain}.press`);
  return entity ? { action: "toggle" } : { action: "none" };
}

/** PD-16 — K.O. II pad grid for scenes, scripts and switches. The active pad lights up. */
export class TePads extends TeBaseCard<PadsConfig> {
  private holds = new Map<number, HoldGesture>();

  static styles = [
    sharedStyles,
    css`
      .grid {
        display: grid;
        grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
        gap: 8px;
        width: 100%;
      }
      .pad {
        position: relative;
        aspect-ratio: 1;
        min-height: 44px;
        padding: 7px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: flex-start;
        border-radius: var(--te-r-key);
        overflow: hidden;
        color: var(--ink);
        background: var(--te-grain), var(--te-face), var(--face);
        background-blend-mode: overlay, normal, normal;
        box-shadow: var(--te-elev-2);
        touch-action: manipulation;
        transition: box-shadow 0.08s ease-out, transform 0.08s ease-out;
      }
      .pad:active {
        box-shadow: var(--te-pressed);
        transform: translateY(1px);
      }
      /* lit from inside like a K.O. II pad: accent rim + soft underglow */
      .pad.on {
        box-shadow:
          var(--te-elev-2),
          inset 0 0 0 1.5px var(--te-accent),
          inset 0 0 14px color-mix(in srgb, var(--te-accent) 45%, transparent);
      }
      .pad.on:active {
        box-shadow: var(--te-pressed), inset 0 0 0 1.5px var(--te-accent);
      }
      .name {
        font-size: 9px;
        font-weight: 600;
        letter-spacing: 0.02em;
        line-height: 1.15;
        text-align: left;
        text-transform: uppercase;
        overflow: hidden;
        max-width: 100%;
      }
      .num {
        position: absolute;
        bottom: 7px;
        right: 7px;
        font-size: 9px;
        font-variant-numeric: tabular-nums;
        opacity: 0.45;
      }
      .content {
        display: flex;
        --mdc-icon-size: 16px;
      }
      .fill {
        position: absolute;
        inset: 0;
        background: color-mix(in srgb, var(--te-accent) 35%, transparent);
        transform: scaleY(0);
        transform-origin: bottom;
        pointer-events: none;
      }
      .holding .fill {
        transform: scaleY(1);
        transition: transform var(--hold) linear;
      }
    `,
  ];

  static getStubConfig() {
    return {
      label: "SCENES",
      pads: [{ label: "Movie" }, { label: "Dinner" }, { label: "Night" }, { label: "Away" }],
    };
  }

  static getConfigForm() {
    return { schema: [F.labels(), F.grid(F.num("columns", 1), F.num("hold_time", 50)), F.look()] };
  }

  protected normalizeConfig(c: Record<string, any>): PadsConfig {
    if (!Array.isArray(c.pads) || !c.pads.length) throw new Error("pads is required: a list of {entity, label, …}");
    const pads: PadConfig[] = c.pads.map((p: Record<string, any> | string) => {
      const pad = typeof p === "string" ? { entity: p } : p;
      return {
        ...pad,
        color: COLORS.includes(pad.color) ? pad.color : "light",
        tap_action: pad.tap_action ?? defaultAction(pad.entity),
      } as PadConfig;
    });
    this.holds.clear();
    return { ...c, type: c.type, pads, columns: c.columns ?? Math.min(4, pads.length), hold_time: c.hold_time ?? 600, tile: c.tile === true };
  }

  protected watchedEntities() {
    return this._config!.pads.map((p) => p.entity).filter(Boolean) as string[];
  }

  getGridOptions() {
    return { columns: 6, rows: Math.ceil(this._config!.pads.length / this._config!.columns) + 1, min_columns: 3 };
  }

  /** Scenes have no on/off: the active one is the most recently activated scene among the pads. */
  private activeSet(hass?: HomeAssistant): Set<number> {
    const on = new Set<number>();
    let latest = -1;
    let latestAt = 0;
    this._config!.pads.forEach((p, i) => {
      const st = p.entity ? hass?.states[p.entity] : undefined;
      if (!st) return;
      if (domainOf(p.entity) === "scene") {
        const at = Date.parse(st.state);
        if (!Number.isNaN(at) && at > latestAt) {
          latestAt = at;
          latest = i;
        }
      } else if (st.state === "on") on.add(i);
    });
    if (latest >= 0) on.add(latest);
    return on;
  }

  private hold(i: number) {
    let g = this.holds.get(i);
    if (!g) {
      g = new HoldGesture(this, {
        time: () => this._config!.hold_time,
        enabled: () => !!this._config!.pads[i]?.hold_action,
        onHold: () => this.run(this._config!.pads[i].hold_action, this._config!.pads[i].entity),
      });
      this.holds.set(i, g);
    }
    return g;
  }

  private tap(i: number) {
    if (this.hold(i).consumeClick()) return;
    const p = this._config!.pads[i];
    this.run(p.tap_action, p.entity);
  }

  render() {
    const c = this._config!;
    const active = this.activeSet(this.hass);
    return html`
      <div class="card ${classMap({ tile: !!c.tile })}">
        <div class="label">${c.label ?? ""}</div>
        <div class="grid" style=${styleMap({ "--cols": String(c.columns) })}>
          ${c.pads.map((p, i) => {
            const g = this.hold(i);
            const name = p.label ?? (p.entity ? (this.hass?.states[p.entity]?.attributes.friendly_name ?? p.entity.split(".")[1]) : "");
            const dark = p.color === "dark" || p.color === "accent";
            return html`
              <button
                class="pad ${classMap({ on: active.has(i), holding: g.holding })}"
                aria-label=${name}
                aria-pressed=${active.has(i) ? "true" : "false"}
                style=${styleMap({
                  "--face": p.color === "accent" ? "var(--te-accent)" : `var(--te-key-${p.color})`,
                  "--ink": dark ? "#f4f3ef" : "var(--te-ink)",
                  "--hold": `${c.hold_time}ms`,
                })}
                @pointerdown=${g.down}
                @pointerup=${g.cancel}
                @pointerleave=${g.cancel}
                @pointercancel=${g.cancel}
                @click=${() => this.tap(i)}
              >
                <span class="fill"></span>
                <span class="name">${name}</span>
                <span class="num">${i + 1}</span>
                <span class="content">${p.icon ? renderIcon(p.icon, 16) : p.glyph ? renderGlyph(p.glyph, 14) : ""}</span>
              </button>
            `;
          })}
        </div>
        <div class="sublabel">${c.sublabel ?? ""}</div>
      </div>
    `;
  }
}

registerCard({ ...MODELS.pads, description: "K.O. II pad grid for scenes, scripts and switches; the active pad lights up." }, TePads);
