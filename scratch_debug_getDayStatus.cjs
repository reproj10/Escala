const { importedEmployees, importedSchedules } = require('./src/api/importedData.js');

// Simulate the react component shifts state
const initialShifts = [
  { id: "rt_lideranca", name: "RT & Liderança 💼", staff: [] },
  { id: "impar_diurno", name: "Plantão Ímpar Diurno ☀️", staff: [] },
  { id: "par_diurno", name: "Plantão Par Diurno ☀️", staff: [] },
  { id: "impar_noturno", name: "Plantão Ímpar Noturno 🌙", staff: [] },
  { id: "par_noturno", name: "Plantão Par Noturno 🌙", staff: [] }
];

const diurnoA = 'JUN DIUR. A';
const diurnoB = 'JUN.DIUR B ';
const noturnoA = 'JUN  NOT.A';
const noturnoB = 'JUN NOT.B';

const extractStaff = (shiftType) => {
  return importedEmployees.filter(e => e.shift_type === shiftType).map((e, i) => ({
    id: `excel-${shiftType}-${i}`,
    name: e.name,
    role: e.role === 'ENFERMEIRO' || e.role === 'ENFERMEIRA' ? 'nurse' : 'technician',
    status: 'working'
  }));
};

const shifts = initialShifts.map(s => {
  if (s.id === 'impar_diurno' && diurnoA) {
    return { ...s, name: "Planilha Excel: " + diurnoA, staff: extractStaff('diurno_a') };
  }
  if (s.id === 'par_diurno' && diurnoB) {
    return { ...s, name: "Planilha Excel: " + diurnoB, staff: extractStaff('diurno_b') };
  }
  if (s.id === 'impar_noturno' && noturnoA) {
    return { ...s, name: "Planilha Excel: " + noturnoA, staff: extractStaff('noturno_a') };
  }
  if (s.id === 'par_noturno' && noturnoB) {
    return { ...s, name: "Planilha Excel: " + noturnoB, staff: extractStaff('noturno_b') };
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

console.log('Total simulated professionals:', allProfessionals.length);

const getDayStatus = (p, d) => {
  let isScheduledWorkDay = false;
  if (p.shiftId === "rt_lideranca") {
    const dayOfWeek = (d - 1 + 5) % 7;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    isScheduledWorkDay = !isWeekend;
  } else {
    const isOddDay = d % 2 !== 0;
    const isShiftOdd = p.shiftId === "impar_diurno" || p.shiftId === "diurno_a" || p.shiftId === "impar_noturno" || p.shiftId === "noturno_a";
    const isShiftEven = p.shiftId === "par_diurno" || p.shiftId === "diurno_b" || p.shiftId === "par_noturno" || p.shiftId === "noturno_b";
    isScheduledWorkDay = (isShiftOdd && isOddDay) || (isShiftEven && !isOddDay);
  }
  return isScheduledWorkDay ? "duty" : "off-duty";
};

// Check Helio Day 2
const helio = allProfessionals.find(p => p.name.includes('Helio'));
if (helio) {
  console.log('Helio shiftId:', helio.shiftId);
  console.log('Helio Day 2 status:', getDayStatus(helio, 2));
  console.log('Helio Day 1 status:', getDayStatus(helio, 1));
} else {
  console.log('Helio not found!');
}
