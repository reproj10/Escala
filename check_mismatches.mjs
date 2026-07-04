import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jlbvxaqayacohbwcxmal.supabase.co',
  'sb_publishable_OnO2olIDEzYe7whUS_1rMg_DoMl2COx'
);

async function run() {
  const { data: employees, error: eErr } = await supabase.from('employees').select('id, name, shift_type');
  const { data: schedules, error: sErr } = await supabase.from('schedule_entries').select('id, employee_id, employee_name, shift_type');
  
  if (eErr || sErr) {
    console.log('Error', eErr || sErr);
    return;
  }

  const empMap = new Map();
  employees.forEach(e => empMap.set(e.id, e.shift_type));

  let foundMismatch = false;
  schedules.forEach(s => {
    const empShift = empMap.get(s.employee_id);
    if (empShift && empShift !== s.shift_type) {
      console.log(`Mismatch for ${s.employee_name}: Employee table has ${empShift}, schedule has ${s.shift_type}`);
      foundMismatch = true;
    }
  });

  if (!foundMismatch) {
    console.log('No more mismatches found.');
  }
}

run();
