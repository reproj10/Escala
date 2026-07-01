import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jlbvxaqayacohbwcxmal.supabase.co',
  'sb_publishable_OnO2olIDEzYe7whUS_1rMg_DoMl2COx'
);

const { data, error } = await supabase.from('employees').select('count').limit(1);
console.log('Connection test:', error ? 'ERROR: ' + error.message : 'OK');
if (error) console.log('Code:', error.code);
