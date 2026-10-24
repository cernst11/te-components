import { css, html, type PropertyValues } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { TeBaseCard, type BaseConfig } from "../core/base-card";
import { pickEntity } from "../core/entity";
import { F } from "../core/form";
import { MODELS, registerCard } from "../registry";
import { sharedStyles } from "../theme/shared";
import type { HomeAssistant } from "../types";
import { clamp01, domainOf } from "../utils/math";

interface End {
  /** Entity state this end represents. */
  state: string;
  label: string;
  /** "domain.service" that moves the entity to this end. */
  service: string;
}

/** Left = safe/closed, right = open/attention. Transitional states park the thumb mid-travel. */
interface SlideSpec {
  left: End;
  right: End;
  moving: string[];
}

const SPECS: Record<string, SlideSpec> = {
  lock: {
    left: { state: "locked", label: "LOCK", service: "lock.lock" },
    right: { state: "unlocked", label: "OPEN", service: "lock.unlock" },
    moving: ["locking", "unlocking", "opening"],
  },
  cover: {
    left: { state: "closed", label: "CLOSE", service: "cover.close_cover" },
    right: { state: "open", label: "OPEN", service: "cover.open_cover" },
    moving: ["opening", "closing"],
  },
  valve: {
    left: { state: "closed", label: "CLOSE", service: "valve.close_valve" },
    right: { state: "open", label: "OPEN", service: "valve.open_valve" },
    moving: ["opening", "closing"],
  },
};

const toggleSpec = (domain: string): SlideSpec => ({
  left: { state: "off", label: "OFF", service: `${domain}.turn_off` },
  right: { state: "on", label: "ON", service: `${domain}.turn_on` },
  moving: [],
});

interface SlideConfig extends BaseConfig {
  entity: string;
  left_label?: string;
  right_label?: string;
}

/** Fraction of travel the thumb must reach to commit; anything less springs back. */
const COMMIT = 0.86;
/** Give up waiting for HA to confirm after this long and spring back to the real state. */
const PENDING_MS = 10_000;

/** SL-2 — TP-7 style side switch for things that shouldn't be one tap: locks, garage doors, valves. */
export class TeSlide extends TeBaseCard<SlideConfig> {
  static properties = {
    _drag: { state: true },
    _pending: { state: true },
  };

  /** Thumb position 0..1 while dragging. */
  declare _drag?: number;
  declare _pending?: { side: "left" | "right"; until: number };
  private start?: { x: number; pos: number; width: number };

  static styles = [
    sharedStyles,
    css`
      .switch {
        display: flex;
        flex-direction: column;
        gap: 6px;
        width: 132px;
        max-width: 100%;
      }
      .ends {
        display: flex;
        justify-content: space-between;
        padding: 0 4px;
      }
      .end {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 9px;
        font-weight: 600;
        letter-spacing: 0.06em;
        color: var(--te-ink-dim);
      }
      .end.on {
        color: var(--te-ink);
      }
      .end .led {
        margin: 0;
      }
      /* the safe end (locked / closed / off) lights neutral; orange is kept for open = attention */
      .led.safe.on {
        background: var(--te-ink);
        box-shadow: none;
      }
      .moving .end.target .led {
        animation: blink 0.5s steps(2, jump-none) infinite;
      }
      @keyframes blink {
        50% {
          opacity: 0.2;
        }
      }
      .track {
        position: relative;
        height: 34px;
        border-radius: 17px;
        background: var(--te-body-shade);
        box-shadow: var(--te-sunk-2);
        touch-action: none;
        cursor: grab;
      }
      .thumb {
        position: absolute;
        top: 4px;
        left: calc(4px + var(--pos) * (100% - 8px - 56px));
        width: 56px;
        height: 26px;
        border-radius: 13px;
        background:
          repeating-linear-gradient(90deg, transparent 0 5px, var(--te-lo) 5px 6px, var(--te-hi) 6px 7px) 16px 6px / 24px 14px no-repeat,
          var(--te-grain),
          var(--te-face),
          var(--te-key-light);
        background-blend-mode: normal, overlay, normal, normal;
        box-shadow: var(--te-elev-2);
        transition: left 0.16s ease-out;
      }
      .dragging .thumb {
        transition: none;
      }
      .track:focus-visible {
        outline: 2px solid var(--te-accent);
        outline-offset: 2px;
      }
      .hint {
        min-height: 13px;
      }
    `,
  ];

  static getStubConfig(hass?: HomeAssistant) {
    return { entity: pickEntity(hass, ["lock", "cover"]), label: "FRONT DOOR" };
  }

  static getConfigForm() {
    return { schema: [F.entity(), F.labels(), F.grid(F.text("left_label"), F.text("right_label")), F.look(F.feedback())] };
  }

  protected normalizeConfig(c: Record<string, any>): SlideConfig {
    if (!c.entity) throw new Error("entity is required");
    return { ...c, type: c.type, entity: c.entity, tile: c.tile === true };
  }

