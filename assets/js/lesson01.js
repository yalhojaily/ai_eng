// Lesson 1 interactives: bigram sampler, morpheme splitter, BPE trainer, root table, quiz.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);
  const isAr = s => /[؀-ۿ]/.test(s);

  /* ---------- 1. Bigram sampler ---------- */
  const CORPUS = `the model reads the text . the model predicts the next word . the next word is a token .
a token is a piece of a word . a word is made of pieces . the text is made of words .
the model reads a token and predicts the next token . language is a system of signs .
the linguist reads the text and counts the words . the linguist splits a word into pieces .
a root is a piece of meaning . the meaning of a word is in the text . the next token is a guess .
the model is a system that predicts . the system reads language and predicts language .
a guess is a number . the number is a probability . the probability of the next word is a number .
the linguist and the model read the same text . the same word is a new token in a new text .`;
  const counts = {};
  const toks = CORPUS.split(/\s+/);
  for (let i = 0; i < toks.length - 1; i++) {
    (counts[toks[i]] ||= {})[toks[i + 1]] = (counts[toks[i]][toks[i + 1]] || 0) + 1;
  }
  let seq, lastNew;
  const dist = () => {
    const T = parseFloat($("bg-temp").value);
    const next = counts[seq[seq.length - 1]] || counts["."];
    const raw = Object.entries(next).map(([w, c]) => [w, Math.pow(c, 1 / T)]);
    const z = raw.reduce((s, [, v]) => s + v, 0);
    return raw.map(([w, v]) => [w, v / z]).sort((a, b) => b[1] - a[1]);
  };
  function paintBigram() {
    const out = $("bg-text"); out.replaceChildren();
    seq.forEach((w, i) => {
      const s = el("span", i === seq.length - 1 && lastNew ? { class: "new" } : {}, w);
      out.append(s, " ");
    });
    const bars = $("bg-bars"); bars.replaceChildren();
    for (const [w, p] of dist().slice(0, 7)) {
      const fill = el("i"); fill.style.width = (p * 100) + "%";
      bars.append(el("div", { class: "bar" }, el("span", { class: "w" }, w), el("span", { class: "t" }, fill), el("span", { class: "p" }, (p * 100).toFixed(0) + "%")));
    }
    $("bg-tv").textContent = parseFloat($("bg-temp").value).toFixed(1);
  }
  function addWord(greedy) {
    const d = dist();
    let pick = d[0][0];
    if (!greedy) { let r = Math.random(); for (const [w, p] of d) { r -= p; if (r <= 0) { pick = w; break; } } }
    seq.push(pick); lastNew = true;
    if (seq.length > 40) seq = seq.slice(-40);
    paintBigram();
  }
  const resetBigram = () => { seq = ["the"]; lastNew = false; paintBigram(); };
  $("bg-sample").onclick = () => addWord(false);
  $("bg-greedy").onclick = () => addWord(true);
  $("bg-reset").onclick = resetBigram;
  $("bg-temp").oninput = paintBigram;
  resetBigram();

  /* ---------- 2. Morpheme splitter ---------- */
  const WORDS = [
    { w: "rereading", cuts: [2, 6], gloss: "re (again) + read + ing (ongoing)" },
    { w: "tokenizers", cuts: [5, 7, 9], gloss: "token + iz(e) (make into) + er (thing that does it) + s (plural)" },
    { w: "المكتبات", cuts: [2, 6], gloss: "ال (the) + مكتب (library stem) + ات (feminine plural): “the libraries”" },
    { w: "وسيكتبونها", cuts: [1, 2, 3, 6, 8], gloss: "و (and) + س (will) + ي (third person) + كتب (write) + ون (plural) + ها (it): “and they will write it”" }
  ];
  for (const item of WORDS) {
    const letters = [...item.w], on = new Set(), ar = isAr(item.w);
    const tiles = el("div", { class: "tiles", dir: ar ? "rtl" : "ltr" });
    const preview = el("div", { class: "chips", dir: ar ? "rtl" : "ltr" });
    const verdict = el("span", { class: "verdict", "aria-live": "polite" });
    const paint = () => {
      preview.replaceChildren();
      let cur = "";
      letters.forEach((ch, i) => { cur += ch; if (on.has(i + 1) || i === letters.length - 1) { preview.append(el("span", { class: "chip" + (ar ? " ar" : "") }, cur)); cur = ""; } });
    };
    letters.forEach((ch, i) => {
      tiles.append(el("span", { class: "tile" + (ar ? " ar" : "") }, ch));
      if (i < letters.length - 1) {
        const g = el("button", { class: "gap", type: "button", "aria-label": `Cut after letter ${i + 1}`, "aria-pressed": "false" });
        g.onclick = () => { on.has(i + 1) ? on.delete(i + 1) : on.add(i + 1); g.classList.toggle("on"); g.setAttribute("aria-pressed", on.has(i + 1)); verdict.textContent = ""; paint(); };
        tiles.append(g);
      }
    });
    const check = el("button", { type: "button", onclick() {
      const ok = on.size === item.cuts.length && item.cuts.every(c => on.has(c));
      verdict.className = "verdict " + (ok ? "ok" : "no");
      const missing = item.cuts.filter(c => !on.has(c)).length, extra = [...on].filter(c => !item.cuts.includes(c)).length;
      verdict.textContent = ok ? "Correct: " + item.gloss : `Not yet. ${missing} cut${missing === 1 ? "" : "s"} missing, ${extra} misplaced.`;
    } }, "Check");
    const show = el("button", { type: "button", onclick() { verdict.className = "verdict"; verdict.textContent = item.gloss; } }, "Show answer");
    $("sp-items").append(el("div", { class: "split" },
      el("div", { class: ar ? "ar" : "", style: "font-weight:700;font-size:1.3em", dir: "auto" }, item.w),
      tiles, el("div", { class: "small" }, "Your pieces:"), preview,
      el("div", { class: "row" }, check, show), verdict));
    paint();
  }

  /* ---------- 3. BPE trainer ---------- */
  const PRESET_EN = "low low low low low lower lower newest newest newest newest newest newest widest widest widest";
  const PRESET_AR = "كتب كتب كتب كاتب كاتب كتاب كتاب كتاب مكتبة مكتبة مكتوب يكتب يكتب يكتبون سيكتب";
  let vocab, merges;
  function initBpe() {
    const freq = {};
    for (const w of $("bpe-corpus").value.trim().split(/\s+/).filter(Boolean)) freq[w] = (freq[w] || 0) + 1;
    vocab = Object.entries(freq).map(([w, f]) => ({ f, syms: [...w, "_"] }));
    merges = [];
    paintBpe();
  }
  function bestPair() {
    const pc = new Map();
    for (const { f, syms } of vocab) for (let i = 0; i < syms.length - 1; i++) {
      const k = syms[i] + "\u0001" + syms[i + 1];
      pc.set(k, (pc.get(k) || 0) + f);
    }
    let best = null, n = 0;
    for (const [k, c] of pc) if (c > n) { best = k; n = c; }
    return best ? { pair: best.split("\u0001"), n } : null;
  }
  const applyMerge = (syms, [a, b]) => {
    const out = [];
    for (let i = 0; i < syms.length; i++) {
      if (i < syms.length - 1 && syms[i] === a && syms[i + 1] === b) { out.push(a + b); i++; } else out.push(syms[i]);
    }
    return out;
  };
  function mergeOnce() {
    const b = bestPair(); if (!b) return false;
    vocab.forEach(v => v.syms = applyMerge(v.syms, b.pair));
    merges.push(b.pair);
    return true;
  }
  const chip = (s, hot) => el("span", { class: "chip" + (isAr(s) ? " ar" : "") + (hot ? " hot" : "") }, s);
  function paintBpe() {
    const b = bestPair(), nx = $("bpe-next"); nx.replaceChildren();
    if (b) nx.append("Most frequent pair now: ", chip(b.pair[0], true), " + ", chip(b.pair[1], true), ` (seen ${b.n} times). Pressing “Merge once” glues it.`);
    else nx.append("Nothing left to merge: every word is a single token.");
    $("bpe-step").disabled = $("bpe-5").disabled = !b;
    const last = merges.length ? merges[merges.length - 1].join("") : null;
    const box = $("bpe-vocab"); box.replaceChildren();
    for (const v of vocab) {
      const chips = el("span", { class: "chips", dir: isAr(v.syms.join("")) ? "rtl" : "ltr" });
      v.syms.forEach(s => chips.append(chip(s, s === last)));
      box.append(el("div", { class: "v" }, el("span", { class: "f" }, "×" + v.f), chips));
    }
    const ml = $("bpe-merges"); ml.replaceChildren();
    merges.forEach(([a, c]) => ml.append(el("li", { dir: "ltr" }, el("bdi", {}, a), " + ", el("bdi", {}, c), " → ", el("bdi", {}, a + c))));
    if (!merges.length) ml.append(el("li", { style: "list-style:none;margin-left:-2.4em", class: "small" }, "None yet."));
    ml.scrollTop = ml.scrollHeight;
    paintTok();
  }
  function paintTok() {
    const out = $("bpe-tok"); out.replaceChildren();
    const w = $("bpe-word").value.trim().split(/\s+/)[0];
    if (!w) return;
    let syms = [...w, "_"];
    for (const m of merges) syms = applyMerge(syms, m);
    out.dir = isAr(w) ? "rtl" : "ltr";
    syms.forEach(s => out.append(chip(s)));
    out.append(el("span", { class: "small", dir: "ltr" }, ` ${syms.length} token${syms.length === 1 ? "" : "s"}`));
  }
  $("bpe-step").onclick = () => { mergeOnce(); paintBpe(); };
  $("bpe-5").onclick = () => { for (let i = 0; i < 5 && mergeOnce(); i++); paintBpe(); };
  $("bpe-reset").onclick = initBpe;
  $("bpe-corpus").oninput = initBpe;
  $("bpe-word").oninput = paintTok;
  $("bpe-en").onclick = () => { $("bpe-corpus").value = PRESET_EN; $("bpe-word").value = "lowest"; initBpe(); };
  $("bpe-ar").onclick = () => { $("bpe-corpus").value = PRESET_AR; $("bpe-word").value = "كاتبون"; initBpe(); };
  $("bpe-corpus").value = PRESET_EN;
  initBpe();

  /* ---------- 4. Root-and-pattern table ---------- */
  const ROOT = new Set(["ك", "ت", "ب"]);
  const FORMS = [
    ["كتب", "he wrote", "nothing: the bare root"],
    ["كاتب", "writer", "ا after the first root letter"],
    ["كتاب", "book", "ا after the second root letter"],
    ["مكتوب", "written", "م before, و inside"],
    ["مكتبة", "library", "م before, ة after"],
    ["يكتبون", "they write", "ي before, ون after"]
  ];
  for (const [w, meaning] of FORMS) {
    // Letters are shown as separate tiles so the root colouring is reliable in every browser.
    const letters = el("span", { class: "chips", dir: "rtl" });
    [...w].forEach(ch => letters.append(el("span", { class: "chip ar" + (ROOT.has(ch) ? " hot" : " plain") }, ch)));
    $("roots").append(el("tr", {}, el("td", { class: "ar", dir: "rtl", lang: "ar" }, w), el("td", {}, letters), el("td", {}, meaning)));
  }

  /* ---------- 5. Quiz ---------- */
  mountQuiz($("quiz-box"), [
    { q: "What does a language model output at each step?",
      options: ["The single correct next word", "A probability for every token in its vocabulary", "A complete sentence", "A list of morphemes"],
      answer: 1, why: "It outputs a full distribution. Choosing one token from it (sampling) is done by the program around the model." },
    { q: "Why not use whole words as the vocabulary?",
      options: ["Words are too short", "Models cannot store strings", "The list is never complete: new words, names and typos would be unknown", "Words have no meaning"],
      answer: 2, why: "A word vocabulary is open-ended. Subwords guarantee any string can be represented from known pieces." },
    { q: "At each step, byte-pair encoding merges…",
      options: ["the pair of pieces with the closest meaning", "the longest word", "a random pair", "the most frequent adjacent pair"],
      answer: 3, why: "BPE knows nothing about meaning. It only counts adjacent pairs and glues the most frequent one." },
    { q: "Why can BPE never produce a token for the Arabic root ك‑ت‑ب as it appears in كاتب?",
      options: ["The root letters are not adjacent in the word, and BPE only merges neighbours", "Arabic is written right to left", "The root is too rare", "Tokenizers ignore Arabic"],
      answer: 0, why: "Root-and-pattern morphology interleaves root letters with pattern letters. BPE is strictly concatenative." },
    { q: "Your app's Arabic users hit the context limit sooner than English users with documents of the same word count. The most likely reason?",
      options: ["Arabic documents contain more ideas", "The model reads right-to-left text more slowly", "Arabic text splits into more tokens per word, and limits are counted in tokens", "The API blocks long Arabic input"],
      answer: 2, why: "Context windows and prices are in tokens. More tokens per word means less text fits and each request costs more." }
  ], "l01");

  mountSaved();
  mountFinish($("finish"), "l01");
})();
