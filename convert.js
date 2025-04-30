// convert.js
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelDir = './quizzes'; // Directory containing Excel files
const jsonDir = './data';   // Directory to save JSON files

// --- Copy your parseQuizData function here ---
// (Make sure it's adapted slightly if needed to run in Node.js - should be fine)
function parseQuizData(jsonData) {
    if (!jsonData || jsonData.length < 2) { throw new Error("Excel file empty or only header row."); }
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

     if (missingHeaders.length > 0) { throw new Error(`Missing required columns: ${missingHeaders.join(', ')}.`); }
     if (colIndices.source === -1) { console.warn("[Parsing] Column 'trích dẫn nguồn' not found. Source will be 'N/A'."); }

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

         if (!questionText) skipReason = "Missing 'Câu hỏi'";
         let correctAnswerNum = NaN;
         if (!skipReason) {
             if (correctAnswerRaw === '') skipReason = "Missing 'Đáp án đúng'";
             else {
                 correctAnswerNum = parseInt(correctAnswerRaw, 10);
                 if (isNaN(correctAnswerNum)) { skipReason = `'Đáp án đúng' ("${correctAnswerRaw}") is not a valid number`; }
                 else if (correctAnswerNum < 1 || correctAnswerNum > 4) { skipReason = `'Đáp án đúng' (${correctAnswerNum}) must be between 1 and 4`; }
             }
         }

         if (skipReason) {
             console.warn(`[Parsing] Skipping row ${excelRowNum}: ${skipReason}.`);
             skippedRowCount++;
             continue;
         }
         // Push the structured object your quiz expects
         parsedQuestions.push({
             question: questionText, options: options,
             correctAnswerIndex: correctAnswerNum - 1, // 0-based index
             source: sourceText || "N/A"
         });
     }
     if (skippedRowCount > 0) { console.warn(`[Parsing] Finished: Skipped ${skippedRowCount} invalid rows.`); }
     return parsedQuestions; // Return the array of structured question objects
}
// --- End of parseQuizData function ---


// Ensure output directory exists
if (!fs.existsSync(jsonDir)) {
    fs.mkdirSync(jsonDir);
}

// Read Excel files and convert
fs.readdirSync(excelDir).forEach(file => {
    if (file.toLowerCase().endsWith('.xlsx') && !file.startsWith('~')) { // Process .xlsx files, ignore temp files
        const excelPath = path.join(excelDir, file);
        const jsonFilename = path.parse(file).name + '.json';
        const jsonPath = path.join(jsonDir, jsonFilename);

        try {
            console.log(`Processing ${excelPath}...`);
            const workbook = XLSX.readFile(excelPath);
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) { throw new Error(`No sheets found in ${file}`); }
            const worksheet = workbook.Sheets[sheetName];
            const jsonDataRaw = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

            // Use your parsing logic
            const structuredData = parseQuizData(jsonDataRaw);

            if (structuredData.length === 0) {
                console.warn(`WARN: No valid questions parsed from ${file}. JSON file will be empty.`);
            }

            // Write the structured data to JSON
            fs.writeFileSync(jsonPath, JSON.stringify(structuredData, null, 2)); // Pretty print
            console.log(`  -> Saved ${structuredData.length} questions to ${jsonPath}`);

        } catch (err) {
            console.error(`ERROR processing ${file}:`, err.message);
        }
    }
});

console.log("Conversion process finished.");