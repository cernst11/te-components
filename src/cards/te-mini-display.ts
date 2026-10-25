import { html } from "lit";
import { classMap } from "lit/directives/class-map.js";
import type { ActionConfig } from "../core/actions";
import { TeBaseCard, type BaseConfig } from "../core/base-card";
import { isToggleable, pickEntity } from "../core/entity";
import { F } from "../core/form";
import { HoldGesture } from "../core/hold";
import { displayAttribute } from "../core/value";
import { MODELS, registerCard } from "../registry";
import { ScreenController, type Frame } from "../screen/controller";
import { MINI_ICONS, drawMiniIcon, type MiniIcon } from "../screen/mini-icons";
import { applyMesh, clear, dotMetrics, drawLine, glyphHeight, newMarquee, pixelMetrics, StripCache, type Marquee } from "../screen/render";
import { screenName, screenTheme } from "../screen/themes";
import { screenStyles } from "../screen/styles";
import { sharedStyles } from "../theme/shared";
import type { HassEntity, HomeAssistant } from "../types";
import { toNumber } from "../utils/math";

interface MiniDisplayConfig extends BaseConfig {
  entity: string;
  /** `none` gives the text the whole screen (narrow mixer channels). */
  icon: MiniIcon | "none";
  attribute?: string;
  unit: string;
  decimals?: number;
  scroll: boolean;
  /** Two lines: small name above, large value below. */
  compact: boolean;
  /** false: value only (a mixer channel whose fader already carries the name). */
  show_name: boolean;
  screen: string;
  tap_action: ActionConfig;
  /** Lights default to the color/white dialog. */
  hold_action: ActionConfig;
}

const ICON_ZONE = 46;

/** DS-2 — small screen row: pixel icon + name/state. Pairs with a fader/knob in GR-2. */
export class TeMiniDisplay extends TeBaseCard<MiniDisplayConfig> {
  private screen = new ScreenController(this, (f) => this.draw(f));
  private strips = new StripCache();
  private marquees: Record<"line" | "name" | "value", Marquee> = { line: newMarquee(), name: newMarquee(), value: newMarquee() };
  private hold = new HoldGesture(this, {
    time: () => 500,
    enabled: () => this._config!.hold_action.action !== "none",
    onHold: () => this.run(this._config!.hold_action),
  });

  static styles = [sharedStyles, screenStyles];

  static getStubConfig(hass?: HomeAssistant) {
    return { entity: pickEntity(hass, ["light", "sensor", "switch"]), icon: "bulb", compact: true };
  }

  static getConfigForm() {
    return {
      schema: [
        F.entity(),
        F.text("label"),
        F.grid(F.select("icon", [...MINI_ICONS, "none"]), F.screen()),
        F.grid(F.bool("compact"), F.bool("scroll"), F.bool("show_name")),
        F.action("tap_action"),
        F.action("hold_action"),
        F.attribute(),
        F.grid(F.text("unit"), F.num("decimals", 1)),
        F.look(),
      ],
    };
  }

  protected normalizeConfig(c: Record<string, any>): MiniDisplayConfig {
    if (!c.entity) throw new Error("entity is required");
    return {
      ...c,
      type: c.type,
      entity: c.entity,
      icon: MINI_ICONS.includes(c.icon) || c.icon === "none" ? c.icon : "bulb",
      unit: c.unit ?? "",
      scroll: c.scroll === true,
      compact: c.compact === true,
      show_name: c.show_name !== false,
      screen: screenName(c.screen ?? c.theme),
      tap_action: c.tap_action ?? { action: isToggleable(c.entity) ? "toggle" : "more-info" },
      hold_action: c.hold_action ?? (c.entity.startsWith("light.") ? { action: "light-dialog" } : { action: "more-info" }),
      tile: c.tile === true,
    };
  }

  getGridOptions() {
    return { columns: 6, rows: 1, min_rows: 1 };
  }

  protected firstUpdated() {
    this.screen.attach(this.renderRoot.querySelector("canvas"));
  }

  private stateText(st: HassEntity): string {
    const c = this._config!;
    if (!c.attribute && st.state === "on" && typeof st.attributes.brightness === "number") {
      return `${Math.round((st.attributes.brightness / 255) * 100)}%`;
    }
    const attr = c.attribute ? displayAttribute(st, c.attribute) : undefined;
    const raw = attr ? attr.raw : st.state;
    const num = toNumber(raw);
    const unit = c.unit || (attr ? attr.unit : (st.attributes.unit_of_measurement ?? ""));
    return `${num !== undefined && c.decimals !== undefined ? num.toFixed(c.decimals) : raw}${unit}`;
  }

