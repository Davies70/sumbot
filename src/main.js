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
const placeholderEl = document.getElementById('placeholder');
const loadingIndicator = document.getElementById('loadingIndicator');
const summaryResultsEl = document.getElementById('summaryResults');
const algorithmEl = document.getElementById('algorithm');
const keywordCountEl = document.getElementById('keywordCount');
const wordCountEl = document.getElementById('wordCount');

// --- Word count tracking ---
inputEl.addEventListener('input', () => {
  const words = inputEl.value.trim().split(/\s+/).filter(Boolean);
  wordCountEl.textContent = `${words.length} word${
    words.length !== 1 ? 's' : ''
  }`;
});

// --- Slider label update ---
summaryLengthEl.addEventListener('input', () => {
  lengthValueEl.textContent = summaryLengthEl.value;
});

// --- Renderers ---
function renderSummaryAndKeywords(sentencesData, rankedIndexes, keywords) {
  const topSentences = rankedIndexes
    .sort((a, b) => a - b)
    .map((i) => sentencesData[i].sentence);

  const summaryHTML = topSentences
    .map((s) => `<p class="mb-2 leading-relaxed">${s}</p>`)
    .join('');

  const keywordsHTML = keywords.length
    ? `
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
  `
    : '';

  summaryResultsEl.innerHTML = `
    <h3 class="font-semibold text-gray-700 mb-3">📄 Summary</h3>
    <div class="text-gray-800">${summaryHTML}</div>
    ${keywordsHTML}
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

// --- Simple summarizer ---
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
  const scores = sentencesData.map(
    (s) => s.tokens.filter((t) => keywords.includes(t)).length
  );
  const rankedIndexes = scores
    .map((score, i) => ({ score, i }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((x) => x.i);
  return { sentencesData, rankedIndexes, keywords };
}

// --- Main summarize flow ---
summarizeBtn.addEventListener('click', () => {
  const text = inputEl.value.trim();
  if (!text) return;

  // Show loader
  placeholderEl.classList.add('hidden');
  summaryResultsEl.classList.add('hidden');
  loadingIndicator.classList.remove('hidden');

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

    // Show results
    loadingIndicator.classList.add('hidden');
    summaryResultsEl.classList.remove('hidden');
  }, 300);
});

const keywordCountContainer = document.getElementById('keywordCountContainer');

// Toggle keyword count visibility
algorithmEl.addEventListener('change', () => {
  if (algorithmEl.value === 'keywords') {
    keywordCountContainer.classList.remove('hidden');
  } else {
    keywordCountContainer.classList.add('hidden');
  }
});
