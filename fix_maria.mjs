import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jlbvxaqayacohbwcxmal.supabase.co',
  'sb_publishable_OnO2olIDEzYe7whUS_1rMg_DoMl2COx'
);

async function run() {
  const empId = 'emp-diurno_b-33';

  // Update employee table
  await supabase.from('employees').update({ shift_type: 'rt_lideranca' }).eq('id', empId);

  // Fetch all her schedules
  const { data: schedules } = await supabase.from('schedule_entries').select('*').eq('employee_id', empId);

  for (const s of schedules) {
    const newDays = { ...s.days };
    
    for (const [day, status] of Object.entries(newDays)) {
      if (status === 'P' || status === 'F') {
        const d = parseInt(day);
        const date = new Date(s.year, s.month - 1, d);
        const dayOfWeek = date.getDay();
        const isScheduled = dayOfWeek !== 0 && dayOfWeek !== 6;
        newDays[day] = isScheduled ? 'P' : 'F';
      }
    }

    await supabase
      .from('schedule_entries')
      .update({
        shift_type: 'rt_lideranca',
        days: newDays,
        updated_date: new Date().toISOString()
      })
      .eq('id', s.id);
      
    console.log(`Updated Maria Eduarda schedule for ${s.month}/${s.year}`);
  }

  console.log('Fixed Maria Eduarda to rt_lideranca');
}

run();
