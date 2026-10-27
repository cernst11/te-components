import { css, html, type PropertyValues } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { TeBaseCard, type BaseConfig } from "../core/base-card";
import { pickEntity } from "../core/entity";
import { configForm, F } from "../core/form";
import { HoldGesture } from "../core/hold";
import { MODELS, registerCard } from "../registry";
import { ScreenController, type Frame } from "../screen/controller";
import { applyMesh, clear, drawLine, glyphHeight, newMarquee, pixelMetrics, StripCache, textWidth } from "../screen/render";
import { screenStyles } from "../screen/styles";
import { screenName, screenTheme } from "../screen/themes";
import { sharedStyles } from "../theme/shared";
import type { HomeAssistant } from "../types";

/** Arm modes in HA order, with the supported_features bit and key label. */
const MODES = {
  home: { bit: 1, label: "HOME" },
  away: { bit: 2, label: "AWAY" },
  night: { bit: 4, label: "NIGHT" },
  vacation: { bit: 32, label: "VAC" },
  custom_bypass: { bit: 16, label: "BYPASS" },
} as const;
type Mode = keyof typeof MODES;

interface KeypadConfig extends BaseConfig {
  entity: string;
  /** Arm keys to show; default = what the panel supports. */
  modes?: Mode[];
  hold_time: number;
  screen: string;
}

const DEFAULTS = { hold_time: 800 } satisfies Partial<KeypadConfig>;

/** How long a screen message ("ENTER CODE", "WRONG CODE") stays up. */
const MESSAGE_MS = 2000;
/** Longest PIN the screen accepts. */
const MAX_CODE = 10;
/** Give up on an arming LED if HA never reports the armed state. */
const PENDING_MS = 90_000;

/** KP-12 — alarm keypad: 3×4 keys, arm-mode keys with LEDs, PIN on a pixel screen, hold to disarm. */
export class TeKeypad extends TeBaseCard<KeypadConfig> {
  static properties = {
    _code: { state: true },
    _message: { state: true },
    _arming: { state: true },
  };

  declare _code: string;
  declare _message?: string;
  /** Mode we asked for while HA reports `arming`/`pending`, so its LED blinks. */
  declare _arming?: { mode: Mode; until: number };
  private messageTimer?: ReturnType<typeof setTimeout>;
  private screen = new ScreenController(this, (f) => this.draw(f), 8);
  private strips = new StripCache();
  private marquee = newMarquee();
  private disarmHold = new HoldGesture(this, {
    time: () => this._config!.hold_time,
    enabled: () => true,
    onHold: () => this.disarm(),
  });

  constructor() {
    super();
    this._code = "";
  }

  static styles = [
    sharedStyles,
    screenStyles,
    css`
      .card {
        align-items: stretch;
        gap: 10px;
      }
      .screen {
        height: 40px;
        cursor: text;
      }
      .screen:focus-visible {
        outline: 2px solid var(--te-accent);
        outline-offset: 2px;
      }
      .modes,
      .keys {
        display: grid;
        gap: 8px;
      }
      .modes {
        grid-template-columns: repeat(var(--n), minmax(0, 1fr));
      }
      .keys {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .mode {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
      }
      .mode .led {
        margin: 0;
      }
      .mode .led.blink {
        animation: blink 0.6s steps(2, jump-none) infinite;
      }
      @keyframes blink {
        50% {
          background: var(--te-led-off);
          box-shadow: none;
        }
      }
      .key {
        position: relative;
        width: 100%;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--te-r-key);
        overflow: hidden;
        font-size: 15px;
        font-weight: 400;
        font-variant-numeric: tabular-nums;
        color: var(--ink);
        background: var(--te-grain), var(--te-face), var(--face);
        background-blend-mode: overlay, normal, normal;
        box-shadow: var(--te-elev-2);
        touch-action: manipulation;
        transition: box-shadow 0.08s ease-out, transform 0.08s ease-out;
        --face: var(--te-key-light);
        --ink: var(--te-ink);
      }
      .key:active {
        box-shadow: var(--te-pressed);
        transform: translateY(1px);
      }
      .key.small {
        font-size: 9px;
        font-weight: 600;
        letter-spacing: 0.06em;
        min-height: 34px;
      }
      .key.dark {
        --face: var(--te-key-dark);
        --ink: var(--te-cap-white);
      }
      .key.grey {
        --face: var(--te-key-grey);
        --ink: var(--te-cap-white);
      }
      .key.accent {
        --face: var(--te-accent);
        --ink: var(--te-cap-white);
      }
      .disarm {
        min-height: 40px;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .fill {
        position: absolute;
        inset: 0;
        background: color-mix(in srgb, var(--te-cap-white) 30%, transparent);
        transform: scaleX(0);
        transform-origin: left;
        pointer-events: none;
      }
      .holding .fill {
        transform: scaleX(1);
        transition: transform var(--hold) linear;
      }
      @media (prefers-reduced-motion: reduce) {
        .mode .led.blink {
          animation: none;
        }
      }
    `,
  ];

