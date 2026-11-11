// Lesson 21 interactives: context growth with compaction, register profiler, plan quiz.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);
  const SVG = "http://www.w3.org/2000/svg";
  const svg = (tag, attrs, text) => { const n = document.createElementNS(SVG, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text) n.textContent = text; return n; };

  /* ---------- 1. Context growth ---------- */
  function simulate(n, t, every) {
    const sizes = []; let ctx = 500, billed = 0;
    for (let i = 1; i <= n; i++) { ctx += t; sizes.push(ctx); billed += ctx; if (every && i % every === 0) ctx = 500 + 800; }
    return { sizes, billed };
  }
  function paintCg() {
    const n = +$("cg-n").value, t = +$("cg-t").value, on = $("cg-on").checked, every = Math.max(2, +$("cg-every").value || 10);
    $("cg-nv").textContent = n; $("cg-tv").textContent = t;
    const plain = simulate(n, t, 0), comp = simulate(n, t, every), box = $("cg-svg"); box.replaceChildren();
    const L = 40, R = 310, T = 12, B = 140, maxY = Math.max(...plain.sizes), X = i => L + i / (n - 1 || 1) * (R - L), Y = v => B - v / maxY * (B - T);
    box.append(svg("line", { x1: L, y1: B, x2: R, y2: B, stroke: "var(--line)" }), svg("line", { x1: L, y1: T, x2: L, y2: B, stroke: "var(--line)" }));
    const path = (arr, col, w, dash) => box.append(svg("path", { d: arr.map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1)).join(""), fill: "none", stroke: col, "stroke-width": w, "stroke-dasharray": dash || "" }));
    path(plain.sizes, on ? "var(--muted)" : "var(--accent)", on ? 1.5 : 2.5, on ? "4 4" : "");
    if (on) path(comp.sizes, "var(--teal)", 2.5);
    box.append(svg("text", { x: L - 4, y: T + 8, "font-size": 9, "text-anchor": "end", fill: "var(--muted)" }, Math.round(maxY / 1000) + "k"), svg("text", { x: L - 4, y: B, "font-size": 9, "text-anchor": "end", fill: "var(--muted)" }, "0"));
    box.append(svg("text", { x: (L + R) / 2, y: 158, "font-size": 10, "text-anchor": "middle", fill: "var(--muted)" }, `context sent at each step (1 to ${n})`));
    const fmt = v => v.toLocaleString("en"), out = $("cg-out"); out.replaceChildren(el("b", {}, `Without compaction: ${fmt(plain.billed)} input tokens billed`), `, final request ${fmt(plain.sizes[n - 1])} tokens. `);
    if (on) out.append(el("b", {}, `With compaction: ${fmt(comp.billed)}`), ` (${Math.round((1 - comp.billed / plain.billed) * 100)}% less), largest request ${fmt(Math.max(...comp.sizes))} tokens.`);
  }
  ["cg-n", "cg-t", "cg-on", "cg-every"].forEach(id => $(id).addEventListener("input", paintCg));
  paintCg();

  /* ---------- 2. Register profiler ---------- */
  const PRON = new Set("i you he she we they me him her us them my his our their".split(" "));
  const FEATS = [
    ["Words per sentence", (sents, toks) => toks.length / sents.length, 1],
    ["Personal pronouns per 100 words", (sents, toks) => toks.filter(t => PRON.has(t)).length / toks.length * 100, 1],
    ["Nominalisations per 100 words", (sents, toks) => toks.filter(t => t.length > 5 && /(tion|sion|ment|ity|ness|sis)$/.test(t)).length / toks.length * 100, 1],
    ["Passives per 10 sentences", (sents) => sents.filter(s => /\b(is|are|was|were|been|be)\s+(\w+ed|run|named|shed|given|taken|known)\b/i.test(s)).length / sents.length * 10, 1]
  ];
  const profile = text => { const sents = text.split(/(?<=[.!?])\s+/).filter(s => s.trim()), toks = Mini.tokens(text); return sents.length && toks.length ? FEATS.map(f => f[1](sents, toks)) : null; };
  const GP = Object.fromEntries(Mini.GENRES.map(g => [g, profile(Mini.RAW[g].join(" "))]));
  function paintReg() {
    const mine = profile($("rg-text").value), t = $("rg-table");
    t.replaceChildren(el("tr", {}, el("th", {}, "Feature"), ...Mini.GENRES.map(g => el("th", {}, g)), el("th", {}, "yours")));
    FEATS.forEach((f, i) => { const vals = Mini.GENRES.map(g => GP[g][i]), max = Math.max(...vals);
      t.append(el("tr", {}, el("td", {}, f[0]), ...vals.map(v => el("td", { style: v === max ? "font-weight:700;color:var(--accent)" : "" }, v.toFixed(1))), el("td", {}, mine ? mine[i].toFixed(1) : "–"))); });
    const out = $("rg-out"); out.replaceChildren();
    if (!mine) { out.textContent = "Paste a few sentences to compare."; return; }
    // Distance on features scaled by their range across genres, so no single feature dominates.
    const dist = g => FEATS.reduce((s, _, i) => { if (i === 0) return s; // sentence length barely differs between these genres, so it is shown but not used for matching
      const vals = Mini.GENRES.map(x => GP[x][i]), range = Math.max(...vals) - Math.min(...vals) || 1; return s + Math.pow((mine[i] - GP[g][i]) / range, 2); }, 0);
    const best = Mini.GENRES.reduce((a, b) => dist(b) < dist(a) ? b : a);
    out.append("Closest profile: ", el("b", {}, best), ". ", el("span", { class: "small" }, "Three crude grammatical features are enough to separate these genres most of the time, which shows how regular register differences are."));
  }
  $("rg-text").oninput = paintReg;
  paintReg();

  /* ---------- 3. Plans ---------- */
  mountQuiz($("pl-box"), [
    { q: "Which plan?",
      options: [
        "1. Search for “issue”. 2. Read the results. 3. Write the answer.",
        "1. Get frequency per genre. 2. Read concordance lines in each genre separately. 3. Record the patterns found in each, with line IDs. 4. Check collocates to confirm. 5. Compare genres and state which were covered.",
        "1. Define “issue” from the dictionary. 2. Write an essay on its history."],
      answer: 1, why: "It stratifies by genre, records evidence as it goes, confirms with a second instrument, and ends by stating coverage. The first is too vague to follow or check; the third ignores the corpus." },
    { q: "Halfway through, the agent finds “issue” is also a verb (“issue a statement”), which the plan did not anticipate. It should…",
      options: ["ignore it and finish the plan as written", "add a step to examine verb uses, saying why, and continue", "start again from nothing"],
      answer: 1, why: "A plan is a guide the agent may revise with a stated reason. Discarding the discovery wastes it; restarting wastes everything else." },
    { q: "Which finding is worth saving to notes?",
      options: ["“Called concordance on news.”", "“In news, ‘issue’ as a verb takes official documents as objects: statement, shares, permits (n03, n08, n15).”", "“The word issue is interesting.”"],
      answer: 1, why: "A specific claim with its evidence IDs. It can be verified later and survives compaction. The first is a log entry; the third says nothing." }
  ], "l21-plan");

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "An agent adds about the same number of tokens at every step. Total input tokens billed over the run grow roughly…",
      options: ["in proportion to the number of steps", "with the square of the number of steps", "not at all", "logarithmically"],
      answer: 1, why: "Each step re-sends all earlier steps. The sum 1 + 2 + … + n grows like n squared." },
    { q: "Why keep findings in notes instead of relying on a summary?",
      options: ["Notes are cheaper to generate", "A summary is lossy and a model chooses what it drops; notes preserve exact claims and evidence IDs", "Summaries cannot be read by models", "Notes need no tool"],
      answer: 1, why: "What must survive exactly should be written down exactly, outside the part of the context that gets compressed." },
    { q: "A register is…",
      options: ["a regional accent", "a variety of language associated with a situation of use, with measurable grammatical tendencies", "a list of rare words", "the same as a dialect"],
      answer: 1, why: "News, fiction and academic prose differ systematically. A claim about usage is always relative to register." },
    { q: "After compaction, what should be put back into the context?",
      options: ["Nothing", "The original goal, the plan and the notes, plus the most recent steps", "Every earlier tool result", "Only the system prompt"],
      answer: 1, why: "The agent needs to know what it is doing, what it has established, and what it was just working on." },
    { q: "The main risk in delegating to a sub-agent is that it…",
      options: ["uses the same model", "knows only what its instruction says, so a thin briefing produces off-target work", "cannot use tools", "shares the orchestrator's context"],
      answer: 1, why: "A fresh context is the benefit and the hazard. Brief a sub-agent as carefully as any prompt." }
  ], "l21");

  mountSaved();
  mountFinish($("finish"), "l21");
})();
