# SumBot.AI: Text Summarizer

[Live Demo](https://sumbot.netlify.app)

A high-performance browser-based text summarization tool that extracts the most important sentences and keywords from a given text. It leverages **Transformers.js** for neural AI summarization and uses **Web Workers** to ensure the interface remains smooth during heavy computation.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Algorithms](#algorithms)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [Future Improvements](#future-improvements)
- [How It Works](#how-it-works)

---

## Features

- **Multi-Algorithm Support**: Choose between Neural AI, PageRank, Frequency-based, or Simple extraction.
- **Neural (AI)**: Generates human-like, abstractive summaries using deep learning models.
- **Graph-based**: Uses a similarity matrix with PageRank to rank sentence importance.
- **Responsive Processing**: Integrated Web Workers prevent UI freezing by offloading heavy NLP math to background threads.
- **Smart Validation**: The "Summarize" button is dynamically disabled until the 50-character minimum threshold is met.
- **Efficient Loading**: The heavy AI engine only initializes if "Neural" mode is selected, keeping traditional modes lightning-fast.
- **Export Options**: Save your results as versatile `.TXT` files or professionally formatted `.PDF` documents.

---

## Tech Stack

### Frontend
- Vanilla JavaScript (ES6+ Modules)
- Tailwind CSS v4 for modern glassmorphic styling

### AI & NLP
- **Transformers.js**: Client-side neural network execution via ONNX Runtime
- **compromise**: Lightweight NLP and tokenization
- **stopword**: Filtering non-essential terms

### Export
- **jsPDF** for PDF generation

### Computation
- **Web Workers** for non-blocking background processing

---

## Algorithms

### 1. Neural AI Summarization
- Utilizes the `distilbart-cnn-6-6` transformer model
- Downloads a quantized model directly to the browser cache via Transformers.js
- Produces **abstractive summaries** by rephrasing input text rather than extracting sentences

### 2. Graph-Based (PageRank) Summarization
- Builds a similarity matrix between sentences using cosine similarity
- Applies **PageRank** to rank sentence importance based on graph centrality
- Preserves original sentence order in the final summary

### 3. Frequency-Based Summarization
- Counts token frequencies per sentence
- Scores sentences based on word density
- Selects top-ranked sentences based on desired length

### 4. Simple Summarization
- Extracts the first sentences from the text
- Useful for structured documents where key information appears early

---

## Project Structure

```text
text-summarizer/
├─ src/
│  ├─ main.js         # UI orchestration, DOM logic, Worker management
│  ├─ worker.js       # Background thread for AI inference and heavy NLP
│  ├─ summarizer.js   # NLP utilities: processText, similarity, PageRank
│  └─ style.css       # Tailwind v4 entry point
├─ index.html         # Main HTML file with Glassmorphism UI
├─ vite.config.js     # Vite and Tailwind v4 plugin configuration
└─ package.json       # Project dependencies and scripts
```

---

## Installation

### Clone the repository
```bash
git clone <repo-url>
cd text-summarizer
```

### Install dependencies
```bash
npm install
```

### Start the development server
```bash
npm run dev
```

---

## Usage

1. **Enter Text**  
   Paste your content into the input area. The character counter will guide you (minimum: 50 characters).

2. **Select Mode**  
   Choose a summarization algorithm.  
   > Note: **Neural mode** requires a one-time model download.

3. **Set Length**  
   Use the slider to control the number of sentences in the summary.

4. **Summarize**  
   Once the minimum length is reached, click the active **Summarize** button.

5. **Manage Results**
   - A typewriter effect indicates live generation.
   - Use **Download .TXT** or **Export .PDF** to save the summary.

---

## Future Improvements

- Multi-language tokenization and stopword support
- OCR integration for summarizing scanned documents
- Real-time **Ask SumBot** chat with summaries
- Save/load functionality for user sessions and summary history

---

## How It Works

**Non-Blocking Architecture**  
When the user clicks *Summarize*, `main.js` sends the input to `worker.js`. Heavy processing runs in a background thread, keeping the UI responsive.

**Conditional Loading**  
The neural model is initialized **only when Neural mode is selected**. Traditional methods like PageRank run instantly without loading AI models.

**Text Processing Pipeline**
- Sentence tokenization and stopword filtering
- Sentence scoring via frequency analysis or cosine similarity
- Final summary returned from the worker to the main thread for rendering
