import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jlbvxaqayacohbwcxmal.supabase.co',
  'sb_publishable_OnO2olIDEzYe7whUS_1rMg_DoMl2COx'
);

async function run() {
  // We want 'F' on odd and 'P' on even for June (30 days)
  const newDays = {};
  for (let i = 1; i <= 30; i++) {
    newDays[i] = (i % 2 === 0) ? 'P' : 'F';
  }

  const { data, error } = await supabase
    .from('schedule_entries')
    .update({
      shift_type: 'noturno_b',
      days: newDays,
      updated_date: new Date().toISOString()
    })
    .eq('employee_id', 'emp_jl1pn0d')
    .eq('month', 6)
    .eq('year', 2026)
    .select('*');

  console.log('Update result:', data);
  if (error) console.log('Error:', error);
}

run();
