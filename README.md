# AI Engineering, through the lens of language

A 16-week self-study course in AI engineering for working developers. Every project is a linguistics / NLP project.

- `index.html` — course map (7 phases, 16 weeks, 32 lessons) with progress tracking
- `lessons/` — 32 pages, one per lesson: explanation, interactive exercises, a checkpoint, a lab, reading duties
- `assets/js/minicorpus.js` — a small three-genre corpus with concordance and frequency tools, used by the Phase 5 lessons
- `assets/js/curriculum.js` — the whole curriculum as data; add a lesson by setting its `href`

Plain HTML, CSS and JavaScript. No build step. Open `index.html` or serve the folder:

    python3 -m http.server 8000

Deployed with GitHub Pages through `.github/workflows/deploy.yml` (Settings → Pages → Source: GitHub Actions).
