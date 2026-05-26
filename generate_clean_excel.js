import xlsx from 'xlsx';
import path from 'path';
import { importedEmployees, importedSchedules } from './src/api/importedData.js';

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

async function generate() {
  const wb = xlsx.utils.book_new();
  
  const shifts = [
    { type: 'diurno_a', name: 'DIURNO A' },
    { type: 'diurno_b', name: 'DIURNO B' },
    { type: 'noturno_a', name: 'NOTURNO A' },
    { type: 'noturno_b', name: 'NOTURNO B' }
  ];
  
  for (const shift of shifts) {
    const shiftEmployees = importedEmployees.filter(e => e.shift_type === shift.type);
    
    // Sort: RT -> Supervisores -> Enfermeiros -> Tecnicos/Auxiliares -> Alphabetical
    shiftEmployees.sort((a, b) => {
      const orderA = getRoleOrder(a.role);
      const orderB = getRoleOrder(b.role);
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
    
    const rows = [];
    
    for (const emp of shiftEmployees) {
      const sched = importedSchedules.find(s => s.employee_id === emp.id);
      const days = sched ? sched.days : {};
      
      const row = {
        'Colaborador': emp.name,
        'Categoria': emp.role,
        'COREN': emp.coren
      };
      
      for (let day = 1; day <= 30; day++) {
        row[String(day)] = days[String(day)] || 'F';
      }
      
      row['Ass.'] = '____';
      rows.push(row);
    }
    
    const ws = xlsx.utils.json_to_sheet(rows);
    
    // Set column widths for a premium look
    const colWidths = [
      { wch: 30 }, // Colaborador
      { wch: 15 }, // Categoria
      { wch: 12 }  // COREN
    ];
    for (let i = 1; i <= 30; i++) {
      colWidths.push({ wch: 4 }); // Day columns
    }
    colWidths.push({ wch: 10 }); // Ass.
    ws['!cols'] = colWidths;
    
    xlsx.utils.book_append_sheet(wb, ws, shift.name);
  }
  
  const outputPath = path.resolve('ESCALA_JUNHO_2026_LIMPA.xlsx');
  xlsx.writeFile(wb, outputPath);
  console.log(`Successfully generated clean Excel sheet at: ${outputPath}`);
}

generate();
