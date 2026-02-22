import nlp from "compromise";
import { eng as STOPWORDS_ARRAY } from "stopword";

const STOPWORDS = new Set(STOPWORDS_ARRAY);

export function processText(text) {
  const sentences = nlp(text).sentences().out("array");

  return sentences
    .map((sentence) => {
      const tokens = nlp(sentence)
        .terms()
        .out("array")
        .map((t) => t.toLowerCase())
        .filter((w) => !STOPWORDS.has(w) && /^[a-z]+$/.test(w));

      const freqMap = {};
      tokens.forEach((word) => (freqMap[word] = (freqMap[word] || 0) + 1));

      return { sentence, tokens, freqMap };
    })
    .filter((data) => data.tokens.length > 0); // Strip out empty/invalid sentences
}

export function buildSimilarityMatrix(sentencesData) {
  const N = sentencesData.length;
  const matrix = Array.from({ length: N }, () => Array(N).fill(0));

  const cosineSim = (a, b) => {
    const words = new Set([...Object.keys(a), ...Object.keys(b)]);
    let dot = 0,
      magA = 0,
      magB = 0;
    words.forEach((w) => {
      dot += (a[w] || 0) * (b[w] || 0);
      magA += (a[w] || 0) ** 2;
      magB += (b[w] || 0) ** 2;
    });
    return magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
  };

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const sim = cosineSim(sentencesData[i].freqMap, sentencesData[j].freqMap);
      matrix[i][j] = matrix[j][i] = sim;
    }
  }
  return matrix;
}

export function pageRank(matrix, damping = 0.85) {
  const N = matrix.length;
  if (N === 0) return [];

  let ranks = new Array(N).fill(1 / N);

  for (let iter = 0; iter < 20; iter++) {
    const nextRanks = new Array(N).fill((1 - damping) / N);
    for (let j = 0; j < N; j++) {
      const rowSum = matrix[j].reduce((a, b) => a + b, 0);
      if (rowSum === 0) continue; // Prevent NaN errors on gibberish input

      for (let i = 0; i < N; i++) {
        nextRanks[i] += damping * ranks[j] * (matrix[j][i] / rowSum);
      }
    }
    ranks = nextRanks;
  }
  return ranks;
}
