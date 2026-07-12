import { db } from './src/api/dbClient.js';

async function cleanupDatabase() {
  console.log('=== LIMPEZA DO BANCO DE DADOS ===\n');

  // =============================================
  // 1. REMOVER DUPLICADOS DE JUNHO 2026
  // =============================================
  console.log('--- ETAPA 1: Removendo registros duplicados de Junho 2026 ---');
  
  const allJune = await db.entities.ScheduleEntry.filter({ month: 6, year: 2026 });
  console.log(`Total registros Junho ANTES: ${allJune.length}`);

  const byEmployee = {};
  allJune.forEach(s => {
    const empId = s.employee_id;
    if (!byEmployee[empId]) byEmployee[empId] = [];
    byEmployee[empId].push(s);
  });

  let removedCount = 0;
  for (const [empId, entries] of Object.entries(byEmployee)) {
    if (entries.length <= 1) continue;
    
    const toKeep = entries.find(e => e.id.includes('-2026-6')) || entries[entries.length - 1];
    const toRemove = entries.filter(e => e.id !== toKeep.id);
    
    for (const entry of toRemove) {
      try {
        await db.entities.ScheduleEntry.delete(entry.id);
        removedCount++;
        console.log(`  DEL: ${entry.id} (${entry.employee_name?.trim()}) — mantido: ${toKeep.id}`);
      } catch (err) {
        console.log(`  ERR ao remover ${entry.id}: ${err.message}`);
      }
    }
  }
  console.log(`\nTotal registros duplicados removidos: ${removedCount}`);

  // =============================================
  // 2. REMOVER "JOSE DO ALHO" (TESTE)
  // =============================================
  console.log('\n--- ETAPA 2: Removendo registros de teste "Jose do Alho" ---');
  
  const allSchedules = await db.entities.ScheduleEntry.list();
  const joseSchedules = allSchedules.filter(s => s.employee_name?.trim() === 'Jose do Alho');
  console.log(`Encontrados ${joseSchedules.length} registros de escala para Jose do Alho`);
  
  for (const s of joseSchedules) {
    try {
      await db.entities.ScheduleEntry.delete(s.id);
      console.log(`  DEL ScheduleEntry: ${s.id} (shift: ${s.shift_type}, month: ${s.month})`);
    } catch (err) {
      console.log(`  ERR: ${err.message}`);
    }
  }

  const allEmployees = await db.entities.Employee.list();
  const joseEmployees = allEmployees.filter(e => e.name?.trim() === 'Jose do Alho');
  console.log(`Encontrados ${joseEmployees.length} registros de Employee para Jose do Alho`);
  
  for (const e of joseEmployees) {
    try {
      await db.entities.Employee.delete(e.id);
      console.log(`  DEL Employee: ${e.id} (shift: ${e.shift_type})`);
    } catch (err) {
      console.log(`  ERR: ${err.message}`);
    }
  }

  // =============================================
  // 3. RESTAURAR THAINA PARA NOTURNO_B
  // =============================================
  console.log('\n--- ETAPA 3: Restaurando Thaina para noturno_b ---');

  const juneAfterCleanup = await db.entities.ScheduleEntry.filter({ month: 6, year: 2026 });
  const noturnoBTemplate = juneAfterCleanup.find(s => 
    s.shift_type === 'noturno_b' && 
    s.employee_id !== 'emp-noturno_b-78' &&
    s.days && Object.keys(s.days).length > 0
  );
  
  let noturnoBDays = {};
  if (noturnoBTemplate) {
    for (const [k, v] of Object.entries(noturnoBTemplate.days)) {
      noturnoBDays[k] = (v === 'P') ? 'P' : 'F';
    }
    console.log(`Padrao noturno_b copiado de: ${noturnoBTemplate.employee_name?.trim()}`);
  }
  
  const thainaJune = juneAfterCleanup.filter(s => s.employee_id === 'emp-noturno_b-78');
  for (const t of thainaJune) {
    const updateData = { shift_type: 'noturno_b' };
    if (Object.keys(noturnoBDays).length > 0) {
      updateData.days = noturnoBDays;
    }
    await db.entities.ScheduleEntry.update(t.id, updateData);
    console.log(`  OK ScheduleEntry ${t.id} -> noturno_b`);
  }

  const julyAll = await db.entities.ScheduleEntry.filter({ month: 7, year: 2026 });
  const thainaJuly = julyAll.filter(s => s.employee_id === 'emp-noturno_b-78');
  
  const julTemplate = julyAll.find(s => 
    s.shift_type === 'noturno_b' && 
    s.employee_id !== 'emp-noturno_b-78' &&
    s.days && Object.keys(s.days).length > 0
  );
  let julDays = {};
  if (julTemplate) {
    for (const [k, v] of Object.entries(julTemplate.days)) {
      julDays[k] = (v === 'P') ? 'P' : 'F';
    }
  }
  
  for (const t of thainaJuly) {
    const updateData = { shift_type: 'noturno_b' };
    if (Object.keys(julDays).length > 0) {
      updateData.days = julDays;
    }
    await db.entities.ScheduleEntry.update(t.id, updateData);
    console.log(`  OK ScheduleEntry Jul ${t.id} -> noturno_b`);
  }

  await db.entities.Employee.update('emp-noturno_b-78', { shift_type: 'noturno_b' });
  console.log(`  OK Employee emp-noturno_b-78 -> noturno_b`);

  // =============================================
  // VERIFICACAO FINAL
  // =============================================
  console.log('\n--- VERIFICACAO FINAL ---');
  
  const finalJune = await db.entities.ScheduleEntry.filter({ month: 6, year: 2026 });
  console.log(`Total registros Junho DEPOIS: ${finalJune.length}`);
  
  const finalByEmp = {};
  finalJune.forEach(s => {
    const empId = s.employee_id;
    if (!finalByEmp[empId]) finalByEmp[empId] = [];
    finalByEmp[empId].push(s);
  });
  const finalDupes = Object.entries(finalByEmp).filter(([k, v]) => v.length > 1);
  console.log(`Duplicados restantes: ${finalDupes.length}`);
  
  if (finalDupes.length > 0) {
    finalDupes.forEach(([empId, entries]) => {
      console.log(`  AVISO ${empId}: ${entries.map(e => e.id).join(', ')}`);
    });
  }

  const thainaFinal = finalJune.filter(s => s.employee_id === 'emp-noturno_b-78');
  console.log(`\nThaina registros: ${thainaFinal.length}`);
  thainaFinal.forEach(t => {
    console.log(`  - ${t.id} | shift: ${t.shift_type} | dia2: ${t.days?.['2']} | dia4: ${t.days?.['4']}`);
  });

  const joseFinal = finalJune.filter(s => s.employee_name?.trim() === 'Jose do Alho');
  console.log(`Jose do Alho registros restantes: ${joseFinal.length}`);

  console.log('\n=== LIMPEZA CONCLUIDA ===');
}

cleanupDatabase().catch(err => console.error('ERRO FATAL:', err));
