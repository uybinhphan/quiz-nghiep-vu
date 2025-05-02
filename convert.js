// convert.js
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelDir = './quizzes'; // Directory containing Excel files
const jsonDir = './data';   // Directory to save JSON files
const manifestFilename = 'quiz_manifest.json'; // Name of the manifest file

// --- Function to parse Excel data into structured JSON ---
// (This should match the structure your index.html expects)
function parseQuizData(jsonData, sourceFilename) {
    if (!jsonData || jsonData.length < 2) {
        throw new Error(`Excel file '${sourceFilename}' is empty or only has a header row.`);
    }
     const headers = jsonData[0].map(h => (h ? h.toString().trim().toLowerCase() : ""));
     const expectedHeaders = {
         question: "câu hỏi", opt1: "đáp án 1", opt2: "đáp án 2", opt3: "đáp án 3",
         opt4: "đáp án 4", correct: "đáp án đúng", source: "trích dẫn nguồn"
     };
     const colIndices = {};
     let missingHeaders = [];

     Object.keys(expectedHeaders).forEach(key => {
         const index = headers.indexOf(expectedHeaders[key]);
         colIndices[key] = index;
         // Check only required columns for missing status
         if (index === -1 && ['question', 'opt1', 'opt2', 'opt3', 'opt4', 'correct'].includes(key)) {
            missingHeaders.push(`"${expectedHeaders[key]}"`);
         }
     });

     if (missingHeaders.length > 0) {
         throw new Error(`Missing required columns in '${sourceFilename}': ${missingHeaders.join(', ')} (case-insensitive).`);
     }
     if (colIndices.source === -1) {
         console.warn(`[Parsing] Column 'trích dẫn nguồn' not found in '${sourceFilename}'. Source will be 'N/A'.`);
     }

     const parsedQuestions = [];
     let skippedRowCount = 0;
     for (let i = 1; i < jsonData.length; i++) {
         const row = jsonData[i];
         const excelRowNum = i + 1;
         // Skip rows that are completely empty or just whitespace
         if (!row || row.every(cell => String(cell || "").trim() === '')) continue;

         let skipReason = null;
         const questionText = row[colIndices.question] ? String(row[colIndices.question]).trim() : "";
         const options = [
             row[colIndices.opt1] ? String(row[colIndices.opt1]).trim() : "",
             row[colIndices.opt2] ? String(row[colIndices.opt2]).trim() : "",
             row[colIndices.opt3] ? String(row[colIndices.opt3]).trim() : "",
             row[colIndices.opt4] ? String(row[colIndices.opt4]).trim() : ""
         ];
         const correctAnswerRaw = row[colIndices.correct] ? String(row[colIndices.correct]).trim() : "";
         const sourceText = (colIndices.source !== -1 && row[colIndices.source]) ? String(row[colIndices.source]).trim() : "N/A";

         // --- Data Validation ---
         if (!questionText) {
             skipReason = "Missing 'Câu hỏi'";
         }
         let correctAnswerNum = NaN;
         if (!skipReason) {
             if (correctAnswerRaw === '') {
                 skipReason = "Missing 'Đáp án đúng'";
             } else {
                 correctAnswerNum = parseInt(correctAnswerRaw, 10);
                 if (isNaN(correctAnswerNum)) {
                     skipReason = `'Đáp án đúng' ("${correctAnswerRaw}") is not a valid number`;
                 } else if (correctAnswerNum < 1 || correctAnswerNum > 4) {
                     skipReason = `'Đáp án đúng' (${correctAnswerNum}) must be between 1 and 4`;
                 }
             }
         }
         // Optional: Check if at least one answer option is non-empty
         // if (!skipReason && options.every(opt => opt === "")) {
         //    skipReason = "At least one answer option must be provided";
         // }

         if (skipReason) {
             console.warn(`[Parsing] Skipping row ${excelRowNum} in '${sourceFilename}': ${skipReason}.`);
             skippedRowCount++;
             continue; // Skip this row
         }

         // Add the structured question object
         parsedQuestions.push({
             question: questionText,
             options: options,
             correctAnswerIndex: correctAnswerNum - 1, // Convert to 0-based index
             source: sourceText || "N/A" // Ensure source isn't empty if column exists but cell is blank
         });
     }

     if (skippedRowCount > 0) {
         console.warn(`[Parsing] Finished '${sourceFilename}': Skipped ${skippedRowCount} invalid row(s).`);
     }
     if (parsedQuestions.length === 0 && jsonData.length > 1) {
          console.warn(`WARN: No valid questions were parsed from '${sourceFilename}' after processing ${jsonData.length -1} data rows.`);
     }
     return parsedQuestions; // Return the array of structured question objects
}
// --- End of parseQuizData function ---


