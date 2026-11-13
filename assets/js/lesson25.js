// Lesson 25 interactives: trace waterfall viewer, linguistic-level quiz, live redactor.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);
  const SVG = "http://www.w3.org/2000/svg";
  const svg = (tag, attrs, text) => { const n = document.createElementNS(SVG, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text) n.textContent = text; return n; };

  /* ---------- 1. Waterfall ---------- */
  // [name, kind, start, end, attributes]
  const TRACES = {
    normal: { about: "Report on “issue”. Prompt v7, index v3.", spans: [
      ["model: plan", "model", 0, 2.1, { input_tokens: 900, output_tokens: 180, finish: "tool_calls" }],
      ["tool: frequency", "tool", 2.1, 2.15, { args: '{"word":"issue"}', result: "5 genres, rates per million" }],
      ["model: step 2", "model", 2.15, 5.0, { input_tokens: 1300, output_tokens: 140 }],
      ["tool: concordance", "tool", 5.0, 5.3, { args: '{"word":"issue","genre":"news"}', result: "total 61, showing 8" }],
      ["model: step 3", "model", 5.3, 9.0, { input_tokens: 2100, output_tokens: 210 }],
      ["tool: concordance", "tool", 9.0, 9.3, { args: '{"word":"issue","genre":"learned"}', result: "total 44, showing 8" }],
      ["model: step 4", "model", 9.3, 13.5, { input_tokens: 2900, output_tokens: 260 }],
      ["tool: collocates", "tool", 13.5, 15.9, { args: '{"word":"issue","genre":"news"}', result: "10 collocates, min_count 3" }],
      ["model: step 5", "model", 15.9, 21.0, { input_tokens: 3400, output_tokens: 320 }],
      ["model: write report", "model", 21.0, 33.0, { input_tokens: 1800, output_tokens: 950, finish: "stop" }],
      ["verify report", "check", 33.0, 33.1, { passed: true, problems: 0 }]
    ] },
    strange: { about: "Report on “issue”. Prompt v7, index v3. The user says the report wrongly claims the word is absent from learned prose.", spans: [
      ["model: plan", "model", 0, 2.0, { input_tokens: 900, output_tokens: 170, finish: "tool_calls" }],
      ["tool: frequency", "tool", 2.0, 2.05, { args: '{"word":"issue"}', result: "5 genres, rates per million (learned: 240 per million)" }],
      ["model: step 2", "model", 2.05, 5.0, { input_tokens: 1300, output_tokens: 150 }],
      ["tool: concordance", "error", 5.0, 35.0, { args: '{"word":"issue","genre":"learned"}', error: "storage timeout after 30 s", result: '{"total": 0}   ← returned to the model as if it were a finding' }],
      ["model: step 3", "model", 35.0, 38.0, { input_tokens: 1500, output_tokens: 120, said: "No occurrences in learned prose. Recording that." }],
      ["tool: save_finding", "tool", 38.0, 38.02, { args: '{"claim":"issue does not occur in learned prose","evidence_ids":[]}', result: "ok" }],
      ["tool: concordance", "tool", 38.02, 38.3, { args: '{"word":"issue","genre":"news"}', result: "total 61, showing 8" }],
      ["model: step 5", "model", 38.3, 42.0, { input_tokens: 2300, output_tokens: 240 }],
      ["model: write report", "model", 42.0, 55.0, { input_tokens: 1700, output_tokens: 900, finish: "stop" }],
      ["verify report", "check", 55.0, 55.1, { passed: true, problems: 0, note: "checks cited lines; a claim of absence cites none" }]
    ] }
  };
  const COL = { model: "var(--teal)", tool: "var(--accent)", check: "var(--c6)", error: "var(--bad)" };
  let sel = -1;
  function paintWf() {
    const key = document.querySelector("input[name=wf]:checked").value, tr = TRACES[key], sp = tr.spans, box = $("wf-svg");
    $("wf-case").textContent = tr.about;
    const W = 340, ROW = 22, L = 112, R = 332, total = sp[sp.length - 1][3], X = t => L + t / total * (R - L);
    box.setAttribute("viewBox", `0 0 ${W} ${sp.length * ROW + 22}`); box.replaceChildren();
    for (let t = 0; t <= total; t += total > 40 ? 10 : 5) { box.append(svg("line", { x1: X(t), y1: 0, x2: X(t), y2: sp.length * ROW, stroke: "var(--line)" })); box.append(svg("text", { x: X(t), y: sp.length * ROW + 14, "font-size": 9, "text-anchor": "middle", fill: "var(--muted)" }, t + "s")); }
    sp.forEach(([name, kind, a, b], i) => {
      const g = svg("g", { style: "cursor:pointer", tabindex: 0, role: "button", "aria-label": `${name}, ${(b - a).toFixed(1)} seconds` });
      g.append(svg("rect", { x: 0, y: i * ROW, width: W, height: ROW, fill: i === sel ? "var(--accent-soft)" : "transparent" }));
      g.append(svg("text", { x: 2, y: i * ROW + 15, "font-size": 9.5, fill: kind === "error" ? "var(--bad)" : "var(--ink)", "font-weight": i === sel ? 700 : 400 }, name));
      g.append(svg("rect", { x: X(a), y: i * ROW + 5, width: Math.max(2.5, X(b) - X(a)), height: ROW - 10, rx: 2, fill: COL[kind] }));
      const pick = () => { sel = i; paintWf(); };
      g.addEventListener("click", pick); g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
      box.append(g);
    });
    const d = $("wf-detail"); d.replaceChildren();
    if (sel < 0 || sel >= sp.length) d.textContent = "Tap a bar to see its attributes.";
    else { const [name, kind, a, b, attrs] = sp[sel]; d.append(el("b", {}, `${name} · ${(b - a).toFixed(2)} s`), el("pre", { class: "live", style: "margin:.5em 0 0;font-size:.78rem" }, Object.entries(attrs).map(([k, v]) => `${k}: ${v}`).join("\n"))); }
    const sum = k => sp.filter(s => s[1] === k || (k === "tool" && s[1] === "error")).reduce((t, s) => t + s[3] - s[2], 0);
    const tok = sp.reduce((t, s) => t + (s[4].input_tokens || 0) + (s[4].output_tokens || 0), 0), slow = sp.reduce((a, s) => s[3] - s[2] > a[3] - a[2] ? s : a);
    $("wf-sum").replaceChildren(el("b", {}, `Total ${total.toFixed(1)} s`), ` · model ${sum("model").toFixed(1)} s · tools ${sum("tool").toFixed(1)} s · ${tok.toLocaleString("en")} tokens · errors ${sp.filter(s => s[1] === "error").length}. `,
      el("span", { class: "small" }, `Slowest span: ${slow[0]} (${(slow[3] - slow[2]).toFixed(1)} s).`));
  }
  document.querySelectorAll("input[name=wf]").forEach(r => r.onchange = () => { sel = -1; paintWf(); });
  paintWf();

  /* ---------- 2. Levels of description ---------- */
  const LV = ["Lexical (word sense)", "Morphological (word structure)", "Syntactic (sentence structure)", "Pragmatic (what the speaker wanted)"];
  mountQuiz($("lv-box"), [
    { q: "Asked about “bank” in a passage on rivers, the report describes financial institutions.", options: LV, answer: 0, why: "The wrong sense of an ambiguous word was chosen. A sense error." },
    { q: "The annotator treats «وكتابها» as a single noun and loses the conjunction and pronoun.", options: LV, answer: 1, why: "The word's internal structure, its clitics, was not analysed. A segmentation error." },
    { q: "In “I saw the man with the telescope”, the system is sure the man has the telescope, though the context says the speaker used it.", options: LV, answer: 2, why: "The phrase was attached to the wrong part of the sentence. A structural, or attachment, error." },
    { q: "The user wrote “can you tell me how ‘run’ is used?” and the system answered “Yes.”", options: LV, answer: 3, why: "The literal question was answered and the request behind it missed. The form was understood, the intent was not." }
  ], "l25-levels");

  /* ---------- 3. Redactor ---------- */
  const RULES = [[/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[EMAIL]"], [/\+?\d[\d\s-]{7,}\d/g, "[PHONE]"], [/\bsk-[A-Za-z0-9_-]{8,}/g, "[KEY]"]];
  function paintRed() {
    let text = $("rd-in").value; const counts = {};
    for (const [re, label] of RULES) text = text.replace(re, () => { counts[label] = (counts[label] || 0) + 1; return label; });
    $("rd-out").textContent = text;
    const n = Object.values(counts).reduce((a, b) => a + b, 0), out = $("rd-note"); out.replaceChildren();
    out.append(el("b", {}, n ? `Masked ${n}: ` : "Nothing matched a rule. "), Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ") + (n ? ". " : ""));
    if (/[A-Z][a-z]+ [A-Z][a-z]+|[؀-ۿ]{2,} [؀-ۿ]{2,}/.test(text)) out.append(el("span", { class: "no" }, "Names may remain in the stored text."));
  }
  $("rd-in").oninput = paintRed;
  paintRed();

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "Why can't you simply rerun a failed agent request to see what went wrong?",
      options: ["Reruns are too expensive", "Sampling, changing models and changing data mean the rerun may take a different path and succeed", "Providers forbid it", "The input is lost"],
      answer: 1, why: "Model-driven systems are often not replayable. What was not recorded at the time cannot be recovered." },
    { q: "What ties together all the spans of one request?",
      options: ["Their timestamps", "A shared trace ID", "The model name", "The user's name"],
      answer: 1, why: "Every span carries the trace ID, which lets you extract one run from everything else in the store." },
    { q: "In the “strange answer” trace, where should the fix go?",
      options: ["In the system prompt", "In the tool, which must report a timeout as a failure, not as zero results", "In the verifier only", "In the model"],
      answer: 1, why: "The agent reasoned soundly from a false observation. Lesson 20: distinguish “found nothing” from “could not look”. Strengthening the verifier for claims of absence is a good second fix." },
    { q: "Open coding means…",
      options: ["publishing your source code", "reading failures and writing free-text notes first, then deriving categories from the notes", "applying a fixed checklist", "encrypting logs"],
      answer: 1, why: "Categories come from the data, not from a list decided in advance, so they fit your system's real failures." },
    { q: "Which of these can a regular expression reliably remove from a log?",
      options: ["People's names", "Email addresses", "Descriptions of a medical condition", "Anything sensitive"],
      answer: 1, why: "Fixed-shape identifiers match patterns. Names and sensitive content need language understanding, and even that is imperfect." }
  ], "l25");

  mountSaved();
  mountFinish($("finish"), "l25");
})();
