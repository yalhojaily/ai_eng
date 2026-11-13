// Lesson 32 interactives: flashcards, capstone checklist, final review.
(function () {
  const { el, store, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);

  /* ---------- 1. Flashcards ---------- */
  const CARDS = [
    ["Token", "One entry in a model's subword vocabulary: the unit it reads, writes and bills by. (Lesson 1)"],
    ["Morpheme", "The smallest unit of language that carries meaning, such as un-, read, -ing, or an Arabic root. (Lesson 1)"],
    ["Embedding", "A vector representing a token or a passage, placed so that similar meanings lie close together. (Lesson 2)"],
    ["Distributional hypothesis", "Words that occur in similar contexts tend to have similar meanings. (Lesson 2)"],
    ["Temperature", "A sampling setting that sharpens (low) or flattens (high) the next-token distribution. (Lesson 3)"],
    ["Constrained decoding", "At each step, removing every token the schema does not allow before sampling, so that output must conform. (Lesson 4)"],
    ["Minimal pair", "Two items identical except for one feature, used to isolate exactly that feature. (Lesson 6)"],
    ["Gate", "A check in ordinary code between steps that passes a result on or sends it back, usually testing an invariant. (Lesson 8)"],
    ["Gold standard", "Human-annotated answers that a system is scored against. A careful convention, not the truth. (Lesson 9)"],
    ["Precision and recall", "Of what the system flagged, the share that is right; of what is really there, the share it found. (Lesson 10)"],
    ["Cohen's kappa", "Agreement between two graders corrected for the agreement chance alone would produce. (Lesson 11)"],
    ["Regression", "Something that worked before a change and fails after it. (Lesson 12)"],
    ["BM25", "The standard word-matching ranking function: idf, with term frequency that saturates and a correction for document length. (Lesson 15)"],
    ["Cross-encoder", "A model that reads query and passage together and outputs one relevance score. Accurate, and too slow to run on everything. (Lesson 16)"],
    ["Entailment", "A text entails a claim if anyone who accepts the text must accept the claim. The test for a faithful answer. (Lesson 17)"],
    ["Agent", "A model in a loop that chooses its own next step using tools, until it judges the task done or a limit stops it. (Lesson 19)"],
    ["Prompt injection", "Instruction-like text placed where a model will read it, in the hope that it will be obeyed. (Lesson 22)"],
    ["Span", "One timed unit of work in a trace, with a parent and attributes. A trace is a tree of them. (Lesson 25)"],
    ["LoRA", "Fine-tuning that freezes the model and trains a small low-rank correction to its weight matrices. (Lesson 30)"],
    ["Quantization", "Storing each parameter with fewer bits by rounding it to one of a small set of values. (Lesson 31)"]
  ];
  let i = 0, shown = false; const marks = {};
  function paintFc() {
    $("fc-n").textContent = `Card ${i + 1} of ${CARDS.length}`; $("fc-term").textContent = CARDS[i][0];
    $("fc-def").textContent = shown ? CARDS[i][1] : "…"; $("fc-flip").textContent = shown ? "Hide definition" : "Show definition";
    const yes = Object.values(marks).filter(v => v).length, no = Object.values(marks).filter(v => v === false).length, out = $("fc-out"); out.replaceChildren();
    out.append(el("b", {}, `Knew ${yes} · to review ${no} · unseen ${CARDS.length - yes - no}. `));
    if (no) out.append(el("span", { class: "small" }, "Review: " + CARDS.filter((_, k) => marks[k] === false).map(c => c[0]).join(", ") + "."));
    else if (yes === CARDS.length) out.append(el("span", { class: "ok" }, "All twenty. Go and build."));
  }
  const next = v => { marks[i] = v; i = (i + 1) % CARDS.length; shown = false; paintFc(); };
  $("fc-flip").onclick = () => { shown = !shown; paintFc(); };
  $("fc-yes").onclick = () => next(true); $("fc-no").onclick = () => next(false);
  paintFc();

  /* ---------- 2. Capstone checklist ---------- */
  const ITEMS = [
    ["One repository, one config file pinning every model, prompt and index version", "Lesson 28"],
    ["Tokenisation view with morpheme comparison", "Phase 1"],
    ["Annotator with routing by language, gates and retries", "Phase 2"],
    ["Diacritiser: tuned, quantized, served locally, behind a letter-preservation gate", "Phase 7"],
    ["Guideline search with cross-lingual queries, reranking and cited answers", "Phase 4"],
    ["Research agent with plan, notes, limits and a verified report", "Phase 5"],
    ["One API over all capabilities, with jobs for the slow ones", "Lesson 28"],
    ["One trace per request spanning every component, with redaction", "Lesson 25"],
    ["Caches and budgets shared across components", "Lesson 27"],
    ["One eval command that scores every capability and prints one table", "Phase 3"],
    ["A regression gate that fails on a deliberately bad change", "Lesson 12"],
    ["Every metric reported by language, with baselines and test-set sizes", "Lessons 9, 18"],
    ["Daily metrics and one alert computed from traces", "Lesson 26"],
    ["Failure taxonomy from open coding, with counts", "Lesson 25"],
    ["The write-up, four pages", "This lesson"]
  ];
  function paintPlan() {
    const done = ITEMS.filter((_, k) => store.get("save:cap-" + k, false)).length;
    $("pl-fill").style.width = (done / ITEMS.length * 100) + "%";
    const left = ITEMS.filter((_, k) => !store.get("save:cap-" + k, false)), out = $("pl-out"); out.replaceChildren();
    out.append(el("b", {}, `${done} of ${ITEMS.length} done. `), done === ITEMS.length ? el("span", { class: "ok" }, "Send it to me.") : `Next: ${left[0][0].toLowerCase()} (${left[0][1]}).`);
  }
  ITEMS.forEach(([text, where], k) => {
    const cb = el("input", { type: "checkbox", id: "cap-" + k, "data-save": "cap-" + k, style: "width:20px;height:20px;margin-top:3px;flex:none;accent-color:var(--good)" });
    cb.addEventListener("change", () => setTimeout(paintPlan, 0));
    $("pl-list").append(el("div", { style: "display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-top:1px dashed var(--line)" }, cb, el("label", { for: "cap-" + k, style: "flex:1" }, text, el("span", { class: "small" }, "  " + where))));
  });

  /* ---------- Final review ---------- */
  mountQuiz($("quiz-box"), [
    { q: "Phase 1. Why does the same document cost more to process in Arabic than in English?",
      options: ["Arabic requests are priced higher", "Arabic text is split into more tokens per word, and price and limits are counted in tokens", "Models read right-to-left text twice", "It does not"],
      answer: 1, why: "The language tax: a consequence of byte-level subword vocabularies learned mostly from English." },
    { q: "Phase 1. A response validates against your JSON schema. You know that…",
      options: ["it is correct", "it has the right form", "the model was confident", "it cost less"],
      answer: 1, why: "Schemas check form. Correctness needs evidence." },
    { q: "Phase 2. The strongest single test of a prompt before running it:",
      options: ["Is it short?", "Could a capable newcomer do the task from this text alone?", "Does it use capitals?", "Is it polite?"],
      answer: 1, why: "The model has only the text, and will guess wherever a newcomer would have to ask." },
    { q: "Phase 2. A four-step chain where each step is 90% accurate, with no gates, is about…",
      options: ["90% accurate", "66% accurate", "36% accurate", "99% accurate"],
      answer: 1, why: "0.9 to the fourth power. Gates turn silent errors into retries." },
    { q: "Phase 3. Accuracy is 92% and macro-F1 is 0.61. This means…",
      options: ["a bug in the scorer", "good results on frequent classes and poor ones on some rare class", "the test set is too large", "nothing"],
      answer: 1, why: "Macro-F1 weights every class equally and exposes what accuracy hides." },
    { q: "Phase 3. Two prompt versions score the same. What do you look at?",
      options: ["Nothing: they are equivalent", "The items that flipped between them: fixed and broken", "The longer prompt", "The model card"],
      answer: 1, why: "Equal averages can conceal equal numbers of fixes and breaks." },
    { q: "Phase 4. For a model that reads the top five passages, the first-stage metric that matters most is…",
      options: ["precision@1", "recall@5", "latency", "idf"],
      answer: 1, why: "A passage that was not retrieved cannot be used." },
    { q: "Phase 4. A citation gate verifies the quote is in the passage. What remains unchecked?",
      options: ["That the passage exists", "That the sentence actually follows from the quote", "That the JSON is valid", "That the ID is a string"],
      answer: 1, why: "Real evidence is not the same as supported claim. That is entailment, and needs a judge." },
    { q: "Phase 5. An agent reports “the word does not occur” after a tool timed out and returned an empty result. The fix belongs in…",
      options: ["the system prompt", "the tool, which must distinguish “found nothing” from “could not look”", "the model", "the user's question"],
      answer: 1, why: "The agent reasoned soundly from a false observation." },
    { q: "Phase 5. An agent succeeded when you tried it. To know how dependable it is, you…",
      options: ["try it once more", "run a set of tasks several times each and report how many are solved every time, with cost", "read its prompt", "ask it"],
      answer: 1, why: "One run is one sample from a varying process." },
    { q: "Phase 6. No code changed, yet quality fell over a month. The first two suspects:",
      options: ["The tokenizer and the schema", "The model behind the name you call, and the questions users now ask", "The cache and the logs", "The step limit"],
      answer: 1, why: "Models are updated and inputs drift. Pin versions and watch input signals." },
    { q: "Phase 7. Before fine-tuning for a task, you must first have…",
      options: ["a GPU", "an eval, and a prompted baseline on it that is not good enough", "a larger model", "a million examples"],
      answer: 1, why: "Without the baseline you cannot know whether tuning was needed, or whether it helped." }
  ], "l32");

  mountSaved();
  paintPlan();
  mountFinish($("finish"), "l32");
})();
