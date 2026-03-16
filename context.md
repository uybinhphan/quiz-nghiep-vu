# Project Context

## Overview
**Quiz Nghiệp Vụ** is a client-side web application designed to facilitate professional skills testing and practice. Based on the HTML metadata, it is specifically tailored for **Agribank Chi nhánh Sóc Trăng** (Agribank Sóc Trăng Branch), providing employees with an interactive platform to review and test their professional knowledge.

## Purpose and Goals
The primary goal of the application is to offer a reliable, accessible, and user-friendly tool for employees to practice multiple-choice questions across various professional domains. It aims to:
- Provide an easy-to-use interface that mimics real testing environments.
- Enable offline study capabilities (via PWA features or a standalone offline build).
- Offer immediate feedback to users during their practice sessions.
- Support progress tracking across sessions so users can resume where they left off.

## Target Audience
- Employees and candidates preparing for professional competency exams, specifically inside Agribank Sóc Trăng branch (or similar Vietnamese professional environments).

## Key Features
1. **Quiz Selection:** Users can search, filter, and select from a list of available quizzes (grouped by topics/tags) driven by a dynamic manifest.
2. **Interactive Testing:** Multiple-choice question interface with immediate correct/incorrect feedback, optionally revealing the source or citation of the question.
3. **Review Mode:** A dedicated mode to review completed quizzes, with a special filter to focus exclusively on incorrectly answered questions.
4. **Resumable State:** The app automatically saves the user's progress (current quiz, answers, score) locally, allowing them to resume an interrupted session seamlessly.
5. **Customization:** Users can toggle between Light and Dark themes and adjust the auto-advance timer for correct answers.
6. **Mobile-Friendly:** Responsive design natively supporting touch swipe gestures for navigation.
7. **Offline Support:** Includes a Service Worker for general offline caching, as well as an `npm run build:offline` script that bundles the entire app (HTML + JS + Data) into a single offline-capable HTML file.

## Data Pipeline Context
Instead of relying on a real-time backend, the content management workflow is builder-centric:
- **Source:** Subject matter experts write questions in structured Excel files.
- **Build Step:** Node.js scripts convert these Excel files into compressed JSON format and generate a central `quiz_manifest.json`.
- **Delivery:** The client application fetches these static JSON files when the user selects a quiz format. This approach minimizes hosting complexity and ensures fast load times.
