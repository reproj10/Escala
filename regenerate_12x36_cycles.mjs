import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jlbvxaqayacohbwcxmal.supabase.co',
  'sb_publishable_OnO2olIDEzYe7whUS_1rMg_DoMl2COx'
);

async function run() {
  const { data: employees, error: eErr } = await supabase.from('employees').select('id, shift_type');
  const { data: schedules, error: sErr } = await supabase.from('schedule_entries').select('*');
  
  if (eErr || sErr) {
    console.log('Error', eErr || sErr);
    return;
  }

  const empMap = new Map();
  employees.forEach(e => empMap.set(e.id, e.shift_type));

  let updateCount = 0;

  for (const s of schedules) {
    const empShift = empMap.get(s.employee_id);
    if (!empShift) continue; // Skip if no employee

    let hasChanges = false;
    const newDays = { ...s.days };

    for (const [day, status] of Object.entries(newDays)) {
      // Only recalculate normal worked/off days. Preserve vacations, sickness, etc.
      if (status === 'P' || status === 'F') {
        const d = parseInt(day);
        let isScheduled = false;

        if (empShift === 'rt_lideranca') {
          const date = new Date(s.year, s.month - 1, d);
          const dayOfWeek = date.getDay();
          isScheduled = dayOfWeek !== 0 && dayOfWeek !== 6;
        } else {
          const isShiftOdd = empShift === "impar_diurno" || empShift === "diurno_a" || empShift === "impar_noturno" || empShift === "noturno_a";
          const patternType = isShiftOdd ? 0 : 1;
          
          const baseDateUtc = Date.UTC(2026, 5, 1);
          const targetDateUtc = Date.UTC(s.year, s.month - 1, d);
          const daysSinceJune1 = Math.floor((targetDateUtc - baseDateUtc) / (1000 * 60 * 60 * 24));
          
          isScheduled = Math.abs(daysSinceJune1) % 2 === patternType;
        }

        const newStatus = isScheduled ? 'P' : 'F';
        if (status !== newStatus) {
          newDays[day] = newStatus;
          hasChanges = true;
        }
      }
    }

    if (hasChanges || s.shift_type !== empShift) {
      await supabase
        .from('schedule_entries')
        .update({
          shift_type: empShift,
          days: newDays,
          updated_date: new Date().toISOString()
        })
        .eq('id', s.id);
      
      updateCount++;
      console.log(`Fixed schedule for ${s.employee_name} (${s.month}/${s.year})`);
    }
  }

  console.log(`Finished checking schedules. Updated ${updateCount} entries to align with continuous 12x36 cycle.`);
}

run();
