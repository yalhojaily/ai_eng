// Lesson 10 interactives: editable confusion matrix with live metrics, precision/recall by hand.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);

  /* ---------- 1. Confusion matrix ---------- */
  const TAGS = ["NOUN", "VERB", "AUX"];
  const PRESETS = {
    "Solid tagger": [[57, 3, 0], [4, 24, 2], [0, 2, 8]],
    "Loses AUX": [[59, 1, 0], [2, 28, 0], [0, 9, 1]],
    "Always says NOUN": [[60, 0, 0], [30, 0, 0], [10, 0, 0]]
  };
  let M = PRESETS["Solid tagger"].map(r => r.slice());
  const inputs = [];
  function buildTable() {
    const t = $("cm-table");
    t.append(el("tr", {}, el("th", {}, "gold ↓ / said →"), ...TAGS.map(x => el("th", {}, x))));
    TAGS.forEach((g, i) => {
      const row = el("tr", {}, el("th", {}, g)); inputs[i] = [];
      TAGS.forEach((p, j) => {
        const inp = el("input", { type: "number", min: "0", "aria-label": `gold ${g}, predicted ${p}`, style: "width:62px;text-align:center" + (i === j ? ";border-color:var(--good);font-weight:700" : "") });
        inp.oninput = () => { M[i][j] = Math.max(0, Math.floor(+inp.value || 0)); paintCm(); };
        inputs[i][j] = inp; row.append(el("td", {}, inp));
      });
      t.append(row);
    });
  }
  function paintCm(sync) {
    if (sync) TAGS.forEach((_, i) => TAGS.forEach((_, j) => inputs[i][j].value = M[i][j]));
    const total = M.flat().reduce((a, b) => a + b, 0), right = TAGS.reduce((s, _, i) => s + M[i][i], 0);
    const mt = $("cm-metrics"); mt.replaceChildren(el("tr", {}, ...["Class", "Precision", "Recall", "F1"].map(h => el("th", {}, h))));
    let sumF = 0;
    TAGS.forEach((t, i) => {
      const col = TAGS.reduce((s, _, r) => s + M[r][i], 0), row = M[i].reduce((a, b) => a + b, 0);
      const P = col ? M[i][i] / col : 0, R = row ? M[i][i] / row : 0, F = P + R ? 2 * P * R / (P + R) : 0; sumF += F;
      const pct = (v, def) => def ? (v * 100).toFixed(0) + "%" : "n/a";
      mt.append(el("tr", {}, el("td", {}, t), el("td", {}, pct(P, col)), el("td", { class: R < 0.5 && row ? "no" : "" }, pct(R, row)), el("td", {}, F.toFixed(2))));
    });
    const acc = total ? right / total : 0, macro = sumF / TAGS.length;
    $("cm-sum").replaceChildren(el("b", {}, `Accuracy ${(acc * 100).toFixed(0)}%`), " · ", el("b", {}, `macro-F1 ${macro.toFixed(2)}`), ` · ${total} words. `,
      el("span", { class: "small" }, acc - macro > 0.15 ? "Accuracy is far above macro-F1: at least one class is being neglected." : "Accuracy and macro-F1 are close: performance is fairly even across classes."));
  }
  buildTable();
  for (const name of Object.keys(PRESETS)) $("cm-presets").append(el("button", { type: "button", onclick() { M = PRESETS[name].map(r => r.slice()); paintCm(true); } }, name));
  paintCm(true);

  /* ---------- 2. By hand ---------- */
  mountQuiz($("pr-box"), [
    { q: "Precision for AUX?", options: ["50%", "80%", "62%"], answer: 1, why: "8 correct out of the 10 it labelled AUX: 8 / 10." },
    { q: "Recall for AUX?", options: ["50%", "80%", "62%"], answer: 0, why: "8 found out of the 16 that exist: 8 / 16." },
    { q: "F1 for AUX?", options: ["0.65 (the plain average)", "about 0.62", "0.80"], answer: 1, why: "2 × 0.8 × 0.5 / (0.8 + 0.5) ≈ 0.62. The harmonic mean sits nearer the lower value than the plain average does." }
  ], "l10-hand");

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "A tagger reaches 60% accuracy. What do you need to know before judging it?",
      options: ["The model's size", "What a trivial baseline, such as always answering the most common tag, scores on the same data", "The temperature used", "Nothing more"],
      answer: 1, why: "If the baseline is also 60%, the system has learned nothing. Accuracy means something only relative to a floor." },
    { q: "In a confusion matrix with gold as rows, a large number in row AUX, column VERB means…",
      options: ["many verbs were called AUX", "many real AUX words were called VERB", "AUX and VERB are both accurate", "the matrix is wrong"],
      answer: 1, why: "Row is the truth, column is what the system said. This cell lowers AUX recall and VERB precision." },
    { q: "A system labels a word AUX only when it is extremely sure. Expect…",
      options: ["high precision, low recall", "low precision, high recall", "both high", "both low"],
      answer: 0, why: "Few false alarms, many misses. The trade-off runs the other way for an eager system." },
    { q: "Accuracy is 92% and macro-F1 is 0.61. The most likely situation?",
      options: ["A scoring bug", "The system does well on frequent classes and badly on one or more rare ones", "The test set is too small", "Precision equals recall"],
      answer: 1, why: "Macro-F1 weights every class equally, so a neglected rare class drags it down while barely touching accuracy." },
    { q: "Gold has three words where your system produced two. A fair way to proceed is to…",
      options: ["compare the first two and ignore the third", "score tags only where segmentation matches, and report the segmentation match rate separately", "count the sentence as fully correct", "delete the sentence from the dataset"],
      answer: 1, why: "Position-by-position comparison is meaningless once the units differ. Measure the segmentation stage on its own." }
  ], "l10");

  mountSaved();
  mountFinish($("finish"), "l10");
})();