  private lines(): { name: string; value: string; lit: boolean } {
    const c = this._config!;
    const st = this.stateObj();
    if (!st) return { name: "----", value: "", lit: false };
    return {
      name: (c.label || st.attributes.friendly_name || c.entity).toUpperCase(),
      value: this.stateText(st).toUpperCase(),
      lit: isToggleable(c.entity) ? st.state === "on" : true,
    };
  }

  private line(key: "line" | "name" | "value", text: string, f: Frame, size: number, y: number, pixel: boolean) {
    const theme = screenTheme(this._config!.screen);
    if (this.marquees[key].text !== text) this.marquees[key] = newMarquee(text);
    const metrics = (sz: number) => (pixel ? pixelMetrics(sz, f.dpr) : dotMetrics(sz, f.dpr, theme));
    const x0 = (this._config!.icon === "none" ? 8 : ICON_ZONE) * f.dpr;
    const availW = f.w - x0 - (this._config!.icon === "none" ? 6 : 10) * f.dpr;
    const full = metrics(size);
    let m = full;
    let strip = this.strips.get(text, m, theme.fg, theme);
    // without a marquee, step the font down until the text fits (narrow screens), keeping it centred on its line
    for (let sz = size * 0.8; !pixel && !this._config!.scroll && strip.width > availW && sz >= 0.7; sz *= 0.8) {
      m = metrics(sz);
      strip = this.strips.get(text, m, theme.fg, theme);
    }
    drawLine(f.ctx, strip, {
      x0,
      y: y + (glyphHeight(full) - glyphHeight(m)) / 2,
      availW,
      align: "left",
      scroll: this._config!.scroll && !f.reducedMotion,
      marquee: this.marquees[key],
      dt: f.dt,
      m,
    });
    return glyphHeight(full);
  }

  private draw(f: Frame) {
    if (!this._config) return;
    const { ctx, h, dpr } = f;
    const theme = screenTheme(this._config.screen);
    const { name, value, lit } = this.lines();
    clear(ctx, theme);
    if (this._config.icon !== "none") drawMiniIcon(ctx, this._config.icon, (ICON_ZONE / 2) * dpr, h / 2, 28 * dpr, lit, theme);
    if (!this._config.show_name) {
      const m = dotMetrics(2, dpr, theme);
      this.line("value", value, f, 2, (h - glyphHeight(m)) / 2, false);
    } else if (this._config.compact) {
      const nameH = glyphHeight(pixelMetrics(1, dpr));
      const valueH = glyphHeight(dotMetrics(1.6, dpr, theme));
      const top = (h - nameH - valueH - 6 * dpr) / 2;
      this.line("name", name, f, 1, top, true);
      this.line("value", value, f, 1.6, top + nameH + 6 * dpr, false);
    } else {
      const m = dotMetrics(2, dpr, theme);
      this.line("line", value ? `${name}  ${value}` : name, f, 2, (h - glyphHeight(m)) / 2, false);
    }
    if (theme.mesh) applyMesh(ctx);
  }

  render() {
    const c = this._config!;
    const { name, value } = this.lines();
    const interactive = c.tap_action.action !== "none";
    return html`
      <div class="card ${classMap({ tile: !!c.tile })}" style="align-items:stretch">
        <div
          class="screen"
          style="height:64px;cursor:${interactive ? "pointer" : "default"};-webkit-touch-callout:none;user-select:none"
          role=${interactive ? "button" : "img"}
          tabindex=${interactive ? "0" : "-1"}
          aria-label=${`${name} ${value}`}
          @pointerdown=${this.hold.down}
          @pointerup=${this.hold.cancel}
          @pointerleave=${this.hold.cancel}
          @pointercancel=${this.hold.cancel}
          @contextmenu=${(e: Event) => e.preventDefault()}
          @click=${() => !this.hold.consumeClick() && this.run(c.tap_action)}
          @keydown=${(e: KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), this.run(c.tap_action))}
        >
          <canvas></canvas>
        </div>
      </div>
    `;
  }
}

registerCard({ ...MODELS.miniDisplay, description: "Compact screen row: pixel icon + name/state. Pair with a fader or knob via GR-2." }, TeMiniDisplay);
