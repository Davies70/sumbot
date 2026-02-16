const inputEl = document.getElementById('inputText');
const summarizeBtn = document.getElementById('summarizeBtn');
const summaryLengthEl = document.getElementById('summaryLength');
const algorithmEl = document.getElementById('algorithm');
const placeholderEl = document.getElementById('placeholder');
const loadingIndicator = document.getElementById('loadingIndicator');
const summaryResultsEl = document.getElementById('summaryResults');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.getElementById('progressContainer');
const loaderText = document.getElementById('loaderText');
const wordCountEl = document.getElementById('wordCount');

const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

function typeWriter(element, text) {
    element.innerHTML = "";
    element.className = "text-slate-300 leading-relaxed italic";
    let i = 0;
    const interval = setInterval(() => {
        element.innerHTML += text.charAt(i);
        i++;
        if (i >= text.length) clearInterval(interval);
        summaryResultsEl.scrollTop = summaryResultsEl.scrollHeight;
    }, 15);
}

inputEl.addEventListener('input', () => {
    const text = inputEl.value.trim();
    const words = text.split(/\s+/).filter(Boolean);
    wordCountEl.textContent = `${words.length} words`;
    summarizeBtn.disabled = text.length < 20;
});

summarizeBtn.addEventListener('click', () => {
    const text = inputEl.value.trim();
    const algo = algorithmEl.value;

    placeholderEl.classList.add('hidden');
    summaryResultsEl.classList.add('hidden');
    loadingIndicator.classList.replace('hidden', 'flex');
    
    if (algo === 'neural') {
        progressContainer.classList.remove('hidden');
        loaderText.textContent = "Initializing Neural Engine...";
    } else {
        progressContainer.classList.add('hidden');
        loaderText.textContent = "Analyzing Text Structure...";
    }

    worker.postMessage({ text, algo, topK: Number(summaryLengthEl.value) });
});

worker.onmessage = (e) => {
    const { type, message, value, summary, isNeural } = e.data;

    if (type === 'status') loaderText.textContent = message;
    if (type === 'progress') progressBar.style.width = `${value}%`;
    
    if (type === 'result') {
        loadingIndicator.classList.replace('flex', 'hidden');
        summaryResultsEl.classList.remove('hidden');
        
        summaryResultsEl.innerHTML = `
            <div id="typeTarget"></div>
            <div id="exportControls" class="mt-8 flex flex-wrap gap-3 border-t border-slate-700 pt-6 opacity-0 transition-opacity duration-500">
                <button id="downloadTxt" class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold border border-slate-700 transition">Download .TXT</button>
                <button id="downloadPdf" class="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-4 py-2 rounded-xl text-xs font-bold border border-blue-500/20 transition">Export .PDF</button>
            </div>
        `;
        
        const target = document.getElementById('typeTarget');
        const controls = document.getElementById('exportControls');
        
        if (isNeural) {
            typeWriter(target, summary);
            setTimeout(() => controls.classList.remove('opacity-0'), 1000);
        } else {
            target.innerHTML = `<p class="text-slate-300 leading-relaxed">${summary}</p>`;
            controls.classList.remove('opacity-0');
        }

        document.getElementById('downloadTxt').onclick = () => {
            const blob = new Blob([summary], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'SumBot-Summary.txt'; a.click();
            URL.revokeObjectURL(url);
        };

        document.getElementById('downloadPdf').onclick = () => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.setFont("helvetica", "bold"); doc.setFontSize(20);
            doc.text("SumBot AI Summary", 20, 20);
            doc.setFont("helvetica", "normal"); doc.setFontSize(12);
            const splitText = doc.splitTextToSize(summary, 170);
            doc.text(splitText, 20, 40);
            doc.save("SumBot-Summary.pdf");
        };
    }

    if (type === 'error') {
        alert("Worker Error: " + message);
        loadingIndicator.classList.replace('flex', 'hidden');
    }
};