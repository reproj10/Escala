import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jlbvxaqayacohbwcxmal.supabase.co',
  'sb_publishable_OnO2olIDEzYe7whUS_1rMg_DoMl2COx'
);

async function run() {
  const { data: employees } = await supabase.from('employees').select('id, name, shift_type').ilike('name', '%Maria Eduarda%');
  console.log(employees);
}

run();
