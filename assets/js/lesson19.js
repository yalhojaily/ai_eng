// Lesson 19 interactives: KWIC concordancer, agent trace with real tool results.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);

  // A concordance table shared by several lessons: right-aligned left context, bold keyword, left-aligned right context.
  function kwicTable(hits) {
    const t = el("table", { class: "tight", style: "font-family:var(--mono);font-size:.74rem;white-space:nowrap;margin:.6em 0" });
    for (const h of hits) t.append(el("tr", {}, el("td", { class: "small", style: "color:var(--muted)" }, h.id), el("td", { style: "text-align:right;max-width:150px;overflow:hidden;direction:rtl;text-overflow:ellipsis" }, el("bdi", {}, h.left)),
      el("td", { style: "font-weight:700;color:var(--accent);padding:5px 2px" }, h.kw), el("td", {}, h.right)));
    return t;
  }
  window.kwicTable = kwicTable;

  /* ---------- 1. KWIC ---------- */
  Mini.GENRES.forEach(g => $("kw-g").append(el("option", { value: g }, g)));
  function paintKwic() {
    const w = $("kw-w").value.trim(), g = $("kw-g").value, box = $("kw-lines"); box.replaceChildren();
    if (!w) { $("kw-sum").textContent = "Type a word."; return; }
    const hits = Mini.concordance(w, g || undefined), f = Mini.frequency(w);
    $("kw-sum").textContent = hits.length ? `${hits.length} occurrence${hits.length === 1 ? "" : "s"}` + (g ? ` in ${g}` : "") + ". By genre: " + Mini.GENRES.map(x => `${x} ${f[x].count}`).join(", ") + ". Forms searched: " + Mini.forms(w).join(", ") + "."
      : "No occurrences. The corpus has only 45 sentences; try run, light, issue, bank or said.";
    if (hits.length) box.append(kwicTable(hits));
  }
  ["run", "light", "issue", "bank"].forEach(w => $("kw-presets").append(el("button", { type: "button", style: "padding:5px 10px;font-size:.85rem", onclick() { $("kw-w").value = w; paintKwic(); } }, w)));
  $("kw-w").oninput = $("kw-g").onchange = paintKwic;
  paintKwic();

  /* ---------- 2. Agent trace ---------- */
  const rough = s => Math.ceil(s.length / 4);
  const freqText = () => { const f = Mini.frequency("run"); return Mini.GENRES.map(g => `${g}: ${f[g].count} occurrences in ${f[g].words} words (${f[g].per100.toFixed(1)} per 100 words)`).join("\n"); };
  const concText = g => { const h = Mini.concordance("run", g); return `${h.length} occurrences in ${g}; showing ${Math.min(6, h.length)}:\n` + h.slice(0, 6).map(x => `[${x.id}] ${x.text}`).join("\n"); };
  const STEPS = [
    { cls: "user", who: "Question", text: () => "Is “run” used differently in news and in fiction?" },
    { cls: "assistant", who: "Think", text: () => "Before reading examples I should know whether the word is common in both genres at all." },
    { cls: "assistant", who: "Act", text: () => 'frequency({"word": "run"})', code: true },
    { cls: "tool", who: "Observe", text: freqText, code: true },
    { cls: "assistant", who: "Think", text: () => "It occurs in every genre, so counts alone will not answer the question. The difference, if there is one, is in how it is used. I will read the news examples first." },
    { cls: "assistant", who: "Act", text: () => 'concordance({"word": "run", "genre": "news"})', code: true },
    { cls: "tool", who: "Observe", text: () => concText("news"), code: true },
    { cls: "assistant", who: "Think", text: () => "In news the subjects are people in office, companies and services, and what follows is “for”, “out of”, or an organisation. Now fiction, to compare." },
    { cls: "assistant", who: "Act", text: () => 'concordance({"word": "run", "genre": "fiction"})', code: true },
    { cls: "tool", who: "Observe", text: () => concText("fiction"), code: true },
    { cls: "assistant", who: "Answer", text: () => "Yes. In news, “run” is mostly institutional: standing for office (n01, n09), managing an organisation (n05, n13), and services operating (n10). In fiction it is physical: people and animals moving fast (f01, f06), and things moving over a surface or through the body (f05, f09). The two genres share the word and almost none of its uses. This rests on a very small sample." }
  ];
  let ti, ctx;
  function resetTrace() { ti = 0; ctx = 60; $("tr-msgs").replaceChildren(); $("tr-info").textContent = "Press “Next step”."; $("tr-next").disabled = false; }
  $("tr-next").onclick = () => {
    const s = STEPS[ti++], text = s.text();
    $("tr-msgs").querySelectorAll(".new").forEach(n => n.classList.remove("new"));
    $("tr-msgs").append(el("div", { class: `msg ${s.cls} new`, style: "white-space:pre-wrap" + (s.code ? ";font-size:.8rem" : "") }, el("span", { class: "who" }, s.who), s.code ? el("code", {}, text) : text));
    ctx += rough(text);
    const calls = STEPS.slice(0, ti).filter(x => x.who === "Act").length;
    $("tr-info").textContent = `Model requests so far: ${calls + (s.who === "Answer" ? 1 : 0)}. The next request will carry about ${ctx} tokens of history.`;
    $("tr-next").disabled = ti >= STEPS.length;
  };
  $("tr-reset").onclick = resetTrace;
  resetTrace();

  /* ---------- 3. Workflow or agent ---------- */
  const WA = ["Single call", "Workflow", "Agent"];
  mountQuiz($("wa-box"), [
    { q: "Tag every word of a sentence with its part of speech.", options: WA, answer: 0, why: "One well-specified transformation. A single call with a schema, as in Phase 2." },
    { q: "For each Arabic word: segment it, then tag the units, then find lemmas.", options: WA, answer: 1, why: "The steps and their order are known in advance. Code should hold the path, with gates between steps." },
    { q: "“Find out how the meaning of this word differs between genres and write up what you find, with evidence.”", options: WA, answer: 2, why: "What to look up next depends on what turns up. The path cannot be written beforehand." },
    { q: "Answer a question from five retrieved passages, with citations.", options: WA, answer: 1, why: "Retrieve, assemble, generate, verify: a fixed pipeline. It becomes an agent's job only when one retrieval is not enough." }
  ], "l19-wa");

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "What distinguishes an agent from a workflow?",
      options: ["An agent uses a larger model", "In an agent the model decides the next step; in a workflow your code does", "A workflow cannot call tools", "An agent needs no prompt"],
      answer: 1, why: "Same building blocks. The difference is who chooses the path." },
    { q: "A concordance in KWIC format is…",
      options: ["a list of word frequencies", "every occurrence of a word, aligned on the word, with context on each side", "a dictionary definition", "a kind of embedding"],
      answer: 1, why: "Aligning on the keyword lets you read down the column and see recurring patterns to its left and right." },
    { q: "Where does an agent keep its memory of what it has already done?",
      options: ["Inside the model's parameters", "In the list of messages, which is re-sent in full at every step", "On the provider's server", "In the tools"],
      answer: 1, why: "The model is stateless. The growing message list is the only memory, which is why cost climbs with every step." },
    { q: "Why must the step limit be enforced by your code?",
      options: ["Models cannot count", "Nothing guarantees the model will ever choose to stop", "It makes answers longer", "Providers require it"],
      answer: 1, why: "An agent can loop or search forever. Hard limits on steps, budget and time are the backstop." },
    { q: "An agent hits its step limit halfway through. The right behaviour is to…",
      options: ["return the partial work as if complete", "stop, report that the limit was reached, and return what was found so far", "start again from the beginning", "raise the limit automatically"],
      answer: 1, why: "Partial results presented as complete are the dangerous outcome. Say what happened." }
  ], "l19");

  mountSaved();
  mountFinish($("finish"), "l19");
})();
