import fs from 'fs';
import { importedEmployees, importedSchedules } from './src/api/importedData.js';

const unique = [];
const seen = new Set();
for (const emp of importedEmployees) {
  if (!seen.has(emp.name)) {
    seen.add(emp.name);
    // Force shift_type for RT and Supervisao to 'rt_lideranca' (or we just let EscalaControl handle it)
    if (emp.role === 'RES.TECNICA' || emp.role === 'SUPERVISÃO') {
      emp.shift_type = 'rt_lideranca';
    }
    unique.push(emp);
  }
}

const finalIds = new Set(unique.map(e => e.id));
const finalSchedules = importedSchedules.filter(s => finalIds.has(s.employee_id));

const content = `export const importedEmployees = ${JSON.stringify(unique, null, 2)};\n\nexport const importedSchedules = ${JSON.stringify(finalSchedules, null, 2)};\n`;
fs.writeFileSync('./src/api/importedData.js', content);
console.log('Fixed importedData.js! Count: ' + unique.length);
