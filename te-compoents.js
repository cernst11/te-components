const TE_CSS = `
  :host {
    --te-body: #e3e2de;
    --te-body-dark: #d0cfca;
    --te-panel-edge: #e4e2dc;
    --te-ink: #1c1c1a;
    --te-ink-dim: rgba(28,28,26,0.55);
    --te-orange: #e8551d;
    --te-white-cap: #f4f3ef;
    --te-black-cap: #232323;
    --te-grey-cap: #8b8a85;
    --te-navy: #2c3550;
    --te-tan: #c8925a;
    --te-radius: 20px;
    --te-font: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
    --te-shadow-out: 5px 5px 10px rgba(0,0,0,0.24), -3px -3px 6px rgba(255,255,255,0.4);
    --te-shadow-in: inset 3px 3px 7px rgba(0,0,0,0.28), inset -2px -2px 5px rgba(255,255,255,0.35);
    --te-shadow-out-accent: 5px 5px 10px rgba(180,60,10,0.35), -3px -3px 6px rgba(255,178,120,0.3);
    --te-shadow-in-accent: inset 3px 3px 7px rgba(120,40,0,0.4), inset -2px -2px 5px rgba(255,178,120,0.25);
    --te-grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0.45 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  .te-label {
    font-family: var(--te-font);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--te-ink);
  }
  .te-label-dim {
    font-family: var(--te-font);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--te-ink-dim);
  }
  .te-label.mc-hidden,
  .te-label-dim.mc-hidden {
    display: none;
  }
  .te-screw {
    position: absolute;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #fff, #9a9890 70%, #6f6d66);
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.15);
  }
  .te-socket {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }
  .te-socket.mc-socket {
    background: radial-gradient(circle at 40% 35%, var(--te-body-dark), #a9a69f 85%);
    box-shadow:
      inset 0 2px 6px rgba(0,0,0,0.35),
      inset 0 -1px 2px rgba(255,255,255,0.4),
      0 1px 0 rgba(255,255,255,0.5);
    padding: 12px;
  }
  ha-card.te-tile {
    background: var(--te-grain), var(--te-body);
    background-blend-mode: overlay;
    border-radius: 8px;
    box-shadow:
      inset 1px 1px 0 rgba(255,255,255,0.55),
      inset -1px -1px 0 rgba(0,0,0,0.16);
  }
`;

function teSetLabel(el, text) {
  el.textContent = text || "";
  el.classList.toggle("mc-hidden", !text);
}

function teScrewCorners() {
  return `
    <div class="te-screw" style="top:10px;left:10px;"></div>
    <div class="te-screw" style="top:10px;right:10px;"></div>
    <div class="te-screw" style="bottom:10px;left:10px;"></div>
    <div class="te-screw" style="bottom:10px;right:10px;"></div>
  `;
}

class TePanel extends HTMLElement {
  setConfig(config) {
    this._config = {
      title: config.title || "",
      subtitle: config.subtitle || "",
      caption: config.caption || "",
      cards: config.cards || [],
    };
    const makeCard = (cfg) => {
      const el = document.createElement("hui-card");
      el.config = cfg;
      return el;
    };
    this._rows = this._config.cards.map((entry) => (Array.isArray(entry) ? entry.map(makeCard) : [makeCard(entry)]));
    this._cardEls = this._rows.flat();
    if (!this._built) this._build();
  }

  getCardSize() {
    return 3 + this._cardEls.length * 3;
  }

  static getStubConfig() {
    return { type: "custom:te-panel", title: "K.O.", subtitle: "サンプラー", caption: "", cards: [] };
  }

  set hass(hass) {
    this._hass = hass;
    this._cardEls.forEach((el) => {
      el.hass = hass;
    });
  }

  _build() {
    this._built = true;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        ${TE_CSS}
        :host { display: block; }
        ha-card {
          position: relative;
          background: var(--te-grain), linear-gradient(180deg, var(--te-panel-edge), var(--te-body) 12%);
          background-blend-mode: overlay;
          border-radius: var(--te-radius);
          padding: 22px 20px 18px;
          box-shadow: 0 14px 28px rgba(0,0,0,0.28), inset 0 0 0 1px rgba(255,255,255,0.4);
          box-sizing: border-box;
        }
        .te-header {
          margin-bottom: 14px;
        }
        .te-title {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.01em;
        }
        .te-title .te-caption {
          font-size: 13px;
          font-weight: 500;
          color: var(--te-ink-dim);
          margin-left: 6px;
        }
        .te-subtitle {
          font-size: 13px;
          color: var(--te-orange);
          font-weight: 600;
          margin-top: 2px;
        }
        .te-body {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
        }
        .te-item {
          min-width: 0;
        }
        .te-row {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: 1fr;
          gap: 0;
        }
      </style>
      <ha-card>
        ${teScrewCorners()}
        <div class="te-header">
          <div class="te-title te-label">
            <span class="te-title-text"></span><span class="te-caption"></span>
          </div>
          <div class="te-subtitle"></div>
        </div>
        <div class="te-body"></div>
      </ha-card>
    `;
    const root = this.shadowRoot;
    root.querySelector(".te-title-text").textContent = this._config.title;
    root.querySelector(".te-caption").textContent = this._config.caption;
    root.querySelector(".te-subtitle").textContent = this._config.subtitle;
    const body = root.querySelector(".te-body");
    this._rows.forEach((row) => {
      const wrapItem = (el) => {
        const item = document.createElement("div");
        item.className = "te-item";
        item.appendChild(el);
        return item;
      };
      if (row.length === 1) {
        body.appendChild(wrapItem(row[0]));
      } else {
        const rowEl = document.createElement("div");
        rowEl.className = "te-row";
        row.forEach((el) => rowEl.appendChild(wrapItem(el)));
        body.appendChild(rowEl);
      }
    });
  }
}

customElements.define("te-panel", TePanel);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "te-panel",
  name: "TE Panel",
  description: "Teenage Engineering-styled panel shell that can hold other cards.",
  preview: false,
});

const TE_BRAND_ICONS = {
  jellyfin:
    "M12 .002C8.826.002-1.398 18.537.16 21.666c1.56 3.129 22.14 3.094 23.682 0C25.384 18.573 15.177 0 12 0zm7.76 18.949c-1.008 2.028-14.493 2.05-15.514 0C3.224 16.9 9.92 4.755 12.003 4.755c2.081 0 8.77 12.166 7.759 14.196zM12 9.198c-1.054 0-4.446 6.15-3.93 7.189.518 1.04 7.348 1.027 7.86 0 .511-1.027-2.874-7.19-3.93-7.19z",
};

function teIconMarkup(icon, size) {
  const px = size || 22;
  if (icon && TE_BRAND_ICONS[icon]) {
    return `<svg viewBox="0 0 24 24" width="${px}" height="${px}"><path fill="currentColor" d="${TE_BRAND_ICONS[icon]}"/></svg>`;
  }
  if (icon) return `<ha-icon icon="${icon}"></ha-icon>`;
  return "";
}

const TE_KNOB_CAPS = {
  orange: "radial-gradient(circle at 35% 30%, #ff7a3d, var(--te-orange) 70%)",
  white: "radial-gradient(circle at 35% 30%, #fff, var(--te-white-cap) 70%)",
  black: "radial-gradient(circle at 35% 30%, #4a4a4a, var(--te-black-cap) 70%)",
  grey: "radial-gradient(circle at 35% 30%, #a8a7a2, var(--te-grey-cap) 70%)",
  navy: "radial-gradient(circle at 35% 30%, #454f70, var(--te-navy) 70%)",
  tan: "radial-gradient(circle at 35% 30%, #dba876, var(--te-tan) 70%)",
};

class TeKnob extends HTMLElement {
  setConfig(config) {
    if (!config.entity) throw new Error("entity is required");
    this._config = {
      entity: config.entity,
      attribute: config.attribute || null,
      min: config.min ?? 0,
      max: config.max ?? 1,
      domain: config.domain || "homeassistant",
      service: config.service || "update_entity",
      value_key: config.value_key || config.attribute || "value",
      cap_color: TE_KNOB_CAPS[config.cap_color] ? config.cap_color : "grey",
      label: config.label || "",
      sublabel: config.sublabel || "",
      container: config.container === true,
      tile: config.tile === true,
    };
    if (!this._built) this._build();
    teSetLabel(this._el.label, this._config.label);
    teSetLabel(this._el.sublabel, this._config.sublabel);
    this._el.cap.style.background = `var(--te-grain), ${TE_KNOB_CAPS[this._config.cap_color]}`;
    this._el.socket.classList.toggle("mc-socket", this._config.container);
    this._el.card.classList.toggle("te-tile", this._config.tile);
  }

  getCardSize() {
    return 3;
  }

  static getStubConfig() {
    return {
      type: "custom:te-knob",
      entity: "",
      min: 0,
      max: 1,
      domain: "media_player",
      service: "volume_set",
      value_key: "volume_level",
      cap_color: "orange",
      label: "GAIN",
    };
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _valueFrac() {
    const cfg = this._config;
    const state = this._hass && this._hass.states[cfg.entity];
    if (!state) return 0;
    const raw = cfg.attribute ? state.attributes[cfg.attribute] : state.state;
    const num = Number(raw);
    if (isNaN(num)) return 0;
    return Math.max(0, Math.min(1, (num - cfg.min) / (cfg.max - cfg.min)));
  }

  _applyFrac(frac) {
    const deg = -135 + frac * 270;
    this._el.indicator.style.transform = `rotate(${deg}deg)`;
  }

  _render() {
    if (!this._built || !this._hass) return;
    if (this._dragging) return;
    this._applyFrac(this._valueFrac());
  }

  _build() {
    this._built = true;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        ${TE_CSS}
        :host { display: block; }
        ha-card {
          background: transparent;
          box-shadow: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 6px;
        }
        .te-knob-label { font-size: 12px; font-weight: 700; }
        .te-knob-cap {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          box-shadow: 0 6px 14px rgba(0,0,0,0.3), inset 0 0 0 2px rgba(255,255,255,0.25);
          background-blend-mode: overlay;
          position: relative;
          cursor: ns-resize;
          touch-action: none;
        }
        .te-knob-indicator {
          position: absolute;
          top: 6px;
          left: 50%;
          width: 3px;
          height: 16px;
          margin-left: -1.5px;
          border-radius: 2px;
          background: rgba(0,0,0,0.55);
          transform-origin: 1.5px 26px;
        }
        .te-knob-sublabel { font-size: 11px; }
      </style>
      <ha-card>
        <div class="te-knob-label te-label"></div>
        <div class="te-socket">
          <div class="te-knob-cap"><div class="te-knob-indicator"></div></div>
        </div>
        <div class="te-knob-sublabel te-label-dim"></div>
      </ha-card>
    `;
    const root = this.shadowRoot;
    this._el = {
      label: root.querySelector(".te-knob-label"),
      sublabel: root.querySelector(".te-knob-sublabel"),
      socket: root.querySelector(".te-socket"),
      card: root.querySelector("ha-card"),
      cap: root.querySelector(".te-knob-cap"),
      indicator: root.querySelector(".te-knob-indicator"),
    };
    this._bindDrag();
  }

