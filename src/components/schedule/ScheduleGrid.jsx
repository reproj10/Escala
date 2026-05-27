const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, AlertTriangle, Calendar } from 'lucide-react';
import { useScaleSettings } from '@/hooks/useScaleSettings';

// Hardcoded fallback options in case hook is not ready
const FALLBACK_STATUS_OPTIONS = [
  { value: 'P',   label: 'P — Plantão (12h)',                    bg: 'bg-green-100 dark:bg-green-900/40',   text: 'text-green-700 dark:text-green-300',   border: 'border-green-300 dark:border-green-700' },
  { value: 'F',   label: 'F — Folga Regulamentar (36h)',          bg: 'bg-gray-100 dark:bg-gray-700/40',     text: 'text-gray-600 dark:text-gray-300',     border: 'border-gray-300 dark:border-gray-600' },
  { value: 'FE',  label: 'FE — Folga Enfermagem',                 bg: 'bg-teal-100 dark:bg-teal-900/40',    text: 'text-teal-700 dark:text-teal-300',     border: 'border-teal-300 dark:border-teal-700' },
  { value: 'FA',  label: 'FA — Folga Abonada',                    bg: 'bg-sky-100 dark:bg-sky-900/40',      text: 'text-sky-700 dark:text-sky-300',       border: 'border-sky-300 dark:border-sky-700' },
  { value: 'AU',  label: 'AU — Ausência / Falta',                 bg: 'bg-red-100 dark:bg-red-900/40',      text: 'text-red-700 dark:text-red-300',       border: 'border-red-300 dark:border-red-700' },
  { value: 'AT',  label: 'AT — Atestado Médico',                  bg: 'bg-amber-100 dark:bg-amber-900/40',  text: 'text-amber-700 dark:text-amber-300',   border: 'border-amber-300 dark:border-amber-700' },
  { value: 'LM',  label: 'LM — Licença Maternidade/Médica',       bg: 'bg-purple-100 dark:bg-purple-900/40',text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-700' },
  { value: 'V',   label: 'V — Férias',                            bg: 'bg-yellow-100 dark:bg-yellow-900/40',text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-300 dark:border-yellow-700' },
  { value: 'LTS', label: 'LTS — Lic. Tratamento Saúde',           bg: 'bg-orange-100 dark:bg-orange-900/40',text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700' },
  { value: 'LS',  label: 'LS — Licença Saúde',                    bg: 'bg-orange-100 dark:bg-orange-900/40',text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700' },
  { value: 'FI',  label: 'FI — Falta Injustificada',              bg: 'bg-red-200 dark:bg-red-900/60',      text: 'text-red-800 dark:text-red-200',       border: 'border-red-400 dark:border-red-600' },
  { value: 'TP',  label: 'TP — Troca de Plantão',                 bg: 'bg-sky-200 dark:bg-sky-900/60',      text: 'text-sky-800 dark:text-sky-200',       border: 'border-sky-400 dark:border-sky-600' },
];

const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

// Role categories for validation
const TEC_ROLES = ['TEC.ENF', 'AUX.ENF'];
const ENF_ROLES = ['ENFERMEIRA', 'ENFERMEIRO'];

// Absence statuses (not present = folga/ausência for dimensioning)
const ABSENCE_STATUSES = ['F', 'FE', 'FA', 'AU', 'AT', 'LM', 'V', 'LTS', 'LS', 'FI'];

function getDayOfWeek(day, month, year) {
  return new Date(year, month - 1, day).getDay();
}

// Role badge color
const roleBadgeColor = (role) => {
  if (ENF_ROLES.includes(role)) return 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/40 dark:text-teal-300';
  if (TEC_ROLES.includes(role)) return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300';
  if (role === 'RES.TECNICA' || role === 'SUPERVISÃO') return 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300';
  return 'bg-gray-100 text-gray-600 border-gray-300';
};

function StatusCell({ value, isEditing, isWeekend, onEdit, onChange, onClose, extraLeavesUnlocked, statusMap, statusOptions }) {
  const style = statusMap[value];
  const cellBg = isWeekend ? 'bg-red-50 dark:bg-red-950/20' : '';

  if (isEditing) {
    return (
      <td className={`px-0 py-0 text-center ${cellBg} relative`}>
        {/* Overlay to close - rendered via portal-like fixed positioning */}
        <div className="fixed inset-0 z-40" onClick={onClose} />
        <div className="absolute z-50 top-6 left-0 w-56 bg-popover border border-border rounded-lg shadow-xl overflow-hidden">
          {statusOptions.map(opt => {
            const val = opt.value || opt.code;
            const isLocked = EXTRA_LEAVE_STATUSES.includes(val) && !extraLeavesUnlocked;
            return (
              <button
                key={val}
                onClick={(e) => { e.stopPropagation(); if (!isLocked) onChange(val); }}
                disabled={isLocked}
                title={isLocked ? 'Desbloqueie a escala para usar este tipo de folga' : ''}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] font-medium transition-all ${isLocked ? 'opacity-40 cursor-not-allowed bg-muted' : `hover:brightness-95 ${opt.bg || opt.bgColor}`} ${isLocked ? 'text-muted-foreground' : opt.text || opt.color}`}
              >
                <span className={`inline-flex items-center justify-center h-5 w-6 rounded text-[10px] font-bold border ${isLocked ? 'bg-muted text-muted-foreground border-border' : `${opt.bg || opt.bgColor} ${opt.text || opt.color} ${opt.border || ''}`}`}>
                  {val}
                </span>
                <span className="truncate">{(opt.label || '').replace(`${val} — `, '')}</span>
                {isLocked && <span className="ml-auto text-[9px]">🔒</span>}
              </button>
            );
          })}
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-full px-3 py-1.5 text-[10px] text-muted-foreground hover:bg-muted text-center border-t border-border"
          >
            Cancelar
          </button>
        </div>
        <span className={`inline-flex items-center justify-center h-5 w-5 rounded text-[9px] font-semibold border ring-2 ring-primary ${style ? `${style.bg || style.bgColor} ${style.text || style.color} ${style.border || ''}` : 'bg-transparent text-muted-foreground border-border'}`}>
          {value || '·'}
        </span>
      </td>
    );
  }

  return (
    <td className={`px-0 py-0 text-center ${cellBg}`}>
      <button
        onClick={onEdit}
        className={`inline-flex items-center justify-center h-5 w-5 rounded text-[9px] font-semibold border cursor-pointer hover:ring-1 hover:ring-primary transition-all ${style ? `${style.bg || style.bgColor} ${style.text || style.color} ${style.border || ''}` : 'bg-transparent text-muted-foreground border-border'}`}
      >
        {value || '·'}
      </button>
    </td>
  );
}

// Work hours per shift type
const SHIFT_HOURS = {
  todos: 'Todos os Turnos',
  diurno_a:  '07:00 às 19:00',
  diurno_b:  '07:00 às 19:00',
  noturno_a: '19:00 às 07:00',
  noturno_b: '19:00 às 07:00',
};

// Role sort order: RT/Supervisão first, then Enfermeiros, then Técnicos/Auxiliares
const ROLE_ORDER = {
  'RES.TECNICA': 0,
  'SUPERVISÃO': 1,
  'ENFERMEIRA': 2,
  'ENFERMEIRO': 2,
  'TEC.ENF': 3,
  'AUX.ENF': 4,
};

// Role order and validations remain
function getRoleOrder(role) {
  return ROLE_ORDER[role] ?? 5;
}

// Statuses that require admin unlock to be assigned
const EXTRA_LEAVE_STATUSES = ['FE', 'FA', 'V', 'LM', 'LTS', 'LS', 'TP'];

export default function ScheduleGrid({ entries, employees, daysInMonth, month, year, shiftType, onUpdate, extraLeavesUnlocked = false }) {
  const [editingCell, setEditingCell] = useState(null);
  const [alert, setAlert] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const { codes, limits } = useScaleSettings();
  
  const STATUS_OPTIONS = codes && codes.length > 0 ? codes : FALLBACK_STATUS_OPTIONS;
  const statusStyleMap = Object.fromEntries(STATUS_OPTIONS.map(o => [o.value || o.code, o]));
  
  const ABSENCE_STATUSES = STATUS_OPTIONS.filter(c => c.type === 'off-duty').map(c => c.value || c.code);

  const rawFiltered = shiftType === 'todos' ? entries : entries.filter(e => e.shift_type === shiftType);

  // Sort: RT/Supervisão → Enfermeiros → Técnicos/Auxiliares, then alphabetically within group
  const filteredEntries = [...rawFiltered].sort((a, b) => {
    const empA = employees.find(e => e.name?.trim() === a.employee_name?.trim());
    const empB = employees.find(e => e.name?.trim() === b.employee_name?.trim());
    const orderA = getRoleOrder(empA?.role || '');
    const orderB = getRoleOrder(empB?.role || '');
    if (orderA !== orderB) return orderA - orderB;
    return (a.employee_name || '').localeCompare(b.employee_name || '', 'pt-BR');
  });

  // Validate rule: max 3 TEC folgas and max 1 ENF folga per day
  // Uses current filteredEntries passed explicitly to avoid stale closure issues
  const validateChange = (currentEntries, entryId, day, newStatus) => {
    const entry = currentEntries.find(e => e.id === entryId);
    if (!entry) return { ok: true };

    const emp = employees.find(e => e.name?.trim() === entry.employee_name?.trim());
    const role = emp?.role || '';

    // Only validate absence-type statuses
    if (!ABSENCE_STATUSES.includes(newStatus)) return { ok: true };

    // Existing TEC/ENF per day limits
    if (TEC_ROLES.includes(role)) {
      let count = 0;
      currentEntries.forEach(e => {
        if (e.id === entryId) return;
        const eEmp = employees.find(em => em.name?.trim() === e.employee_name?.trim());
        if (TEC_ROLES.includes(eEmp?.role || '') && ABSENCE_STATUSES.includes(e.days?.[String(day)] || '')) {
          count++;
        }
      });
      if (count >= (limits?.technicians || 3)) {
        return { ok: false, msg: `⚠️ Dia ${day}: limite de ${limits?.technicians || 3} folgas de Téc./Aux. já atingido neste plantão.\nTente outro dia disponível.` };
      }
    }

    if (ENF_ROLES.includes(role)) {
      let count = 0;
      currentEntries.forEach(e => {
        if (e.id === entryId) return;
        const eEmp = employees.find(em => em.name?.trim() === e.employee_name?.trim());
        if (ENF_ROLES.includes(eEmp?.role || '') && ABSENCE_STATUSES.includes(e.days?.[String(day)] || '')) {
          count++;
        }
      });
      if (count >= (limits?.nurses || 1)) {
        return { ok: false, msg: `⚠️ Dia ${day}: já existe o limite de ${limits?.nurses || 1} folga(s) de Enfermeiro(a) neste plantão.\nEscolha outro dia para lançar a folga.` };
      }
    }

    // New validation: máximo 2 folgas extras (FE/FA) por colaborador no mês
    if (newStatus === 'FE' || newStatus === 'FA') {
      // Verifica se está substituindo um Plantão (P)
      const currentStatus = entry.days?.[String(day)] || '';
      if (currentStatus !== 'P') {
        return { ok: false, msg: `⚠️ Só é possível substituir um Plantão (P) por ${newStatus}.` };
      }
      // Conta folgas extras já registradas no mês para este colaborador
      const extraCount = currentEntries.reduce((acc, e) => {
        if (e.id === entryId) return acc;
        const eEmp = employees.find(em => em.name?.trim() === e.employee_name?.trim());
        if (eEmp?.role === role) {
          const status = e.days?.[String(day)] || '';
          if (status === 'FE' || status === 'FA') acc++;
        }
        return acc;
      }, 0);
      if (extraCount >= 2) {
        return { ok: false, msg: `⚠️ Limite de 2 folgas extras (FE/FA) por mês já atingido para ${entry.employee_name}.` };
      }
    }

    return { ok: true };
  };

  const handleStatusChange = async (entryId, day, newStatus) => {
    const entry = filteredEntries.find(e => e.id === entryId);
    if (!entry || entry.locked) return;

    const validation = validateChange(filteredEntries, entryId, day, newStatus);
    const emp = employees.find(e => e.name?.trim() === entry.employee_name?.trim());
    const role = emp?.role || '';
    
    const shiftLabels = {
      diurno_a: 'Diurno A',
      diurno_b: 'Diurno B',
      noturno_a: 'Noturno A',
      noturno_b: 'Noturno B'
    };
    const shiftLabel = shiftLabels[entry.shift_type] || entry.shift_type;

    if (!validation.ok) {
      setAlert({
        employeeName: entry.employee_name,
        role: role,
        shift: shiftLabel,
        msg: validation.msg
      });
      setEditingCell(null);
      return;
    }

    setConfirmDialog({
      entryId,
      day,
      newStatus,
      employeeName: entry.employee_name,
      role: role,
      shift: shiftLabel
    });
    setEditingCell(null);
  };

  const handleConfirmStatusChange = async () => {
    if (!confirmDialog) return;
    const { entryId, day, newStatus } = confirmDialog;
    const entry = filteredEntries.find(e => e.id === entryId);
    if (entry && !entry.locked) {
      const updatedDays = { ...entry.days, [String(day)]: newStatus };
      await db.entities.ScheduleEntry.update(entryId, { days: updatedDays });
      
      const statusLabel = STATUS_OPTIONS.find(o => o.value === newStatus)?.label || 'Folga';
      const cleanLabel = statusLabel.includes(' — ') ? statusLabel.split(' — ')[1] : statusLabel;
      
      await db.entities.AuditLog.create({
        type: 'schedule',
        description: `Alterou o dia ${day} de ${entry.employee_name} para ${cleanLabel}`,
        employee_name: entry.employee_name,
      });

      onUpdate();
    }
    setConfirmDialog(null);
  };

  // Dimensionamento por dia
  const getDimensionamento = (day) => {
    let present = 0, tecAbsences = 0, enfAbsences = 0;
    filteredEntries.forEach(e => {
      const emp = employees.find(em => em.name?.trim() === e.employee_name?.trim());
      const val = e.days?.[String(day)] || '';
      if (val === 'P') present++;
      if (ABSENCE_STATUSES.includes(val)) {
        if (TEC_ROLES.includes(emp?.role || '')) tecAbsences++;
        if (ENF_ROLES.includes(emp?.role || '')) enfAbsences++;
      }
    });
    return { present, tecAbsences, enfAbsences };
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-card rounded-xl border border-border overflow-hidden h-full flex flex-col"
    >

      <div className="overflow-auto flex-1">
        <table className="w-full text-xs">
          <thead>
            {/* Shift hours banner */}
            <tr className="bg-primary/10 border-b border-primary/20">
              <td colSpan={3} className="sticky left-0 bg-primary/10 z-10 px-3 py-1.5">
                <span className="text-[11px] font-bold text-primary uppercase tracking-wide">
                  {shiftType === 'todos' ? 'Todos os Turnos' : 
                   shiftType === 'diurno_a' ? 'Diurno A' : 
                   shiftType === 'diurno_b' ? 'Diurno B' : 
                   shiftType === 'noturno_a' ? 'Noturno A' : 'Noturno B'}
                  {' — '}
                  <span className="font-mono">{SHIFT_HOURS[shiftType]}</span>
                </span>
              </td>
              <td colSpan={daysInMonth + 1} className="px-3 py-1.5 text-[10px] text-primary/70 font-medium border-r border-border">
                Escala 12×36 · Junho 2026 · UPA Zilda Arns
              </td>
            </tr>
            <tr className="bg-muted/50">
             <th className="sticky left-0 bg-muted/50 z-10 px-2 py-1 text-left font-semibold min-w-[160px]">Colaborador</th>
             <th className="px-2 py-1 font-semibold min-w-[80px]">Categoria</th>
             <th className="px-2 py-1 font-semibold min-w-[60px]">COREN</th>
             {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
               const dow = getDayOfWeek(day, month, year);
               const isWeekend = dow === 0 || dow === 6;
               return (
                 <th key={day} className={`px-0.5 py-1 text-center min-w-[28px] ${isWeekend ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                   <div className="text-[8px] text-muted-foreground">{dayNames[dow]}</div>
                   <div className="font-bold text-[10px]">{day}</div>
                 </th>
               );
             })}
             <th className="px-1 py-1 font-semibold min-w-[45px] border-r border-border">Ass.</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry, idx) => {
              const emp = employees.find(e => e.name?.trim() === entry.employee_name?.trim());
              const role = emp?.role || '';
              const prevEntry = filteredEntries[idx - 1];
              const prevEmp = prevEntry ? employees.find(e => e.name?.trim() === prevEntry.employee_name?.trim()) : null;
              const prevOrder = prevEmp ? getRoleOrder(prevEmp.role || '') : -1;
              const currOrder = getRoleOrder(role);

              // Insert group header separator when role group changes
              const showGroupHeader = idx === 0 || currOrder !== prevOrder;
              const groupLabel =
                currOrder === 0 || currOrder === 1 ? '— Responsável Técnica / Supervisão —' :
                currOrder === 2 ? '— Enfermeiros(as) —' :
                '— Técnicos e Auxiliares de Enfermagem —';
              const groupColor =
                currOrder <= 1 ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300' :
                currOrder === 2 ? 'bg-teal-50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-300' :
                'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300';

              return (
                <React.Fragment key={entry.id}>
                  {showGroupHeader && (
                    <tr className={`${groupColor}`}>
                      <td className={`sticky left-0 ${groupColor} z-10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider border-r border-slate-200/50 dark:border-slate-700/50`}>
                        {groupLabel}
                      </td>
                      <td colSpan={3 + daysInMonth} className={`${groupColor} border-r border-border`}></td>
                    </tr>
                  )}
                <tr className="border-t border-border hover:bg-muted/20 transition-colors">
                  <td className="sticky left-0 bg-card z-10 px-2 py-0.5 font-medium whitespace-nowrap">
                    <div className="flex flex-col leading-tight">
                      <div className="flex items-center gap-1">
                        {entry.locked && <Lock className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />}
                        <span className="truncate max-w-[150px] text-[11px]" title={entry.employee_name}>{entry.employee_name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-1.5 py-0.5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-1 py-0 rounded text-[9px] font-semibold border ${roleBadgeColor(role)}`}>
                      {role || '—'}
                    </span>
                  </td>
                  <td className="px-1.5 py-0.5 text-[9px] text-muted-foreground font-mono">{emp?.coren || '—'}</td>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const val = entry.days?.[String(day)] || '';
                    const cellKey = `${entry.id}-${day}`;
                    const isEditing = editingCell === cellKey;
                    const dow = getDayOfWeek(day, month, year);
                    const isWeekend = dow === 0 || dow === 6;

                    if (entry.locked) {
                      const style = statusStyleMap[val];
                      return (
                        <td key={day} className={`px-0 py-0 text-center ${isWeekend ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                          <span className={`inline-flex items-center justify-center h-5 w-5 rounded text-[9px] font-semibold border ${style ? `${style.bg || style.bgColor} ${style.text || style.color} ${style.border || ''}` : 'bg-transparent text-muted-foreground border-border'}`}>
                            {val || '·'}
                          </span>
                        </td>
                      );
                    }

                    return (
                      <StatusCell
                        key={day}
                        value={val}
                        isEditing={isEditing}
                        isWeekend={isWeekend}
                        onEdit={() => setEditingCell(cellKey)}
                        onChange={(v) => handleStatusChange(entry.id, day, v)}
                        onClose={() => setEditingCell(null)}
                        extraLeavesUnlocked={extraLeavesUnlocked}
                        statusMap={statusStyleMap}
                        statusOptions={STATUS_OPTIONS}
                      />
                    );
                  })}
                  <td className="px-1 py-0.5 text-center text-muted-foreground/30 font-mono text-[9px] select-none whitespace-nowrap border-r border-border">
                    ____
                  </td>
                </tr>
                </React.Fragment>
              );
            })}

            {/* Dimensionamento rows */}
            <tr className="border-t-2 border-primary/30 bg-muted/50 font-bold">
              <td className="sticky left-0 bg-muted/50 z-10 px-3 py-1.5 text-xs" colSpan={3}>
                TOTAL PRESENTES (P)
              </td>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const { present } = getDimensionamento(day);
                return (
                  <td key={day} className="px-0.5 py-1 text-center">
                    <span className={`inline-flex items-center justify-center h-6 w-6 rounded text-[10px] font-bold ${
                      present === 0 ? 'text-muted-foreground' : present < 3 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                    }`}>
                      {present}
                    </span>
                  </td>
                );
              })}
              <td className="bg-muted/50 border-r border-border" />
            </tr>
            <tr className="border-t border-border bg-blue-50/50 dark:bg-blue-950/10">
              <td className="sticky left-0 bg-blue-50/50 dark:bg-blue-950/10 z-10 px-3 py-1 text-[10px] font-semibold text-blue-700 dark:text-blue-300" colSpan={3}>
                FOLGAS TÉC/AUX (máx {limits?.technicians || 3})
              </td>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const { tecAbsences } = getDimensionamento(day);
                return (
                  <td key={day} className="px-0.5 py-1 text-center">
                    <span className={`inline-flex items-center justify-center h-5 w-6 rounded text-[10px] font-bold ${
                      tecAbsences === 0 ? 'text-muted-foreground' :
                      tecAbsences > (limits?.technicians || 3) ? 'bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-200' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                    }`}>
                      {tecAbsences || '·'}
                    </span>
                  </td>
                );
              })}
              <td className="bg-blue-50/50 dark:bg-blue-950/10 border-r border-border" />
            </tr>
            <tr className="border-t border-border bg-teal-50/50 dark:bg-teal-950/10">
              <td className="sticky left-0 bg-teal-50/50 dark:bg-teal-950/10 z-10 px-3 py-1 text-[10px] font-semibold text-teal-700 dark:text-teal-300" colSpan={3}>
                FOLGAS ENF. (máx {limits?.nurses || 1})
              </td>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const { enfAbsences } = getDimensionamento(day);
                return (
                  <td key={day} className="px-0.5 py-1 text-center">
                    <span className={`inline-flex items-center justify-center h-5 w-6 rounded text-[10px] font-bold ${
                      enfAbsences === 0 ? 'text-muted-foreground' :
                      enfAbsences > (limits?.nurses || 1) ? 'bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-200' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {enfAbsences || '·'}
                    </span>
                  </td>
                );
              })}
              <td className="bg-teal-50/50 dark:bg-teal-950/10 border-r border-border" />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Campo de assinatura do RT exclusivo para impressão deativado em favor do rodapé unificado */}
      <div className="hidden">
        <div className="text-center flex flex-col items-center">
          <div className="w-60 border-b border-black/80 mb-1" />
          <span className="text-[10px] font-bold text-black uppercase tracking-wide">Renata Ap. Bueno Pereira</span>
          <span className="text-[8px] text-black/70 font-semibold">Responsável Técnica • COREN-SP 484643</span>
        </div>
      </div>

      <AnimatePresence>
        {alert && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop tint only, NO BLUR, so table is perfectly visible! */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAlert(null)}
              className="absolute inset-0 bg-black/45"
            />

            {/* Modal Card content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-sm bg-card border border-destructive/20 rounded-xl shadow-2xl p-6 z-10 text-center flex flex-col items-center gap-4"
            >
              <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-card-foreground">Limite de Folga Excedido</h3>
                {alert.employeeName && (
                  <div className="bg-muted px-3 py-1.5 rounded-lg text-left border border-border space-y-1.5">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-bold">Colaborador(a)</span>
                      <span className="text-[11px] font-bold text-foreground">{alert.employeeName}</span>
                    </div>
                    <div className="flex items-center gap-6 border-t border-border/60 pt-1.5 mt-1.5 text-[10px]">
                      <div>
                        <span className="text-[8px] uppercase tracking-wider text-muted-foreground block font-medium">Cargo</span>
                        <span className="font-semibold text-foreground">{alert.role || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase tracking-wider text-muted-foreground block font-medium">Plantão</span>
                        <span className="font-semibold text-foreground">{alert.shift || '—'}</span>
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line text-left pt-1">
                  {alert.msg}
                </p>
              </div>

              <div className="w-full pt-2">
                <button
                  onClick={() => setAlert(null)}
                  className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/95 font-semibold text-xs py-2 rounded-lg transition-all shadow-md focus:outline-none"
                >
                  Entendi e Vou Ajustar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {confirmDialog && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop tint only, NO BLUR, so table is perfectly visible! */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDialog(null)}
              className="absolute inset-0 bg-black/45"
            />

            {/* Modal Card content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-sm bg-card border border-primary/20 rounded-xl shadow-2xl p-6 z-10 text-center flex flex-col items-center gap-4"
            >
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              
              <div className="space-y-2 w-full">
                <h3 className="text-sm font-bold text-card-foreground">Confirmar Alteração de Escala</h3>
                
                <div className="bg-muted px-3 py-1.5 rounded-lg text-left border border-border space-y-1.5 w-full">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-bold">Colaborador(a)</span>
                    <span className="text-[11px] font-bold text-foreground">{confirmDialog.employeeName}</span>
                  </div>
                  <div className="flex items-center gap-6 border-t border-border/60 pt-1.5 mt-1.5 text-[10px]">
                    <div>
                      <span className="text-[8px] uppercase tracking-wider text-muted-foreground block font-medium">Cargo</span>
                      <span className="font-semibold text-foreground">{confirmDialog.role || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase tracking-wider text-muted-foreground block font-medium">Plantão</span>
                      <span className="font-semibold text-foreground">{confirmDialog.shift || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-left pt-1">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Deseja confirmar a alteração do dia <strong className="text-foreground">{confirmDialog.day}</strong> para{' '}
                    <strong className="text-foreground">
                      {STATUS_OPTIONS.find(o => o.value === confirmDialog.newStatus)?.label || confirmDialog.newStatus}
                    </strong>?
                  </p>
                </div>
              </div>

              <div className="w-full flex gap-3 pt-2">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 bg-muted hover:bg-muted/80 text-muted-foreground font-semibold text-xs py-2 rounded-lg transition-all border border-border focus:outline-none"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmStatusChange}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/95 font-semibold text-xs py-2 rounded-lg transition-all shadow-md focus:outline-none"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}