// --- Main Conversion Logic ---

// Ensure output directory exists
if (!fs.existsSync(jsonDir)) {
    console.log(`Creating output directory: ${jsonDir}`);
    fs.mkdirSync(jsonDir);
}

// Read Excel files and convert
console.log(`\nStarting conversion from '${excelDir}' to '${jsonDir}'...`);
let convertedFilesCount = 0;
try {
    fs.readdirSync(excelDir).forEach(file => {
        // Process only .xlsx files, ignore temporary files (like those starting with ~$)
        if (file.toLowerCase().endsWith('.xlsx') && !file.startsWith('~')) {
            const excelPath = path.join(excelDir, file);
            const baseName = path.parse(file).name; // Filename without extension
            const jsonFilename = baseName + '.json';
            const jsonPath = path.join(jsonDir, jsonFilename);

            try {
                console.log(`Processing '${excelPath}'...`);
                const workbook = XLSX.readFile(excelPath);
                const sheetName = workbook.SheetNames[0]; // Use the first sheet
                if (!sheetName) { throw new Error(`No sheets found in the file.`); }

                const worksheet = workbook.Sheets[sheetName];
                // Convert sheet to array of arrays (more robust for parsing)
                const jsonDataRaw = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

                // Use the parsing function
                const structuredData = parseQuizData(jsonDataRaw, file); // Pass filename for context

                // Only write file if questions were actually parsed
                if (structuredData.length > 0) {
                    fs.writeFileSync(jsonPath, JSON.stringify(structuredData, null, 2)); // Pretty print JSON
                    console.log(`  -> Saved ${structuredData.length} questions to '${jsonPath}'`);
                    convertedFilesCount++;
                } else {
                    console.warn(`  -> Skipping JSON output for '${file}' as no valid questions were found.`);
                    // Optionally delete old JSON if it exists?
                    // if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
                }

            } catch (err) {
                // Log error for specific file but continue with others
                console.error(`ERROR processing file '${file}':`, err.message);
            }
        }
    });
} catch(err) {
     console.error(`ERROR reading Excel directory '${excelDir}':`, err.message);
     console.error("Please ensure the 'quizzes' directory exists and contains your .xlsx files.");
     process.exit(1); // Exit if cannot read directory
}
console.log(`Excel to JSON conversion finished. ${convertedFilesCount} file(s) processed successfully.`);


// --- Generate Manifest File ---
console.log(`\nGenerating manifest file in '${jsonDir}'...`);
const manifest = [];
const manifestPath = path.join(jsonDir, manifestFilename);
try {
    fs.readdirSync(jsonDir).forEach(file => {
        // Include only .json files, EXCLUDE the manifest file itself if it exists
        if (file.toLowerCase().endsWith('.json') && file !== manifestFilename) {
            const name = path.parse(file).name; // Get filename without extension
            manifest.push({
                name: name,             // Use filename as display name
                file: `${jsonDir}/${file}`    // Relative path for client fetch (e.g., data/quiz1.json)
            });
        }
    });

    // Sort the manifest alphabetically by name for consistent button order
    manifest.sort((a, b) => a.name.localeCompare(b.name));

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2)); // Pretty print
    console.log(`Generated manifest with ${manifest.length} quizzes: '${manifestPath}'`);

} catch (err) {
    console.error(`ERROR generating manifest file:`, err.message);
    // Don't exit here, conversion might have partially succeeded
}

console.log("\nScript finished.");