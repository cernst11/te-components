import { LitElement, type PropertyDeclarations, type PropertyValues } from "lit";
import type { BodyTheme, HomeAssistant } from "../types";
import { runAction, type ActionConfig } from "./actions";
import { feedback, feedbackMode, type FeedbackKind, type FeedbackMode } from "./feedback";
import { TeLightDialog, type LightDialogOptions } from "../cards/te-light-dialog";

export interface BaseConfig {
  type: string;
  entity?: string;
  label?: string;
  sublabel?: string;
  tile?: boolean;
  body?: BodyTheme;
  /** Haptic ticks / click sounds; also settable for the whole dashboard with the `te-feedback` theme variable. */
  feedback?: FeedbackMode;
}

/**
 * Shared Lovelace card plumbing: config lifecycle, body theme, hass diffing, actions.
 * Subclasses implement `normalizeConfig` (validate + fill defaults) and `render`.
 */
export abstract class TeBaseCard<C extends BaseConfig = BaseConfig> extends LitElement {
  static properties: PropertyDeclarations = {
    hass: { attribute: false },
    _config: { state: true },
  };

  declare hass?: HomeAssistant;
  declare _config?: C;
  private _themeBody?: string;
  private _themeFeedback?: FeedbackMode;
  private _dialog?: TeLightDialog;

  setConfig(config: Record<string, any>) {
    if (!config || typeof config !== "object") throw new Error("Invalid configuration");
    this._config = this.normalizeConfig(config);
  }

  protected abstract normalizeConfig(config: Record<string, any>): C;

  getCardSize(): number {
    return 2;
  }

  connectedCallback() {
    super.connectedCallback();
    // Global theme switch: set `te-theme: black` in an HA theme (or on a parent CH-1 panel).
    const style = getComputedStyle(this);
    this._themeBody = style.getPropertyValue("--te-theme").trim() || undefined;
    this._themeFeedback = feedbackMode(style.getPropertyValue("--te-feedback"));
    this.applyBody();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._dialog?.close();
  }

  protected willUpdate(changed: PropertyValues) {
    if (changed.has("_config")) this.applyBody();
  }

  private applyBody() {
    const body = this._config?.body ?? this._themeBody ?? "silver";
    if (this.dataset.body !== body) this.dataset.body = body;
  }

  /** Entities whose state changes should re-render this card. */
  protected watchedEntities(): string[] {
    return this._config?.entity ? [this._config.entity] : [];
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    if (!this._config) return false;
    // an open light dialog follows the live state even when this card itself skips the render
    if (this._dialog && changed.has("hass")) this._dialog.hass = this.hass;
    if (changed.size === 1 && changed.has("hass")) {
      const old = changed.get("hass") as HomeAssistant | undefined;
      if (!old || !this.hass) return true;
      return this.watchedEntities().some((id) => old.states[id] !== this.hass!.states[id]);
    }
    return true;
  }

  protected stateObj(entityId = this._config?.entity) {
    return entityId ? this.hass?.states[entityId] : undefined;
  }

  protected run(action: ActionConfig | undefined, entityId = this._config?.entity, vars?: Record<string, unknown>) {
    if (action && action.action !== "none") this.feedback("press");
    if (action?.action === "light-dialog") {
      const id = action.entity ?? entityId;
      if (id) this.openLightDialog({ entity: id, mode: action.mode });
      return;
    }
    runAction(this, this.hass, action, entityId, vars);
  }

  /** Opens the color/white dialog for a light (one per card); it closes with the card. */
  protected openLightDialog(opts: Omit<LightDialogOptions, "hass" | "heading" | "body"> & { heading?: string }) {
    if (!this.hass || this._dialog) return;
    const st = this.hass.states[opts.entity];
    this._dialog = TeLightDialog.open({
      ...opts,
      hass: this.hass,
      heading: opts.heading || this._config?.label || st?.attributes.friendly_name || opts.entity,
      body: (this.dataset.body as BodyTheme) ?? "silver",
    });
    this._dialog.addEventListener("closed", () => (this._dialog = undefined), { once: true });
  }

  /** Haptic/sound cue if enabled for this card (config) or dashboard (theme); a no-op by default. */
  protected feedback(kind: FeedbackKind) {
    feedback(feedbackMode(this._config?.feedback) ?? this._themeFeedback ?? "off", kind);
  }
}
