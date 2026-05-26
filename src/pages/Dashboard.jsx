const db = globalThis.__B44_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, FileHeart, AlertTriangle, Activity, X, ArrowRight, CheckCircle2, Shield, CalendarRange, MapPin, History, Calendar, Pencil, UserPlus, FileText, Lock } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import ShiftChart from '@/components/dashboard/ShiftChart';
import DailyStaffChart from '@/components/dashboard/DailyStaffChart';
import StatusPieChart from '@/components/dashboard/StatusPieChart';

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

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState(null); // 'total' | 'presentes' | 'afastados' | 'atestados' | null

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => db.entities.Employee.list(),
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => db.entities.ScheduleEntry.list('-created_date', 200),
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => db.entities.MedicalCertificate.list(),
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => db.entities.AuditLog.list('-created_date', 5),
  });

  const activeEmployees = employees.filter(e => e.status === 'active');
  const onLeave = employees.filter(e => e.status === 'on_leave');

  // Count today's present
  const today = new Date().getDate();
  let todayPresent = 0;
  const todayPresentEmployees = [];

  schedules.forEach(s => {
    if (s.days?.[String(today)] === 'P') {
      todayPresent++;
      const emp = employees.find(e => e.name === s.employee_name);
      if (emp) {
        todayPresentEmployees.push({
          ...emp,
          scheduleId: s.id,
          shift_type: s.shift_type
        });
      }
    }
  });

  // Category breakdown for Total Colaboradores
  const roleBreakdown = {
    'RES.TECNICA': 0,
    'SUPERVISÃO': 0,
    'ENFERMEIRA': 0,
    'ENFERMEIRO': 0,
    'TEC.ENF': 0,
    'AUX.ENF': 0,
  };
  employees.forEach(e => {
    const role = e.role?.toUpperCase().trim();
    if (roleBreakdown[role] !== undefined) {
      roleBreakdown[role]++;
    }
  });

  const tecTotal = roleBreakdown['TEC.ENF'] + roleBreakdown['AUX.ENF'];
  const enfTotal = roleBreakdown['ENFERMEIRA'] + roleBreakdown['ENFERMEIRO'];
  const rtTotal = roleBreakdown['RES.TECNICA'] + roleBreakdown['SUPERVISÃO'];

  // Present today shift breakdown
  const shiftBreakdown = {
    diurno_a: 0,
    diurno_b: 0,
    noturno_a: 0,
    noturno_b: 0,
  };
  todayPresentEmployees.forEach(e => {
    if (shiftBreakdown[e.shift_type] !== undefined) {
      shiftBreakdown[e.shift_type]++;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          UPA Zilda Arns — Escala de Enfermagem · Junho 2026
        </p>
      </motion.div>

      {/* Stats Cards with click interaction */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Colaboradores"
          value={employees.length}
          subtitle={`${activeEmployees.length} ativos`}
          icon={Users}
          color="teal"
          delay={0}
          onClick={() => setActiveModal('total')}
        />
        <StatCard
          title="Presentes Hoje"
          value={todayPresent}
          subtitle={`Dia ${today}`}
          icon={Activity}
          color="green"
          delay={0.1}
          onClick={() => setActiveModal('presentes')}
        />
        <StatCard
          title="Afastados"
          value={onLeave.length}
          subtitle="Em licença"
          icon={AlertTriangle}
          color="yellow"
          delay={0.2}
          onClick={() => setActiveModal('afastados')}
        />
        <StatCard
          title="Atestados"
          value={certificates.length}
          subtitle="Este mês"
          icon={FileHeart}
          color="red"
          delay={0.3}
          onClick={() => setActiveModal('atestados')}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <DailyStaffChart scheduleEntries={schedules} daysInMonth={30} />
        </div>
        <ShiftChart scheduleEntries={schedules} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatusPieChart employees={employees} />

        {/* Unified "Últimas Alterações" Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="bg-card rounded-xl border border-border p-5 flex flex-col"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <History className="h-4 w-4" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-foreground">Últimas Alterações</h3>
              <p className="text-[10px] text-muted-foreground">Histórico recente da escala e equipe</p>
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-auto max-h-[250px] pr-1 scrollbar-none">
            {auditLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                Nenhuma alteração registrada.
              </div>
            ) : (
              auditLogs.map(log => {
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

                const isClickable = log.employee_name && log.employee_name !== 'Sistema' && log.employee_name !== 'Administrador';

                return (
                  <div
                    key={log.id}
                    onClick={() => {
                      if (isClickable) {
                        navigate(`/pesquisar?q=${encodeURIComponent(log.employee_name)}`);
                      }
                    }}
                    className={`flex gap-3 p-2.5 rounded-lg border border-border/40 bg-muted/20 transition-all text-left ${
                      isClickable ? 'hover:bg-muted/60 hover:border-primary/30 cursor-pointer' : ''
                    }`}
                  >
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${getIconBg(log.type)}`}>
                      {getLogIcon(log.type)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-[11px] text-foreground font-medium leading-normal break-words">
                        {log.description}
                      </p>
                      <span className="text-[9px] text-muted-foreground font-semibold block">
                        {formatUpdateDate(log.created_date)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="bg-card rounded-xl border border-border p-5"
        >
          <h3 className="text-sm font-semibold mb-4">Informações do Projeto</h3>
          <div className="space-y-3">
            <InfoRow label="Unidade" value="UPA Zilda Arns" />
            <InfoRow label="Endereço" value="Rua Poços de Calda nº 66 - Jd. Santo Eduardo" />
            <InfoRow label="Cidade" value="Embu das Artes - SP" />
            <InfoRow label="CNES" value="7868499" />
            <InfoRow label="Mês/Ano" value="Junho 2026" />
            <InfoRow label="Resp. Técnica" value="Renata Ap. Bueno Pereira - COREN 484843" />
            <InfoRow label="Ger. Enfermagem" value="Paula Daniela Maciel - COREN 540838" />
            <InfoRow label="Turnos" value="Diurno A/B, Noturno A/B" />
          </div>
        </motion.div>
      </div>

      {/* Modern High-Fidelity Modal Backdrop */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Glassmorphic Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />

            {/* Modal Content container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  {activeModal === 'total' && <Users className="h-5 w-5 text-primary" />}
                  {activeModal === 'presentes' && <Activity className="h-5 w-5 text-success" />}
                  {activeModal === 'afastados' && <AlertTriangle className="h-5 w-5 text-warning" />}
                  {activeModal === 'atestados' && <FileHeart className="h-5 w-5 text-destructive" />}
                  <h2 className="text-base font-bold text-card-foreground">
                    {activeModal === 'total' && 'Distribuição de Colaboradores'}
                    {activeModal === 'presentes' && `Presentes Hoje (Dia ${today})`}
                    {activeModal === 'afastados' && 'Colaboradores Afastados'}
                    {activeModal === 'atestados' && 'Atestados Médicos Cadastrados'}
                  </h2>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* 1. TOTAL COLABORADORES BREAKDOWN */}
                {activeModal === 'total' && (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">RT & Supervisão</span>
                        <p className="text-xl font-bold text-primary mt-1">{rtTotal}</p>
                      </div>
                      <div className="bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-800/40 rounded-lg p-3 text-center">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Enfermeiros(as)</span>
                        <p className="text-xl font-bold text-teal-600 dark:text-teal-400 mt-1">{enfTotal}</p>
                      </div>
                      <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/40 rounded-lg p-3 text-center">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Técnicos & Aux.</span>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{tecTotal}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Profissionais Cadastrados ({employees.length})</h3>
                      <div className="border border-border rounded-lg overflow-hidden divide-y divide-border max-h-[40vh] overflow-y-auto">
                        {employees.map(emp => (
                          <div key={emp.id} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                            <div>
                              <p className="text-xs font-semibold">{emp.name}</p>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                {emp.sector || 'Sem setor'} · Coren: {emp.coren}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${emp.role === 'RES.TECNICA' || emp.role === 'SUPERVISÃO' ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300' :
                                emp.role === 'ENFERMEIRA' || emp.role === 'ENFERMEIRO' ? 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/40 dark:text-teal-300' :
                                  'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300'
                              }`}>
                              {emp.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* 2. PRESENTES HOJE BREAKDOWN */}
                {activeModal === 'presentes' && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-success/5 border border-success/20 rounded-lg p-2.5 text-center">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Diurno A</span>
                        <p className="text-lg font-bold text-success mt-0.5">{shiftBreakdown.diurno_a}</p>
                      </div>
                      <div className="bg-success/5 border border-success/20 rounded-lg p-2.5 text-center">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Diurno B</span>
                        <p className="text-lg font-bold text-success mt-0.5">{shiftBreakdown.diurno_b}</p>
                      </div>
                      <div className="bg-success/5 border border-success/20 rounded-lg p-2.5 text-center">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Noturno A</span>
                        <p className="text-lg font-bold text-success mt-0.5">{shiftBreakdown.noturno_a}</p>
                      </div>
                      <div className="bg-success/5 border border-success/20 rounded-lg p-2.5 text-center">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Noturno B</span>
                        <p className="text-lg font-bold text-success mt-0.5">{shiftBreakdown.noturno_b}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Profissionais em Plantão Hoje ({todayPresent})</h3>
                      <div className="border border-border rounded-lg overflow-hidden divide-y divide-border max-h-[40vh] overflow-y-auto">
                        {todayPresentEmployees.length === 0 ? (
                          <div className="p-8 text-center text-muted-foreground">Nenhum profissional escalado para hoje.</div>
                        ) : (
                          todayPresentEmployees.map(emp => (
                            <div key={emp.id} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                              <div>
                                <p className="text-xs font-semibold">{emp.name}</p>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                  <Shield className="h-3 w-3 flex-shrink-0 text-success" />
                                  Coren: {emp.coren} · Setor: {emp.sector || 'Sem setor'}
                                </span>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-muted border border-border text-muted-foreground uppercase font-mono">
                                {emp.shift_type.replace('_', ' ')}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* 3. AFASTADOS BREAKDOWN */}
                {activeModal === 'afastados' && (
                  <div className="space-y-4 text-center py-4">
                    {onLeave.length === 0 ? (
                      <div className="space-y-3">
                        <div className="mx-auto h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                          <CheckCircle2 className="h-6 w-6 text-success" />
                        </div>
                        <h3 className="text-sm font-semibold">Tudo Limpo!</h3>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          Nenhum profissional afastado em licença no momento. A UPA Zilda Arns está operando com força máxima! 🚀
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 text-left">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Colaboradores em Afastamento ({onLeave.length})</h3>
                        <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
                          {onLeave.map(emp => (
                            <div key={emp.id} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                              <div>
                                <p className="text-xs font-semibold">{emp.name}</p>
                                <span className="text-[10px] text-muted-foreground">Coren: {emp.coren} · Cargo: {emp.role}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-300">
                                EM LICENÇA
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-border flex justify-center">
                      <button
                        onClick={() => { setActiveModal(null); navigate('/atestados'); }}
                        className="flex items-center gap-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/95 px-4 py-2.5 rounded-lg transition-all shadow-md"
                      >
                        Gerenciar Afastamentos e Atestados
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. ATESTADOS BREAKDOWN */}
                {activeModal === 'atestados' && (
                  <div className="space-y-4">
                    {certificates.length === 0 ? (
                      <div className="text-center py-6 space-y-2">
                        <p className="text-xs text-muted-foreground">Nenhum atestado médico registrado neste mês de Junho 2026.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Atestados Ativos ({certificates.length})</h3>
                        <div className="border border-border rounded-lg overflow-hidden divide-y divide-border max-h-[40vh] overflow-y-auto">
                          {certificates.map(cert => (
                            <div key={cert.id} className="p-3 hover:bg-muted/30 transition-colors space-y-1.5">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold">{cert.employee_name}</p>
                                <span className="px-1.5 py-0.5 rounded bg-destructive/10 border border-destructive/20 text-destructive text-[9px] font-mono font-bold">
                                  CID: {cert.cid || '—'}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-relaxed">{cert.description || 'Nenhuma descrição informada'}</p>
                              <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <CalendarRange className="h-3.5 w-3.5" />
                                  Período: {new Date(cert.start_date).toLocaleDateString('pt-BR')} a {new Date(cert.end_date).toLocaleDateString('pt-BR')}
                                </span>
                                <span className="font-semibold text-card-foreground">({cert.days} dias)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-border flex justify-end">
                      <button
                        onClick={() => { setActiveModal(null); navigate('/atestados'); }}
                        className="flex items-center gap-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/95 px-4 py-2.5 rounded-lg transition-all shadow-md"
                      >
                        Ir para Página de Atestados
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-muted-foreground min-w-[100px]">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}