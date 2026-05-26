const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.resolve('public/escala.xlsx');
const wb = XLSX.readFile(excelPath);

const sheetNames = wb.SheetNames;
console.log('Sheet Names:', sheetNames);

const diurnoA = sheetNames.find(n => n.toUpperCase().includes('DIUR') && n.toUpperCase().includes('A'));
const diurnoB = sheetNames.find(n => n.toUpperCase().includes('DIUR') && n.toUpperCase().includes('B'));
const noturnoA = sheetNames.find(n => n.toUpperCase().includes('NOT') && n.toUpperCase().includes('A'));
const noturnoB = sheetNames.find(n => n.toUpperCase().includes('NOT') && n.toUpperCase().includes('B'));

console.log('diurnoA:', diurnoA);
console.log('diurnoB:', diurnoB);
console.log('noturnoA:', noturnoA);
console.log('noturnoB:', noturnoB);

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

const staffB = extractStaff(noturnoB);
console.log('Parsed Staff for Noturno B count:', staffB.length);
if (staffB.length > 0) {
  console.log('First employee:', staffB[0]);
}

// Let's run getDayStatus logic for first employee on Day 2
const p = {
  id: staffB[0]?.id,
  name: staffB[0]?.name,
  role: staffB[0]?.role,
  shiftId: 'par_noturno'
};

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
  return isScheduledWorkDay ? "duty" : "off-duty";
};

console.log('Day 1 status:', getDayStatus(p, 1));
console.log('Day 2 status:', getDayStatus(p, 2));
