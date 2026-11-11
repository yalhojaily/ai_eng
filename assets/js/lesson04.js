// Lesson 4 interactives: parsing strategies, schema validator, constrained decoding, tool loop.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);

  /* ---------- 1. Parsing strategies ---------- */
  const REPLIES = [
    ["VERB", "VERB"],
    ["Verb", "VERB"],
    ["It's a verb.", "VERB"],
    ["**VERB** (imperative mood)", "VERB"],
    ["Although “book” is often a noun, here it is a verb.", "VERB"],
    ["This is a noun, not a verb.", "NOUN"],
    ['{"upos": "VERB"}', "VERB"]
  ];
  const PARSERS = {
    exact: r => (r === "VERB" || r === "NOUN") ? r : null,
    contains: r => { const s = r.toLowerCase(); return s.includes("verb") ? "VERB" : s.includes("noun") ? "NOUN" : null; },
    first: r => { const m = r.toLowerCase().match(/noun|verb/); return m ? m[0].toUpperCase() : null; },
    json: r => { try { const v = JSON.parse(r); return typeof v.upos === "string" ? v.upos : null; } catch (e) { return null; } }
  };
  function paintParse() {
    const parse = PARSERS[$("pa-how").value], t = $("pa-table"); let good = 0;
    t.replaceChildren(el("tr", {}, el("th", {}, "Model reply"), el("th", {}, "Truth"), el("th", {}, "Program got")));
    for (const [reply, want] of REPLIES) {
      const got = parse(reply), ok = got === want; if (ok) good++;
      t.append(el("tr", {}, el("td", {}, reply), el("td", {}, want), el("td", { class: ok ? "ok" : "no" }, (got || "nothing") + (ok ? " ✓" : " ✗"))));
    }
    $("pa-score").textContent = `${good} of ${REPLIES.length} replies handled correctly.`;
  }
  $("pa-how").onchange = paintParse;
  paintParse();

  /* ---------- 2. Schema validator ---------- */
  const TAGS = ["ADJ", "ADP", "ADV", "AUX", "CCONJ", "DET", "INTJ", "NOUN", "NUM", "PART", "PRON", "PROPN", "PUNCT", "SCONJ", "SYM", "VERB", "X"];
  const SCHEMA = {
    type: "object",
    properties: { form: { type: "string" }, lemma: { type: "string" }, upos: { type: "string", enum: TAGS } },
    required: ["form", "lemma", "upos"],
    additionalProperties: false
  };
  const typeOf = v => v === null ? "null" : Array.isArray(v) ? "array" : typeof v;
  function validate(v, s, path, errs) {
    if (s.type && typeOf(v) !== s.type) { errs.push(`${path}: expected ${s.type}, found ${typeOf(v)}`); return; }
    if (s.enum && !s.enum.includes(v)) errs.push(`${path}: "${v}" is not one of the allowed values`);
    if (s.type === "object") {
      for (const k of s.required || []) if (!(k in v)) errs.push(`${path}: required field "${k}" is missing`);
      for (const k of Object.keys(v)) {
        if (s.properties && s.properties[k]) validate(v[k], s.properties[k], `${path}.${k}`, errs);
        else if (s.additionalProperties === false) errs.push(`${path}: unexpected field "${k}"`);
      }
    }
    if (s.type === "array" && s.items) v.forEach((x, i) => validate(x, s.items, `${path}[${i}]`, errs));
  }
  const show = { ...SCHEMA, properties: { ...SCHEMA.properties, upos: { type: "string", enum: ["ADJ", "ADP", "…", "NOUN", "…", "VERB", "X"] } } };
  $("va-schema").textContent = JSON.stringify(show, null, 2).replace(/\[\s+("ADJ"[^\]]+)\]/, (m, inner) => "[" + inner.replace(/\s+/g, " ").trim() + "]") + "\n// enum holds all 17 UD tags";
  const CASES = {
    "Valid": { form: "Book", lemma: "book", upos: "VERB" },
    "Lowercase tag": { form: "Book", lemma: "book", upos: "verb" },
    "Missing field": { form: "Book", upos: "VERB" },
    "Extra field": { form: "Book", lemma: "book", upos: "VERB", note: "imperative" },
    "Wrong type": { form: "Book", lemma: "book", upos: ["VERB"] },
    "Broken JSON": null,
    "Valid but wrong": { form: "Book", lemma: "book", upos: "NOUN" }
  };
  function paintValid() {
    const out = $("va-out"); out.replaceChildren();
    let v;
    try { v = JSON.parse($("va-json").value); }
    catch (e) { out.append(el("span", { class: "no" }, "Not JSON at all: "), e.message); return; }
    const errs = []; validate(v, SCHEMA, "$", errs);
    if (!errs.length) out.append(el("span", { class: "ok" }, "Valid. "), "Conforms to the schema.");
    else { out.append(el("span", { class: "no" }, `Invalid (${errs.length}). `)); const ul = el("ul", { style: "margin:.4em 0 0;padding-left:1.2em" }); errs.forEach(e => ul.append(el("li", {}, e))); out.append(ul); }
  }
  for (const name of Object.keys(CASES)) $("va-presets").append(el("button", { type: "button", onclick() {
    $("va-json").value = CASES[name] ? JSON.stringify(CASES[name], null, 2) : '{ "form": "Book", "lemma": "book", "upos": "VERB"';
    paintValid();
  } }, name));
  $("va-json").oninput = paintValid;
  $("va-json").value = JSON.stringify(CASES["Valid"], null, 2);
  paintValid();

  /* ---------- 3. Constrained decoding ---------- */
  const STEPS = [
    { c: [["The", .35, 0], ["{", .30, 1], ["Sure", .25, 0], ["VERB", .10, 0]], why: "The schema demands an object, so only an opening brace may start the output." },
    { c: [['"upos"', .55, 1], ['"tag"', .30, 0], ["}", .15, 0]], why: "The only permitted field name is upos. Closing the object now would leave a required field missing." },
    { c: [[":", .90, 1], [",", .10, 0]], why: "After a field name, JSON grammar allows only a colon." },
    { c: [['"VERB"', .50, 1], ['"verb"', .25, 0], ['"Verb (imperative)"', .15, 0], ['"NOUN"', .10, 1]], why: "Only values in the enum survive. Two legal tags remain, and their probabilities are rescaled to sum to 100%." },
    { c: [["}", .70, 1], [', "note"', .30, 0]], why: "additionalProperties is false, so no further field may be opened. The object must close." }
  ];
  let ci, so;
  function paintCd() {
    $("cd-so").textContent = so || "(empty)";
    const bars = $("cd-bars"); bars.replaceChildren();
    const done = ci >= STEPS.length;
    $("cd-next").disabled = done;
    if (done) { $("cd-note").replaceChildren(el("b", {}, "Done. "), "The output parses and matches the schema, by construction."); return; }
    const { c, why } = STEPS[ci], z = c.reduce((s, x) => s + (x[2] ? x[1] : 0), 0);
    for (const [tok, p, ok] of c) {
      const fill = el("i"); fill.style.width = (ok ? p / z * 100 : p * 100) + "%";
      bars.append(el("div", { class: "bar" + (ok ? "" : " cut"), style: "grid-template-columns: 128px 1fr 64px" },
        el("span", { class: "w" }, tok), el("span", { class: "t" }, fill),
        el("span", { class: "p" }, ok ? `${(p * 100).toFixed(0)}→${(p / z * 100).toFixed(0)}%` : "blocked")));
    }
    $("cd-note").replaceChildren(el("b", {}, `Step ${ci + 1} of ${STEPS.length}. `), why);
  }
  $("cd-next").onclick = () => { const best = STEPS[ci].c.filter(x => x[2]).sort((a, b) => b[1] - a[1])[0]; so += best[0]; ci++; paintCd(); };
  $("cd-reset").onclick = () => { ci = 0; so = ""; paintCd(); };
  $("cd-reset").onclick();

  /* ---------- 4. Tool loop ---------- */
  const LOOP = [
    { actor: "You → model (request 1)", note: "Your program sends the question together with the list of tool definitions.",
      msgs: [["user", "Which uses more tokens: “the libraries” or «المكتبات»?"]] },
    { actor: "Model → you", note: "The model does not answer. It replies with two tool requests and finish_reason “tool_calls”. Nothing has been executed yet.",
      msgs: [["assistant", 'tool_calls:\n  call_1  count_tokens({"text": "the libraries"})\n  call_2  count_tokens({"text": "المكتبات"})']] },
    { actor: "Your code runs", note: "Your program parses the arguments, runs the real function twice, and wraps each result in a message with role “tool” that carries the matching call ID.",
      msgs: [["tool", 'tool_call_id: call_1\n{"tokens": 2}'], ["tool", 'tool_call_id: call_2\n{"tokens": 5}']] },
    { actor: "You → model (request 2)", note: "Your program sends everything again: the question, the model's tool requests, and both results. Four messages in total.", msgs: [] },
    { actor: "Model → you", note: "With the results in its context, the model writes the final answer. finish_reason is “stop”, so the loop ends.",
      msgs: [["assistant", "«المكتبات» uses more: 5 tokens against 2 for “the libraries”, although it is a single word.", true]] }
  ];
  let li;
  function paintLoop(reset) {
    if (reset) { li = 0; $("tl-msgs").replaceChildren(); $("tl-note").textContent = "Press “Next step” to send the first request."; }
    $("tl-next").disabled = li >= LOOP.length;
  }
  $("tl-next").onclick = () => {
    const s = LOOP[li++];
    $("tl-msgs").querySelectorAll(".new").forEach(n => n.classList.remove("new"));
    for (const [role, text, plain] of s.msgs) $("tl-msgs").append(el("div", { class: `msg ${role} new`, dir: "auto", style: "white-space:pre-wrap" }, el("span", { class: "who" }, role), role === "user" || plain ? Site.iso(text) : el("code", {}, Site.iso(text))));
    if (!s.msgs.length) $("tl-msgs").querySelectorAll(".msg").forEach(n => n.classList.add("new"));
    $("tl-note").replaceChildren(el("b", {}, s.actor + ". "), s.note);
    paintLoop(false);
  };
  $("tl-reset").onclick = () => paintLoop(true);
  paintLoop(true);

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "JSON mode (json_object) guarantees…",
      options: ["output matching your schema", "syntactically valid JSON, in whatever shape the model chooses", "a correct answer", "lower cost"],
      answer: 1, why: "JSON mode only promises parseable JSON. Field names and structure are still up to the model unless you supply a schema." },
    { q: "How does constrained decoding make the model follow a schema?",
      options: ["It adds a stern instruction to the prompt", "It retries until the output happens to be valid", "At each step it removes every token the schema does not allow, then samples from the rest", "It fine-tunes the model on your schema"],
      answer: 2, why: "It acts on the sampling step you met in Lesson 3: illegal tokens get zero probability, so they cannot be chosen." },
    { q: "A response validates against your schema. What do you know?",
      options: ["The annotation is correct", "The output has the right form; whether it is right is a separate question", "The model was confident", "No retry will ever be needed"],
      answer: 1, why: "Schemas check form, not truth. Correctness needs evaluation against known answers." },
    { q: "In tool calling, who executes the function?",
      options: ["The model, on the provider's servers", "Your code, after the model requests it", "The tokenizer", "Nobody: the model predicts the result"],
      answer: 1, why: "The model only emits a structured request. Your program runs the function and returns the result as a tool message." },
    { q: "The model keeps guessing token counts instead of calling count_tokens. The best first fix?",
      options: ["Raise the temperature", "Rename the function to something shorter", "Improve the tool description to say when it must be used", "Remove the schema"],
      answer: 2, why: "The model picks tools by reading names and descriptions. A description that states when to use the tool is the cheapest, most effective lever." }
  ], "l04");

  mountSaved();
  mountFinish($("finish"), "l04");
})();
