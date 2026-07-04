import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jlbvxaqayacohbwcxmal.supabase.co',
  'sb_publishable_OnO2olIDEzYe7whUS_1rMg_DoMl2COx'
);

async function run() {
  const { data: schedules, error: sErr } = await supabase
    .from('schedule_entries')
    .select('*')
    .eq('month', 6)
    .eq('year', 2026);
  
  if (sErr) {
    console.log('Error', sErr);
    return;
  }

  let countMissing29 = 0;
  let countMissing30 = 0;

  schedules.forEach(s => {
    if (!s.days || !s.days['29']) countMissing29++;
    if (!s.days || !s.days['30']) countMissing30++;
  });

  console.log(`Total schedules for June: ${schedules.length}`);
  console.log(`Missing day 29: ${countMissing29}`);
  console.log(`Missing day 30: ${countMissing30}`);
}

run();
