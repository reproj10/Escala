// @ts-nocheck
const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { getCurrentMonthYearString, getCurrentMonthString } from "@/lib/utils";
import { cn, normalizeSearch } from "@/lib/utils";
import { Plus, FileHeart, X, Search, Calendar, Trash2, HeartPulse, ShieldAlert, Award, Stethoscope, Percent, Pencil, CheckCircle2, Save, RefreshCw, Copy, Printer, User, Eraser } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const typeLabels = { 
  FER_30: 'Férias', 
  FER_20: 'Férias 20 dias', 
  FER_PREMIO: 'Férias Premium'
};

const COLORS = ['hsl(173,58%,39%)', 'hsl(262,52%,47%)', 'hsl(199,89%,48%)', 'hsl(43,74%,66%)', 'hsl(0,72%,51%)'];

// Helper function to normalize strings for accent-insensitive comparison
const normalizeName = (name) => {
  if (!name) return '';
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
};

const calculateEndDate = (startDateStr, days) => {
  if (!startDateStr) return '';
  const parts = startDateStr.split('-');
  if (parts.length !== 3) return startDateStr;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  date.setDate(date.getDate() + (days > 0 ? days - 1 : 0));
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, '0');
  const nd = String(date.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
};

// HELPER: Injeta automaticamente o férias (FER) na escala do colaborador, preservando as Folgas Deferidas (F)
const applyCertificateToSchedule = async (vac, employee) => {
  if (!vac.start_date || !vac.end_date || !employee) return;
  
  // Usar strings de data corretamente para evitar problemas de fuso horário
  const start = new Date(vac.start_date + 'T00:00:00');
  const end = new Date(vac.end_date + 'T23:59:59');
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

  const monthsMap = {};
  
  let current = new Date(start);
  while (current <= end) {
    const y = current.getFullYear();
    const m = current.getMonth() + 1;
    const d = current.getDate();
    
    const key = `${y}-${m}`;
    if (!monthsMap[key]) monthsMap[key] = { year: y, month: m, days: [] };
    monthsMap[key].days.push(d);
    
    current.setDate(current.getDate() + 1);
  }
  
  for (const key in monthsMap) {
    const { year, month, days } = monthsMap[key];
    const schedules = await db.entities.ScheduleEntry.filter({ month, year });
    
    // Buscar aprovações reais de Folga Deferida no Portal para não apagar a prova
    let userReqs = [];
    try {
      const requests = await db.entities.Request.filter({ month, year });
      userReqs = requests.filter(r => r.memberId === employee.id && r.status === 'approved');
    } catch (e) {
      console.warn("Requests table not available", e);
    }

    const sched = schedules.find(s => s.employee_id === employee.id || normalizeName(s.employee_name) === normalizeName(employee.name));
    
    if (sched) {
      const updatedDays = { ...(sched.days || {}) };
      let changed = false;
      for (const d of days) {
        const dStr = String(d);
        // Verifica se é Folga Deferida comprovada no portal
        const isFolgaDeferida = userReqs.some(r => String(r.requestedDay) === dStr);
        
        if (!isFolgaDeferida) {
          updatedDays[dStr] = 'FER';
          changed = true;
        }
      }
      
      if (changed) {
        await db.entities.ScheduleEntry.update(sched.id, { days: updatedDays });
      }
    }
  }
};

// HELPER: Remove o férias (FER) da escala e devolve para o padrão, preservando os dias não tocados.
const revertCertificateFromSchedule = async (vac, employee) => {
  if (!vac.start_date || !vac.end_date || !employee) return;
  
  const start = new Date(vac.start_date + 'T00:00:00');
  const end = new Date(vac.end_date + 'T23:59:59');
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

  const monthsMap = {};
  let current = new Date(start);
  while (current <= end) {
    const y = current.getFullYear();
    const m = current.getMonth() + 1;
    const d = current.getDate();
    
    const key = `${y}-${m}`;
    if (!monthsMap[key]) monthsMap[key] = { year: y, month: m, days: [] };
    monthsMap[key].days.push(d);
    
    current.setDate(current.getDate() + 1);
  }
  
  for (const key in monthsMap) {
    const { year, month, days } = monthsMap[key];
    const schedules = await db.entities.ScheduleEntry.filter({ month, year });
    const sched = schedules.find(s => s.employee_id === employee.id || normalizeName(s.employee_name) === normalizeName(employee.name));
    
    if (sched) {
      const updatedDays = { ...(sched.days || {}) };
      let changed = false;
      for (const d of days) {
        const dStr = String(d);
        // Só remove se estiver marcado como FER
        if (updatedDays[dStr] === 'FER') {
          delete updatedDays[dStr]; // Deletando a chave, o EscalaControl vai aplicar a regra padrão automaticamente
          changed = true;
        }
      }
      
      if (changed) {
        await db.entities.ScheduleEntry.update(sched.id, { days: updatedDays });
      }
    }
  }
};

