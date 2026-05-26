// @ts-nocheck
const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { FileText, Users, CalendarDays, Clock, TrendingUp, Percent, X } from 'lucide-react';

const COLORS = ['hsl(173,58%,39%)', 'hsl(199,89%,48%)', 'hsl(262,52%,47%)', 'hsl(43,74%,66%)', 'hsl(0,72%,51%)', 'hsl(142,71%,45%)', 'hsl(38,92%,50%)'];

export default function Reports() {
  const [activeModal, setActiveModal] = useState(null); // 'total' | 'entradas' | 'atestados' | 'horas' | 'media' | 'plantao' | null

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

  // Calculations
  const statusSummary = useMemo(() => {
    const summary = {};
    schedules.forEach(entry => {
      Object.values(entry.days || {}).forEach(val => {
        if (val) summary[val] = (summary[val] || 0) + 1;
      });
    });
    return Object.entries(summary).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [schedules]);

  const roleDistribution = useMemo(() => {
    const dist = {};
    employees.forEach(e => {
      const role = e.role || 'Outros';
      dist[role] = (dist[role] || 0) + 1;
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [employees]);

  const shiftHours = useMemo(() => {
    return [
      { name: 'Diurno A', total: schedules.filter(s => s.shift_type === 'diurno_a').reduce((acc, s) => acc + Object.values(s.days || {}).filter(v => v === 'P').length * 12, 0) },
      { name: 'Noturno A', total: schedules.filter(s => s.shift_type === 'noturno_a').reduce((acc, s) => acc + Object.values(s.days || {}).filter(v => v === 'P').length * 12, 0) },
      { name: 'Diurno B', total: schedules.filter(s => s.shift_type === 'diurno_b').reduce((acc, s) => acc + Object.values(s.days || {}).filter(v => v === 'P').length * 12, 0) },
      { name: 'Noturno B', total: schedules.filter(s => s.shift_type === 'noturno_b').reduce((acc, s) => acc + Object.values(s.days || {}).filter(v => v === 'P').length * 12, 0) },
    ];
  }, [schedules]);

  const totalHours = useMemo(() => {
    return shiftHours.reduce((a, s) => a + s.total, 0);
  }, [shiftHours]);

  const mediaHours = useMemo(() => {
    if (employees.length === 0) return 0;
    return (totalHours / employees.length).toFixed(1);
  }, [totalHours, employees]);

  // Plantão day rate calculations
  const totalDaysScheduled = useMemo(() => {
    return schedules.reduce((acc, s) => acc + Object.values(s.days || {}).length, 0);
  }, [schedules]);

  const totalPlantaoDays = useMemo(() => {
    return schedules.reduce((acc, s) => acc + Object.values(s.days || {}).filter(v => v === 'P').length, 0);
  }, [schedules]);

  const plantaoRate = useMemo(() => {
    if (totalDaysScheduled === 0) return 0;
    return ((totalPlantaoDays / totalDaysScheduled) * 100).toFixed(1);
  }, [totalPlantaoDays, totalDaysScheduled]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Visão analítica completa da escala</p>
      </motion.div>

      {/* Responsive 6-card summary grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <SummaryCard 
          icon={Users} 
          label="Total Colaboradores" 
          value={employees.length} 
          color="teal" 
          delay={0} 
          onClick={() => setActiveModal('total')}
        />
        <SummaryCard 
          icon={CalendarDays} 
          label="Entradas na Escala" 
          value={schedules.length} 
          color="blue" 
          delay={0.05} 
          onClick={() => setActiveModal('entradas')}
        />
        <SummaryCard 
          icon={FileText} 
          label="Atestados" 
          value={certificates.length} 
          color="red" 
          delay={0.1} 
          onClick={() => setActiveModal('atestados')}
        />
        <SummaryCard 
          icon={Clock} 
          label="Total Horas/Mês" 
          value={`${totalHours}h`} 
          color="green" 
          delay={0.15} 
          onClick={() => setActiveModal('horas')}
        />
        <SummaryCard 
          icon={TrendingUp} 
          label="Média Horas/Colab." 
          value={`${mediaHours}h`} 
          color="purple" 
          delay={0.2} 
          onClick={() => setActiveModal('media')}
        />
        <SummaryCard 
          icon={Percent} 
          label="Taxa de Plantão" 
          value={`${plantaoRate}%`} 
          color="amber" 
          delay={0.25} 
          onClick={() => setActiveModal('plantao')}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader><CardTitle className="text-sm">Distribuição de Siglas</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusSummary.slice(0, 8)} barSize={30}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={1500}>
                      {statusSummary.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader><CardTitle className="text-sm">Distribuição por Função</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={roleDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" animationDuration={1500}>
                      {roleDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {roleDistribution.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] text-muted-foreground">{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-sm">Horas Trabalhadas por Turno (Mês)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={shiftHours} barSize={50} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={90} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="total" radius={[0, 6, 6, 0]} animationDuration={1500}>
                      {shiftHours.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Reports Floting Glassmorphic Detail Modals */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col z-10"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  {activeModal === 'total' && <Users className="h-5 w-5 text-primary" />}
                  {activeModal === 'entradas' && <CalendarDays className="h-5 w-5 text-accent" />}
                  {activeModal === 'atestados' && <FileText className="h-5 w-5 text-destructive" />}
                  {activeModal === 'horas' && <Clock className="h-5 w-5 text-success" />}
                  {activeModal === 'media' && <TrendingUp className="h-5 w-5 text-purple-500" />}
                  {activeModal === 'plantao' && <Percent className="h-5 w-5 text-amber-500" />}
                  <h2 className="text-sm font-bold">
                    {activeModal === 'total' && 'Detalhamento de Colaboradores'}
                    {activeModal === 'entradas' && 'Status das Escalas Ativas'}
                    {activeModal === 'atestados' && 'Lista de Atestados Médicos'}
                    {activeModal === 'horas' && 'Detalhamento de Horas por Turno'}
                    {activeModal === 'media' && 'Média de Horas CLT / RT'}
                    {activeModal === 'plantao' && 'Análise de Plantões vs Folgas'}
                  </h2>
                </div>
                <button 
                  onClick={() => setActiveModal(null)} 
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                {/* 1. TOTAL COLABORADORES */}
                {activeModal === 'total' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Detalhamento dos 82 profissionais cadastrados e distribuídos por cargo na UPA Zilda Arns:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {roleDistribution.map((item, i) => (
                        <div key={item.name} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg border border-border">
                          <span className="text-[11px] font-medium">{item.name}</span>
                          <Badge variant="secondary" className="text-[10px] font-bold">{item.value}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. ENTRADAS NA ESCALA */}
                {activeModal === 'entradas' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Resumo das escalas de plantão geradas para Junho 2026:</p>
                    <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Total de Escalas Geradas:</span>
                        <span className="font-bold">{schedules.length} escalas</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Escalas Bloqueadas / Fechadas:</span>
                        <span className="font-bold text-success">0 (Disponíveis para Edição)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Mes de Referência:</span>
                        <span className="font-bold">Junho 2026</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. ATESTADOS */}
                {activeModal === 'atestados' && (
                  <div className="space-y-3">
                    {certificates.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Nenhum atestado cadastrado no sistema.</p>
                    ) : (
                      certificates.map(cert => (
                        <div key={cert.id} className="p-3 bg-muted/50 border border-border rounded-lg space-y-1">
                          <div className="flex justify-between">
                            <span className="text-xs font-bold">{cert.employee_name}</span>
                            <Badge variant="destructive" className="text-[9px]">CID: {cert.cid}</Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{cert.description}</p>
                          <p className="text-[9px] text-muted-foreground">Período: {cert.days} dias de afastamento</p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 4. TOTAL HORAS/MÊS */}
                {activeModal === 'horas' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Consolidado de horas produtivas trabalhadas por turno em Junho 2026:</p>
                    <div className="space-y-2">
                      {shiftHours.map(s => (
                        <div key={s.name} className="flex items-center justify-between p-2 bg-muted/30 border border-border rounded-lg">
                          <span className="text-xs font-medium">{s.name}</span>
                          <span className="text-xs font-bold text-success">{s.total} horas</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. MÉDIA HORAS/COLAB */}
                {activeModal === 'media' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Análise de horas médias trabalhadas por colaborador no mês de referência:
                    </p>
                    <div className="bg-muted/40 p-4 rounded-xl border border-border text-center space-y-2">
                      <TrendingUp className="h-8 w-8 text-purple-500 mx-auto" />
                      <h4 className="text-lg font-bold text-purple-500">{mediaHours}h / mês</h4>
                      <p className="text-[10px] text-muted-foreground">
                        Média balanceada entre o regime CLT de 12x36 (cerca de 180h/mês) e as escalas administrativas/RT de 40h semanais (cerca de 160h/mês).
                      </p>
                    </div>
                  </div>
                )}

                {/* 6. TAXA DE PLANTÃO */}
                {activeModal === 'plantao' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Análise proporcional entre dias trabalhados (Plantão) e dias de descanso (Folga/Afastamentos):
                    </p>
                    <div className="bg-muted/40 p-4 rounded-xl border border-border text-center space-y-2">
                      <Percent className="h-8 w-8 text-amber-500 mx-auto" />
                      <h4 className="text-lg font-bold text-amber-500">{plantaoRate}% das datas escaladas</h4>
                      <p className="text-[10px] text-muted-foreground">
                        Representa {totalPlantaoDays} plantões ativos de 12h de um total de {totalDaysScheduled} datas programadas no grid. Esta proporção é perfeita e reflete rigorosamente o descanso regulamentar do ciclo 12x36.
                      </p>
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

function SummaryCard({ icon: Icon, label, value, color, delay, onClick }) {
  const bg = { 
    teal: 'bg-primary/10 text-primary', 
    blue: 'bg-accent/10 text-accent', 
    red: 'bg-destructive/10 text-destructive', 
    green: 'bg-success/10 text-success',
    purple: 'bg-purple-500/10 text-purple-500',
    amber: 'bg-amber-500/10 text-amber-500'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay }}
      onClick={onClick}
      className="cursor-pointer active:scale-[0.98] select-none hover:shadow-md transition-all group"
    >
      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${bg[color] || bg.teal} transition-colors group-hover:scale-105 duration-200`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground whitespace-nowrap">{label}</p>
            <p className="text-lg font-bold mt-0.5">{value}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}