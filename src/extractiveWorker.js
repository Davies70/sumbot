import { processText, buildSimilarityMatrix, pageRank } from "./summarizer.js";

self.onmessage = function (e) {
  const { text, lengthPref } = e.data;

  try {
    self.postMessage({
      type: "status",
      message: "Analyzing text structure...",
    });

    const cleanText = text.replace(/[\r\n]+/g, " ");
    const data = processText(cleanText);

    if (!data || data.length === 0) {
      throw new Error(
        "Could not extract coherent sentences from the provided text.",
      );
    }

    const matrix = buildSimilarityMatrix(data);
    const scores = pageRank(matrix);

    const lengthSettings = {
      short: { ratio: 0.2, maxSentences: 3 },
      medium: { ratio: 0.35, maxSentences: 5 },
      long: { ratio: 0.5, maxSentences: 8 },
    };
    const { ratio, maxSentences } =
      lengthSettings[lengthPref] || lengthSettings.medium;

    const targetCount = Math.max(
      1,
      Math.min(Math.ceil(data.length * ratio), maxSentences, data.length),
    );

    const topIdx = scores
      .map((score, index) => ({ score, index }))
      .sort((a, b) => b.score - a.score)
      .slice(0, targetCount)
      .sort((a, b) => a.index - b.index)
      .map(({ index }) => index);

    const summary = topIdx.map((index) => data[index].sentence).join(" ");
    self.postMessage({ type: "result", summary, isNeural: false });
  } catch (err) {
    self.postMessage({
      type: "error",
      message: err.message || "An unexpected error occurred.",
    });
  }
};
