// Lesson 13 interactives: live tf-idf search, sparse-or-dense quiz.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);

  /* ---------- 1. tf-idf search ---------- */
  const DOCS = [
    ["Number", "Nouns can be singular or plural. English marks the plural with the ending s."],
    ["Dual", "The dual is a number value for exactly two things. Arabic nouns have a dual form."],
    ["Definiteness", "The definite article marks a noun as already known to the listener."],
    ["Tense", "Tense locates an event in time: past, present or future."],
    ["Aspect", "Aspect describes whether an action is complete or still going on."],
    ["Clitics", "A clitic is a short word that attaches to a neighbouring word, like the Arabic conjunction wa."],
    ["Copula", "The copula links a subject to a description, as in she is tall."],
    ["Gender", "Nouns may be masculine or feminine, and adjectives agree with the noun."]
  ];
  const tok = s => (s.toLowerCase().match(/[a-z]+/g) || []);
  const N = DOCS.length, bags = DOCS.map(d => { const c = {}; tok(d[1]).forEach(t => c[t] = (c[t] || 0) + 1); return c; });
  const df = {}; bags.forEach(b => Object.keys(b).forEach(t => df[t] = (df[t] || 0) + 1));
  const idf = t => df[t] ? Math.log(N / df[t]) : 0;
  const vec = bag => { const v = {}; let n = 0; for (const t in bag) { v[t] = bag[t] * idf(t); n += v[t] * v[t]; } n = Math.sqrt(n); if (n) for (const t in v) v[t] /= n; return v; };
  const dvecs = bags.map(vec);
  function paintTf() {
    const qt = tok($("tf-q").value), qbag = {}; qt.forEach(t => qbag[t] = (qbag[t] || 0) + 1);
    const qv = vec(qbag), terms = $("tf-terms"); terms.replaceChildren();
    if (!qt.length) { terms.textContent = "Type a query."; $("tf-results").replaceChildren(); return; }
    terms.append(el("span", { class: "small" }, "Query words and their idf: "));
    [...new Set(qt)].forEach(t => terms.append(el("span", { class: "chip" + (df[t] ? "" : " plain"), style: "margin:2px" }, df[t] ? `${t}  idf ${idf(t).toFixed(2)} (in ${df[t]} of ${N})` : `${t}  not in any document`)));
    const scored = DOCS.map((d, i) => { let s = 0; const hit = []; for (const t in qv) if (dvecs[i][t]) { s += qv[t] * dvecs[i][t]; hit.push(t); } return { d, s, hit }; }).sort((a, b) => b.s - a.s);
    const res = $("tf-results"); res.replaceChildren();
    if (!scored[0].s) { res.append(el("div", { class: "out" }, el("span", { class: "no" }, "No document scores above zero. "), "None of the query's words appears anywhere, or the only matches are words found in every document.")); return; }
    scored.filter(x => x.s > 0).slice(0, 4).forEach((x, r) => {
      const fill = el("i", { style: `display:block;height:100%;background:var(--teal);width:${x.s * 100}%` });
      res.append(el("div", { class: "msg", style: "margin:8px 0" }, el("span", { class: "who" }, `#${r + 1} · ${x.d[0]} · score ${x.s.toFixed(2)} · matched: ${x.hit.join(", ")}`), x.d[1],
        el("div", { style: "height:6px;background:var(--line);border-radius:4px;margin-top:6px;overflow:hidden" }, fill)));
    });
  }
  ["dual number", "the noun", "plural", "more than one", "two things", "pair"].forEach(q => $("tf-presets").append(el("button", { type: "button", style: "padding:5px 10px;font-size:.85rem", onclick() { $("tf-q").value = q; paintTf(); } }, q)));
  $("tf-q").oninput = paintTf;
  paintTf();

  /* ---------- 2. Sparse or dense ---------- */
  const OPT = ["Word matching (sparse)", "Embeddings (dense)"];
  mountQuiz($("bet-box"), [
    { q: "“SCONJ”", options: OPT, answer: 0, why: "An exact, rare code. Word matching finds the pages that contain it; an embedding model may never have learned a useful vector for it." },
    { q: "“a word that joins two sentences together”", options: OPT, answer: 1, why: "A description in everyday words that shares almost nothing with the guideline's own wording. This is paraphrase, where embeddings help." },
    { q: "“error code E-4471 in the annotation tool”", options: OPT, answer: 0, why: "Identifiers must match exactly. Dense vectors tend to treat similar-looking codes as near-identical." },
    { q: "“how do I mark that there are exactly two of something”", options: OPT, answer: 1, why: "The page says “dual”; the query never does. Only a meaning-based comparison bridges that." }
  ], "l13-bet");

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "Why are document vectors computed ahead of time in a retrieval system?",
      options: ["To make them more accurate", "So that at query time only the short query needs processing, and scoring the whole collection is cheap", "Because models cannot embed queries", "To avoid storing the documents"],
      answer: 1, why: "The expensive work is done once, offline. Query time is one embedding and a batch of comparisons." },
    { q: "A word occurs in every document of the collection. Its idf is…",
      options: ["very high", "zero", "negative", "equal to its term frequency"],
      answer: 1, why: "log(N / N) = log(1) = 0. A word that appears everywhere cannot distinguish one document from another." },
    { q: "The query “more than one” fails to find a page about the plural. This is an example of…",
      options: ["a tokenizer bug", "the vocabulary mismatch problem", "overfitting", "position bias"],
      answer: 1, why: "Same meaning, no shared words. Word matching has nothing to hold on to." },
    { q: "In a bi-encoder, the query and the document are…",
      options: ["read together by one model call", "embedded separately by the same model, then compared", "translated into the same language", "matched word by word"],
      answer: 1, why: "Separate encoding is what allows documents to be embedded in advance." },
    { q: "When do you need an approximate nearest-neighbour index?",
      options: ["Always, from the first prototype", "When comparing the query with every stored vector has become too slow, which you should measure", "Only for Arabic", "Never: brute force is always fast enough"],
      answer: 1, why: "Brute force over thousands of vectors is instant. Add machinery when a measurement says you need it." }
  ], "l13");

  mountSaved();
  mountFinish($("finish"), "l13");
})();
