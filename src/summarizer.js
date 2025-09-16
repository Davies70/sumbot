import nlp from 'compromise';

// --- Stopwords for filtering ---
const STOPWORDS = new Set([
  'a',
  'about',
  'above',
  'after',
  'again',
  'against',
  'all',
  'am',
  'an',
  'and',
  'any',
  'are',
  "aren't",
  'as',
  'at',
  'be',
  'because',
  'been',
  'before',
  'being',
  'below',
  'between',
  'both',
  'but',
  'by',
  'can',
  "can't",
  'cannot',
  'could',
  "couldn't",
  'did',
  "didn't",
  'do',
  'does',
  "doesn't",
  'doing',
  "don't",
  'down',
  'during',
  'each',
  'few',
  'for',
  'from',
  'further',
  'had',
  "hadn't",
  'has',
  "hasn't",
  'have',
  "haven't",
  'having',
  'he',
  "he'd",
  "he'll",
  "he's",
  'her',
  'here',
  "here's",
  'hers',
  'herself',
  'him',
  'himself',
  'his',
  'how',
  "how's",
  'i',
  "i'd",
  "i'll",
  "i'm",
  "i've",
  'if',
  'in',
  'into',
  'is',
  "isn't",
  'it',
  "it's",
  'its',
  'itself',
  "let's",
  'me',
  'more',
  'most',
  "mustn't",
  'my',
  'myself',
  'no',
  'nor',
  'not',
  'of',
  'off',
  'on',
  'once',
  'only',
  'or',
  'other',
  'ought',
  'our',
  'ours',
  'ourselves',
  'out',
  'over',
  'own',
  'same',
  "shan't",
  'she',
  "she'd",
  "she'll",
  "she's",
  'should',
  "shouldn't",
  'so',
  'some',
  'such',
  'than',
  'that',
  "that's",
  'the',
  'their',
  'theirs',
  'them',
  'themselves',
  'then',
  'there',
  "there's",
  'these',
  'they',
  "they'd",
  "they'll",
  "they're",
  "they've",
  'this',
  'those',
  'through',
  'to',
  'too',
  'under',
  'until',
  'up',
  'very',
  'was',
  "wasn't",
  'we',
  "we'd",
  "we'll",
  "we're",
  "we've",
  'were',
  "weren't",
  'what',
  "what's",
  'when',
  "when's",
  'where',
  "where's",
  'which',
  'while',
  'who',
  "who's",
  'whom',
  'why',
  "why's",
  'with',
  "won't",
  'would',
  "wouldn't",
  'you',
  "you'd",
  "you'll",
  "you're",
  "you've",
  'your',
  'yours',
  'yourself',
  'yourselves',
]);

// Sentence splitting
function splitSentences(text) {
  const doc = nlp(text);
  return doc.sentences().out('array');
}

// Tokenization
function tokenize(sentence) {
  return nlp(sentence)
    .terms()
    .out('array')
    .map((t) => t.toLowerCase())
    .filter((w) => !STOPWORDS.has(w));
}

// Frequency map (bag of words)
function buildFrequencyMap(tokens) {
  const freq = {};
  tokens.forEach((word) => {
    freq[word] = (freq[word] || 0) + 1;
  });
  return freq;
}

// Process text → [{sentence, tokens, freqMap}]
export function processText(text) {
  const sentences = splitSentences(text);
  return sentences.map((sentence) => {
    const tokens = tokenize(sentence);
    const freqMap = buildFrequencyMap(tokens);
    return { sentence, tokens, freqMap };
  });
}

// Cosine similarity
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

// Build similarity matrix
export function buildSimilarityMatrix(sentencesData, threshold = 0) {
  const N = sentencesData.length;
  const M = Array.from({ length: N }, () => Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const sim = cosineSimilarity(
        sentencesData[i].freqMap,
        sentencesData[j].freqMap
      );
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
    // normalize
    const sum = newRank.reduce((a, b) => a + b, 0);
    for (let i = 0; i < N; i++) newRank[i] /= sum;

    // check convergence
    const diff = newRank.reduce((s, v, i) => s + Math.abs(v - rank[i]), 0);
    rank = newRank;
    if (diff < eps) break;
  }
  return rank;
}

export function summarize(text, { k = null, proportion = 0.2 } = {}) {
  const sentencesData = processText(text);
  const simMatrix = buildSimilarityMatrix(sentencesData, 0.1);
  const scores = pageRank(simMatrix);

  const ranked = sentencesData
    .map((s, i) => ({ sentence: s.sentence, score: scores[i] }))
    .sort((a, b) => b.score - a.score);

  const total = sentencesData.length;
  const n = k ?? Math.max(1, Math.round(proportion * total));

  return ranked.slice(0, n).map((r) => r.sentence);
}

// // --- Example ---
// const sample = `
// AI is amazing. It changes everything!
// Does it really? Let's find out: AI has huge potential.
// `;

// console.log(summarize(sample, 1));

// export function extractKeywords(text, topK = 10) {
//   // 1. Split into words
//   const words = tokenize(text);

//   // 2. Candidate phrases = chunks separated by stopwords
//   const tokens = nlp(text)
//     .terms()
//     .out('array')
//     .map((w) => w.toLowerCase());
//   const phrases = [];
//   let current = [];
//   tokens.forEach((word) => {
//     if (STOPWORDS.has(word)) {
//       if (current.length) {
//         phrases.push(current);
//         current = [];
//       }
//     } else {
//       current.push(word);
//     }
//   });
//   if (current.length) phrases.push(current);

//   // 3. Word co-occurrence: degree & frequency
//   const freq = {};
//   const degree = {};
//   phrases.forEach((phrase) => {
//     const unique = new Set(phrase);
//     phrase.forEach((word) => {
//       freq[word] = (freq[word] || 0) + 1;
//       degree[word] = (degree[word] || 0) + unique.size;
//     });
//   });

//   // 4. Word scores = degree / frequency
//   const wordScore = {};
//   for (let word in freq) {
//     wordScore[word] = degree[word] / freq[word];
//   }

//   // 5. Phrase scores = sum of word scores
//   const phraseScores = phrases.map((p) => ({
//     phrase: p.join(' '),
//     score: p.reduce((s, w) => s + wordScore[w], 0),
//   }));

//   return phraseScores.sort((a, b) => b.score - a.score).slice(0, topK);
// }

// function wrapSentences(text) {
//   const sentences = splitSentences(text); // your existing function
//   return sentences
//     .map((sentence, i) => `<span data-sent-index="${i}">${sentence} </span>`)
//     .join('');
// }

export function extractKeywords(text, topK = 10, mode = 'words') {
  // Tokenize
  const tokens = nlp(text)
    .terms()
    .out('array')
    .map((w) => w.toLowerCase());

  // Split into candidate phrases
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

  // Word stats
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
    // Rank phrases
    const phraseScores = phrases.map((p) => ({
      phrase: p.join(' '),
      score: p.reduce((s, w) => s + wordScore[w], 0),
    }));
    return phraseScores.sort((a, b) => b.score - a.score).slice(0, topK);
  } else {
    // Rank individual words
    return Object.entries(wordScore)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([word]) => word);
  }
}
