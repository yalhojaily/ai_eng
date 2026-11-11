// Lesson 3 interactives: request builder, stateless chat, sampling lab, streaming demo, cost calculator.
(function () {
  const { el, mountQuiz, mountSaved, mountFinish } = Site;
  const $ = id => document.getElementById(id);

  /* ---------- 1. Request builder ---------- */
  function paintReq() {
    const messages = [];
    if ($("rb-sys").value.trim()) messages.push({ role: "system", content: $("rb-sys").value });
    messages.push({ role: "user", content: $("rb-user").value });
    const body = { model: "provider/model-name", messages, temperature: +$("rb-temp").value, max_tokens: +$("rb-max").value };
    if ($("rb-stream").checked) body.stream = true;
    $("rb-tv").textContent = (+$("rb-temp").value).toFixed(1);
    $("rb-mv").textContent = $("rb-max").value;
    $("rb-out").textContent = "POST /api/v1/chat/completions\n\n" + JSON.stringify(body, null, 2);
  }
  ["rb-sys", "rb-user", "rb-temp", "rb-max", "rb-stream"].forEach(id => $(id).addEventListener("input", paintReq));
  paintReq();

  /* ---------- 2. Stateless chat ---------- */
  const SYSTEM = { role: "system", content: "You are a concise linguistics tutor." };
  const TURNS = [
    ["My favourite Arabic root is ك ت ب. What does it relate to?", "Writing: كتب (he wrote), كتاب (book), مكتبة (library)."],
    ["Give me one more word from it.", "كاتب, a writer."],
    ["And what is my favourite root, again?", "ك ت ب. I know only because your first message was sent to me again just now."]
  ];
  const rough = s => Math.ceil(s.length / 4) + 4; // crude estimate, plus a few tokens of per-message overhead
  let history, turn, billed;
  function msgNode(m, fresh) {
    return el("div", { class: `msg ${m.role}` + (fresh ? " new" : ""), dir: "auto" }, el("span", { class: "who" }, m.role), m.content);
  }
  function resetChat() {
    history = [SYSTEM]; turn = 0; billed = 0;
    $("ch-msgs").replaceChildren(msgNode(SYSTEM));
    $("ch-table").querySelectorAll("tr:not(:first-child)").forEach(r => r.remove());
    $("ch-next").disabled = false; $("ch-next").textContent = "Send next turn";
  }
  $("ch-next").onclick = () => {
    const [u, a] = TURNS[turn];
    $("ch-msgs").querySelectorAll(".new").forEach(n => n.classList.remove("new"));
    history.push({ role: "user", content: u });
    const sent = history.length, tokens = history.reduce((s, m) => s + rough(m.content), 0);
    billed += tokens;
    $("ch-msgs").append(msgNode(history[history.length - 1], true));
    history.push({ role: "assistant", content: a });
    $("ch-msgs").append(msgNode(history[history.length - 1], true));
    $("ch-table").append(el("tr", {}, el("td", {}, "#" + (turn + 1)), el("td", {}, String(sent)), el("td", {}, "≈ " + tokens), el("td", {}, "≈ " + billed)));
    turn++;
    if (turn === TURNS.length) { $("ch-next").disabled = true; $("ch-next").textContent = "Conversation over"; }
  };
  $("ch-reset").onclick = resetChat;
  resetChat();

  /* ---------- 3. Sampling lab ---------- */
  const BASE = [["coffee", .40], ["tea", .34], ["water", .10], ["milk", .06], ["soup", .04], ["sugar", .03], ["joy", .02], ["tokens", .01]];
  function shaped() {
    const T = +$("sp-temp").value, P = +$("sp-topp").value;
    let d = BASE.map(([w, p]) => [w, Math.pow(p, 1 / T)]);
    let z = d.reduce((s, x) => s + x[1], 0);
    d = d.map(([w, p]) => [w, p / z]).sort((a, b) => b[1] - a[1]);
    let cum = 0; const keep = [];
    for (const item of d) { keep.push(cum < P - 1e-9); cum += item[1]; }
    z = d.reduce((s, x, i) => s + (keep[i] ? x[1] : 0), 0);
    return d.map(([w, p], i) => ({ w, p: keep[i] ? p / z : 0, cut: !keep[i] }));
  }
  function paintSamp() {
    const d = shaped(), bars = $("sp-bars"); bars.replaceChildren();
    for (const { w, p, cut } of d) {
      const fill = el("i"); fill.style.width = (p * 100) + "%";
      bars.append(el("div", { class: "bar" + (cut ? " cut" : "") }, el("span", { class: "w" }, w), el("span", { class: "t" }, fill), el("span", { class: "p" }, cut ? "cut" : (p * 100).toFixed(0) + "%")));
    }
    const H = -d.reduce((s, x) => s + (x.p > 0 ? x.p * Math.log2(x.p) : 0), 0);
    $("sp-tv").textContent = (+$("sp-temp").value).toFixed(1);
    $("sp-pv").textContent = (+$("sp-topp").value).toFixed(2);
    $("sp-ent").replaceChildren(el("b", {}, "Entropy: "), H.toFixed(2) + " bits. ",
      el("span", { class: "small" }, `${d.filter(x => !x.cut).length} of ${d.length} words can still be chosen. ` + (H < 0.5 ? "Nearly deterministic." : H < 1.8 ? "A few real options." : "Wide open.")));
  }
  $("sp-draw").onclick = () => {
    const d = shaped(), tally = {};
    for (let i = 0; i < 30; i++) { let r = Math.random(); for (const x of d) { r -= x.p; if (r <= 0) { tally[x.w] = (tally[x.w] || 0) + 1; break; } } }
    $("sp-tally").textContent = Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w} ×${n}`).join("   ") + `   (${Object.keys(tally).length} distinct)`;
  };
  $("sp-temp").oninput = $("sp-topp").oninput = paintSamp;
  paintSamp();

  /* ---------- 4. Streaming demo ---------- */
  const TEXT = "The distributional hypothesis says that words which appear in similar contexts tend to have similar meanings, so a word can be described by counting the company it keeps.".split(" ");
  let pos = 0, timer = null, elapsed = 0, firstAt = null;
  const running = () => timer !== null;
  function paintStream() {
    $("st-b").textContent = TEXT.slice(0, pos).join(" ");
    $("st-a").textContent = pos >= TEXT.length ? TEXT.join(" ") : (pos ? "…waiting for the full answer…" : "");
    $("st-sv").textContent = $("st-speed").value;
    $("st-go").textContent = running() ? "Pause" : pos >= TEXT.length ? "Done" : pos ? "Resume" : "Start";
    $("st-go").disabled = pos >= TEXT.length;
    if (pos) $("st-info").textContent = `Elapsed ${elapsed.toFixed(1)}s · streaming showed its first token at ${firstAt.toFixed(1)}s · ` +
      (pos >= TEXT.length ? `the non-streaming pane showed nothing until ${elapsed.toFixed(1)}s.` : `the non-streaming pane has shown nothing yet (${pos}/${TEXT.length} tokens generated).`);
  }
  function tick() {
    const dt = 1 / +$("st-speed").value;
    elapsed += dt; pos++;
    if (firstAt === null) firstAt = elapsed;
    if (pos >= TEXT.length) stop();
    else { clearTimeout(timer); timer = setTimeout(tick, dt * 1000); }
    paintStream();
  }
  function stop() { clearTimeout(timer); timer = null; }
  $("st-go").onclick = () => { if (running()) stop(); else timer = setTimeout(tick, 1000 / +$("st-speed").value); paintStream(); };
  $("st-reset").onclick = () => { stop(); pos = 0; elapsed = 0; firstAt = null; $("st-info").textContent = "Press Start. You can pause at any point and change the speed while it runs."; paintStream(); };
  $("st-speed").oninput = paintStream;
  paintStream();

  /* ---------- 5. Cost calculator ---------- */
  function paintCost() {
    const v = id => Math.max(0, +$(id).value || 0);
    const per = (v("c-in") * v("c-pin") + v("c-out") * v("c-pout")) / 1e6, day = per * v("c-n");
    const share = per ? Math.round(100 * v("c-out") * v("c-pout") / 1e6 / per) : 0;
    const money = x => "$" + (x < 1 ? x.toFixed(4) : x.toFixed(2));
    $("c-res").replaceChildren(el("b", {}, money(per)), " per request · ", el("b", {}, money(day)), " per day · ", el("b", {}, money(day * 30)), " per 30 days. ",
      el("span", { class: "small" }, `Output accounts for ${share}% of the cost.`));
  }
  ["c-in", "c-out", "c-pin", "c-pout", "c-n"].forEach(id => $(id).addEventListener("input", paintCost));
  paintCost();

  /* ---------- Checkpoint ---------- */
  mountQuiz($("quiz-box"), [
    { q: "A user is on turn 10 of a chat. What does the request for turn 10 contain?",
      options: ["Only the user's tenth message", "A session ID the server uses to look up the chat", "The whole conversation so far, plus the new message", "Just the system message and the new message"],
      answer: 2, why: "The model is stateless. The application re-sends the full history every time, and pays for it every time." },
    { q: "You need the same extraction result on every run. Which setting helps most?",
      options: ["A low temperature", "A high temperature", "A higher max_tokens", "Turning streaming on"],
      answer: 0, why: "Low temperature concentrates probability on the top token, which makes outputs far more repeatable (though not perfectly identical)." },
    { q: "What does top_p = 0.8 do?",
      options: ["Keeps the 8 most likely tokens", "Keeps the most likely tokens whose probabilities sum to 0.8, and drops the rest", "Multiplies every probability by 0.8", "Stops generation after 80% of max_tokens"],
      answer: 1, why: "Nucleus sampling cuts the unlikely tail. The number of tokens kept changes from step to step, depending on how confident the model is." },
    { q: "A response has finish_reason “length”. What happened?",
      options: ["The prompt was too long", "The model chose to write a long answer", "The answer was cut off at max_tokens", "The request timed out"],
      answer: 2, why: "The output hit the cap mid-thought. Raise max_tokens or ask for a shorter answer, and never parse a truncated response as if it were complete." },
    { q: "Streaming makes the full response arrive…",
      options: ["sooner", "at about the same time, but the first tokens appear much earlier", "later, because of overhead", "with fewer tokens billed"],
      answer: 1, why: "Generation speed is unchanged. Streaming improves time to first token, which is what a waiting person perceives." }
  ], "l03");

  mountSaved();
  mountFinish($("finish"), "l03");
})();
