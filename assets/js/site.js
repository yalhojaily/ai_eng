// Shared helpers: progress storage, course map rendering, quiz and checklist components.
(function () {
  const KEY = "ai_eng_progress_v1";
  const mem = {};
  const store = {
    all() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return mem; } },
    get(k, d) { const v = this.all()[k]; return v === undefined ? d : v; },
    set(k, v) { const a = this.all(); a[k] = v; try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) { mem[k] = v; } }
  };
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") n.className = v; else if (k.startsWith("on")) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v);
    }
    for (const kid of kids) n.append(kid);
    return n;
  };
  const allLessons = () => COURSE.phases.flatMap(p => p.weeks.flatMap(w => w.lessons));
  const isDone = id => !!store.get("done:" + id, false);

  function updateMeter() {
    const ls = allLessons(), done = ls.filter(l => isDone(l.id)).length;
    document.querySelectorAll("[data-meter]").forEach(m => m.style.width = (100 * done / ls.length) + "%");
    document.querySelectorAll("[data-count]").forEach(c => c.textContent = done + " / " + ls.length + " lessons");
  }

  function renderMap(root) {
    for (const [i, p] of COURSE.phases.entries()) {
      const sec = el("section", { class: "phase", style: `--pc: var(--${p.color})` },
        el("div", { class: "tag" }, `Phase ${i + 1} · weeks ${p.weeks[0].n}–${p.weeks[p.weeks.length - 1].n}`),
        el("h2", {}, p.name),
        el("p", {}, p.goal),
        el("div", { class: "proj" }, el("b", {}, "Project: "), p.project));
      for (const w of p.weeks) {
        const ul = el("ul", { class: "lessons" });
        for (const l of w.lessons) {
          const done = isDone(l.id);
          const dot = el("span", { class: "dot" + (done ? " done" : l.href ? " open" : "") }, done ? "✓" : "");
          const name = l.href ? el("a", { href: l.href }, l.title) : el("span", { class: "soon" }, l.title);
          const li = el("li", {}, dot, name);
          if (l.href && !done) li.append(el("span", { class: "pill" }, l.mins ? `${l.mins} min` : "open"));
          if (!l.href) li.append(el("span", { class: "small", style: "margin-left:auto" }, "soon"));
          ul.append(li);
        }
        const card = el("div", { class: "card week" },
          el("h3", {}, el("span", { class: "wn" }, "Week " + w.n), w.title),
          el("p", { class: "meta" }, el("b", {}, "Linguistics thread: "), w.ling),
          ul,
          el("p", { class: "meta" }, el("b", {}, "Reading: "), w.reading));
        if (w.milestone) card.append(el("p", { class: "meta" }, el("b", {}, "Milestone: "), w.milestone));
        sec.append(card);
      }
      root.append(sec);
    }
  }

  // questions: [{ q, options: [..], answer: index, why }]
  function mountQuiz(root, questions, key) {
    let answered = 0, score = 0;
    const scoreEl = el("p", { class: "score", "aria-live": "polite" });
    questions.forEach((item, qi) => {
      const box = el("div", { class: "q" }, el("p", {}, `${qi + 1}. ${item.q}`));
      const why = el("div", { class: "why", hidden: "" });
      const buttons = item.options.map((text, oi) => el("button", {
        type: "button",
        onclick() {
          buttons.forEach(b => b.disabled = true);
          buttons[item.answer].classList.add("right");
          const ok = oi === item.answer;
          if (!ok) buttons[oi].classList.add("wrong");
          why.textContent = (ok ? "Correct. " : "Not quite. ") + item.why;
          why.hidden = false;
          answered++; if (ok) score++;
          if (answered === questions.length) {
            scoreEl.textContent = `Score: ${score} / ${questions.length}` + (score === questions.length ? ". Clean sweep." : ". Re-read the sections you missed, then move on.");
            store.set("quiz:" + key, score);
          }
        }
      }, text));
      box.append(...buttons, why);
      root.append(box);
    });
    root.append(scoreEl);
  }

  // Persist every checkbox and textarea that carries a data-save key.
  function mountSaved() {
    document.querySelectorAll("[data-save]").forEach(n => {
      const k = "save:" + n.dataset.save;
      if (n.type === "checkbox") { n.checked = !!store.get(k, false); n.addEventListener("change", () => store.set(k, n.checked)); }
      else { n.value = store.get(k, ""); n.addEventListener("input", () => store.set(k, n.value)); }
    });
  }

  function mountFinish(btn, id) {
    const paint = () => { btn.textContent = isDone(id) ? "✓ Lesson complete (tap to undo)" : "Mark lesson complete"; btn.classList.toggle("primary", !isDone(id)); };
    btn.addEventListener("click", () => { store.set("done:" + id, !isDone(id)); paint(); updateMeter(); });
    paint();
  }

  // Wrap each run of Arabic words in Unicode isolates, so mixed lists such as ["و", "كتاب"] keep their logical order on screen.
  const iso = s => s.replace(/[\u0600-\u06FF]+(?: [\u0600-\u06FF]+)*/g, m => "\u2068" + m + "\u2069");

  window.Site = { store, el, iso, renderMap, mountQuiz, mountSaved, mountFinish, updateMeter };
  document.addEventListener("DOMContentLoaded", updateMeter);
})();
