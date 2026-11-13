// Lesson 30 interactives: LoRA parameter count, schematic loss curves, run diagnosis quiz.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);
  const SVG = "http://www.w3.org/2000/svg";
  const svg = (tag, attrs, text) => { const n = document.createElementNS(SVG, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text) n.textContent = text; return n; };

  /* ---------- 1. LoRA parameters ---------- */
  function paintLr() {
    const d = Math.pow(2, +$("lr-d").value), r = Math.pow(2, +$("lr-r").value), full = d * d, lora = 2 * d * r;
    $("lr-dv").textContent = d; $("lr-dv2").textContent = d; $("lr-rv").textContent = r;
    const box = $("lr-svg"); box.replaceChildren();
    const S = 96, thin = Math.max(3, S * Math.min(1, r / d * 14));     // thin tables drawn wider than to scale so that they are visible
    box.append(svg("rect", { x: 14, y: 12, width: S, height: S, fill: "var(--line)", stroke: "var(--muted)" }), svg("text", { x: 14 + S / 2, y: 12 + S / 2 + 4, "font-size": 11, "text-anchor": "middle", fill: "var(--muted)" }, "frozen"));
    box.append(svg("text", { x: 14 + S / 2, y: 124, "font-size": 10, "text-anchor": "middle", fill: "var(--muted)" }, `${d} × ${d}`));
    box.append(svg("text", { x: 130, y: 12 + S / 2 + 6, "font-size": 20, "text-anchor": "middle", fill: "var(--ink)" }, "+"));
    box.append(svg("rect", { x: 152, y: 12, width: thin, height: S, fill: "var(--accent)" }), svg("text", { x: 152 + thin / 2, y: 124, "font-size": 10, "text-anchor": "middle", fill: "var(--accent)" }, `${d} × ${r}`));
    box.append(svg("text", { x: 152 + thin + 14, y: 12 + S / 2 + 4, "font-size": 14, "text-anchor": "middle", fill: "var(--ink)" }, "×"));
    box.append(svg("rect", { x: 152 + thin + 28, y: 12, width: S, height: thin, fill: "var(--accent)" }), svg("text", { x: 152 + thin + 28 + S / 2, y: 12 + thin + 14, "font-size": 10, "text-anchor": "middle", fill: "var(--accent)" }, `${r} × ${d}`));
    const fmt = v => v.toLocaleString("en"), pct = lora / full * 100;
    $("lr-out").replaceChildren(el("b", {}, `Full matrix: ${fmt(full)} parameters. LoRA correction: ${fmt(lora)}`), ` (${pct < 0.1 ? pct.toFixed(3) : pct.toFixed(2)}% of the matrix). `,
      el("span", { class: "small" }, pct > 50 ? "At this rank the “small” correction is no longer small. Rank should be far below the matrix size." : `${Math.round(full / lora).toLocaleString("en")} times fewer numbers to train and to store.`));
  }
  $("lr-d").oninput = $("lr-r").oninput = paintLr;
  paintLr();

  /* ---------- 2. Schematic loss curves ---------- */
  function paintLc() {
    const n = Math.pow(10, +$("lc-n").value), r = Math.pow(2, +$("lc-r").value), E = 20;
    $("lc-nv").textContent = Math.round(n).toLocaleString("en"); $("lc-rv").textContent = r;
    // Illustrative only: learning speeds up with capacity; the gap between the curves grows with capacity and shrinks with data.
    const speed = 0.25 + 0.06 * Math.log2(r), floor = 0.28 + 6 / Math.sqrt(n), gapRate = 0.35 * Math.sqrt(r) / Math.sqrt(n);
    const train = e => 0.06 + 2.0 * Math.exp(-speed * e) + Math.max(0, floor - 0.06) * Math.exp(-gapRate * e * 3);
    const valid = e => floor + 2.0 * Math.exp(-speed * e) + gapRate * e * 0.5;
    const es = Array.from({ length: E + 1 }, (_, i) => i), tv = es.map(train), vv = es.map(valid), best = vv.indexOf(Math.min(...vv));
    const box = $("lc-svg"); box.replaceChildren();
    const L = 30, R = 310, T = 10, B = 138, MAXY = 2.4, X = e => L + e / E * (R - L), Y = v => B - Math.min(v, MAXY) / MAXY * (B - T);
    box.append(svg("line", { x1: L, y1: B, x2: R, y2: B, stroke: "var(--line)" }), svg("line", { x1: L, y1: T, x2: L, y2: B, stroke: "var(--line)" }));
    const path = (arr, col) => box.append(svg("path", { d: arr.map((v, e) => (e ? "L" : "M") + X(e).toFixed(1) + " " + Y(v).toFixed(1)).join(""), fill: "none", stroke: col, "stroke-width": 2.5 }));
    path(tv, "var(--teal)"); path(vv, "var(--accent)");
    box.append(svg("line", { x1: X(best), y1: T, x2: X(best), y2: B, stroke: "var(--good)", "stroke-dasharray": "4 3" }), svg("text", { x: X(best) + (best > 15 ? -4 : 4), y: T + 9, "font-size": 9, "text-anchor": best > 15 ? "end" : "start", fill: "var(--good)" }, "stop here"));
    box.append(svg("rect", { x: L + 6, y: 150, width: 10, height: 10, fill: "var(--teal)" }), svg("text", { x: L + 20, y: 159, "font-size": 9.5, fill: "var(--muted)" }, "training loss"),
      svg("rect", { x: L + 106, y: 150, width: 10, height: 10, fill: "var(--accent)" }), svg("text", { x: L + 120, y: 159, "font-size": 9.5, fill: "var(--muted)" }, "validation loss"), svg("text", { x: R, y: 159, "font-size": 9.5, "text-anchor": "end", fill: "var(--muted)" }, "epochs 0 to 20"));
    const gap = vv[E] - tv[E], out = $("lc-out"); out.replaceChildren();
    out.append(el("b", {}, `Lowest validation loss at epoch ${best}. `), best >= E ? "Still improving when training ended: you could train longer. " : `Training for all 20 epochs would be ${E - best} epochs of memorising. `,
      el("span", { class: "small" }, gap > 0.6 ? "The curves end far apart: heavy overfitting. More data, or less capacity." : gap > 0.25 ? "A moderate gap at the end." : "The curves stay close: the data is enough for this capacity."));
  }
  $("lc-n").oninput = $("lc-r").oninput = paintLc;
  paintLc();

  /* ---------- 3. Diagnosis ---------- */
  mountQuiz($("dg-box"), [
    { q: "Training loss falls to nearly zero. Validation loss fell for a while and has been climbing for two epochs.",
      options: ["Underfitting: train longer", "Overfitting: use the checkpoint from the lowest validation loss, and consider more data or a lower rank", "The learning rate is too low"],
      answer: 1, why: "The model is memorising its training sentences. The best model was saved earlier." },
    { q: "Both losses fall slowly and are still falling together when training ends.",
      options: ["Overfitting", "Not finished: train longer, or raise the learning rate a little", "Data leakage"],
      answer: 1, why: "No gap has opened, so the model is still learning the task. There is more to gain." },
    { q: "Validation loss is superb, far better than you expected. Test DER on news text is poor.",
      options: ["The model is excellent", "Suspect the data: validation sentences that duplicate training ones, or a test domain unlike the training text", "The rank is too low"],
      answer: 1, why: "A too-good validation score often means leakage. And a classical-text model meeting news is input drift from day one." },
    { q: "Loss jumps wildly from step to step and then becomes “nan”.",
      options: ["The learning rate is too high", "Too much data", "The rank is too low"],
      answer: 0, why: "Each adjustment overshoots. Lower the learning rate and start again." }
  ], "l30-diag");

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "During fine-tuning, the loss at each position measures…",
      options: ["how long the output is", "how surprised the model was by the correct next token", "how many parameters changed", "the temperature"],
      answer: 1, why: "It is next-token prediction scored against the known answer: high probability on the right token means low loss." },
    { q: "LoRA trains…",
      options: ["every parameter of the model", "two thin tables per adapted matrix, whose product is a small correction to the frozen weights", "only the tokenizer", "only the last layer's biases"],
      answer: 1, why: "The base stays frozen. A low-rank correction is learned and stored as a small adapter." },
    { q: "Why is a LoRA adapter useless without its base model?",
      options: ["It is encrypted", "It holds only a correction to the base model's weights, not the weights themselves", "It is too small to load", "It has no tokenizer"],
      answer: 1, why: "The adapter is a difference. It means something only when added to the matrices it was trained against." },
    { q: "Which number decides when to stop training?",
      options: ["Training loss", "Validation loss", "The number of epochs chosen in advance", "Test-set DER"],
      answer: 1, why: "Held-out loss shows when learning has turned into memorising. The test set must not be used for this, or it stops being a test." },
    { q: "Your tuned model's validation loss is lower than any earlier run. What must you still do before calling it better?",
      options: ["Nothing", "Score it on the task metric and gates on the test set, beside the baselines, including out-of-domain text", "Raise the rank", "Delete the baseline"],
      answer: 1, why: "Loss is a training signal. The claim “better” is made by the eval harness, on the measures you care about." }
  ], "l30");

  mountSaved();
  mountFinish($("finish"), "l30");
})();
