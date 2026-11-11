// Lesson 2 interactives: count-based word vectors, cosine demo, 2-D map, sense quiz, checkpoint.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);
  const SVG = "http://www.w3.org/2000/svg";
  const svg = (tag, attrs, text) => { const n = document.createElementNS(SVG, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text) n.textContent = text; return n; };
  const isAr = s => /[؀-ۿ]/.test(s);

  /* ---------- 1. Distributional vectors ---------- */
  const ORIGINAL = `the cat chases the mouse. the dog chases the ball. the kitten chases the mouse. the puppy chases the ball.
the cat sleeps on the sofa. the dog sleeps on the floor. the kitten sleeps on the sofa. the puppy sleeps on the floor.
the cat drinks milk. the kitten drinks milk. the dog drinks water. the puppy drinks water.
she feeds the cat. he feeds the dog. she feeds the kitten. he feeds the puppy.
the cat climbs the tree. the dog guards the house.
she drinks hot coffee every morning. he drinks hot tea every morning. she drinks cold water every day.
i pour the coffee into a cup. i pour the tea into a cup. i pour the water into a glass.
he likes strong coffee. she likes strong tea.
the king rules the country. the queen rules the country. the king wears a crown. the queen wears a crown.
the people love the king. the people love the queen.`;
  const TIGER = " the tiger chases the deer. the tiger sleeps on the grass. she feeds the tiger.";
  const STOP = new Set("the a an on into i she he it of and in to is with every".split(" "));
  const WINDOW = 2;
  let M = null; // { words, ctxCounts, vecs }

  function build() {
    const sents = $("d-corpus").value.toLowerCase().split(/[.\n!?؟]+/)
      .map(s => s.split(/\s+/).filter(w => w && !STOP.has(w))).filter(s => s.length);
    const freq = {}, co = {};
    for (const s of sents) s.forEach((w, i) => {
      freq[w] = (freq[w] || 0) + 1;
      for (let j = Math.max(0, i - WINDOW); j <= Math.min(s.length - 1, i + WINDOW); j++) if (j !== i) {
        (co[w] ||= {})[s[j]] = (co[w][s[j]] || 0) + 1;
      }
    });
    const ctx = Object.keys(freq), words = ctx.filter(w => freq[w] >= 2 && co[w]);
    // Re-weight raw counts with positive pointwise mutual information, so shared rare company counts for more than shared common company.
    let total = 0; const rowSum = {}, colSum = {};
    for (const w in co) for (const c in co[w]) { total += co[w][c]; rowSum[w] = (rowSum[w] || 0) + co[w][c]; colSum[c] = (colSum[c] || 0) + co[w][c]; }
    const vecs = {};
    for (const w of words) vecs[w] = ctx.map(c => {
      const n = co[w][c] || 0; if (!n) return 0;
      return Math.max(0, Math.log2(n * total / (rowSum[w] * colSum[c])));
    });
    M = { words, co, vecs };
  }
  const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  const cosine = (a, b) => { const d = Math.sqrt(dot(a, a) * dot(b, b)); return d ? dot(a, b) / d : 0; };

  function paintWord() {
    const w = $("d-word").value, cx = $("d-ctx"), nn = $("d-nn");
    cx.replaceChildren(); nn.replaceChildren();
    if (!w || !M.vecs[w]) { cx.append(el("span", { class: "small" }, "Add more text: a word needs to appear at least twice.")); return; }
    Object.entries(M.co[w]).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .forEach(([c, n]) => cx.append(el("span", { class: "chip" + (isAr(c) ? " ar" : "") }, `${c} ×${n}`)));
    M.words.filter(o => o !== w).map(o => [o, cosine(M.vecs[w], M.vecs[o])]).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .forEach(([o, s]) => {
        const fill = el("i"); fill.style.width = Math.max(0, s * 100) + "%";
        nn.append(el("div", { class: "bar" }, el("span", { class: "w" }, o), el("span", { class: "t" }, fill), el("span", { class: "p" }, s.toFixed(2))));
      });
  }
  function refresh(keep) {
    build();
    const sel = $("d-word"), prev = keep || sel.value;
    sel.replaceChildren(...M.words.slice().sort().map(w => el("option", { value: w }, w)));
    sel.value = M.words.includes(prev) ? prev : (M.words.includes("cat") ? "cat" : M.words[0] || "");
    paintWord(); paintMap();
  }
  $("d-word").onchange = paintWord;
  $("d-corpus").oninput = () => refresh();
  $("d-reset").onclick = () => { $("d-corpus").value = ORIGINAL; refresh("cat"); };
  $("d-tiger").onclick = () => { if (!$("d-corpus").value.includes("tiger")) $("d-corpus").value += TIGER; refresh("tiger"); };

  /* ---------- 3. 2-D map (principal components by power iteration) ---------- */
  function paintMap() {
    const box = $("map-svg"); box.replaceChildren();
    const words = M.words; if (words.length < 3) return;
    const dim = M.vecs[words[0]].length;
    // Unit-length rows, so the map reflects direction (meaning) and not frequency; then centre.
    let X = words.map(w => { const v = M.vecs[w], n = Math.sqrt(dot(v, v)) || 1; return v.map(x => x / n); });
    const mean = Array.from({ length: dim }, (_, j) => X.reduce((s, r) => s + r[j], 0) / X.length);
    X = X.map(r => r.map((x, j) => x - mean[j]));
    const comps = [];
    for (let k = 0; k < 2; k++) {
      let v = Array.from({ length: dim }, (_, j) => Math.sin(j * 12.9898 + k * 78.233) + 0.01);
      for (let it = 0; it < 80; it++) {
        const xv = X.map(r => dot(r, v));
        v = Array.from({ length: dim }, (_, j) => X.reduce((s, r, i) => s + r[j] * xv[i], 0));
        for (const c of comps) { const p = dot(v, c); v = v.map((x, j) => x - p * c[j]); }
        const n = Math.sqrt(dot(v, v)) || 1; v = v.map(x => x / n);
      }
      comps.push(v);
    }
    let pts = X.map(r => [dot(r, comps[0]), dot(r, comps[1])]);
    // Refine the layout so that distance on the map tracks (1 - cosine) as closely as two dimensions allow.
    const n = words.length, D = words.map(a => words.map(b => 1 - cosine(M.vecs[a], M.vecs[b])));
    for (let it = 0; it < 500; it++) {
      pts = pts.map((p, i) => {
        let gx = 0, gy = 0;
        for (let j = 0; j < n; j++) if (j !== i) {
          const dx = p[0] - pts[j][0], dy = p[1] - pts[j][1], d = Math.hypot(dx, dy) || 1e-6, f = (d - D[i][j]) / d;
          gx += f * dx; gy += f * dy;
        }
        return [p[0] - 0.02 * gx, p[1] - 0.02 * gy];
      });
    }
    const ext = i => { const a = pts.map(p => p[i]); return [Math.min(...a), Math.max(...a)]; };
    const [x0, x1] = ext(0), [y0, y1] = ext(1), W = 340, H = 340, padL = 14, padR = 52, padY = 20;
    const placed = [];
    pts.map((p, i) => ({ w: words[i], x: padL + (p[0] - x0) / ((x1 - x0) || 1) * (W - padL - padR), y: padY + (p[1] - y0) / ((y1 - y0) || 1) * (H - padY - 44) }))
      .sort((a, b) => a.y - b.y).forEach(pt => {
        let ly = pt.y + 4;
        // Nudge a label down while it would sit on top of one already drawn.
        while (placed.some(q => Math.abs(q.x - pt.x) < 50 && Math.abs(q.y - ly) < 11)) ly += 11;
        placed.push({ x: pt.x, y: ly });
        const hot = pt.w === $("d-word").value;
        box.append(svg("circle", { cx: pt.x, cy: pt.y, r: hot ? 5 : 3, fill: hot ? "var(--accent)" : "var(--teal)" }));
        box.append(svg("text", { x: pt.x + 7, y: ly, "font-size": 11, "font-weight": hot ? 700 : 500, fill: hot ? "var(--accent)" : "var(--ink)" }, pt.w));
      });
  }
  $("d-word").addEventListener("change", paintMap);

  $("d-corpus").value = ORIGINAL;
  refresh("cat");

  /* ---------- 2. Cosine demo ---------- */
  function paintCos() {
    const ang = +$("cos-ang").value, len = +$("cos-len").value, rad = ang * Math.PI / 180;
    const ox = 160, oy = 165, unit = 95, base = 12 * Math.PI / 180; // a is tilted slightly so both arrows stay in view
    const a = [Math.cos(base), Math.sin(base)], b = [len * Math.cos(base + rad), len * Math.sin(base + rad)];
    const box = $("cos-svg"); box.replaceChildren();
    const defs = svg("defs", {});
    for (const [id, col] of [["ha", "var(--teal)"], ["hb", "var(--accent)"]]) {
      const m = svg("marker", { id, viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" });
      m.append(svg("path", { d: "M0 0L10 5L0 10z", fill: col })); defs.append(m);
    }
    box.append(defs, svg("line", { x1: 10, y1: oy, x2: 310, y2: oy, stroke: "var(--line)" }));
    const arc = 30, e = base + rad;
    box.append(svg("path", { d: `M${ox + arc * Math.cos(base)} ${oy - arc * Math.sin(base)} A${arc} ${arc} 0 0 0 ${ox + arc * Math.cos(e)} ${oy - arc * Math.sin(e)}`, fill: "none", stroke: "var(--muted)", "stroke-dasharray": "3 3" }));
    for (const [v, col, mk, name] of [[a, "var(--teal)", "ha", "a"], [b, "var(--accent)", "hb", "b"]]) {
      const x = ox + v[0] * unit, y = oy - v[1] * unit;
      box.append(svg("line", { x1: ox, y1: oy, x2: x, y2: y, stroke: col, "stroke-width": 3, "marker-end": `url(#${mk})` }));
      box.append(svg("text", { x: x + (v[0] >= 0 ? 8 : -14), y: y - 6, fill: col, "font-weight": 700, "font-size": 15 }, name));
    }
    const d = a[0] * b[0] + a[1] * b[1], c = d / len;
    $("cos-av").textContent = ang + "°"; $("cos-lv").textContent = len.toFixed(1);
    const verdict = c > 0.8 ? "very similar" : c > 0.3 ? "somewhat similar" : c > -0.3 ? "unrelated" : "opposed";
    $("cos-out").replaceChildren(el("b", {}, "dot product "), d.toFixed(2), " · ", el("b", {}, "cosine "), c.toFixed(2), ` (${verdict})`);
  }
  $("cos-ang").oninput = $("cos-len").oninput = paintCos;
  paintCos();

  /* ---------- 5. Word senses ---------- */
  mountQuiz($("sense-box"), [
    { q: "“She deposited her salary at the bank.”", options: ["Financial institution", "Side of a river"], answer: 0, why: "“Deposited” and “salary” are the company that decides it." },
    { q: "“They fished from the bank until dusk.”", options: ["Financial institution", "Side of a river"], answer: 1, why: "“Fished” points to water." },
    { q: "«اشترت خاتماً من ذهب»", options: ["Gold (noun)", "He went (verb)"], answer: 0, why: "After من, and next to خاتماً (a ring), it must be the noun: “she bought a ring of gold”." },
    { q: "«ذهب الولد إلى المدرسة»", options: ["Gold (noun)", "He went (verb)"], answer: 1, why: "It opens the sentence with a subject and إلى (to) after it: “the boy went to school”. Same letters, same token, different word." }
  ], "l02-sense");

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "Where does a language model store the fact that “cat” and “kitten” are related?",
      options: ["In their token IDs, which are close numbers", "In their rows of the embedding table, which training has moved close together", "In a dictionary supplied by linguists", "Nowhere: it cannot represent this"],
      answer: 1, why: "IDs are arbitrary labels. The learned vectors carry the similarity." },
    { q: "The distributional hypothesis says that…",
      options: ["frequent words are more important", "words are distributed evenly through a text", "words that occur in similar contexts tend to have similar meanings", "every word has exactly one meaning"],
      answer: 2, why: "Meaning is inferred from company. It is the idea underneath count vectors, word2vec and LLM embeddings alike." },
    { q: "Vector b is doubled in length without changing its direction. What happens to cosine(a, b)?",
      options: ["It doubles", "It halves", "It stays the same", "It becomes 1"],
      answer: 2, why: "Cosine divides out the lengths, so only the angle matters. The dot product is what doubles." },
    { q: "Why is a static embedding a poor representation of ذهب or “bank”?",
      options: ["It gives one vector for all senses of the word", "It is too long", "It cannot be compared with cosine", "It only works in English"],
      answer: 0, why: "One row per word type means every sense is blended. Contextual embeddings give a different vector per occurrence." },
    { q: "You switch your search system to a newer embedding model. What must you do with the vectors already stored?",
      options: ["Nothing: all embeddings share one space", "Multiply them by a constant", "Re-embed every document with the new model", "Sort them again"],
      answer: 2, why: "Each model defines its own space. Vectors from two models are not comparable, so the whole index is rebuilt." }
  ], "l02");

  mountSaved();
  mountFinish($("finish"), "l02");
})();
