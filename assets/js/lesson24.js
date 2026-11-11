// Lesson 24 interactives: reliability over repeated runs, trajectory comparison.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);

  /* ---------- 1. Reliability ---------- */
  function paintRel() {
    const p = +$("rl-p").value / 100, k = +$("rl-k").value, all = Math.pow(p, k), any = 1 - Math.pow(1 - p, k);
    $("rl-pv").textContent = Math.round(p * 100) + "%"; $("rl-kv").textContent = k;
    const bars = $("rl-bars"); bars.replaceChildren();
    for (const [name, v, col] of [["succeeds on one run", p, "var(--muted)"], [`succeeds on all ${k}`, all, "var(--accent)"], [`succeeds at least once in ${k}`, any, "var(--teal)"]]) {
      const fill = el("i"); fill.style.width = (v * 100) + "%"; fill.style.background = col;
      bars.append(el("div", { class: "bar", style: "grid-template-columns: 150px 1fr 46px" }, el("span", { class: "w", style: "font-family:var(--sans);white-space:normal" }, name), el("span", { class: "t" }, fill), el("span", { class: "p" }, (v * 100).toFixed(0) + "%")));
    }
    $("rl-out").textContent = `A user who runs this task ${k} time${k === 1 ? "" : "s"} sees at least one failure with probability ${((1 - all) * 100).toFixed(0)}%. ` +
      (all < 0.5 ? "More likely than not, they will hit a failure." : "They will usually see it succeed every time.");
  }
  $("rl-p").oninput = $("rl-k").oninput = paintRel;
  paintRel();

  /* ---------- 2. Trajectories ---------- */
  const F = Mini.frequency("run"), top = Mini.GENRES.reduce((a, b) => F[b].per100 > F[a].per100 ? b : a);
  const fr = () => Mini.GENRES.map(g => `${g} ${F[g].per100.toFixed(1)}/100w`).join(", ");
  const conc = g => `${Mini.concordance("run", g).length} lines in ${g}`;
  const RUNS = {
    "Run A": { calls: [["frequency", '"run"', fr()]], answer: top, tokens: 900, verdict: ["ok", "One call to the right tool, and the answer follows from its result. Sound and economical."] },
    "Run B": { calls: [["concordance", '"run", "news"', conc("news")], ["concordance", '"run", "fiction"', conc("fiction")], ["concordance", '"run", "academic"', conc("academic")], ["concordance", '"run", "news"', conc("news")], ["frequency", '"run"', fr()], ["concordance", '"run", "fiction"', conc("fiction")]],
      answer: top, tokens: 7400, verdict: ["", "Correct, and sound in the end, but it read every line in every genre, twice in two cases, before using the tool made for the question. Eight times the cost of Run A."] },
    "Run C": { calls: [["define", '"run"', "8 dictionary senses"]], answer: top, tokens: 1100, verdict: ["no", "Correct by luck. No tool it called returns frequencies, so the answer came from the model's own guess about genres. An outcome-only eval would score this the same as Run A."] }
  };
  let cur = "Run A";
  function paintTj() {
    const r = RUNS[cur];
    $("tj-trace").textContent = r.calls.map(([n, a, res], i) => `${i + 1}. ${n}(${a})\n   → ${res}`).join("\n") + `\n\nAnswer: ${r.answer}`;
    const t = $("tj-table"); t.replaceChildren(el("tr", {}, ...["", "Correct", "Calls", "Repeated", "Tokens", "Used frequency"].map(h => el("th", {}, h))));
    for (const [name, x] of Object.entries(RUNS)) {
      const keys = x.calls.map(c => c[0] + c[1]), rep = keys.length - new Set(keys).size, usedF = x.calls.some(c => c[0] === "frequency");
      t.append(el("tr", name === cur ? { style: "background:var(--accent-soft)" } : {}, el("td", {}, name), el("td", { class: "ok" }, "✓"), el("td", {}, String(keys.length)), el("td", { class: rep ? "no" : "" }, String(rep)), el("td", {}, x.tokens.toLocaleString("en")), el("td", { class: usedF ? "ok" : "no" }, usedF ? "yes" : "no")));
    }
    $("tj-out").replaceChildren(el("b", { class: r.verdict[0] }, cur + ": "), r.verdict[1]);
    document.querySelectorAll("#tj-tabs button").forEach(b => b.classList.toggle("primary", b.textContent === cur));
  }
  for (const name of Object.keys(RUNS)) $("tj-tabs").append(el("button", { type: "button", onclick() { cur = name; paintTj(); } }, name));
  paintTj();

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "Why are corpus questions such as “which genre has the highest rate of this word?” good eval tasks for this agent?",
      options: ["They are easy", "Their correct answers can be computed exactly by a script, with no labelling or judge", "They need no tools", "They always have the answer yes"],
      answer: 1, why: "You hold the corpus, so code can produce ground truth, and a failure points to a specific wrong fact." },
    { q: "An agent succeeds on a task 90% of the time. The chance it succeeds on five runs in a row is about…",
      options: ["90%", "59%", "99%", "45%"],
      answer: 1, why: "0.9 to the fifth power is about 0.59. Dependability over repeated use falls much faster than the per-run rate suggests." },
    { q: "Two runs give the same correct answer. One called the frequency tool; the other called no tool that returns frequencies. What should your eval say?",
      options: ["Both pass", "The second fails a soundness check, because its answer has no evidence behind it", "The first fails for using too many tools", "Neither can be scored"],
      answer: 1, why: "Right answers reached without evidence are luck or memory. Trajectory checks test the method." },
    { q: "Where should a bug in a tool's arithmetic be caught?",
      options: ["In whole-agent runs", "In unit tests of the tool, with no model involved", "By the judge", "By users"],
      answer: 1, why: "Test the parts directly. They are fast and exact, and tool bugs otherwise masquerade as agent failures." },
    { q: "Version B scores 74% against version A's 71%, using nine times the tokens. The right report is…",
      options: ["“B is better”", "both accuracy and cost for each, so that the trade-off can be decided on purpose", "“A is better”", "accuracy only, since cost is an implementation detail"],
      answer: 1, why: "Cost is part of the result. An accuracy figure alone silently chooses the expensive option." }
  ], "l24");

  mountSaved();
  mountFinish($("finish"), "l24");
})();
