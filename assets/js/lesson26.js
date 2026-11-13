// Lesson 26 interactives: latency percentiles with a tail, drift alert tuning.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);
  const SVG = "http://www.w3.org/2000/svg";
  const svg = (tag, attrs, text) => { const n = document.createElementNS(SVG, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text) n.textContent = text; return n; };
  // Small seeded generator, so the pictures are stable until you ask for new noise.
  const rng = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const normal = r => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());

  /* ---------- 1. Percentiles ---------- */
  function paintPc() {
    const f = +$("pc-f").value / 100, m = +$("pc-m").value, r = rng(7), N = 1000;
    $("pc-fv").textContent = Math.round(f * 100) + "%"; $("pc-mv").textContent = m + "×";
    const xs = Array.from({ length: N }, (_, i) => { const base = Math.max(0.4, 2 + 0.5 * normal(r)); return i < f * N ? base * m * (0.7 + 0.6 * r()) : base; }).sort((a, b) => a - b);
    const pct = p => xs[Math.min(N - 1, Math.floor(p / 100 * N))], mean = xs.reduce((a, b) => a + b, 0) / N;
    const box = $("pc-svg"); box.replaceChildren();
    const L = 10, R = 310, B = 100, MAX = Math.max(12, pct(99) * 1.1), bins = 40, h = new Array(bins).fill(0);
    xs.forEach(x => { h[Math.min(bins - 1, Math.floor(x / MAX * bins))]++; });
    const top = Math.max(...h), X = v => L + Math.min(v, MAX) / MAX * (R - L);
    h.forEach((c, i) => { const hh = c / top * 84; if (c) box.append(svg("rect", { x: L + i * (R - L) / bins, y: B - Math.max(1.5, hh), width: (R - L) / bins - 1, height: Math.max(1.5, hh), fill: "var(--teal)", opacity: .55 })); });
    box.append(svg("line", { x1: L, y1: B, x2: R, y2: B, stroke: "var(--line)" }));
    for (const [v, name, col, y] of [[pct(50), "p50", "var(--ink)", 12], [mean, "mean", "var(--accent)", 24], [pct(95), "p95", "var(--c6)", 12]]) {
      box.append(svg("line", { x1: X(v), y1: y + 3, x2: X(v), y2: B, stroke: col, "stroke-width": 1.5, "stroke-dasharray": "3 2" }));
      box.append(svg("text", { x: X(v), y, "font-size": 9, "text-anchor": "middle", fill: col, "font-weight": 700 }, name));
    }
    box.append(svg("text", { x: L, y: 116, "font-size": 9, fill: "var(--muted)" }, "0 s"), svg("text", { x: R, y: 116, "font-size": 9, "text-anchor": "end", fill: "var(--muted)" }, MAX.toFixed(0) + " s"));
    $("pc-out").replaceChildren(el("b", {}, `Mean ${mean.toFixed(1)} s · p50 ${pct(50).toFixed(1)} s · p95 ${pct(95).toFixed(1)} s · p99 ${pct(99).toFixed(1)} s. `),
      el("span", { class: "small" }, `${xs.filter(x => x > mean).length / 10}% of requests are slower than the mean.`));
  }
  $("pc-f").oninput = $("pc-m").oninput = paintPc;
  paintPc();

  /* ---------- 2. Drift alert ---------- */
  let seed = 11;
  function paintDr() {
    const shift = +$("dr-s").value, w = +$("dr-w").value, th = +$("dr-t").value, r = rng(seed), DAYS = 60, CHANGE = 30;
    $("dr-sv").textContent = "+" + shift.toFixed(1); $("dr-wv").textContent = w; $("dr-tv").textContent = th.toFixed(1);
    const daily = Array.from({ length: DAYS }, (_, d) => Math.max(0, 4 + (d >= CHANGE ? shift : 0) + 1.0 * normal(r)));
    const roll = daily.map((_, d) => d < w - 1 ? null : daily.slice(d - w + 1, d + 1).reduce((a, b) => a + b, 0) / w);
    const fired = roll.map((v, d) => v !== null && v > th);
    const falseAlarms = fired.slice(0, CHANGE).filter(Boolean).length, first = fired.findIndex((x, d) => x && d >= CHANGE);
    const box = $("dr-svg"); box.replaceChildren();
    const L = 26, R = 312, T = 10, B = 140, MAXY = 12, X = d => L + d / (DAYS - 1) * (R - L), Y = v => B - Math.min(v, MAXY) / MAXY * (B - T);
    box.append(svg("rect", { x: X(CHANGE), y: T, width: R - X(CHANGE), height: B - T, fill: "var(--accent-soft)", opacity: .5 }));
    box.append(svg("line", { x1: L, y1: B, x2: R, y2: B, stroke: "var(--line)" }), svg("line", { x1: L, y1: T, x2: L, y2: B, stroke: "var(--line)" }));
    daily.forEach((v, d) => box.append(svg("circle", { cx: X(d), cy: Y(v), r: 1.6, fill: "var(--muted)" })));
    let dpath = ""; roll.forEach((v, d) => { if (v !== null) dpath += (dpath ? "L" : "M") + X(d).toFixed(1) + " " + Y(v).toFixed(1); });
    box.append(svg("path", { d: dpath, fill: "none", stroke: "var(--teal)", "stroke-width": 2.2 }));
    box.append(svg("line", { x1: L, y1: Y(th), x2: R, y2: Y(th), stroke: "var(--bad)", "stroke-dasharray": "5 3" }));
    fired.forEach((x, d) => { if (x) box.append(svg("rect", { x: X(d) - 1.5, y: B + 3, width: 3, height: 6, fill: d < CHANGE ? "var(--bad)" : "var(--good)" })); });
    for (const v of [0, 4, 8, 12]) box.append(svg("text", { x: L - 4, y: Y(v) + 3, "font-size": 8.5, "text-anchor": "end", fill: "var(--muted)" }, v + "%"));
    box.append(svg("text", { x: X(CHANGE) + 3, y: T + 9, "font-size": 8.5, fill: "var(--accent)" }, "change happens"), svg("text", { x: (L + R) / 2, y: 164, "font-size": 9, "text-anchor": "middle", fill: "var(--muted)" }, "days 1 to 60 · dots: daily · line: rolling average · marks below: alert firing"));
    const out = $("dr-out"); out.replaceChildren();
    out.append(el("b", { class: falseAlarms ? "no" : "ok" }, `${falseAlarms} false-alarm day${falseAlarms === 1 ? "" : "s"} before the change. `));
    if (!shift) out.append("There is no real shift, so any alert after day 30 is false as well.");
    else if (first < 0) out.append(el("b", { class: "no" }, "The real shift was never detected "), "in thirty days.");
    else out.append(el("b", { class: first - CHANGE <= 7 ? "ok" : "" }, `Detected ${first - CHANGE + 1} day${first - CHANGE === 0 ? "" : "s"} after the change. `), `Users had the worse system for that long.`);
  }
  ["dr-s", "dr-w", "dr-t"].forEach(id => $(id).oninput = paintDr);
  $("dr-new").onclick = () => { seed = (seed * 31 + 11) % 100000; paintDr(); };
  paintDr();

  /* ---------- 3. Which signal ---------- */
  const SG = ["p95 latency", "Share of requested words missing from the corpus", "Verifier failure rate", "Tokens per request"];
  mountQuiz($("sg-box"), [
    { q: "Users have started asking about recent slang the 1961 corpus does not contain.", options: SG, answer: 1, why: "An input signal moves before any output does: the questions changed. Outputs may look healthy, since “no occurrences” is a well-formed, verified answer." },
    { q: "The provider quietly replaced the model with one that writes reports from memory more often.", options: SG, answer: 2, why: "Claims without corpus support fail the citation checks. The verifier rate is a direct proxy for this failure." },
    { q: "A change to a tool makes it return three times as much text per call.", options: SG, answer: 3, why: "Every later step re-sends the larger results. Cost shows it at once; quality signals may not move at all." },
    { q: "The corpus storage becomes slow, and one tool call in fifteen takes thirty seconds.", options: SG, answer: 0, why: "A minority of requests getting much slower is exactly what the p95 exists to reveal. The median would hide it." }
  ], "l26-signals");

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "Your code, prompts and data are unchanged for a month, yet quality falls. Which is a possible cause?",
      options: ["None: nothing changed", "The provider changed the model behind the name you call, or users began asking different things", "The eval set expired", "The temperature rose by itself"],
      answer: 1, why: "Quality depends on the model and the inputs, neither of which is under your version control." },
    { q: "A corpus compiled in 1961 is, in linguistic terms, a…",
      options: ["diachronic study", "synchronic snapshot", "dialect", "register"],
      answer: 1, why: "It records the language at one time. Usage has moved on since, which is why input drift is inevitable." },
    { q: "Requests usually take 2 s, but 4% take 40 s. Which statistic best exposes the problem to an operator?",
      options: ["The mean", "The median (p50)", "A high percentile such as p99", "The minimum"],
      answer: 2, why: "The median ignores the tail entirely and the mean blurs it. With 4% affected, the p95 also misses it; the p99 does not." },
    { q: "Lengthening an alert's rolling window from 1 day to 10 days generally gives you…",
      options: ["faster detection and more false alarms", "slower detection and fewer false alarms", "no change", "more accurate judges"],
      answer: 1, why: "Smoothing suppresses noise and delays the response to a real change. The same trade as precision against recall." },
    { q: "Why hand-check a sample of the judge's verdicts on a schedule?",
      options: ["To train the judge", "Because the judge is a model too, and its behaviour can drift like any other part", "Judges cannot read production data", "To reduce cost"],
      answer: 1, why: "An unmonitored measuring instrument is an assumption. Its agreement with people needs re-measuring over time." }
  ], "l26");

  mountSaved();
  mountFinish($("finish"), "l26");
})();
