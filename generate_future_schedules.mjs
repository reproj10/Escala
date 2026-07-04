import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jlbvxaqayacohbwcxmal.supabase.co',
  'sb_publishable_OnO2olIDEzYe7whUS_1rMg_DoMl2COx'
);

async function run() {
  console.log('Fetching employees...');
  const { data: employees, error: eErr } = await supabase.from('employees').select('id, name, shift_type');
  
  if (eErr) {
    console.log('Error fetching employees', eErr);
    return;
  }

  console.log('Fetching existing schedule entries (to avoid duplicates)...');
  const { data: existingSchedules, error: sErr } = await supabase.from('schedule_entries').select('id');
  
  if (sErr) {
    console.log('Error fetching schedules', sErr);
    return;
  }

  const existingIds = new Set(existingSchedules.map(s => s.id));
  const newEntries = [];

  const startYear = 2026;
  const endYear = 2032;

  console.log('Generating schedule entries...');

  for (let year = startYear; year <= endYear; year++) {
    const startMonth = (year === 2026) ? 6 : 1; // Start from June 2026
    for (let month = startMonth; month <= 12; month++) {
      const daysInMonth = new Date(year, month, 0).getDate();

      for (const emp of employees) {
        if (!emp.shift_type) continue;

        // Create a unique ID for the schedule entry
        // The previous system used `sch-${emp.id}-${year}-${month}` or similar
        const scheduleId = `sch-${emp.id}-${year}-${month}`;

        if (existingIds.has(scheduleId)) {
          continue; // Already exists, skip
        }

        const days = {};
        for (let d = 1; d <= daysInMonth; d++) {
          let isScheduled = false;

          if (emp.shift_type === 'rt_lideranca') {
            const date = new Date(year, month - 1, d);
            const dayOfWeek = date.getDay();
            isScheduled = dayOfWeek !== 0 && dayOfWeek !== 6;
          } else {
            const isShiftOdd = emp.shift_type === "impar_diurno" || emp.shift_type === "diurno_a" || emp.shift_type === "impar_noturno" || emp.shift_type === "noturno_a";
            const patternType = isShiftOdd ? 0 : 1;
            
            const baseDateUtc = Date.UTC(2026, 5, 1); // June 1, 2026
            const targetDateUtc = Date.UTC(year, month - 1, d);
            const daysSinceJune1 = Math.floor((targetDateUtc - baseDateUtc) / (1000 * 60 * 60 * 24));
            
            isScheduled = Math.abs(daysSinceJune1) % 2 === patternType;
          }
          
          days[d] = isScheduled ? 'P' : 'F';
        }

        newEntries.push({
          id: scheduleId,
          employee_id: emp.id,
          employee_name: emp.name,
          month: month,
          year: year,
          shift_type: emp.shift_type,
          days: days,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
          locked: false
        });
      }
    }
  }

  console.log(`Generated ${newEntries.length} new entries to be inserted.`);

  // Insert in batches of 500
  const batchSize = 500;
  for (let i = 0; i < newEntries.length; i += batchSize) {
    const batch = newEntries.slice(i, i + batchSize);
    console.log(`Inserting batch ${i / batchSize + 1} (${batch.length} records)...`);
    
    const { error: insertErr } = await supabase.from('schedule_entries').insert(batch);
    if (insertErr) {
      console.log('Error inserting batch:', insertErr);
    }
  }

  console.log('Finished generating and inserting future schedules up to Dec 2032!');
}

run();
