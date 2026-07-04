import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jlbvxaqayacohbwcxmal.supabase.co',
  'sb_publishable_OnO2olIDEzYe7whUS_1rMg_DoMl2COx'
);

async function run() {
  const { data: entries, error } = await supabase
    .from('schedule_entries')
    .select('*')
    .eq('employee_id', 'emp_jl1pn0d');

  if (error) {
    console.log('Error fetching:', error);
    return;
  }

  console.log(`Found ${entries.length} entries for Cleide.`);

  for (const entry of entries) {
    const newDays = { ...entry.days };
    
    // Regenerate P and F based on parity (Par Noturno = Even days are P)
    for (const [day, status] of Object.entries(newDays)) {
      if (status === 'P' || status === 'F') {
        newDays[day] = (parseInt(day) % 2 === 0) ? 'P' : 'F';
      }
    }

    const { error: updateError } = await supabase
      .from('schedule_entries')
      .update({
        shift_type: 'noturno_b',
        days: newDays,
        updated_date: new Date().toISOString()
      })
      .eq('id', entry.id);

    if (updateError) {
      console.log(`Error updating ${entry.id}:`, updateError);
    } else {
      console.log(`Updated entry ${entry.id} for month ${entry.month}/${entry.year}`);
    }
  }
}

run();
