import { pipeline, env } from "@xenova/transformers";

env.allowLocalModels = false;

let summarizerPipeline = null;

self.onmessage = async function (e) {
  const { text } = e.data;

  try {
    if (!summarizerPipeline) {
      self.postMessage({
        type: "status",
        message: "Downloading AI model on first run...",
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
      message: "Generating neural summary...",
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
  } catch (err) {
    self.postMessage({
      type: "error",
      message: err.message || "An unexpected error occurred.",
    });
  }
};
