import "./shims";
import "../src/index";
import { MockHass } from "./mock-hass";
import { STORIES } from "./stories";
import { DASHBOARD } from "./dashboard";
import { toYaml } from "./yaml";
import type { HomeAssistant } from "../src/types";

type CardEl = HTMLElement & { setConfig(c: unknown): void; hass?: HomeAssistant };

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const SCREEN_TYPES = new Set(["custom:te-display", "custom:te-mini-display", "custom:te-dial"]);

const logEl = $("log");
const hass = new MockHass(({ domain, service, data }) => {
  const li = document.createElement("li");
  li.innerHTML = `<b>${domain}.${service}</b> `;
  li.append(JSON.stringify(data));
  logEl.prepend(li);
  while (logEl.children.length > 80) logEl.lastElementChild?.remove();
});

let current: HomeAssistant;
const cards = new Set<CardEl>();
hass.subscribe((h) => {
  current = h;
  cards.forEach((c) => (c.hass = h));
});

function applyOverrides(cfg: Record<string, any>): Record<string, any> {
  const body = $<HTMLSelectElement>("body").value;
  const screen = $<HTMLSelectElement>("screen").value;
  const walk = (c: Record<string, any>): Record<string, any> => {
    const out = { ...c };
    if (body) out.body = body;
    if (screen && SCREEN_TYPES.has(out.type)) out.screen = screen;
    if (Array.isArray(out.cards)) out.cards = out.cards.map((e: any) => (Array.isArray(e) ? e.map(walk) : walk(e)));
    return out;
  };
  return walk(cfg);
}

function createCard(config: Record<string, any>): HTMLElement {
  const el = document.createElement(config.type.replace(/^custom:/, "")) as CardEl;
  try {
    el.setConfig(config);
  } catch (e) {
    const err = document.createElement("div");
    err.textContent = `⚠ ${(e as Error).message}`;
    return err;
  }
  el.hass = current;
  cards.add(el);
  return el;
}

function renderDashboard(main: HTMLElement) {
  const view = DASHBOARD.views[0];
  const bar = document.createElement("div");
  bar.className = "ha-bar";
  bar.innerHTML = `<span class="ha-title">${DASHBOARD.title}</span><span class="ha-hint">sections view · mock entities</span><button>COPY YAML</button>`;
  const yaml = toYaml(DASHBOARD);
  const btn = bar.querySelector("button")!;
  btn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(yaml).catch(() => undefined);
    btn.textContent = "COPIED";
    setTimeout(() => (btn.textContent = "COPY YAML"), 1200);
  });
  const grid = document.createElement("div");
  grid.className = "ha-sections";
  for (const section of view.sections) {
    const col = document.createElement("div");
    col.className = "ha-section";
    for (const card of section.cards) col.append(createCard(applyOverrides(card)));
    grid.append(col);
  }
  main.append(bar, grid);
}

function render() {
  cards.clear();
  const main = $("main");
  main.replaceChildren();
  const dashboard = location.hash === "#dashboard";
  document.body.classList.toggle("mode-dashboard", dashboard);
  document.querySelectorAll("nav a").forEach((a) => a.classList.toggle("active", (a.getAttribute("href") === "#dashboard") === dashboard));
  if (dashboard) return renderDashboard(main);
  for (const story of STORIES) {
    const section = document.createElement("section");
    section.className = "story";
    section.id = story.model.type;
    section.innerHTML = `
      <header>
        <h2>${story.model.model}</h2>
        <span class="jp">${story.model.subtitle}</span>
        <span class="tag">custom:${story.model.type}</span>
      </header>
      <p></p>
      <div class="variants"></div>`;
    section.querySelector("p")!.textContent = story.blurb;
    const wrap = section.querySelector(".variants")!;
    for (const v of story.variants) {
      const config = applyOverrides(v.config);
      const variant = document.createElement("div");
      variant.className = "variant";
      const stage = document.createElement("div");
      stage.className = "stage";
      if (v.width) stage.style.width = `${v.width + 36}px`;
      stage.append(createCard(config));
      const name = document.createElement("div");
      name.className = "variant-name";
      name.innerHTML = `<span></span><button>YAML</button>`;
      name.querySelector("span")!.textContent = v.name;
      const pre = document.createElement("pre");
      pre.hidden = true;
      pre.textContent = toYaml(config);
      name.querySelector("button")!.addEventListener("click", () => (pre.hidden = !pre.hidden));
      variant.append(stage, name, pre);
      wrap.append(variant);
    }
    main.append(section);
  }
}

$("nav").innerHTML =
  `<a href="#dashboard" class="nav-dash"><span>DASHBOARD</span><span>DEMO</span></a>` +
  STORIES.map((s) => `<a href="#${s.model.type}"><span>${s.model.model}</span><span>${s.model.name}</span></a>`).join("");
let lastMode = location.hash === "#dashboard";
window.addEventListener("hashchange", () => {
  const mode = location.hash === "#dashboard";
  if (mode === lastMode) return;
  lastMode = mode;
  render();
  if (!mode) document.getElementById(location.hash.slice(1))?.scrollIntoView();
});
$<HTMLSelectElement>("body").addEventListener("change", render);
$<HTMLSelectElement>("screen").addEventListener("change", render);
$<HTMLSelectElement>("backdrop").addEventListener("change", (e) => (document.documentElement.dataset.backdrop = (e.target as HTMLSelectElement).value));
$("reset").addEventListener("click", () => hass.reset());
$("clear").addEventListener("click", () => logEl.replaceChildren());
window.addEventListener("hass-more-info", (e) => {
  const li = document.createElement("li");
  li.innerHTML = `<b>more-info</b> `;
  li.append(String((e as CustomEvent).detail?.entityId));
  logEl.prepend(li);
});

render();
