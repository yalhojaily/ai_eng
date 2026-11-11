// Lesson 20 interactives: raw vs normalised frequency, tool-output designer, error-message quiz.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);

  /* ---------- 1. Raw vs normalised ---------- */
  function bars(root, rows, fmt) {
    root.replaceChildren(); const max = Math.max(...rows.map(r => r[1]), 1e-9);
    rows.forEach(([name, v, top]) => { const fill = el("i"); fill.style.width = (v / max * 100) + "%"; if (top) fill.style.background = "var(--accent)";
      root.append(el("div", { class: "bar", style: "grid-template-columns: 84px 1fr 54px" }, el("span", { class: "w" }, name), el("span", { class: "t" }, fill), el("span", { class: "p" }, fmt(v)))); });
  }
  function paintNf() {
    const w = $("nf-w").value.trim(), out = $("nf-out"); out.replaceChildren();
    if (!w) return;
    const f = Mini.frequency(w), G = Mini.GENRES, total = G.reduce((s, g) => s + f[g].count, 0);
    if (!total) { $("nf-raw").replaceChildren(); $("nf-norm").replaceChildren(); out.textContent = "Not in this corpus. Try run, issue, light, bank, said or the."; return; }
    const topRaw = G.reduce((a, b) => f[b].count > f[a].count ? b : a), topNorm = G.reduce((a, b) => f[b].per100 > f[a].per100 ? b : a);
    bars($("nf-raw"), G.map(g => [g, f[g].count, g === topRaw]), v => String(v));
    bars($("nf-norm"), G.map(g => [g, f[g].per100, g === topNorm]), v => v.toFixed(1));
    out.append(el("span", { class: "small" }, "Genre sizes: " + G.map(g => `${g} ${f[g].words} words`).join(", ") + ". "),
      topRaw === topNorm ? `Both charts put ${topRaw} first.` : el("b", { class: "no" }, `Raw counts put ${topRaw} first; normalised rates put ${topNorm} first.`));
  }
  ["run", "issue", "light", "bank", "the"].forEach(w => $("nf-presets").append(el("button", { type: "button", style: "padding:5px 10px;font-size:.85rem", onclick() { $("nf-w").value = w; paintNf(); } }, w)));
  $("nf-w").oninput = paintNf;
  paintNf();

  /* ---------- 2. Tool-output designer ---------- */
  const OPTS = [
    { id: "limit", name: "Cap at 6 lines", on: false },
    { id: "count", name: "Say how many exist", on: false },
    { id: "ids", name: "Line IDs", on: false },
    { id: "genre", name: "Genre labels", on: false },
    { id: "rates", name: "Rates per genre", on: false }
  ];
  const state = Object.fromEntries(OPTS.map(o => [o.id, o.on]));
  function paintRd() {
    const hits = Mini.concordance("run"), shown = state.limit ? hits.slice(0, 6) : hits, f = Mini.frequency("run"), lines = [];
    if (state.count) lines.push(state.limit ? `${hits.length} occurrences of "run" (run, runs, ran, running). Showing ${shown.length}. Narrow by genre to see others.` : `${hits.length} occurrences of "run" (run, runs, ran, running).`);
    if (state.rates) lines.push("Per 100 words: " + Mini.GENRES.map(g => `${g} ${f[g].per100.toFixed(1)}`).join(", ") + ".");
    shown.forEach(h => lines.push((state.ids ? `[${h.id}] ` : "") + (state.genre ? `(${h.genre}) ` : "") + h.text));
    const text = lines.join("\n"); $("rd-out").textContent = text;
    const notes = [];
    if (!state.limit) notes.push(["no", `Unbounded: all ${hits.length} lines here, and thousands for a common word in a real corpus.`]);
    if (state.limit && !state.count) notes.push(["no", "Silently truncated: the agent will treat six lines as the whole picture."]);
    if (!state.ids) notes.push(["no", "No IDs: the final answer cannot point to its evidence, and your code cannot verify it."]);
    if (!state.genre && !state.ids) notes.push(["no", "No genre shown: the agent cannot compare usage across kinds of text from this result."]);
    if (!state.rates) notes.push(["", "No rates: to compare genres the agent must make a second call, or worse, count lines itself."]);
    const out = $("rd-notes"); out.replaceChildren(el("b", {}, `About ${Math.ceil(text.length / 4)} tokens, re-sent at every later step. `));
    if (!notes.some(n => n[0] === "no")) out.append(el("span", { class: "ok" }, "Bounded, honest and citable. "));
    const ul = el("ul", { style: "margin:.4em 0 0;padding-left:1.2em" }); notes.forEach(([c, t]) => ul.append(el("li", { class: c, style: c ? "" : "font-weight:400" }, t))); if (notes.length) out.append(ul);
  }
  OPTS.forEach(o => { const cb = el("input", { type: "checkbox" }); cb.checked = o.on; cb.onchange = () => { state[o.id] = cb.checked; paintRd(); };
    $("rd-toggles").append(el("label", { style: "border:1px solid var(--line);border-radius:99px;padding:4px 10px;font-size:.88rem;background:var(--paper)" }, cb, " " + o.name)); });
  paintRd();

  /* ---------- 3. Error messages ---------- */
  mountQuiz($("er-box"), [
    { q: "The agent called concordance(word=\"run\", genre=\"newspapers\").",
      options: ["KeyError: 'newspapers'", "Error: invalid input.", "Unknown genre “newspapers”. Valid genres: news, fiction, academic."],
      answer: 2, why: "It names the problem and lists the legal values, so the next call can be right. The other two leave the agent guessing." },
    { q: "The agent searched for a word that does not occur.",
      options: ["[]", "0 occurrences of “serendipity” in any genre. The corpus is small; check the spelling or try a more common word.", "null"],
      answer: 1, why: "An empty list is ambiguous: no hits, or a failure? Saying so plainly, with a suggestion, prevents a wasted retry of the same call." },
    { q: "The corpus files could not be read because of a server fault.",
      options: ["0 occurrences found.", "The corpus is temporarily unavailable (storage error). This is not a problem with your query; do not conclude the word is absent. Stop and report this.", "Traceback (most recent call last): File \"tools.py\", line 88 …"],
      answer: 1, why: "The first is the dangerous one: a failure disguised as a finding, which the agent will report as fact. Distinguish “nothing there” from “could not look”." }
  ], "l20-err");

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "A word occurs 40 times in a 200,000-word corpus and 30 times in a 50,000-word corpus. Where is it more frequent?",
      options: ["The first: 40 is more than 30", "The second: 600 per million against 200 per million", "They are equal", "It cannot be determined"],
      answer: 1, why: "Normalise before comparing. 40 in 200,000 is 200 per million; 30 in 50,000 is 600 per million." },
    { q: "A tool returns the first 8 of 3,412 matching lines without saying so. The main danger is that the agent…",
      options: ["runs out of tokens", "reasons from the eight as if they were all the evidence", "calls the tool again", "ignores the result"],
      answer: 1, why: "Silent truncation turns a sample into a false totality. Always state how much there is and how much is shown." },
    { q: "Why should a concordance tool search by lemma by default?",
      options: ["It is faster", "Otherwise the agent must guess every inflected form, and will miss some", "Lemmas are shorter", "Models cannot read inflected words"],
      answer: 1, why: "Make the obvious thing the default. Offer an exact-form option for when it is wanted." },
    { q: "Ranking collocates by PMI with no minimum count tends to put what at the top?",
      options: ["The most common function words", "Rare words that co-occurred once or twice by accident", "The word itself", "Nothing"],
      answer: 1, why: "PMI inflates rare coincidences. A minimum co-occurrence count filters the noise." },
    { q: "Two of your tools are often confused by the agent. The best fix is usually to…",
      options: ["add a paragraph to the system prompt explaining the difference", "merge them, or redesign so that their names and purposes clearly differ", "add a third tool", "raise the temperature"],
      answer: 1, why: "Overlap is a design problem. Fixing it at the tool level works on every call; prompt explanations work some of the time." }
  ], "l20");

  mountSaved();
  mountFinish($("finish"), "l20");
})();
