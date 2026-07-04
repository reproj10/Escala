import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jlbvxaqayacohbwcxmal.supabase.co',
  'sb_publishable_OnO2olIDEzYe7whUS_1rMg_DoMl2COx'
);

async function run() {
  const { data: schedules } = await supabase
    .from('schedule_entries')
    .select('*')
    .eq('month', 6)
    .eq('year', 2026);

  const tally28 = {};
  const tally29 = {};
  const tally30 = {};

  schedules.forEach(s => {
    const val28 = s.days ? s.days['28'] : undefined;
    const val29 = s.days ? s.days['29'] : undefined;
    const val30 = s.days ? s.days['30'] : undefined;

    tally28[String(val28)] = (tally28[String(val28)] || 0) + 1;
    tally29[String(val29)] = (tally29[String(val29)] || 0) + 1;
    tally30[String(val30)] = (tally30[String(val30)] || 0) + 1;
  });

  console.log('Day 28:', tally28);
  console.log('Day 29:', tally29);
  console.log('Day 30:', tally30);
}

run();
