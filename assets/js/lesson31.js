// Lesson 31 interactives: memory sizing, weight quantization, throughput by language.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);
  const SVG = "http://www.w3.org/2000/svg";
  const svg = (tag, attrs, text) => { const n = document.createElementNS(SVG, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text) n.textContent = text; return n; };

  /* ---------- 1. Memory ---------- */
  const SIZES = [0.5, 1, 1.5, 2, 3, 4, 7, 8, 9, 12, 14, 20, 24, 27, 32, 40, 50, 70, 100, 120, 180];
  function paintMm() {
    const p = SIZES[+$("mm-p").value], bits = +$("mm-b").value, weights = p * bits / 8, total = weights * 1.2;
    $("mm-pv").textContent = p;
    $("mm-out").replaceChildren(el("b", {}, `About ${total.toFixed(1)} GB`), ` (${weights.toFixed(1)} GB of weights plus working space). `, el("span", { class: "small" }, `At 16-bit the same model would need ${(p * 2 * 1.2).toFixed(1)} GB.`));
    const bars = $("mm-bars"); bars.replaceChildren();
    for (const ram of [8, 16, 24, 32, 64]) {
      const share = total / ram, fits = share <= 0.7, fill = el("i"); fill.style.width = Math.min(100, share * 100) + "%"; fill.style.background = fits ? "var(--good)" : "var(--bad)";
      bars.append(el("div", { class: "bar", style: "grid-template-columns: 62px 1fr 78px" }, el("span", { class: "w", style: "font-family:var(--sans)" }, ram + " GB"), el("span", { class: "t" }, fill), el("span", { class: "p " + (fits ? "ok" : "no") }, fits ? "fits" : share <= 1 ? "too tight" : "too big")));
    }
  }
  $("mm-p").oninput = $("mm-b").onchange = paintMm;
  paintMm();

  /* ---------- 2. Quantization ---------- */
  const W = [-0.92, -0.61, -0.47, -0.33, -0.18, -0.07, 0.04, 0.13, 0.29, 0.44, 0.68, 0.95];
  function paintQz() {
    const bits = +$("qz-b").value, levels = Math.pow(2, bits), lo = -1, hi = 1, step = (hi - lo) / (levels - 1);
    $("qz-bv").textContent = bits;
    const q = W.map(w => lo + Math.round((w - lo) / step) * step), err = W.reduce((s, w, i) => s + Math.abs(w - q[i]), 0) / W.length;
    const box = $("qz-svg"); box.replaceChildren();
    const L = 14, R = 306, X = v => L + (v - lo) / (hi - lo) * (R - L), Y1 = 30, Y2 = 86;
    box.append(svg("line", { x1: L, y1: Y1, x2: R, y2: Y1, stroke: "var(--line)" }), svg("line", { x1: L, y1: Y2, x2: R, y2: Y2, stroke: "var(--line)" }));
    box.append(svg("text", { x: L, y: 14, "font-size": 9.5, fill: "var(--muted)" }, "as trained"), svg("text", { x: L, y: 108, "font-size": 9.5, fill: "var(--muted)" }, `stored: ${levels} allowed value${levels === 1 ? "" : "s"}`));
    if (levels <= 64) for (let i = 0; i < levels; i++) box.append(svg("line", { x1: X(lo + i * step), y1: Y2 - 6, x2: X(lo + i * step), y2: Y2 + 6, stroke: "var(--muted)", "stroke-width": 1 }));
    W.forEach((w, i) => {
      box.append(svg("line", { x1: X(w), y1: Y1, x2: X(q[i]), y2: Y2, stroke: "var(--accent)", "stroke-width": 1, opacity: .7 }));
      box.append(svg("circle", { cx: X(w), cy: Y1, r: 4, fill: "var(--teal)" }), svg("circle", { cx: X(q[i]), cy: Y2, r: 4, fill: "var(--accent)" }));
    });
    const distinct = new Set(q.map(v => v.toFixed(6))).size;
    $("qz-out").replaceChildren(el("b", {}, `Average error ${err.toFixed(3)}`), ` per weight. The twelve weights now take ${distinct} distinct value${distinct === 1 ? "" : "s"}. `,
      el("span", { class: "small" }, `Storage: ${bits} bit${bits === 1 ? "" : "s"} each instead of 16, ${(16 / bits).toFixed(1)} times smaller.`));
  }
  $("qz-b").oninput = paintQz;
  paintQz();

  /* ---------- 3. Throughput ---------- */
  function paintTp() {
    const s = +$("tp-s").value, v = id => Math.max(0.1, +$(id).value || 1); $("tp-sv").textContent = s;
    const rows = [["English", v("tp-e")], ["Arabic", v("tp-a")], ["Vowelled Arabic", v("tp-v")]].map(([n, r]) => [n, s / r * 3600 / 300]);
    const max = Math.max(...rows.map(r => r[1])), bars = $("tp-bars"); bars.replaceChildren();
    rows.forEach(([n, pages], i) => { const fill = el("i"); fill.style.width = (pages / max * 100) + "%"; if (i === 2) fill.style.background = "var(--accent)";
      bars.append(el("div", { class: "bar", style: "grid-template-columns: 118px 1fr 84px" }, el("span", { class: "w", style: "font-family:var(--sans)" }, n), el("span", { class: "t" }, fill), el("span", { class: "p" }, Math.round(pages).toLocaleString("en") + " pages/h"))); });
    $("tp-out").replaceChildren(el("b", {}, `At ${s} tokens per second`), `, a 300-word page of vowelled Arabic takes about ${(300 * v("tp-v") / s).toFixed(0)} seconds to generate, against ${(300 * v("tp-e") / s).toFixed(0)} seconds for a page of English. `,
      el("span", { class: "small" }, "Same machine, same model, same speed in tokens. The difference is entirely in how the text is cut into tokens."));
  }
  ["tp-s", "tp-e", "tp-a", "tp-v"].forEach(id => $(id).addEventListener("input", paintTp));
  paintTp();

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "A 7-billion-parameter model stored at 4 bits per parameter needs roughly how much memory for its weights?",
      options: ["0.9 GB", "3.5 GB", "14 GB", "28 GB"],
      answer: 1, why: "7 billion × 4 bits ÷ 8 = 3.5 billion bytes. At 16 bits it would be 14 GB." },
    { q: "Quantization makes a model smaller by…",
      options: ["removing layers", "storing each parameter with fewer bits, rounding it to one of a small set of values", "shortening the vocabulary", "deleting rare tokens"],
      answer: 1, why: "Every parameter is kept, at lower precision. Fewer bits means fewer allowed values and a small rounding error on each." },
    { q: "A model card says 4-bit quantization causes “negligible quality loss”. For your Arabic diacritiser you should…",
      options: ["accept it", "measure both precisions on your own test set, since such claims are averages over other tasks and languages", "always use 2-bit", "avoid quantization entirely"],
      answer: 1, why: "Loss varies by task and language. You have a harness; the answer for your task costs one run." },
    { q: "To switch your agent from a hosted model to a local one served with a compatible endpoint, you change…",
      options: ["all of the tool code", "the base URL and the model name", "the eval harness", "the tokenizer by hand"],
      answer: 1, why: "The request format is the same. That is why the course used it throughout." },
    { q: "The same machine generates 30 tokens per second in any language. Why does it produce Arabic text more slowly than English text?",
      options: ["Right-to-left text is slower to compute", "Arabic takes more tokens per word, so the same token rate yields fewer words", "The model thinks longer in Arabic", "It does not"],
      answer: 1, why: "Lesson 1's measurement, paid a third time: first in cost, then in retrieval quality, now in speed." }
  ], "l31");

  mountSaved();
  mountFinish($("finish"), "l31");
})();
