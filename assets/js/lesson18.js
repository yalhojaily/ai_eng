// Lesson 18 interactives: lexical overlap across languages, strategy quiz, terminology quiz.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);

  /* ---------- 1. Lexical overlap ---------- */
  const tok = s => new Set((s.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []));
  function paintOv() {
    const p = tok($("ov-p").value), q = tok($("ov-q").value), shared = [...q].filter(t => p.has(t)), out = $("ov-out");
    out.replaceChildren();
    if (!q.size) { out.textContent = "Type a query."; return; }
    const union = new Set([...p, ...q]).size;
    out.append(el("b", {}, `${shared.length} of the query's ${q.size} words ${shared.length === 1 ? "appears" : "appear"} in the passage`), ` (overlap ${(shared.length / union).toFixed(2)}). `);
    if (shared.length) { out.append("Shared: "); shared.forEach(t => out.append(el("span", { class: "chip", style: "margin:2px" }, t))); }
    else out.append(el("span", { class: "no" }, "Nothing for word matching to score. BM25 returns zero for this passage."));
  }
  const PRE = { "Same words": "what is the dual number", "Paraphrase": "how do I mark a pair of something", "Arabic": "ما هو المثنى؟", "Code-switched": "ما معنى dual في القواعد؟" };
  for (const [name, q] of Object.entries(PRE)) $("ov-presets").append(el("button", { type: "button", style: "padding:5px 10px;font-size:.85rem", onclick() { $("ov-q").value = q; paintOv(); } }, name));
  $("ov-p").oninput = $("ov-q").oninput = paintOv;
  paintOv();

  /* ---------- 2. Strategy ---------- */
  const ST = ["Translate the query", "Translate the documents", "Multilingual embeddings"];
  mountQuiz($("st-box"), [
    { q: "A corpus of two million pages that changes every day.", options: ST, answer: 2, why: "Translating that much, and retranslating it daily, is impractical. Embedding each page once with a multilingual model scales, and so does translating only the query, which you could add alongside." },
    { q: "Users search for exact identifiers and tag names such as SCONJ, in Arabic sentences.", options: ST, answer: 0, why: "Exact strings need word matching, and word matching needs the query in the corpus's language. Translation restores BM25, and the code-switched term passes through unchanged." },
    { q: "A stable handbook of 200 pages, read mostly by Arabic speakers, where every answer will be quoted to the reader.", options: ST, answer: 1, why: "Small and stable makes one-time translation affordable, and an Arabic index lets you search and quote in the readers' language. Keep the English originals for verification." }
  ], "l18-st");

  /* ---------- 3. Terminology ---------- */
  mountQuiz($("tm-box"), [
    { q: "«المثنى»", options: ["the dual", "the double", "the plural"], answer: 0, why: "The grammatical number for exactly two. “The double” is a literal rendering that would retrieve nothing about grammar." },
    { q: "«المعرفة» (as a grammatical term)", options: ["knowledge", "the definite (noun)", "the subject"], answer: 1, why: "In everyday use it means knowledge. In grammar it is the definite noun, opposed to «النكرة», the indefinite. Context decides, and a bare query has none." },
    { q: "«حرف الجر»", options: ["the letter J", "the preposition", "the conjunction"], answer: 1, why: "Literally “particle of pulling”. It corresponds to the preposition, tagged ADP in Universal Dependencies." },
    { q: "«جمع التكسير»", options: ["the regular plural", "the broken plural", "the collective noun"], answer: 1, why: "The plural formed by changing the word's internal pattern, as in «كتاب» / «كتب»: the forms that defeated the stemmer in Lesson 15." }
  ], "l18-tm");

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "An Arabic query is run with BM25 against an English corpus. The typical result is…",
      options: ["slightly lower scores", "zero for every document, because no tokens are shared", "the same as in English", "an error"],
      answer: 1, why: "Different scripts share no word forms. Lexical matching has nothing to work with." },
    { q: "How are multilingual embedding models made to place a sentence near its translation?",
      options: ["By sharing a dictionary at query time", "By training on translation pairs with an objective that pulls each pair together", "By translating everything to English first", "By using larger vectors"],
      answer: 1, why: "Alignment is learned from parallel text. Where parallel text is scarce, alignment is weaker." },
    { q: "Why ask the model for several translations of a short query?",
      options: ["To use more tokens", "A short query has little context, so covering the plausible readings and the technical sense hedges against a wrong single translation", "Because models cannot produce one", "To slow down attackers"],
      answer: 1, why: "Query expansion. Search with each and fuse; a correct reading among them is enough." },
    { q: "The answer is written in Arabic from English passages. In which language must the citation's quote be?",
      options: ["Arabic", "English, exactly as in the passage, so that the gate can verify it", "Either", "Neither: quotes are optional"],
      answer: 1, why: "The gate compares characters. A translated quote cannot be verified by code; show a marked translation beside the original." },
    { q: "Your system scores recall@5 of 0.84 overall. What should you report?",
      options: ["0.84", "The score for each query language separately, and the gap between them", "Only the English score", "Only the best score"],
      answer: 1, why: "An overall number averages two different experiences. The per-language gap is what your non-English users feel." }
  ], "l18");

  mountSaved();
  mountFinish($("finish"), "l18");
})();