  getGridOptions() {
    return { columns: 4, rows: 2, min_columns: 3 };
  }

  private spec(): SlideSpec {
    const domain = domainOf(this._config!.entity);
    return SPECS[domain] ?? toggleSpec(domain);
  }

  /** Where the entity actually is: left, right, or moving between (with the side it's heading to). */
  private reading(): { side?: "left" | "right"; moving?: "left" | "right" } {
    const st = this.stateObj()?.state;
    const s = this.spec();
    if (st === s.left.state) return { side: "left" };
    if (st === s.right.state) return { side: "right" };
    if (st && s.moving.includes(st)) return { moving: /^(lock|clos)/.test(st) ? "left" : "right" };
    return {};
  }

  protected willUpdate(changed: PropertyValues) {
    super.willUpdate(changed);
    const p = this._pending;
    if (p && (Date.now() > p.until || this.reading().side === p.side)) this._pending = undefined;
  }

  private commit(side: "left" | "right") {
    if (!this.hass) return;
    this.feedback("confirm");
    const end = this.spec()[side];
    this._pending = { side, until: Date.now() + PENDING_MS };
    setTimeout(() => this.requestUpdate(), PENDING_MS + 50);
    const [domain, service] = end.service.split(".");
    this.hass.callService(domain, service, { entity_id: this._config!.entity });
  }

  /** Resting thumb position for the current state. */
  private restPos(): number {
    const r = this.reading();
    const side = this._pending?.side ?? r.side;
    if (side) return side === "right" ? 1 : 0;
    return 0.5;
  }

  private onDown = (e: PointerEvent) => {
    const track = e.currentTarget as HTMLElement;
    track.setPointerCapture(e.pointerId);
    this.start = { x: e.clientX, pos: this.restPos(), width: track.getBoundingClientRect().width - 8 - 56 };
  };

  private onMove = (e: PointerEvent) => {
    const s = this.start;
    if (!s) return;
    if (this._drag === undefined && Math.abs(e.clientX - s.x) < 3) return;
    const prev = this._drag ?? s.pos;
    this._drag = clamp01(s.pos + (e.clientX - s.x) / Math.max(1, s.width));
    // a detent where the slide will commit, so you can feel when to let go
    const past = (p: number) => (s.pos < 0.5 ? p >= COMMIT : s.pos > 0.5 ? p <= 1 - COMMIT : false);
    if (past(this._drag) && !past(prev)) this.feedback("stop");
  };

  private onUp = () => {
    const pos = this._drag;
    this.start = undefined;
    this._drag = undefined;
    if (pos === undefined) return;
    const from = this.restPos();
    // only a full slide to the far end commits; a partial slide springs back
    if (from < 0.5 && pos >= COMMIT) this.commit("right");
    else if (from > 0.5 && pos <= 1 - COMMIT) this.commit("left");
    else if (from === 0.5) this.commit(pos >= 0.5 ? "right" : "left");
  };

  private onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" && this.restPos() < 1) this.commit("right");
    else if (e.key === "ArrowLeft" && this.restPos() > 0) this.commit("left");
    else return;
    e.preventDefault();
  };

  render() {
    const c = this._config!;
    const s = this.spec();
    const r = this.reading();
    const pos = this._drag ?? this.restPos();
    const target = this._pending?.side ?? r.moving;
    const at = this._pending ? undefined : r.side;
    const leftLabel = c.left_label ?? s.left.label;
    const rightLabel = c.right_label ?? s.right.label;
    const stateText = (this.stateObj()?.state ?? "unavailable").replace(/_/g, " ").toUpperCase();
    return html`
      <div class="card control ${classMap({ tile: !!c.tile })}">
        <div class="label">${c.label ?? ""}</div>
        <div class="switch ${classMap({ dragging: this._drag !== undefined, moving: !!target })}">
          <div class="ends">
            <span class="end ${classMap({ on: at === "left", target: target === "left" })}">
              <span class="led safe ${classMap({ on: at === "left" || target === "left" })}"></span>${leftLabel}
            </span>
            <span class="end ${classMap({ on: at === "right", target: target === "right" })}">
              ${rightLabel}<span class="led ${classMap({ on: at === "right" || target === "right" })}"></span>
            </span>
          </div>
          <div
            class="track"
            role="switch"
            tabindex="0"
            aria-label=${`${c.label || c.entity}: slide to ${pos > 0.5 ? leftLabel : rightLabel}`}
            aria-checked=${at === "right" ? "true" : "false"}
            style=${styleMap({ "--pos": String(pos) })}
            @pointerdown=${this.onDown}
            @pointermove=${this.onMove}
            @pointerup=${this.onUp}
            @pointercancel=${this.onUp}
            @keydown=${this.onKey}
          >
            <div class="thumb"></div>
          </div>
        </div>
        <div class="sublabel hint">${c.sublabel ?? stateText}</div>
      </div>
    `;
  }
}

registerCard({ ...MODELS.slide, description: "Slide-to-confirm side switch for locks, garage doors, valves and switches." }, TeSlide);