  _bindDrag() {
    const DRAG_RANGE = 150;
    let startY = 0;
    let startFrac = 0;
    let lastSent = 0;

    const commit = (frac, force) => {
      const now = Date.now();
      if (!force && now - lastSent < 120) return;
      lastSent = now;
      const cfg = this._config;
      const value = cfg.min + frac * (cfg.max - cfg.min);
      this._hass.callService(cfg.domain, cfg.service, {
        entity_id: cfg.entity,
        [cfg.value_key]: value,
      });
    };

    this._el.cap.addEventListener("pointerdown", (ev) => {
      this._dragging = true;
      this._el.cap.setPointerCapture(ev.pointerId);
      startY = ev.clientY;
      startFrac = this._valueFrac();
    });
    this._el.cap.addEventListener("pointermove", (ev) => {
      if (!this._dragging) return;
      const frac = Math.max(0, Math.min(1, startFrac + (startY - ev.clientY) / DRAG_RANGE));
      this._applyFrac(frac);
      commit(frac, false);
    });
    const end = (ev) => {
      if (!this._dragging) return;
      this._dragging = false;
      const frac = Math.max(0, Math.min(1, startFrac + (startY - ev.clientY) / DRAG_RANGE));
      this._applyFrac(frac);
      commit(frac, true);
    };
    this._el.cap.addEventListener("pointerup", end);
    this._el.cap.addEventListener("pointercancel", end);
  }
}

customElements.define("te-knob", TeKnob);

window.customCards.push({
  type: "te-knob",
  name: "TE Knob",
  description: "Teenage Engineering-styled rotary knob, drag vertically to set a value.",
  preview: false,
});

class TeToggle extends HTMLElement {
  setConfig(config) {
    if (!config.entity) throw new Error("entity is required");
    const domain = config.entity.split(".")[0];
    this._config = {
      entity: config.entity,
      domain: config.domain || domain,
      service: config.service || "toggle",
      label: config.label || "",
      sublabel: config.sublabel || "",
      container: config.container === true,
      tile: config.tile === true,
    };
    if (!this._built) this._build();
    teSetLabel(this._el.label, this._config.label);
    teSetLabel(this._el.sublabel, this._config.sublabel);
    this._el.socket.classList.toggle("mc-socket", this._config.container);
    this._el.card.classList.toggle("te-tile", this._config.tile);
  }

  getCardSize() {
    return 2;
  }

