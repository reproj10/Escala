import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

const excelPath = path.resolve('ESCALA Junho 2026 PREENCHIDA... (1)(10).xlsx');
const workbook = xlsx.readFile(excelPath);

const employees = [];
const schedules = [];

// Standardize role
const standardizeRole = (role) => {
  if (!role) return 'TEC.ENF';
  const r = String(role).toUpperCase().trim();
  if (r.startsWith('TEC')) return 'TEC.ENF';
  if (r.startsWith('AUX')) return 'AUX.ENF';
  if (r === 'ENFERMEIRO' || r === 'ENFERMEIROS') return 'ENFERMEIRO';
  if (r === 'ENFERMEIRA') return 'ENFERMEIRA';
  if (r.includes('RES') && r.includes('TEC')) return 'RES.TECNICA';
  if (r.includes('RESP') && r.includes('TEC')) return 'RES.TECNICA';
  if (r.includes('SUPERVIS')) return 'SUPERVISÃO';
  return r;
};

const isValidRole = (rawRole) => {
  if (!rawRole) return false;
  const r = String(rawRole).toUpperCase().trim();
  return (
    r.startsWith('TEC') ||
    r.startsWith('AUX') ||
    r === 'ENFERMEIRA' ||
    r === 'ENFERMEIRO' ||
    r === 'ENFERMEIROS' ||
    r.includes('RES') && r.includes('TEC') ||
    r.includes('RESP') && r.includes('TEC') ||
    r.includes('SUPERVIS')
  );
};

const rawSheetShiftMap = {
  'JUN DIUR. A': 'diurno_a',
  'JUN  NOT.A': 'noturno_a',
  'JUN.DIUR B ': 'diurno_b',
  'JUN NOT.B': 'noturno_b'
};

const cleanSheetShiftMap = {
  'DIURNO A': 'diurno_a',
  'DIURNO B': 'diurno_b',
  'NOTURNO A': 'noturno_a',
  'NOTURNO B': 'noturno_b'
};

