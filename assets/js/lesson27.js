// Lesson 27 interactives: cache simulator with wrong-hit counting, cascade pricing.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);

  /* ---------- 1. Cache simulator ---------- */
  // [request text, true intent]
  const REQ = [
    ["How is run used in news?", "run-news"],
    ["how is run used in news", "run-news"],
    ["How is run used in news?", "run-news"],
    ["How is the word run used in news writing?", "run-news"],
    ["How is run used in fiction?", "run-fiction"],
    ["How is run not used in news?", "run-news-negated"],
    ["What does issue mean in news?", "issue-news"],
    ["What does issue mean in news?", "issue-news"],
    ["what does ISSUE mean in news", "issue-news"],
    ["In news, what does issue mean?", "issue-news"],
    ["What does issue mean in fiction?", "issue-fiction"],
    ["How is run used in news?", "run-news"]
  ];
  const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const wordset = s => new Set(norm(s).split(" "));
  const sim = (a, b) => { const A = wordset(a), B = wordset(b), inter = [...A].filter(x => B.has(x)).length; return inter / new Set([...A, ...B]).size; };
  function paintCs() {
    const mode = $("cs-mode").value, th = +$("cs-t").value; $("cs-trow").hidden = mode !== "sem"; $("cs-tv").textContent = th.toFixed(2);
    const store = [], t = $("cs-table"); let hits = 0, wrong = 0;
    t.replaceChildren(el("tr", {}, el("th", {}, "#"), el("th", {}, "Request"), el("th", {}, "Result")));
    REQ.forEach(([text, intent], i) => {
      let match = null, score = 0;
      for (const e of store) {
        const s = mode === "exact" ? +(e.text === text) : mode === "norm" ? +(norm(e.text) === norm(text)) : mode === "sem" ? sim(e.text, text) : 0;
        if (s > score) { score = s; match = e; }
      }
      const hit = match && (mode === "sem" ? score >= th - 1e-9 : score === 1);
      let cell;
      if (hit) { hits++; const ok = match.intent === intent; if (!ok) wrong++;
        cell = el("td", { class: ok ? "ok" : "no" }, ok ? "hit" : "WRONG hit", el("div", { class: "small", style: "font-weight:400" }, `served #${match.n}` + (mode === "sem" ? `, similarity ${score.toFixed(2)}` : "")));
      } else { store.push({ text, intent, n: i + 1 }); cell = el("td", {}, "model call"); }
      t.append(el("tr", hit && match.intent !== intent ? { style: "background:var(--bad-soft)" } : {}, el("td", {}, String(i + 1)), el("td", {}, text), cell));
    });
    $("cs-out").replaceChildren(el("b", {}, `${REQ.length - hits} model calls, ${hits} served from cache`), ` (${Math.round(hits / REQ.length * 100)}% saved). `,
      wrong ? el("b", { class: "no" }, `${wrong} user${wrong === 1 ? "" : "s"} received the answer to a different question.`) : el("span", { class: "ok" }, "No wrong answers."));
  }
  $("cs-mode").onchange = $("cs-t").oninput = paintCs;
  paintCs();

  /* ---------- 2. Cascade ---------- */
  function paintCa() {
    const g = +$("ca-g").value / 100, r = +$("ca-r").value, f = +$("ca-f").value / 100;
    $("ca-gv").textContent = Math.round(g * 100) + "%"; $("ca-rv").textContent = r + "×"; $("ca-fv").textContent = Math.round(f * 100) + "%";
    const cascade = 1 + (1 - g) * r, saving = 1 - cascade / r, bars = $("ca-bars"); bars.replaceChildren();
    for (const [name, v, col] of [["always strong", r, "var(--muted)"], ["cascade", cascade, saving > 0 ? "var(--teal)" : "var(--bad)"], ["always cheap", 1, "var(--line)"]]) {
      const fill = el("i"); fill.style.width = (v / Math.max(r, cascade) * 100) + "%"; fill.style.background = col;
      bars.append(el("div", { class: "bar", style: "grid-template-columns: 104px 1fr 50px" }, el("span", { class: "w", style: "font-family:var(--sans)" }, name), el("span", { class: "t" }, fill), el("span", { class: "p" }, v.toFixed(1) + "×")));
    }
    const out = $("ca-out"); out.replaceChildren();
    out.append(saving > 0 ? el("b", { class: "ok" }, `The cascade costs ${Math.round(saving * 100)}% less than always using the strong model. `) : el("b", { class: "no" }, `The cascade costs ${Math.round(-saving * 100)}% MORE than always using the strong model. `),
      `Every request pays for the cheap attempt; ${Math.round((1 - g) * 100)}% then pay for the strong one as well. `,
      el("span", { class: f > 0.05 ? "no" : "" }, `Out of 1,000 requests, about ${Math.round(g * f * 1000)} receive a wrong answer that the gate let through.`));
  }
  ["ca-g", "ca-r", "ca-f"].forEach(id => $(id).oninput = paintCa);
  paintCa();

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "In a typical agent, where do most tokens go?",
      options: ["Output tokens of the final answer", "Input tokens: earlier messages and tool results re-sent at every step", "The system prompt alone", "Tool definitions"],
      answer: 1, why: "History is re-sent each step, so input dominates, and most of it is repeated content. That is what prefix caching and compaction attack." },
    { q: "You re-index the corpus with corrections. What should happen to cached tool results?",
      options: ["Nothing", "They should stop being used, which happens automatically if the corpus version is part of the cache key", "They should be served for one more day", "They should be edited by hand"],
      answer: 1, why: "Put every input that affects the answer into the key. Changing the version makes old entries unreachable." },
    { q: "A semantic cache serves the stored answer to “How is run used in news?” for the new question “How is run not used in news?”. This shows that…",
      options: ["the cache is too small", "high similarity does not guarantee the same intent; one word can reverse it", "the threshold is too high", "normalisation was skipped"],
      answer: 1, why: "Negation barely changes word overlap or embeddings and completely changes the question." },
    { q: "A cascade is only as safe as…",
      options: ["the cheap model's price", "the gate that decides whether to accept the cheap model's answer", "the strong model's speed", "the number of users"],
      answer: 1, why: "A wrong answer that passes the gate is delivered. The gate's miss rate is the cascade's quality cost." },
    { q: "What is a service-wide daily spending limit for?",
      options: ["Improving accuracy", "Capping the damage when something loops or is abused, before the invoice reveals it", "Speeding up requests", "Replacing per-request limits"],
      answer: 1, why: "It is the backstop behind per-request and per-user limits, and should trigger a planned degraded mode and an alert." }
  ], "l27");

  mountSaved();
  mountFinish($("finish"), "l27");
})();
