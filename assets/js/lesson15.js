// Lesson 15 interactives: BM25 saturation curves, Arabic normaliser, reciprocal rank fusion.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);
  const SVG = "http://www.w3.org/2000/svg";
  const svg = (tag, attrs, text) => { const n = document.createElementNS(SVG, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text) n.textContent = text; return n; };

  /* ---------- 1. BM25 curves ---------- */
  const bm = (tf, k1, b, rel) => tf * (k1 + 1) / (tf + k1 * (1 - b + b * rel) || 1e-9);
  function paintBm() {
    const k1 = +$("bm-k").value, b = +$("bm-b").value, box = $("bm-svg"); box.replaceChildren();
    $("bm-kv").textContent = k1.toFixed(1); $("bm-bv").textContent = b.toFixed(2);
    const L = 34, R = 310, T = 12, B = 162, MAXTF = 20, MAXY = 4.2, X = v => L + v / MAXTF * (R - L), Y = v => B - Math.min(v, MAXY) / MAXY * (B - T);
    box.append(svg("line", { x1: L, y1: B, x2: R, y2: B, stroke: "var(--line)" }), svg("line", { x1: L, y1: T, x2: L, y2: B, stroke: "var(--line)" }));
    box.append(svg("line", { x1: X(0), y1: Y(0), x2: X(MAXY), y2: Y(MAXY), stroke: "var(--muted)", "stroke-dasharray": "4 4" }));
    const series = [["short doc (half average)", 0.5, "var(--teal)"], ["average length", 1, "var(--ink)"], ["long doc (double)", 2, "var(--accent)"]];
    series.forEach(([name, rel, col], i) => {
      let d = ""; for (let tf = 0; tf <= MAXTF; tf += 0.5) d += (tf ? "L" : "M") + X(tf).toFixed(1) + " " + Y(bm(tf, k1, b, rel)).toFixed(1);
      box.append(svg("path", { d, fill: "none", stroke: col, "stroke-width": 2.5 }));
      box.append(svg("rect", { x: L + 4 + i * 96, y: 178, width: 10, height: 10, fill: col }), svg("text", { x: L + 18 + i * 96, y: 187, "font-size": 9, fill: "var(--muted)" }, name.split(" (")[0]));
    });
    box.append(svg("text", { x: (L + R) / 2, y: 174, "font-size": 10, "text-anchor": "middle", fill: "var(--muted)" }, "times the word occurs (0 to 20)"));
    box.append(svg("text", { x: 12, y: (T + B) / 2, "font-size": 10, fill: "var(--muted)", transform: `rotate(-90 12 ${(T + B) / 2})`, "text-anchor": "middle" }, "score"));
    const at = tf => bm(tf, k1, b, 1);
    $("bm-out").textContent = `In an average-length document: 1 occurrence scores ${at(1).toFixed(2)}, 5 score ${at(5).toFixed(2)}, 20 score ${at(20).toFixed(2)}. The ceiling is k1 + 1 = ${(k1 + 1).toFixed(1)}.`;
  }
  $("bm-k").oninput = $("bm-b").oninput = paintBm;
  paintBm();

  /* ---------- 2. Arabic normaliser ---------- */
  const PREFIX = /^(وال|بال|كال|فال|لل|ال|و)/, SUFFIX = /(ها|هم|هن|كم|نا|ات|ون|ين|ان|ه|ي)$/;
  function steps(w) {
    const s = [w];
    let x = w.replace(/[ً-ْٰـ]/g, ""); s.push(x);
    x = x.replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه"); s.push(x);
    for (const rule of [PREFIX, SUFFIX]) { const y = x.replace(rule, ""); if (y.length >= 3) x = y; s.push(x); }
    return s;
  }
  function paintAr() {
    const q = $("ar-q").value.trim().split(/\s+/)[0] || "", qn = steps(q).pop(), t = $("ar-table");
    t.replaceChildren(el("tr", {}, ...["Written", "Marks off", "Unified", "Prefix off", "Suffix off", "Hit"].map(h => el("th", {}, h))));
    let before = 0, after = 0;
    const row = (w, isQuery) => {
      const s = steps(w), raw = w === q, norm = s[4] === qn;
      if (!isQuery) { if (raw) before++; if (norm) after++; }
      t.append(el("tr", isQuery ? { style: "background:var(--teal-soft)" } : {}, ...s.map(x => el("td", { class: "ar", style: "font-size:1.15em;text-align:right" }, x)),
        el("td", { class: isQuery ? "" : norm ? "ok" : "no" }, isQuery ? "query" : norm ? "✓" : "✗")));
    };
    if (q) row(q, true);
    const words = $("ar-d").value.trim().split(/\s+/).filter(Boolean); words.forEach(w => row(w, false));
    $("ar-out").replaceChildren(el("b", {}, `Exact string matching finds ${before} of ${words.length}. After normalising, ${after} of ${words.length}.`));
  }
  $("ar-q").oninput = $("ar-d").oninput = paintAr;
  paintAr();

  /* ---------- 3. Reciprocal rank fusion ---------- */
  const PRE = {
    "Agreement beats a single win": [["C", "A", "F", "B", "G"], ["D", "A", "B", "E", "C"]],
    "Retrievers disagree completely": [["A", "B", "C", "D", "E"], ["F", "G", "H", "I", "J"]],
    "Retrievers agree": [["A", "B", "C", "D", "E"], ["A", "B", "C", "E", "D"]]
  };
  let lists = PRE["Agreement beats a single win"];
  function paintRrf() {
    const k = +$("rf-k").value; $("rf-kv").textContent = k;
    $("rf-a").textContent = lists[0].join("  "); $("rf-b").textContent = lists[1].join("  ");
    const sc = {}, where = {};
    lists.forEach((l, li) => l.forEach((d, i) => { sc[d] = (sc[d] || 0) + 1 / (k + i + 1); (where[d] ||= ["–", "–"])[li] = i + 1; }));
    const ranked = Object.entries(sc).sort((a, b) => b[1] - a[1]), max = ranked[0][1], bars = $("rf-bars"); bars.replaceChildren();
    ranked.slice(0, 6).forEach(([d, s], i) => {
      const fill = el("i"); fill.style.width = (s / max * 100) + "%";
      bars.append(el("div", { class: "bar", style: "grid-template-columns: 128px 1fr 58px" }, el("span", { class: "w" }, `${i + 1}. ${d}  (${where[d][0]}, ${where[d][1]})`), el("span", { class: "t" }, fill), el("span", { class: "p" }, s.toFixed(4))));
    });
  }
  for (const name of Object.keys(PRE)) $("rf-presets").append(el("button", { type: "button", style: "padding:5px 10px;font-size:.85rem", onclick() { lists = PRE[name]; paintRrf(); } }, name));
  $("rf-k").oninput = paintRrf;
  paintRrf();

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "A page mentions “dual” 30 times, another 3 times; both are of average length. Under BM25 the first scores…",
      options: ["ten times higher on that term", "somewhat higher, because the contribution of repeated terms levels off", "the same", "lower"],
      answer: 1, why: "Saturation: after the first few occurrences, more add little. That is the role of k1." },
    { q: "What does the parameter b control?",
      options: ["How fast term frequency saturates", "How strongly document length is corrected for", "The number of results", "The idf formula"],
      answer: 1, why: "At b = 0 length is ignored; at b = 1 term frequency is fully scaled by the document's length relative to the average." },
    { q: "«كتاب» and «وكتابها» fail to match in BM25. The cause is…",
      options: ["semantic difference", "morphology: the same word with clitics attached is a different string", "idf", "document length"],
      answer: 1, why: "They are the same lexical item. Normalisation or lemmatisation before indexing and querying fixes it." },
    { q: "After light stemming, «مكتبة» (library) and «مكتب» (office) are the same token. This illustrates…",
      options: ["under-stemming", "over-stemming: normalisation merging distinct words, which lowers precision", "a bug in BM25", "vocabulary mismatch"],
      answer: 1, why: "Every normalisation step finds more matches and some wrong ones. That trade is the design decision." },
    { q: "Why does reciprocal rank fusion use ranks instead of scores?",
      options: ["Ranks are more precise", "Scores from different retrievers are on incomparable scales; ranks are always comparable", "Scores are secret", "It is faster to compute"],
      answer: 1, why: "A BM25 score and a cosine similarity cannot be meaningfully added. Position in a list can." }
  ], "l15");

  mountSaved();
  mountFinish($("finish"), "l15");
})();
