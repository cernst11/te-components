export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed?: string;
  last_updated?: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: Record<string, unknown>,
  ): Promise<unknown>;
  /** WebSocket command (history, etc.). Present in real HA; optional in the playground mock. */
  callWS?<T = unknown>(msg: Record<string, unknown>): Promise<T>;
}

export type BodyTheme = "silver" | "black";
