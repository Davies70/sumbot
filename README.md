# Local Text Summarizer — Detailed Step-by-Step Blueprint

**One-sentence summary:** A 100% offline, in-browser extractive text summarizer with keyword extraction, sentence highlighting, and a polished Tailwind UI — built with vanilla JS and free open-source NLP libs (compromise or nlp.js) and optional Web Worker for heavy processing.

---

## Goals

- Let users paste or drop long text and instantly get a useful extractive summary.
- Run entirely in the browser (no paid APIs, no server-side processing).
- Provide keyword extraction and "highlight important sentences" UX so the summarization is explainable.
- Be visually polished and portfolio-ready.

---

## Core Features (MVP)

- Plain-text input (paste or drag-and-drop) and file upload (txt, md).
- Extractive summarization (select top N sentences using TextRank-like algorithm or TF scoring).
- Keyword extraction (top K keywords / tag cloud).
- Highlighting of chosen sentences in the original text (click to show sentence score).
- Controls: summary length (short/medium/long), number of keywords, toggle sentence highlighting.
- Copy summary, download as `.txt` or `.pdf` (client-side with jsPDF), save to local storage.

## Nice-to-have / stretch features

- Web Worker for background processing of large texts.
- Animations for sentence selection (explainability: show scoring bars).
- Shareable permalink (encoded summary in URL or saved to IndexedDB + short id).
- Small offline dictionary for stemming/stopwords localisation (German/English), language detection.
- Visual keyword cloud using D3 or simple canvas.

---

## Tech stack

- UI: Vanilla JS + TailwindCSS (use CDN for quick demo, or PostCSS/Tailwind via Vite for production build).
- NLP: **Compromise** (lightweight, runs in-browser) — or **nlp.js** if you want additional features. We'll use `compromise` examples in snippets.
- Optional: `jsPDF` for PDF export, `idb` (tiny IndexedDB wrapper) for persistent saves.
- Build: Vite (recommended for nicer dev DX), or pure static HTML for simplest demo.

---

## High level architecture & data flow

1. User pastes text into the editor.
2. Frontend normalizes text (clean whitespace, normalize punctuation).
3. Split text into sentences.
4. Tokenize sentences and compute word-level statistics (frequency, stopword removal).
5. Build sentence similarity matrix and run PageRank (TextRank) **or** score sentences by TF heuristics.
6. Select top sentences by score and reorder them by original position to produce summary.
7. Extract keywords by frequency/RAKE-like scoring.
8. Render summary + highlight sentences in original text + show keyword cloud.

---

## Algorithm choices (offline-friendly)

### A. Extractive summarization: TextRank (recommended)

- Convert each sentence into a bag-of-words vector (term frequency).
- Sentence similarity = cosine similarity between sentence vectors.
- Build a graph where sentences are nodes and edges weights = similarity.
- Run PageRank over the graph to get sentence importance scores.
- Choose top-K sentences by score, then order by original position.

**Why TextRank?** It is unsupervised, unspecialised, and performs well without external models.

### B. Simpler alternative: TF scoring with heuristics

- Score sentence = sum of word frequencies (higher for content words) + bonuses for:

  - Presence of title words
  - Sentence position (e.g., first/last sentence bonuses)
  - Sentence length penalty (too short/too long reduced)

This is lighter than TextRank and faster for very-large documents.

### Keyword extraction: RAKE-like / frequency

- Remove stopwords, normalize words (lowercase + light stemming via compromise), count frequencies.
- Compose multi-word candidate phrases (consecutive non-stop words) and score them by frequency × phrase length.
- Return top-K keywords/phrases.

---

## UX & UI design (wireframe)

Top area: Title + one-line description

Main layout (two-column on desktop, stacked on mobile):

- Left column (input): Textarea / file drop + options (language, algorithm choice, slider for summary length)
- Right column (output): Summary box (copy / download buttons), keywords tag cloud, original text with highlights

Footer: About, Save, Reset, Accessibility options (font-size, contrast), demo sample buttons (load sample text)

**Presentation tips**

- Use subtle rounded cards, soft shadows, and clear contrast for the summary.
- Show a small progress spinner when computing for large texts.
- Animate sentence highlights one-by-one when summary generated to make it feel smart.

---

## Implementation — Step-by-step plan (ordered tasks)

### Setup & skeleton

1. Create project folder and `index.html`, `main.js`, `styles.css` (or init Vite + npm).

   - Quick option (no build): Use Tailwind CDN in `index.html` and include `compromise` via CDN.
   - Production option: `npm init vite@latest`, add `tailwindcss` and build pipeline.

2. Build UI layout: header, left (input) and right (output) panels. Add controls: summary length (slider), algorithm toggle, keyword count.

3. Hook paste/typing events to a `debounce` handler that stores raw text in memory.

### Core NLP functions (implement and test in plain JS first)

4. **Sentence split**: function `splitSentences(text)` — basic rule-based split using punctuation regex that keeps abbreviations in mind (a pragmatic approach). Test with sample text.

