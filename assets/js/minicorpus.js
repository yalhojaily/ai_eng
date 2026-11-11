// A tiny three-genre corpus written for this course, with the corpus tools the Phase 5 lessons use.
// Small enough to read in full, so every number the pages show can be checked by eye.
(function () {
  const RAW = {
    news: [
      "The mayor will run for a second term next year.",
      "The central bank raised interest rates again on Tuesday.",
      "Officials issued a statement late on Monday night.",
      "The company has run out of cash, according to its lenders.",
      "She plans to run the agency until a successor is named.",
      "The new light rail line opens to passengers in March.",
      "Voters said the cost of housing was the main issue.",
      "The bank said it would issue new shares to raise capital.",
      "He ran for parliament twice and lost both times.",
      "Trains will not run on Friday because of the strike.",
      "The minister made light of the report and its findings.",
      "The issue was raised again in parliament this week.",
      "The firm is run by two brothers from the north.",
      "Police said the suspect ran from the scene.",
      "The government will issue the permits within thirty days.",
      "Analysts expect the bank to report a loss.",
      "The festival will run for ten days in the old town.",
      "The court shed new light on the case yesterday.",
      "The senator declined to run again, citing her health.",
      "Fuel prices remain a central issue for drivers."
    ],
    fiction: [
      "She ran down the stairs and out into the rain.",
      "The light fell across the table where he sat.",
      "He wanted to run, but his legs would not move.",
      "They sat on the bank of the river until dark.",
      "A cold shiver ran through her when she heard the voice.",
      "The dog ran ahead of us along the path.",
      "I could see a light in the window of the old house.",
      "Do not run away from me, he said quietly.",
      "Her fingers ran over the keys of the piano.",
      "The morning light was thin and grey.",
      "He ran a hand through his hair and sighed.",
      "We ran until we could run no more.",
      "The boat drifted slowly towards the far bank.",
      "She did not want to make an issue of it.",
      "Tears ran down his face, and he let them."
    ],
    academic: [
      "We run the experiment three times and report the average.",
      "In light of these results, the hypothesis is rejected.",
      "This paper addresses the issue of data sparsity.",
      "Each model was run with the same random seed.",
      "The issue is discussed further in the next section.",
      "Run time grows linearly with the size of the input.",
      "These findings shed light on the role of frequency.",
      "A second issue concerns the choice of reference corpus.",
      "The simulation was run on a single machine.",
      "In the long run, the two measures converge."
    ]
  };
  const GENRES = Object.keys(RAW);
  const tokens = s => s.toLowerCase().match(/[a-z]+/g) || [];
  const SENTS = GENRES.flatMap(g => RAW[g].map((text, i) => ({ id: g[0] + String(i + 1).padStart(2, "0"), genre: g, text, toks: tokens(text) })));
  const SIZE = Object.fromEntries(GENRES.map(g => [g, SENTS.filter(s => s.genre === g).reduce((n, s) => n + s.toks.length, 0)]));
  const LEMMAS = { run: ["run", "runs", "ran", "running"], issue: ["issue", "issues", "issued", "issuing"], light: ["light", "lights"], bank: ["bank", "banks"], shed: ["shed", "sheds"] };
  const forms = w => { w = w.toLowerCase().trim(); for (const k in LEMMAS) if (LEMMAS[k].includes(w)) return LEMMAS[k]; return [w]; };

  // Every occurrence of the word (any inflected form), with its context split into left / keyword / right.
  function concordance(word, genre) {
    const f = forms(word), out = [];
    for (const s of SENTS) {
      if (genre && s.genre !== genre) continue;
      const parts = s.text.split(/(\s+)/); let seen = 0;
      parts.forEach((p, i) => {
        const bare = (p.toLowerCase().match(/[a-z]+/) || [""])[0];
        if (f.includes(bare)) {
          out.push({ id: s.id + (seen ? "." + (seen + 1) : ""), genre: s.genre, left: parts.slice(0, i).join(""), kw: p, right: parts.slice(i + 1).join(""), text: s.text });
          seen++;
        }
      });
    }
    return out;
  }
  // Raw count and rate per 100 words in each genre. (Real corpora use per million; this one is tiny.)
  function frequency(word) {
    const hits = concordance(word), out = {};
    for (const g of GENRES) { const n = hits.filter(h => h.genre === g).length; out[g] = { count: n, words: SIZE[g], per100: n / SIZE[g] * 100 }; }
    return out;
  }
  window.Mini = { RAW, GENRES, SENTS, SIZE, tokens, forms, concordance, frequency };
})();
