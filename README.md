# Quiz Nghiệp Vụ Application

[![Release](https://github.com/uybinhphan/quiz-nghiep-vu/actions/workflows/release.yml/badge.svg)](https://github.com/uybinhphan/quiz-nghiep-vu/actions/workflows/release.yml)
[![Deploy](https://github.com/uybinhphan/quiz-nghiep-vu/actions/workflows/deploy.yml/badge.svg)](https://github.com/uybinhphan/quiz-nghiep-vu/actions/workflows/deploy.yml)

## Overview
The Quiz Nghiệp Vụ Application is a client-side web application designed for professional skills testing in Vietnamese. It provides an interactive platform for users to practice and test their knowledge across various professional domains through quizzes, running entirely in the user's browser.

## Architecture

### Client-Side Architecture
- Single-page application (SPA) built with vanilla JavaScript, HTML, and CSS.
- Main layout managed using CSS Grid (`#app`) and CSS Variables for flexible theming (light/dark).
- No server-side processing required for core quiz functionality.
- PWA (Progressive Web App) features enabled via a service worker for caching.
- Responsive design adapting to desktop and mobile viewports.

### Data Architecture
- Quiz data stored in JSON format, loaded dynamically based on user selection.
- Data pipeline (handled during build process): Excel files → JSON conversion (with slugified filenames) → JSON compression.
- Client-side caching of quiz manifest (`sessionStorage`) and loaded quiz data (`loadedQuizzes` object) for performance.

### Language Support
- Primary interface language: Vietnamese (`lang="vi"`).
- Quiz content, instructions, UI elements (buttons, labels, messages), and settings are in Vietnamese.
- Expected column headers in source Excel files use Vietnamese terminology (e.g., "Câu hỏi", "Đáp án đúng").

## Features

### Core Features
1.  **"How to Use" Section:** An expandable section (`<details>`) providing initial guidance.
2.  **Quiz Selection Interface (`#select-section`)**
    *   Loads available quizzes from a manifest file (`data/quiz_manifest.json`).
    *   Uses a standard HTML `<select>` dropdown (`#quiz-file-select`) for quiz selection (displays original Vietnamese quiz names).
    *   Displays loading/status messages (`#status-message`).
    *   Provides an option (`#shuffle-checkbox`) to shuffle questions *before* starting a quiz.
3.  **Quiz Interface (`#quiz-section`)**
    *   Displays the current question (`#question-text`) with multiple-choice answer buttons (`#answers .answer-btn`).
    *   Immediate feedback on answer selection (correct/incorrect highlighting).
    *   Displays the source/citation for the current question (`#source`) after answering or in review mode.
    *   Tracks progress (`#progress`: "Câu X / Y") and score (`#score`).
    *   Navigation:
        *   "Câu trước" (`#prev-btn`) / "Câu sau" (`#next-btn`) buttons placed below the header, above the question.
        *   Jump-to-question functionality using a number input (`#jump-nav`).
        *   Swipe gesture support (left/right) on the question container (`#question-container`) for mobile navigation.
    *   Optional auto-advance timer (`#auto-advance-timer-bar`) visually showing countdown after a correct answer.
    *   Settings Dialog (`#settings-dialog`): Accessible via '⚙️' button (`#settings-btn`) to adjust auto-advance duration and toggle theme (light/dark).
    *   In-quiz controls (`#nav-controls`, `#review-controls`): Restart (same quiz), Shuffle Now, Reload Original Order, Back to Selection, Exit Review, Filter Wrong Answers.
4.  **Results Interface (`#results-section`)**
    *   Displays the final score (`#final-score`: "Điểm cuối cùng: X / Y").
    *   Visual celebration (confetti animation) on completion.
    *   Options (`#results-controls`):
        *   Restart the same quiz (`#restart-btn`).
        *   Review answers (`#review-btn`), with an option to filter for incorrect answers only (`#toggle-filter-btn`).
        *   Go back to the quiz selection screen (`#back-to-select-btn`).

### Technical Features
1.  **State Persistence:**
    *   Uses `localStorage` (`STORAGE_KEY = 'quizAppState'`) to save the current session state (view, quiz display name, data, progress, answers, score, settings like timer duration).
    *   Prompts the user (`#resume-modal-overlay`) on page load if a previous session is found, offering to resume or start fresh.
2.  **PWA Features:**
    *   Includes a Service Worker (`service-worker.js`) for asset caching, enabling faster loads and potential basic offline access to previously visited quizzes.
3.  **Optimization:**
    *   Uses `<link rel="preconnect">` for potential CDN resources.
    *   Loads external libraries (`canvas-confetti`) asynchronously (`async`).
    *   Client-side caching of fetched quiz data.
    *   *Build-time optimizations:* JSON compression, HTML/CSS minification (managed by CI/CD).
4.  **Theme Support:**
    *   Light and dark themes implemented using CSS Variables.
    *   Theme preference is saved in `localStorage` and applied automatically on subsequent visits.
    *   Toggle available in the settings dialog.
5.  **Settings Persistence:** Auto-advance timer duration is saved as part of the application state.
6.  **Analytics:** Includes GoatCounter for privacy-friendly analytics.
7.  **Swipe Gesture Support:** Enhances mobile UX with touch-based navigation.

## Data Structure

### Quiz Data Format
Each quiz is stored as a JSON file with a slugified (ASCII-safe) name (e.g., `data/bo-de-ke-toan.json`). The content of the file is an object:
```json
{
  "originalDisplayName": "Bộ Đề Kế Toán", // Original UTF-8 display name from Excel filename
  "questions": [
    {
      "question": "Nội dung câu hỏi...",
      "options": [
        "Đáp án A",
        "Đáp án B",
        "Đáp án C",
        "Đáp án D"
      ],
      "correctAnswerIndex": 0, // Zero-based index of the correct option
      "source": "Nguồn tham khảo..."
    }
    // ... more questions
  ]
}
```

### Quiz Manifest (`data/quiz_manifest.json`)
A central JSON file listing available quizzes. This file is generated and processed during the build.
```json
[
  {
    "name": "Bộ Đề Kế Toán", // Original UTF-8 display name, shown in the UI
    "file": "data/bo-de-ke-toan.json", // Path to the slugified JSON data file client fetches
    "size": 12345 // Original (uncompressed) file size in bytes, added during build
  },
  // ... more quiz entries
]
```
The `"size"` field (original file size in bytes) is added during the build process by `compress-json.js` and could be used by the client for loading progress if needed.

## Build and Development Process

### Development Environment
- Requires Node.js for running build scripts.
- Uses `npm` scripts for development tasks (linting, building).
- Assumes UTF-8 encoding for handling Vietnamese characters.
- ESLint configured for code quality checks.

### Build Pipeline (via npm scripts)
1.  **Data Conversion**: `npm run convert` - Converts Excel files (from `./quizzes`) to JSON format. Output JSON files are placed in `./data` with slugified filenames. The JSON content includes the original UTF-8 display name, and a `quiz_manifest.json` is generated with these display names and paths to the slugified files.
2.  **Optimization**:
    *   `npm run compress`: Compresses JSON files from `./data` into a `./data-compressed` directory. It also processes `quiz_manifest.json`, updates quiz file paths to point to the client-expected `./data/` structure for deployed files, adds file size information, and minifies it into `./data-compressed`.
    *   `npm run optimize`: Runs `npm run compress` and then minifies `index.html` in place.
    *   `npm run build`: Combines `npm run convert` and `npm run optimize` for a full local build.

### CI/CD Pipeline (GitHub Actions)

1.  **Pull Request Workflow (`release.yml`? likely validation):**
    *   Validates PRs, checks semantic commit messages.
    *   Runs linters and quality checks.
2.  **Release Workflow (`release.yml`):**
    *   Handles semantic versioning based on commit messages.
    *   Generates changelogs.
    *   Creates Git tags for releases.
    *   Triggered on merges to the main branch.
3.  **Deployment Workflow (`deploy.yml`):**
    *   Deploys the application to GitHub Pages.
    *   Includes data conversion from Excel (`npm run convert`).
    *   Includes JSON processing and compression (`node compress-json.js`).
    *   Includes HTML minification.
    *   Stages only necessary built files (e.g., minified `index.html`, the processed `data/` directory containing compressed JSONs and the final manifest, `service-worker.js`) into a temporary `dist/` folder.
    *   Deploys the content of the `dist/` folder to the `gh-pages` branch for a clean deployment.

4.  **Setup Instructions (GitHub Pages):**
    *   Configure repository settings: Pages > Build and Deployment.
    *   Source: "Deploy from a branch".
    *   Branch: `gh-pages` (or as configured in the deploy workflow).

## Performance Optimization

### Network Optimization
- JSON files are compressed (minified) during the build process (reduces download size).
- Browser caching utilized via `Cache-Control` headers (set by GitHub Pages or server).
- Service Worker provides robust caching for static assets and potentially API calls (manifest).
- Asynchronous loading of non-critical JavaScript (`canvas-confetti`).
- Preconnect hints for CDNs.

### Runtime Optimization
- In-memory caching (`loadedQuizzes`) prevents re-fetching the same quiz data within a session.
- Efficient DOM manipulation (updates specific elements rather than full re-renders).
- Minified CSS/HTML (build step) leads to faster browser parsing.

## Browser Compatibility
- Designed for modern web browsers (latest versions of Chrome, Firefox, Safari, Edge).
- Responsive design targets mobile browsers on iOS and Android.
- Functionality relies heavily on JavaScript being enabled.

## Contributing

Contributions are welcome! Please follow these general steps:

1.  Fork the repository.
2.  Create a feature branch (e.g., `git checkout -b feat/add-timer-pause`).
3.  Make your changes, adhering to existing code style.
4.  Commit your changes using semantic commit messages (e.g., `feat(timer): add pause button`).
5.  Run linters (`npm run lint`) and build (`npm run build`) locally if applicable.
6.  Push to your fork and create a Pull Request with a clear description.

### Development Workflow

1.  **Setup**: Clone the repo, run `npm install`.
2.  **Develop**: Make code changes. Test by opening `index.html` locally (or using a simple local server).
3.  **Lint**: Run `npm run lint`.
4.  **Build**: Run `npm run build` (especially if modifying data or build scripts).
5.  **Submit PR**.

## Future Enhancements (Potential Ideas)
1.  More robust offline mode using the service worker.
2.  User accounts for tracking progress across sessions/devices.
3.  More detailed statistics and performance analysis.
4.  Support for different question types (e.g., fill-in-the-blank, matching).
5.  Refactoring to a modern framework like React/Vue/Svelte for better maintainability (as mentioned in the original README).

## Limitations
- Performance may degrade with extremely large quiz files due to client-side processing and memory limits.
- Requires JavaScript enabled in the browser.
- Offline capability is primarily based on browser/service worker caching; full offline *functionality* (starting a *new*, uncached quiz offline) is likely not supported.

## Localization
- The application interface is currently hardcoded in Vietnamese. Adapting for other languages would require significant refactoring for internationalization (i18n).
- Assumes quiz data content is in Vietnamese.