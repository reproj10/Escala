const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.resolve('public/escala.xlsx');
const wb = XLSX.readFile(excelPath);

const sheetNames = wb.SheetNames;
const diurnoA = sheetNames.find(n => n.toUpperCase().includes('DIUR') && n.toUpperCase().includes('A'));
const diurnoB = sheetNames.find(n => n.toUpperCase().includes('DIUR') && n.toUpperCase().includes('B'));
const noturnoA = sheetNames.find(n => n.toUpperCase().includes('NOT') && n.toUpperCase().includes('A'));
const noturnoB = sheetNames.find(n => n.toUpperCase().includes('NOT') && n.toUpperCase().includes('B'));

const extractStaff = (sheetName) => {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const loadedStaff = [];
  let isReadingNames = false;
  
  json.forEach((row, i) => {
    if (!row || row.length === 0) return;
    const firstCol = row[0] ? String(row[0]).trim() : '';
    const nameCol = row[1] ? String(row[1]).trim() : '';
    if (firstCol === '1') isReadingNames = true;
    if (isReadingNames && nameCol) {
      if (nameCol === 'OBSERVAÇÕES:') {
        isReadingNames = false;
        return;
      }
      const isNurse = row[2] && String(row[2]).toLowerCase().includes('enf');
      loadedStaff.push({
        id: `excel-${sheetName.replace(/\s/g, '')}-${i}`,
        name: nameCol,
        role: isNurse ? 'nurse' : 'technician',
        status: 'working'
      });
    }
  });
  return loadedStaff;
};

// Initial shifts
const initialShifts = [
  { id: "rt_lideranca", name: "RT & Liderança 💼", staff: [] },
  { id: "impar_diurno", name: "Plantão Ímpar Diurno ☀️", staff: [] },
  { id: "par_diurno", name: "Plantão Par Diurno ☀️", staff: [] },
  { id: "impar_noturno", name: "Plantão Ímpar Noturno 🌙", staff: [] },
  { id: "par_noturno", name: "Plantão Par Noturno 🌙", staff: [] }
];

const shifts = initialShifts.map(s => {
  if (s.id === 'impar_diurno' && diurnoA) {
    return { ...s, name: "Planilha Excel: " + diurnoA, staff: extractStaff(diurnoA) };
  }
  if (s.id === 'par_diurno' && diurnoB) {
    return { ...s, name: "Planilha Excel: " + diurnoB, staff: extractStaff(diurnoB) };
  }
  if (s.id === 'impar_noturno' && noturnoA) {
    return { ...s, name: "Planilha Excel: " + noturnoA, staff: extractStaff(noturnoA) };
  }
  if (s.id === 'par_noturno' && noturnoB) {
    return { ...s, name: "Planilha Excel: " + noturnoB, staff: extractStaff(noturnoB) };
  }
  return s;
});

const allProfessionals = [];
shifts.forEach(s => {
  s.staff.forEach(member => {
    allProfessionals.push({
      id: member.id,
      name: member.name,
      role: member.role,
      shiftId: s.id,
      shiftName: s.name
    });
  });
});

console.log('Total professionals:', allProfessionals.length);

const getDayStatus = (p, d) => {
  let isScheduledWorkDay = false;
  if (p.shiftId === "rt_lideranca") {
    const dayOfWeek = (d - 1 + 5) % 7;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    isScheduledWorkDay = !isWeekend;
  } else {
    const isOddDay = d % 2 !== 0;
    const isShiftOdd = p.shiftId.startsWith("impar_");
    const isShiftEven = p.shiftId.startsWith("par_");
    isScheduledWorkDay = (isShiftOdd && isOddDay) || (isShiftEven && !isOddDay);
  }
  
  const shiftObj = shifts.find(s => s.id === p.shiftId);
  const staffMember = shiftObj?.staff.find(m => m.id === p.id);
  if (staffMember?.status === "leave" && isScheduledWorkDay) {
    return "leave-toggled";
  }
  
  return isScheduledWorkDay ? "duty" : "off-duty";
};

// Find one professional from par_noturno
const parNoturnoPro = allProfessionals.find(p => p.shiftId === 'par_noturno');
if (parNoturnoPro) {
  console.log('Testing professional:', parNoturnoPro);
  const statuses = [];
  for (let d = 1; d <= 5; d++) {
    statuses.push({ day: d, status: getDayStatus(parNoturnoPro, d) });
  }
  console.log('Computed statuses:', statuses);
} else {
  console.log('No par_noturno professional found!');
}
