// Lesson 6 interactives: minimal-pair quiz, example-set builder, decomposition stepper.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);

  /* ---------- 1. Minimal pairs ---------- */
  mountQuiz($("mp-box"), [
    { q: "Which pair isolates the two uses of “to”?",
      options: ["“We went to Cairo.” / “She wants to study linguistics at a large university.”", "“We went to Cairo.” / “We want to go.”", "“To be or not to be.” / “Go to bed.”"],
      answer: 1, why: "Same subject, same length, nearly the same words. Only what follows “to” changes: a place (ADP) or a verb (PART)." },
    { q: "Which pair isolates NOUN against VERB for one word form?",
      options: ["“The play was long.” / “They play well.”", "“The play was long.” / “The film was long.”", "“They play well.” / “They sing well.”"],
      answer: 0, why: "The form “play” is constant and its class changes. The other two pairs swap the word and keep the class." },
    { q: "Why is a minimal pair a better teaching example than two unrelated sentences?",
      options: ["It is shorter, so it is cheaper", "Only one thing differs, so the change in the answer can only be due to that thing", "Models prefer sentences that rhyme"],
      answer: 1, why: "Holding everything else constant removes the other explanations. That is the whole method." }
  ], "l06-mp");

  /* ---------- 2. Example-set builder ---------- */
  const POOL = [
    { s: "That book is old.", tags: "that=DET, is=AUX", cov: ["that:DET", "cop"] },
    { s: "I think that it works.", tags: "that=SCONJ", cov: ["that:SCONJ"] },
    { s: "We went to Cairo.", tags: "to=ADP", cov: ["to:ADP"] },
    { s: "We want to leave.", tags: "to=PART", cov: ["to:PART"] },
    { s: "The cat sleeps.", tags: "nothing difficult", cov: [] },
    { s: "A dog barks loudly.", tags: "nothing difficult", cov: [] },
    { s: "Book the room.", tags: "book=VERB", cov: ["nv:VERB"] },
    { s: "Read the book.", tags: "book=NOUN", cov: ["nv:NOUN"] }
  ];
  const TARGETS = [
    { name: "“that”: DET or SCONJ", need: ["that:DET", "that:SCONJ"] },
    { name: "“to”: ADP or PART", need: ["to:ADP", "to:PART"] },
    { name: "copula is AUX", need: ["cop"] },
    { name: "same form as NOUN or VERB", need: ["nv:NOUN", "nv:VERB"] }
  ];
  const PER = 60; // rough tokens for one example with its JSON answer
  const picked = new Set();
  function paintPick() {
    const have = new Set([...picked].flatMap(i => POOL[i].cov)), out = $("pk-out"); out.replaceChildren();
    const ul = el("ul", { style: "margin:0 0 .6em;padding-left:1.2em" });
    for (const t of TARGETS) {
      const n = t.need.filter(x => have.has(x)).length;
      const [cls, mark, msg] = n === t.need.length ? ["ok", "✓", "taught"] : n ? ["no", "△", "one side only: the model may over-apply the use it saw"] : ["", "–", "left to the written guidelines"];
      ul.append(el("li", {}, el("span", { class: cls }, mark + " "), `${t.name}: ${msg}`));
    }
    const wasted = [...picked].filter(i => !POOL[i].cov.length).length;
    out.append(ul, el("b", {}, `${picked.size} example${picked.size === 1 ? "" : "s"} ≈ ${picked.size * PER} input tokens on every request`),
      ` (about ${(picked.size * PER * 10000).toLocaleString("en")} extra tokens per 10,000 requests).`);
    if (wasted) out.append(el("div", { class: "small", style: "margin-top:.4em" }, `${wasted} of your examples ${wasted === 1 ? "shows" : "show"} nothing the model would get wrong on its own.`));
    if (picked.size > 4) out.append(el("div", { class: "small", style: "margin-top:.4em" }, "Over the budget of four. What would you cut?"));
  }
  POOL.forEach((p, i) => {
    const cb = el("input", { type: "checkbox", id: "pk" + i });
    cb.onchange = () => { cb.checked ? picked.add(i) : picked.delete(i); paintPick(); };
    $("pk-pool").append(el("div", { style: "display:flex;gap:10px;align-items:flex-start;padding:6px 0;border-top:1px dashed var(--line)" },
      cb, el("label", { for: "pk" + i }, el("b", {}, p.s), el("span", { class: "small" }, "  " + p.tags))));
  });
  paintPick();

  /* ---------- 3. Decomposition stepper ---------- */
  const STEPS = [
    { who: "One prompt", cls: "user", text: "Tag each word with one UD tag.\n<sentence>وكتابها</sentence>",
      note: "The single-prompt version. The instruction says one tag per word, and there is one written word." },
    { who: "Output", cls: "assistant", text: '[{"form": "وكتابها", "upos": "NOUN"}]',
      note: "Valid, and the best available answer to a bad question. The conjunction and the pronoun have vanished. No amount of rewording fixes this, because the task was mis-specified." },
    { who: "Chain · step 1: segment", cls: "user", text: "Split the word into its syntactic words. Do not change any letters.\n<word>وكتابها</word>",
      note: "Start again with a chain. The first prompt has one job: find the units. It does not need to know anything about tags." },
    { who: "Output", cls: "assistant", text: '["و", "كتاب", "ها"]',
      note: "Three units. You can check this output with code before going on: joined together, the pieces must equal the original word." },
    { who: "Chain · step 2: tag", cls: "user", text: "Tag each unit with one UD tag.\n<units>و | كتاب | ها</units>",
      note: "The second prompt receives clean units, so “one tag per unit” is now a question with a right answer." },
    { who: "Output", cls: "assistant", text: '[{"form": "و", "upos": "CCONJ"},\n {"form": "كتاب", "upos": "NOUN"},\n {"form": "ها", "upos": "PRON"}]',
      note: "“And” + “book” + “her”. Two small prompts did what one could not, and each can be tested and improved separately." }
  ];
  let di;
  function resetDec() { di = 0; $("dc-msgs").replaceChildren(); $("dc-note").textContent = "Press “Next step”."; $("dc-next").disabled = false; }
  $("dc-next").onclick = () => {
    const s = STEPS[di++];
    $("dc-msgs").querySelectorAll(".new").forEach(n => n.classList.remove("new"));
    if (di === 3) $("dc-msgs").append(el("hr", { style: "border:0;border-top:2px solid var(--accent);width:100%;margin:4px 0" }));
    $("dc-msgs").append(el("div", { class: `msg ${s.cls} new`, dir: "auto", style: "white-space:pre-wrap" }, el("span", { class: "who" }, s.who), Site.iso(s.text)));
    $("dc-note").textContent = s.note;
    $("dc-next").disabled = di >= STEPS.length;
  };
  $("dc-reset").onclick = resetDec;
  resetDec();

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "When you add few-shot examples to a prompt, what changes in the model?",
      options: ["Its parameters are updated slightly", "Nothing: the examples are extra context, and it continues the pattern", "It is fine-tuned for the session", "Its vocabulary grows"],
      answer: 1, why: "In-context learning involves no training. Remove the examples and the effect is gone." },
    { q: "Your only example containing “that” tags it SCONJ. The likely effect on “that book”?",
      options: ["No effect", "It will more often be tagged SCONJ too", "It will be skipped", "The model will ask for clarification"],
      answer: 1, why: "One side of a distinction teaches a blanket rule. Show the contrasting case, ideally as a minimal pair." },
    { q: "Which example is least worth its tokens?",
      options: ["A sentence the model already handles correctly", "A minimal pair for a known confusion", "An Arabic sentence, when half your input is Arabic", "A sentence with unusual punctuation"],
      answer: 0, why: "Examples should spend tokens where the model would otherwise go wrong." },
    { q: "Instructions say “tag the copula AUX”; an example tags it VERB. What usually happens?",
      options: ["The instruction wins", "The example wins", "The request fails", "They cancel out"],
      answer: 1, why: "Examples are the stronger signal, which is why an error in an example spreads." },
    { q: "When is splitting a prompt into a chain the right move?",
      options: ["Always: more calls means more accuracy", "When an early decision, such as segmentation, determines everything after it and can be checked on its own", "When you want lower latency", "Never: one prompt is always better"],
      answer: 1, why: "Split at decisions that later steps depend on and that you can validate. Chains cost latency and can lose context, so they are a trade." }
  ], "l06");

  mountSaved();
  mountFinish($("finish"), "l06");
})();
