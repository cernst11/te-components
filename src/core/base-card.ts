import { LitElement, type PropertyDeclarations, type PropertyValues } from "lit";
import type { BodyTheme, HomeAssistant } from "../types";
import { runAction, type ActionConfig } from "./actions";
import { feedback, feedbackMode, type FeedbackKind, type FeedbackMode } from "./feedback";

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
    runAction(this, this.hass, action, entityId, vars);
  }

  /** Haptic/sound cue if enabled for this card (config) or dashboard (theme); a no-op by default. */
  protected feedback(kind: FeedbackKind) {
    feedback(feedbackMode(this._config?.feedback) ?? this._themeFeedback ?? "off", kind);
  }
}
