// import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0';
import { pipeline, env } from "@xenova/transformers";
import { processText, buildSimilarityMatrix, pageRank } from "./summarizer.js";

env.allowLocalModels = false;
let summarizerPipeline = null;

self.onmessage = async function (e) {
  const { text, algo, topK } = e.data;
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
              if (data.status === "progress")
                self.postMessage({ type: "progress", value: data.progress });
            },
          },
        );
      }
      self.postMessage({ type: "status", message: "AI is thinking..." });
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
      const data = processText(text);
      const matrix = buildSimilarityMatrix(data);
      const scores = pageRank(matrix);
      const topIdx = scores
        .map((s, i) => ({ s, i }))
        .sort((a, b) => b.s - a.s)
        .slice(0, topK)
        .sort((a, b) => a.i - b.i)
        .map((x) => x.i);
      const summary = topIdx.map((i) => data[i].sentence).join(" ");
      self.postMessage({ type: "result", summary, isNeural: false });
    }
  } catch (err) {
    self.postMessage({ type: "error", message: err.message });
  }
};
