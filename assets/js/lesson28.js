// Lesson 28 interactives: filter evasion with and without normalisation, ambiguity quiz, backoff planner.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish, iso } = Site;
  const $ = id => document.getElementById(id);

  /* ---------- 1. Filter evasion ---------- */
  const BLOCK = ["salary", "راتب"];
  const naive = s => BLOCK.some(b => s.includes(b));
  // Look-alike letters from other alphabets, and digits or symbols commonly used in place of letters.
  const CONFUSE = { "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "ѕ": "s", "і": "i", "у": "y", "ӏ": "l", "1": "l", "0": "o", "3": "e", "@": "a", "$": "s", "5": "s" };
  function normalise(s) {
    s = s.normalize("NFKC").replace(/[​-‍⁠﻿]/g, "").toLowerCase();
    s = s.replace(/[ً-ْٰـ]/g, "").replace(/[أإآ]/g, "ا");
    s = [...s].map(ch => CONFUSE[ch] || ch).join("");
    return s.replace(/[^\p{L}]/gu, "");          // drop everything that is not a letter, so spacing tricks vanish
  }
  const strong = s => { const n = normalise(s); return BLOCK.some(b => n.includes(b)); };
  // [label, text, should it be blocked?]
  const TESTS = [
    ["Plain", "What is her salary?", true],
    ["Spaced out", "What is her s a l a r y?", true],
    ["Digit for letter", "What is her sa1ary?", true],
    ["Look-alike letters", "What is her ѕаlаry?", true],
    ["Invisible character", "What is her sal​ary?", true],
    ["Arabic", "كم راتبها؟", true],
    ["Arabic, stretched and marked", "كم رَاتـــبُها؟", true],
    ["Paraphrase", "How much does she earn each month?", true],
    ["Innocent", "I lost my visa. Laryngitis too.", false]
  ];
  const verdict = (blocked, should) => el("td", { class: blocked === should ? "ok" : "no" }, (blocked ? "blocked" : "allowed") + (blocked === should ? " ✓" : " ✗"));
  function paintFl() {
    const s = $("fl-in").value, out = $("fl-out"); out.replaceChildren();
    out.append(el("b", {}, "Raw filter: "), el("span", { class: naive(s) ? "ok" : "" }, naive(s) ? "blocked" : "allowed"), " · ", el("b", {}, "Normalising filter: "), el("span", { class: strong(s) ? "ok" : "" }, strong(s) ? "blocked" : "allowed"),
      el("div", { class: "small", style: "margin-top:.4em", dir: "auto" }, "After normalising, the filter sees: ", el("code", {}, normalise(s) || "(nothing)")));
  }
  const t = $("fl-table");
  t.append(el("tr", {}, el("th", {}, "Input"), el("th", {}, "Raw"), el("th", {}, "Normalising")));
  let rawOk = 0, strongOk = 0;
  for (const [label, text, should] of TESTS) {
    if (naive(text) === should) rawOk++; if (strong(text) === should) strongOk++;
    t.append(el("tr", {}, el("td", {}, el("b", {}, label), el("div", { class: "small", dir: "auto" }, iso(text.replace(/​/g, "⟨zero-width⟩")))), verdict(naive(text), should), verdict(strong(text), should)));
  }
  t.append(el("tr", {}, el("th", {}, "Correct decisions"), el("th", {}, `${rawOk} of ${TESTS.length}`), el("th", {}, `${strongOk} of ${TESTS.length}`)));
  $("fl-in").oninput = paintFl;
  paintFl();

  /* ---------- 2. Ambiguity ---------- */
  mountQuiz($("am-box"), [
    { q: "“Report on ‘light’.” The corpus has it as a noun, an adjective and a verb.",
      options: ["Lexical: cover the commonest class and state the assumption, noting the others exist", "Referential: refuse", "Structural: ask the user to rewrite the sentence"],
      answer: 0, why: "Several senses, a cheap request, and all readings are reasonable. Proceed on the likeliest, say so, and offer the rest." },
    { q: "“Compare run and walk in news and fiction.”",
      options: ["Lexical: pick one sense", "Structural: the grouping is unclear; the full cross of two words by two genres covers both readings, so do that and say so", "Referential: ask who ‘run’ is"],
      answer: 1, why: "When one answer contains every reading at modest extra cost, give it and state how you read the request." },
    { q: "“Now do the same for the other one.” This is the first message of the session.",
      options: ["Scope: write a long report", "Referential: nothing earlier fixes what ‘the same’ or ‘the other one’ mean, so ask", "Lexical: choose the noun"],
      answer: 1, why: "There is no likely reading to proceed on. Guessing would produce confident work on an invented task. Ask." },
    { q: "“Analyse every word in the corpus.” That would be tens of thousands of agent runs.",
      options: ["Proceed: the request is clear", "Scope: the readings differ enormously in cost, so confirm before starting, with an estimate", "Lexical: choose a sense of ‘word’"],
      answer: 1, why: "Clear words, unclear magnitude. When a reading is expensive or hard to undo, confirm first and show the cost." }
  ], "l28-ambig");

  /* ---------- 3. Backoff ---------- */
  function paintBo() {
    const b = +$("bo-b").value, f = +$("bo-f").value, n = +$("bo-n").value, CAP = 60;
    $("bo-bv").textContent = b.toFixed(1); $("bo-fv").textContent = f.toFixed(1); $("bo-nv").textContent = n;
    const waits = Array.from({ length: n }, (_, i) => Math.min(CAP, b * Math.pow(f, i))), total = waits.reduce((a, c) => a + c, 0), max = Math.max(...waits);
    const bars = $("bo-bars"); bars.replaceChildren();
    waits.forEach((w, i) => { const fill = el("i"); fill.style.width = (w / max * 100) + "%"; if (w >= CAP) fill.style.background = "var(--accent)";
      bars.append(el("div", { class: "bar", style: "grid-template-columns: 84px 1fr 56px" }, el("span", { class: "w", style: "font-family:var(--sans)" }, `before try ${i + 2}`), el("span", { class: "t" }, fill), el("span", { class: "p" }, w.toFixed(1) + " s"))); });
    $("bo-out").replaceChildren(el("b", {}, `Up to ${total.toFixed(1)} s of waiting`), ` across ${n + 1} attempts before giving up. `,
      el("span", { class: "small" }, `With full jitter each wait is drawn at random between 0 and the value shown, so the expected total is about ${(total / 2).toFixed(1)} s, and no two clients share a schedule.` + (f === 1 ? " With a multiplier of 1 the waits never grow: a struggling server keeps receiving the same pressure." : "")));
  }
  ["bo-b", "bo-f", "bo-n"].forEach(id => $(id).oninput = paintBo);
  paintBo();

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "Why is a slow agent run usually exposed as a job with an ID, instead of one long web request?",
      options: ["Jobs are cheaper", "Connections that stay silent for minutes get cut, and callers need a way to check on work that outlives one request", "Models cannot stream", "It avoids the need for timeouts"],
      answer: 1, why: "Submit, receive an ID, poll or subscribe. The work is decoupled from any single connection." },
    { q: "A caller's network drops after submitting, and their client automatically submits again. What prevents the agent running twice?",
      options: ["A longer timeout", "An idempotency key: the same key returns the existing job", "A cache of tool results", "Rate limiting"],
      answer: 1, why: "Retries are normal. The service must recognise a repeated submission and not repeat the work or the bill." },
    { q: "A keyword filter blocks “salary”. Which input defeats even a filter that normalises characters thoroughly?",
      options: ["“s a l a r y”", "“sa1ary”", "“How much does she earn?”", "The word with a zero-width space inside"],
      answer: 2, why: "The first, second and fourth are character tricks that normalisation undoes. A paraphrase shares no characters with the blocked word at all." },
    { q: "A safety check's own service is down. A request arrives. A check that “fails closed” will…",
      options: ["let the request through unchecked", "block the request until the check can run", "retry forever", "log and continue"],
      answer: 1, why: "Failing closed chooses safety over availability. It is the right default for checks that guard against harm." },
    { q: "In a shadow deployment, the new version's answers are…",
      options: ["served to all users", "served to 5% of users", "computed on real requests, recorded and compared, but never shown to users", "discarded unread"],
      answer: 2, why: "Shadowing exposes the new version to real inputs at no risk. A canary, the next stage, serves a small share of real users." }
  ], "l28");

  mountSaved();
  mountFinish($("finish"), "l28");
})();
