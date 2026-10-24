import { css, html, svg, unsafeCSS } from "lit";
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

/** One continuous plus-shape outline (168×168): rounded outer corners, filleted inner corners. */
const CROSS = "M70,0H98A14,14 0 0 1 112,14V48A8,8 0 0 0 120,56H154A14,14 0 0 1 168,70V98A14,14 0 0 1 154,112H120A8,8 0 0 0 112,120V154A14,14 0 0 1 98,168H70A14,14 0 0 1 56,154V120A8,8 0 0 0 48,112H14A14,14 0 0 1 0,98V70A14,14 0 0 1 14,56H48A8,8 0 0 0 56,48V14A14,14 0 0 1 70,0Z";

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
      .cross svg,
      .face {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }
      /* molded face: grain + light falloff, clipped to the one cross silhouette */
      .face {
        clip-path: path("${unsafeCSS(CROSS)}");
        background: var(--te-grain), var(--te-face), var(--te-key-light);
        background-blend-mode: overlay, normal, normal;
      }
      /* edge bevel on every up-facing (highlight) and down-facing (shade) edge of the outline */
      .hi {
        fill: var(--te-hi);
      }
      .lo {
        fill: var(--te-lo);
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
          <div class="cross">
            <div class="face"></div>
            <svg viewBox="0 0 168 168" aria-hidden="true">
              ${svg`<defs>
                <mask id="top"><path d=${CROSS} fill="#fff" /><path d=${CROSS} fill="#000" transform="translate(0 1.5)" /></mask>
                <mask id="bottom"><path d=${CROSS} fill="#fff" /><path d=${CROSS} fill="#000" transform="translate(0 -1.5)" /></mask>
              </defs>
              <rect class="hi" width="168" height="168" mask="url(#top)" />
              <rect class="lo" width="168" height="168" mask="url(#bottom)" />`}
            </svg>
          </div>
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