export default function Vacations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState(null); // 'total' | 'dias' | 'media' | 'afastados' | 'aquisitivo' | 'absent' | null
  const [editingVacation, setEditingVacation] = useState(null); // Vacation | null
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'delete' | 'complete', vac: any } | null
  
  const [empSearch, setEmpSearch] = useState('');
  const [empOpen, setEmpOpen] = useState(false);
  const [empEditSearch, setEmpEditSearch] = useState('');
  const [empEditOpen, setEmpEditOpen] = useState(false);
  const [isEmpFocused, setIsEmpFocused] = useState(false);
  
  const [form, setForm] = useState({ 
    employee_name: '', 
    type: 'FER_30', 
    aquisitivo: '', 
    start_date: new Date().toISOString().split('T')[0], 
    end_date: calculateEndDate(new Date().toISOString().split('T')[0], 30), 
    days_count: 30, 
    notes: '' 
  });

  const { data: vacations = [] } = useQuery({
    queryKey: ['vacations'],
    queryFn: async () => {
      const list = await db.entities.MedicalCertificate.list('-start_date');
      return list.filter(item => item.type && item.type.startsWith('FER'));
    },
    refetchInterval: 5000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => db.entities.Employee.list(),
  });

  const createVacation = useMutation({
    mutationFn: async (data) => {
      const { days_count, notes, type, aquisitivo, ...payload } = data;
      const days = parseInt(data.days_count || data.days || 0);
      const created = await db.entities.MedicalCertificate.create({
        ...payload,
        type: type,
        days: days,
        description: `[${typeLabels[type] || type || 'Férias'}]${aquisitivo ? ' Período: ' + aquisitivo : ''} ${notes || data.description || ''}`.trim(),
        created_date: new Date().toISOString()
      });

      // Find employee accent-insensitively
      const normCertName = normalizeName(data.employee_name);
      const emp = employees.find(e => normalizeName(e.name) === normCertName);
      if (emp) {
        await db.entities.Employee.update(emp.id, { status: 'on_leave' });
        await applyCertificateToSchedule(created, emp);
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacations'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({ title: 'Férias registrado e colaborador afastado!' });
      setShowForm(false);
      setForm({ 
        employee_name: '', 
        type: 'FER_30', 
        aquisitivo: '', 
        start_date: new Date().toISOString().split('T')[0], 
        end_date: calculateEndDate(new Date().toISOString().split('T')[0], 30), 
        days_count: 30, 
        notes: '' 
      });
    },
    onError: (err) => {
      toast({ 
        title: 'Erro ao registrar férias', 
        description: err.message, 
        variant: 'destructive' 
      });
    }
  });

  const updateVacation = useMutation({
    mutationFn: async (data) => {
      const { days_count, notes, type, aquisitivo, ...payload } = data;
      const days = parseInt(data.days_count || data.days || 0);
      const updated = await db.entities.MedicalCertificate.update(data.id, {
        ...payload,
        type: type,
        days: days,
        description: `[${typeLabels[type] || type || 'Férias'}]${aquisitivo ? ' Período: ' + aquisitivo : ''} ${notes || data.description || ''}`.trim()
      });

      // Find employee accent-insensitively
      const normCertName = normalizeName(data.employee_name);
      const emp = employees.find(e => normalizeName(e.name) === normCertName);
      if (emp) {
        await db.entities.Employee.update(emp.id, { status: 'on_leave' });
        await applyCertificateToSchedule(updated, emp);
      }
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacations'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({ title: 'Férias atualizado com sucesso!' });
      setEditingVacation(null);
    },
    onError: (err) => {
      toast({ 
        title: 'Erro ao atualizar férias', 
        description: err.message, 
        variant: 'destructive' 
      });
    }
  });

  const deleteVacation = useMutation({
    mutationFn: async (id) => {
      // Find vacificate loosely by ID comparison
      const vac = vacations.find(c => c.id == id || c.id?.toString() === id?.toString());
      if (vac) {
        // Find employee accent-insensitively
        const normCertName = normalizeName(vac.employee_name);
        const emp = employees.find(e => normalizeName(e.name) === normCertName);
        if (emp) {
          await db.entities.Employee.update(emp.id, { status: 'active' });
          await revertCertificateFromSchedule(vac, emp);
        }
      }
      
      // Perform database deletion with robustness
      try {
        await db.entities.MedicalCertificate.delete(id);
      } catch (e) {
        // Fallback: search loosely and delete
        const list = await db.entities.MedicalCertificate.list();
        const found = list.find(item => item.id == id || item.id?.toString() === id?.toString());
        if (found) {
          await db.entities.MedicalCertificate.delete(found.id);
        } else {
          throw e;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacations'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({ title: 'Férias removido com sucesso!' });
    },
    onError: (err) => {
      toast({ 
        title: 'Erro ao remover férias', 
        description: err.message, 
        variant: 'destructive' 
      });
    }
  });

  const completeCertEarly = useMutation({
    mutationFn: async (vac) => {
      const todayStr = new Date().toISOString().split('T')[0];
      
      await db.entities.MedicalCertificate.update(vac.id, {
        end_date: todayStr,
        description: (vac.notes || vac.description || '') + ` [Retorno Antecipado em ${format(new Date(), 'dd/MM/yyyy')}]`
      });

      // Find employee accent-insensitively
      const normCertName = normalizeName(vac.employee_name);
      const emp = employees.find(e => normalizeName(e.name) === normCertName);
      if (emp) {
        await db.entities.Employee.update(emp.id, { status: 'active' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacations'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({ title: 'Afastamento encerrado e colaborador reativado!' });
    },
    onError: (err) => {
      toast({ 
        title: 'Erro ao encerrar férias', 
        description: err.message, 
        variant: 'destructive' 
      });
    }
  });

  // Calculate dynamic stats
  const totalDays = useMemo(() => {
    return vacations.reduce((acc, vac) => acc + (parseInt(vac.days_count || vac.days || 0)), 0);
  }, [vacations]);

  const mediaDays = useMemo(() => {
    if (vacations.length === 0) return 0;
    return (totalDays / vacations.length).toFixed(1);
  }, [vacations, totalDays]);

  const activeLeaves = useMemo(() => {
    return employees.filter(e => e.status === 'on_leave').length;
  }, [employees]);

  // Frequent CID calculations
  const frequentCid = useMemo(() => {
    if (vacations.length === 0) return 'Nenhum';
    const aquisitivos = {};
    vacations.forEach(c => {
      if (c.aquisitivo) aquisitivos[c.aquisitivo] = (aquisitivos[c.aquisitivo] || 0) + 1;
    });
    const sorted = Object.entries(aquisitivos).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : 'Nenhum';
  }, [vacations]);

  // Absenteísmo rate (estimated: vacificate days / total scheduled month workdays)
  const absenteismoRate = useMemo(() => {
    if (employees.length === 0) return '0.0%';
    const totalMonthWorkdays = employees.length * 15; // 15 workdays on average per CLT/12x36 employee
    return ((totalDays / totalMonthWorkdays) * 100).toFixed(2) + '%';
  }, [employees, totalDays]);

  // Calculations for dynamic Recharts charts
  const roleAbsenceData = useMemo(() => {
    const dist = {};
    vacations.forEach(vac => {
      const emp = employees.find(e => normalizeName(e.name) === normalizeName(vac.employee_name));
      const role = emp ? emp.role : 'Outros';
      const days = parseInt(vac.days_count || vac.days || 0);
      dist[role] = (dist[role] || 0) + days;
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [vacations, employees]);

  const vacTypeData = useMemo(() => {
    const dist = {};
    vacations.forEach(vac => {
      const type = typeLabels[vac.type] || vac.type || 'Férias';
      dist[type] = (dist[type] || 0) + 1;
});
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [vacations]);

  // Filtered List
  const filteredVacations = useMemo(() => {
    const q = normalizeSearch(searchQuery);
    return vacations.filter(c =>
      normalizeSearch(c.employee_name).includes(q) ||
      normalizeSearch(c.aquisitivo).includes(q) ||
      normalizeSearch(c.notes).includes(q)
    );
  }, [vacations, searchQuery]);

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingVacation) return;
    updateVacation.mutate(editingVacation);
  };

  // Helper to copy vacificate details to clipboard
  const handleCopy = (vac) => {
    const daysVal = vac.days_count || vac.days || 0;
    const text = `📋 *Férias Médico / Licença - UPA Zilda Arns*\n` +
                 `• Colaborador: ${vac.employee_name}\n` +
                 `• Tipo: ${typeLabels[vac.type] || vac.type}\n` +
                 `• Período Aquisitivo: ${vac.aquisitivo || 'N/A'}\n` +
                 `• Período: ${format(new Date(vac.start_date), 'dd/MM/yyyy')} a ${format(new Date(vac.end_date), 'dd/MM/yyyy')} (${daysVal} dias)\n` +
                 `• Observações: ${vac.notes || vac.description || 'Nenhuma'}`;
    
    navigator.clipboard.writeText(text);
    toast({ 
      title: 'Ficha Copiada!', 
      description: 'Resumo formatado copiado para enviar via WhatsApp/E-mail.' 
    });
  };

  // Helper to trigger print of the vacations table
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Dynamic CSS Print Injections (Ensures clean document export when clicking print) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-section, #print-section * {
            visibility: visible !important;
          }
          #print-section {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Férias Programadas</h1>
          <p className="text-sm text-muted-foreground">Gerencie afastamentos, Período Aquisitivo e licenças médicas</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm">
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? 'Cancelar' : 'Registrar Novo Férias'}
        </Button>
      </motion.div>

      {/* 1. Dynamic 5-Stats Clickable Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard 
          icon={FileHeart} 
          label="Total Ocorrências" 
          value={vacations.length} 
          color="teal" 
          subtitle={`Registros de ${getCurrentMonthString()}`} 
          onClick={() => setActiveModal('total')}
        />
        <StatCard 
          icon={Award} 
          label="Média de Dias" 
          value={`${mediaDays} dias`} 
          color="purple" 
          subtitle="Por férias" 
          onClick={() => setActiveModal('media')}
        />
        <StatCard 
          icon={ShieldAlert} 
          label="Colaboradores Afastados" 
          value={activeLeaves} 
          color="yellow" 
          subtitle="Fora de escala" 
          onClick={() => setActiveModal('afastados')}
        />
        <StatCard 
          icon={Stethoscope} 
          label="CID mais Frequente" 
          value={frequentCid} 
          color="blue" 
          subtitle="Período Aquisitivo dominante" 
          onClick={() => setActiveModal('aquisitivo')}
        />
        <StatCard 
          icon={Percent} 
          label="Taxa Absenteísmo" 
          value={absenteismoRate} 
          color="amber" 
          subtitle="Impacto de escala" 
          onClick={() => setActiveModal('absent')}
        />
      </div>

      {/* 2. Form Slide-in / Expander Card */}
      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, y: -15, height: 0 }} 
            animate={{ opacity: 1, y: 0, height: 'auto' }} 
            exit={{ opacity: 0, y: -15, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border border-primary/25 shadow-lg bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <HeartPulse className="h-4.5 w-4.5 text-primary animate-pulse" /> 
                  Lançar Férias
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <form onSubmit={e => { e.preventDefault(); createVacation.mutate(form); }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1 relative">
                      <Label className="text-[10px] uppercase font-bold">Colaborador</Label>
                      <Input
                        required
                        placeholder="Pesquise ou selecione o colaborador..."
                        value={form.employee_name || ''}
                        onChange={e => {
                          const val = e.target.value;
                          const capitalized = val.charAt(0).toUpperCase() + val.slice(1);
                          setForm({ ...form, employee_name: capitalized });
                        }}
                        onFocus={() => setIsEmpFocused(true)}
                        onBlur={() => setTimeout(() => setIsEmpFocused(false), 200)}
                        autoCapitalize="words"
                        className="h-9 text-xs pr-10"
                      />
                      {form.employee_name && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, employee_name: '' })}
                          className="absolute right-2.5 top-7 text-pink-500 hover:text-pink-600 transition-colors cursor-pointer"
                          title="Apagar nome"
                        >
                          <Eraser className="h-4 w-4" />
                        </button>
                      )}
                      <AnimatePresence>
                        {isEmpFocused && (
                          (() => {
                            const queryLower = normalizeSearch(form.employee_name);
                            const filtered = employees.filter(e => {
                              if (!queryLower) return true;
                              const nameLower = normalizeSearch(e.name);
                              const words = nameLower.split(/\s+/);
                              return words.some(w => w.startsWith(queryLower));
                            });

                            return (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="absolute left-0 right-0 z-50 mt-1 max-h-[160px] overflow-y-auto bg-popover border border-border rounded-lg shadow-xl"
                              >
                                {filtered.length === 0 ? (
                                  <div className="py-4 text-center text-xs text-muted-foreground">
                                    Nenhum colaborador encontrado.
                                  </div>
                                ) : (
                                  filtered.map(s => (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        setForm({ ...form, employee_name: s.name });
                                        setIsEmpFocused(false);
                                      }}
                                      className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border/40 last:border-0"
                                    >
                                      <User className="h-3 w-3 text-primary flex-shrink-0" />
                                      <span className="font-medium text-foreground truncate">{s.name}</span>
                                      <Badge variant="outline" className="ml-auto text-[8px] py-0 font-bold">{s.role}</Badge>
                                    </button>
                                  ))
                                )}
                              </motion.div>
                            );
                          })()
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold">Tipo de Férias</Label>
                      <select 
                        required
                        className="w-full h-9 rounded-lg border border-border bg-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        value={form.type} 
                        onChange={e => {
                          const newType = e.target.value;
                          let newDays = form.days_count;
                          if (newType === 'FER_30') newDays = 30;
                          else if (newType === 'FER_20') newDays = 20;
                          
                          setForm({ 
                            ...form, 
                            type: newType, 
                            days_count: newDays, 
                            end_date: calculateEndDate(form.start_date, newDays) 
                          });
                        }}
                        className="w-full h-9 rounded-lg border border-border bg-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold">Período Aquisitivo</Label>
                      <Input 
                        placeholder="Ex: 2024/2025" 
                        value={form.aquisitivo || ''} 
                        onChange={e => setForm({ ...form, aquisitivo: e.target.value })}
                        className="h-9 text-xs" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold">Dias de Férias</Label>
                      <Input 
                        type="number" 
                        required
                        min="1"
                        value={form.days_count} 
                        onChange={e => {
                          const days = parseInt(e.target.value) || 0;
                          setForm({ ...form, days_count: days, end_date: calculateEndDate(form.start_date, days) });
                        }}
                        className="h-9 text-xs" 
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold">Data Início</Label>
                      <Input 
                        type="date" 
                        required
                        value={form.start_date} 
                        onChange={e => {
                          const start = e.target.value;
                          setForm({ ...form, start_date: start, end_date: calculateEndDate(start, form.days_count) });
                        }}
                        className="h-9 text-xs" 
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold">Data Fim</Label>
                      <Input 
                        type="date" 
                        required
                        value={form.end_date} 
                        onChange={e => setForm({ ...form, end_date: e.target.value })}
                        className="h-9 text-xs" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold">Observações</Label>
                    <Textarea 
                      placeholder="Descreva observações ou detalhes adicionais..."
                      value={form.notes} 
                      onChange={e => setForm({ ...form, notes: e.target.value })} 
                      rows={2} 
                      className="text-xs resize-none"
                    />
                  </div>

                  <Button type="submit" disabled={createVacation.isPending} className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all">
                    {createVacation.isPending ? 'Registrando...' : 'Confirmar e Registrar Férias'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Table / List Card with Search and Expanded Actions (This card has id="print-section" to print cleanly) */}
      <motion.div 
        id="print-section"
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.15 }} 
        className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm no-print">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Pesquisar férias por nome..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-10 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-pink-500 hover:text-pink-600 transition-colors cursor-pointer"
                title="Apagar busca"
              >
                <Eraser className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Print action button for the list */}
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handlePrint}
              className="no-print h-9 text-xs font-medium flex items-center gap-1.5 border-border hover:bg-muted"
              title="Imprimir / Exportar lista em PDF"
            >
              <Printer className="h-4 w-4" />
              Imprimir Relatório
            </Button>
            
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {filteredVacations.length} de {vacations.length} registros
            </span>
          </div>
        </div>

        {/* Clean printable title, hidden on screen, visible only when printing */}
        <div className="hidden print:block border-b border-black pb-3 mb-4">
          <h2 className="text-lg font-bold text-black">Relatório de Férias e Afastamentos</h2>
          <p className="text-xs text-slate-600 mt-1">UPA Zilda Arns · Gerado em {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Colaborador</TableHead>
                <TableHead className="font-semibold">Tipo</TableHead>
                <TableHead className="font-semibold">Período Aquisitivo</TableHead>
                <TableHead className="font-semibold">Período</TableHead>
                <TableHead className="font-semibold">Dias</TableHead>
                <TableHead className="font-semibold">Observações</TableHead>
                <TableHead className="font-semibold text-right pr-6 no-print">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVacations.map(vac => {
                const daysVal = vac.days_count || vac.days || 0;
                
                return (
                  <TableRow key={vac.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-semibold text-xs py-3">{vac.employee_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] font-semibold border-muted-foreground/30">
                        {typeLabels[vac.type] || vac.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono font-bold text-destructive">{vac.aquisitivo || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {vac.start_date ? format(new Date(vac.start_date), 'dd/MM/yyyy') : '-'} a {vac.end_date ? format(new Date(vac.end_date), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-card-foreground">{daysVal} dias</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate print:max-w-none print:whitespace-normal" title={vac.notes || vac.description}>
                      {vac.notes || vac.description || '—'}
                    </TableCell>
                    <TableCell className="text-right pr-6 no-print">
                      <div className="flex gap-1 justify-end">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          onClick={() => handleCopy(vac)}
                          title="Copiar resumo"
                        >
                          <Copy className="h-3.5 w-3.5 text-slate-500" />
                        </Button>

                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={() => setEditingVacation({ ...vac })}
                          title="Editar detalhes"
                        >
                          <Pencil className="h-3.5 w-3.5 text-primary" />
                        </Button>

                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                          onClick={() => setConfirmAction({ type: 'complete', vac })}
                          title="Encerrar / Retorno Antecipado"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                        </Button>

                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive transition-colors"
                          onClick={() => setConfirmAction({ type: 'delete', vac })}
                          title="Remover"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredVacations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-10">
                    Nenhuma férias correspondente encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>

      {/* 4. Animated Recharts Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 no-print">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dias de Afastamento por Cargo</CardTitle></CardHeader>
            <CardContent>
              <div className="h-60">
                {roleAbsenceData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sem dados suficientes para exibição.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={roleAbsenceData} barSize={25} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={90} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={1500}>
                        {roleAbsenceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipos de Ausência</CardTitle></CardHeader>
            <CardContent>
              <div className="h-60 flex flex-col justify-between">
                {vacTypeData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sem dados suficientes para exibição.</div>
                ) : (
                  <>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={vacTypeData} 
                            cx="50%" 
                            cy="50%" 
                            innerRadius={45} 
                            outerRadius={75} 
                            paddingAngle={3} 
                            dataKey="value" 
                            animationDuration={1500}
                          >
                            {vacTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                      {vacTypeData.map((item, i) => (
                        <div key={item.name} className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-[10px] text-muted-foreground">{item.name} ({item.value})</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 5. Edit Modal Overlay */}
      <AnimatePresence>
        {editingVacation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingVacation(null)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-10"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  <Pencil className="h-4.5 w-4.5 text-primary" />
                  <h2 className="text-sm font-bold text-card-foreground">Editar Férias</h2>
                </div>
                <button 
                  onClick={() => setEditingVacation(null)} 
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Colaborador</span>
                  <p className="text-xs font-bold text-card-foreground mt-0.5">{editingVacation.employee_name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold">Tipo de Afastamento</Label>
                    <select 
                      className="w-full h-9 rounded-lg border border-border bg-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      value={editingVacation.type} 
                      onChange={e => {
                        const newType = e.target.value;
                        let newDays = editingVacation.days;
                        if (newType === 'FER_30') newDays = 30;
                        else if (newType === 'FER_20') newDays = 20;
                        
                        setEditingVacation({ 
                          ...editingVacation, 
                          type: newType,
                          days: newDays,
                          end_date: calculateEndDate(editingVacation.start_date, newDays)
                        });
                      }}
                      className="w-full h-9 rounded-lg border border-border bg-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold">Período Aquisitivo</Label>
                    <Input 
                      placeholder="Ex: 2024/2025" 
                      value={editingVacation.aquisitivo || ''} 
                      onChange={e => setEditingVacation({ ...editingVacation, aquisitivo: e.target.value })}
                      className="h-9 text-xs" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold">Dias</Label>
                    <Input 
                      type="number" 
                      required
                      min="1"
                      value={editingVacation.days_count || editingVacation.days || ''} 
                      onChange={e => {
                        const days = parseInt(e.target.value) || 0;
                        setEditingVacation({ ...editingVacation, days_count: days, days: days, end_date: calculateEndDate(editingVacation.start_date, days) });
                      }}
                      className="h-9 text-xs" 
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold tracking-wide">Data Início</Label>
                    <Input 
                      type="date" 
                      required
                      value={editingVacation.start_date} 
                      onChange={e => {
                        const start = e.target.value;
                        const days = editingVacation.days_count || editingVacation.days || 0;
                        setEditingVacation({ ...editingVacation, start_date: start, end_date: calculateEndDate(start, days) });
                      }}
                      className="h-9 text-xs" 
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold tracking-wide">Data Fim</Label>
                    <Input 
                      type="date" 
                      required
                      value={editingVacation.end_date} 
                      onChange={e => setEditingVacation({ ...editingVacation, end_date: e.target.value })}
                      className="h-9 text-xs" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold tracking-wide">Observações / Justificativa</Label>
                  <Textarea 
                    value={editingVacation.notes || editingVacation.description || ''} 
                    onChange={e => setEditingVacation({ ...editingVacation, notes: e.target.value, description: e.target.value })} 
                    rows={3} 
                    className="text-xs resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-end gap-2 text-right">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingVacation(null)}
                    className="text-xs h-9 px-4"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    size="sm"
                    disabled={updateVacation.isPending}
                    className="text-xs h-9 px-4 bg-primary text-primary-foreground flex items-center gap-1.5 shadow-sm"
                  >
                    {updateVacation.isPending ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Custom Confirmation Dialog */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmAction(null)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-10 p-6 space-y-4"
            >
              <div className="flex items-start gap-3">
                {confirmAction.type === 'delete' ? (
                  <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="h-5 w-5 text-destructive animate-bounce" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 animate-pulse" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-card-foreground">
                    {confirmAction.type === 'delete' ? 'Remover Férias?' : 'Confirmar Retorno?'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {confirmAction.type === 'delete' 
                      ? `Tem vaceza que deseja excluir o férias de ${confirmAction.vac.employee_name}?`
                      : `Deseja registrar o retorno antecipado de ${confirmAction.vac.employee_name} ao trabalho hoje?`}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  onClick={() => setConfirmAction(null)}
                  className="text-xs h-9 px-4"
                >
                  Cancelar
                </Button>
                <Button 
                  type="button"
                  variant={confirmAction.type === 'delete' ? 'destructive' : 'default'}
                  size="sm" 
                  onClick={() => {
                    if (confirmAction.type === 'delete') {
                      deleteVacation.mutate(confirmAction.vac.id);
                    } else {
                      completeCertEarly.mutate(confirmAction.vac);
                    }
                    setConfirmAction(null);
                  }}
                  className="text-xs h-9 px-4"
                >
                  Confirmar
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. Férias Glassmorphic Detail Modals */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
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
                  {activeModal === 'total' && <FileHeart className="h-5 w-5 text-primary" />}
                  {activeModal === 'dias' && <Calendar className="h-5 w-5 text-destructive" />}
                  {activeModal === 'media' && <Award className="h-5 w-5 text-purple-500" />}
                  {activeModal === 'afastados' && <ShieldAlert className="h-5 w-5 text-warning" />}
                  {activeModal === 'aquisitivo' && <Stethoscope className="h-5 w-5 text-accent" />}
                  {activeModal === 'absent' && <Percent className="h-5 w-5 text-amber-500" />}
                  <h2 className="text-sm font-bold text-card-foreground">
                    {activeModal === 'total' && 'Ocorrências por Tipo'}
                    {activeModal === 'dias' && 'Afastamento Acumulado por Pessoa'}
                    {activeModal === 'media' && 'Análise de Média de Dias'}
                    {activeModal === 'afastados' && 'Profissionais Afastados da Escala'}
                    {activeModal === 'aquisitivo' && 'Distribuição de Diagnósticos (Período Aquisitivo)'}
                    {activeModal === 'absent' && 'Impacto da Taxa de Absenteísmo'}
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
                {/* A. TOTAL OCORRÊNCIAS */}
                {activeModal === 'total' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Distribuição total das ocorrências ativas em {getCurrentMonthYearString()}:</p>
                    <div className="space-y-2">
                      {vacTypeData.map((item, i) => (
                        <div key={item.name} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg border border-border">
                          <span className="text-xs font-medium">{item.name}</span>
                          <Badge variant="secondary" className="text-xs font-bold">{item.value} registro(s)</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* B. TOTAL DIAS PERDIDOS */}
                {activeModal === 'dias' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Soma de dias perdidos acumulados por colaborador:</p>
                    <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
                      {vacations.map(c => {
                        const d = c.days_count || c.days || 0;
                        return (
                          <div key={c.id} className="flex justify-between items-center p-3 hover:bg-muted/30">
                            <span className="text-xs font-semibold">{c.employee_name}</span>
                            <Badge variant="destructive" className="text-[10px] font-bold">{d} dias de repouso</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* C. MÉDIA DE DIAS */}
                {activeModal === 'media' && (
                  <div className="space-y-3 text-center py-4">
                    <Award className="h-10 w-10 text-purple-500 mx-auto" />
                    <h3 className="text-lg font-bold text-purple-500">{mediaDays} dias por férias</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Esta média indica a gravidade dos fériass médicos apresentados. Férias acima de 15 dias consecutivos exigem encaminhamento da UPA Zilda Arns para perícia médica oficial no INSS.
                    </p>
                  </div>
                )}

                {/* D. COLABORADORES AFASTADOS */}
                {activeModal === 'afastados' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Profissionais atualmente removidos da escala de plantão:</p>
                    <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
                      {employees.filter(e => e.status === 'on_leave').map(emp => (
                        <div key={emp.id} className="flex justify-between items-center p-3 hover:bg-muted/30">
                          <div>
                            <p className="text-xs font-bold">{emp.name}</p>
                            <span className="text-[10px] text-muted-foreground">Cargo: {emp.role} · Setor: {emp.sector || 'Sem Setor'}</span>
                          </div>
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] font-bold">EM LICENÇA</Badge>
                        </div>
                      ))}
                      {activeLeaves === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-6">Nenhum profissional afastado no momento!</p>
                      )}
                    </div>
                  </div>
                )}

                {/* E. CID MAIS FREQUENTE */}
                {activeModal === 'aquisitivo' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Distribuição de diagnósticos médicos por código Período Aquisitivo:</p>
                    <div className="bg-muted/40 p-4 rounded-xl border border-border text-center space-y-2">
                      <Stethoscope className="h-8 w-8 text-accent mx-auto" />
                      <h4 className="text-lg font-bold text-accent">{frequentCid}</h4>
                      <p className="text-[10px] text-muted-foreground">
                        Código dominante no período. O monitoramento epidemiológico do Período Aquisitivo ajuda a propor melhorias de ergonomia (como em casos de dorsalgia e lombalgia na equipe de enfermagem).
                      </p>
                    </div>
                  </div>
                )}

                {/* F. TAXA DE ABSENTEÍSMO */}
                {activeModal === 'absent' && (
                  <div className="space-y-3 text-center py-4">
                    <Percent className="h-10 w-10 text-amber-500 mx-auto" />
                    <h3 className="text-lg font-bold text-amber-500">{absenteismoRate}</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      A taxa de absenteísmo calcula o percentual de dias de trabalho perdidos em relação ao total planejado para a equipe. Taxas abaixo de 3.0% indicam excelente engajamento e alta qualidade laboral na UPA Zilda Arns.
                    </p>
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

function StatCard({ icon: Icon, label, value, color, subtitle, onClick }) {
  const bg = { 
    teal: 'bg-primary/10 text-primary', 
    red: 'bg-destructive/10 text-destructive', 
    purple: 'bg-purple-500/10 text-purple-500', 
    yellow: 'bg-warning/10 text-warning',
    blue: 'bg-accent/10 text-accent',
    amber: 'bg-amber-500/10 text-amber-500'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="cursor-pointer active:scale-[0.98] select-none hover:shadow-md transition-all group"
    >
      <Card className="hover:border-primary/40 transition-colors shadow-sm h-full">
        <CardContent className="p-4 flex items-center gap-3 h-full">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${bg[color] || bg.teal} flex-shrink-0 group-hover:scale-105 transition-transform duration-200`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground whitespace-nowrap">{label}</p>
            <p className="text-lg font-bold mt-0.5">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
