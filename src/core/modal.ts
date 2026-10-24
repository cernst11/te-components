import { css, html, LitElement, unsafeCSS, type CSSResultGroup, type PropertyDeclarations, type TemplateResult } from "lit";
import { sharedStyles } from "../theme/shared";
import type { HomeAssistant } from "../types";
import { clamp01 } from "../utils/math";

/** Width of the dialog fader cap; the track maps 0..1 to the cap's travel. */
const CAP = 22;

/** Base for the light dialogs (CL-16, CT-27): backdrop, header with close, Escape, horizontal faders. */
export abstract class TeModal extends LitElement {
  static properties: PropertyDeclarations = {
    hass: { attribute: false },
    entity: {},
    heading: {},
  };

  declare hass?: HomeAssistant;
  declare entity: string;
  declare heading: string;

  constructor() {
    super();
    this.entity = "";
    this.heading = "";
  }

  close() {
    this.remove();
    this.dispatchEvent(new Event("closed"));
  }

  /** Open dialogs, topmost last: Escape closes only the top one (a CL-16 dialog opened inside a PP-3 popup). */
  private static stack: TeModal[] = [];

  private onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && TeModal.stack[TeModal.stack.length - 1] === this) {
      e.stopImmediatePropagation();
      this.close();
    }
  };

  connectedCallback() {
    super.connectedCallback();
    TeModal.stack.push(this);
    TeModal.syncPage();
    window.addEventListener("keydown", this.onKey);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    TeModal.stack = TeModal.stack.filter((m) => m !== this);
    TeModal.syncPage();
    window.removeEventListener("keydown", this.onKey);
  }

  /** Elements we made inert, and the page overflow we replaced, so closing restores exactly what was there. */
  private static inerted = new Set<Element>();
  private static savedOverflow?: string;

  /**
   * While any dialog is open, everything behind the topmost one is inert (no taps, no focus, hidden from
   * screen readers) and the page can't scroll.
   */
  private static syncPage() {
    const top = TeModal.stack[TeModal.stack.length - 1];
    for (const el of TeModal.inerted) (el as HTMLElement).inert = false;
    TeModal.inerted.clear();
    const root = document.documentElement;
    if (!top) {
      if (TeModal.savedOverflow !== undefined) root.style.overflow = TeModal.savedOverflow;
      TeModal.savedOverflow = undefined;
      return;
    }
    for (const el of Array.from(document.body.children)) {
      if (el === top || (el as HTMLElement).inert || el.tagName === "SCRIPT") continue;
      (el as HTMLElement).inert = true;
      TeModal.inerted.add(el);
    }
    if (TeModal.savedOverflow === undefined) {
      TeModal.savedOverflow = root.style.overflow;
      root.style.overflow = "hidden";
    }
  }

  /**
   * Scroll containment for wheel/touch: gestures on the backdrop never scroll the page, and inside the dialog
   * only scroll it while it has room (overscroll-behavior alone doesn't hold when the dialog isn't overflowing).
   */
  private touchY = 0;
  private blocks(target: EventTarget | null, dy: number): boolean {
    const dlg = this.renderRoot.querySelector(".dialog") as HTMLElement | null;
    if (!dlg || !(target instanceof Node) || !dlg.contains(target)) return true;
    // a horizontal fader drag is not a scroll
    if (target instanceof Element && target.closest(".track")) return false;
    const max = dlg.scrollHeight - dlg.clientHeight;
    if (max <= 0) return true;
    return (dy < 0 && dlg.scrollTop <= 0) || (dy > 0 && dlg.scrollTop >= max - 1);
  }

  private onWheel = (e: WheelEvent) => {
    if (this.blocks(e.composedPath()[0], e.deltaY)) e.preventDefault();
  };

  private onTouchStart = (e: TouchEvent) => {
    this.touchY = e.touches[0]?.clientY ?? 0;
  };

  private onTouchMove = (e: TouchEvent) => {
    const y = e.touches[0]?.clientY ?? this.touchY;
    const dy = this.touchY - y;
    this.touchY = y;
    if (e.cancelable && this.blocks(e.composedPath()[0], dy)) e.preventDefault();
  };

  protected firstUpdated() {
    const backdrop = this.renderRoot.querySelector(".backdrop") as HTMLElement;
    backdrop.addEventListener("wheel", this.onWheel, { passive: false });
    backdrop.addEventListener("touchstart", this.onTouchStart, { passive: true });
    backdrop.addEventListener("touchmove", this.onTouchMove, { passive: false });
    (this.renderRoot.querySelector(".close") as HTMLElement)?.focus();
  }

  protected turnOn(data: Record<string, unknown>) {
    this.hass?.callService("light", "turn_on", { entity_id: this.entity, ...data });
  }

  /**
   * Pointer handlers for a `.track` fader. Create once (as a field), not in render, so a drag survives re-renders.
   * `final` is true on release, for flushing throttled writes.
   */
  protected trackDrag(onFrac: (frac: number, final: boolean) => void) {
    let active = false;
    const at = (ev: PointerEvent, final: boolean) => {
      const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
      onFrac(clamp01((ev.clientX - rect.left - CAP / 2) / (rect.width - CAP)), final);
    };
    return {
      down: (ev: PointerEvent) => {
        (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
        active = true;
        at(ev, false);
      },
      move: (ev: PointerEvent) => active && at(ev, false),
      up: (ev: PointerEvent) => {
        if (!active) return;
        active = false;
        at(ev, true);
      },
    };
  }

  /** A labelled horizontal fader. `groove` is a CSS background for the slot. */
  protected fader(label: string, frac: number, groove: string, drag: ReturnType<TeModal["trackDrag"]>, readout = "") {
    return html`<div>
      <div class="fader-head"><span class="sublabel">${label}</span><span class="sublabel readout">${readout}</span></div>
      <div
        class="track"
        style="--b:${frac};--groove:${groove}"
        @pointerdown=${drag.down}
        @pointermove=${drag.move}
        @pointerup=${drag.up}
        @pointercancel=${drag.up}
      >
        <div class="groove"></div>
        <div class="cap"></div>
      </div>
    </div>`;
  }

  protected shell(body: TemplateResult) {
    return html`
      <div class="backdrop" @click=${(e: Event) => e.target === e.currentTarget && this.close()}>
        <div class="dialog" role="dialog" aria-modal="true" aria-label=${this.heading}>
          <header>
            <div class="label">${this.heading}</div>
            <button class="close" aria-label="close" @click=${() => this.close()}>&times;</button>
          </header>
          ${body}
        </div>
      </div>
    `;
  }

  static styles: CSSResultGroup = [
    sharedStyles,
    css`
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(0, 0, 0, 0.55);
        overscroll-behavior: contain;
        animation: fade 0.15s ease-out;
      }
      @keyframes fade {
        from {
          opacity: 0;
        }
      }
      .dialog {
        width: min(94vw, var(--dialog-w, 420px));
        max-height: 92vh;
        overflow-y: auto;
        overscroll-behavior: contain;
        display: flex;
        flex-direction: column;
        gap: 18px;
        padding: 20px;
        border-radius: var(--te-r-panel);
        background: var(--te-grain), var(--te-face), var(--te-body);
        background-blend-mode: overlay, normal, normal;
        box-shadow: var(--te-panel-shadow), 0 30px 60px rgba(0, 0, 0, 0.45);
      }
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .close {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        font-size: 16px;
        line-height: 1;
        background: var(--te-grain), var(--te-face), var(--te-key-light);
        background-blend-mode: overlay, normal, normal;
        box-shadow: var(--te-elev-1);
      }
      .close:active {
        box-shadow: var(--te-pressed);
      }
      .fader-head {
        display: flex;
        justify-content: space-between;
      }
      .track {
        position: relative;
        height: 34px;
        touch-action: none;
        cursor: ew-resize;
      }
      .groove {
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        height: 8px;
        margin-top: -4px;
        border-radius: 4px;
        background: var(--groove);
        box-shadow: var(--te-sunk-2);
      }
      .cap {
        position: absolute;
        top: 50%;
        width: ${unsafeCSS(CAP)}px;
        height: 30px;
        margin-top: -15px;
        border-radius: 6px;
        left: calc(var(--b) * (100% - ${unsafeCSS(CAP)}px));
        background: var(--te-grain), var(--te-face), var(--te-key-light);
        background-blend-mode: overlay, normal, normal;
        box-shadow: var(--te-elev-2);
      }
      .center {
        justify-content: center;
        margin-bottom: 8px;
      }
    `,
  ];
}
