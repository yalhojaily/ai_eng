// Lesson 9 interactives: CoNLL-U parser, confidence interval.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);
  const SVG = "http://www.w3.org/2000/svg";
  const svg = (tag, attrs, text) => { const n = document.createElementNS(SVG, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text) n.textContent = text; return n; };

  /* ---------- 1. CoNLL-U ---------- */
  const SAMPLE = [
    "# text = وكتابها جديد",
    "1-3\tوكتابها\t_\t_\t_\t_\t_\t_\t_\t_",
    "1\tو\tو\tCCONJ\t_\t_\t4\tcc\t_\t_",
    "2\tكتاب\tكتاب\tNOUN\t_\tGender=Masc|Number=Sing\t4\tnsubj\t_\t_",
    "3\tها\tهو\tPRON\t_\tGender=Fem|Number=Sing|Person=3\t2\tnmod\t_\t_",
    "4\tجديد\tجديد\tADJ\t_\tGender=Masc|Number=Sing\t0\troot\t_\t_"
  ].join("\n");
  const TAGS = new Set("ADJ ADP ADV AUX CCONJ DET INTJ NOUN NUM PART PRON PROPN PUNCT SCONJ SYM VERB X".split(" "));
  function paintConllu() {
    const t = $("cn-table"), out = $("cn-out"); out.replaceChildren();
    t.replaceChildren(el("tr", {}, ...["ID", "FORM", "LEMMA", "UPOS", "FEATS"].map(h => el("th", {}, h))));
    let words = 0, ranges = 0; const problems = [];
    $("cn-text").value.split("\n").forEach((line, i) => {
      if (!line.trim() || line.startsWith("#")) return;
      const c = line.split("\t");
      if (c.length !== 10) { problems.push(`line ${i + 1}: ${c.length} columns, expected 10 (columns are separated by tabs)`); return; }
      const range = c[0].includes("-");
      if (range) ranges++; else { words++; if (!TAGS.has(c[3])) problems.push(`line ${i + 1}: “${c[3]}” is not a UD tag`); }
      const row = el("tr", range ? { style: "background:var(--accent-soft)" } : {},
        el("td", {}, c[0]), el("td", { class: "ar", style: "font-size:1.15em" }, c[1]), el("td", { class: "ar", style: "font-size:1.15em" }, c[2]), el("td", {}, c[3]), el("td", { style: "font-size:.78rem" }, c[5].split("|").join(" | ")));
      t.append(row);
    });
    out.append(el("b", {}, `${words} syntactic words`), `, ${ranges} multiword token${ranges === 1 ? "" : "s"}. `);
    if (!ranges && words) out.append("Without the range line, nothing records that the first three words were written as one. ");
    if (problems.length) { out.append(el("span", { class: "no" }, "Problems: ")); const ul = el("ul", { style: "margin:.4em 0 0;padding-left:1.2em" }); problems.forEach(p => ul.append(el("li", {}, p))); out.append(ul); }
    else out.append(el("span", { class: "ok" }, "Well-formed."));
  }
  $("cn-text").value = SAMPLE;
  $("cn-text").oninput = paintConllu;
  paintConllu();

  /* ---------- 2. Confidence interval (Wilson, 95%) ---------- */
  function wilson(p, n) {
    const z = 1.96, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
    return [c - h, c + h];
  }
  function paintCi() {
    const p = +$("ci-p").value / 100, n = +$("ci-n").value, [lo, hi] = wilson(p, n);
    $("ci-pv").textContent = Math.round(p * 100) + "%"; $("ci-nv").textContent = n;
    const box = $("ci-svg"); box.replaceChildren();
    const X = v => 16 + (v - 0.5) / 0.5 * 288;
    box.append(svg("line", { x1: 16, y1: 34, x2: 304, y2: 34, stroke: "var(--line)", "stroke-width": 2 }));
    for (let v = 50; v <= 100; v += 10) { box.append(svg("line", { x1: X(v / 100), y1: 29, x2: X(v / 100), y2: 39, stroke: "var(--line)" })); box.append(svg("text", { x: X(v / 100), y: 58, "font-size": 10, "text-anchor": "middle", fill: "var(--muted)" }, v + "%")); }
    box.append(svg("rect", { x: X(Math.max(.5, lo)), y: 25, width: Math.max(2, X(Math.min(1, hi)) - X(Math.max(.5, lo))), height: 18, rx: 4, fill: "var(--teal)", opacity: .35 }));
    box.append(svg("circle", { cx: X(p), cy: 34, r: 6, fill: "var(--accent)" }));
    const w = (hi - lo) * 100;
    $("ci-out").replaceChildren(el("b", {}, `Plausible range: ${(lo * 100).toFixed(1)}% to ${(hi * 100).toFixed(1)}%`), ` (${w.toFixed(1)} points wide). `,
      el("span", { class: "small" }, w > 15 ? "Too wide to rank two similar prompts." : w > 6 ? "Fine for spotting large differences only." : "Narrow enough to see differences of a few points."));
  }
  $("ci-p").oninput = $("ci-n").oninput = paintCi;
  paintCi();

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "Which part of an eval takes the most work and is most often skipped?",
      options: ["The scorer", "The dataset of inputs with known answers", "The report", "The model"],
      answer: 1, why: "Scoring code is short. Collecting representative inputs and establishing correct answers is the real investment." },
    { q: "Your tagger is marked wrong on a word where its answer is defensible. The best reading is…",
      options: ["The eval is useless", "Gold standards encode conventions and contain some errors; inspect the item before trusting either side", "The model is always right", "Remove the item silently"],
      answer: 1, why: "Gold is careful human convention, not truth. Reading disagreements often teaches you a rule, and sometimes finds a gold error." },
    { q: "In CoNLL-U, a line whose ID is “1-3” means…",
      options: ["three sentences", "words one to three are missing", "one written token that contains syntactic words 1, 2 and 3", "a comment"],
      answer: 2, why: "It is a multiword token. The following three lines hold the syntactic words. A scorer must skip the range line." },
    { q: "You measure 85% on 40 items. What can you claim?",
      options: ["Accuracy is 85%", "Accuracy is probably somewhere between roughly the low 70s and the low 90s", "Accuracy is above 90%", "Nothing at all"],
      answer: 1, why: "A small sample gives a wide interval. The number is an estimate with error bars." },
    { q: "Why keep a test set that you do not tune against?",
      options: ["To save money", "Because repeated tuning fits the prompt to the development items, so only untouched data shows whether gains are real", "Because treebanks require it", "To make the scores higher"],
      answer: 1, why: "A set you have optimised against overstates performance. The held-out set is the honest check." }
  ], "l09");

  mountSaved();
  mountFinish($("finish"), "l09");
})();
