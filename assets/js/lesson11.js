// Lesson 11 interactives: grade-then-compare exercise with live kappa, 2x2 kappa calculator.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish, iso } = Site;
  const $ = id => document.getElementById(id);

  // Cohen's kappa for two binary graders from a 2x2 table [[both pass, A pass/B fail], [A fail/B pass, both fail]]
  function kappa2(t) {
    const n = t[0][0] + t[0][1] + t[1][0] + t[1][1]; if (!n) return null;
    const po = (t[0][0] + t[1][1]) / n, pa = (t[0][0] + t[0][1]) / n, pb = (t[0][0] + t[1][0]) / n;
    const pe = pa * pb + (1 - pa) * (1 - pb);
    return { n, po, pe, k: pe < 1 ? (po - pe) / (1 - pe) : 1 };
  }
  const band = k => k > 0.8 ? "strong" : k > 0.6 ? "substantial" : k > 0.4 ? "moderate" : k > 0.2 ? "weak" : "no better than chance, or close to it";

  /* ---------- 1. Grade, then meet the judge ---------- */
  // rubric: expected verdict under the three written criteria; judge: scripted verdict; why: shown when they differ
  const ITEMS = [
    { s: "They fished from the BANK.", note: "Here “bank” means the land along the edge of a river.", rubric: 1, judge: 1 },
    { s: "They fished from the BANK.", note: "A bank is a financial institution where people keep money.", rubric: 0, judge: 0 },
    { s: "I know THAT he left.", note: "Here “that” introduces the clause “he left”; it does not point at anything.", rubric: 1, judge: 1 },
    { s: "اشترت خاتماً من ذهب.", note: "Here ذهب is the noun “gold”, the material of the ring. It can also be a verb meaning “went”, as in ذهب الولد. Arabic leaves short vowels unwritten, so the two look the same.", rubric: 0, judge: 1,
      why: "Three sentences, so criterion (b) fails. The judge passed it anyway: accurate, detailed and long. This is verbosity bias." },
    { s: "Open the CAN.", note: "Here “can” is a modal verb expressing ability.", rubric: 0, judge: 0 },
    { s: "They drive FAST.", note: "Here “fast” is an adverb describing how they drive.", rubric: 1, judge: 1 },
    { s: "She IS tall.", note: "Here “is” links the subject “she” to the description “tall”.", rubric: 1, judge: 0,
      why: "All three criteria hold. The judge failed it for not naming the part of speech, a requirement the rubric never made. This is criteria drift." },
    { s: "We went TO Cairo.", note: "“To” is a common English word.", rubric: 0, judge: 0 }
  ];
  let mine;
  function buildGrade() {
    mine = ITEMS.map(() => null);
    const root = $("gr-items"); root.replaceChildren();
    ITEMS.forEach((it, i) => {
      const mk = (label, v) => { const b = el("button", { type: "button", style: "padding:6px 12px" }, label); b.onclick = () => { mine[i] = v; pass.classList.toggle("primary", v === 1); fail.classList.toggle("primary", v === 0); $("gr-reveal").disabled = mine.includes(null); }; return b; };
      const pass = mk("Pass", 1), fail = mk("Fail", 0);
      root.append(el("div", { class: "split", id: "gr-" + i },
        el("div", { class: "small", dir: "auto" }, iso(it.s)), el("div", { dir: "auto", style: "margin:4px 0 8px" }, iso(it.note)), el("div", { class: "row", style: "margin:0" }, pass, fail), el("div", { class: "small gr-fb", style: "margin-top:6px" })));
    });
    $("gr-reveal").disabled = true; $("gr-out").textContent = "Grade all eight to continue.";
  }
  $("gr-reveal").onclick = () => {
    const t = [[0, 0], [0, 0]]; let followed = 0;
    ITEMS.forEach((it, i) => {
      t[mine[i] ? 0 : 1][it.judge ? 0 : 1]++; if (mine[i] === it.rubric) followed++;
      const fb = document.querySelector(`#gr-${i} .gr-fb`); fb.replaceChildren();
      fb.append(el("b", {}, `Judge: ${it.judge ? "Pass" : "Fail"}. `), mine[i] === it.judge ? "You agree. " : el("span", { class: "no" }, "You disagree. "));
      if (it.why) fb.append(it.why);
      else if (mine[i] !== it.rubric) fb.append("By the written criteria this one should " + (it.rubric ? "pass." : "fail."));
    });
    const r = kappa2(t);
    $("gr-out").replaceChildren(el("b", {}, `You and the judge agree on ${Math.round(r.po * 8)} of 8 (${(r.po * 100).toFixed(0)}%). Kappa ${r.k.toFixed(2)}`), `: ${band(r.k)}. `,
      el("span", { class: "small" }, `Your own grades matched the rubric as written on ${followed} of 8. Scroll up to read the notes under each item. With only eight items kappa is very rough; the lab uses forty.`));
  };
  $("gr-reset").onclick = buildGrade;
  buildGrade();

  /* ---------- 2. Kappa calculator ---------- */
  const PRE = { "Good judge": [[40, 3], [4, 53]], "High agreement, low kappa": [[90, 0], [10, 0]], "Lenient judge": [[45, 0], [25, 30]], "Coin flip": [[25, 25], [25, 25]] };
  let T = PRE["Good judge"].map(r => r.slice()); const cells = [[], []];
  const kt = $("kp-table");
  kt.append(el("tr", {}, el("th", {}, "you ↓ / judge →"), el("th", {}, "Pass"), el("th", {}, "Fail")));
  ["Pass", "Fail"].forEach((name, i) => {
    const row = el("tr", {}, el("th", {}, name));
    [0, 1].forEach(j => { const inp = el("input", { type: "number", min: "0", style: "width:70px;text-align:center", "aria-label": `you ${name}, judge ${j ? "Fail" : "Pass"}` }); inp.oninput = () => { T[i][j] = Math.max(0, Math.floor(+inp.value || 0)); paintK(); }; cells[i][j] = inp; row.append(el("td", {}, inp)); });
    kt.append(row);
  });
  function paintK(sync) {
    if (sync) [0, 1].forEach(i => [0, 1].forEach(j => cells[i][j].value = T[i][j]));
    const r = kappa2(T), out = $("kp-out"); out.replaceChildren();
    if (!r) { out.textContent = "Enter some counts."; return; }
    out.append(el("b", {}, `Observed agreement ${(r.po * 100).toFixed(0)}%`), ` · agreement expected by chance ${(r.pe * 100).toFixed(0)}% · `, el("b", {}, `kappa ${r.k.toFixed(2)}`), ` (${band(r.k)}). `);
    const missed = T[1][0], youFail = T[1][0] + T[1][1];
    if (youFail) out.append(el("span", { class: "small" }, `Of the ${youFail} outputs you failed, the judge passed ${missed}.`));
  }
  for (const name of Object.keys(PRE)) $("kp-presets").append(el("button", { type: "button", onclick() { T = PRE[name].map(r => r.slice()); paintK(true); } }, name));
  paintK(true);

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "You need to check that every note is at most 30 words long. The right tool is…",
      options: ["a model judge", "a code check", "embedding similarity", "human review"],
      answer: 1, why: "Use the cheapest method that can measure the property. Length is exact and free to test in code." },
    { q: "Which judge design is more reliable?",
      options: ["Score the answer from 1 to 10 for overall quality", "For one stated criterion, give reasoning and then PASS or FAIL", "Ask whether the answer is good", "Return a percentage"],
      answer: 1, why: "A single clear criterion, reasoning first, and a coarse verdict. Fine-grained overall scores are inconsistent." },
    { q: "Two graders agree on 90% of items and kappa is 0.05. What happened?",
      options: ["A calculation error", "Nearly everything got the same label, so agreement was almost all chance", "The graders are excellent", "The sample was too large"],
      answer: 1, why: "When one label dominates, high raw agreement is cheap. Kappa removes the part chance would produce." },
    { q: "A judge compares answer A with answer B. How do you guard against position bias?",
      options: ["Always put your preferred answer first", "Run each comparison in both orders and keep only verdicts that do not flip", "Use a higher temperature", "Ask for a longer explanation"],
      answer: 1, why: "If the verdict changes when the order changes, the judge was responding to position, not quality." },
    { q: "What must happen before you trust a model judge's scores?",
      options: ["It must be the largest available model", "Its verdicts must be compared with human labels on the same items", "It must agree with itself", "Nothing: judges are objective"],
      answer: 1, why: "A judge is an annotator. Its reliability is an empirical question, answered by measuring agreement with people." }
  ], "l11");

  mountSaved();
  mountFinish($("finish"), "l11");
})();