  static getStubConfig() {
    return { type: "custom:te-toggle", entity: "", label: "FX" };
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this._built || !this._hass) return;
    const state = this._hass.states[this._config.entity];
    const on = !!(state && state.state === "on");
    this._el.btn.classList.toggle("mc-on", on);
  }

  _build() {
    this._built = true;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        ${TE_CSS}
        :host { display: block; }
        ha-card {
          background: transparent;
          box-shadow: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 6px;
        }
        .te-toggle-label { font-size: 12px; font-weight: 700; }
        .te-toggle-btn {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          background: var(--te-grain), linear-gradient(145deg, #f7f6f2, var(--te-body-dark));
          background-blend-mode: overlay;
          box-shadow: var(--te-shadow-out);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: box-shadow 0.12s ease-out;
        }
        .te-toggle-btn:active { box-shadow: var(--te-shadow-in); }
        .te-toggle-pill {
          width: 30px;
          height: 12px;
          border-radius: 6px;
          background: var(--te-black-cap);
          transition: background 0.2s ease, box-shadow 0.2s ease;
        }
        .te-toggle-btn.mc-on .te-toggle-pill {
          background: var(--te-orange);
          box-shadow: 0 0 8px rgba(232,85,29,0.8);
        }
        .te-toggle-sublabel { font-size: 11px; }
      </style>
      <ha-card>
        <div class="te-toggle-label te-label"></div>
        <div class="te-socket">
          <button class="te-toggle-btn"><div class="te-toggle-pill"></div></button>
        </div>
        <div class="te-toggle-sublabel te-label-dim"></div>
      </ha-card>
    `;
    const root = this.shadowRoot;
    this._el = {
      label: root.querySelector(".te-toggle-label"),
      sublabel: root.querySelector(".te-toggle-sublabel"),
      socket: root.querySelector(".te-socket"),
      card: root.querySelector("ha-card"),
      btn: root.querySelector(".te-toggle-btn"),
    };
    this._el.btn.addEventListener("click", () => {
      const cfg = this._config;
      this._hass.callService(cfg.domain, cfg.service, { entity_id: cfg.entity });
    });
  }
}

customElements.define("te-toggle", TeToggle);

window.customCards.push({
  type: "te-toggle",
  name: "TE Toggle",
  description: "Teenage Engineering-styled pill toggle button (TX-6 FX button look).",
  preview: false,
});

const TE_DISPLAY_THEMES = {
  amber: { fg: "#ffb020", glow: "rgba(255,176,32,0.65)" },
  blue: { fg: "#90e0eb", glow: "rgba(144,224,235,0.6)" },
};

const TE_VFD_FONT = {
  " ": [0x00, 0x00, 0x00, 0x00, 0x00],
  A: [0x7e, 0x11, 0x11, 0x11, 0x7e],
  B: [0x7f, 0x49, 0x49, 0x49, 0x36],
  C: [0x3e, 0x41, 0x41, 0x41, 0x22],
  D: [0x7f, 0x41, 0x41, 0x22, 0x1c],
  E: [0x7f, 0x49, 0x49, 0x49, 0x41],
  F: [0x7f, 0x09, 0x09, 0x09, 0x01],
  G: [0x3e, 0x41, 0x49, 0x49, 0x3a],
  H: [0x7f, 0x08, 0x08, 0x08, 0x7f],
  I: [0x00, 0x41, 0x7f, 0x41, 0x00],
  J: [0x20, 0x40, 0x41, 0x3f, 0x01],
  K: [0x7f, 0x08, 0x14, 0x22, 0x41],
  L: [0x7f, 0x40, 0x40, 0x40, 0x40],
  M: [0x7f, 0x02, 0x0c, 0x02, 0x7f],
  N: [0x7f, 0x04, 0x08, 0x10, 0x7f],
  O: [0x3e, 0x41, 0x41, 0x41, 0x3e],
  P: [0x7f, 0x09, 0x09, 0x09, 0x06],
  Q: [0x3e, 0x41, 0x51, 0x21, 0x5e],
  R: [0x7f, 0x09, 0x19, 0x29, 0x46],
  S: [0x46, 0x49, 0x49, 0x49, 0x31],
  T: [0x01, 0x01, 0x7f, 0x01, 0x01],
  U: [0x3f, 0x40, 0x40, 0x40, 0x3f],
  V: [0x1f, 0x20, 0x40, 0x20, 0x1f],
  W: [0x7f, 0x20, 0x18, 0x20, 0x7f],
  X: [0x63, 0x14, 0x08, 0x14, 0x63],
  Y: [0x07, 0x08, 0x70, 0x08, 0x07],
  Z: [0x61, 0x51, 0x49, 0x45, 0x43],
  0: [0x3e, 0x51, 0x49, 0x45, 0x3e],
  1: [0x00, 0x42, 0x7f, 0x40, 0x00],
  2: [0x42, 0x61, 0x51, 0x49, 0x46],
  3: [0x21, 0x41, 0x45, 0x4b, 0x31],
  4: [0x18, 0x14, 0x12, 0x7f, 0x10],
  5: [0x27, 0x45, 0x45, 0x45, 0x39],
  6: [0x3c, 0x4a, 0x49, 0x49, 0x30],
  7: [0x01, 0x71, 0x09, 0x05, 0x03],
  8: [0x36, 0x49, 0x49, 0x49, 0x36],
  9: [0x06, 0x49, 0x49, 0x29, 0x1e],
  ":": [0x00, 0x36, 0x36, 0x00, 0x00],
  ".": [0x00, 0x60, 0x60, 0x00, 0x00],
  ",": [0x00, 0x50, 0x30, 0x00, 0x00],
  "-": [0x08, 0x08, 0x08, 0x08, 0x08],
  _: [0x40, 0x40, 0x40, 0x40, 0x40],
  "/": [0x20, 0x10, 0x08, 0x04, 0x02],
  "+": [0x08, 0x08, 0x3e, 0x08, 0x08],
  "*": [0x2a, 0x1c, 0x3e, 0x1c, 0x2a],
  "(": [0x00, 0x1c, 0x22, 0x41, 0x00],
  ")": [0x00, 0x41, 0x22, 0x1c, 0x00],
  "[": [0x00, 0x7f, 0x41, 0x41, 0x00],
  "]": [0x00, 0x41, 0x41, 0x7f, 0x00],
  "?": [0x02, 0x01, 0x51, 0x09, 0x06],
  "!": [0x00, 0x00, 0x5f, 0x00, 0x00],
  "&": [0x36, 0x49, 0x55, 0x22, 0x50],
  "=": [0x24, 0x24, 0x24, 0x24, 0x24],
};

function teGetCharColumns(char) {
  const upper = (char || " ").toUpperCase();
  return TE_VFD_FONT[upper] || TE_VFD_FONT[" "];
}

function teIconLabel(cfg) {
  if (cfg.label) return cfg.label.toUpperCase();
  const raw = cfg.icon || "";
  return raw.replace(/^mdi:/, "").replace(/-/g, " ").toUpperCase();
}

function teNewMarqueeState() {
  return { offset: 0, pause: 1.4, stepAcc: 0 };
}

function teDrawVfdText(ctx, { text, scrollState, scroll, dpr, theme, x0, y, availW, dt, clipTop, clipHeight }) {
  const dotW = 2 * dpr;
  const dotH = 3 * dpr;
  const colGap = 1 * dpr;
  const rowGap = 1 * dpr;
  const charW = 5 * dotW + 4 * colGap;
  const charGap = 5 * dpr;
  const slotW = charW + charGap;
  const totalW = text.length * slotW;

  const drawChar = (ch, x) => {
    if (x + charW < x0 || x > x0 + availW) return;
    const cols = teGetCharColumns(ch);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let col = 0; col < 5; col++) {
      const cx = x + col * (dotW + colGap);
      for (let row = 0; row < 7; row++) {
        ctx.fillRect(cx, y + row * (dotH + rowGap), dotW, dotH);
      }
    }
    ctx.fillStyle = theme.fg;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 9 * dpr;
    for (let col = 0; col < 5; col++) {
      const byte = cols[col];
      const cx = x + col * (dotW + colGap);
      for (let row = 0; row < 7; row++) {
        if (byte & (1 << row)) {
          ctx.fillRect(cx, y + row * (dotH + rowGap), dotW, dotH);
        }
      }
    }
  };

  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, clipTop ?? 0, availW, clipHeight ?? ctx.canvas.height);
  ctx.clip();

  if (!scroll || totalW <= availW) {
    let x = x0 + Math.max(0, (availW - totalW) / 2);
    for (const ch of text) {
      drawChar(ch, x);
      x += slotW;
    }
  } else {
    if (scrollState.pause > 0) {
      scrollState.pause -= dt;
    } else {
      const step = dotW + colGap;
      const stepInterval = 0.08;
      scrollState.stepAcc += dt;
      while (scrollState.stepAcc >= stepInterval) {
        scrollState.stepAcc -= stepInterval;
        scrollState.offset -= step;
        if (scrollState.offset < -totalW) {
          scrollState.offset = 0;
          scrollState.pause = 1.4;
          scrollState.stepAcc = 0;
          break;
        }
      }
    }
    let x = x0 + scrollState.offset;
    for (const ch of text) {
      drawChar(ch, x);
      x += slotW;
    }
  }
  ctx.restore();
}

function teDrawVfdTextCompact(ctx, { text, scrollState, scroll, dpr, theme, x0, y, availW, dt, fontSize }) {
  const fs = fontSize || 13 * dpr;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, 0, availW, ctx.canvas.height);
  ctx.clip();

  ctx.font = `700 ${fs}px "Courier New", monospace`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = theme.fg;
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = fs * 0.45;

  const totalW = ctx.measureText(text).width;

  if (!scroll || totalW <= availW) {
    ctx.fillText(text, x0, y);
  } else {
    const gap = fs * 2.4;
    if (scrollState.pause > 0) {
      scrollState.pause -= dt;
    } else {
      scrollState.offset -= 40 * dpr * dt;
      if (scrollState.offset < -(totalW + gap)) {
        scrollState.offset = 0;
        scrollState.pause = 1.4;
      }
    }
    ctx.fillText(text, x0 + scrollState.offset, y);
  }
  ctx.restore();
}

const TE_MINI_ICONS = ["bulb", "lamp", "downlight", "thermometer", "droplet", "molecule", "plug", "battery", "blinds"];

function teDrawMiniIcon(ctx, kind, cx, cy, size, lit, theme) {
  ctx.save();
  ctx.fillStyle = lit ? theme.fg : "rgba(255,255,255,0.22)";
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = lit ? 6 : 0;

  if (kind === "lamp") {
    const shadeTopY = cy - size * 0.42;
    const shadeH = size * 0.32;
    const topW = size * 0.3;
    const botW = size * 0.54;
    ctx.beginPath();
    ctx.moveTo(cx - topW / 2, shadeTopY);
    ctx.lineTo(cx + topW / 2, shadeTopY);
    ctx.lineTo(cx + botW / 2, shadeTopY + shadeH);
    ctx.lineTo(cx - botW / 2, shadeTopY + shadeH);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - size * 0.035, shadeTopY + shadeH, size * 0.07, size * 0.32);
    ctx.beginPath();
    ctx.ellipse(cx, shadeTopY + shadeH + size * 0.34, size * 0.16, size * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "downlight") {
    const ringY = cy - size * 0.32;
    ctx.beginPath();
    ctx.ellipse(cx, ringY, size * 0.3, size * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    const coneH = size * 0.4;
    const topW = size * 0.5;
    const botW = size * 0.14;
    ctx.beginPath();
    ctx.moveTo(cx - topW / 2, ringY);
    ctx.lineTo(cx + topW / 2, ringY);
    ctx.lineTo(cx + botW / 2, ringY + coneH);
    ctx.lineTo(cx - botW / 2, ringY + coneH);
    ctx.closePath();
    ctx.fill();
  } else if (kind === "thermometer") {
    const tubeW = size * 0.14;
    const tubeH = size * 0.5;
    const tubeX = cx - tubeW / 2;
    const tubeY = cy - size * 0.42;
    ctx.fillRect(tubeX, tubeY, tubeW, tubeH);
    const bulbR = size * 0.16;
    ctx.beginPath();
    ctx.arc(cx, tubeY + tubeH + bulbR * 0.4, bulbR, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "droplet") {
    const r = size * 0.22;
    const topY = cy - size * 0.4;
    const botY = cy + size * 0.12;
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.bezierCurveTo(cx + r * 1.4, cy - size * 0.05, cx + r, botY, cx, botY);
    ctx.bezierCurveTo(cx - r, botY, cx - r * 1.4, cy - size * 0.05, cx, topY);
    ctx.closePath();
    ctx.fill();
  } else if (kind === "molecule") {
    const r1 = size * 0.14;
    const r2 = size * 0.1;
    const satellites = [
      [cx - size * 0.24, cy - size * 0.18],
      [cx + size * 0.26, cy - size * 0.12],
      [cx + size * 0.06, cy + size * 0.24],
    ];
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = Math.max(1, size * 0.04);
    ctx.beginPath();
    satellites.forEach(([sx, sy]) => {
      ctx.moveTo(cx, cy);
      ctx.lineTo(sx, sy);
    });
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r1, 0, Math.PI * 2);
    ctx.fill();
    satellites.forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, r2, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (kind === "plug") {
    const bodyW = size * 0.34;
    const bodyH = size * 0.3;
    ctx.fillRect(cx - bodyW / 2, cy - bodyH / 2, bodyW, bodyH);
    const prongW = size * 0.06;
    const prongH = size * 0.16;
    ctx.fillRect(cx - bodyW * 0.22, cy - bodyH / 2 - prongH, prongW, prongH);
    ctx.fillRect(cx + bodyW * 0.22 - prongW, cy - bodyH / 2 - prongH, prongW, prongH);
  } else if (kind === "battery") {
    const bodyW = size * 0.36;
    const bodyH = size * 0.5;
    const bx = cx - bodyW / 2;
    const by = cy - bodyH / 2 + size * 0.03;
    const nubW = size * 0.14;
    const nubH = size * 0.06;
    ctx.fillRect(cx - nubW / 2, by - nubH, nubW, nubH);
    ctx.fillRect(bx, by, bodyW, bodyH);
  } else if (kind === "blinds") {
    const w = size * 0.56;
    const h = size * 0.5;
    const x = cx - w / 2;
    const y = cy - h / 2;
    const slats = 4;
    const slatH = size * 0.05;
    const gap = (h - slatH) / slats;
    for (let i = 0; i <= slats; i++) {
      ctx.fillRect(x, y + i * gap, w, slatH);
    }
  } else {
    const r = size * 0.32;
    const gcy = cy - size * 0.08;
    ctx.beginPath();
    ctx.arc(cx, gcy, r, 0, Math.PI * 2);
    ctx.fill();
    const baseW = size * 0.3;
    const baseH = size * 0.2;
    ctx.fillRect(cx - baseW / 2, gcy + r * 0.55, baseW, baseH);
  }
  ctx.restore();
}

function teHsvToRgb(h, s, v) {
  s = Math.max(0, Math.min(100, s)) / 100;
  v = Math.max(0, Math.min(100, v)) / 100;
  const c = v * s;
  const hh = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hh < 1) [r, g, b] = [c, x, 0];
  else if (hh < 2) [r, g, b] = [x, c, 0];
  else if (hh < 3) [r, g, b] = [0, c, x];
  else if (hh < 4) [r, g, b] = [0, x, c];
  else if (hh < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = v - c;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function teRgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s * 100, max * 100];
}

function teRgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

function teHexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const TE_DEMO_TRACKS = [
  { text: "Jellyfin - Daft Punk - One More Time (Discovery Remaster)", duration: 19 },
  { text: "Spotify - Tame Impala - The Less I Know The Better", duration: 16 },
  { text: "YouTube - Vintage Synthesizer Repair Part 4 Of A Very Long Series", duration: 22 },
  { text: "Cast - Boards Of Canada - Roygbiv", duration: 14 },
];

class TeDisplay extends HTMLElement {
  setConfig(config) {
    if (!config.demo && !config.entity) throw new Error("entity is required");
    this._config = {
      entity: config.entity || null,
      attribute: config.attribute || null,
      unit: config.unit || "",
      decimals: config.decimals ?? null,
      theme: TE_DISPLAY_THEMES[config.theme] ? config.theme : "amber",
      label: config.label || "",
      progress: config.progress === true,
      icons: config.icons || [],
      tile: config.tile === true,
      demo: config.demo === true,
    };
    if (!this._built) this._build();
    teSetLabel(this._el.label, this._config.label);
    const theme = TE_DISPLAY_THEMES[this._config.theme];
    this._el.screen.style.setProperty("--te-display-fg", theme.fg);
    this._el.screen.style.setProperty("--te-display-glow", theme.glow);
    this._el.card.classList.toggle("te-tile", this._config.tile);
    this._buildIconState();
    if (this._config.demo) this._startDemo();
    this._render();
  }

  _buildIconState() {
    this._iconState = this._config.icons.map((cfg) => ({
      cfg,
      lit: false,
      text: cfg.number ? "-" : teIconLabel(cfg),
    }));
  }

  _renderIcons() {
    if (!this._iconState || !this._hass) return;
    this._iconState.forEach((entry) => {
      const { cfg } = entry;
      const state = this._hass.states[cfg.entity];
      if (cfg.number) {
        let text = "-";
        if (state) {
          const raw = cfg.attribute ? state.attributes[cfg.attribute] : state.state;
          const match = String(raw).match(/\d+/);
          text = match ? match[0] : "-";
        }
        entry.text = text;
        entry.lit = true;
      } else {
        let lit = false;
        if (state) {
          const raw = cfg.attribute ? state.attributes[cfg.attribute] : state.state;
          lit = raw === cfg.value;
        }
        entry.lit = lit;
      }
    });
  }

  getCardSize() {
    return 2;
  }

  static getStubConfig() {
    return { type: "custom:te-display", entity: "", label: "TEMP", theme: "amber" };
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  disconnectedCallback() {
    if (this._demoTimer) clearInterval(this._demoTimer);
    if (this._canvasRaf) cancelAnimationFrame(this._canvasRaf);
    if (this._resizeObserver) this._resizeObserver.disconnect();
  }

  _startDemo() {
    if (this._demoTimer) return;
    this._demoIdx = -1;
    this._advanceDemoTrack();
    this._demoTimer = setInterval(() => this._tickDemo(), 1000);
  }

  _advanceDemoTrack() {
    this._demoIdx = (this._demoIdx + 1) % TE_DEMO_TRACKS.length;
    const track = TE_DEMO_TRACKS[this._demoIdx];
    this._setCanvasText(track.text.toUpperCase());
    this._progress = { position: 0, duration: track.duration, updatedAt: Date.now(), playing: true };
    this._renderDemoIcons();
  }

  _renderDemoIcons() {
    if (!this._iconState || !this._iconState.length) return;
    const activeIdx = this._demoIdx % this._iconState.length;
    this._iconState.forEach((entry, i) => {
      if (entry.cfg.number) {
        entry.text = String((this._demoIdx + i) % 10);
        entry.lit = true;
      } else {
        entry.lit = i === activeIdx;
      }
    });
  }

  _tickDemo() {
    const p = this._progress;
    if (p) {
      const elapsed = p.position + (Date.now() - p.updatedAt) / 1000;
      if (elapsed >= p.duration) this._advanceDemoTrack();
    }
  }

  _setCanvasText(text) {
    if (text === this._canvasText) return;
    this._canvasText = text;
    this._marqueeState = teNewMarqueeState();
  }

  _render() {
    if (!this._built) return;
    if (this._config.demo) return;
    if (!this._hass) return;
    this._renderIcons();
    const state = this._hass.states[this._config.entity];
    if (!state) {
      this._setCanvasText("----");
      this._progress = null;
      return;
    }
    let raw = this._config.attribute ? state.attributes[this._config.attribute] : state.state;
    if (raw === undefined || raw === null || raw === "") {
      raw = state.attributes.app_name || state.state;
    }
    const num = Number(raw);
    let text;
    if (!isNaN(num) && this._config.decimals !== null) {
      text = num.toFixed(this._config.decimals);
    } else {
      text = String(raw);
    }
    this._setCanvasText(`${text}${this._config.unit}`.toUpperCase());

    if (this._config.progress) {
      const duration = state.attributes.media_duration;
      if (typeof duration === "number" && duration > 0) {
        this._progress = {
          position: state.attributes.media_position || 0,
          duration,
          updatedAt: state.attributes.media_position_updated_at
            ? Date.parse(state.attributes.media_position_updated_at)
            : Date.now(),
          playing: state.state === "playing",
        };
      } else {
        this._progress = null;
      }
    }
  }

  _build() {
    this._built = true;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        ${TE_CSS}
        :host { display: block; }
        ha-card {
          background: transparent;
          box-shadow: none;
          padding: 6px;
        }
        .te-display-label { font-size: 12px; font-weight: 700; margin-bottom: 6px; }
        .te-display-screen {
          position: relative;
          height: 92px;
          border-radius: 8px;
          overflow: hidden;
        }
        .te-display-canvas {
          position: absolute;
          inset: 0;
          display: block;
          width: 100%;
          height: 100%;
        }
        .te-display-screen-glass {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(255,255,255,0.07) 0%,
            rgba(255,255,255,0.02) 28%,
            rgba(0,0,0,0.03) 29%,
            rgba(0,0,0,0.14) 70%,
            rgba(0,0,0,0.4) 100%
          );
          mix-blend-mode: overlay;
          pointer-events: none;
          z-index: 6;
        }
      </style>
      <ha-card>
        <div class="te-display-label te-label"></div>
        <div class="te-display-screen">
          <canvas class="te-display-canvas"></canvas>
          <div class="te-display-screen-glass"></div>
        </div>
      </ha-card>
    `;
    const root = this.shadowRoot;
    this._el = {
      label: root.querySelector(".te-display-label"),
      screen: root.querySelector(".te-display-screen"),
      canvas: root.querySelector(".te-display-canvas"),
      card: root.querySelector("ha-card"),
    };
    this._canvasCtx = this._el.canvas.getContext("2d");
    this._marqueeState = teNewMarqueeState();
    this._resizeObserver = new ResizeObserver(() => this._resizeCanvas());
    this._resizeObserver.observe(this._el.screen);
    this._resizeCanvas();
    this._canvasRaf = requestAnimationFrame((t) => this._tickCanvas(t));
  }

  _resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this._el.screen.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (this._el.canvas.width !== w) this._el.canvas.width = w;
    if (this._el.canvas.height !== h) this._el.canvas.height = h;
  }

  _getMeshPattern(ctx) {
    if (this._meshPattern) return this._meshPattern;
    const patternCanvas = document.createElement("canvas");
    patternCanvas.width = 3;
    patternCanvas.height = 3;
    const pCtx = patternCanvas.getContext("2d");
    pCtx.fillStyle = "rgba(0,0,0,0.55)";
    pCtx.fillRect(0, 2, 3, 1);
    pCtx.fillRect(2, 0, 1, 3);
    this._meshPattern = ctx.createPattern(patternCanvas, "repeat");
    return this._meshPattern;
  }

  _drawIconStrip(ctx, w, dpr, theme) {
    if (!this._iconState || !this._iconState.length) return 0;
    const boxH = 16 * dpr;
    const padX = 6 * dpr;
    const gap = 5 * dpr;
    const topMargin = 10 * dpr;
    const rightMargin = 12 * dpr;
    ctx.font = `bold ${9 * dpr}px "Courier New", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const items = this._iconState.map((entry) => {
      const label = entry.cfg.number ? entry.text || "-" : entry.text;
      const textW = ctx.measureText(label).width;
      const boxW = entry.cfg.number ? Math.max(16 * dpr, textW + padX * 2) : textW + padX * 2;
      return { entry, label, boxW };
    });
    const totalW = items.reduce((sum, it) => sum + it.boxW, 0) + gap * (items.length - 1);
    let x = w - rightMargin - totalW;
    const y = topMargin;

    items.forEach(({ entry, label, boxW }) => {
      const on = entry.lit;
      ctx.lineWidth = 1.2 * dpr;
      ctx.shadowColor = theme.glow;
      ctx.shadowBlur = on ? 6 * dpr : 0;
      ctx.strokeStyle = on ? theme.fg : "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.roundRect(x, y, boxW, boxH, 3 * dpr);
      ctx.stroke();
      ctx.fillStyle = on ? theme.fg : "rgba(255,255,255,0.3)";
      ctx.fillText(label, x + boxW / 2, y + boxH / 2 + 0.5 * dpr);
      x += boxW + gap;
    });
    ctx.shadowBlur = 0;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    return topMargin + boxH;
  }

  _drawProgressBar(ctx, w, h, dpr, theme) {
    if (!this._config.progress) return 0;
    const barH = 8 * dpr;
    const bottomMargin = 12 * dpr;
    const sideMargin = 14 * dpr;
    const segCount = 28;
    const segGap = 3 * dpr;
    const barW = w - sideMargin * 2;
    const segW = barW / segCount - segGap;
    const y = h - bottomMargin - barH;

    let frac = 0;
    const p = this._progress;
    if (p) {
      let elapsed = p.position;
      if (p.playing) elapsed += (Date.now() - p.updatedAt) / 1000;
      elapsed = Math.max(0, Math.min(elapsed, p.duration));
      frac = p.duration > 0 ? elapsed / p.duration : 0;
    }
    const filled = Math.round(frac * segCount);

    for (let i = 0; i < segCount; i++) {
      const on = i < filled;
      ctx.shadowColor = theme.glow;
      ctx.shadowBlur = on ? 7 * dpr : 0;
      ctx.fillStyle = on ? theme.fg : "rgba(255,255,255,0.08)";
      ctx.fillRect(sideMargin + i * (segW + segGap), y, segW, barH);
    }
    ctx.shadowBlur = 0;
    return bottomMargin + barH;
  }

  _tickCanvas(now) {
    const ctx = this._canvasCtx;
    const canvas = this._el.canvas;
    const w = canvas.width;
    const h = canvas.height;
    const dt = Math.min(0.1, (now - (this._lastCanvasT || now)) / 1000);
    this._lastCanvasT = now;
    const dpr = window.devicePixelRatio || 1;

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#0d0f0c";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    const theme = TE_DISPLAY_THEMES[this._config.theme] || TE_DISPLAY_THEMES.amber;

    ctx.save();
    const topReserve = this._drawIconStrip(ctx, w, dpr, theme);
    const bottomReserve = this._drawProgressBar(ctx, w, h, dpr, theme);
    ctx.restore();

    const text = this._canvasText || "";
    const glyphH = 7 * (3 * dpr) + 6 * (1 * dpr);
    const startY = topReserve + (h - topReserve - bottomReserve - glyphH) / 2;
    const leftMargin = 14 * dpr;
    const rightMargin = 14 * dpr;
    const availW = w - leftMargin - rightMargin;

    teDrawVfdText(ctx, {
      text,
      scrollState: this._marqueeState,
      scroll: true,
      dpr,
      theme,
      x0: leftMargin,
      y: startY,
      availW,
      dt,
      clipTop: topReserve,
      clipHeight: h - topReserve - bottomReserve,
    });

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = this._getMeshPattern(ctx);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    this._canvasRaf = requestAnimationFrame((t) => this._tickCanvas(t));
  }
}

customElements.define("te-display", TeDisplay);

window.customCards.push({
  type: "te-display",
  name: "TE Display",
  description: "Teenage Engineering-styled monochrome dot-matrix readout.",
  preview: false,
});

class TeFader extends HTMLElement {
  setConfig(config) {
    if (!config.entity) throw new Error("entity is required");
    this._config = {
      entity: config.entity,
      attribute: config.attribute || null,
      min: config.min ?? 0,
      max: config.max ?? 1,
      domain: config.domain || "homeassistant",
      service: config.service || "update_entity",
      value_key: config.value_key || config.attribute || "value",
      sublabel: config.sublabel || "",
      dots: config.dots ?? 6,
      gradient: config.gradient || null,
      unit: config.unit || "",
      decimals: config.decimals ?? 0,
      tile: config.tile === true,
      toggle_domain: config.toggle_domain || config.entity.split(".")[0],
      toggle_service: config.toggle_service || "toggle",
      toggle_action: config.toggle_action || "toggle",
      orientation: config.orientation === "horizontal" ? "horizontal" : "vertical",
      show_sublabel: config.show_sublabel !== false,
    };
    if (!this._built) this._build();
    teSetLabel(this._el.sublabel, this._config.show_sublabel ? this._config.sublabel : "");
    this._el.trackBar.style.background = this._config.gradient ? `var(--te-grain), ${this._config.gradient}` : "";
    this._el.card.classList.toggle("te-tile", this._config.tile);
    this._el.card.classList.toggle("te-fader-horizontal", this._config.orientation === "horizontal");
    if (this._el.dotsEl.children.length !== this._config.dots) {
      this._el.dotsEl.innerHTML = "";
      this._el.dotEls = [];
      for (let i = 0; i < this._config.dots; i++) {
        const d = document.createElement("div");
        d.className = "te-fader-dot";
        this._el.dotsEl.appendChild(d);
        this._el.dotEls.push(d);
      }
    }
  }

  getCardSize() {
    return 4;
  }

  static getStubConfig() {
    return {
      type: "custom:te-fader",
      entity: "",
      min: 0,
      max: 255,
      domain: "light",
      service: "turn_on",
      value_key: "brightness",
      sublabel: "KITCHEN",
    };
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _valueFrac() {
    const cfg = this._config;
    const state = this._hass && this._hass.states[cfg.entity];
    if (!state) return 0;
    const raw = cfg.attribute ? state.attributes[cfg.attribute] : state.state;
    const num = Number(raw);
    if (isNaN(num)) return 0;
    return Math.max(0, Math.min(1, (num - cfg.min) / (cfg.max - cfg.min)));
  }

  _formatValue(frac) {
    const cfg = this._config;
    const value = cfg.min + frac * (cfg.max - cfg.min);
    return `${value.toFixed(cfg.decimals)}${cfg.unit}`;
  }

  _applyFrac(frac) {
    const trackRect = this._el.track.getBoundingClientRect();
    const capSize = 22;
    if (this._config.orientation === "horizontal") {
      const travel = Math.max(0, trackRect.width - capSize);
      this._el.cap.style.left = `${frac * travel}px`;
    } else {
      const travel = Math.max(0, trackRect.height - capSize);
      this._el.cap.style.top = `${(1 - frac) * travel}px`;
    }
    const lit = Math.round(frac * this._config.dots);
    this._el.dotEls.forEach((d, i) => {
      d.classList.toggle("mc-lit", this._config.dots - i <= lit);
    });
  }

  _render() {
    if (!this._built || !this._hass || this._dragging) return;
    this._applyFrac(this._valueFrac());
  }

  _build() {
    this._built = true;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        ${TE_CSS}
        :host { display: block; }
        ha-card {
          background: transparent;
          box-shadow: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 6px;
        }
        .te-fader-dots {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .te-fader-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgba(0,0,0,0.18);
        }
        .te-fader-dot.mc-lit {
          background: var(--te-orange);
          box-shadow: 0 0 4px rgba(232,85,29,0.7);
        }
        .te-fader-track-wrap {
          position: relative;
          width: 34px;
          height: 150px;
          touch-action: none;
        }
        .te-fader-track {
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 6px;
          margin-left: -3px;
          border-radius: 3px;
          background: var(--te-grain), linear-gradient(90deg, #0e0e0e, #2a2a2a 50%, #0e0e0e);
          background-blend-mode: overlay;
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4);
        }
        .te-fader-cap {
          position: absolute;
          left: 50%;
          width: 30px;
          height: 22px;
          margin-left: -15px;
          border-radius: 6px;
          background: var(--te-grain), radial-gradient(circle at 35% 30%, #f1f0ed, var(--te-body-dark) 75%);
          background-blend-mode: overlay;
          box-shadow: 0 4px 10px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.35);
          cursor: ns-resize;
        }
        .te-fader-cap::after {
          content: "";
          position: absolute;
          left: 4px;
          right: 4px;
          top: 50%;
          height: 2px;
          margin-top: -1px;
          background: rgba(0,0,0,0.5);
          border-radius: 1px;
        }
        .te-fader-sublabel {
          font-size: 11px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .te-fader-sublabel:active { background: rgba(0,0,0,0.1); }
        ha-card.te-fader-horizontal .te-fader-dots { flex-direction: row; }
        ha-card.te-fader-horizontal .te-fader-track-wrap {
          width: 100%;
          height: 34px;
        }
        ha-card.te-fader-horizontal .te-fader-track {
          left: 0;
          right: 0;
          top: 50%;
          bottom: auto;
          width: auto;
          height: 6px;
          margin-left: 0;
          margin-top: -3px;
          background: var(--te-grain), linear-gradient(180deg, #0e0e0e, #2a2a2a 50%, #0e0e0e);
          background-blend-mode: overlay;
        }
        ha-card.te-fader-horizontal .te-fader-cap {
          left: 0;
          top: 50%;
          width: 22px;
          height: 30px;
          margin-left: 0;
          margin-top: -15px;
          cursor: ew-resize;
        }
        ha-card.te-fader-horizontal .te-fader-cap::after {
          left: 50%;
          right: auto;
          top: 4px;
          bottom: 4px;
          height: auto;
          width: 2px;
          margin-top: 0;
          margin-left: -1px;
        }
      </style>
      <ha-card>
        <div class="te-fader-dots"></div>
        <div class="te-fader-track-wrap">
          <div class="te-fader-track"></div>
          <div class="te-fader-cap"></div>
        </div>
        <div class="te-fader-sublabel te-label-dim"></div>
      </ha-card>
    `;
    const root = this.shadowRoot;
    this._el = {
      sublabel: root.querySelector(".te-fader-sublabel"),
      dotsEl: root.querySelector(".te-fader-dots"),
      dotEls: [],
      track: root.querySelector(".te-fader-track-wrap"),
      trackBar: root.querySelector(".te-fader-track"),
      cap: root.querySelector(".te-fader-cap"),
      card: root.querySelector("ha-card"),
    };
    this._el.sublabel.addEventListener("click", () => {
      if (!this._hass) return;
      const cfg = this._config;
      if (cfg.toggle_action === "mute") {
        const state = this._hass.states[cfg.entity];
        const muted = !!(state && state.attributes.is_volume_muted);
        this._hass.callService("media_player", "volume_mute", { entity_id: cfg.entity, is_volume_muted: !muted });
        return;
      }
      this._hass.callService(cfg.toggle_domain, cfg.toggle_service, { entity_id: cfg.entity });
    });
    this._bindDrag();
  }

  _bindDrag() {
    const track = this._el.track;
    let dragging = false;
    let lastSent = 0;

    const setFromClient = (ev, commit) => {
      const rect = track.getBoundingClientRect();
      let frac =
        this._config.orientation === "horizontal"
          ? (ev.clientX - rect.left) / rect.width
          : 1 - (ev.clientY - rect.top) / rect.height;
      frac = Math.max(0, Math.min(1, frac));
      this._applyFrac(frac);
      if (this._config.show_sublabel) {
        this._el.sublabel.textContent = this._formatValue(frac);
        this._el.sublabel.classList.remove("mc-hidden");
      }
      const now = Date.now();
      if (commit || now - lastSent > 120) {
        lastSent = now;
        const cfg = this._config;
        const value = cfg.min + frac * (cfg.max - cfg.min);
        this._hass.callService(cfg.domain, cfg.service, {
          entity_id: cfg.entity,
          [cfg.value_key]: value,
        });
      }
    };

    track.addEventListener("pointerdown", (ev) => {
      dragging = true;
      this._dragging = true;
      track.setPointerCapture(ev.pointerId);
      setFromClient(ev, false);
    });
    track.addEventListener("pointermove", (ev) => {
      if (!dragging) return;
      setFromClient(ev, false);
    });
    const end = (ev) => {
      if (!dragging) return;
      dragging = false;
      this._dragging = false;
      setFromClient(ev, true);
      teSetLabel(this._el.sublabel, this._config.show_sublabel ? this._config.sublabel : "");
    };
    track.addEventListener("pointerup", end);
    track.addEventListener("pointercancel", end);
  }
}

