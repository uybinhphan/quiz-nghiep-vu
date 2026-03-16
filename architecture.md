# Technical Architecture

## Application Type
**Vanilla JavaScript Single Page Application (SPA)**. The application runs entirely in the user's browser without the need for a dynamic backend server (like Node.js, Python, or PHP) during runtime. All data is served as static JSON files.

## Technical Stack
- **Structure:** HTML5.
- **Styling:** CSS3, heavily utilizing CSS Variables for the Light/Dark theme switching implementation.
- **Logic:** Vanilla JavaScript (ES6 Modules). No heavy frontend frameworks (like React or Vue) are used, ensuring a lightweight footprint and fast execution.
- **Build Tools:** Node.js, `pnpm` for package management, HTML/CSS minifiers, and custom scripts for data conversion.

## Directory Structure
- `/` - Root contains HTML entry point (`index.html`), service worker, and build/conversion scripts.
- `/src/` & `/js/` - Contains the modular ES6 JavaScript files driving the application logic.
- `/data/` - Holds the auto-generated JSON quiz data and `quiz_manifest.json`.
- `/quizzes/` - The source directory for raw Excel quiz files.

## Core JavaScript Modules (`/js/`)
The application logic is broken down into specific-purpose modules to maintain separation of concerns:

- **`app.js` (Entry Point):** Responsible for bootstrapping the application, initializing event listeners on DOM nodes, and orchestrating the resumption of saved sessions on load.
- **`quiz-core.js`:** The core engine. It manages the quiz flow, including navigating between questions (`navigateNext`, `navigatePrevious`), validating selected answers, score calculation, timer management, and entering/exiting review modes.
- **`state.js`:** Centralized state manager. It holds the active state of the application (current question index, score, user answers, selected quiz data) and handles marshalling this data to and from the browser's `localStorage` for session persistence.
- **`quiz-service.js`:** The data layer. It fetches the `quiz_manifest.json` to populate the quiz selection screen. When a user selects a quiz, it handles fetching the specific JSON data file with fallback/retry mechanisms and populates the global state.
- **`dom-elements.js`:** A registry of DOM elements. It queries the DOM once and exports references to all heavily used UI elements, preventing repetitive `document.getElementById` calls throughout the app.
- **`ui-helpers.js`:** Contains functions for toggling standard UI views (Selection Screen vs. Quiz Screen vs. Results Screen) and managing modals.
- **`quiz-metadata.js`:** Handles saving metadata and tracking attempts locally (highest score, completion status).
- **`theme.js` & `swipe.js`:** Utility modules handling the light/dark mode toggling and mobile touch-swipe interactions respectively.

## Execution Flow

1. **Initialization:** The browser loads `index.html` and imports `app.js`. `app.js` triggers `state.js` to check `localStorage` for an existing session.
2. **Session Choice:** If a session exists, building the UI to prompt the user to resume. Otherwise, it tells `quiz-service.js` to fetch the manifest.
3. **Data Loading:** User selects a quiz. `quiz-service.js` fetches the requested JSON, injects it into `state.js`, and instructs `ui-helpers.js` to show the quiz view.
4. **Interaction:** User answers questions. `quiz-core.js` handles the logic, updates `state.js` (which saves to local storage), and updates the DOM immediately (e.g., highlighting correct/incorrect answers).
5. **Completion:** Upon reaching the final sequence, `quiz-core.js` calculates the final score, triggers celebration effects (confetti), and switches the view to the results screen.

## Data Processing Pipeline
Since there is no runtime database, quiz data is pre-compiled:
1. Contributors add `.xlsx` files to `/quizzes/`.
2. Developer runs `npm run build`.
3. `convert.js` reads the Excel files utilizing the `xlsx` parsing library, extracting rows into structured JSON objects.
4. `compress-json.js` minimizes the generated JSON.
5. The final output is placed in `/data/` alongside an updated `quiz_manifest.json` indexing them.

## Offline Capabilities (PWA)
- **Service Worker (`service-worker.js`):** Caches core assets (HTML, CSS, JS) and dynamically caches requested data files (`.json`) so previously opened quizzes work without a connection.
- **Offline Bundle (`build-offline-html.js`):** A custom Node script that reads all JS, CSS, and localized JSON data, injecting them directly into the HTML to produce a single, monolithic `quiz-offline.html` file that operates 100% offline with zero external network requests.
