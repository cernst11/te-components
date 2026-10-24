import { css, html } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { TeBaseCard, type BaseConfig } from "../core/base-card";
import { pickEntities } from "../core/entity";
import { F } from "../core/form";
import { MODELS, registerCard } from "../registry";
import { sharedStyles } from "../theme/shared";
import type { HassEntity, HomeAssistant } from "../types";
import { domainOf } from "../utils/math";

interface LedConfig {
  entity: string;
  label?: string;
  /** State(s) that light the LED; default depends on the domain. */
  on_state?: string[];
  /** Blink while lit (alarms, leaks). */
  blink?: boolean;
  /** `neutral` (alias `white`) for plain status like someone home; `accent` (default) for attention. */
  color: "accent" | "neutral";
}

interface LedsConfig extends BaseConfig {
  entities: LedConfig[];
  columns?: number;
  /** Print a summary like "2 OPEN" in the sublabel line. */
  summary?: string;
}

/** What "lit" means per domain: open / unlocked / detected / home. */
function defaultLit(st: HassEntity): boolean {
  const s = st.state;
  switch (domainOf(st.entity_id)) {
    case "person":
    case "device_tracker":
      return s === "home";
    case "lock":
      return s !== "locked";
    case "cover":
    case "valve":
      return s !== "closed";
    case "alarm_control_panel":
      return s !== "disarmed";
    default:
      return s === "on" || s === "open" || s === "true";
  }
}

/** Alarms and triggered states blink unless the config says otherwise. */
const defaultBlink = (st: HassEntity) => st.state === "triggered" || st.state === "jammed" || st.attributes.device_class === "moisture" || st.attributes.device_class === "smoke";

/** LD-8 — row of labelled status LEDs (TX-6 channel indicators): doors, windows, motion, presence. */
export class TeLeds extends TeBaseCard<LedsConfig> {
  static styles = [
    sharedStyles,
    css`
      .strip {
        display: grid;
        grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
        gap: 10px 4px;
        width: 100%;
      }
      .cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        min-width: 0;
        padding: 4px 0;
        border-radius: 6px;
        cursor: pointer;
      }
      .cell:active {
        background: var(--te-led-off);
      }
      .lamp {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--te-led-off);
        box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.3);
        transition: background 0.18s ease-out, box-shadow 0.18s ease-out;
      }
      .on .lamp {
        background: var(--te-accent);
        box-shadow: 0 0 6px var(--te-accent-glow);
        transition: none;
      }
      /* neutral status lights in ink: dark on silver, light on black (same as SL-2's safe end) */
      .on.neutral .lamp {
        background: var(--te-ink);
        box-shadow: none;
      }
      .on.blink .lamp {
        animation: blink 0.6s steps(2, jump-none) infinite;
      }
      @keyframes blink {
        50% {
          background: var(--te-led-off);
          box-shadow: none;
        }
      }
      .name {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 9px;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--te-ink-dim);
      }
      .on .name {
        color: var(--te-ink);
      }
      @media (prefers-reduced-motion: reduce) {
        .on.blink .lamp {
          animation: none;
        }
      }
    `,
  ];

  static getStubConfig(hass?: HomeAssistant) {
    // doors and windows first, then motion, then people
    const openings = new Set(["door", "window", "garage_door", "opening"]);
    const entities = pickEntities(hass, ["binary_sensor", "person"], 5, (id) => openings.has(hass!.states[id].attributes.device_class));
    return { label: "STATUS", entities };
  }

  static getConfigForm() {
    return { schema: [F.labels(), F.grid(F.num("columns", 1), F.text("summary")), F.look()] };
  }

  protected normalizeConfig(c: Record<string, any>): LedsConfig {
    if (!Array.isArray(c.entities) || !c.entities.length) throw new Error("entities is required");
    const entities: LedConfig[] = c.entities.map((e: string | Record<string, any>) => {
      const cfg = typeof e === "string" ? { entity: e } : e;
      if (!cfg.entity) throw new Error("each LED needs an entity");
      return { ...cfg, on_state: cfg.on_state === undefined ? undefined : [cfg.on_state].flat().map(String), color: cfg.color === "white" || cfg.color === "neutral" ? "neutral" : "accent" } as LedConfig;
    });
    return { ...c, type: c.type, entities, tile: c.tile === true };
  }

  protected watchedEntities() {
    return this._config!.entities.map((e) => e.entity);
  }

  getGridOptions() {
    return { columns: 6, rows: 1, min_columns: 3 };
  }

  private lit(e: LedConfig): { on: boolean; blink: boolean } {
    const st = this.hass?.states[e.entity];
    if (!st) return { on: false, blink: false };
    const on = e.on_state ? e.on_state.includes(st.state) : defaultLit(st);
    return { on, blink: on && (e.blink ?? defaultBlink(st)) };
  }

  render() {
    const c = this._config!;
    const leds = c.entities.map((e) => ({ e, ...this.lit(e) }));
    const count = leds.filter((l) => l.on).length;
    const sub = c.summary ? `${count} ${c.summary}` : (c.sublabel ?? "");
    return html`
      <div class="card ${classMap({ tile: !!c.tile })}">
        <div class="label">${c.label ?? ""}</div>
        <div class="strip" style=${styleMap({ "--cols": String(c.columns ?? c.entities.length) })}>
          ${leds.map(({ e, on, blink }) => {
            const st = this.hass?.states[e.entity];
            const name = e.label ?? st?.attributes.friendly_name ?? e.entity.split(".")[1];
            return html`
              <button
                class="cell ${classMap({ on, blink, neutral: e.color === "neutral" })}"
                aria-label=${`${name}: ${st?.state ?? "unavailable"}`}
                @click=${() => this.run({ action: "more-info" }, e.entity)}
              >
                <span class="lamp"></span>
                <span class="name">${name}</span>
              </button>
            `;
          })}
        </div>
        <div class="sublabel">${sub}</div>
      </div>
    `;
  }
}

registerCard({ ...MODELS.leds, description: "Row of labelled status LEDs for doors, windows, motion and presence." }, TeLeds);
