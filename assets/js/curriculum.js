// The whole course as data. A lesson becomes clickable once it has an `href`.
window.COURSE = {
  title: "AI Engineering, through the lens of language",
  book: { name: "Jurafsky & Martin, Speech and Language Processing (3rd ed. draft)", url: "https://web.stanford.edu/~jurafsky/slp3/" },
  phases: [
    {
      id: "p1", name: "Foundations", color: "c1",
      goal: "Understand what a language model actually receives and returns, and talk to one from code.",
      project: "Tokenizer explorer: show how models split Arabic and English words, and how well the pieces line up with real morphemes.",
      weeks: [
        { n: 1, title: "How models see text", ling: "Morphology: morphemes, roots and patterns",
          lessons: [
            { id: "l01", title: "From text to tokens", href: "lessons/w01-l1-tokens.html", mins: 60 },
            { id: "l02", title: "Embeddings: meaning as geometry", href: "lessons/w01-l2-embeddings.html", mins: 60 }
          ],
          reading: "SLP3, the chapters on words and tokens (BPE section) and on vector semantics and embeddings" },
        { n: 2, title: "Talking to models from code", ling: "Language as a probability distribution",
          lessons: [
            { id: "l03", title: "Your first API call: messages, sampling, streaming", href: "lessons/w02-l3-api.html", mins: 75 },
            { id: "l04", title: "Structured output and tool calling", href: "lessons/w02-l4-structured.html", mins: 75 }
          ],
          reading: "SLP3, the chapter on n-gram language models; the Universal Dependencies POS tag definitions", milestone: "Ship the tokenizer explorer" }
      ]
    },
    {
      id: "p2", name: "Prompt and context engineering", color: "c2",
      goal: "Get reliable behaviour out of a model by controlling what it reads.",
      project: "Linguistic annotator: POS tags, lemmas and morphological features as validated JSON, zero-shot versus few-shot.",
      weeks: [
        { n: 3, title: "Writing prompts that work", ling: "Parts of speech and lemmas",
          lessons: [
            { id: "l05", title: "Anatomy of a prompt", href: "lessons/w03-l5-prompt.html", mins: 70 },
            { id: "l06", title: "Few-shot examples and task decomposition", href: "lessons/w03-l6-fewshot.html", mins: 70 }
          ],
          reading: "SLP3, the chapter on sequence labeling for parts of speech; Brown et al. (2020) on few-shot learning" },
        { n: 4, title: "Context is a budget", ling: "Morphological features: gender, number, case, aspect",
          lessons: [
            { id: "l07", title: "Choosing what goes in the context window", href: "lessons/w04-l7-context.html", mins: 70 },
            { id: "l08", title: "Prompt chains and validation", href: "lessons/w04-l8-chains.html", mins: 75 }
          ],
          reading: "Universal Dependencies pages on features and on tokenization; Liu et al. (2023), Lost in the Middle", milestone: "Ship the annotator" }
      ]
    },
    {
      id: "p3", name: "Evaluation", color: "c3",
      goal: "Replace \"it looks right\" with numbers you can defend.",
      project: "Score your annotator against a Universal Dependencies treebank: per-tag accuracy and a confusion matrix.",
      weeks: [
        { n: 5, title: "Measuring before improving", ling: "Gold-standard corpora and treebanks",
          lessons: [
            { id: "l09", title: "Why evals come first; building a test set", href: "lessons/w05-l9-testsets.html", mins: 70 },
            { id: "l10", title: "Accuracy, precision, recall, F1, confusion matrices", href: "lessons/w05-l10-metrics.html", mins: 75 }
          ],
          reading: "The UD CoNLL-U format page; SLP3, evaluation sections of the classification chapter" },
        { n: 6, title: "Evals that scale", ling: "Inter-annotator agreement",
          lessons: [
            { id: "l11", title: "Model-graded evals and their traps", href: "lessons/w06-l11-judges.html", mins: 75 },
            { id: "l12", title: "Regression-testing prompts like code", href: "lessons/w06-l12-regression.html", mins: 75 }
          ],
          reading: "Artstein & Poesio (2008) on inter-coder agreement; Zheng et al. (2023) on model judges", milestone: "Ship the eval harness" }
      ]
    },
    {
      id: "p4", name: "Retrieval", color: "c4",
      goal: "Give a model knowledge it was never trained on, and prove the right passages were found.",
      project: "Semantic search over a text corpus with cross-lingual queries (ask in Arabic, retrieve English), measured with recall@k.",
      weeks: [
        { n: 7, title: "Search by meaning", ling: "Distributional semantics: meaning from context",
          lessons: [
            { id: "l13", title: "From word counts to dense vectors", href: "lessons/w07-l13-vectors.html", mins: 70 },
            { id: "l14", title: "Chunking and indexing a corpus", href: "lessons/w07-l14-chunking.html", mins: 70 }
          ],
          reading: "SLP3, the chapter on vector semantics and embeddings" },
        { n: 8, title: "Hybrid retrieval", ling: "Lexical versus semantic similarity",
          lessons: [
            { id: "l15", title: "Keyword search (BM25) plus vectors", href: "lessons/w08-l15-hybrid.html", mins: 75 },
            { id: "l16", title: "Reranking and retrieval metrics", href: "lessons/w08-l16-rerank.html", mins: 75 }
          ],
          reading: "SLP3, the chapter on information retrieval" },
        { n: 9, title: "Grounded answers", ling: "Cross-lingual meaning",
          lessons: [
            { id: "l17", title: "Generating answers with citations", href: "lessons/w09-l17-rag.html", mins: 75 },
            { id: "l18", title: "Cross-lingual retrieval", href: "lessons/w09-l18-crosslingual.html", mins: 75 }
          ],
          reading: "Lewis et al. (2020) on RAG; Reimers & Gurevych (2020) on multilingual sentence embeddings", milestone: "Ship the semantic search" }
      ]
    },
    {
      id: "p5", name: "Agents and tools", color: "c5",
      goal: "Let a model plan, call tools and recover from its own mistakes.",
      project: "Corpus research agent with concordance, frequency and dictionary tools that writes sourced usage reports.",
      weeks: [
        { n: 10, title: "The agent loop", ling: "Corpus linguistics: concordance and collocation",
          lessons: [
            { id: "l19", title: "Think, act, observe: the loop", href: "lessons/w10-l19-loop.html", mins: 70 },
            { id: "l20", title: "Designing tools a model can use well", href: "lessons/w10-l20-tools.html", mins: 75 }
          ],
          reading: "The NLTK book, chapters 1 and 2; Church & Hanks (1990) on collocation" },
        { n: 11, title: "Memory, planning, failure", ling: "Register and genre variation",
          lessons: [
            { id: "l21", title: "Memory and planning", href: "lessons/w11-l21-memory.html", mins: 75 },
            { id: "l22", title: "Failure modes: loops, compounding errors, prompt injection", href: "lessons/w11-l22-failures.html", mins: 75 }
          ],
          reading: "Biber & Conrad on register; Greshake et al. (2023) on indirect prompt injection" },
        { n: 12, title: "Build and test the agent", ling: "Word usage across genres",
          lessons: [
            { id: "l23", title: "Building the corpus research agent", href: "lessons/w12-l23-build.html", mins: 80 },
            { id: "l24", title: "Evaluating agents", href: "lessons/w12-l24-agent-evals.html", mins: 75 }
          ],
          reading: "Sinclair, Corpus, Concordance, Collocation; Kapoor et al. (2024), AI Agents That Matter", milestone: "Ship the research agent" }
      ]
    },
    {
      id: "p6", name: "Production", color: "c6",
      goal: "Run it for real: see what it does, what it costs, and when it gets worse.",
      project: "Deploy the agent with tracing, caching and a cost budget.",
      weeks: [
        { n: 13, title: "Seeing inside", ling: "Error analysis as linguistic analysis",
          lessons: [
            { id: "l25", title: "Tracing and logging" },
            { id: "l26", title: "Monitoring quality drift" }
          ],
          reading: "A practitioner write-up on LLM observability" },
        { n: 14, title: "Cost and safety", ling: "Ambiguity and adversarial input",
          lessons: [
            { id: "l27", title: "Caching, model routing, cost control" },
            { id: "l28", title: "Guardrails and deployment" }
          ],
          reading: "A practitioner write-up on prompt injection defences", milestone: "Deploy the agent" }
      ]
    },
    {
      id: "p7", name: "Model adaptation", color: "c7",
      goal: "Know when changing the model beats changing the prompt, and how to do it.",
      project: "Fine-tune a small open model on diacritization (tashkeel) or dialect identification; compare with a prompted large model. Then the capstone workbench.",
      weeks: [
        { n: 15, title: "Changing the model", ling: "What models learn about syntax and phonology",
          lessons: [
            { id: "l29", title: "When fine-tuning beats prompting and retrieval" },
            { id: "l30", title: "Fine-tuning a small open model" }
          ],
          reading: "SLP3, the chapters on transformers and large language models" },
        { n: 16, title: "Capstone", ling: "Putting linguistic analysis to work",
          lessons: [
            { id: "l31", title: "Running open models locally; quantization" },
            { id: "l32", title: "Capstone: the linguistic analysis workbench" }
          ],
          reading: "Your own write-up: what worked, what the evals showed", milestone: "Ship the capstone" }
      ]
    }
  ]
};
