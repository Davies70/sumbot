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
const keywordCountContainer = document.getElementById('keywordCountContainer');

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

function renderSummaryAndKeywords(sentencesData, rankedIndexes, keywords) {
  const topSentences = rankedIndexes
    .sort((a, b) => a - b)
    .map((i) => sentencesData[i].sentence);

  // --- Render sentences ---
  const summaryHTML = topSentences
    .map(
      (s, idx) =>
        `<p class="mb-2 leading-relaxed sentence" data-index="${idx}">${s}</p>`
    )
    .join('');

  // --- Keyword frequencies ---
  const freqMap = {};
  keywords.forEach((k) => {
    freqMap[k] = (freqMap[k] || 0) + 1;
  });
  const maxFreq = Math.max(...Object.values(freqMap));

  // --- Render keyword cloud/tags ---
  const keywordsHTML = keywords.length
    ? `
    <div class="mt-6">
      <h3 class="font-semibold text-gray-700 mb-2">🔑 Top Keywords</h3>
      <div class="flex flex-wrap gap-2">
        ${Object.entries(freqMap)
          .map(([k, f]) => {
            const size = 14 + (f / maxFreq) * 10; // scale font-size by frequency
            return `<span 
              class="keyword bg-blue-100 text-blue-700 px-2 py-1 rounded-full shadow cursor-pointer transition hover:bg-blue-200" 
              style="font-size:${size}px" 
              data-key="${k}">
                ${k}
            </span>`;
          })
          .join('')}
      </div>
    </div>
  `
    : '';

  // --- Render control buttons ---
  const controlsHTML = `
    <div class="mt-6 flex flex-wrap gap-2">
      <button id="copySummary" class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">Copy</button>
      <button id="downloadSummaryTxt" class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">Download TXT</button>
      <button id="exportSummaryPdf" class="bg-indigo-500 text-white px-3 py-1 rounded text-sm hover:bg-indigo-600">Export PDF</button>
    </div>
  `;

  // --- Render everything ---
  summaryResultsEl.innerHTML = `
    <h3 class="font-semibold text-gray-700 mb-3">📄 Summary</h3>
    <div class="text-gray-800" id="summaryText">${summaryHTML}</div>
    ${keywordsHTML}
    ${controlsHTML}
  `;

  const summaryTextEl = document.getElementById('summaryText');
  const summaryText = summaryTextEl.innerText;

  // --- Button actions ---
  document.getElementById('copySummary').addEventListener('click', () => {
    navigator.clipboard
      .writeText(summaryText)
      .then(() => alert('Summary copied!'));
  });

  document
    .getElementById('downloadSummaryTxt')
    .addEventListener('click', () => {
      const blob = new Blob([summaryText], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'summary.txt';
      link.click();
    });

  document.getElementById('exportSummaryPdf').addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(summaryText, 180);
    doc.text(lines, 10, 10);
    doc.save('summary.pdf');
  });

  // --- Keyword highlighting ---
  const activeKeywords = new Set(); // for multi-select
  document.querySelectorAll('.keyword').forEach((el) => {
    el.addEventListener('click', () => {
      const key = el.dataset.key.toLowerCase();
      if (activeKeywords.has(key)) {
        activeKeywords.delete(key);
        el.classList.remove('bg-yellow-200', 'text-yellow-900');
      } else {
        activeKeywords.add(key);
        el.classList.add('bg-yellow-200', 'text-yellow-900');
      }

      document.querySelectorAll('.sentence').forEach((s) => {
        const text = s.innerText.toLowerCase();
        const highlight = Array.from(activeKeywords).some((k) =>
          text.includes(k)
        );
        if (highlight) {
          s.classList.add('bg-yellow-100', 'rounded');
        } else {
          s.classList.remove('bg-yellow-100', 'rounded');
        }
      });
    });
  });
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
  loadingIndicator.classList.add('flex');

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
    loadingIndicator.classList.remove('flex');

    summaryResultsEl.classList.remove('hidden');
  }, 300);
});

// Toggle keyword count visibility
algorithmEl.addEventListener('change', () => {
  if (algorithmEl.value === 'keywords') {
    keywordCountContainer.classList.remove('hidden');
  } else {
    keywordCountContainer.classList.add('hidden');
  }
});
