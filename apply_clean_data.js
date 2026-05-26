import { importedEmployees, importedSchedules } from './src/api/importedData.js';
import fs from 'fs';
import path from 'path';

const ROLE_ORDER = {
  'RES.TECNICA': 0,
  'SUPERVISÃO': 1,
  'ENFERMEIRA': 2,
  'ENFERMEIRO': 2,
  'TEC.ENF': 3,
  'AUX.ENF': 4,
};

function getRoleOrder(role) {
  return ROLE_ORDER[role] ?? 5;
}

const shifts = [
  { type: 'diurno_a' },
  { type: 'diurno_b' },
  { type: 'noturno_a' },
  { type: 'noturno_b' }
];

let finalEmployees = [];

for (const shift of shifts) {
  let shiftEmployees = importedEmployees.filter(e => e.shift_type === shift.type);
  
  shiftEmployees.sort((a, b) => {
    const orderA = getRoleOrder(a.role);
    const orderB = getRoleOrder(b.role);
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
  
  finalEmployees = finalEmployees.concat(shiftEmployees);
}

const finalIds = new Set(finalEmployees.map(e => e.id));
const finalSchedules = importedSchedules.filter(s => finalIds.has(s.employee_id));

const content = `export const importedEmployees = ${JSON.stringify(finalEmployees, null, 2)};\n\nexport const importedSchedules = ${JSON.stringify(finalSchedules, null, 2)};\n`;

fs.writeFileSync('./src/api/importedData.js', content);
console.log('Successfully updated importedData.js with clean data! Count: ' + finalEmployees.length);