  static getStubConfig(hass?: HomeAssistant) {
    return { entity: pickEntity(hass, ["alarm_control_panel"]), label: "ALARM" };
  }

  static getConfigForm() {
    return configForm(
      [
        F.entity(["alarm_control_panel"]),
        F.labels(),
        { name: "modes", selector: { select: { multiple: true, mode: "list", options: Object.keys(MODES).map((m) => ({ value: m, label: m.replace("_", " ") })) } } },
        F.grid(F.num("hold_time", 50), F.screen()),
        F.look(F.feedback()),
      ],
      DEFAULTS,
    );
  }

  protected normalizeConfig(c: Record<string, any>): KeypadConfig {
    if (!c.entity) throw new Error("entity is required");
    const modes = c.modes === undefined ? undefined : [c.modes].flat().filter((m: string): m is Mode => m in MODES);
    return { ...c, type: c.type, entity: c.entity, modes, hold_time: c.hold_time ?? DEFAULTS.hold_time, screen: screenName(c.screen), tile: c.tile === true };
  }

  getGridOptions() {
    return { columns: 6, min_columns: 4 };
  }

  getCardSize() {
    return 7;
  }

  protected firstUpdated() {
    this.screen.attach(this.renderRoot.querySelector("canvas"));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.messageTimer);
  }

  protected willUpdate(changed: PropertyValues) {
    super.willUpdate(changed);
    const a = this._arming;
    const st = this.stateObj()?.state;
    if (a && (Date.now() > a.until || (st !== "arming" && st !== "pending"))) this._arming = undefined;
  }

  private modes(): Mode[] {
    if (this._config!.modes) return this._config!.modes;
    const f = this.stateObj()?.attributes.supported_features;
    // no supported_features (older or template panels): the usual three
    if (typeof f !== "number") return ["home", "away", "night"];
    return (Object.keys(MODES) as Mode[]).filter((m) => f & MODES[m].bit);
  }

  /** The panel wants a code at all (code_format set), and for arming too (code_arm_required, default true). */
  private needsCode(arming: boolean): boolean {
    const a = this.stateObj()?.attributes ?? {};
    if (!a.code_format) return false;
    return arming ? a.code_arm_required !== false : true;
  }

  private flash(text: string) {
    this._message = text;
    clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => (this._message = undefined), MESSAGE_MS);
  }

  private press(digit: string) {
    this.feedback("press");
    this._message = undefined;
    if (this._code.length < MAX_CODE) this._code += digit;
  }

  private backspace() {
    this.feedback("press");
    this._code = this._code.slice(0, -1);
  }

  private clearCode() {
    this.feedback("press");
    this._code = "";
  }

  private async send(service: string, arming: boolean, onOk?: () => void) {
    if (!this.hass) return;
    if (this.needsCode(arming) && !this._code) {
      this.feedback("stop");
      this.flash("ENTER CODE");
      return;
    }
    const code = this._code;
    this._code = "";
    try {
      await this.hass.callService("alarm_control_panel", service, { entity_id: this._config!.entity, ...(code ? { code } : {}) });
      onOk?.();
    } catch {
      // HA rejects a wrong code with a validation error
      this.feedback("stop");
      this.flash("WRONG CODE");
    }
  }

  private arm(mode: Mode) {
    this.feedback("press");
    this.send(`alarm_arm_${mode}`, true, () => (this._arming = { mode, until: Date.now() + PENDING_MS }));
  }

  private disarm() {
    this.send("alarm_disarm", false, () => this.feedback("confirm"));
  }

  private onDisarmClick = (ev: MouseEvent) => {
    if (this.disarmHold.consumeClick()) return;
    // keyboard activation (detail 0) skips the hold, like BT-4's hold_to_confirm
    if (ev.detail === 0) this.disarm();
  };

  /** Typing on a focused keypad: digits, Backspace, Escape clears, Enter disarms when armed. */
  private onKey = (e: KeyboardEvent) => {
    if (/^[0-9]$/.test(e.key)) this.press(e.key);
    else if (e.key === "Backspace") this.backspace();
    else if (e.key === "Escape") this.clearCode();
    else if (e.key === "Enter" && this.isArmed()) this.disarm();
    else return;
    e.preventDefault();
  };

  private isArmed() {
    const s = this.stateObj()?.state ?? "";
    return s !== "disarmed" && s !== "unavailable" && s !== "unknown";
  }

  /** Screen text: a message, else the state; right side: one * per digit. */
  private screenText(): { left: string; right: string; blink: boolean; alert: boolean } {
    const st = this.stateObj();
    const state = st?.state ?? "unavailable";
    const left = this._message ?? state.replace(/_/g, " ").toUpperCase();
    return {
      left,
      right: "*".repeat(this._code.length),
      blink: !this._message && (state === "arming" || state === "pending" || state === "triggered"),
      alert: state === "triggered" || this._message === "WRONG CODE",
    };
  }

  private draw(f: Frame) {
    if (!this._config) return;
    const { ctx, w, h, dpr } = f;
    const theme = screenTheme(this._config.screen);
    clear(ctx, theme);
    const { left, right, blink, alert } = this.screenText();
    const m = pixelMetrics(2, dpr);
    const y = (h - glyphHeight(m)) / 2;
    const pad = 10 * dpr;
    const rightW = right ? textWidth(right, m) + 8 * dpr : 0;
    const off = blink && !f.reducedMotion && Math.floor(Date.now() / 400) % 2 === 1;
    if (left !== this.marquee.text) this.marquee = newMarquee(left);
    if (!off) {
      drawLine(ctx, this.strips.get(left, m, alert ? theme.fg2 : theme.fg, theme), {
        x0: pad,
        y,
        availW: w - pad * 2 - rightW,
        align: "left",
        scroll: !f.reducedMotion,
        marquee: this.marquee,
        dt: f.dt,
        m,
      });
    }
    if (right) {
      const strip = this.strips.get(right, m, theme.fg, theme);
      ctx.drawImage(strip.canvas, Math.round(w - pad - strip.width) - strip.pad, Math.round(y) - strip.pad);
    }
    if (theme.mesh) applyMesh(ctx);
  }

  render() {
    const c = this._config!;
    const st = this.stateObj();
    const state = st?.state ?? "unavailable";
    const modes = this.modes();
    const armed = this.isArmed();
    const showKeys = !st || !!st.attributes.code_format;
    const { left, right } = this.screenText();
    const key = (label: string, onClick: () => void, cls = "", aria = label) =>
      html`<button class="key ${cls}" aria-label=${aria} @click=${onClick}>${label}</button>`;
    return html`
      <div class="card ${classMap({ tile: !!c.tile })}">
        <div class="label">${c.label ?? ""}</div>
        <div class="screen" tabindex="0" role="status" aria-live="polite" aria-label=${`${left}${right ? `, ${right.length} ${right.length === 1 ? "digit" : "digits"} entered` : ""}`} @keydown=${this.onKey}>
          <canvas></canvas>
        </div>
        ${modes.length
          ? html`<div class="modes" style=${styleMap({ "--n": String(modes.length) })}>
              ${modes.map((m) => {
                const on = state === `armed_${m}`;
                const blink = this._arming?.mode === m;
                return html`<div class="mode">
                  <span class="led ${classMap({ on: on || blink, blink })}"></span>
                  ${key(MODES[m].label, () => this.arm(m), "small grey", `Arm ${m.replace("_", " ")}`)}
                </div>`;
              })}
            </div>`
          : ""}
        ${showKeys
          ? html`<div class="keys" @keydown=${this.onKey}>
              ${["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => key(d, () => this.press(d)))}
              ${key("CLR", () => this.clearCode(), "small dark", "Clear code")}
              ${key("0", () => this.press("0"))}
              ${key("DEL", () => this.backspace(), "small dark", "Delete last digit")}
            </div>`
          : ""}
        <button
          class="key disarm ${classMap({ accent: armed, dark: !armed, holding: this.disarmHold.holding })}"
          style=${styleMap({ "--hold": `${c.hold_time}ms` })}
          aria-label="Disarm (hold)"
          @pointerdown=${this.disarmHold.down}
          @pointerup=${this.disarmHold.cancel}
          @pointerleave=${this.disarmHold.cancel}
          @pointercancel=${this.disarmHold.cancel}
          @click=${this.onDisarmClick}
        >
          <span class="fill"></span><span>${c.sublabel ?? "Hold to disarm"}</span>
        </button>
      </div>
    `;
  }
}

registerCard({ ...MODELS.keypad, description: "Alarm keypad: PIN on a pixel screen, arm-mode keys with LEDs, hold to disarm." }, TeKeypad);
