// Lesson 8 interactives: error propagation, invariant gate, retry stepper, pattern quiz.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);

  /* ---------- 1. Error propagation ---------- */
  function paintProp() {
    const a = +$("pr-a").value / 100, n = +$("pr-n").value, c = +$("pr-c").value / 100;
    const eff = a + (1 - a) * c * a;              // a caught error gets one retry, which succeeds with probability a
    const plain = Math.pow(a, n), gated = Math.pow(eff, n);
    $("pr-av").textContent = Math.round(a * 100) + "%"; $("pr-nv").textContent = n; $("pr-cv").textContent = Math.round(c * 100) + "%";
    const bars = $("pr-bars"); bars.replaceChildren();
    for (const [name, v] of [["one step", a], ["chain, no gates", plain], ["chain, gated", gated]]) {
      const fill = el("i"); fill.style.width = (v * 100) + "%";
      bars.append(el("div", { class: "bar", style: "grid-template-columns: 118px 1fr 46px" }, el("span", { class: "w", style: "font-family:var(--sans)" }, name), el("span", { class: "t" }, fill), el("span", { class: "p" }, (v * 100).toFixed(0) + "%")));
    }
    const calls = n * (1 + (1 - a) * c);
    $("pr-out").textContent = `Out of 1,000 items, about ${Math.round(plain * 1000)} come through correct with no gates and ${Math.round(gated * 1000)} with gates. ` +
      `The gates cost roughly ${(calls - n).toFixed(2)} extra calls per item in retries.`;
  }
  ["pr-a", "pr-n", "pr-c"].forEach(id => $(id).oninput = paintProp);
  paintProp();

  /* ---------- 2. Invariant gate ---------- */
  const WORD = "وكتابها";
  const CASES = {
    "Correct": ["و", "كتاب", "ها"],
    "Dropped letter": ["و", "كتب", "ها"],
    "Invented unit": ["و", "ال", "كتاب", "ها"],
    "Empty unit": ["و", "", "كتاب", "ها"],
    "Added vowel marks": ["وَ", "كِتاب", "ها"],
    "No split at all": ["وكتابها"]
  };
  function gate(word, units) {
    const errs = [];
    if (!Array.isArray(units) || !units.every(u => typeof u === "string")) return ["the answer must be a list of strings"];
    if (!units.length) errs.push("the list is empty");
    if (units.some(u => u === "")) errs.push("there is an empty unit");
    if (units.join("") !== word) errs.push(`joined together the units give “${units.join("")}”, which is not the original “${word}”`);
    return errs;
  }
  function paintInv() {
    const out = $("iv-out"); out.replaceChildren();
    let v; try { v = JSON.parse($("iv-json").value); } catch (e) { out.append(el("span", { class: "no" }, "Rejected: "), "not valid JSON."); return; }
    const errs = gate(WORD, v);
    if (errs.length) { out.append(el("span", { class: "no" }, "Rejected, sent back for a retry: ")); const ul = el("ul", { style: "margin:.4em 0 0;padding-left:1.2em" }); errs.forEach(e => ul.append(el("li", { dir: "auto" }, e))); out.append(ul); }
    else out.append(el("span", { class: "ok" }, "Passed. "), v.length === 1 ? "All invariants hold, yet nothing was segmented. The gate cannot know that three units were expected." : "All invariants hold. The result moves on to the tagging step.");
  }
  for (const name of Object.keys(CASES)) $("iv-presets").append(el("button", { type: "button", onclick() { $("iv-json").value = JSON.stringify(CASES[name], null, 1); paintInv(); } }, name));
  $("iv-json").oninput = paintInv;
  $("iv-json").value = JSON.stringify(CASES["Correct"], null, 1);
  paintInv();

  /* ---------- 3. Retry stepper ---------- */
  const STEPS = [
    ["user", "Step 1 · request", "Split the word into its syntactic words. Do not change any letters.\n<word>وكتابها</word>", "The first attempt at segmentation."],
    ["assistant", "Model", '["و", "كتب", "ها"]', "It looks plausible. A person skimming would not notice anything."],
    ["tool", "Gate (your code)", "FAIL: joined together the units give “وكتبها”, not “وكتابها”.", "The invariant catches it instantly: a letter is missing. Nothing has been passed to the tagger."],
    ["user", "Step 1 · retry 1 of 1", "<word>وكتابها</word>\nYour previous answer [\"و\", \"كتب\", \"ها\"] was rejected: the units joined together must equal the original word exactly. Answer again.", "The retry carries the gate's message. The model now knows what was wrong, not merely that something was."],
    ["assistant", "Model", '["و", "كتاب", "ها"]', "Corrected."],
    ["tool", "Gate (your code)", "PASS", "Only now does the result move on."],
    ["user", "Step 2 · request", "Tag each unit with one UD tag.\n<sentence>قرأتُ قصتها وكتابها</sentence>\n<units>و | كتاب | ها</units>", "The tagging step receives clean units, and the sentence too, so that context is not lost at the boundary."],
    ["assistant", "Model", "و/CCONJ  كتاب/NOUN  ها/PRON", "Its own gate then checks: three entries, same forms, tags in the tagset."]
  ];
  let ri;
  function resetRt() { ri = 0; $("rt-msgs").replaceChildren(); $("rt-note").textContent = "Press “Next step”."; $("rt-next").disabled = false; }
  $("rt-next").onclick = () => {
    const [cls, who, text, note] = STEPS[ri++];
    $("rt-msgs").querySelectorAll(".new").forEach(n => n.classList.remove("new"));
    $("rt-msgs").append(el("div", { class: `msg ${cls} new`, dir: "auto", style: "white-space:pre-wrap" }, el("span", { class: "who" }, who), Site.iso(text)));
    $("rt-note").textContent = note;
    $("rt-next").disabled = ri >= STEPS.length;
  };
  $("rt-reset").onclick = resetRt;
  resetRt();

  /* ---------- 4. Patterns ---------- */
  const SHAPES = ["Sequential", "Routing", "Parallel", "Generator and critic"];
  mountQuiz($("pt-box"), [
    { q: "Arabic and English input need different guidelines, and you do not want to pay for both on every request.", options: SHAPES, answer: 1, why: "Detect the language first (code can do this one), then send each input to its own prompt." },
    { q: "Segment a word, then tag the units, then find their lemmas.", options: SHAPES, answer: 0, why: "Each step needs the previous one's output. A plain pipeline with a gate after each step." },
    { q: "A 200-sentence document must be annotated quickly; sentences do not depend on each other.", options: SHAPES, answer: 2, why: "Independent pieces can run at the same time and be merged afterwards." },
    { q: "You generate a short usage note for a word, and want it checked against a style guide and revised if it falls short.", options: SHAPES, answer: 3, why: "Quality here can be described in criteria but not tested by code, so a second call reviews and the first revises." }
  ], "l08-shapes");

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "A chain has three steps, each 90% accurate, with no gates. Roughly how accurate is the whole?",
      options: ["90%", "81%", "73%", "97%"], answer: 2, why: "0.9 × 0.9 × 0.9 ≈ 0.73. Errors compound along the chain." },
    { q: "Which is the best gate for a segmentation step?",
      options: ["Ask another model whether the answer looks right", "Check in code that the units joined together equal the original word", "Check that the output is shorter than the input", "Run the step twice"],
      answer: 1, why: "It is an invariant: true of every correct answer, exact, free, and impossible to argue with." },
    { q: "A gate fails. What should the retry request contain?",
      options: ["The identical request", "The original input plus the gate's description of what was wrong", "A higher temperature only", "A different model's answer"],
      answer: 1, why: "The error message is new information. Sending the same request again mostly reproduces the same mistake." },
    { q: "The retry cap is reached and the output still fails. What now?",
      options: ["Pass the last output on anyway", "Retry until it works", "Fail loudly: raise an error or flag the item for a person", "Return an empty result silently"],
      answer: 2, why: "A known-bad result must never travel downstream, and unbounded retries hide a prompt problem while costing money." },
    { q: "Your tagging step receives only the units, with no sentence. What has the chain lost?",
      options: ["Nothing", "The context needed to resolve ambiguous words", "Its schema", "The ability to retry"],
      answer: 1, why: "Each call sees only what you pass. Boundaries between steps are where context disappears unless you carry it forward." }
  ], "l08");

  mountSaved();
  mountFinish($("finish"), "l08");
})();
