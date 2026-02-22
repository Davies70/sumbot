// --- DOM Elements ---
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

// --- Worker Initialization ---
const worker = new Worker(new URL("./worker.js", import.meta.url), {
  type: "module",
});

let isProcessing = false;

// --- UI Logic ---
function updateUI() {
  const isNeural = algorithmEl.value === "neural";

  // Toggle Engine-specific UI
  if (isNeural) {
    lengthContainer.classList.add("hidden");
    lengthContainer.classList.remove("flex");
    neuralWarning.classList.remove("hidden");
  } else {
    lengthContainer.classList.remove("hidden");
    lengthContainer.classList.add("flex");
    neuralWarning.classList.add("hidden");
  }

  // Validate Input
  const text = inputEl.value.trim();
  const words = text.split(/\s+/).filter(Boolean);
  const count = words.length;

  wordCountEl.textContent = `${count} word${count === 1 ? "" : "s"}`;

  // Manage Button States
  clearBtn.classList.toggle("hidden", text.length === 0);
  summarizeBtn.disabled = count < 100 || isProcessing;
  inputEl.disabled = isProcessing;
  algorithmEl.disabled = isProcessing;
  summaryLengthEl.disabled = isProcessing;
}

// Ensure UI is correct on load
algorithmEl.addEventListener("change", updateUI);
inputEl.addEventListener("input", updateUI);
updateUI();

// Clear Button
clearBtn.addEventListener("click", () => {
  inputEl.value = "";
  summaryResultsEl.innerHTML = "";
  summaryResultsEl.classList.add("hidden");
  placeholderEl.classList.remove("hidden");
  errorBanner.classList.add("hidden");
  updateUI();
});

// --- Typewriter Effect ---
function typeWriter(element, text, onComplete) {
  element.innerHTML = "";
  element.className = "text-slate-300 leading-relaxed italic";
  let i = 0;
  const interval = setInterval(() => {
    element.innerHTML += text.charAt(i);
    i++;
    summaryResultsEl.scrollTop = summaryResultsEl.scrollHeight;
    if (i >= text.length) {
      clearInterval(interval);
      if (onComplete) onComplete();
    }
  }, 15);
}

// --- Submit Handler ---
summarizeBtn.addEventListener("click", () => {
  errorBanner.classList.add("hidden");
  isProcessing = true;
  updateUI();

  const text = inputEl.value.trim();
  const algo = algorithmEl.value;

  placeholderEl.classList.add("hidden");
  summaryResultsEl.classList.add("hidden");
  loadingIndicator.classList.replace("hidden", "flex");

  if (algo === "neural") {
    progressContainer.classList.remove("hidden");
    progressBar.style.width = "0%";
    loaderText.textContent = "Initializing Neural Engine...";
  } else {
    progressContainer.classList.add("hidden");
    loaderText.textContent = "Analyzing Text Structure...";
  }

  worker.postMessage({ text, algo, lengthPref: summaryLengthEl.value });
});

// --- Worker Response Handler ---
worker.onmessage = (e) => {
  const { type, message, value, summary, isNeural } = e.data;

  if (type === "status") loaderText.textContent = message;
  if (type === "progress") progressBar.style.width = `${value}%`;

  if (type === "result") {
    loadingIndicator.classList.replace("flex", "hidden");
    summaryResultsEl.classList.remove("hidden");

    summaryResultsEl.innerHTML = `
      <div id="typeTarget"></div>
      <div id="exportControls" class="mt-8 flex flex-wrap gap-3 border-t border-slate-700 pt-6 opacity-0 transition-opacity duration-500">
          <button id="downloadTxt" class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold border border-slate-700 transition">Download .TXT</button>
          <button id="downloadPdf" class="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-4 py-2 rounded-xl text-xs font-bold border border-blue-500/20 transition">Export .PDF</button>
      </div>
    `;

    const target = document.getElementById("typeTarget");
    const controls = document.getElementById("exportControls");

    const finishProcessing = () => {
      controls.classList.remove("opacity-0");
      isProcessing = false;
      updateUI();
    };

    if (isNeural) {
      typeWriter(target, summary, finishProcessing);
    } else {
      target.innerHTML = `<p class="text-slate-300 leading-relaxed">${summary}</p>`;
      finishProcessing();
    }

    // Export Listeners
    document.getElementById("downloadTxt").onclick = () => {
      const blob = new Blob([summary], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "SumBot-Summary.txt";
      a.click();
      URL.revokeObjectURL(url); // Cleanup memory
    };

    document.getElementById("downloadPdf").onclick = () => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("SumBot AI Summary", margin, margin);
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text(
        `Generated on: ${new Date().toLocaleDateString()}`,
        margin,
        margin + 8,
      );
      doc.line(margin, margin + 12, pageWidth - margin, margin + 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);

      const splitText = doc.splitTextToSize(summary, pageWidth - margin * 2);
      doc.text(splitText, margin, margin + 25);
      doc.save("SumBot-Summary.pdf");
    };
  }

  if (type === "error") {
    loadingIndicator.classList.replace("flex", "hidden");
    errorBanner.textContent = `Engine Error: ${message}`;
    errorBanner.classList.remove("hidden");
    isProcessing = false;
    updateUI();
  }
};
