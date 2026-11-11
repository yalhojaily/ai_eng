// Lesson 14 interactives: sentence splitter comparison, chunking playground.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish, iso } = Site;
  const $ = id => document.getElementById(id);

  /* ---------- 1. Sentence splitting ---------- */
  const ABBR = new Set(["dr", "mr", "mrs", "ms", "prof", "sec", "fig", "vs", "etc", "e.g", "i.e", "vol", "cf"]);
  const naive = s => s.split(/(?<=[.!?؟])\s+/).filter(Boolean);
  function aware(s) {
    const parts = naive(s), out = [];
    for (const p of parts) {
      const prev = out[out.length - 1];
      const lastWord = prev && prev.split(/\s+/).pop().replace(/\.$/, "").toLowerCase();
      if (prev && prev.endsWith(".") && ABBR.has(lastWord)) out[out.length - 1] = prev + " " + p; else out.push(p);
    }
    return out;
  }
  function paintSeg() {
    for (const [id, fn] of [["sg-a", naive], ["sg-b", aware]]) {
      const parts = fn($("sg-text").value.trim()), box = $(id); box.replaceChildren();
      parts.forEach((p, i) => box.append(el("div", { dir: "auto", style: "padding:3px 0;border-top:1px dashed var(--line)" }, el("b", { class: "small" }, (i + 1) + ". "), iso(p))));
      box.append(el("div", { class: "small", style: "margin-top:6px" }, `${parts.length} sentence${parts.length === 1 ? "" : "s"}`));
    }
  }
  $("sg-text").oninput = paintSeg;
  paintSeg();

  /* ---------- 2. Chunking playground ---------- */
  const PAGE = `# AUX: auxiliary

An auxiliary is a function word that accompanies the lexical verb of a verb phrase. It expresses grammatical distinctions not carried by the lexical verb, such as person, number, tense, mood, aspect and voice.

## Copula

The copula is the verb that links a subject to a nonverbal predicate. It is tagged AUX, not VERB. In "She is tall", the word "is" is a copula.

Some languages have no overt copula in the present tense. Arabic is one of them: the sentence for "the book is new" contains no verb at all.

## Modal verbs

Modal auxiliaries express possibility, necessity or permission. English examples are "can", "must" and "should". They are tagged AUX when they accompany a lexical verb.

The same form may also be a noun. In "open the can", the word "can" is a NOUN.`;
  const sentences = t => t.split(/(?<=[.!?])\s+/).filter(Boolean);
  function fixed(size, overlapPct) {
    const text = PAGE.replace(/\n+/g, " "), step = Math.max(20, Math.round(size * (1 - overlapPct / 100))), out = [];
    // Positions where a sentence (or heading) starts, so each chunk can be checked against real boundaries.
    const starts = new Set([0, text.length]); for (const m of text.matchAll(/[.!?]"?\s+|#+\s[^#]*?(?=\s[A-Z])\s/g)) starts.add(m.index + m[0].length);
    for (let i = 0; i < text.length; i += step) {
      const end = Math.min(text.length, i + size), after = end + (text.slice(end).match(/^\s*/)[0].length);
      out.push({ text: text.slice(i, end), over: i ? size - step : 0, cut: !(starts.has(i) && (starts.has(end) || starts.has(after))) });
      if (end >= text.length) break;
    }
    return out;
  }
  function bySentence(size) {
    const out = []; let cur = "";
    for (const s of sentences(PAGE.replace(/^#+\s+/gm, "").replace(/\n+/g, " "))) {
      if (cur && (cur + " " + s).length > size) { out.push({ text: cur, over: 0 }); cur = s; } else cur = cur ? cur + " " + s : s;
    }
    if (cur) out.push({ text: cur, over: 0 });
    return out;
  }
  function byStructure() {
    const out = []; let heads = [];
    for (const block of PAGE.split(/\n\s*\n/)) {
      const m = block.match(/^(#+)\s+(.*)/);
      if (m) { heads = heads.slice(0, m[1].length - 1).concat(m[2]); continue; }
      out.push({ text: block, over: 0, head: heads.join(" › ") });
    }
    return out;
  }
  function paintChunks() {
    const how = $("ck-how").value, size = +$("ck-size").value, over = +$("ck-over").value;
    $("ck-size-row").hidden = how === "struct"; $("ck-over-row").hidden = how !== "fixed";
    $("ck-sv").textContent = size; $("ck-ov").textContent = over;
    const chunks = how === "fixed" ? fixed(size, over) : how === "sent" ? bySentence(size) : byStructure();
    const total = chunks.reduce((s, c) => s + c.text.length, 0), cut = chunks.filter(c => c.cut).length;
    const base = PAGE.replace(/\n+/g, " ").length;
    $("ck-stats").replaceChildren(el("b", {}, `${chunks.length} chunks`), `, average ${Math.round(total / chunks.length)} characters. `,
      el("span", { class: cut ? "no" : "ok" }, cut ? `${cut} begin or end mid-sentence. ` : "None is cut mid-sentence. "),
      how === "fixed" && over ? `Overlap stores ${Math.round((total / base - 1) * 100)}% more text. ` : "",
      how === "struct" ? "Each chunk keeps its heading path." : "");
    const box = $("ck-chunks"); box.replaceChildren();
    chunks.forEach((c, i) => {
      const body = el("div", {});
      if (c.over) body.append(el("span", { style: "background:var(--accent-soft)" }, c.text.slice(0, c.over)), c.text.slice(c.over)); else body.append(c.text);
      box.append(el("div", { class: "msg", style: "font-size:.86rem;border-left:4px solid var(--" + (c.cut ? "bad" : "teal") + ")" },
        el("span", { class: "who" }, `chunk ${i + 1} · ${c.text.length} chars` + (c.head ? ` · ${c.head}` : "")), body));
    });
  }
  ["ck-how", "ck-size", "ck-over"].forEach(id => $(id).addEventListener("input", paintChunks));
  paintChunks();

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "Why does embedding a forty-paragraph page as one vector retrieve badly?",
      options: ["Vectors cannot be that long", "The vector averages many topics, and the model may read only the beginning", "Long pages have no idf", "Cosine fails on long text"],
      answer: 1, why: "One point cannot represent forty ideas, and input beyond the model's limit is usually dropped silently." },
    { q: "What is overlap between fixed-size chunks for?",
      options: ["To make the index smaller", "So that text cut at one boundary appears whole in a neighbouring chunk", "To improve idf", "To hide duplicates"],
      answer: 1, why: "It reduces the damage of blind cuts, at the price of storing and embedding some text twice." },
    { q: "Your source is well-structured Markdown. The best first choice of chunking is usually…",
      options: ["fixed 100-character windows", "splitting at headings and paragraphs", "one chunk per file", "one chunk per word"],
      answer: 1, why: "The author has already marked the idea boundaries. Use them." },
    { q: "A retrieved chunk says only “It is tagged AUX, not VERB.” Which fix addresses the cause?",
      options: ["A larger embedding model", "Prepending the chunk's heading path before embedding, and storing it as metadata", "Raising the temperature", "Removing short chunks"],
      answer: 1, why: "The chunk lost its topic when it was cut. Restoring the heading gives both the embedding and the reader the missing referent." },
    { q: "You switch to a different embedding model. What must happen to the index?",
      options: ["Nothing", "It must be rebuilt, because queries and chunks have to be embedded by the same model", "Only new documents need embedding", "Only the metadata changes"],
      answer: 1, why: "Vectors from different models live in different spaces (Lesson 2). The index is a build artefact tied to its settings." }
  ], "l14");

  mountSaved();
  mountFinish($("finish"), "l14");
})();
