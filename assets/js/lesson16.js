// Lesson 16 interactives: ranking metrics calculator, rerank-everything arithmetic.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);

  /* ---------- 1. Metrics ---------- */
  const rel = [false, true, false, false, true, false, false, true, false, false];
  const buttons = rel.map((_, i) => {
    const b = el("button", { type: "button", "aria-pressed": "false", style: "min-width:44px;padding:8px 0" }, String(i + 1));
    b.onclick = () => { rel[i] = !rel[i]; paintMet(); };
    $("mt-list").append(b); return b;
  });
  function paintMet() {
    const k = +$("mt-k").value, found = rel.filter(Boolean).length;
    const totalInp = $("mt-total"); if (+totalInp.value < found) totalInp.value = found;
    const total = Math.max(1, +totalInp.value || 1);
    $("mt-kv").textContent = k;
    buttons.forEach((b, i) => {
      b.setAttribute("aria-pressed", rel[i]);
      b.style.background = rel[i] ? "var(--good-soft)" : "var(--card)"; b.style.borderColor = rel[i] ? "var(--good)" : "var(--line)";
      b.style.opacity = i < k ? 1 : .4;
    });
    const hits = rel.slice(0, k).filter(Boolean).length, first = rel.indexOf(true);
    let dcg = 0, idcg = 0;
    for (let i = 0; i < k; i++) { if (rel[i]) dcg += 1 / Math.log2(i + 2); if (i < total) idcg += 1 / Math.log2(i + 2); }
    const out = $("mt-out"); out.replaceChildren(
      el("b", {}, `Recall@${k} ${(hits / total).toFixed(2)}`), ` (${hits} of ${total} relevant found) · `,
      el("b", {}, `Precision@${k} ${(hits / k).toFixed(2)}`), ` (${hits} of ${k} shown are relevant) · `,
      el("b", {}, `Reciprocal rank ${first < 0 ? "0" : (1 / (first + 1)).toFixed(2)}`), first < 0 ? " (nothing relevant in the list) · " : ` (first relevant at position ${first + 1}) · `,
      el("b", {}, `nDCG@${k} ${(idcg ? dcg / idcg : 0).toFixed(2)}`));
  }
  $("mt-k").oninput = $("mt-total").oninput = paintMet;
  paintMet();

  /* ---------- 2. Funnel arithmetic ---------- */
  const human = ms => ms < 1000 ? `${Math.round(ms)} ms` : ms < 60000 ? `${(ms / 1000).toFixed(1)} seconds` : ms < 3600000 ? `${(ms / 60000).toFixed(1)} minutes` : ms < 86400000 ? `${(ms / 3600000).toFixed(1)} hours` : `${(ms / 86400000).toFixed(1)} days`;
  function paintFun() {
    const n = Math.round(Math.pow(10, +$("fn-n").value)), k = +$("fn-k").value, ms = +$("fn-ms").value;
    $("fn-nv").textContent = n.toLocaleString("en"); $("fn-kv").textContent = k; $("fn-mv").textContent = ms;
    const all = n * ms, two = 30 + k * ms;
    $("fn-out").replaceChildren(
      el("div", {}, el("b", {}, "Cross-encode every chunk: "), `${n.toLocaleString("en")} model runs, about ${human(all)} per query.`),
      el("div", {}, el("b", {}, "Retrieve, then rerank: "), `${k} model runs, about ${human(two)} per query.`),
      el("div", { class: "small", style: "margin-top:.4em" }, `The two-stage design is roughly ${Math.round(all / two).toLocaleString("en")} times faster, and the reranker still sees every candidate that stood a chance.`));
  }
  ["fn-n", "fn-k", "fn-ms"].forEach(id => $(id).oninput = paintFun);
  paintFun();

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "A retrieval eval item consists of…",
      options: ["a query and the model's answer", "a query and the IDs of the chunks that are relevant to it", "a chunk and its embedding", "two retrievers' outputs"],
      answer: 1, why: "Known-relevant chunk IDs are the gold standard that ranked results are scored against." },
    { q: "You pass the top 5 chunks to a language model. Which first-stage metric matters most?",
      options: ["MRR", "Recall@5: whether the needed chunk is among the five at all", "Precision@1", "Latency only"],
      answer: 1, why: "The model reads all five. What it cannot do is use a chunk that was never retrieved." },
    { q: "The only relevant chunk is at position 4. The reciprocal rank is…",
      options: ["4", "0.25", "0.4", "1"],
      answer: 1, why: "One divided by the position of the first relevant result: 1/4." },
    { q: "Why does a cross-encoder rank better than a bi-encoder?",
      options: ["It has a larger vocabulary", "It reads the query and passage together, so each can inform how the other is interpreted", "It uses BM25 internally", "It stores more vectors"],
      answer: 1, why: "Joint reading lets it catch negation, word sense and exact fit, which a vector fixed in advance cannot." },
    { q: "The right chunk is at position 80 after hybrid search, and you rerank the top 50. What will the reranker do with it?",
      options: ["Move it to the top", "Nothing: it never sees it", "Move it to position 50", "Delete it"],
      answer: 1, why: "A reranker reorders only its shortlist. First-stage recall at the shortlist size is the ceiling." }
  ], "l16");

  mountSaved();
  mountFinish($("finish"), "l16");
})();
