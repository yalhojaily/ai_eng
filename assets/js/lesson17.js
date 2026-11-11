// Lesson 17 interactives: entailment quiz, citation gate, failure diagnosis.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);

  /* ---------- 1. Entailment ---------- */
  const NLI = ["Entailed", "Contradicted", "Not stated"];
  mountQuiz($("nli-box"), [
    { q: "“Arabic adjectives can be marked for the dual.”", options: NLI, answer: 0, why: "The source says Arabic marks the dual on nouns, adjectives and verbs. Accept the source and you must accept this." },
    { q: "“The dual is used for three or more entities.”", options: NLI, answer: 1, why: "The source says exactly two. Both cannot be true." },
    { q: "“Slovenian also has a dual.”", options: NLI, answer: 2, why: "True, as it happens, and the source says nothing about Slovenian. A RAG answer containing it would be unfaithful even though correct." },
    { q: "“English has no dual.”", options: NLI, answer: 2, why: "Plausible, and not something this passage settles. Mentioning Arabic does not exclude other languages. This is the kind of claim a model adds from memory." }
  ], "l17-nli");

  /* ---------- 2. Citation gate ---------- */
  const SRC = {
    c1: "The dual is a value of the Number feature used for exactly two entities. Arabic marks the dual on nouns, adjectives and verbs.",
    c2: "In Universal Dependencies the copula is tagged AUX, not VERB.",
    c3: "A multiword token is a single written token that corresponds to several syntactic words."
  };
  for (const [id, text] of Object.entries(SRC)) $("cg-sources").append(el("div", { class: "msg tool", style: "font-size:.88rem" }, el("span", { class: "who" }, "passage " + id), text));
  const good = [
    { text: "UD tags the copula as AUX.", cite: "c2", quote: "the copula is tagged AUX" },
    { text: "The dual marks exactly two entities.", cite: "c1", quote: "used for exactly two entities" }
  ];
  const CASES = {
    "Good answer": good,
    "Invented source": [good[0], { text: "The dual marks exactly two entities.", cite: "c7", quote: "used for exactly two entities" }],
    "Misquote": [{ text: "UD tags the copula as AUX.", cite: "c2", quote: "the copula is always tagged AUX in every language" }, good[1]],
    "Uncited claim": [...good, { text: "Most of the world's languages have a dual.", cite: "", quote: "" }],
    "Real quote, wrong claim": [{ text: "UD tags the copula as VERB.", cite: "c2", quote: "the copula is tagged AUX, not VERB" }, good[1]]
  };
  const squash = s => s.replace(/\s+/g, " ").trim();
  function check(sentences) {
    const p = [];
    if (!Array.isArray(sentences)) return ["the answer must be a list of sentences"];
    sentences.forEach((s, i) => {
      const n = i + 1;
      if (!s || typeof s.text !== "string") { p.push(`sentence ${n} has no text`); return; }
      if (!s.cite) p.push(`sentence ${n} has no citation`);
      else if (!(s.cite in SRC)) p.push(`sentence ${n} cites “${s.cite}”, which is not one of the passages`);
      else if (squash(s.quote || "").split(" ").length < 3) p.push(`sentence ${n}: the quote is too short to count as evidence`);
      else if (!squash(SRC[s.cite]).includes(squash(s.quote))) p.push(`sentence ${n}: the quote does not appear in ${s.cite}`);
    });
    return p;
  }
  function paintGate() {
    const out = $("cg-out"); out.replaceChildren();
    let v; try { v = JSON.parse($("cg-json").value); } catch (e) { out.append(el("span", { class: "no" }, "Rejected: "), "not valid JSON."); return; }
    const p = check(v);
    if (p.length) { out.append(el("span", { class: "no" }, "Rejected: ")); const ul = el("ul", { style: "margin:.4em 0 0;padding-left:1.2em" }); p.forEach(x => ul.append(el("li", {}, x))); out.append(ul); return; }
    out.append(el("span", { class: "ok" }, "Passed. "), "Every sentence cites an existing passage and quotes it exactly. ");
    if (v.some(s => /VERB\.?$/.test(s.text) && /AUX, not VERB/.test(s.quote))) out.append(el("span", { class: "no" }, "But read sentence 1 against its own quote."));
  }
  for (const name of Object.keys(CASES)) $("cg-presets").append(el("button", { type: "button", style: "padding:5px 10px;font-size:.85rem", onclick() { $("cg-json").value = JSON.stringify(CASES[name], null, 1); paintGate(); } }, name));
  $("cg-json").oninput = paintGate;
  $("cg-json").value = JSON.stringify(good, null, 1);
  paintGate();

  /* ---------- 3. Diagnosis ---------- */
  const ST = ["Retrieval", "Ranking", "Generation", "Abstention"];
  mountQuiz($("dx-box"), [
    { q: "The answer is wrong. The passage that contains the right answer is nowhere in the top 50.", options: ST, answer: 0, why: "The first stage lost it. Look at chunking, vocabulary and language before touching the prompt." },
    { q: "The right passage was retrieved at position 30, but only the top 5 were passed to the model.", options: ST, answer: 1, why: "It was found and then cut. A reranker, or a better one, is the fix." },
    { q: "The right passage is in the prompt as c2. The answer contradicts it and cites c2.", options: ST, answer: 2, why: "The model had the evidence and misused it. A faithfulness judge catches this; the citation gate alone does not." },
    { q: "The corpus has nothing on the question. The system answers fluently, citing a loosely related passage.", options: ST, answer: 3, why: "It should have said the sources do not cover this. Check the prompt's escape route and the score threshold." }
  ], "l17-dx");

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "A RAG answer includes a true fact that appears in none of the retrieved passages. The answer is…",
      options: ["faithful and correct", "correct but unfaithful", "faithful but incorrect", "neither"],
      answer: 1, why: "Faithfulness is about support in the sources, not truth. The system has no evidence for that fact and cannot tell it from an invented one." },
    { q: "Why ask for a verbatim quote with each citation?",
      options: ["To make answers longer", "Because code can verify an exact quote against the passage, with no model involved", "Quotes improve retrieval", "It lowers cost"],
      answer: 1, why: "An ID alone can be attached to anything. An exact quote either is in the passage or is not." },
    { q: "The citation gate passes. What has been established?",
      options: ["The answer is correct", "The cited passages exist and contain the quoted words", "Each sentence follows from its quote", "The retriever found everything relevant"],
      answer: 1, why: "The gate checks that evidence is real. Whether the sentence follows from it is entailment, a separate check." },
    { q: "Where should the escape route “say so if the passages do not contain the answer” be backed up?",
      options: ["Nowhere else", "In the schema, with a field for it, and in the eval set, with unanswerable questions", "Only in the retriever", "In the tokenizer"],
      answer: 1, why: "An instruction is not enough. The output format must allow abstention and the eval must count it." },
    { q: "Retrieved passages are placed inside tags and described as sources because…",
      options: ["tags reduce tokens", "retrieved text is outside data and may contain instruction-like text that must not be obeyed", "models cannot read plain text", "it improves recall"],
      answer: 1, why: "The use-and-mention point from Lesson 5 applies to every document you retrieve." }
  ], "l17");

  mountSaved();
  mountFinish($("finish"), "l17");
})();
