// Lesson 7 interactives: context budget packer, feature quiz, position schematic.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);
  const SVG = "http://www.w3.org/2000/svg";
  const svg = (tag, attrs, text) => { const n = document.createElementNS(SVG, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text) n.textContent = text; return n; };

  /* ---------- 1. Budget packer ---------- */
  const WINDOW = 8000;
  const ITEMS = [
    { id: "sys", name: "Task instructions", t: 300, on: true },
    { id: "gfull", name: "Complete UD guidelines, every tag and feature for every language", t: 12000 },
    { id: "gsel", name: "Selected guidelines: features relevant to Arabic and English", t: 900 },
    { id: "ex6", name: "6 examples (minimal pairs)", t: 400 },
    { id: "ex40", name: "40 examples", t: 2600 },
    { id: "hist", name: "Full chat history of this session", t: 3000 },
    { id: "sum", name: "Short summary of the earlier turns", t: 300 },
    { id: "doc", name: "The paragraph to annotate", t: 1200, on: true },
    { id: "out", name: "Space reserved for the answer", t: 1500, on: true }
  ];
  const sel = Object.fromEntries(ITEMS.map(i => [i.id, !!i.on]));
  function paintPack() {
    const total = ITEMS.reduce((s, i) => s + (sel[i.id] ? i.t : 0), 0), pct = total / WINDOW * 100;
    const fill = $("pk-fill"); fill.style.width = Math.min(100, pct) + "%"; fill.style.background = total > WINDOW ? "var(--bad)" : "var(--accent)";
    const notes = [];
    if (total > WINDOW) notes.push(["no", `Over by ${(total - WINDOW).toLocaleString("en")} tokens. The request is rejected, or something is cut off without telling you.`]);
    if (!sel.doc) notes.push(["no", "The text to annotate is missing. Nothing else matters."]);
    if (!sel.sys) notes.push(["no", "No task instructions: the model does not know what to do with the paragraph."]);
    if (!sel.out) notes.push(["no", "No room reserved for the answer: output will be truncated (finish_reason “length”)."]);
    if (sel.gfull && sel.gsel) notes.push(["", "Both guideline versions are in: the selected rules are now duplicated inside the full text."]);
    if (sel.gfull && total <= WINDOW) notes.push(["", "The full guidelines fit, but nearly all of them concern other languages."]);
    if (!sel.gfull && !sel.gsel) notes.push(["", "No guidelines: feature names and values are left to the model's defaults."]);
    if (sel.ex6 && sel.ex40) notes.push(["", "The 6 examples are a subset of the 40: pick one set."]);
    if (sel.ex40 && !sel.ex6) notes.push(["", "40 examples cost 2,600 tokens on every request. Lesson 6: do the extra 34 teach anything new?"]);
    if (sel.hist && sel.sum) notes.push(["", "History and its summary together: the summary adds nothing."]);
    if (sel.hist && !sel.sum) notes.push(["", "The full history is mostly unrelated to this paragraph. Would the summary do?"]);
    const good = total <= WINDOW && sel.doc && sel.sys && sel.out && sel.gsel && !sel.gfull && sel.ex6 && !sel.ex40 && !sel.hist;
    const out = $("pk-out"); out.replaceChildren(el("b", {}, `${total.toLocaleString("en")} of ${WINDOW.toLocaleString("en")} tokens (${pct.toFixed(0)}%). `));
    if (good) out.append(el("span", { class: "ok" }, "A lean, complete request. "), "Everything in it earns its place, and nearly half the window is still free.");
    const ul = el("ul", { style: "margin:.4em 0 0;padding-left:1.2em" });
    notes.forEach(([c, t]) => ul.append(el("li", { class: c === "no" ? "no" : "", style: c === "no" ? "" : "font-weight:400" }, t)));
    if (notes.length) out.append(ul);
  }
  for (const it of ITEMS) {
    const cb = el("input", { type: "checkbox", id: "pi-" + it.id }); cb.checked = sel[it.id];
    cb.onchange = () => { sel[it.id] = cb.checked; paintPack(); };
    $("pk-items").append(el("div", { style: "display:flex;gap:10px;align-items:flex-start;padding:6px 0;border-top:1px dashed var(--line)" },
      cb, el("label", { for: "pi-" + it.id, style: "flex:1" }, it.name), el("span", { class: "small", style: "white-space:nowrap" }, it.t.toLocaleString("en"))));
  }
  paintPack();

  /* ---------- 2. Features ---------- */
  mountQuiz($("ft-box"), [
    { q: "«كتابان» (“two books”). Which feature value does English have no equivalent for?",
      options: ["Number=Sing", "Number=Dual", "Number=Plur"], answer: 1, why: "Arabic marks exactly-two with its own form. English folds it into the plural." },
    { q: "«مكتبة» against «المكتبة». Which feature differs?",
      options: ["Gender", "Number", "Definite"], answer: 2, why: "“A library” (Definite=Ind) against “the library” (Definite=Def). In Arabic definiteness is marked on the word itself." },
    { q: "«كتبتْ» (“she wrote”). Which set is right?",
      options: ["Gender=Fem|Number=Sing|Person=3", "Gender=Masc|Number=Sing|Person=3", "Gender=Fem|Number=Plur|Person=1"], answer: 0,
      why: "Third person, feminine, singular: the verb agrees with its subject. An English past-tense verb carries none of this." },
    { q: "“writes” against “wrote”. Which feature differs?",
      options: ["Number", "Tense", "Definite"], answer: 1, why: "Tense=Pres against Tense=Past. UD Arabic treebanks describe the comparable contrast (يكتب / كتب) as Aspect=Imp against Aspect=Perf." }
  ], "l07-feats");

  /* ---------- 3. Position schematic ---------- */
  const use = x => 0.55 + 0.4 * Math.pow(2 * x - 1, 2) - 0.06 * x; // U-shape, start slightly ahead of end
  function paintPos() {
    const x = +$("ps-x").value / 100, box = $("ps-svg"); box.replaceChildren();
    const L = 36, R = 306, T = 14, B = 132, X = v => L + v * (R - L), Y = v => B - (v - 0.4) / 0.6 * (B - T);
    box.append(svg("line", { x1: L, y1: B, x2: R, y2: B, stroke: "var(--line)" }), svg("line", { x1: L, y1: T, x2: L, y2: B, stroke: "var(--line)" }));
    let d = ""; for (let i = 0; i <= 50; i++) { const v = i / 50; d += (i ? "L" : "M") + X(v).toFixed(1) + " " + Y(use(v)).toFixed(1); }
    box.append(svg("path", { d, fill: "none", stroke: "var(--teal)", "stroke-width": 2.5 }));
    box.append(svg("line", { x1: X(x), y1: B, x2: X(x), y2: Y(use(x)), stroke: "var(--accent)", "stroke-dasharray": "3 3" }));
    box.append(svg("circle", { cx: X(x), cy: Y(use(x)), r: 6, fill: "var(--accent)" }));
    box.append(svg("text", { x: L, y: 150, "font-size": 11, fill: "var(--muted)" }, "start"), svg("text", { x: (L + R) / 2, y: 150, "font-size": 11, fill: "var(--muted)", "text-anchor": "middle" }, "middle"), svg("text", { x: R, y: 150, "font-size": 11, fill: "var(--muted)", "text-anchor": "end" }, "end"));
    box.append(svg("text", { x: 12, y: (T + B) / 2, "font-size": 11, fill: "var(--muted)", transform: `rotate(-90 12 ${(T + B) / 2})`, "text-anchor": "middle" }, "how well it is used"));
    $("ps-v").textContent = Math.round(x * 100) + "%";
    $("ps-out").textContent = x < 0.15 ? "Near the start: used well. Good for standing instructions."
      : x > 0.85 ? "Near the end: used well, and closest to where generation begins. Good for the question and a short reminder of the task."
      : x > 0.35 && x < 0.65 ? "Deep in the middle: the weakest spot. A decisive rule here is the one most likely to be missed."
      : "Drifting toward the middle: still used, but less dependably.";
  }
  $("ps-x").oninput = paintPos;
  paintPos();

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "Which of these does NOT take up space in the context window?",
      options: ["The system prompt", "The model's own answer as it is written", "Earlier turns of the conversation", "The model's parameters"],
      answer: 3, why: "Everything the model reads or writes for this request counts, output included. The parameters are the model itself." },
    { q: "In UD notation, what does Number=Dual|Definite=Def describe?",
      options: ["A definite noun referring to exactly two things", "Two definite articles", "A plural verb", "An indefinite singular noun"],
      answer: 0, why: "Features are Name=Value pairs joined by a bar. Arabic «الكتابان», “the two books”, is an example." },
    { q: "You paste twenty pages of mostly irrelevant rules into a prompt. Besides cost, the main risk is…",
      options: ["the model refuses", "the relevant rules are diluted and may be used less reliably", "the tokenizer fails", "the output gets shorter"],
      answer: 1, why: "Irrelevant context is not ignored. It competes for attention with the rules that matter." },
    { q: "According to the “lost in the middle” finding, where is information in a long context used least well?",
      options: ["At the start", "In the middle", "At the end", "Position makes no difference"],
      answer: 1, why: "Start and end are used best. Put decisive material there, and measure on your own model." },
    { q: "For prompt caching to help, the part of the prompt that changes on every request should go…",
      options: ["first", "in the middle", "last", "in the system message"],
      answer: 2, why: "Caching matches identical prefixes. Stable content first, variable content last." }
  ], "l07");

  mountSaved();
  mountFinish($("finish"), "l07");
})();