5. **Tokenize & normalize**: `tokenize(sentence)` using `compromise` or regex. Lowercase, remove punctuation, filter stopwords.

6. **Build sentence vectors**: For TextRank implement simple bag-of-words: for each sentence produce a frequency map of content words.

7. **Similarity function**: `cosineSimilarity(vecA, vecB)`.

8. **Build similarity matrix**: NxN matrix of similarities. Optionally threshold small similarities to 0.

9. **PageRank**: Implement a small PageRank runner: `pageRank(adjMatrix, damping=0.85, maxIter=100, eps=1e-6)` → returns scores.

10. **Select top sentences**: choose top-K sentences based on score or use a proportion of total sentences based on `summary length` setting.

11. **Keyword extraction**: implement RAKE-like using phrase splitting and frequency scoring.

12. **Highlight mapping**: Wrap sentences in the original text DOM with `<span data-sent-index>` so the UI can highlight top sentences and show scores on hover.

### Integrate with UI

13. Wire generate button / event to call summarizer pipeline. For large input, run inside a Web Worker (see step 16).

14. Render summary with buttons: Copy, Download TXT, Export PDF (jsPDF usage snippet), Save to local storage.

15. Render keywords as tags and a small cloud (font-size \~ frequency). Clicking a keyword highlights sentences containing it.

### Performance / reliability

16. Add a Web Worker implementation for heavy steps (vectorization, similarity matrix and PageRank). Worker communicates via `postMessage`; main thread shows progress.

