# Quiz Nghiệp Vụ Application

[![Release](https://github.com/uybinhphan/quiz-nghiep-vu/actions/workflows/release.yml/badge.svg)](https://github.com/uybinhphan/quiz-nghiep-vu/actions/workflows/release.yml)
[![Deploy](https://github.com/uybinhphan/quiz-nghiep-vu/actions/workflows/deploy.yml/badge.svg)](https://github.com/uybinhphan/quiz-nghiep-vu/actions/workflows/deploy.yml)

## Overview
The Quiz Nghiệp Vụ Application is a client-side web application designed for professional skills testing in Vietnamese. It provides an interactive platform for users to practice and test their knowledge across various professional domains through quizzes, running entirely in the user's browser.

## Project Structure
```
quiz-nghiep-vu/
├── index.html          # Main client-side application
├── js/                 # Directory for JavaScript modules
│   ├── app.js              # Main application logic and orchestrator
│   ├── config.js           # Configuration constants
│   ├── dom-elements.js     # DOM element references
│   ├── quiz-core.js        # Core quiz logic (navigation, answers, results)
│   ├── quiz-service.js     # Service for loading quiz data and manifest
│   ├── service-worker-loader.js # Service worker registration
│   ├── state.js            # Application state management
│   ├── swipe.js            # Swipe navigation handling
│   ├── theme.js            # Theme (light/dark) management
│   └── ui-helpers.js       # UI utility functions (modals, view changes)
├── convert.js          # Excel to JSON conversion script
├── compress-json.js    # JSON optimization script
├── data/               # Generated JSON files directory
│   └── quiz_manifest.json  # Auto-generated quiz manifest
├── quizzes/            # Source Excel files directory
├── service-worker.js   # PWA service worker for caching/offline support
├── README.md           # Project documentation
└── .github/workflows/  # CI/CD configuration files
    ├── release.yml     # Release automation workflow
    ├── deploy.yml      # Deployment workflow
    └── pr-review.yml   # PR validation workflow
```

## Architecture

### Client-Side Architecture
- Single-page application (SPA) built with vanilla HTML, CSS, and JavaScript (ES6 modules).
- JavaScript is organized into modules within the `js/` directory, with `js/app.js` as the main entry point.
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
1. **"How to Use" Section:** An expandable section providing initial guidance.
2. **Quiz Selection Interface**
   * Loads available quizzes from a manifest file (`data/quiz_manifest.json`).
   * Uses a standard HTML dropdown for quiz selection (displays original Vietnamese quiz names).
   * Displays loading/status messages.
   * Provides an option to shuffle questions before starting a quiz.
3. **Quiz Interface**
   * Displays the current question with multiple-choice answer buttons.
   * Immediate feedback on answer selection (correct/incorrect highlighting).
   * Displays the source/citation for the current question after answering or in review mode.
   * Tracks progress ("Câu X / Y") and score.
   * Navigation:
     * "Câu trước" / "Câu sau" buttons for navigation.
     * Jump-to-question functionality using a number input.
     * Swipe gesture support (left/right) for mobile navigation.
   * Optional auto-advance timer visually showing countdown after a correct answer.
   * Settings Dialog: Adjustable auto-advance duration and theme (light/dark).
   * In-quiz controls: Restart, Shuffle Now, Reload Original Order, Back to Selection, Exit Review, Filter Wrong Answers.
4. **Results Interface**
   * Displays the final score ("Điểm cuối cùng: X / Y").
   * Visual celebration (confetti animation) on completion.
   * Options:
     * Restart the same quiz.
     * Review answers, with an option to filter for incorrect answers only.
     * Go back to the quiz selection screen.

### Technical Features
1. **State Persistence:**
   * Uses `localStorage` to save the current session state (view, quiz, progress, answers, score, settings).
   * Prompts the user on page load if a previous session is found, offering to resume or start fresh.
2. **PWA Features:**
   * Includes a Service Worker for asset caching, enabling faster loads and potential offline access.
3. **Optimization:**
   * Uses `<link rel="preconnect">` for potential CDN resources.
   * Loads external libraries asynchronously.
   * Client-side caching of fetched quiz data.
   * Build-time optimizations: JSON compression, HTML/CSS minification (managed by CI/CD).
4. **Theme Support:**
   * Light and dark themes implemented using CSS Variables.
   * Theme preference is saved in `localStorage` and applied automatically on subsequent visits.
5. **Settings Persistence:** Auto-advance timer duration is saved as part of the application state.
6. **Analytics:** Includes GoatCounter for privacy-friendly analytics.
7. **Swipe Gesture Support:** Enhances mobile UX with touch-based navigation.

## Data Format and Conversion

### Excel Input Format
Excel files in `./quizzes/` with columns:
- B: Câu hỏi (Required)
- C: Đáp án 1 (Required)
- D: Đáp án 2 (Required)
- E: Đáp án 3 (Required)
- F: Đáp án 4 (Required)
- G: Đáp án đúng (Required, 1-4)
- H: Trích dẫn nguồn (Optional)

### Quiz Data Format
Each quiz is stored as a JSON file with a slugified (ASCII-safe) name (e.g., `data/bo-de-ke-toan.json`):
```json
{
  "originalDisplayName": "Bộ Đề Kế Toán", 
  "questions": [
    {
      "question": "Nội dung câu hỏi...",
      "options": [
        "Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"
      ],
      "correctAnswerIndex": 0,
      "source": "Nguồn tham khảo..."
    }
  ]
}
```

### Quiz Manifest (`data/quiz_manifest.json`)
A central JSON file listing available quizzes:
```json
[
  {
    "name": "Bộ Đề Kế Toán",
    "file": "data/bo-de-ke-toan.json",
    "size": 12345
  }
]
```

## Build and Development Process

### Development Environment
- Requires Node.js for running build scripts.
- Uses `pnpm` as the package manager for dependency management and scripts.
- Assumes UTF-8 encoding for handling Vietnamese characters.
- ESLint configured for code quality checks.

### Setup
1. Install `pnpm` globally if not already installed:
   ```bash
   npm install -g pnpm
   ```
2. Install project dependencies:
   ```bash
   pnpm install
   ```

### Build Pipeline
1. **Data Conversion**: `pnpm run convert` - Converts Excel files to JSON format.
2. **Optimization**:
   * `pnpm run compress`: Compresses JSON files and updates the manifest.
   * `pnpm run optimize`: Runs compression and minifies HTML.
   * `pnpm run build`: Full build process (convert + optimize).

### CI/CD Pipeline (GitHub Actions)
1. **PR Workflow**: Validates PRs and runs quality checks.
2. **Release Workflow**: Handles semantic versioning and triggers deployment.
3. **Deployment Workflow**: Deploys the application to GitHub Pages with optimizations.

## Contributing

Contributions are welcome! Please follow these general steps:

1. Fork the repository.
2. Create a feature branch (e.g., `git checkout -b feat/add-timer-pause`).
3. Make your changes, adhering to existing code style.
4. Commit your changes using semantic commit messages.
5. Run linters and build locally if applicable.
6. Push to your fork and create a Pull Request.

### Development Workflow
1. **Setup**: Clone the repo, run `npm install`.
2. **Develop**: Make code changes. Test by opening `index.html` locally.
3. **Lint**: Run `npm run lint`.
4. **Build**: Run `npm run build`.
5. **Submit PR**.

## Future Enhancements
1. More robust offline mode using the service worker.
2. User accounts for tracking progress across sessions/devices.
3. More detailed statistics and performance analysis.
4. Support for different question types.
5. Refactoring to a modern framework for better maintainability.

### Using NVM and Installing PNPM Cleanly

To ensure a minimal and portable setup, you can use `nvm` (Node Version Manager) to manage Node.js versions and install `pnpm` cleanly without global pollution. This approach is fully user-scoped and reversible.

#### Steps to Install PNPM with NVM

1. **Install and Load NVM** (if not already installed):
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
   source ~/.nvm/nvm.sh
   ```

2. **Use the Latest LTS Version of Node.js**:
   ```bash
   nvm install --lts
   nvm use --lts
   ```

3. **Enable Corepack and Install PNPM**:
   ```bash
   corepack enable
   corepack prepare pnpm@latest --activate
   ```

4. **Verify Installation**:
   ```bash
   pnpm -v
   ```

#### Uninstall Instructions
To fully revert the setup:
```bash
corepack disable
rm -rf ~/.cache/pnpm
```

#### Optional: Add to Dotfiles
To ensure `pnpm` is always available in new shells, add the following to your `~/.zshrc` or `~/.bashrc`:
```bash
# Ensure pnpm is available via corepack
corepack enable
corepack prepare pnpm@latest --activate
```