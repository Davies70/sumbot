import ExtractiveWorker from "./extractiveWorker.js?worker";
import NeuralWorker from "./neuralWorker.js?worker";

const MIN_WORDS = 100;
const JSPDF_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

const inputEl = document.getElementById("inputText");
const summarizeBtn = document.getElementById("summarizeBtn");
const clearBtn = document.getElementById("clearBtn");
const summaryLengthEl = document.getElementById("summaryLength");
const algorithmEl = document.getElementById("algorithm");
const placeholderEl = document.getElementById("placeholder");
const loadingIndicator = document.getElementById("loadingIndicator");
const summaryResultsEl = document.getElementById("summaryResults");
const progressBar = document.getElementById("progressBar");
const progressContainer = document.getElementById("progressContainer");
const loaderText = document.getElementById("loaderText");
const wordCountEl = document.getElementById("wordCount");
const lengthContainer = document.getElementById("lengthContainer");
const neuralWarning = document.getElementById("neuralWarning");
const errorBanner = document.getElementById("errorBanner");
const minHintEl = document.getElementById("minHint");

let isProcessing = false;
let activeWorker = null;
let activeWorkerType = null;
let jspdfLoader = null;

const workerConstructors = {
  extractive: ExtractiveWorker,
  neural: NeuralWorker,
};

function getWordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getWorker(algo) {
  if (activeWorker && activeWorkerType === algo) return activeWorker;

  activeWorker?.terminate();
  activeWorkerType = algo;
  activeWorker = new (workerConstructors[algo])();
  activeWorker.onmessage = handleWorkerMessage;

  return activeWorker;
}

function updateUI() {
  const isNeural = algorithmEl.value === "neural";
  const count = getWordCount(inputEl.value);
  const needsMoreWords = count < MIN_WORDS;

  lengthContainer.classList.toggle("hidden", isNeural);
  lengthContainer.classList.toggle("flex", !isNeural);
  neuralWarning.classList.toggle("hidden", !isNeural);

  wordCountEl.textContent = `${count} word${count === 1 ? "" : "s"}`;
  minHintEl.textContent = needsMoreWords
    ? `${MIN_WORDS - count} more word${MIN_WORDS - count === 1 ? "" : "s"} needed`
    : "Ready to summarize";
  minHintEl.classList.toggle("text-emerald-400", !needsMoreWords);
  minHintEl.classList.toggle("text-zinc-500", needsMoreWords);

  clearBtn.classList.toggle("hidden", count === 0 || isProcessing);
  summarizeBtn.disabled = needsMoreWords || isProcessing;
  summarizeBtn.textContent = isProcessing ? "Working..." : "Generate Summary";
  inputEl.disabled = isProcessing;
  algorithmEl.disabled = isProcessing;
  summaryLengthEl.disabled = isProcessing || isNeural;
}

function resetOutput() {
  summaryResultsEl.replaceChildren();
  summaryResultsEl.classList.add("hidden");
  placeholderEl.classList.remove("hidden");
  errorBanner.classList.add("hidden");
}

function setLoadingState(algo) {
  const isNeural = algo === "neural";

  placeholderEl.classList.add("hidden");
  summaryResultsEl.classList.add("hidden");
  loadingIndicator.classList.replace("hidden", "flex");
  progressContainer.classList.toggle("hidden", !isNeural);
  progressBar.style.width = "0%";
  loaderText.textContent = isNeural
    ? "Preparing neural engine..."
    : "Analyzing text structure...";
}

function typeWriter(element, text, onComplete) {
  element.textContent = "";
  element.className = "text-zinc-300 leading-relaxed italic";

  let index = 0;
  const interval = setInterval(() => {
    element.textContent += text.charAt(index);
    index += 1;
    summaryResultsEl.scrollTop = summaryResultsEl.scrollHeight;

    if (index >= text.length) {
      clearInterval(interval);
      onComplete?.();
    }
  }, 12);
}

function createButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function renderSummary(summary, isNeural) {
  const summaryText = document.createElement("p");
  const controls = document.createElement("div");

  controls.className =
    "mt-6 flex flex-wrap gap-3 border-t border-zinc-800 pt-5 opacity-0 transition-opacity duration-300";
  controls.append(
    createButton(
      "Copy",
      "rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800",
      () => navigator.clipboard?.writeText(summary),
    ),
    createButton(
      "Download .TXT",
      "rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800",
      () => downloadText(summary),
    ),
    createButton(
      "Export .PDF",
      "rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/20",
      () => downloadPdf(summary),
    ),
  );

  summaryResultsEl.replaceChildren(summaryText, controls);
  summaryResultsEl.classList.remove("hidden");

  const finishProcessing = () => {
    controls.classList.remove("opacity-0");
    isProcessing = false;
    updateUI();
  };

  if (isNeural) {
    typeWriter(summaryText, summary, finishProcessing);
    return;
  }

  summaryText.className = "text-zinc-300 leading-relaxed";
  summaryText.textContent = summary;
  finishProcessing();
}

function downloadText(summary) {
  const blob = new Blob([summary], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "SumBot-Summary.txt";
  link.click();
  URL.revokeObjectURL(url);
}

function loadJsPdf() {
  if (window.jspdf) return Promise.resolve(window.jspdf);
  if (jspdfLoader) return jspdfLoader;

  jspdfLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = JSPDF_URL;
    script.onload = () => resolve(window.jspdf);
    script.onerror = () => reject(new Error("PDF exporter failed to load."));
    document.head.append(script);
  });

  return jspdfLoader;
}

async function downloadPdf(summary) {
  try {
    const { jsPDF } = await loadJsPdf();
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("SumBot AI Summary", margin, margin);
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, 28);
    doc.line(margin, 32, pageWidth - margin, 32);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(doc.splitTextToSize(summary, pageWidth - margin * 2), margin, 45);
    doc.save("SumBot-Summary.pdf");
  } catch (err) {
    showError(err.message);
  }
}

function showError(message) {
  loadingIndicator.classList.replace("flex", "hidden");
  errorBanner.textContent = `Engine Error: ${message}`;
  errorBanner.classList.remove("hidden");
  isProcessing = false;
  updateUI();
}

function handleWorkerMessage(e) {
  const { type, message, value, summary, isNeural } = e.data;

  if (type === "status") loaderText.textContent = message;
  if (type === "progress") progressBar.style.width = `${value}%`;

  if (type === "result") {
    loadingIndicator.classList.replace("flex", "hidden");
    renderSummary(summary, isNeural);
  }

  if (type === "error") showError(message);
}

algorithmEl.addEventListener("change", updateUI);
inputEl.addEventListener("input", updateUI);

clearBtn.addEventListener("click", () => {
  inputEl.value = "";
  resetOutput();
  updateUI();
});

summarizeBtn.addEventListener("click", () => {
  const text = inputEl.value.trim();
  const algo = algorithmEl.value;

  errorBanner.classList.add("hidden");
  isProcessing = true;
  updateUI();
  setLoadingState(algo);
  getWorker(algo).postMessage({ text, lengthPref: summaryLengthEl.value });
});

updateUI();
