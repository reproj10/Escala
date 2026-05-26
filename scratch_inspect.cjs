const xlsx = require('xlsx');
const path = require('path');

const excelPath = path.resolve('ESCALA Junho 2026 PREENCHIDA... (1)(10).xlsx');
const workbook = xlsx.readFile(excelPath);

console.log('SheetNames:', workbook.SheetNames);
const firstSheet = workbook.SheetNames[0];
const sheet = workbook.Sheets[firstSheet];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log('Total rows in first sheet:', rows.length);
console.log('Row 0:', rows[0]);
console.log('Row 1:', rows[1]);
console.log('Row 2:', rows[2]);