17. Add streaming or chunked processing for extremely long inputs (split into paragraphs and rank within paragraphs, then combine – practical heuristic to avoid O(N^2) explosion if N (#sentences) is huge).

18. Add a cancel button and timeouts to protect the UI.

### Polish & presentability

19. Add small UX flows: "Load sample", small tutorial tooltip, and animated sentence highlights.

20. Add accessibility features: keyboard focus on controls, `aria-live` for summary updates, high-contrast mode.

21. Create a demo README, a short demo video/gif (use screen recorder), and a short case-study description: what you built, technical choices, algorithm trade-offs, performance numbers.

22. Host the static site (GitHub Pages, Netlify, or Vercel). Since it’s client-only, any static host works.

---

## Important code snippets

> Note: these snippets are intentionally small and readable. You can paste them into `main.js` or a dedicated module and expand.

### 1) Sentence splitting (simple):

```js
function splitSentences(text) {
  // naive but practical: split on punctuation followed by space + capital letter
  // fallback: split on [.?!]\s+
  const sentences = text
    .replace(/\n+/g, ' ') // collapse newlines
    .match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [text];
  return sentences.map((s) => s.trim()).filter(Boolean);
}
```

### 2) Tokenize & normalize with compromise (optional):

```html
<!-- include via CDN in index.html for simplest setup -->
<script src="https://unpkg.com/compromise@latest/builds/compromise.min.js"></script>
```

```js
function getWords(sentence) {
  // using compromise's .terms() gives lemmatized forms in many cases
  const doc = nlp(sentence);
  // get normal words, filter punctuation and stopwords
  const terms = doc.terms().out('array');
  return terms.map((t) => t.toLowerCase()).filter(Boolean);
}
```

If you prefer zero-deps, do: `sentence.toLowerCase().match(/\b[\w']+\b/g)` and then filter stopwords.

### 3) Build sentence frequency maps & vectors

```js
function buildSentenceMaps(sentences) {
  const stopwords = new Set([
    'the',
    'and',
    'of',
    'to',
    'a',
    'in',
    'is',
    'it',
    'that' /* expand list */,
  ]);
  const maps = sentences.map((s) => {
    const words = (s.toLowerCase().match(/\b[\w']+\b/g) || []).filter(
      (w) => !stopwords.has(w)
    );
    const freq = {};
    for (const w of words) freq[w] = (freq[w] || 0) + 1;
    return freq;
  });
  return maps;
}

function vocabFromMaps(maps) {
  const vocab = new Map();
  let idx = 0;
  for (const m of maps)
    for (const w of Object.keys(m)) if (!vocab.has(w)) vocab.set(w, idx++);
  return vocab;
}

function mapsToVectors(maps, vocab) {
  const vectors = maps.map((m) => {
    const vec = new Float32Array(vocab.size);
    for (const [w, c] of Object.entries(m)) {
      const i = vocab.get(w);
      if (i !== undefined) vec[i] = c;
    }
    return vec;
  });
  return vectors;
}
```

### 4) Cosine similarity (two Float32Array vectors)

```js
function cosine(a, b) {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
```

### 5) PageRank (iterative)

```js
function pageRank(
  simMatrix,
  options = { damping: 0.85, maxIter: 100, tol: 1e-6 }
) {
  const n = simMatrix.length;
  const d = options.damping;
  let ranks = new Array(n).fill(1 / n);
  const outSums = new Array(n).fill(0);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) outSums[i] += simMatrix[i][j];

  for (let iter = 0; iter < options.maxIter; iter++) {
    const newRanks = new Array(n).fill((1 - d) / n);
    let diff = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (simMatrix[j][i] > 0 && outSums[j] > 0) {
          newRanks[i] += d * (simMatrix[j][i] / outSums[j]) * ranks[j];
        }
      }
    }
    for (let i = 0; i < n; i++) diff += Math.abs(newRanks[i] - ranks[i]);
    ranks = newRanks;
    if (diff < options.tol) break;
  }
  return ranks;
}
```

> Note: `simMatrix` is an NxN numeric matrix where `simMatrix[i][j]` is weight from i->j.

### 6) Picking top sentences and producing summary

```js
function summarize(sentences, ranks, maxSentences = 5) {
  const indexed = sentences.map((s, i) => ({ s, i, score: ranks[i] }));
  indexed.sort((a, b) => b.score - a.score);
  const top = indexed.slice(0, maxSentences).sort((a, b) => a.i - b.i);
  return top.map((x) => x.s).join(' ');
}
```

### 7) Simple RAKE-like keyword extraction

```js
function extractKeywords(text, topK = 10) {
  const stopwords = new Set([
    'the',
    'and',
    'of',
    'to',
    'a',
    'in',
    'is',
    'it',
    'that' /* expand */,
  ]);
  const words = text.toLowerCase().match(/\b[\w']+\b/g) || [];
  const phrases = [];
  let current = [];
  for (const w of words) {
    if (stopwords.has(w)) {
      if (current.length) {
        phrases.push(current.join(' '));
        current = [];
      }
    } else current.push(w);
  }
  if (current.length) phrases.push(current.join(' '));

  const freq = {};
  for (const p of phrases) freq[p] = (freq[p] || 0) + 1;
  const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  return entries.slice(0, topK).map((e) => e[0]);
}
```

### 8) Web Worker skeleton (important for big texts)

**main.js**

```js
const worker = new Worker('summ-worker.js');
worker.postMessage({ type: 'summarize', text: largeText, options });
worker.onmessage = (ev) => {
  if (ev.data.type === 'progress') updateProgress(ev.data.value);
  if (ev.data.type === 'result') renderSummary(ev.data.result);
};
```

**summ-worker.js**

```js
self.onmessage = (ev) => {
  if (ev.data.type === 'summarize') {
    const { text, options } = ev.data;
    // run the pipeline: split, tokenize, build vectors, sim matrix, pagerank
    // periodically postMessage({type:'progress', value:0.1})
    const result = runSummarizer(text, options);
    self.postMessage({ type: 'result', result });
  }
};
```

---

## Folder structure suggestion

```
local-text-summarizer/
├─ index.html
├─ styles.css        # small runtime CSS or Tailwind CDN
├─ src/
│  ├─ main.js
│  ├─ dom.js         # DOM helpers (highlighting etc.)
│  ├─ summarizer.js  # all algorithm code (split, vectors, pagerank)
│  ├─ worker.js      # web worker version
├─ assets/
│  └─ sample-texts/
├─ README.md
└─ package.json (optional if using Vite/Tailwind build)
```

---

## Testing & quality

- Add unit tests for sentence splitting, cosine similarity, PageRank convergence (use simple fixtures).
- Run manual tests with academic articles, long blog posts, and very short notes to verify behavior.
- Edge cases: bullet lists, timestamps, non-latin scripts, code blocks — decide how to handle (strip or keep).

---

## Deployment & making the project presentable

- Create a clean README (what it does, technical highlights, how summarization works — include a small diagram).
- Add a short demo GIF (screen record generation + highlight) and place it at the top of README.
- Host on GitHub and add a live demo link (GitHub Pages / Netlify / Vercel). Make sure to include sample texts for first-time visitors.
- Include a short write-up on algorithm choices and potential improvements — shows critical thinking to interviewers.

---

## Suggested incremental implementation checklist (copy directly into your project board)

- [ ] Project skeleton + Tailwind layout
- [ ] Paste/Upload input + sample buttons
- [ ] Implement split + tokenization + stopword list
- [ ] Implement TF vectors + cosine similarity
- [ ] Implement PageRank & summarization pipeline
- [ ] Keyword extraction
- [ ] UI integration (highlighting + summary rendering)
- [ ] Web Worker offload
- [ ] Exports: copy / download / PDF
- [ ] Accessibility + polish + demo GIF + README

---

## Final notes and trade-offs

- **Abstractive summarization** (true rewriting) generally requires heavy models (transformers) which are too large to run comfortably _client-side_ without advanced TF.js models and will add complexity and possible offline issues. For a clean portfolio piece, extractive + good UI + explainability is far more compelling.
- Keep the UI/UX delightful: neat animations and a helpful explanation of how the summary was computed wins you points during interviews/demos.

---

If you want, I can now:

- Generate a single-file starter template (`index.html` + inline `main.js`) that uses the CDN route (Tailwind + compromise) so you can open it immediately in a browser, OR
- Generate a Vite + Tailwind starter repo layout with `package.json` and build config.

Which starter would you like next?
