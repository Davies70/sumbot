import {
  processText,
  buildSimilarityMatrix,
  pageRank,
  extractKeywords,
} from './summarizer.js';

// --- DOM elements ---
const inputEl = document.getElementById('inputText');
const summarizeBtn = document.getElementById('summarizeBtn');
const summaryLengthEl = document.getElementById('summaryLength');
const lengthValueEl = document.getElementById('lengthValue');
const outputContainer = document.getElementById('outputContainer');
const loadingIndicator = document.getElementById('loadingIndicator');
const algorithmEl = document.getElementById('algorithm');
const keywordCountEl = document.getElementById('keywordCount');
const wordCountEl = document.getElementById('wordCount');

// --- Slider label update ---
summaryLengthEl.addEventListener('input', () => {
  lengthValueEl.textContent = summaryLengthEl.value;
});

// --- Renderers ---
function renderSummaryAndKeywords(sentencesData, rankedIndexes, keywords) {
  // Extract top-K sentences in their original order
  const topSentences = rankedIndexes
    .sort((a, b) => a - b)
    .map((i) => sentencesData[i].sentence);

  const summaryHTML = topSentences
    .map((s) => `<p class="mb-2 leading-relaxed">${s}</p>`)
    .join('');

  const keywordsHTML = `
    <div class="mt-6">
      <h3 class="font-semibold text-gray-700 mb-2">🔑 Top Keywords</h3>
      <div class="flex flex-wrap gap-2">
        ${keywords
          .map(
            (k) =>
              `<span class="bg-blue-100 text-blue-700 text-sm px-2 py-1 rounded-full shadow">${k}</span>`
          )
          .join('')}
      </div>
    </div>
  `;

  outputContainer.innerHTML = `
    <div>
      <h3 class="font-semibold text-gray-700 mb-3">📄 Summary</h3>
      <div class="text-gray-800">${summaryHTML}</div>
      ${keywords.length ? keywordsHTML : ''}
    </div>
  `;
}

// --- Frequency-based summarizer ---
function frequencySummarize(text, topK) {
  const sentencesData = processText(text);
  const scores = sentencesData.map((s) => s.tokens.length);

  const rankedIndexes = scores
    .map((score, i) => ({ score, i }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((x) => x.i);

  return { sentencesData, rankedIndexes };
}

// --- Simple summarizer (first N sentences) ---
function simpleSummarize(text, topK) {
  const sentencesData = processText(text);
  const rankedIndexes = Array.from(
    { length: Math.min(topK, sentencesData.length) },
    (_, i) => i
  );
  return { sentencesData, rankedIndexes };
}

// --- Keyword-based summarizer ---
function keywordSummarize(text, topK, keywordCount) {
  const sentencesData = processText(text);
  const keywords = extractKeywords(text, keywordCount, 'words');

  // Score sentences by keyword overlap
  const scores = sentencesData.map((s) => {
    const overlap = s.tokens.filter((t) => keywords.includes(t)).length;
    return overlap;
  });

  const rankedIndexes = scores
    .map((score, i) => ({ score, i }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((x) => x.i);

  return { sentencesData, rankedIndexes, keywords };
}

// --- Word count tracking ---

inputEl.addEventListener('input', () => {
  // Split text into words (ignores multiple spaces/newlines)
  const words = inputEl.value.trim().split(/\s+/).filter(Boolean);

  // Update word count element
  wordCountEl.textContent = `${words.length} word${
    words.length !== 1 ? 's' : ''
  }`;
});

// --- Main summarize flow ---
summarizeBtn.addEventListener('click', () => {
  const text = inputEl.value.trim();
  if (!text) return;

  loadingIndicator.classList.remove('hidden');
  outputContainer.innerHTML = '';

  setTimeout(() => {
    const algo = algorithmEl.value;
    const topK = Number(summaryLengthEl.value);
    const keywordCount = Number(keywordCountEl.value);

    let sentencesData,
      rankedIndexes,
      keywords = [];

    if (algo === 'frequency') {
      ({ sentencesData, rankedIndexes } = frequencySummarize(text, topK));
    } else if (algo === 'simple') {
      ({ sentencesData, rankedIndexes } = simpleSummarize(text, topK));
    } else if (algo === 'keywords') {
      ({ sentencesData, rankedIndexes, keywords } = keywordSummarize(
        text,
        topK,
        keywordCount
      ));
    } else {
      // Default: PageRank summarizer
      sentencesData = processText(text);
      const simMatrix = buildSimilarityMatrix(sentencesData, 0.1);
      const scores = pageRank(simMatrix);
      rankedIndexes = scores
        .map((score, i) => ({ score, i }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map((x) => x.i);

      keywords = extractKeywords(text, keywordCount, 'words');
    }

    renderSummaryAndKeywords(sentencesData, rankedIndexes, keywords);

    loadingIndicator.classList.add('hidden');
  }, 300);
});
