import fs from 'fs';
import { importedEmployees, importedSchedules } from './src/api/importedData.js';

let count = 0;
for (const emp of importedEmployees) {
  if (emp.name.toLowerCase().includes('maria eduarda')) {
    emp.role = 'SUPERVISÃO';
    count++;
  }
}

const content = `export const importedEmployees = ${JSON.stringify(importedEmployees, null, 2)};\n\nexport const importedSchedules = ${JSON.stringify(importedSchedules, null, 2)};\n`;
fs.writeFileSync('./src/api/importedData.js', content);
console.log('Updated role for ' + count + ' employee(s).');
