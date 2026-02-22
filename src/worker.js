import { pipeline, env } from "@xenova/transformers";
import { processText, buildSimilarityMatrix, pageRank } from "./summarizer.js";

env.allowLocalModels = false;
let summarizerPipeline = null;

self.onmessage = async function (e) {
  const { text, algo, lengthPref } = e.data;

  try {
    if (algo === "neural") {
      if (!summarizerPipeline) {
        self.postMessage({
          type: "status",
          message: "Downloading AI Model (~25MB)...",
        });

        summarizerPipeline = await pipeline(
          "summarization",
          "Xenova/distilbart-cnn-6-6",
          {
            progress_callback: (data) => {
              if (data.status === "progress") {
                self.postMessage({ type: "progress", value: data.progress });
              }
            },
          },
        );
      }

      self.postMessage({
        type: "status",
        message: "AI is reading and thinking...",
      });

      const output = await summarizerPipeline(text, {
        max_new_tokens: 100,
        iteration_penalty: 1.2,
      });

      self.postMessage({
        type: "result",
        summary: output[0].summary_text,
        isNeural: true,
      });
    } else {
      // Extractive Engine

      // Clean up weird line-breaks from copy-pasting PDFs/Websites
      const cleanText = text.replace(/[\r\n]+/g, " ");
      const data = processText(cleanText);

      if (!data || data.length === 0) {
        throw new Error(
          "Could not extract coherent sentences from the provided text.",
        );
      }

      const matrix = buildSimilarityMatrix(data);
      const scores = pageRank(matrix);

      // Set percentages AND hard sentence limits
      let ratio = 0.35;
      let maxSentences = 5;

      if (lengthPref === "short") {
        ratio = 0.2;
        maxSentences = 3;
      }
      if (lengthPref === "long") {
        ratio = 0.5;
        maxSentences = 8;
      }

      // Calculate target: Use the percentage, but NEVER exceed the maxSentences limit
      let targetCount = Math.ceil(data.length * ratio);
      targetCount = Math.min(targetCount, maxSentences);
      targetCount = Math.max(1, targetCount); // Guarantee at least 1 sentence

      const safeTopK = Math.min(targetCount, data.length);

      const topIdx = scores
        .map((s, i) => ({ s, i }))
        .sort((a, b) => b.s - a.s)
        .slice(0, safeTopK)
        .sort((a, b) => a.i - b.i)
        .map((x) => x.i);

      const summary = topIdx.map((i) => data[i].sentence).join(" ");
      self.postMessage({ type: "result", summary, isNeural: false });
    }
  } catch (err) {
    self.postMessage({
      type: "error",
      message: err.message || "An unexpected error occurred.",
    });
  }
};
