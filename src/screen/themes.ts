export interface ScreenTheme {
  bg: string;
  /** Primary lit color (text). */
  fg: string;
  /** Secondary lit color (chips, progress). */
  fg2: string;
  glow: string;
  /** Glow blur in CSS px; 0 disables. */
  glowBlur: number;
  /** Alpha of unlit dots (VFD/LCD show ghost segments; OLED pixels are truly off). */
  ghost: number;
  /** Solid square pixels (OLED/LCD) vs. separated tall dots (VFD). */
  pixel: boolean;
  /** Overlay the VFD mesh grid. */
  mesh: boolean;
}

export const SCREEN_THEMES: Record<string, ScreenTheme> = {
  "vfd-amber": { bg: "#0d0f0c", fg: "#ffb020", fg2: "#ffb020", glow: "rgba(255,176,32,0.65)", glowBlur: 4.5, ghost: 0.05, pixel: false, mesh: true },
  "vfd-blue": { bg: "#0d0f0c", fg: "#90e0eb", fg2: "#90e0eb", glow: "rgba(144,224,235,0.6)", glowBlur: 4.5, ghost: 0.05, pixel: false, mesh: true },
  oled: { bg: "#000000", fg: "#f2f1ec", fg2: "#f2f1ec", glow: "rgba(255,255,255,0.25)", glowBlur: 1, ghost: 0, pixel: true, mesh: false },
  lcd: { bg: "#0b0b0b", fg: "#f2efe8", fg2: "#e8551d", glow: "rgba(232,85,29,0.35)", glowBlur: 0, ghost: 0.07, pixel: true, mesh: false },
};

export const SCREEN_NAMES = Object.keys(SCREEN_THEMES);
export const DEFAULT_SCREEN = "vfd-amber";
const ALIASES: Record<string, string> = { amber: "vfd-amber", blue: "vfd-blue" };

export function screenName(name?: string): string {
  const n = name ? (ALIASES[name] ?? name) : DEFAULT_SCREEN;
  return SCREEN_THEMES[n] ? n : DEFAULT_SCREEN;
}

export const screenTheme = (name?: string) => SCREEN_THEMES[screenName(name)];
