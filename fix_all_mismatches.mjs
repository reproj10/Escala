import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jlbvxaqayacohbwcxmal.supabase.co',
  'sb_publishable_OnO2olIDEzYe7whUS_1rMg_DoMl2COx'
);

async function run() {
  const { data: employees, error: eErr } = await supabase.from('employees').select('id, name, shift_type');
  const { data: schedules, error: sErr } = await supabase.from('schedule_entries').select('*');
  
  if (eErr || sErr) {
    console.log('Error', eErr || sErr);
    return;
  }

  const empMap = new Map();
  employees.forEach(e => empMap.set(e.id, e.shift_type));

  for (const s of schedules) {
    const empShift = empMap.get(s.employee_id);
    if (empShift && empShift !== s.shift_type) {
      console.log(`Fixing ${s.employee_name} (${s.month}/${s.year}): ${s.shift_type} -> ${empShift}`);
      
      const newDays = { ...s.days };
      
      // Regenerate P and F based on parity for the new shift type
      for (const [day, status] of Object.entries(newDays)) {
        if (status === 'P' || status === 'F') {
          const d = parseInt(day);
          let isScheduled = false;

          if (empShift === 'rt_lideranca') {
            const date = new Date(s.year, s.month - 1, d);
            const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday
            isScheduled = dayOfWeek !== 0 && dayOfWeek !== 6;
          } else {
            const isOddDay = d % 2 !== 0;
            const isShiftOdd = empShift === "impar_diurno" || empShift === "diurno_a" || empShift === "impar_noturno" || empShift === "noturno_a";
            const isShiftEven = empShift === "par_diurno" || empShift === "diurno_b" || empShift === "par_noturno" || empShift === "noturno_b";
            isScheduled = (isShiftOdd && isOddDay) || (isShiftEven && !isOddDay);
          }

          newDays[day] = isScheduled ? 'P' : 'F';
        }
      }

      await supabase
        .from('schedule_entries')
        .update({
          shift_type: empShift,
          days: newDays,
          updated_date: new Date().toISOString()
        })
        .eq('id', s.id);
    }
  }

  console.log('Finished fixing mismatches.');
}

run();
