import fs from 'fs';
import { importedEmployees, importedSchedules } from './src/api/importedData.js';

const daysInMonth = 30; // June 2026
const year = 2026;
const month = 6;

importedSchedules.forEach(sched => {
  const emp = importedEmployees.find(e => e.id === sched.employee_id);
  if (!emp) return;

  const newDays = {};
  
  // Track all special statuses from old schedule
  const specialStatuses = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const oldStatus = sched.days[String(d)];
    if (oldStatus && oldStatus !== 'P' && oldStatus !== 'F' && oldStatus !== '') {
      specialStatuses.push({ day: d, status: oldStatus });
    }
  }

  for (let d = 1; d <= daysInMonth; d++) {
    let isScheduled = false;
    
    if (emp.shift_type === 'rt_lideranca' || emp.role === 'RES.TECNICA' || emp.role === 'SUPERVISÃO') {
      // Mon to Fri
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      isScheduled = (dayOfWeek !== 0 && dayOfWeek !== 6);
    } else if (emp.shift_type === 'diurno_a' || emp.shift_type === 'noturno_a') {
      // Impar (Odd)
      isScheduled = (d % 2 !== 0);
    } else if (emp.shift_type === 'diurno_b' || emp.shift_type === 'noturno_b') {
      // Par (Even)
      isScheduled = (d % 2 === 0);
    }

    newDays[String(d)] = isScheduled ? 'P' : 'F';
  }
  
  // Re-apply special statuses on the EXACT SAME generated 'P' days sequentially?
  // Actually, the original parsed data clustered 'P', 'LM', 'P' in days 1 to 15.
  // Example: Alessandra had LM on Day 1. In a 12x36, Day 1 is odd. 
  // If we just restore special statuses to their exact original Day Number, it might not align perfectly with their working days,
  // but it's the safest assumption without doing complex relative mapping.
  specialStatuses.forEach(({ day, status }) => {
    newDays[String(day)] = status;
  });

  sched.days = newDays;
});

const content = `export const importedEmployees = ${JSON.stringify(importedEmployees, null, 2)};\n\nexport const importedSchedules = ${JSON.stringify(importedSchedules, null, 2)};\n`;
fs.writeFileSync('./src/api/importedData.js', content);
console.log('Fixed schedules!');
