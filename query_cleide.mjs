import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jlbvxaqayacohbwcxmal.supabase.co',
  'sb_publishable_OnO2olIDEzYe7whUS_1rMg_DoMl2COx'
);

async function run() {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .ilike('name', '%Cleide%');

  console.log('Result:', data);
  if (error) console.log('Error:', error);
}

run();