customElements.define("te-fader", TeFader);

window.customCards.push({
  type: "te-fader",
  name: "TE Fader",
  description: "Teenage Engineering-styled vertical fader with LED tick dots.",
  preview: false,
});

class TeDial extends HTMLElement {
  setConfig(config) {
    if (!config.entity) throw new Error("entity is required");
    this._config = {
      entity: config.entity,
      attribute: config.attribute || null,
      min: config.min ?? 0,
      max: config.max ?? 1,
      domain: config.domain || "homeassistant",
      service: config.service || "update_entity",
      value_key: config.value_key || config.attribute || "value",
      label: config.label || "",
      sublabel: config.sublabel || "",
      theme: TE_DISPLAY_THEMES[config.theme] ? config.theme : "amber",
      unit: config.unit || "",
      decimals: config.decimals ?? 1,
      tile: config.tile === true,
    };
    if (!this._built) this._build();
    teSetLabel(this._el.label, this._config.label);
    teSetLabel(this._el.sublabel, this._config.sublabel);
    const theme = TE_DISPLAY_THEMES[this._config.theme];
    this._el.hubScreen.style.setProperty("--te-display-fg", theme.fg);
    this._el.hubScreen.style.setProperty("--te-display-glow", theme.glow);
    this._el.card.classList.toggle("te-tile", this._config.tile);
    this._render();
  }

