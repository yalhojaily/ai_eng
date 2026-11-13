// Lesson 29 interactives: diacritic inspector, DER/WER scorer, ladder quiz.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);
  const MARK = /[ً-ْ]/, MARKS_G = /[ً-ْ]/g;
  const NAMES = { "َ": "fatha · a", "ُ": "damma · u", "ِ": "kasra · i", "ْ": "sukun · no vowel", "ّ": "shadda · doubled", "ً": "tanwin · -an", "ٌ": "tanwin · -un", "ٍ": "tanwin · -in" };
  const strip = s => s.replace(MARKS_G, "");
  // Split a word into [letter, marks] units; marks are sorted so that order of typing does not matter.
  const units = w => { const out = []; for (const ch of w) { if (MARK.test(ch) && out.length) out[out.length - 1][1] += ch; else out.push([ch, ""]); } return out.map(([b, m]) => [b, [...m].sort().join("")]); };
  const isLetter = ch => ch >= "ء" && ch <= "ي";

  /* ---------- 1. Inspector ---------- */
  const WORDS = [["كَتَبَ", "he wrote"], ["كُتُبٌ", "books"], ["كُتِبَ", "it was written"], ["كَتَّبَ", "he made (someone) write"]];
  function paintTk() {
    const text = $("tk-in").value.trim(), t = $("tk-table"), out = $("tk-out"); t.replaceChildren(); out.replaceChildren();
    if (!text) { out.textContent = "Type a vowelled word."; return; }
    const us = text.split(/\s+/).flatMap(units).filter(u => isLetter(u[0])), marks = (text.match(MARKS_G) || []).length;
    const gloss = WORDS.find(w => w[0] === text);
    out.append("Without marks: ", el("b", { class: "ar", style: "font-size:1.5em" }, strip(text)), ` · ${us.length} letters, ${marks} marks` + (gloss ? ` · “${gloss[1]}”` : "") + ". ",
      el("span", { class: "small" }, marks ? `${us.filter(u => u[1]).length} of ${us.length} letters carry a mark that ordinary text omits.` : "No marks here: this is how Arabic is normally written."));
    t.append(el("tr", {}, el("th", {}, "Letter"), el("th", {}, "With its marks"), el("th", {}, "Marks")));
    us.forEach(([b, m]) => t.append(el("tr", {}, el("td", { class: "ar", style: "font-size:1.5em" }, b), el("td", { class: "ar", style: "font-size:1.7em" }, b + m), el("td", { class: "small" }, m ? [...m].map(x => NAMES[x] || "mark").join(" + ") : "none"))));
  }
  WORDS.forEach(([w, g]) => $("tk-presets").append(el("button", { type: "button", class: "ar", style: "padding:4px 12px;font-size:1.3em", title: g, onclick() { $("tk-in").value = w; paintTk(); } }, w)));
  $("tk-in").oninput = paintTk; $("tk-in").value = WORDS[0][0]; paintTk();

  /* ---------- 2. DER / WER ---------- */
  const REF = "كَتَبَ الطَّالِبُ الدَّرْسَ";
  const PRE = { "Perfect": REF, "Case-ending error": "كَتَبَ الطَّالِبَ الدَّرْسَ", "Word-form error": "كُتِبَ الطَّالِبُ الدَّرْسَ", "No marks at all": strip(REF) };
  function paintDer() {
    const rw = $("dr-ref").value.trim().split(/\s+/).filter(Boolean), hw = $("dr-hyp").value.trim().split(/\s+/).filter(Boolean), box = $("dr-words"), out = $("dr-out");
    box.replaceChildren(); out.replaceChildren();
    if (rw.length !== hw.length) { out.append(el("span", { class: "no" }, "The two texts have different numbers of words, so they cannot be aligned. "), "A diacritiser must add marks and change nothing else."); return; }
    let L = 0, W = 0, Lnc = 0, Wnc = 0, words = 0, wrongWords = 0, wrongWordsNc = 0, changed = false;
    rw.forEach((r, i) => {
      const ru = units(r).filter(u => isLetter(u[0])), hu = units(hw[i]).filter(u => isLetter(u[0]));
      if (ru.map(u => u[0]).join("") !== hu.map(u => u[0]).join("")) { changed = true; return; }
      const errs = ru.map((u, j) => u[1] !== hu[j][1]), inner = errs.slice(0, -1), bad = errs.some(Boolean);
      L += errs.length; W += errs.filter(Boolean).length; Lnc += inner.length; Wnc += inner.filter(Boolean).length; words++; if (bad) wrongWords++; if (inner.some(Boolean)) wrongWordsNc++;
      const chip = el("span", { class: "chip ar" + (bad ? " hot" : ""), style: "font-size:1.5em" });
      hu.forEach((u, j) => chip.append(errs[j] ? el("span", { style: "color:var(--bad);font-weight:700" }, u[0] + u[1]) : u[0] + u[1]));
      box.append(chip);
    });
    if (changed) { out.append(el("span", { class: "no" }, "The letters differ between reference and output. "), "Fix that first: error rates compare marks on identical letters."); return; }
    const pct = (a, b) => b ? (a / b * 100).toFixed(1) + "%" : "–";
    out.append(el("b", {}, `DER ${pct(W, L)}`), ` (${W} of ${L} letters) · `, el("b", {}, `WER ${pct(wrongWords, words)}`), ` (${wrongWords} of ${words} words).`, el("br"),
      el("b", {}, `Ignoring case endings: DER ${pct(Wnc, Lnc)}, WER ${pct(wrongWordsNc, words)}.`),
      W && !Wnc ? el("div", { class: "small", style: "margin-top:.4em" }, "Every error is on a final letter: the words are right and their grammatical roles are wrong. A syntactic failure.") : "",
      !MARK.test($("dr-hyp").value) ? el("div", { class: "small", style: "margin-top:.4em" }, "The output carries no marks at all: nothing was restored. Letters the reference also leaves bare count as correct.")
        : Wnc ? el("div", { class: "small", style: "margin-top:.4em" }, "Errors inside a word mean a different word form was chosen. A lexical or morphological failure.") : "");
  }
  for (const [name, hyp] of Object.entries(PRE)) $("dr-presets").append(el("button", { type: "button", style: "padding:5px 10px;font-size:.85rem", onclick() { $("dr-ref").value = REF; $("dr-hyp").value = hyp; paintDer(); } }, name));
  $("dr-ref").oninput = $("dr-hyp").oninput = paintDer;
  $("dr-ref").value = REF; $("dr-hyp").value = PRE["Case-ending error"]; paintDer();

  /* ---------- 3. Ladder ---------- */
  const RUNGS = ["Improve the prompt", "Add retrieval", "Fine-tune"];
  mountQuiz($("dc-box"), [
    { q: "The annotator tags the copula VERB. Nothing in your prompt mentions the convention.", options: RUNGS, answer: 0, why: "One sentence of instruction fixes it. Always start on the lowest rung." },
    { q: "The assistant must answer from guidelines that are revised every month.", options: RUNGS, answer: 1, why: "A knowledge gap, and a moving one. Retrieval keeps answers current and citable; a fine-tuned model would be out of date within weeks." },
    { q: "A cheap model must restore vowel marks on millions of sentences. A strong model does it well but costs too much, and prompting the cheap one has stalled at twice the error rate.", options: RUNGS, answer: 2, why: "Narrow, stable, measurable, endless free training data, and a cost reason. A skill to be trained into a small model." },
    { q: "Reports must follow your house style. With three examples in the prompt, they do, nine times out of ten.", options: RUNGS, answer: 0, why: "Not yet a case for training. Better examples, a schema and a gate will likely close the gap, and you can measure whether they do." }
  ], "l29-ladder");

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "What does fine-tuning change that prompting, retrieval and tools do not?",
      options: ["The context window", "The model's parameters", "The tokenizer", "The API"],
      answer: 1, why: "Everything else works through the context and disappears after the request. Fine-tuning alters the model itself." },
    { q: "The model lacks last week's policy change. The right remedy is…",
      options: ["fine-tuning", "retrieval", "a higher temperature", "a larger model"],
      answer: 1, why: "A missing fact is a knowledge gap. Supply it in the context, where it can be updated and cited." },
    { q: "Why can restoring Arabic diacritics change which word a string is?",
      options: ["The marks are decorative", "Short vowels are normally unwritten, and different vowels on the same consonants make different words", "Arabic has no vowels", "The marks change the letters"],
      answer: 1, why: "«كَتَبَ», «كُتُبٌ» and «كُتِبَ» share one skeleton. The marks select among them." },
    { q: "A diacritiser's DER is 6% over all letters and 2% ignoring the last letter of each word. Most of its errors are…",
      options: ["inside words: wrong word forms", "on case endings: the grammatical role of the word in the sentence", "in punctuation", "random"],
      answer: 1, why: "The error rate drops sharply once final letters are excluded, so the syntactic half of the task is where it fails." },
    { q: "What must you measure before deciding to fine-tune?",
      options: ["The size of the model", "How well prompted models already do on your eval: the baseline to beat", "The number of GPUs available", "Nothing"],
      answer: 1, why: "If a prompted model is good enough, stop. If not, the baseline is the bar the tuned model has to clear." }
  ], "l29");

  mountSaved();
  mountFinish($("finish"), "l29");
})();
