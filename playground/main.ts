import "./shims";
import "../src/index";
import { MockHass } from "./mock-hass";
import { STORIES } from "./stories";
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

/** Tiny YAML emitter for showing configs the way users would paste them. */
function toYaml(v: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (Array.isArray(v)) {
    return v
      .map((item) => {
        const body = toYaml(item, indent + 1).trimStart();
        return `${pad}- ${body}`;
      })
      .join("\n");
  }
  if (v && typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => {
        if (val && typeof val === "object") return `${pad}${k}:\n${toYaml(val, indent + 1)}`;
        return `${pad}${k}: ${typeof val === "string" && /[:#{}\[\],&*!|>'"%@`]|^\s|^$/.test(val) ? JSON.stringify(val) : val}`;
      })
      .join("\n");
  }
  return `${pad}${v}`;
}

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

function render() {
  cards.clear();
  const main = $("main");
  main.replaceChildren();
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

$("nav").innerHTML = STORIES.map((s) => `<a href="#${s.model.type}"><span>${s.model.model}</span><span>${s.model.name}</span></a>`).join("");
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