workbook.SheetNames.forEach(sheetName => {
  let shiftType = rawSheetShiftMap[sheetName] || cleanSheetShiftMap[sheetName];
  if (!shiftType) {
    const upper = sheetName.toUpperCase();
    if (upper.includes('DIUR') && upper.includes('A')) shiftType = 'diurno_a';
    else if (upper.includes('DIUR') && upper.includes('B')) shiftType = 'diurno_b';
    else if (upper.includes('NOT') && upper.includes('A')) shiftType = 'noturno_a';
    else if (upper.includes('NOT') && upper.includes('B')) shiftType = 'noturno_b';
  }
  if (!shiftType) return;

  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  // Detect clean format and locate columns dynamically
  let isCleanFormat = false;
  let headerRowIndex = -1;
  let collabColIndex = -1;
  let roleColIndex = -1;
  let corenColIndex = -1;
  
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    if (rows[r]) {
      const idx = rows[r].indexOf('Colaborador');
      if (idx !== -1) {
        isCleanFormat = true;
        headerRowIndex = r;
        collabColIndex = idx;
        roleColIndex = rows[r].indexOf('Categoria');
        corenColIndex = rows[r].indexOf('COREN');
        break;
      }
    }
  }

  if (isCleanFormat) {
    // Parsing clean generated format dynamically by matching header names
    const headerRow = rows[headerRowIndex];
    rows.forEach((row, rowIndex) => {
      if (rowIndex <= headerRowIndex || !row || row.length === 0) return;
      
      const name = row[collabColIndex] ? String(row[collabColIndex]).trim() : '';
      const role = standardizeRole(row[roleColIndex]);
      const coren = row[corenColIndex] ? String(row[corenColIndex]).trim() : '—';
      const workHours = shiftType.includes('diurno') ? '07:00 as 19:00' : '19:00 as 07:00';
      
      if (!name || name.length < 3) return;
      
      const days = {};
      for (let day = 1; day <= 30; day++) {
        const colIdx = headerRow.indexOf(String(day));
        if (colIdx !== -1) {
          const val = row[colIdx] ? String(row[colIdx]).trim().toUpperCase() : 'F';
          days[String(day)] = val;
        } else {
          days[String(day)] = 'F';
        }
      }
      
      const empId = `emp-${shiftType}-${employees.length + 1}`;
      employees.push({
        id: empId,
        name,
        role,
        coren,
        shift_type: shiftType,
        work_hours: workHours,
        sector: 'Geral',
        cycle: rowIndex % 2 === 0 ? 'par' : 'impar',
        contract_type: 'CLT',
        status: 'active'
      });

      schedules.push({
        id: `sch-${empId}`,
        employee_id: empId,
        employee_name: name,
        month: 6,
        year: 2026,
        shift_type: shiftType,
        days,
        locked: false
      });
    });
  } else {
    // Parsing original raw spreadsheet format
    let currentSector = 'Geral';

    rows.forEach((row, rowIndex) => {
      if (!row || row.length === 0) return;

      const nonNil = row.filter(x => x !== null && x !== undefined && String(x).trim() !== '');
      if (nonNil.length === 1 && typeof nonNil[0] === 'string' && nonNil[0].trim().length > 3) {
        const cellText = nonNil[0].trim().toUpperCase();
        const skipWords = ['REFERÊNCIA', 'FUNÇÃO', 'COREN', 'HORÁRIO', 'HORARIO', 'NOME', 'NOME ', 'LEGENDA'];
        if (!skipWords.includes(cellText) && !cellText.startsWith('P:') && !cellText.startsWith('M:') && !cellText.startsWith('F:')) {
          currentSector = nonNil[0].trim();
        }
        return;
      }

      if (row.length < 3) return;

      const rawRoleFromCol2 = row[2] ? String(row[2]).trim() : '';
      let rawName = row[1] ? String(row[1]).trim() : '';
      let rawRole = rawRoleFromCol2;

      if (!rawName && row[0] && typeof row[0] === 'string') {
        rawName = String(row[0]).trim();
      }

      if (!rawName || rawName.length < 3) return;
      if (!rawRole || !isValidRole(rawRole)) return;

      const skipNames = ['LEGENDA', 'P: PLANTÃO', 'F: FOLGA', 'NOME', 'AU: AUSENTE'];
      if (skipNames.some(s => rawName.toUpperCase().includes(s))) return;
      if (rawName.toUpperCase().includes('TÉCNICOS') || rawName.toUpperCase().includes('ENFERMEIROS')) return;

      const name = rawName;
      const role = standardizeRole(rawRole);
      const coren = row[3] ? String(row[3]).trim() : '—';
      const workHours = row[4] ? String(row[4]).trim() : (shiftType.includes('diurno') ? '07:00 as 19:00' : '19:00 as 07:00');

      const empId = `emp-${shiftType}-${employees.length + 1}`;
      const days = {};

      let interleaved = false;
      let totalVals = 0;
      let interleavedVals = 0;
      for (let c = 5; c <= Math.min(row.length - 1, 34); c++) {
        const v = row[c];
        if (v !== null && v !== undefined && String(v).trim() !== '') {
          totalVals++;
          if ((c - 5) % 2 === 0) interleavedVals++;
        }
      }
      if (totalVals > 0 && interleavedVals / totalVals > 0.7) interleaved = true;

      for (let day = 1; day <= 30; day++) {
        let colIndex = interleaved ? (5 + (day - 1) * 2) : (4 + day);
        let val = row[colIndex];
        if (val === undefined || val === null || String(val).trim() === '') {
          val = 'F';
        } else {
          val = String(val).trim().toUpperCase();
          if (val === 'P') val = 'P';
          else if (val === 'F' || val === 'FT') val = 'F';
          else if (val === 'FR' || val.includes('FÉRIAS') || val.includes('FERIAS')) val = 'V';
          else if (val.includes('AFASTAD') || val === 'LM') val = 'LM';
          else if (val === 'LTS') val = 'LTS';
          else if (val === 'LS' || val.includes('LNR')) val = 'LS';
          else if (val === 'AT') val = 'AT';
          else if (val === 'AU') val = 'AU';
          else if (val === 'FE') val = 'FE';
          else if (val === 'FA') val = 'FA';
          else if (val === 'TP') val = 'TP';
          else if (val === 'BH') val = 'BH';
          else if (val === 'D') val = 'F';
          else val = 'F';
        }
        days[String(day)] = val;
      }

      employees.push({
        id: empId,
        name,
        role,
        coren,
        shift_type: shiftType,
        work_hours: workHours,
        sector: currentSector,
        cycle: rowIndex % 2 === 0 ? 'par' : 'impar',
        contract_type: 'CLT',
        status: 'active'
      });

      schedules.push({
        id: `sch-${empId}`,
        employee_id: empId,
        employee_name: name,
        month: 6,
        year: 2026,
        shift_type: shiftType,
        days,
        locked: false
      });
    });
  }
});

const byType = {};
employees.forEach(e => { byType[e.shift_type] = (byType[e.shift_type] || 0) + 1; });
console.log(`Parsed ${employees.length} employees and schedules.`);
console.log('By shift type:', byType);

const fileContent = `export const importedEmployees = ${JSON.stringify(employees, null, 2)};
export const importedSchedules = ${JSON.stringify(schedules, null, 2)};
`;

fs.writeFileSync(
  path.resolve('src/api/importedData.js'),
  fileContent,
  'utf-8'
);

console.log('Successfully wrote src/api/importedData.js');
