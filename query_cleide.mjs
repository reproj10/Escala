import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jlbvxaqayacohbwcxmal.supabase.co',
  'sb_publishable_OnO2olIDEzYe7whUS_1rMg_DoMl2COx'
);

async function run() {
  const scheds = await supabase.from('schedule_entries')
    .select('employee_name, days')
    .eq('month', 7)
    .eq('year', 2026)
    .eq('shift_type', 'noturno_a');
  console.log('Schedules 7/2026 Noturno A:', JSON.stringify(scheds.data, null, 2));
}

run();
