import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jlbvxaqayacohbwcxmal.supabase.co';
const SUPABASE_KEY = 'sb_publishable_OnO2olIDEzYe7whUS_1rMg_DoMl2COx';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function clean() {
  console.log('🧹 Iniciando limpeza do banco de dados para publicação...\n');

  try {
    console.log('Apagando tabela de escalas (schedule_entries)...');
    await supabase.from('schedule_entries').delete().neq('id', '');

    console.log('Apagando tabela de funcionários (employees)...');
    await supabase.from('employees').delete().neq('id', '');

    console.log('Apagando tabela de atestados (medical_certificates)...');
    await supabase.from('medical_certificates').delete().neq('id', '');

    console.log('Apagando tabela de logs (audit_log)...');
    await supabase.from('audit_log').delete().neq('id', '');

    console.log('\n✅ Limpeza concluída! Todas as tabelas agora estão vazias e prontas para uso real.');
  } catch (err) {
    console.error('Erro durante a limpeza:', err);
  }
}

clean();
