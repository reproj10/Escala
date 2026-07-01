// seedSupabase.js — Script para migrar dados iniciais para o Supabase
// Execute: node seedSupabase.js

import { createClient } from '@supabase/supabase-js';
import { importedEmployees, importedSchedules } from './src/api/importedData.js';

const SUPABASE_URL = 'https://jlbvxaqayacohbwcxmal.supabase.co';
const SUPABASE_KEY = 'sb_publishable_OnO2olIDEzYe7whUS_1rMg_DoMl2COx';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
  console.log('🌱 Iniciando migração dos dados para o Supabase...\n');

  // ────────────────────────────────────────────────
  // 1. Limpar tabelas existentes
  // ────────────────────────────────────────────────
  console.log('🧹 Limpando tabelas...');
  await supabase.from('schedule_entries').delete().neq('id', '');
  await supabase.from('employees').delete().neq('id', '');
  await supabase.from('app_config').delete().neq('id', '');
  await supabase.from('audit_log').delete().neq('id', '');
  console.log('✅ Tabelas limpas!\n');

  // ────────────────────────────────────────────────
  // 2. Inserir funcionários (deduplicados por nome)
  // ────────────────────────────────────────────────
  console.log(`👥 Inserindo ${importedEmployees.length} funcionários...`);
  const uniqueEmployees = [];
  const seenNames = new Set();
  for (const emp of importedEmployees) {
    if (!seenNames.has(emp.name)) {
      seenNames.add(emp.name);
      uniqueEmployees.push({
        id: emp.id,
        name: emp.name,
        role: emp.role || '',
        phone: emp.phone || '',
        coren: emp.coren || '',
        shift_type: emp.shift_type || '',
        work_hours: emp.work_hours || '',
        sector: emp.sector || 'Geral',
        cycle: emp.cycle || '',
        contract_type: emp.contract_type || '',
        status: emp.status || 'active',
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      });
    }
  }

  // Inserir em lotes de 50
  const EMP_BATCH = 50;
  for (let i = 0; i < uniqueEmployees.length; i += EMP_BATCH) {
    const batch = uniqueEmployees.slice(i, i + EMP_BATCH);
    const { error } = await supabase.from('employees').insert(batch);
    if (error) {
      console.error(`❌ Erro ao inserir funcionários (lote ${i}):`, error.message);
    } else {
      console.log(`  ✅ Lote ${i + 1}–${Math.min(i + EMP_BATCH, uniqueEmployees.length)} inserido`);
    }
  }
  console.log(`✅ ${uniqueEmployees.length} funcionários inseridos!\n`);

  // ────────────────────────────────────────────────
  // 3. Inserir escalas (deduplicadas por employee_name)
  // ────────────────────────────────────────────────
  console.log(`📅 Inserindo ${importedSchedules.length} entradas de escala...`);
  const uniqueSchedules = [];
  const seenScheduleNames = new Set();
  for (const entry of importedSchedules) {
    const key = `${entry.employee_name?.trim()}_${entry.month}_${entry.year}`;
    if (!seenScheduleNames.has(key)) {
      seenScheduleNames.add(key);
      uniqueSchedules.push({
        id: entry.id,
        employee_id: entry.employee_id || '',
        employee_name: entry.employee_name?.trim() || '',
        month: entry.month,
        year: entry.year,
        shift_type: entry.shift_type || '',
        days: entry.days || {},
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      });
    }
  }

  // Inserir em lotes de 50
  const SCH_BATCH = 50;
  for (let i = 0; i < uniqueSchedules.length; i += SCH_BATCH) {
    const batch = uniqueSchedules.slice(i, i + SCH_BATCH);
    const { error } = await supabase.from('schedule_entries').insert(batch);
    if (error) {
      console.error(`❌ Erro ao inserir escalas (lote ${i}):`, error.message);
    } else {
      console.log(`  ✅ Lote ${i + 1}–${Math.min(i + SCH_BATCH, uniqueSchedules.length)} inserido`);
    }
  }
  console.log(`✅ ${uniqueSchedules.length} escalas inseridas!\n`);

  // ────────────────────────────────────────────────
  // 4. Inserir configuração inicial
  // ────────────────────────────────────────────────
  console.log('⚙️  Inserindo configuração inicial...');
  const { error: configError } = await supabase.from('app_config').insert({
    id: 'cfg-1',
    key: 'extra_leaves_unlocked',
    value: false,
    updated_by: '',
  });
  if (configError) console.error('❌ Erro config:', configError.message);
  else console.log('✅ Configuração inserida!\n');

  // ────────────────────────────────────────────────
  // 5. Finalizado
  // ────────────────────────────────────────────────
  console.log('🎉 Migração concluída com sucesso!');
  console.log(`   👥 Funcionários: ${uniqueEmployees.length}`);
  console.log(`   📅 Escalas:      ${uniqueSchedules.length}`);
}

seed().catch(console.error);
