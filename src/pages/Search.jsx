const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search as SearchIcon, User, Calendar, Clock, X, HeartPulse, ShieldCheck, Award, Users, Activity, FileText, UserX, Sun, History, Pencil, UserPlus, Lock } from 'lucide-react';
import { formatName } from '@/lib/utils';

const shiftLabels = { diurno_a: 'Diurno A', diurno_b: 'Diurno B', noturno_a: 'Noturno A', noturno_b: 'Noturno B' };
const statusLabels = { active: 'Ativo', inactive: 'Inativo', on_leave: 'Afastado' };
const statusColors = { active: 'bg-success/20 text-success', inactive: 'bg-muted text-muted-foreground', on_leave: 'bg-warning/20 text-warning' };

const statusStyleMap = {
  P: { bg: 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200/50', label: 'Plantão' },
  F: { bg: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200', label: 'Folga Regulamentar' },
  FE: { bg: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/50', label: 'Folga Enfermagem' },
  FA: { bg: 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/50', label: 'Folga Abonada' },
  AU: { bg: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200/50', label: 'Ausência' },
  AT: { bg: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/50', label: 'Atestado Médico' },
  LM: { bg: 'bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border-pink-200/50', label: 'Licença Maternidade' },
  V: { bg: 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200/50', label: 'Férias' },
  TP: { bg: 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/50', label: 'Troca de Plantão' },
  FI: { bg: 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/50', label: 'Falta Injustificada' },
};

function formatUpdateDate(dateString) {
  if (!dateString) return 'Agora';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Agora';
  const now = new Date();
  
  const isSameDay = date.getDate() === now.getDate() &&
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear();
                    
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  if (isSameDay) {
    return `Hoje às ${timeStr}`;
  }
  
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.getDate() === yesterday.getDate() &&
                      date.getMonth() === yesterday.getMonth() &&
                      date.getFullYear() === yesterday.getFullYear();
                      
  if (isYesterday) {
    return `Ontem às ${timeStr}`;
  }
  
  return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${timeStr}`;
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => db.entities.Employee.list(),
  });

  useEffect(() => {
    const qParam = searchParams.get('q');
    if (qParam && employees.length > 0) {
      const emp = employees.find(
        e => e.name?.trim().toLowerCase() === qParam.trim().toLowerCase()
      );
      if (emp) {
        setSelectedEmployee(emp);
        // Clear search parameters so it does not pop up repeatedly on reload or route swaps
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, employees, setSearchParams]);

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => db.entities.ScheduleEntry.list('-created_date', 200),
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => db.entities.AuditLog.list('-created_date', 8),
  });

  const filtered = employees.filter(e => {
    const nameLower = e.name?.toLowerCase() || '';
    const roleLower = e.role?.toLowerCase() || '';
    const corenStr = e.coren?.toString() || '';
    const queryLower = query.toLowerCase();
    
    // Check if any word starts with query or if coren/role matches
    const words = nameLower.split(/\s+/);
    const matchesQuery = queryLower ? (
      words.some(w => w.startsWith(queryLower)) ||
      corenStr.includes(queryLower) ||
      roleLower.includes(queryLower)
    ) : true;

    if (!matchesQuery) return false;

    // Apply active KPI card filter
    if (activeFilter === 'has_shifts') {
      const schedule = schedules.find(s => s.employee_name?.trim() === e.name?.trim());
      return schedule && Object.values(schedule.days || {}).includes('P');
    }
    if (activeFilter === 'diurno') {
      return e.shift_type?.includes('diurno');
    }
    if (activeFilter === 'has_atestado') {
      const schedule = schedules.find(s => s.employee_name?.trim() === e.name?.trim());
      return schedule && Object.values(schedule.days || {}).includes('AT');
    }
    if (activeFilter === 'on_leave') {
      return e.status === 'on_leave';
    }
    if (activeFilter === 'has_vacation') {
      const schedule = schedules.find(s => s.employee_name?.trim() === e.name?.trim());
      return schedule && Object.values(schedule.days || {}).includes('V');
    }

    return true;
  });

  const totalEmployees = employees.length;
  const enfCount = employees.filter(e => e.role === 'ENFERMEIRO').length;
  const tecCount = employees.filter(e => e.role === 'TEC.ENF').length;
  
  const totalPlantões = schedules.reduce((sum, s) => {
    return sum + Object.values(s.days || {}).filter(v => v === 'P').length;
  }, 0);
  
  const diurnoCount = employees.filter(e => e.shift_type?.includes('diurno')).length;
  const noturnoCount = employees.filter(e => e.shift_type?.includes('noturno')).length;

  const totalAtestados = schedules.reduce((sum, s) => {
    return sum + Object.values(s.days || {}).filter(v => v === 'AT').length;
  }, 0);

  const leaveCount = employees.filter(e => e.status === 'on_leave').length;

  const totalFérias = schedules.reduce((sum, s) => {
    return sum + Object.values(s.days || {}).filter(v => v === 'V').length;
  }, 0);

  // Generate A4 Calendar for June 2026 (Starts on Monday, 1 offset)
  const getCalendarDays = () => {
    const days = [];
    const startOffset = 1;
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    for (let d = 1; d <= 30; d++) {
      days.push(d);
    }
    return days;
  };

  const calendarDays = getCalendarDays();
  const weekHeaders = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Pesquisar</h1>
        <p className="text-sm text-muted-foreground font-medium">Busque por nome, COREN ou função (Clique no card para ver o espelho da escala!)</p>
      </motion.div>

      {/* Cards de Métricas Rápidas em Linha Única com Filtros Interativos */}
      <motion.div 
        initial={{ opacity: 0, y: -5 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.1 }}
        className="flex w-full overflow-x-auto gap-3 pb-3 pt-1 scrollbar-none lg:grid lg:grid-cols-6 lg:overflow-visible"
      >
        {/* Card 1: Total de Colaboradores (Remove filtros) */}
        <Card 
          onClick={() => setActiveFilter(null)}
          className={`flex-shrink-0 w-[220px] lg:w-auto bg-gradient-to-br from-primary/5 via-transparent to-transparent shadow-sm relative overflow-hidden cursor-pointer select-none transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 border ${
            activeFilter === null 
              ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.03]' 
              : 'border-border/60 hover:border-primary/30'
          }`}
        >
          <CardContent className="p-3 flex items-center justify-between h-full">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">Colaboradores</span>
              <h2 className="text-xl font-black text-foreground">{totalEmployees} <span className="text-[10px] font-normal text-muted-foreground">ativos</span></h2>
              <p className="text-[9px] text-muted-foreground font-semibold truncate">{enfCount} Enf • {tecCount} Téc</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <Users className="h-4 w-4" />
            </div>
          </CardContent>
          {activeFilter === null && (
            <div className="absolute top-0 right-0 h-1.5 w-1.5 rounded-bl bg-primary" />
          )}
        </Card>

        {/* Card 2: Plantões Agendados */}
        <Card 
          onClick={() => setActiveFilter(activeFilter === 'has_shifts' ? null : 'has_shifts')}
          className={`flex-shrink-0 w-[220px] lg:w-auto bg-gradient-to-br from-success/5 via-transparent to-transparent shadow-sm relative overflow-hidden cursor-pointer select-none transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 border ${
            activeFilter === 'has_shifts' 
              ? 'border-success ring-2 ring-success/20 bg-success/[0.03]' 
              : 'border-border/60 hover:border-success/30'
          }`}
        >
          <CardContent className="p-3 flex items-center justify-between h-full">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">Plantões</span>
              <h2 className="text-xl font-black text-success">{totalPlantões} <span className="text-[10px] font-normal text-muted-foreground">no mês</span></h2>
              <p className="text-[9px] text-muted-foreground font-semibold truncate">Média { (totalPlantões / (totalEmployees || 1)).toFixed(1) } / colab</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center text-success flex-shrink-0">
              <Activity className="h-4 w-4" />
            </div>
          </CardContent>
          {activeFilter === 'has_shifts' && (
            <div className="absolute top-0 right-0 h-1.5 w-1.5 rounded-bl bg-success" />
          )}
        </Card>

        {/* Card 3: Distribuição de Turno (Diurnos) */}
        <Card 
          onClick={() => setActiveFilter(activeFilter === 'diurno' ? null : 'diurno')}
          className={`flex-shrink-0 w-[220px] lg:w-auto bg-gradient-to-br from-warning/5 via-transparent to-transparent shadow-sm relative overflow-hidden cursor-pointer select-none transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 border ${
            activeFilter === 'diurno' 
              ? 'border-warning ring-2 ring-warning/20 bg-warning/[0.03]' 
              : 'border-border/60 hover:border-warning/30'
          }`}
        >
          <CardContent className="p-3 flex items-center justify-between h-full">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">Turno Diurno</span>
              <h2 className="text-xl font-black text-foreground">D: {diurnoCount} <span className="text-[10px] font-normal text-muted-foreground">/ N: {noturnoCount}</span></h2>
              <p className="text-[9px] text-muted-foreground font-semibold truncate">Filtrar equipe diurna</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-warning/10 flex items-center justify-center text-warning flex-shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </CardContent>
          {activeFilter === 'diurno' && (
            <div className="absolute top-0 right-0 h-1.5 w-1.5 rounded-bl bg-warning" />
          )}
        </Card>

        {/* Card 4: Atestados Médicos */}
        <Card 
          onClick={() => setActiveFilter(activeFilter === 'has_atestado' ? null : 'has_atestado')}
          className={`flex-shrink-0 w-[220px] lg:w-auto bg-gradient-to-br from-red-500/5 via-transparent to-transparent shadow-sm relative overflow-hidden cursor-pointer select-none transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 border ${
            activeFilter === 'has_atestado' 
              ? 'border-red-500 ring-2 ring-red-500/20 bg-red-500/[0.03]' 
              : 'border-border/60 hover:border-red-500/30'
          }`}
        >
          <CardContent className="p-3 flex items-center justify-between h-full">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">Atestados</span>
              <h2 className="text-xl font-black text-red-500">{totalAtestados} <span className="text-[10px] font-normal text-muted-foreground">dias</span></h2>
              <p className="text-[9px] text-muted-foreground font-semibold truncate">Faltas médicas do mês</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 flex-shrink-0">
              <FileText className="h-4 w-4" />
            </div>
          </CardContent>
          {activeFilter === 'has_atestado' && (
            <div className="absolute top-0 right-0 h-1.5 w-1.5 rounded-bl bg-red-500" />
          )}
        </Card>

        {/* Card 5: Colaboradores Afastados */}
        <Card 
          onClick={() => setActiveFilter(activeFilter === 'on_leave' ? null : 'on_leave')}
          className={`flex-shrink-0 w-[220px] lg:w-auto bg-gradient-to-br from-purple-500/5 via-transparent to-transparent shadow-sm relative overflow-hidden cursor-pointer select-none transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 border ${
            activeFilter === 'on_leave' 
              ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-500/[0.03]' 
              : 'border-border/60 hover:border-purple-500/30'
          }`}
        >
          <CardContent className="p-3 flex items-center justify-between h-full">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">Afastamentos</span>
              <h2 className="text-xl font-black text-purple-500">{leaveCount} <span className="text-[10px] font-normal text-muted-foreground">colabs</span></h2>
              <p className="text-[9px] text-muted-foreground font-semibold truncate">Afastados ou licenças</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 flex-shrink-0">
              <UserX className="h-4 w-4" />
            </div>
          </CardContent>
          {activeFilter === 'on_leave' && (
            <div className="absolute top-0 right-0 h-1.5 w-1.5 rounded-bl bg-purple-500" />
          )}
        </Card>

        {/* Card 6: Férias Ativas */}
        <Card 
          onClick={() => setActiveFilter(activeFilter === 'has_vacation' ? null : 'has_vacation')}
          className={`flex-shrink-0 w-[220px] lg:w-auto bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent shadow-sm relative overflow-hidden cursor-pointer select-none transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 border ${
            activeFilter === 'has_vacation' 
              ? 'border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-500/[0.03]' 
              : 'border-border/60 hover:border-cyan-500/30'
          }`}
        >
          <CardContent className="p-3 flex items-center justify-between h-full">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">Férias</span>
              <h2 className="text-xl font-black text-cyan-500">{totalFérias} <span className="text-[10px] font-normal text-muted-foreground">dias</span></h2>
              <p className="text-[9px] text-muted-foreground font-semibold truncate">Em gozo de férias no mês</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500 flex-shrink-0">
              <Sun className="h-4 w-4" />
            </div>
          </CardContent>
          {activeFilter === 'has_vacation' && (
            <div className="absolute top-0 right-0 h-1.5 w-1.5 rounded-bl bg-cyan-500" />
          )}
        </Card>
      </motion.div>
 
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="lg:col-span-3 space-y-6">
          <div className="relative max-w-lg z-50">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Digite para pesquisar..."
          value={query}
          onChange={e => setQuery(formatName(e.target.value))}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)} // Allow onMouseDown click to register first!
          className="pl-10"
        />

        {/* Auto preenchimento / Autocomplete floating list */}
        <AnimatePresence>
          {isFocused && query && (
            (() => {
              const suggestions = employees.filter(e => {
                const nameLower = e.name?.toLowerCase() || '';
                const queryLower = query.toLowerCase();
                const words = nameLower.split(/\s+/);
                const matchesWordStart = words.some(w => w.startsWith(queryLower));
                return matchesWordStart && nameLower !== queryLower;
              }).slice(0, 5);

              if (suggestions.length === 0) return null;

              return (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl overflow-hidden"
                >
                  {suggestions.map(s => (
                    <button
                      key={s.id}
                      onMouseDown={(e) => {
                        // Prevent loss of focus before click handles!
                        e.preventDefault();
                        setQuery(s.name);
                        setSelectedEmployee(s); // Instantly open their monthly scale!
                        setIsFocused(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs hover:bg-muted/80 transition-colors border-b border-border/40 last:border-0"
                    >
                      <User className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <span className="font-semibold text-foreground truncate">{s.name}</span>
                      <Badge variant="outline" className="ml-auto text-[8px] py-0 font-bold">{s.role}</Badge>
                    </button>
                  ))}
                </motion.div>
              );
            })()
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((emp, i) => {
            const schedule = schedules.find(s => s.employee_name?.trim() === emp.name?.trim());
            const totalP = schedule ? Object.values(schedule.days || {}).filter(v => v === 'P').length : 0;
            const totalF = schedule ? Object.values(schedule.days || {}).filter(v => v === 'F').length : 0;

            return (
              <motion.div
                key={emp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: i * 0.015 }}
              >
                <Card 
                  onClick={() => setSelectedEmployee(emp)}
                  className="hover:shadow-lg hover:-translate-y-1 hover:border-primary/40 cursor-pointer transition-all duration-300 group"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-primary/20">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{emp.name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px] font-bold">{emp.role}</Badge>
                          <span className="text-[10px] text-muted-foreground font-mono">COREN: {emp.coren || '-'}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1 font-medium">
                            <Calendar className="h-3 w-3 text-primary/70" /> {shiftLabels[emp.shift_type] || '-'}
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="h-3 w-3 text-primary/70" /> {emp.work_hours || '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/40 justify-between">
                          <Badge className={`text-[10px] font-semibold ${statusColors[emp.status || 'active']}`}>
                            {statusLabels[emp.status || 'active']}
                          </Badge>
                          <span className="text-[10px] font-bold text-muted-foreground">
                            P: <span className="text-success">{totalP}</span> · F: <span className="text-muted-foreground/80">{totalF}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && query && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhum colaborador encontrado para "{query}"
        </div>
      )}
        </div>

        {/* Sidebar Column: Últimas Alterações */}
        <div className="lg:col-span-1 h-full">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card rounded-xl border border-border p-5 flex flex-col h-full lg:sticky lg:top-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <History className="h-4 w-4" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-foreground">Últimas Alterações</h3>
                <p className="text-[10px] text-muted-foreground">Histórico da escala e equipe</p>
              </div>
            </div>

            <div className="space-y-3 flex-1 overflow-auto max-h-[580px] pr-1 scrollbar-none">
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  Nenhuma alteração registrada.
                </div>
              ) : (
                auditLogs.map((log, logIndex) => {
                  const getLogIcon = (type) => {
                    switch (type) {
                      case 'schedule':
                        return <Calendar className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />;
                      case 'employee_create':
                        return <UserPlus className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />;
                      case 'employee_update':
                        return <Pencil className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />;
                      case 'certificate':
                        return <FileText className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />;
                      default:
                        return <Lock className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />;
                    }
                  };

                  const getIconBg = (type) => {
                    switch (type) {
                      case 'schedule': return 'bg-green-100 dark:bg-green-950/40';
                      case 'employee_create': return 'bg-blue-100 dark:bg-blue-950/40';
                      case 'employee_update': return 'bg-amber-100 dark:bg-amber-950/40';
                      case 'certificate': return 'bg-red-100 dark:bg-red-950/40';
                      default: return 'bg-purple-100 dark:bg-purple-950/40';
                    }
                  };

                  const getHoverBorder = (type) => {
                    switch (type) {
                      case 'schedule': return 'hover:border-green-400/60 hover:shadow-[0_0_12px_-3px_rgba(34,197,94,0.3)]';
                      case 'employee_create': return 'hover:border-blue-400/60 hover:shadow-[0_0_12px_-3px_rgba(59,130,246,0.3)]';
                      case 'employee_update': return 'hover:border-amber-400/60 hover:shadow-[0_0_12px_-3px_rgba(245,158,11,0.3)]';
                      case 'certificate': return 'hover:border-red-400/60 hover:shadow-[0_0_12px_-3px_rgba(239,68,68,0.3)]';
                      default: return 'hover:border-purple-400/60 hover:shadow-[0_0_12px_-3px_rgba(168,85,247,0.3)]';
                    }
                  };

                  const isClickable = log.employee_name && log.employee_name !== 'Sistema' && log.employee_name !== 'Administrador';

                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: logIndex * 0.08, duration: 0.3 }}
                      whileHover={isClickable ? { scale: 1.02, y: -1 } : {}}
                      whileTap={isClickable ? { scale: 0.97 } : {}}
                      onClick={() => {
                        if (isClickable) {
                          const normalize = (s) => (s || '').trim().toLowerCase()
                            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                          const logName = normalize(log.employee_name);
                          // Strategy 1: exact match (case-insensitive, accent-insensitive)
                          let emp = employees.find(e => normalize(e.name) === logName);
                          // Strategy 2: partial match — log name starts with employee name or vice versa
                          if (!emp) {
                            emp = employees.find(e => {
                              const empName = normalize(e.name);
                              return empName.includes(logName) || logName.includes(empName);
                            });
                          }
                          // Strategy 3: first word(s) match
                          if (!emp) {
                            const logParts = logName.split(/\s+/);
                            emp = employees.find(e => {
                              const empParts = normalize(e.name).split(/\s+/);
                              return logParts.slice(0, 2).every(p => empParts.includes(p));
                            });
                          }
                          if (emp) setSelectedEmployee(emp);
                        }
                      }}
                      className={`flex gap-3 p-2.5 rounded-lg border bg-muted/20 transition-all duration-200 text-left group ${
                        isClickable
                          ? `cursor-pointer border-border/40 ${getHoverBorder(log.type)} hover:bg-muted/50`
                          : 'border-border/40'
                      }`}
                    >
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${getIconBg(log.type)}`}>
                        {getLogIcon(log.type)}
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-[11px] text-foreground font-medium leading-normal break-words">
                          {log.description}
                        </p>
                        <span className="text-[9px] text-muted-foreground font-semibold block">
                          {formatUpdateDate(log.created_date)}
                        </span>
                        {isClickable && (
                          <span className="text-[8px] text-primary/60 font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 pt-0.5">
                            Ver espelho da escala →
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Collaborator Profile Modal */}
      <AnimatePresence>
        {selectedEmployee && (() => {
          const schedule = schedules.find(s => s.employee_name?.trim() === selectedEmployee.name?.trim());
          const totalStats = schedule ? Object.values(schedule.days || {}).reduce((acc, curr) => {
            if (curr) acc[curr] = (acc[curr] || 0) + 1;
            return acc;
          }, {}) : {};

          return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedEmployee(null)}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
              />

              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-6 z-10 flex flex-col gap-4 overflow-hidden"
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="absolute top-4 right-4 h-7 w-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Profile Header */}
                <div className="flex items-center gap-3 border-b border-border/60 pb-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <HeartPulse className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-card-foreground leading-snug">{selectedEmployee.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] font-bold py-0">{selectedEmployee.role}</Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">COREN {selectedEmployee.coren || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-lg border border-border/50 text-xs">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold block">Turno</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-primary/70" /> {shiftLabels[selectedEmployee.shift_type] || '-'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold block">Horário</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-primary/70" /> {selectedEmployee.work_hours || '-'}
                    </span>
                  </div>
                  <div className="space-y-1 col-span-2 pt-2 border-t border-border/40">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold block">Setor / Classificação</span>
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Award className="h-3.5 w-3.5 text-primary/70" /> {selectedEmployee.sector || 'UPA Zilda Arns'}
                    </span>
                  </div>
                </div>

                {/* Calendar Title & Summary */}
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-card-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-success" />
                    Espelho da Escala — Junho 2026
                  </h3>
                  <p className="text-[10px] text-muted-foreground">Distribuição de plantões e folgas mensais no calendário</p>
                </div>

                {/* June 2026 Calendar Grid */}
                <div className="border border-border/60 rounded-lg p-2.5 bg-muted/20">
                  {/* D S T Q Q S S headers */}
                  <div className="grid grid-cols-7 text-center mb-1 text-[9px] font-bold text-muted-foreground">
                    {weekHeaders.map((h, idx) => (
                      <div key={idx} className={idx === 0 || idx === 6 ? 'text-red-500/70' : ''}>{h}</div>
                    ))}
                  </div>

                  {/* 30 Calendar Days */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {calendarDays.map((day, idx) => {
                      if (!day) return <div key={`empty-${idx}`} className="aspect-square" />;
                      const val = schedule?.days?.[String(day)] || '';
                      const style = statusStyleMap[val];
                      const isWeekend = idx % 7 === 0 || idx % 7 === 6;

                      return (
                        <div 
                          key={day} 
                          className={`aspect-square rounded flex flex-col justify-between p-0.5 border text-center transition-all ${
                            style ? `${style.bg} ${style.border}` : isWeekend ? 'bg-red-50/50 border-red-100/50 text-muted-foreground/60' : 'bg-background border-border/40 text-muted-foreground/60'
                          }`}
                          title={`Dia ${day}: ${style?.label || 'Sem Plantão'}`}
                        >
                          <span className="text-[8px] font-bold text-left block leading-none">{day}</span>
                          <span className={`text-[10px] font-extrabold block text-center leading-none mb-0.5 ${style ? style.text : 'text-muted-foreground/30 font-normal'}`}>
                            {val || '·'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stats Summary List */}
                <div className="flex flex-wrap gap-1.5 text-[9.5px]">
                  {Object.entries(totalStats).map(([status, count]) => {
                    const style = statusStyleMap[status];
                    if (!style) return null;
                    return (
                      <div key={status} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border ${style.bg} ${style.border}`}>
                        <span className="font-extrabold">{status}</span>
                        <span className="text-muted-foreground/70">•</span>
                        <span className="font-bold text-foreground">{count}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-2 pt-2 border-t border-border/40 mt-1">
                  <button
                    onClick={() => setSelectedEmployee(null)}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors shadow"
                  >
                    Fechar Detalhes
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}