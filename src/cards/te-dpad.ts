import { css, html } from "lit";
import { classMap } from "lit/directives/class-map.js";
import type { ActionConfig } from "../core/actions";
import { TeBaseCard, type BaseConfig } from "../core/base-card";
import { pickEntity } from "../core/entity";
import { F } from "../core/form";
import { MODELS, registerCard } from "../registry";
import { sharedStyles } from "../theme/shared";
import type { HomeAssistant } from "../types";

const DIRS = ["up", "down", "left", "right", "ok"] as const;
type Dir = (typeof DIRS)[number];

const DEFAULT_COMMANDS: Record<Dir, string> = {
  up: "DPAD_UP",
  down: "DPAD_DOWN",
  left: "DPAD_LEFT",
  right: "DPAD_RIGHT",
  ok: "DPAD_CENTER",
};

interface DpadConfig extends BaseConfig {
  entity: string;
  /** remote.send_command command per direction. */
  commands: Record<Dir, string>;
  /** Full action override per direction. */
  actions: Partial<Record<Dir, ActionConfig>>;
}

const ICONS: Record<Exclude<Dir, "ok">, string> = {
  up: "M7 14l5-5 5 5z",
  down: "M7 10l5 5 5-5z",
  left: "M14 7l-5 5 5 5z",
  right: "M10 7l5 5-5 5z",
};

/** DP-5 — cross pad that tilts toward the pressed direction, with a center OK. */
export class TeDpad extends TeBaseCard<DpadConfig> {
  static properties = { _pressed: { state: true } };
  declare _pressed: Dir | null;

  constructor() {
    super();
    this._pressed = null;
  }

  static styles = [
    sharedStyles,
    css`
      .pad {
        position: relative;
        width: 168px;
        height: 168px;
        display: grid;
        grid-template: repeat(3, 1fr) / repeat(3, 1fr);
        perspective: 500px;
      }
      .cross {
        position: absolute;
        inset: 0;
        transition: transform 0.08s ease-out;
        filter: drop-shadow(0 1px 1px var(--te-occl)) drop-shadow(0 6px 8px var(--te-cast));
      }
      .bar {
        position: absolute;
        border-radius: 14px;
        background: var(--te-grain), var(--te-face), var(--te-key-light);
        background-blend-mode: overlay, normal, normal;
        box-shadow: inset 0 1px 0 var(--te-hi), inset 0 -1px 0 var(--te-lo);
      }
      .bar.v {
        left: 33.3%;
        width: 33.4%;
        top: 0;
        bottom: 0;
      }
      .bar.h {
        top: 33.3%;
        height: 33.4%;
        left: 0;
        right: 0;
      }
      .p-up .cross { transform: rotateX(8deg); }
      .p-down .cross { transform: rotateX(-8deg); }
      .p-left .cross { transform: rotateY(-8deg); }
      .p-right .cross { transform: rotateY(8deg); }
      .dir {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--te-ink);
        border-radius: 14px;
      }
      .dir svg {
        width: 24px;
        height: 24px;
        opacity: 0.75;
      }
      .up { grid-area: 1 / 2; }
      .left { grid-area: 2 / 1; }
      .right { grid-area: 2 / 3; }
      .down { grid-area: 3 / 2; }
      .ok {
        grid-area: 2 / 2;
        z-index: 2;
        align-self: center;
        justify-self: center;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.06em;
        color: #fff;
        background: var(--te-grain), var(--te-face), var(--te-accent);
        background-blend-mode: overlay, normal, normal;
        box-shadow: var(--te-elev-1);
        transition: box-shadow 0.08s ease-out, transform 0.08s ease-out;
      }
      .ok:active {
        box-shadow: var(--te-pressed);
        transform: translateY(1px);
      }
    `,
  ];

  static getStubConfig(hass?: HomeAssistant) {
    return { entity: pickEntity(hass, ["remote"]), label: "NAV" };
  }

  static getConfigForm() {
    return { schema: [F.entity(["remote", "media_player"]), F.labels(), F.look()] };
  }

  protected normalizeConfig(c: Record<string, any>): DpadConfig {
    if (!c.entity && !c.actions) throw new Error("entity is required");
    return { ...c, type: c.type, entity: c.entity, commands: { ...DEFAULT_COMMANDS, ...c.commands }, actions: c.actions ?? {}, tile: c.tile === true };
  }

  protected watchedEntities() {
    return [];
  }

  getCardSize() {
    return 4;
  }

  getGridOptions() {
    return { columns: 6, rows: 4, min_rows: 4 };
  }

  private press(dir: Dir) {
    const c = this._config!;
    this.run(c.actions[dir] ?? { action: "perform-action", perform_action: "remote.send_command", data: { command: c.commands[dir] } });
  }

  private dirButton(dir: Exclude<Dir, "ok">) {
    const set = (v: Dir | null) => () => (this._pressed = v);
    return html`<button
      class="dir ${dir}"
      aria-label=${dir}
      @pointerdown=${set(dir)}
      @pointerup=${set(null)}
      @pointerleave=${set(null)}
      @pointercancel=${set(null)}
      @click=${() => this.press(dir)}
    >
      <svg viewBox="0 0 24 24"><path fill="currentColor" d=${ICONS[dir]} /></svg>
    </button>`;
  }

  render() {
    const c = this._config!;
    return html`
      <div class="card ${classMap({ tile: !!c.tile })}">
        <div class="label">${c.label ?? ""}</div>
        <div class="pad ${this._pressed ? `p-${this._pressed}` : ""}">
          <div class="cross"><div class="bar v"></div><div class="bar h"></div></div>
          ${this.dirButton("up")} ${this.dirButton("left")}
          <button class="ok" aria-label="ok" @click=${() => this.press("ok")}>OK</button>
          ${this.dirButton("right")} ${this.dirButton("down")}
        </div>
        <div class="sublabel">${c.sublabel ?? ""}</div>
      </div>
    `;
  }
}

registerCard({ ...MODELS.dpad, description: "Directional pad that sends remote commands." }, TeDpad);
