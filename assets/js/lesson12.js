// Lesson 12 interactives: per-item diff viewer, sign test, gate policy.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish, iso } = Site;
  const $ = id => document.getElementById(id);

  /* ---------- 1. Diff viewer ---------- */
  const ITEMS = ["is → AUX  (She is tall.)", "to → PART  (We want to leave.)", "to → ADP  (We went to Cairo.)", "that → SCONJ  (I know that he left.)", "that → DET  (That book is old.)",
    "can → AUX  (She can swim.)", "can → NOUN  (Open the can.)", "fast → ADV  (They drive fast.)", "book → VERB  (Book a flight.)", "ذهب → VERB  (ذهب الولد)", "ذهب → NOUN  (خاتم من ذهب)", "وكتابها → 3 units"];
  const BASE = [0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0];
  const CAND = { A: [1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1], B: [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0] };
  function paintDiff() {
    const which = document.querySelector("input[name=dv]:checked").value, c = CAND[which], t = $("dv-table");
    const sum = a => a.reduce((x, y) => x + y, 0);
    let fixed = 0, broken = 0;
    t.replaceChildren(el("tr", {}, el("th", {}, "Item"), el("th", {}, "Base"), el("th", {}, "New"), el("th", {}, "")));
    ITEMS.forEach((name, i) => {
      const st = BASE[i] === c[i] ? "" : c[i] ? "fixed" : "broken";
      if (st === "fixed") fixed++; if (st === "broken") broken++;
      const mark = v => el("td", { class: v ? "ok" : "no" }, v ? "✓" : "✗");
      t.append(el("tr", st ? { style: `background:var(--${st === "fixed" ? "good" : "bad"}-soft)` } : {}, el("td", { dir: "ltr" }, iso(name)), mark(BASE[i]), mark(c[i]), el("td", { class: st === "fixed" ? "ok" : st === "broken" ? "no" : "" }, st)));
    });
    $("dv-sum").replaceChildren(el("b", {}, `Accuracy ${sum(BASE)}/12 → ${sum(c)}/12. `), el("span", { class: "ok" }, `${fixed} fixed`), ", ", el("span", { class: broken ? "no" : "" }, `${broken} broken`), `, ${12 - fixed - broken} unchanged.`);
  }
  document.querySelectorAll("input[name=dv]").forEach(r => r.onchange = paintDiff);
  paintDiff();

  /* ---------- 2. Sign test ---------- */
  function choose(n, k) { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; }
  function signTest(f, b) {
    const n = f + b, k = Math.min(f, b); if (!n) return 1;
    let s = 0; for (let i = 0; i <= k; i++) s += choose(n, i);
    return Math.min(1, 2 * s / Math.pow(2, n));
  }
  function paintSign() {
    const f = Math.min(500, Math.max(0, Math.floor(+$("sg-f").value || 0))), b = Math.min(500, Math.max(0, Math.floor(+$("sg-b").value || 0)));
    const p = signTest(f, b), out = $("sg-out"); out.replaceChildren();
    if (!f && !b) { out.textContent = "No item changed. The two versions behave identically on this set."; return; }
    out.append(el("b", {}, `${f + b} flips, net ${f - b >= 0 ? "+" : ""}${f - b}. p = ${p < 0.001 ? "below 0.001" : p.toFixed(3)}. `),
      p < 0.05 ? el("span", { class: "ok" }, "Unlikely to be chance. ") : el("span", { class: "no" }, "Consistent with chance. "),
      p < 0.05 ? (f > b ? "The change probably helps." : "The change probably hurts.") : (f + b < 6 ? "Too few flips to conclude anything; you need more test items." : "A split like this happens often when a change does nothing."),
      b ? el("div", { class: "small", style: "margin-top:.4em" }, `Whatever the p-value, ${b} item${b === 1 ? "" : "s"} that worked before ${b === 1 ? "is" : "are"} now wrong. Read ${b === 1 ? "it" : "them"}.`) : "");
  }
  $("sg-f").oninput = $("sg-b").oninput = paintSign;
  paintSign();

  /* ---------- 3. Gate policy ---------- */
  const RUNS = [
    { name: "A · reworded guidelines", acc: 88.4, broken: 10, cost: 2, note: "+0.4 pts, 10 broken, cost +2%" },
    { name: "B · six more examples", acc: 89.1, broken: 1, cost: 35, note: "+1.1 pts, 1 broken, cost +35%" },
    { name: "C · cheaper model", acc: 87.2, broken: 3, cost: -40, note: "−0.8 pts, 3 broken, cost −40%" }
  ];
  function paintPol() {
    const a = +$("po-a").value, r = +$("po-r").value, c = +$("po-c").value;
    $("po-av").textContent = a.toFixed(1); $("po-rv").textContent = r; $("po-cv").textContent = c;
    const list = $("po-list"); list.replaceChildren();
    for (const run of RUNS) {
      const why = [];
      if (run.acc < 88.0 - a - 1e-9) why.push("accuracy drop");
      if (run.broken > r) why.push("too many broken items");
      if (run.cost > c) why.push("cost increase");
      list.append(el("div", { class: "msg", style: `border-left:4px solid var(--${why.length ? "bad" : "good"})` },
        el("span", { class: "who" }, run.name), run.note + ". ", el("b", { class: why.length ? "no" : "ok" }, why.length ? "BLOCKED: " + why.join(", ") : "PASSES")));
    }
  }
  ["po-a", "po-r", "po-c"].forEach(id => $(id).oninput = paintPol);
  paintPol();

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "A regression is…",
      options: ["any wrong answer", "something that worked before a change and fails after it", "a statistical method only", "a slow response"],
      answer: 1, why: "The term is about change over time, which is why you need stored results from earlier versions to detect one." },
    { q: "Two prompt versions both score 88%. What should you look at next?",
      options: ["Nothing: they are equivalent", "The items whose outcome changed between them", "The temperature", "The longest outputs"],
      answer: 1, why: "Equal averages can hide equal numbers of fixes and breaks. The per-item diff shows what actually moved." },
    { q: "For the sign test, which items carry information about whether a change helped?",
      options: ["All items", "Only items both versions got right", "Only items whose outcome flipped", "Only the first hundred"],
      answer: 2, why: "Items that came out the same under both versions say nothing about the difference between them." },
    { q: "Why cache model responses in an eval harness?",
      options: ["To hide results from reviewers", "So that reruns are free and identical unless the model, prompt or input changed", "To raise accuracy", "Caching is required by providers"],
      answer: 1, why: "Cheap, repeatable reruns are what make running the suite on every change practical." },
    { q: "Your provider announces that the model you use will be retired. The first step is to…",
      options: ["Rewrite all prompts from scratch", "Run the existing eval suite on the replacement model and read the diff", "Switch immediately and watch for complaints", "Raise max_tokens"],
      answer: 1, why: "A model change is a behaviour change. The harness turns it from a leap into a measured comparison." }
  ], "l12");

  mountSaved();
  mountFinish($("finish"), "l12");
})();
