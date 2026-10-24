import { css } from "lit";
import { tokens } from "./tokens";

const base = css`
  :host {
    display: block;
    font-family: var(--te-font);
    color: var(--te-ink);
    -webkit-tap-highlight-color: transparent;
  }
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  .card {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 6px;
    border-radius: var(--te-r-tile);
  }
  .card.tile {
    background: var(--te-grain), var(--te-face), var(--te-body);
    background-blend-mode: overlay, normal, normal;
    box-shadow: var(--te-tile-edge);
  }
  .label,
  .sublabel {
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .label {
    font-size: 11px;
    font-weight: 600;
    line-height: 14px;
    color: var(--te-ink);
  }
  .sublabel {
    font-size: 10px;
    font-weight: 500;
    line-height: 13px;
    color: var(--te-ink-dim);
  }
  .label:empty,
  .sublabel:empty {
    display: none;
  }
  /* value controls keep their readout line even when empty, so the live value never shifts layout */
  .sublabel.readout,
  .sublabel.readout:empty {
    display: flex;
    min-height: 13px;
    font-variant-numeric: tabular-nums;
  }
  button {
    font: inherit;
    color: inherit;
    border: none;
    padding: 0;
    margin: 0;
    background: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  :focus {
    outline: none;
  }
  :focus-visible {
    outline: 2px solid var(--te-accent);
    outline-offset: 3px;
  }
  .led {
    flex: none;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--te-led-off);
    box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.25);
    transition: background 0.18s ease-out, box-shadow 0.18s ease-out;
  }
  .led.on {
    background: var(--te-accent);
    box-shadow: 0 0 5px var(--te-accent-glow);
    transition: none;
  }
  .screw {
    position: absolute;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #fff, #9a9890 70%, #6f6d66);
    box-shadow: 0 1px 0 var(--te-hi), inset 0 0 0 1px rgba(0, 0, 0, 0.18);
  }
  .socket {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }
  .socket.on {
    padding: 10px;
    background: var(--te-body-shade);
    box-shadow: var(--te-sunk-1);
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      transition-duration: 0s !important;
      animation: none !important;
    }
  }
`;

export const sharedStyles = [tokens, base];
