import { importedSchedules } from './importedData.js';

/**
 * Projects a schedule for a target month and year based on June 2026 baseline.
 */
export const projectScheduleForMonth = (targetYear, targetMonth) => {
  const generatedSchedules = [];
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

  for (const baseSch of importedSchedules) {
    const newSch = {
      ...baseSch,
      id: `sch-${baseSch.employee_id}-${targetYear}-${targetMonth}`,
      month: targetMonth,
      year: targetYear,
      days: {},
      locked: false // Ensure new month is locked? Wait, baseSch.locked is usually false. Let's keep it false.
    };

    // Analyze base schedule to determine type (12x36 or Diarista)
    let pCountFirst7Days = 0;
    let firstPDay = -1;

    for (let d = 1; d <= 30; d++) {
      const val = baseSch.days[String(d)];
      if (val === 'P') {
        if (firstPDay === -1) firstPDay = d;
        if (d <= 7) pCountFirst7Days++;
      }
    }

    const isDiarista = pCountFirst7Days > 4;

    // Projection loop
    for (let day = 1; day <= daysInMonth; day++) {
      const targetDate = new Date(targetYear, targetMonth - 1, day);

      if (isDiarista) {
        const dayOfWeek = targetDate.getDay();
        // 0 = Sunday, 6 = Saturday
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          newSch.days[String(day)] = 'P';
        } else {
          newSch.days[String(day)] = 'F';
        }
      } else {
        // 12x36 projection
        if (firstPDay === -1) {
          // Edge case: Employee had no 'P' in June (vacation all month).
          // Fallback to shift_type logic: Diurno/Noturno A = odd (0), B = even (1)
          const isA = baseSch.shift_type.endsWith('_a');
          firstPDay = isA ? 1 : 2;
        }

        const patternType = (firstPDay - 1) % 2;
        
        // Calculate days since June 1, 2026
        // UTC to avoid timezone daylight saving bugs
        const baseDateUtc = Date.UTC(2026, 5, 1);
        const targetDateUtc = Date.UTC(targetYear, targetMonth - 1, day);
        const daysSinceJune1 = Math.floor((targetDateUtc - baseDateUtc) / (1000 * 60 * 60 * 24));

        if (Math.abs(daysSinceJune1) % 2 === patternType) {
          newSch.days[String(day)] = 'P';
        } else {
          newSch.days[String(day)] = 'F';
        }
      }
    }

    generatedSchedules.push(newSch);
  }

  return generatedSchedules;
};
