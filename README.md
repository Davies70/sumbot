
# Text Summarizer

[Live Demo](https://sumbot.netlify.app)

A lightweight browser-based text summarization tool that extracts the most important sentences and keywords from a given text. It uses multiple summarization algorithms including frequency-based, simple, keyword-based, and graph-based (PageRank) methods.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Algorithms](#algorithms)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [Future Improvements](#future-improvements)

---

## Features

- Input text in a textarea and generate concise summaries.
- Choose among different summarization algorithms:
  - **Frequency-based**: Summarizes based on word/token frequency.
  - **Simple**: Picks the first N sentences.
  - **Keyword-based**: Prioritizes sentences containing the top keywords.
  - **Graph-based**: Uses a similarity matrix with PageRank to rank sentence importance.
- Display top keywords in a tag cloud with clickable highlighting.
- Copy, download (TXT), or export (PDF) the generated summary.
- Live word count tracking.
- Responsive and interactive UI using Tailwind CSS.

---

## Tech Stack

- **Frontend**:
  - Vanilla JavaScript for logic and DOM manipulation.
  - Tailwind CSS for responsive and modern styling.
- **PDF Export**: `jsPDF` library.
- **Algorithm Implementation**:
  - Custom tokenization and text processing functions.
  - Frequency and keyword analysis.
  - PageRank-based graph algorithm for sentence ranking.

---

## Algorithms

### 1. Frequency-Based Summarization

- Counts token frequencies in each sentence.
- Ranks sentences based on the number of tokens.
- Selects the top N sentences for the summary.

### 2. Simple Summarization

- Picks the first N sentences of the text as the summary.
- Quick and useful for structured documents.

### 3. Keyword-Based Summarization

- Extracts top keywords using token frequency.
- Scores sentences based on how many top keywords they contain.
- Prioritizes sentences with higher keyword coverage.

### 4. Graph-Based (PageRank) Summarization

- Creates a similarity matrix for all sentences.
- Applies **PageRank** to determine sentence importance.
- Ranks sentences based on graph centrality.
- Provides a more semantically informed summary.

---

## Project Structure

text-summarizer/
├─ index.html # Main HTML file with textarea and buttons
├─ main.js # Core frontend logic, DOM manipulation, summarization control
├─ summarizer.js # Contains algorithms: processText, buildSimilarityMatrix, pageRank, extractKeywords
├─ style.css # Optional custom styling
├─ README.md # Project documentation
└─ assets/ # Icons, fonts, or additional resources

---

## Installation

1. Clone the repository:

```bash
git clone <repo-url>
cd text-summarizer



2. Open `index.html` in any modern browser (Chrome, Firefox, Edge).
3. No build step is required; the project uses vanilla JavaScript.

---

## Usage

1. Enter or paste text into the textarea.
2. Choose a summarization algorithm from the dropdown:
  - Frequency
  - Simple
  - Keywords
  - Graph
3. Adjust summary length (number of sentences) using the slider.
4. For keyword-based summarization, select the number of top keywords to consider.
5. Click **Summarize**.
6. Interact with the results:
  - Click keywords to highlight relevant sentences.
  - Copy summary, download as TXT, or export as PDF.

---

## Example

**Input:**

> Artificial intelligence is transforming industries. It enables new technologies and improves efficiency. However, ethical challenges remain. AI applications range from healthcare to finance.

**Frequency Summarizer Output:**

- "Artificial intelligence is transforming industries."
- "It enables new technologies and improves efficiency."

---

## Future Improvements

- Implement Web Workers to run algorithms off the main thread for better performance on large texts.
- Support multi-language tokenization and stopword removal.
- Add a dark mode for the UI.
- Integrate NLP libraries for more advanced semantic analysis.
- Add save/load functionality for user sessions.

---

## How It Works

1. User enters text → selects algorithm → chooses summary length/keyword count.
2. Summarizer processes text using chosen algorithm:
  - Tokenizes sentences and words.
  - Builds frequency counts or similarity matrix.
  - Applies ranking method (frequency, keyword scoring, or PageRank).
3. Top sentences and keywords are rendered in the UI.
4. User can interact with keywords and export summary.
```