  getCardSize() {
    return 5;
  }

  static getStubConfig() {
    return {
      type: "custom:te-dial",
      entity: "",
      min: 15,
      max: 25,
      domain: "climate",
      service: "set_temperature",
      value_key: "temperature",
      label: "TP-7",
      unit: "°",
    };
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _valueFrac() {
    const cfg = this._config;
    const state = this._hass && this._hass.states[cfg.entity];
    if (!state) return 0;
    const raw = cfg.attribute ? state.attributes[cfg.attribute] : state.state;
    const num = Number(raw);
    if (isNaN(num)) return 0;
    return Math.max(0, Math.min(1, (num - cfg.min) / (cfg.max - cfg.min)));
  }

  _applyFrac(frac) {
    const deg = -135 + frac * 270;
    this._el.needle.style.transform = `translate(-50%, -100%) rotate(${deg}deg)`;
  }

  _render() {
    if (!this._built || !this._hass) return;
    const cfg = this._config;
    const state = this._hass.states[cfg.entity];
    if (state) {
      const raw = cfg.attribute ? state.attributes[cfg.attribute] : state.state;
      const num = Number(raw);
      this._el.hubValue.textContent = isNaN(num) ? String(raw) : `${num.toFixed(cfg.decimals)}${cfg.unit}`;
    } else {
      this._el.hubValue.textContent = "----";
    }
    if (this._dragging) return;
    this._applyFrac(this._valueFrac());
  }

  _build() {
    this._built = true;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        ${TE_CSS}
        :host { display: block; }
        ha-card {
          background: transparent;
          box-shadow: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 6px;
        }
        .te-dial-label { font-size: 12px; font-weight: 700; }
        .te-dial-wheel {
          position: relative;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          background: var(--te-grain), radial-gradient(circle at 32% 28%, #f7f6f2, var(--te-body) 60%, var(--te-body-dark) 100%);
          background-blend-mode: overlay;
          box-shadow: 0 10px 24px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.5);
          cursor: grab;
          touch-action: none;
        }
        .te-dial-needle {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 2px;
          height: 78px;
          background: linear-gradient(rgba(28,28,26,0.55), rgba(28,28,26,0.15));
          transform-origin: 50% 100%;
        }
        .te-dial-hub {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 76px;
          height: 76px;
          margin: -38px 0 0 -38px;
          border-radius: 50%;
          background: var(--te-grain), var(--te-body-dark);
          background-blend-mode: overlay;
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          box-sizing: border-box;
        }
        .te-dial-hub-screen {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background:
            radial-gradient(rgba(0,0,0,0.45) 1px, transparent 1px),
            #0d0f0c;
          background-size: 3px 3px, auto;
          box-shadow: inset 0 2px 6px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .te-dial-hub-value {
          font-family: "Courier New", monospace;
          font-weight: 700;
          font-size: 15px;
          color: var(--te-display-fg, #ffb020);
          text-shadow: 0 0 5px var(--te-display-glow, rgba(255,176,32,0.65));
        }
        .te-dial-sublabel { font-size: 11px; }
      </style>
      <ha-card>
        <div class="te-dial-label te-label"></div>
        <div class="te-dial-wheel">
          <div class="te-dial-needle"></div>
          <div class="te-dial-hub">
            <div class="te-dial-hub-screen"><div class="te-dial-hub-value">----</div></div>
          </div>
        </div>
        <div class="te-dial-sublabel te-label-dim"></div>
      </ha-card>
    `;
    const root = this.shadowRoot;
    this._el = {
      label: root.querySelector(".te-dial-label"),
      sublabel: root.querySelector(".te-dial-sublabel"),
      wheel: root.querySelector(".te-dial-wheel"),
      needle: root.querySelector(".te-dial-needle"),
      hubScreen: root.querySelector(".te-dial-hub-screen"),
      hubValue: root.querySelector(".te-dial-hub-value"),
      card: root.querySelector("ha-card"),
    };
    this._bindDrag();
  }

  _angleFrac(clientX, clientY) {
    const rect = this._el.wheel.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    let deg = Math.atan2(dx, -dy) * (180 / Math.PI);
    if (deg > 135 && deg <= 180) deg = 135;
    if (deg < -135 && deg >= -180) deg = -135;
    return Math.max(0, Math.min(1, (deg + 135) / 270));
  }

  _bindDrag() {
    const wheel = this._el.wheel;
    let dragging = false;
    let lastSent = 0;

    const update = (clientX, clientY, commit) => {
      const frac = this._angleFrac(clientX, clientY);
      this._applyFrac(frac);
      const cfg = this._config;
      const value = cfg.min + frac * (cfg.max - cfg.min);
      this._el.hubValue.textContent = `${value.toFixed(cfg.decimals)}${cfg.unit}`;
      const now = Date.now();
      if (commit || now - lastSent > 120) {
        lastSent = now;
        this._hass.callService(cfg.domain, cfg.service, {
          entity_id: cfg.entity,
          [cfg.value_key]: value,
        });
      }
    };

    wheel.addEventListener("pointerdown", (ev) => {
      dragging = true;
      this._dragging = true;
      wheel.setPointerCapture(ev.pointerId);
      update(ev.clientX, ev.clientY, false);
    });
    wheel.addEventListener("pointermove", (ev) => {
      if (!dragging) return;
      update(ev.clientX, ev.clientY, false);
    });
    const end = (ev) => {
      if (!dragging) return;
      dragging = false;
      this._dragging = false;
      update(ev.clientX, ev.clientY, true);
    };
    wheel.addEventListener("pointerup", end);
    wheel.addEventListener("pointercancel", end);
  }
}

customElements.define("te-dial", TeDial);

window.customCards.push({
  type: "te-dial",
  name: "TE Dial",
  description: "Teenage Engineering-styled TP-7 scrub wheel, drag around the center to set a value.",
  preview: false,
});

class TeButton extends HTMLElement {
  setConfig(config) {
    this._config = {
      domain: config.domain || null,
      service: config.service || null,
      entity: config.entity || null,
      data: config.data || {},
      action: config.action || "service",
      hold_ms: config.hold_ms || 0,
      shape: config.shape === "square" ? "square" : "round",
      icon: config.icon || null,
      glyph: config.glyph || "",
      accent: config.accent === true,
      label: config.label || "",
      sublabel: config.sublabel || "",
      active_entity: config.active_entity || config.entity || null,
      active_attribute: config.active_attribute || null,
      active_value: config.active_value ?? null,
      tile: config.tile === true,
    };
    if (!this._built) this._build();
    teSetLabel(this._el.label, this._config.label);
    teSetLabel(this._el.sublabel, this._config.sublabel);
    this._el.text.innerHTML = this._config.icon ? teIconMarkup(this._config.icon) : this._config.glyph;
    this._el.btn.classList.toggle("te-btn-square", this._config.shape === "square");
    this._el.card.classList.toggle("te-tile", this._config.tile);
    this._render();
  }

  _render() {
    if (!this._built) return;
    let active = this._config.accent;
    if (!active && this._config.active_value !== null && this._hass) {
      const state = this._hass.states[this._config.active_entity];
      if (state) {
        const raw = this._config.active_attribute ? state.attributes[this._config.active_attribute] : state.state;
        active = raw === this._config.active_value;
      }
    }
    this._el.btn.classList.toggle("te-btn-accent", active);
  }

  getCardSize() {
    return 2;
  }

  static getStubConfig() {
    return {
      type: "custom:te-button",
      label: "BACK",
      icon: "mdi:arrow-left",
      domain: "remote",
      service: "send_command",
      entity: "",
      data: { command: "BACK" },
    };
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _fire() {
    const cfg = this._config;
    if (!this._hass) return;
    if (cfg.action === "cycle_source" && cfg.entity) {
      const state = this._hass.states[cfg.entity];
      const list = (state && state.attributes.source_list) || [];
      if (list.length === 0) return;
      const idx = list.indexOf(state.attributes.source);
      const next = list[(idx + 1) % list.length];
      this._hass.callService("media_player", "select_source", { entity_id: cfg.entity, source: next });
      return;
    }
    if (!cfg.domain || !cfg.service) return;
    const data = { ...cfg.data };
    if (cfg.entity) data.entity_id = cfg.entity;
    this._hass.callService(cfg.domain, cfg.service, data);
  }

  _build() {
    this._built = true;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        ${TE_CSS}
        :host { display: block; }
        ha-card {
          background: transparent;
          box-shadow: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 6px;
        }
        .te-btn-label { font-size: 12px; font-weight: 700; }
        .te-btn {
          position: relative;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          background: var(--te-grain), linear-gradient(145deg, #f7f6f2, var(--te-body-dark));
          background-blend-mode: overlay;
          box-shadow: var(--te-shadow-out);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          color: var(--te-ink);
          overflow: hidden;
          touch-action: none;
          transition: box-shadow 0.12s ease-out;
        }
        .te-btn:active { box-shadow: var(--te-shadow-in); }
        .te-btn.te-btn-square { border-radius: 16px; }
        .te-btn.te-btn-accent {
          background: var(--te-grain), linear-gradient(145deg, #ff8a52, var(--te-orange));
          background-blend-mode: overlay;
          color: #fff;
          box-shadow: var(--te-shadow-out-accent);
        }
        .te-btn.te-btn-accent:active { box-shadow: var(--te-shadow-in-accent); }
        .te-btn-text { display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
        .te-btn-text ha-icon { width: 22px; height: 22px; }
        .te-btn-fill {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: rgba(232,85,29,0.55);
          transform: scale(0);
          transition: transform 0.15s ease-out;
          pointer-events: none;
        }
        .te-btn.mc-holding .te-btn-fill {
          transition: transform var(--hold-ms, 1000ms) linear;
          transform: scale(1);
        }
        .te-btn-sublabel { font-size: 11px; }
      </style>
      <ha-card>
        <div class="te-btn-label te-label"></div>
        <button class="te-btn"><div class="te-btn-fill"></div><span class="te-btn-text"></span></button>
        <div class="te-btn-sublabel te-label-dim"></div>
      </ha-card>
    `;
    const root = this.shadowRoot;
    this._el = {
      label: root.querySelector(".te-btn-label"),
      sublabel: root.querySelector(".te-btn-sublabel"),
      btn: root.querySelector(".te-btn"),
      text: root.querySelector(".te-btn-text"),
      card: root.querySelector("ha-card"),
    };
    this._bindPress();
  }

  _bindPress() {
    const btn = this._el.btn;
    let timer = null;

    const cancelHold = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      btn.classList.remove("mc-holding");
    };

    btn.addEventListener("pointerdown", (ev) => {
      const hold = this._config.hold_ms || 0;
      if (hold <= 0) return;
      btn.style.setProperty("--hold-ms", `${hold}ms`);
      btn.classList.add("mc-holding");
      btn.setPointerCapture(ev.pointerId);
      timer = setTimeout(() => {
        timer = null;
        btn.classList.remove("mc-holding");
        this._fire();
      }, hold);
    });
    btn.addEventListener("pointerup", () => {
      const hold = this._config.hold_ms || 0;
      if (hold > 0) {
        cancelHold();
      } else {
        this._fire();
      }
    });
    btn.addEventListener("pointercancel", cancelHold);
    btn.addEventListener("pointerleave", () => {
      if ((this._config.hold_ms || 0) > 0) cancelHold();
    });
  }
}

customElements.define("te-button", TeButton);

window.customCards.push({
  type: "te-button",
  name: "TE Button",
  description: "Teenage Engineering-styled momentary press button (round or square), optional hold-to-confirm.",
  preview: false,
});

class TeDpad extends HTMLElement {
  setConfig(config) {
    if (!config.entity) throw new Error("entity is required");
    this._config = { entity: config.entity, label: config.label || "", tile: config.tile === true };
    if (!this._built) this._build();
    teSetLabel(this._el.label, this._config.label);
    this._el.card.classList.toggle("te-tile", this._config.tile);
  }

  getCardSize() {
    return 4;
  }

  static getStubConfig() {
    return { type: "custom:te-dpad", entity: "", label: "NAV" };
  }

  set hass(hass) {
    this._hass = hass;
  }

  _send(cmd) {
    if (!this._hass) return;
    this._hass.callService("remote", "send_command", { entity_id: this._config.entity, command: cmd });
  }

  _build() {
    this._built = true;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        ${TE_CSS}
        :host { display: block; }
        ha-card {
          background: transparent;
          box-shadow: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 6px;
        }
        .te-dpad-label { font-size: 12px; font-weight: 700; }
        .te-dpad {
          position: relative;
          width: 168px;
          height: 168px;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          grid-template-rows: 1fr 1fr 1fr;
        }
        .te-dpad-cross {
          position: absolute;
          inset: 0;
          filter:
            drop-shadow(5px 5px 8px rgba(0,0,0,0.24))
            drop-shadow(-3px -3px 5px rgba(255,255,255,0.4));
        }
        .te-dpad-bar {
          position: absolute;
          background: var(--te-grain), linear-gradient(145deg, #f7f6f2, var(--te-body-dark));
          background-blend-mode: overlay;
        }
        .te-dpad-bar-v { left: 56px; top: 0; width: 56px; height: 168px; border-radius: 28px; }
        .te-dpad-bar-h { left: 0; top: 56px; width: 168px; height: 56px; border-radius: 28px; }
        .te-dpad-btn {
          position: relative;
          z-index: 1;
          border: none;
          background: transparent;
          color: var(--te-ink);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .te-dpad-btn:active { box-shadow: var(--te-shadow-in); }
        .te-dpad-btn.mc-boost {
          box-shadow: 7px 7px 13px rgba(0,0,0,0.3), -4px -4px 10px rgba(255,255,255,0.55);
          transition: box-shadow 0.1s ease-out;
        }
        .te-dpad-up { grid-column: 2; grid-row: 1; border-radius: 28px 28px 0 0; }
        .te-dpad-left { grid-column: 1; grid-row: 2; border-radius: 28px 0 0 28px; }
        .te-dpad-right { grid-column: 3; grid-row: 2; border-radius: 0 28px 28px 0; }
        .te-dpad-down { grid-column: 2; grid-row: 3; border-radius: 0 0 28px 28px; }
        .te-dpad-ok {
          grid-column: 2;
          grid-row: 2;
          border-radius: 50%;
          background: var(--te-grain), linear-gradient(145deg, #ff8a52, var(--te-orange));
          background-blend-mode: overlay;
          color: #fff;
          font-weight: 700;
          font-size: 12px;
          box-shadow: var(--te-shadow-in-accent);
        }
        .te-dpad-ok:active { filter: brightness(0.94); }
      </style>
      <ha-card>
        <div class="te-dpad-label te-label"></div>
        <div class="te-dpad">
          <div class="te-dpad-cross">
            <div class="te-dpad-bar te-dpad-bar-v"></div>
            <div class="te-dpad-bar te-dpad-bar-h"></div>
          </div>
          <button class="te-dpad-btn te-dpad-up" data-cmd="DPAD_UP"><ha-icon icon="mdi:chevron-up"></ha-icon></button>
          <button class="te-dpad-btn te-dpad-left" data-cmd="DPAD_LEFT"><ha-icon icon="mdi:chevron-left"></ha-icon></button>
          <button class="te-dpad-btn te-dpad-ok" data-cmd="DPAD_CENTER">OK</button>
          <button class="te-dpad-btn te-dpad-right" data-cmd="DPAD_RIGHT"><ha-icon icon="mdi:chevron-right"></ha-icon></button>
          <button class="te-dpad-btn te-dpad-down" data-cmd="DPAD_DOWN"><ha-icon icon="mdi:chevron-down"></ha-icon></button>
        </div>
      </ha-card>
    `;
    const root = this.shadowRoot;
    this._el = {
      label: root.querySelector(".te-dpad-label"),
      card: root.querySelector("ha-card"),
    };
    root.querySelectorAll("[data-cmd]").forEach((btn) => {
      btn.addEventListener("click", () => this._send(btn.dataset.cmd));
    });

    const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };
    const dirButtons = {
      up: root.querySelector(".te-dpad-up"),
      down: root.querySelector(".te-dpad-down"),
      left: root.querySelector(".te-dpad-left"),
      right: root.querySelector(".te-dpad-right"),
    };
    Object.entries(dirButtons).forEach(([dir, btn]) => {
      const opposite = dirButtons[OPPOSITE[dir]];
      if (!btn || !opposite) return;
      const boost = () => opposite.classList.add("mc-boost");
      const unboost = () => opposite.classList.remove("mc-boost");
      btn.addEventListener("pointerdown", boost);
      btn.addEventListener("pointerup", unboost);
      btn.addEventListener("pointercancel", unboost);
      btn.addEventListener("pointerleave", unboost);
    });
  }
}

customElements.define("te-dpad", TeDpad);

window.customCards.push({
  type: "te-dpad",
  name: "TE D-Pad",
  description: "Teenage Engineering-styled directional pad for remote navigation.",
  preview: false,
});

class TeGroup extends HTMLElement {
  setConfig(config) {
    this._config = {
      cards: config.cards || [],
      direction: config.direction === "column" ? "column" : "row",
      tile: config.tile !== false,
      gap: config.gap ?? 12,
    };
    this._cardEls = this._config.cards.map((cfg) => {
      const el = document.createElement("hui-card");
      el.config = cfg;
      return el;
    });
    if (!this._built) this._build();
    this._el.card.classList.toggle("te-tile", this._config.tile);
    this._el.inner.style.flexDirection = this._config.direction;
    this._el.inner.style.gap = `${this._config.gap}px`;
    this._el.inner.innerHTML = "";
    this._cardEls.forEach((el) => this._el.inner.appendChild(el));
  }

  getCardSize() {
    return 2 + this._cardEls.length * 2;
  }

  static getStubConfig() {
    return { type: "custom:te-group", direction: "row", tile: true, cards: [] };
  }

  set hass(hass) {
    this._hass = hass;
    this._cardEls.forEach((el) => {
      el.hass = hass;
    });
  }

  _build() {
    this._built = true;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        ${TE_CSS}
        :host { display: block; }
        ha-card {
          background: transparent;
          box-shadow: none;
          padding: 0;
        }
        .te-group-inner {
          display: flex;
          align-items: stretch;
          justify-content: center;
          padding: 8px;
        }
        .te-group-inner > * {
          flex: 1;
          min-width: 0;
        }
      </style>
      <ha-card>
        <div class="te-group-inner"></div>
      </ha-card>
    `;
    const root = this.shadowRoot;
    this._el = {
      card: root.querySelector("ha-card"),
      inner: root.querySelector(".te-group-inner"),
    };
  }
}

customElements.define("te-group", TeGroup);

window.customCards.push({
  type: "te-group",
  name: "TE Group",
  description: "Groups multiple TE components so they share one tile edge instead of each having their own.",
  preview: false,
});

class TeColorPicker extends HTMLElement {
  setConfig(config) {
    if (!config.entity) throw new Error("entity is required");
    this._config = {
      entity: config.entity,
      label: config.label || "",
      sublabel: config.sublabel || "",
      tile: config.tile === true,
      slots: (config.slots || []).slice(0, 3),
    };
    if (!this._built) this._build();
    teSetLabel(this._el.label, this._config.label);
    teSetLabel(this._el.sublabel, this._config.sublabel);
    this._el.card.classList.toggle("te-tile", this._config.tile);
    this._render();
  }

  getCardSize() {
    return 3;
  }

  static getStubConfig() {
    return { type: "custom:te-color-picker", entity: "", label: "COLOR", slots: [] };
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
    if (this._modalOpen) this._renderModalState();
  }

  disconnectedCallback() {
    this._closeModal();
  }

  _lightColor() {
    const state = this._hass && this._hass.states[this._config.entity];
    if (!state || state.state !== "on") return null;
    let hs = state.attributes.hs_color;
    if (!hs && state.attributes.rgb_color) {
      const [h, s] = teRgbToHsv(...state.attributes.rgb_color);
      hs = [h, s];
    }
    if (!hs) return null;
    const brightness = state.attributes.brightness;
    return { hs, brightness: brightness == null ? 255 : brightness };
  }

  _render() {
    if (!this._built) return;
    const color = this._lightColor();
    if (color) {
      const [r, g, b] = teHsvToRgb(color.hs[0], color.hs[1], 100);
      this._el.swatch.style.background = `var(--te-grain), rgb(${r},${g},${b})`;
    } else {
      this._el.swatch.style.background = "";
    }
  }

  _build() {
    this._built = true;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        ${TE_CSS}
        :host { display: block; }
        ha-card {
          background: transparent;
          box-shadow: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 6px;
        }
        .te-cp-label { font-size: 12px; font-weight: 700; }
        .te-cp-swatch {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          padding: 0;
          background: var(--te-grain), radial-gradient(circle at 32% 28%, #f7f6f2, var(--te-body-dark) 75%);
          background-blend-mode: overlay;
          box-shadow: var(--te-shadow-out);
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: box-shadow 0.12s ease-out;
        }
        .te-cp-swatch:active { box-shadow: var(--te-shadow-in); }
        .te-cp-sublabel { font-size: 11px; }
      </style>
      <ha-card>
        <div class="te-cp-label te-label"></div>
        <button class="te-cp-swatch"></button>
        <div class="te-cp-sublabel te-label-dim"></div>
      </ha-card>
    `;
    const root = this.shadowRoot;
    this._el = {
      label: root.querySelector(".te-cp-label"),
      sublabel: root.querySelector(".te-cp-sublabel"),
      swatch: root.querySelector(".te-cp-swatch"),
      card: root.querySelector("ha-card"),
    };
    this._el.swatch.addEventListener("click", () => this._openModal());
  }

  _openModal() {
    if (!this._hass) return;
    if (!this._modalBuilt) this._buildModal();
    document.body.appendChild(this._modalHost);
    this._modalOpen = true;

    const color = this._lightColor();
    this._hs = color ? color.hs : [30, 60];
    this._updatePuck();
    this._updateBrightColor();
    const brightFrac = color ? color.brightness / 255 : 1;
    this._applyBrightFrac(brightFrac);

    const state = this._hass.states[this._config.entity];
    this._modalEl.title.textContent =
      (state && state.attributes.friendly_name) || this._config.label || "COLOR";

    this._renderModalState();
    requestAnimationFrame(() => this._modalEl.backdrop.classList.add("mc-open"));

    this._escHandler = (ev) => {
      if (ev.key === "Escape") this._closeModal();
    };
    window.addEventListener("keydown", this._escHandler);
  }

  _closeModal() {
    this._modalOpen = false;
    if (this._escHandler) window.removeEventListener("keydown", this._escHandler);
    if (this._modalHost && this._modalHost.parentNode) {
      this._modalHost.parentNode.removeChild(this._modalHost);
    }
  }

  _renderModalState() {
    if (!this._slotEls) return;
    this._slotEls.forEach(({ entityId, btn }) => {
      const state = entityId && this._hass.states[entityId];
      const rgb = state && teHexToRgb(state.state);
      btn.style.background = rgb ? `var(--te-grain), rgb(${rgb.join(",")})` : "";
    });
  }

  _updatePuck() {
    const [h, s] = this._hs;
    const rad = (h * Math.PI) / 180;
    const frac = s / 100;
    const nx = Math.sin(rad) * frac;
    const ny = -Math.cos(rad) * frac;
    this._modalEl.puck.style.left = `${50 + nx * 50}%`;
    this._modalEl.puck.style.top = `${50 + ny * 50}%`;
  }

  _updateBrightColor() {
    const [r, g, b] = teHsvToRgb(this._hs[0], this._hs[1], 100);
    this._modalEl.brightTrackWrap.style.setProperty("--te-cp-color", `rgb(${r},${g},${b})`);
  }

  _applyBrightFrac(frac) {
    const trackRect = this._modalEl.brightTrackWrap.getBoundingClientRect();
    const capSize = 22;
    const travel = Math.max(0, trackRect.width - capSize);
    this._modalEl.brightCap.style.left = `${frac * travel}px`;
  }

  _renderWheelImage() {
    const canvas = this._modalEl.wheelCanvas;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2;
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx + 0.5;
        const dy = y - cy + 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * w + x) * 4;
        if (dist > radius) {
          img.data[idx + 3] = 0;
          continue;
        }
        const angle = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
        const sat = Math.min(100, (dist / radius) * 100);
        const [r, g, b] = teHsvToRgb(angle, sat, 100);
        img.data[idx] = r;
        img.data[idx + 1] = g;
        img.data[idx + 2] = b;
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  _bindWheel() {
    const wrap = this._modalEl.wheelWrap;
    let dragging = false;
    let lastSent = 0;
    const update = (ev, force) => {
      const rect = wrap.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const radius = rect.width / 2;
      let dx = ev.clientX - cx;
      let dy = ev.clientY - cy;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) {
        dx = (dx * radius) / dist;
        dy = (dy * radius) / dist;
        dist = radius;
      }
      const angle = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
      const sat = Math.min(100, (dist / radius) * 100);
      this._hs = [angle, sat];
      this._updatePuck();
      this._updateBrightColor();
      const now = Date.now();
      if (force || now - lastSent > 120) {
        lastSent = now;
        this._hass.callService("light", "turn_on", {
          entity_id: this._config.entity,
          hs_color: this._hs,
        });
      }
    };
    wrap.addEventListener("pointerdown", (ev) => {
      dragging = true;
      wrap.setPointerCapture(ev.pointerId);
      update(ev, false);
    });
    wrap.addEventListener("pointermove", (ev) => {
      if (dragging) update(ev, false);
    });
    const end = (ev) => {
      if (!dragging) return;
      dragging = false;
      update(ev, true);
    };
    wrap.addEventListener("pointerup", end);
    wrap.addEventListener("pointercancel", end);
  }

  _bindBrightness() {
    const track = this._modalEl.brightTrackWrap;
    let dragging = false;
    let lastSent = 0;
    const update = (ev, force) => {
      const rect = track.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      this._applyBrightFrac(frac);
      const now = Date.now();
      if (force || now - lastSent > 120) {
        lastSent = now;
        this._hass.callService("light", "turn_on", {
          entity_id: this._config.entity,
          brightness_pct: Math.round(frac * 100),
        });
      }
    };
    track.addEventListener("pointerdown", (ev) => {
      dragging = true;
      track.setPointerCapture(ev.pointerId);
      update(ev, false);
    });
    track.addEventListener("pointermove", (ev) => {
      if (dragging) update(ev, false);
    });
    const end = (ev) => {
      if (!dragging) return;
      dragging = false;
      update(ev, true);
    };
    track.addEventListener("pointerup", end);
    track.addEventListener("pointercancel", end);
  }

  _saveSlot(entityId, btn) {
    const [r, g, b] = teHsvToRgb(this._hs[0], this._hs[1], 100);
    const hex = teRgbToHex([r, g, b]);
    this._hass.callService("input_text", "set_value", { entity_id: entityId, value: hex });
    btn.style.background = `var(--te-grain), ${hex}`;
  }

  _recallSlot(entityId) {
    const state = this._hass.states[entityId];
    const rgb = state && teHexToRgb(state.state);
    if (!rgb) return;
    const [h, s] = teRgbToHsv(...rgb);
    this._hs = [h, s];
    this._updatePuck();
    this._updateBrightColor();
    this._hass.callService("light", "turn_on", {
      entity_id: this._config.entity,
      hs_color: this._hs,
    });
  }

  _bindSlot(btn, entityId) {
    const HOLD_MS = 650;
    let timer = null;
    const cancelHold = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      btn.classList.remove("mc-holding");
    };
    btn.addEventListener("pointerdown", (ev) => {
      if (!entityId) return;
      btn.style.setProperty("--hold-ms", `${HOLD_MS}ms`);
      btn.classList.add("mc-holding");
      btn.setPointerCapture(ev.pointerId);
      timer = setTimeout(() => {
        timer = null;
        btn.classList.remove("mc-holding");
        this._saveSlot(entityId, btn);
      }, HOLD_MS);
    });
    btn.addEventListener("pointerup", () => {
      if (!entityId) return;
      if (timer) {
        cancelHold();
        this._recallSlot(entityId);
      }
    });
    btn.addEventListener("pointercancel", cancelHold);
    btn.addEventListener("pointerleave", cancelHold);
  }

  _buildSlots() {
    const container = this._modalEl.slots;
    container.innerHTML = "";
    this._slotEls = this._config.slots.map((entityId) => {
      const btn = document.createElement("button");
      btn.className = "te-cpm-slot";
      btn.innerHTML = `<div class="te-cpm-slot-fill"></div>`;
      container.appendChild(btn);
      this._bindSlot(btn, entityId);
      return { entityId, btn };
    });
  }

  _buildModal() {
    this._modalBuilt = true;
    const host = document.createElement("div");
    host.attachShadow({ mode: "open" });
    host.shadowRoot.innerHTML = `
      <style>
        ${TE_CSS}
        .te-cpm-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          box-sizing: border-box;
          z-index: 9999;
          opacity: 0;
          transition: opacity 0.15s ease-out;
        }
        .te-cpm-backdrop.mc-open { opacity: 1; }
        .te-cpm-dialog {
          width: min(94vw, 440px);
          max-height: 92vh;
          overflow-y: auto;
          box-sizing: border-box;
          background: var(--te-grain), linear-gradient(180deg, var(--te-panel-edge), var(--te-body) 12%);
          background-blend-mode: overlay;
          border-radius: var(--te-radius);
          box-shadow: var(--te-shadow-out), 0 30px 60px rgba(0,0,0,0.5);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          font-family: var(--te-font);
        }
        .te-cpm-header { display: flex; align-items: center; justify-content: space-between; }
        .te-cpm-title {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--te-ink);
        }
        .te-cpm-close {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: none;
          background: var(--te-grain), linear-gradient(145deg, #f7f6f2, var(--te-body-dark));
          background-blend-mode: overlay;
          box-shadow: var(--te-shadow-out);
          color: var(--te-ink);
          font-size: 16px;
          line-height: 1;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .te-cpm-close:active { box-shadow: var(--te-shadow-in); }
        .te-cpm-wheel-wrap {
          width: min(70vw, 260px);
          height: min(70vw, 260px);
          margin: 0 auto;
          position: relative;
          border-radius: 50%;
          box-shadow: var(--te-shadow-in);
          touch-action: none;
          cursor: pointer;
        }
        .te-cpm-wheel { width: 100%; height: 100%; border-radius: 50%; display: block; }
        .te-cpm-puck {
          position: absolute;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid #fff;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.45);
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        .te-cpm-bright-label { font-size: 11px; margin-bottom: 6px; }
        .te-cpm-bright-track-wrap {
          position: relative;
          width: 100%;
          height: 34px;
          touch-action: none;
        }
        .te-cpm-bright-groove {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 6px;
          margin-top: -3px;
          border-radius: 3px;
          background: var(--te-grain), linear-gradient(90deg, #0e0e0e, var(--te-cp-color, var(--te-orange)));
          background-blend-mode: overlay;
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4);
        }
        .te-cpm-bright-cap {
          position: absolute;
          top: 50%;
          width: 22px;
          height: 30px;
          margin-top: -15px;
          border-radius: 6px;
          background: var(--te-grain), var(--te-cp-color, var(--te-orange));
          background-blend-mode: overlay;
          box-shadow: 0 4px 10px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.35);
          cursor: ew-resize;
        }
        .te-cpm-bright-cap::after {
          content: "";
          position: absolute;
          top: 4px;
          bottom: 4px;
          left: 50%;
          width: 2px;
          margin-left: -1px;
          background: rgba(0,0,0,0.5);
          border-radius: 1px;
        }
        .te-cpm-slots-label { font-size: 11px; text-align: center; }
        .te-cpm-slots { display: flex; justify-content: center; gap: 16px; }
        .te-cpm-slot {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          background: var(--te-grain), var(--te-body);
          background-blend-mode: overlay;
          box-shadow: var(--te-shadow-out);
          cursor: pointer;
          overflow: hidden;
          -webkit-tap-highlight-color: transparent;
          touch-action: none;
        }
        .te-cpm-slot:active { box-shadow: var(--te-shadow-in); }
        .te-cpm-slot-fill {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: rgba(255,255,255,0.55);
          transform: scale(0);
          pointer-events: none;
        }
        .te-cpm-slot.mc-holding .te-cpm-slot-fill {
          transition: transform var(--hold-ms, 650ms) linear;
          transform: scale(1);
        }
      </style>
      <div class="te-cpm-backdrop">
        <div class="te-cpm-dialog">
          <div class="te-cpm-header">
            <div class="te-cpm-title"></div>
            <button class="te-cpm-close">&times;</button>
          </div>
          <div class="te-cpm-wheel-wrap">
            <canvas class="te-cpm-wheel" width="200" height="200"></canvas>
            <div class="te-cpm-puck"></div>
          </div>
          <div>
            <div class="te-cpm-bright-label te-label-dim">BRIGHTNESS</div>
            <div class="te-cpm-bright-track-wrap">
              <div class="te-cpm-bright-groove"></div>
              <div class="te-cpm-bright-cap"></div>
            </div>
          </div>
          <div>
            <div class="te-cpm-slots-label te-label-dim">SAVE</div>
            <div class="te-cpm-slots"></div>
          </div>
        </div>
      </div>
    `;
    const root = host.shadowRoot;
    this._modalHost = host;
    this._modalEl = {
      backdrop: root.querySelector(".te-cpm-backdrop"),
      dialog: root.querySelector(".te-cpm-dialog"),
      title: root.querySelector(".te-cpm-title"),
      close: root.querySelector(".te-cpm-close"),
      wheelWrap: root.querySelector(".te-cpm-wheel-wrap"),
      wheelCanvas: root.querySelector(".te-cpm-wheel"),
      puck: root.querySelector(".te-cpm-puck"),
      brightTrackWrap: root.querySelector(".te-cpm-bright-track-wrap"),
      brightCap: root.querySelector(".te-cpm-bright-cap"),
      slots: root.querySelector(".te-cpm-slots"),
    };
    this._renderWheelImage();
    this._modalEl.close.addEventListener("click", () => this._closeModal());
    this._modalEl.backdrop.addEventListener("click", (ev) => {
      if (ev.target === this._modalEl.backdrop) this._closeModal();
    });
    this._bindWheel();
    this._bindBrightness();
    this._buildSlots();
  }
}

customElements.define("te-color-picker", TeColorPicker);

window.customCards.push({
  type: "te-color-picker",
  name: "TE Color Picker",
  description: "Teenage Engineering-styled light color picker: HS wheel + brightness in a modal, with 3 hold-to-save color slots.",
  preview: false,
});

class TeMiniDisplay extends HTMLElement {
  setConfig(config) {
    if (!config.entity) throw new Error("entity is required");
    this._config = {
      entity: config.entity,
      label: config.label || "",
      icon: TE_MINI_ICONS.includes(config.icon) ? config.icon : "bulb",
      attribute: config.attribute || null,
      unit: config.unit || "",
      decimals: config.decimals ?? null,
      scroll: config.scroll === true,
      theme: TE_DISPLAY_THEMES[config.theme] ? config.theme : "amber",
      tile: config.tile === true,
      readonly: config.readonly === true,
      compact: config.compact === true,
      toggle_domain: config.toggle_domain || config.entity.split(".")[0],
      toggle_service: config.toggle_service || "toggle",
    };
    if (!this._built) this._build();
    const theme = TE_DISPLAY_THEMES[this._config.theme];
    this._el.screen.style.setProperty("--te-display-fg", theme.fg);
    this._el.screen.style.setProperty("--te-display-glow", theme.glow);
    this._el.card.classList.toggle("te-tile", this._config.tile);
    this._el.canvas.classList.toggle("te-md-readonly", this._config.readonly);
    this._render();
  }

  getCardSize() {
    return 2;
  }

  static getStubConfig() {
    return { type: "custom:te-mini-display", entity: "", theme: "amber" };
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  disconnectedCallback() {
    if (this._canvasRaf) cancelAnimationFrame(this._canvasRaf);
    if (this._resizeObserver) this._resizeObserver.disconnect();
  }

  _stateText(state) {
    const cfg = this._config;
    if (!cfg.attribute && state.state === "on" && typeof state.attributes.brightness === "number") {
      return `${Math.round((state.attributes.brightness / 255) * 100)}%`;
    }
    const raw = cfg.attribute ? state.attributes[cfg.attribute] : state.state;
    const num = Number(raw);
    if (!isNaN(num) && cfg.decimals !== null) return `${num.toFixed(cfg.decimals)}${cfg.unit}`;
    return `${raw}${cfg.unit}`;
  }

  _render() {
    if (!this._built || !this._hass) return;
    const state = this._hass.states[this._config.entity];
    if (!state) {
      if (this._config.compact) this._setCanvasLines("----", "");
      else this._setCanvasText("----");
      this._lit = false;
      return;
    }
    const name = this._config.label || state.attributes.friendly_name || this._config.entity;
    this._lit = this._config.readonly ? true : state.state === "on";
    if (this._config.compact) {
      this._setCanvasLines(name.toUpperCase(), this._stateText(state).toUpperCase());
    } else {
      this._setCanvasText(`${name}  ${this._stateText(state)}`.toUpperCase());
    }
  }

  _setCanvasText(text) {
    if (text === this._canvasText) return;
    this._canvasText = text;
    this._marqueeState = teNewMarqueeState();
  }

  _setCanvasLines(label, value) {
    if (label !== this._canvasLabel) {
      this._canvasLabel = label;
      this._labelMarqueeState = teNewMarqueeState();
    }
    if (value !== this._canvasValue) {
      this._canvasValue = value;
      this._valueMarqueeState = teNewMarqueeState();
    }
  }

  _build() {
    this._built = true;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        ${TE_CSS}
        :host { display: block; }
        ha-card {
          background: transparent;
          box-shadow: none;
          padding: 6px;
        }
        .te-md-screen {
          position: relative;
          height: 64px;
          border-radius: 8px;
          overflow: hidden;
        }
        .te-md-canvas {
          position: absolute;
          inset: 0;
          display: block;
          width: 100%;
          height: 100%;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .te-md-canvas.te-md-readonly { cursor: default; }
        .te-md-glass {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(255,255,255,0.07) 0%,
            rgba(255,255,255,0.02) 28%,
            rgba(0,0,0,0.03) 29%,
            rgba(0,0,0,0.14) 70%,
            rgba(0,0,0,0.4) 100%
          );
          mix-blend-mode: overlay;
          pointer-events: none;
          z-index: 6;
        }
      </style>
      <ha-card>
        <div class="te-md-screen">
          <canvas class="te-md-canvas"></canvas>
          <div class="te-md-glass"></div>
        </div>
      </ha-card>
    `;
    const root = this.shadowRoot;
    this._el = {
      screen: root.querySelector(".te-md-screen"),
      canvas: root.querySelector(".te-md-canvas"),
      card: root.querySelector("ha-card"),
    };
    this._el.canvas.addEventListener("click", (ev) => {
      if (!this._hass || this._config.readonly) return;
      const rect = this._el.canvas.getBoundingClientRect();
      if (ev.clientX - rect.left > 46) return;
      const cfg = this._config;
      this._hass.callService(cfg.toggle_domain, cfg.toggle_service, { entity_id: cfg.entity });
    });
    this._canvasCtx = this._el.canvas.getContext("2d");
    this._marqueeState = teNewMarqueeState();
    this._resizeObserver = new ResizeObserver(() => this._resizeCanvas());
    this._resizeObserver.observe(this._el.screen);
    this._resizeCanvas();
    this._canvasRaf = requestAnimationFrame((t) => this._tickCanvas(t));
  }

  _resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this._el.screen.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (this._el.canvas.width !== w) this._el.canvas.width = w;
    if (this._el.canvas.height !== h) this._el.canvas.height = h;
  }

  _getMeshPattern(ctx) {
    if (this._meshPattern) return this._meshPattern;
    const patternCanvas = document.createElement("canvas");
    patternCanvas.width = 3;
    patternCanvas.height = 3;
    const pCtx = patternCanvas.getContext("2d");
    pCtx.fillStyle = "rgba(0,0,0,0.55)";
    pCtx.fillRect(0, 2, 3, 1);
    pCtx.fillRect(2, 0, 1, 3);
    this._meshPattern = ctx.createPattern(patternCanvas, "repeat");
    return this._meshPattern;
  }

  _tickCanvas(now) {
    const ctx = this._canvasCtx;
    const canvas = this._el.canvas;
    const w = canvas.width;
    const h = canvas.height;
    const dt = Math.min(0.1, (now - (this._lastCanvasT || now)) / 1000);
    this._lastCanvasT = now;
    const dpr = window.devicePixelRatio || 1;

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#0d0f0c";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    const theme = TE_DISPLAY_THEMES[this._config.theme] || TE_DISPLAY_THEMES.amber;
    const text = this._canvasText || "";
    const leftMargin = 46 * dpr;
    const rightMargin = 10 * dpr;
    const availW = w - leftMargin - rightMargin;

    teDrawMiniIcon(ctx, this._config.icon, 23 * dpr, h / 2, 28 * dpr, !!this._lit, theme);

    if (this._config.compact) {
      teDrawVfdTextCompact(ctx, {
        text: this._canvasLabel || "",
        scrollState: this._labelMarqueeState,
        scroll: this._config.scroll,
        dpr,
        theme,
        x0: leftMargin,
        y: h * 0.3,
        availW,
        dt,
        fontSize: 10 * dpr,
      });
      teDrawVfdTextCompact(ctx, {
        text: this._canvasValue || "",
        scrollState: this._valueMarqueeState,
        scroll: this._config.scroll,
        dpr,
        theme,
        x0: leftMargin,
        y: h * 0.68,
        availW,
        dt,
        fontSize: 18 * dpr,
      });
    } else {
      const glyphH = 7 * (3 * dpr) + 6 * (1 * dpr);
      const startY = (h - glyphH) / 2;
      teDrawVfdText(ctx, {
        text,
        scrollState: this._marqueeState,
        scroll: this._config.scroll,
        dpr,
        theme,
        x0: leftMargin,
        y: startY,
        availW,
        dt,
      });
    }

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = this._getMeshPattern(ctx);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    this._canvasRaf = requestAnimationFrame((t) => this._tickCanvas(t));
  }
}

customElements.define("te-mini-display", TeMiniDisplay);

window.customCards.push({
  type: "te-mini-display",
  name: "TE Mini Display",
  description: "Compact icon + scrolling VFD name/state readout, meant to be paired with a slider, knob, or toggle below via te-group.",
  preview: false,
});
