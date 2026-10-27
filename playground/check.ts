/** Card-picker check page (playground/check.html): runs the contract check and shows results and picker previews. */
import "./shims";
import "../src/index";
import { checkCards, mockHass, mount } from "./picker-contract";

async function main() {
  const { full, empty } = mockHass();
  const entries = (window.customCards ?? []) as Record<string, any>[];
  const results = await checkCards(full, empty);

  const bad = results.filter((r) => r.errors.length).length;
  document.getElementById("summary")!.innerHTML =
    `<b>${results.length}</b> cards · <span class="${bad ? "bad" : "ok"}">${bad} with errors</span> · ` +
    `<span class="warn">${results.filter((r) => r.warnings.length).length} with warnings</span>`;
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  document.getElementById("results")!.innerHTML =
    "<tr><th>Card</th><th>Preview</th><th>Form fields</th><th>Findings</th></tr>" +
    results
      .map(
        (r) => `<tr><td><b>${esc(r.name)}</b><br><code>custom:${r.type}</code></td><td>${r.preview ? "yes" : "no"}</td>
          <td><code>${esc(r.fields.join(", "))}</code></td>
          <td>${r.errors.map((m) => `<div class="bad">✕ ${esc(m)}</div>`).join("")}${r.warnings.map((m) => `<div class="warn">! ${esc(m)}</div>`).join("")}${
            r.errors.length + r.warnings.length ? "" : '<span class="ok">✓</span>'
          }</td></tr>`,
      )
      .join("");

  // what the picker grid shows: previews only for preview: true cards, from their stub config
  const picker = document.getElementById("picker")!;
  for (const e of entries) {
    const r = results.find((x) => x.type === e.type)!;
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.innerHTML = `<div class="name">${esc(e.name)}</div><div class="desc">${esc(e.description ?? "")}</div><div class="preview"></div>`;
    picker.append(slot);
    if (!r.preview) continue;
    try {
      await mount(e.type, { type: `custom:${e.type}`, ...(r.stub as object) }, full, slot.querySelector(".preview") as HTMLElement);
    } catch (err) {
      slot.querySelector(".preview")!.textContent = `⚠ ${(err as Error).message}`;
    }
  }
  (window as any).__checkResults = results;
}

main();
