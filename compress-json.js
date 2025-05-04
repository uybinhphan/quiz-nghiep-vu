// compress-json.js
// This script compresses the JSON quiz files to improve loading speed
const fs = require('fs');
const path = require('path');

// Configuration
const DATA_DIR = './data';
const OUTPUT_DIR = './data-compressed';
const MANIFEST_FILE = 'quiz_manifest.json';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    console.log(`Creating output directory: ${OUTPUT_DIR}`);
    fs.mkdirSync(OUTPUT_DIR);
}

// Read and process the manifest file
console.log(`Processing manifest file...`);
const manifestPath = path.join(DATA_DIR, MANIFEST_FILE);
const outputManifestPath = path.join(OUTPUT_DIR, MANIFEST_FILE);

// Update quiz paths in manifest
let manifest;
try {
    const manifestData = fs.readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(manifestData);

    // Update file paths to point to compressed files
    manifest.forEach(item => {
        const oldPath = item.file;
        const fileName = path.basename(oldPath);
        item.file = `./data/${fileName}`;
        
        // Add size information for client-side progress indication
        const filePath = path.join(__dirname, oldPath);
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            item.size = stats.size;
        }
    });

    // Write updated manifest
    fs.writeFileSync(outputManifestPath, JSON.stringify(manifest));
    console.log(`Manifest file updated and saved to ${outputManifestPath}`);
} catch (err) {
    console.error(`Error processing manifest file: ${err.message}`);
    process.exit(1);
}

// Process all JSON files in the data directory
console.log(`\nCompressing quiz files...`);
let totalOriginalSize = 0;
let totalCompressedSize = 0;

try {
    fs.readdirSync(DATA_DIR).forEach(file => {
        if (file.endsWith('.json') && file !== MANIFEST_FILE) {
            const inputPath = path.join(DATA_DIR, file);
            const outputPath = path.join(OUTPUT_DIR, file);
            
            try {
                // Read the original file
                const data = fs.readFileSync(inputPath, 'utf8');
                const originalSize = Buffer.byteLength(data);
                totalOriginalSize += originalSize;
                
                // Option 1: Minify JSON (remove whitespace)
                const minified = JSON.stringify(JSON.parse(data));
                const minifiedSize = Buffer.byteLength(minified);
                
                // Write minified version
                fs.writeFileSync(outputPath, minified);
                totalCompressedSize += minifiedSize;
                
                const savingsPercent = ((originalSize - minifiedSize) / originalSize * 100).toFixed(2);
                console.log(`${file}: ${formatBytes(originalSize)} → ${formatBytes(minifiedSize)} (${savingsPercent}% saved)`);
                
            } catch (err) {
                console.error(`Error processing ${file}: ${err.message}`);
            }
        }
    });
    
    const totalSavingsPercent = ((totalOriginalSize - totalCompressedSize) / totalOriginalSize * 100).toFixed(2);
    console.log(`\nTotal compression: ${formatBytes(totalOriginalSize)} → ${formatBytes(totalCompressedSize)} (${totalSavingsPercent}% saved)`);
    
} catch (err) {
    console.error(`Error reading data directory: ${err.message}`);
}

// Helper function to format bytes to human-readable format
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
} 