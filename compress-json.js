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
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Read and process the manifest file
console.log(`Processing manifest file...`);
const manifestPath = path.join(DATA_DIR, MANIFEST_FILE);
const outputManifestPath = path.join(OUTPUT_DIR, MANIFEST_FILE);

// Process all JSON files in the data directory
console.log(`\nCompressing quiz files...`);
let totalOriginalSize = 0;
let totalCompressedSize = 0;
const compressedSizes = {};

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
                compressedSizes[file] = minifiedSize;

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

// Update quiz paths in manifest using compressed outputs
let manifest;
try {
    const manifestData = fs.readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(manifestData);

    manifest.forEach(item => {
        const oldPath = item.file;
        const fileName = path.basename(oldPath);
        const compressedPath = path.join(OUTPUT_DIR, fileName);
        item.file = `./data-compressed/${fileName}`;

        const compressedSize = compressedSizes[fileName];
        if (compressedSize !== undefined) {
            item.size = compressedSize;
        } else if (fs.existsSync(compressedPath)) {
            const stats = fs.statSync(compressedPath);
            item.size = stats.size;
        } else {
            delete item.size;
            console.warn(`No compressed file found for ${oldPath}; removed size information.`);
        }
    });

    fs.writeFileSync(outputManifestPath, JSON.stringify(manifest, null, 2));
    console.log(`\nManifest file updated and saved to ${outputManifestPath}`);
} catch (err) {
    console.error(`Error processing manifest file: ${err.message}`);
    process.exit(1);
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