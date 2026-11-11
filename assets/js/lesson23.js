// Lesson 23 interactives: sortable concordance with pattern counts, live report verifier.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);
  const first = s => (s.toLowerCase().match(/[a-z]+/) || [""])[0];
  const last = s => { const m = s.toLowerCase().match(/[a-z]+/g); return m ? m[m.length - 1] : ""; };

  /* ---------- 1. Sorted concordance ---------- */
  function table(hits) {
    const t = el("table", { class: "tight", style: "font-family:var(--mono);font-size:.74rem;white-space:nowrap;margin:.6em 0" });
    for (const h of hits) t.append(el("tr", {}, el("td", { style: "color:var(--muted)" }, h.id), el("td", { style: "text-align:right;max-width:150px;overflow:hidden;direction:rtl;text-overflow:ellipsis" }, el("bdi", {}, h.left)),
      el("td", { style: "font-weight:700;color:var(--accent);padding:5px 2px" }, h.kw), el("td", {}, h.right)));
    return t;
  }
  function paintSort() {
    const w = $("so-w").value.trim(), by = $("so-by").value, box = $("so-lines"), out = $("so-out"); box.replaceChildren(); out.replaceChildren();
    if (!w) return;
    let hits = Mini.concordance(w);
    if (!hits.length) { out.textContent = "No occurrences. Try run, light, issue or bank."; return; }
    const key = { right: h => first(h.right), left: h => last(h.left), genre: h => h.genre }[by];
    if (key) hits = hits.slice().sort((a, b) => key(a).localeCompare(key(b)));
    box.append(table(hits));
    const count = fn => { const c = {}; hits.forEach(h => { const k = fn(h); if (k) c[k] = (c[k] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1]).filter(x => x[1] > 1).slice(0, 5).map(([k, n]) => `${k} ×${n}`).join(", ") || "nothing repeats"; };
    out.append(el("b", {}, "Next word: "), count(h => first(h.right)), el("br"), el("b", {}, "Previous word: "), count(h => last(h.left)));
  }
  $("so-w").oninput = $("so-by").onchange = paintSort;
  paintSort();

  /* ---------- 2. Report verifier ---------- */
  const F = Mini.frequency("run"), LINES = Object.fromEntries(Mini.concordance("run").map(h => [h.id, h]));
  const freqBlock = () => Mini.GENRES.map(g => ({ genre: g, count: F[g].count }));
  const text = id => LINES[id].text;
  const GOOD = () => ({
    word: "run",
    frequency: freqBlock(),
    uses: [
      { label: "stand as a candidate", pattern: "run + for + office", genres: ["news"], evidence: ["n01", "n09"], example: text("n01") },
      { label: "manage an organisation", pattern: "run + organisation as object, or passive", genres: ["news"], evidence: ["n05", "n13"], example: text("n13") },
      { label: "move fast on foot", pattern: "ran + direction", genres: ["fiction", "news"], evidence: ["f01", "f06", "n14"], example: text("f01") },
      { label: "carry out a procedure", pattern: "run + experiment or model, often passive", genres: ["academic"], evidence: ["a01", "a04", "a09"], example: text("a04") }
    ]
  });
  const mutate = fn => { const r = GOOD(); fn(r); return r; };
  const CASES = {
    "Good report": GOOD,
    "Wrong count": () => mutate(r => { r.frequency[0].count += 5; }),
    "Invented line": () => mutate(r => { r.uses[0].evidence = ["n01", "n44"]; }),
    "Altered example": () => mutate(r => { r.uses[2].example = "She ran quickly down the stairs and into the street."; }),
    "Plausible, unsupported": () => mutate(r => { r.uses.push({ label: "operate a computer program", pattern: "run + software", genres: ["academic"], evidence: ["n10", "n17"], example: text("n10") }); })
  };
  function verify(r) {
    const p = [];
    if (!r || r.word !== "run" || !Array.isArray(r.uses)) return ["the report must have word “run” and a list of uses"];
    (r.frequency || []).forEach(f => { if (!F[f.genre]) p.push(`frequency: unknown genre “${f.genre}”`); else if (f.count !== F[f.genre].count) p.push(`frequency: ${f.genre} is given as ${f.count}; a recount finds ${F[f.genre].count}`); });
    r.uses.forEach((u, i) => {
      const n = `use ${i + 1} (${u.label})`, ev = Array.isArray(u.evidence) ? u.evidence : [];
      if (ev.length < 2) p.push(`${n}: fewer than two evidence lines`);
      ev.forEach(id => {
        if (!LINES[id]) p.push(`${n}: line ${id} does not exist or does not contain the word`);
        else if (!(u.genres || []).includes(LINES[id].genre)) p.push(`${n}: line ${id} is from ${LINES[id].genre}, which is not a genre this use names`);
      });
      if (!ev.some(id => LINES[id] && LINES[id].text === u.example)) p.push(`${n}: the example is not the exact text of a cited line`);
    });
    return p;
  }
  function paintVf() {
    const out = $("vf-out"); out.replaceChildren();
    let r; try { r = JSON.parse($("vf-json").value); } catch (e) { out.append(el("span", { class: "no" }, "Rejected: "), "not valid JSON."); return; }
    const p = verify(r);
    if (!p.length) { out.append(el("span", { class: "ok" }, "Verified. "), `${r.uses.length} uses, ${r.uses.reduce((s, u) => s + u.evidence.length, 0)} citations, all counts recounted. Whether the lines truly show each pattern still needs a reader.`); return; }
    out.append(el("span", { class: "no" }, `Rejected (${p.length}): `)); const ul = el("ul", { style: "margin:.4em 0 0;padding-left:1.2em" }); p.forEach(x => ul.append(el("li", {}, x))); out.append(ul);
  }
  for (const name of Object.keys(CASES)) $("vf-presets").append(el("button", { type: "button", style: "padding:5px 10px;font-size:.85rem", onclick() { $("vf-json").value = JSON.stringify(CASES[name](), null, 1); paintVf(); } }, name));
  $("vf-json").oninput = paintVf;
  $("vf-json").value = JSON.stringify(GOOD(), null, 1);
  paintVf();

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "What did the COBUILD approach change about making dictionaries?",
      options: ["It added pictures", "Entries were derived from the evidence of a large corpus instead of editors' intuition", "It removed example sentences", "It used only spoken language"],
      answer: 1, why: "Trust the text: the corpus decides what a word's common uses are." },
    { q: "Sorting a concordance by the word to the right of the keyword mainly reveals…",
      options: ["the word's frequency", "recurring continuations, such as “run for” and “run out”", "the genre of each line", "spelling mistakes"],
      answer: 1, why: "Lines with the same next word fall together, so patterns become visible blocks." },
    { q: "Why does a separate final call write the report from the notes alone?",
      options: ["To use more tokens", "So that the report can contain only what evidence was recorded for, and writing can be rerun without redoing the research", "Because the loop cannot produce text", "To avoid structured output"],
      answer: 1, why: "Separating investigation from writing keeps unrecorded impressions, and the model's memory, out of the report." },
    { q: "The instruction “your own knowledge of the word is a source of hypotheses, never of findings” guards against…",
      options: ["loops", "the model writing the report from memory and attaching citations afterwards", "long outputs", "tool errors"],
      answer: 1, why: "The model knows the word already. Without this, plausible uses appear that the corpus does not show." },
    { q: "Which check cannot be done by code alone?",
      options: ["That each cited line ID exists", "That stated counts match a recount", "That the grouping into uses is sensible and nothing important is missing", "That the example is verbatim"],
      answer: 2, why: "Existence, counts and exact text are mechanical. The quality of the analysis needs judgement, validated against a person." }
  ], "l23");

  mountSaved();
  mountFinish($("finish"), "l23");
})();
