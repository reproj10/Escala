import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jlbvxaqayacohbwcxmal.supabase.co';
const SUPABASE_KEY = 'sb_publishable_OnO2olIDEzYe7whUS_1rMg_DoMl2COx';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('Fetching employees...');
  const { data, error } = await supabase.from('employees').select('*').ilike('name', '%Maria Eduarda%');
  
  if (error) {
    console.error('Error fetching:', error);
    return;
  }
  
  console.log('Found:', data);
  
  if (data && data.length > 0) {
    for (const emp of data) {
      if (emp.role === 'SUPERVISÃO') {
        console.log(`Updating ${emp.name} (${emp.id}) to LIDERANÇA...`);
        const { error: updateError } = await supabase
          .from('employees')
          .update({ role: 'LIDERANÇA' })
          .eq('id', emp.id);
          
        if (updateError) {
          console.error('Update error:', updateError);
        } else {
          console.log('Update successful!');
        }
      } else {
        console.log(`${emp.name} already has role ${emp.role}`);
      }
    }
  }
  
  // Let's also check if there are other employees with SUPERVISÃO
  const { data: others } = await supabase.from('employees').select('*').eq('role', 'SUPERVISÃO');
  if (others && others.length > 0) {
    for (const emp of others) {
      console.log(`Updating ${emp.name} (${emp.id}) to LIDERANÇA...`);
      await supabase.from('employees').update({ role: 'LIDERANÇA' }).eq('id', emp.id);
    }
  }
  
  // Also check if they had "Supervisor" or something
  const { data: others2 } = await supabase.from('employees').select('*').ilike('role', '%SUPERVIS%');
  if (others2 && others2.length > 0) {
    for (const emp of others2) {
      console.log(`Updating ${emp.name} (${emp.id}) to LIDERANÇA...`);
      await supabase.from('employees').update({ role: 'LIDERANÇA' }).eq('id', emp.id);
    }
  }
}

run();
