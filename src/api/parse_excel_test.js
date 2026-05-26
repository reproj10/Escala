import xlsx from 'xlsx';
import path from 'path';

const excelPath = path.resolve('ESCALA Maio 2026 .  REVISADA.xlsx');
const workbook = xlsx.readFile(excelPath);

console.log('Scanning all sheets...');
workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\nSheet: ${sheetName}, total rows: ${rows.length}`);
  
  rows.forEach((row, i) => {
    if (row && row.length > 3) {
      const col2 = row[2] ? String(row[2]).trim() : '';
      const col1 = row[1] ? String(row[1]).trim() : '';
      if (col2 && ['ENFERMEIRA', 'ENFERMEIRO', 'TEC.ENF', 'AUX.ENF', 'RES.TECNICA', 'SUPERVISÃO', 'TEC. ENF', 'AUX. ENF', 'ENFERMEIROS'].includes(col2.toUpperCase())) {
        console.log(`  Row ${i}: Name="${col1 || row[0]}", Role="${col2}", Coren="${row[3]}"`);
      }
    }
  });
});
