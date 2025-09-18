import nlp from 'compromise';
import { eng as STOPWORDS_ARRAY } from 'stopword';

const STOPWORDS = new Set(STOPWORDS_ARRAY);

// --- Sentence splitting ---
function splitSentences(text) {
  const doc = nlp(text);
  return doc.sentences().out('array');
}

// --- Tokenization ---
function tokenize(sentence) {
  return nlp(sentence)
    .terms()
    .out('array')
    .map((t) => t.toLowerCase())
    .filter((w) => !STOPWORDS.has(w) && /^[a-z]+$/.test(w));
}

// --- Frequency map ---
function buildFrequencyMap(tokens) {
  const freq = new Map();
  tokens.forEach((word) => freq.set(word, (freq.get(word) || 0) + 1));
  return Object.fromEntries(freq);
}

// --- Process text ---
export function processText(text) {
  const sentences = splitSentences(text);
  return sentences.map((sentence) => {
    const tokens = tokenize(sentence);
    const freqMap = buildFrequencyMap(tokens);
    return { sentence, tokens, freqMap };
  });
}

// --- Cosine similarity ---
function cosineSimilarity(vecA, vecB) {
  const allWords = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  let dot = 0;
  allWords.forEach((word) => {
    dot += (vecA[word] || 0) * (vecB[word] || 0);
  });
  const magA = Math.sqrt(Object.values(vecA).reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(Object.values(vecB).reduce((s, v) => s + v * v, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

// --- Build similarity matrix ---
export function buildSimilarityMatrix(sentencesData, threshold = 0) {
  const N = sentencesData.length;
  const M = Array.from({ length: N }, () => Array(N).fill(0));

  for (let i = 0; i < N; i++) {
    const vecA = sentencesData[i].freqMap;
    for (let j = i + 1; j < N; j++) {
      const vecB = sentencesData[j].freqMap;
      const sim = cosineSimilarity(vecA, vecB);
      const value = sim >= threshold ? sim : 0;
      M[i][j] = value;
      M[j][i] = value;
    }
  }
  return M;
}

// --- PageRank ---
export function pageRank(adjMatrix, damping = 0.85, maxIter = 100, eps = 1e-6) {
  const N = adjMatrix.length;
  let rank = new Array(N).fill(1 / N);
  const outDeg = adjMatrix.map((row) => row.reduce((a, b) => a + b, 0));

  for (let iter = 0; iter < maxIter; iter++) {
    const newRank = new Array(N).fill((1 - damping) / N);
    for (let j = 0; j < N; j++) {
      if (outDeg[j] === 0) continue;
      for (let i = 0; i < N; i++) {
        if (adjMatrix[j][i] > 0) {
          newRank[i] += damping * rank[j] * (adjMatrix[j][i] / outDeg[j]);
        }
      }
    }

    const sum = newRank.reduce((a, b) => a + b, 0);
    for (let i = 0; i < N; i++) newRank[i] /= sum;

    const diff = newRank.reduce((s, v, i) => s + Math.abs(v - rank[i]), 0);
    rank = newRank;
    if (diff < eps) break;
  }
  return rank;
}

// --- Summarize ---
export async function summarizeAsync(
  text,
  { k = null, proportion = 0.2 } = {}
) {
  const sentencesData = processText(text);

  // Heavy computation can be offloaded to Web Worker if desired
  const simMatrix = buildSimilarityMatrix(sentencesData, 0.1);
  const scores = pageRank(simMatrix);

  // Rank sentences by score
  const ranked = sentencesData
    .map((s, i) => ({ index: i, sentence: s.sentence, score: scores[i] }))
    .sort((a, b) => b.score - a.score);

  const total = sentencesData.length;
  const n = k ?? Math.max(1, Math.round(proportion * total));

  // Preserve original sentence order
  return ranked
    .slice(0, n)
    .sort((a, b) => a.index - b.index)
    .map((r) => r.sentence);
}

// --- Keyword extraction ---
export function extractKeywords(text, topK = 10, mode = 'words') {
  const tokens = nlp(text)
    .terms()
    .out('array')
    .map((w) => w.toLowerCase());

  const phrases = [];
  let current = [];
  tokens.forEach((word) => {
    if (STOPWORDS.has(word)) {
      if (current.length) {
        phrases.push(current);
        current = [];
      }
    } else {
      current.push(word);
    }
  });
  if (current.length) phrases.push(current);

  const freq = {};
  const degree = {};
  phrases.forEach((phrase) => {
    const unique = new Set(phrase);
    phrase.forEach((word) => {
      freq[word] = (freq[word] || 0) + 1;
      degree[word] = (degree[word] || 0) + unique.size;
    });
  });

  const wordScore = {};
  for (let word in freq) {
    wordScore[word] = degree[word] / freq[word];
  }

  if (mode === 'phrases') {
    const phraseScores = phrases.map((p) => ({
      phrase: p.join(' '),
      score: p.reduce((s, w) => s + wordScore[w], 0),
    }));
    return phraseScores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((p) => p.phrase);
  } else {
    return Object.entries(wordScore)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([word]) => word);
  }
}
