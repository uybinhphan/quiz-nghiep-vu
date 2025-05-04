# Quiz Nghiệp Vụ Application

[![Release](https://github.com/uybinhphan/quiz-nghiep-vu/actions/workflows/release.yml/badge.svg)](https://github.com/uybinhphan/quiz-nghiep-vu/actions/workflows/release.yml)
[![Deploy](https://github.com/uybinhphan/quiz-nghiep-vu/actions/workflows/deploy.yml/badge.svg)](https://github.com/uybinhphan/quiz-nghiep-vu/actions/workflows/deploy.yml)

## Overview
The Quiz Nghiệp Vụ Application is a client-side web application designed for professional skills testing in Vietnamese. It provides an interactive platform for users to practice and test their knowledge across various professional domains through quizzes.

## Architecture

### Client-Side Architecture
- Single-page application (SPA) built with vanilla JavaScript, HTML, and CSS
- No server-side processing - all operations happen client-side
- PWA (Progressive Web App) features with service worker support
- Responsive design that works on desktop and mobile devices

### Data Architecture
- Quiz data stored in JSON format
- Data pipeline: Excel files → JSON conversion → JSON compression
- Client-side caching for improved performance

### Language Support
- Primary interface language: Vietnamese
- Quiz content, instructions, and UI elements are in Vietnamese
- Column headers in Excel files use Vietnamese terminology (e.g., "Câu hỏi", "Đáp án đúng")

## Features

### Core Features
1. **Quiz Selection Interface**
   - Dropdown/button-based selection of quiz categories
   - Visual indication of quiz selection
   - Shuffle option for randomizing questions

2. **Quiz Interface**
   - Question display with multiple-choice options
   - Answer selection and verification
   - Source citation display
   - Progress tracking
   - Timer functionality

3. **Results Interface**
   - Score display
   - Performance statistics
   - Answer review capability (can view all questions or only wrong-answer questions)
   - Option to restart or select a new quiz
   - Visual celebration (confetti) on completion

### Technical Features
1. **Optimization**
   - JSON compression for reduced file sizes
   - Client-side caching via service worker
   - CSS and HTML minification
   - Lazy loading of external resources

2. **Theme Support**
   - Light and dark theme options
   - Persistent theme preference storage

3. **Settings**
   - Customizable quiz options
   - UI preference settings

## Data Structure

### Quiz Data Format
Each quiz is stored as a JSON array of question objects with the following structure:
```json
{
  "question": "Nội dung câu hỏi",
  "options": [
    "Đáp án 1",
    "Đáp án 2",
    "Đáp án 3",
    "Đáp án 4"
  ],
  "correctAnswerIndex": 0, // Zero-based index (0-3)
  "source": "Trích dẫn nguồn"
}
```

### Quiz Manifest
A central manifest file (`quiz_manifest.json`) maintains an index of all available quizzes:
```json
[
  {
    "name": "Quiz Name/Category",
    "file": "data/quiz-filename.json",
    "size": 12345 // File size in bytes (for progress indication)
  },
  ...
]
```

## Build and Development Process

### Development Environment
- Node.js for build scripts
- Development workflow with npm scripts
- Support for Vietnamese character encoding (UTF-8)
- ESLint for code quality

### Build Pipeline
1. **Data Conversion**: Excel to JSON conversion using the `xlsx` library
   - Command: `npm run convert`
   - Reads from `./quizzes` directory
   - Outputs to `./data` directory

2. **Optimization**: Compression and minification
   - JSON compression: `npm run compress`
   - HTML minification: Part of `npm run optimize`
   - Combined process: `npm run build`

### CI/CD Pipeline

1. **Pull Request Workflow**
   - Automated PR validation with semantic commit checks
   - Code linting and quality checks
   - Ensures all code changes follow project standards

2. **Release Workflow**
   - Automatic versioning using semantic versioning
   - Changelog generation based on commit messages
   - Git tag creation for each release
   - Triggered automatically when PRs are merged to main

3. **Deployment**
   - Automated deployment to GitHub Pages
   - Minification and optimization of assets
   - Triggered by the release workflow
   - Zero-downtime deployment

4. **Setup Instructions**
   - Configure GitHub Pages:
     1. Go to Repository Settings > Pages > Build and Deployment
     2. Select "Deploy from a branch" as the source
     3. Set the branch to `gh-pages`

## Performance Optimization

### Network Optimization
- Compressed JSON files to reduce transfer size
- Browser caching via Cache-Control headers
- Service worker for offline capability and faster loading

### Runtime Optimization
- In-memory caching to prevent redundant data fetching
- Lazy loading of non-essential resources
- Minified CSS and HTML for faster parsing

## Browser Compatibility
- Modern web browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers on iOS and Android
- Progressive enhancement for older browsers

## Contributing

We welcome contributions to improve the Quiz Nghiệp Vụ application. Please follow these steps to contribute:

1. **Fork the repository**
2. **Create a feature branch**
   - Use a descriptive name that reflects your changes
3. **Make your changes**
   - Follow the code style and conventions
   - Add tests if applicable
4. **Commit your changes**
   - Use semantic commit messages (e.g., `feat: add new feature`, `fix: resolve bug`)
   - Include a scope in your commit message (e.g., `feat(ui): add dark mode toggle`)
5. **Create a Pull Request**
   - Provide a clear description of your changes
   - Reference any related issues

### Development Workflow

1. **Setup**: Clone the repository and run `npm install`
2. **Development**: Make your changes and test locally
3. **Linting**: Run `npm run lint` to check for code quality issues
4. **Building**: Run `npm run build` to ensure your changes build correctly
5. **Pull Request**: Submit your changes for review

## Future Enhancements
1. Offline mode with full functionality
2. Enhanced statistics and analytics
3. User accounts and progress tracking
4. Additional quiz formats beyond multiple-choice
5. Modernize the tech stack with React and Next.js

## Limitations
- Maximum quiz file size determined by client-side memory constraints
- Requires JavaScript to be enabled
- Limited offline capability with current implementation

## Localization
- UI text and labels in Vietnamese
- Error messages and instructions in Vietnamese
- Date and time formats following Vietnamese conventions
- Quiz categories reflect Vietnamese professional domains and specializations 