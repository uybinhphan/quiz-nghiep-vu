// convert.js
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelDir = './quizzes'; // Directory containing Excel files
const jsonDir = './data';   // Directory to save JSON files
const manifestFilename = 'quiz_manifest.json'; // Name of the manifest file

// --- Slugification Function ---
function slugify(text) {
    if (text === null || typeof text === 'undefined') {
        return '';
    }
    text = String(text);

    // Transliterate Vietnamese characters
    text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
    text = text.replace(/[đĐ]/g, 'd');

    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w-]+/g, '')       // Remove all non-word chars
        .replace(/--+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}


// --- Function to parse Excel data into structured JSON ---
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

         if (skipReason) {
             console.warn(`[Parsing] Skipping row ${excelRowNum} in '${sourceFilename}': ${skipReason}.`);
             skippedRowCount++;
             continue;
         }

         parsedQuestions.push({
             question: questionText,
             options: options,
             correctAnswerIndex: correctAnswerNum - 1,
             source: sourceText || "N/A"
         });
     }

     if (skippedRowCount > 0) {
         console.warn(`[Parsing] Finished '${sourceFilename}': Skipped ${skippedRowCount} invalid row(s).`);
     }
     if (parsedQuestions.length === 0 && jsonData.length > 1) {
          console.warn(`WARN: No valid questions were parsed from '${sourceFilename}' after processing ${jsonData.length -1} data rows.`);
     }
     return parsedQuestions;
}
// --- End of parseQuizData function ---


// --- Main Conversion Logic ---

if (!fs.existsSync(jsonDir)) {
    console.log(`Creating output directory: ${jsonDir}`);
    fs.mkdirSync(jsonDir);
}

console.log(`\nStarting conversion from '${excelDir}' to '${jsonDir}'...`);
let convertedFilesCount = 0;
const generatedManifestEntries = []; // Store entries for the manifest

try {
    fs.readdirSync(excelDir).forEach(file => {
        if (file.toLowerCase().endsWith('.xlsx') && !file.startsWith('~')) {
            const excelPath = path.join(excelDir, file);
            const originalBaseName = path.parse(file).name; // Original UTF-8 filename without extension
            const slugifiedBaseName = slugify(originalBaseName);
            const jsonFilename = slugifiedBaseName + '.json';
            const jsonPath = path.join(jsonDir, jsonFilename);

            try {
                console.log(`Processing '${excelPath}' (Original: "${originalBaseName}.xlsx")...`);
                const workbook = XLSX.readFile(excelPath);
                const sheetName = workbook.SheetNames[0];
                if (!sheetName) { throw new Error(`No sheets found in the file.`); }

                const worksheet = workbook.Sheets[sheetName];
                const jsonDataRaw = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

                const structuredQuestions = parseQuizData(jsonDataRaw, file);

                if (structuredQuestions.length > 0) {
                    const outputJsonContent = {
                        originalDisplayName: originalBaseName, // Store the original UTF-8 name
                        questions: structuredQuestions
                    };
                    fs.writeFileSync(jsonPath, JSON.stringify(outputJsonContent, null, 2));
                    console.log(`  -> Saved ${structuredQuestions.length} questions to '${jsonPath}'`);
                    convertedFilesCount++;
                    generatedManifestEntries.push({
                        name: originalBaseName, // User-friendly name for the dropdown
                        file: `${jsonDir}/${jsonFilename}` // Path to the slugified JSON file
                    });
                } else {
                    console.warn(`  -> Skipping JSON output for '${file}' as no valid questions were found.`);
                }

            } catch (err) {
                console.error(`ERROR processing file '${file}':`, err.message);
            }
        }
    });
} catch(err) {
     console.error(`ERROR reading Excel directory '${excelDir}':`, err.message);
     console.error("Please ensure the 'quizzes' directory exists and contains your .xlsx files.");
     process.exit(1);
}
console.log(`Excel to JSON conversion finished. ${convertedFilesCount} file(s) processed successfully.`);


// --- Generate Manifest File ---
console.log(`\nGenerating manifest file in '${jsonDir}'...`);
const manifestPath = path.join(jsonDir, manifestFilename);
try {
    // Sort the manifest alphabetically by the original display name
    generatedManifestEntries.sort((a, b) => {
        const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });
        return collator.compare(a.name, b.name);
    });

    fs.writeFileSync(manifestPath, JSON.stringify(generatedManifestEntries, null, 2));
    console.log(`Generated manifest with ${generatedManifestEntries.length} quizzes: '${manifestPath}'`);

} catch (err) {
    console.error(`ERROR generating manifest file:`, err.message);
}

console.log("\nScript finished.");