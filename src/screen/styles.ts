import { css } from "lit";

/** Sunk black-glass screen window with a diagonal sheen. */
export const screenStyles = css`
  .screen {
    position: relative;
    width: 100%;
    border-radius: 6px;
    overflow: hidden;
    background: var(--te-screen-bg);
    box-shadow: var(--te-sunk-2);
  }
  .screen canvas {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
  }
  .screen::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 28%, rgba(0, 0, 0, 0.03) 29%, rgba(0, 0, 0, 0.14) 70%, rgba(0, 0, 0, 0.4) 100%);
    mix-blend-mode: overlay;
    pointer-events: none;
  }
`;
