# Quiz Nghiệp Vụ Application

A client-side quiz application that loads question data from JSON files.

## GitHub Pages Optimization

This application has been optimized for hosting on GitHub Pages with the following improvements:

1. **JSON Compression** - Quiz data is minified to reduce transfer size
2. **Browser Caching** - Cache-Control headers via meta tags to enable browser caching
3. **In-memory Caching** - Client-side caching to avoid redundant data fetching
4. **Lazy Loading** - Scripts and resources are loaded only when needed
5. **CSS Optimization** - CSS is minified during build
6. **Resource Hints** - Preconnect to CDN resources

## Development Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the conversion script to process Excel files into JSON:
   ```
   npm run convert
   ```

## Optimization Process

### Step 1: Compress JSON Files

The application uses many large JSON files which impact loading time. We optimize these files using:

```
npm run compress
```

This creates minified versions of all JSON files in the `data-compressed` directory.

### Step 2: Optimize HTML/CSS

We minify the CSS in the index.html file:

```
npm run optimize
```

### Step 3: Automated Deployment

The GitHub Actions workflow automates the optimization and deployment process. When you push to the main branch:

1. The workflow compresses all JSON files
2. It minifies the HTML/CSS
3. It deploys the optimized files to GitHub Pages

## Manual Optimization for GitHub Pages

If you're not using GitHub Actions:

1. Run the build process:
   ```
   npm run build
   ```

2. Copy the contents of the root directory to your GitHub Pages branch (usually `gh-pages`).

## Performance Considerations

- The quiz application now caches loaded quiz data in memory to prevent reloading
- The manifest file is cached in sessionStorage to speed up subsequent page loads
- Cache-Control headers tell browsers to cache resources for 24 hours
- The confetti library is loaded asynchronously to avoid blocking rendering 