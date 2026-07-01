const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserX, UserCheck, EyeOff, Pencil, UserPlus, X, Save, RefreshCw, Search, FileHeart, Filter, Clock, Users, Activity, FileText, Sun, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatName, formatPhone, formatCPF, validateCPF } from '@/lib/utils';

const shiftLabels = { diurno_a: 'Diurno A', diurno_b: 'Diurno B', noturno_a: 'Noturno A', noturno_b: 'Noturno B' };
const statusColors = { active: 'bg-success/20 text-success border-success/30', inactive: 'bg-destructive/20 text-destructive border-destructive/30', on_leave: 'bg-warning/20 text-warning border-warning/30' };
const statusLabels = { active: 'Ativo', inactive: 'Inativo', on_leave: 'Afastado' };

export default function Management() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Interaction states
  const [editingEmployee, setEditingEmployee] = useState(null); 
  const [employeeToDelete, setEmployeeToDelete] = useState(null); 
  const [quickCertEmployee, setQuickCertEmployee] = useState(null); 
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL' | 'RT' | 'ENF' | 'TEC'
  const [shiftFilter, setShiftFilter] = useState('ALL'); // 'ALL' | 'diurno_a' | 'diurno_b' | 'noturno_a' | 'noturno_b'
  const [activeFilter, setActiveFilter] = useState(null);

  // Form states for quick certificate
  const [certCid, setCertCid] = useState('');
  const [certDesc, setCertDesc] = useState('');
  const [certDays, setCertDays] = useState('3');
  const [certStartDate, setCertStartDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => db.entities.Employee.list(),
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => db.entities.ScheduleEntry.list('-created_date', 200),
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

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => db.entities.Employee.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Status atualizado com sucesso!' });
    },
  });

  const changeShift = useMutation({
    mutationFn: ({ id, shift_type }) => db.entities.Employee.update(id, { shift_type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Turno atualizado com sucesso!' });
    },
  });

  const updateEmployeeDetails = useMutation({
    mutationFn: ({ id, data }) => db.entities.Employee.update(id, data),
    onSuccess: (emp) => {
      db.entities.AuditLog.create({
        type: 'employee_update',
        description: `Atualizou os dados de ${emp.name}`,
        employee_name: emp.name,
      });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({ title: 'Dados do colaborador atualizados!' });
      setEditingEmployee(null);
    },
  });

  const deleteEmployeeAction = useMutation({
    mutationFn: (id) => db.entities.Employee.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Colaborador excluído com sucesso!' });
    },
  });

  const createQuickCertificate = useMutation({
    mutationFn: async ({ employeeId, name, cid, description, start_date, days }) => {
      const end = new Date(new Date(start_date).getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      await db.entities.MedicalCertificate.create({
        employee_id: employeeId,
        employee_name: name,
        cid,
        description,
        start_date,
        end_date: end,
        days: parseInt(days),
        created_date: new Date().toISOString()
      });

      await db.entities.Employee.update(employeeId, { status: 'on_leave' });

      await db.entities.AuditLog.create({
        type: 'certificate',
        description: `Registrou atestado de ${days} dias para ${name} (CID: ${cid || '—'})`,
        employee_name: name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({ title: 'Atestado cadastrado e colaborador afastado!' });
      
      setQuickCertEmployee(null);
      setCertCid('');
      setCertDesc('');
      setCertDays('3');
    }
  });

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingEmployee) return;

    if (editingEmployee.cpf && !validateCPF(editingEmployee.cpf)) {
      toast({
        title: 'CPF Inválido',
        description: 'Por favor, digite um CPF válido para salvar as alterações.',
        variant: 'destructive'
      });
      return;
    }

    updateEmployeeDetails.mutate({
      id: editingEmployee.id,
      data: {
        name: editingEmployee.name,
        cpf: editingEmployee.cpf,
        role: editingEmployee.role,
        coren: editingEmployee.coren,
        work_hours: editingEmployee.work_hours,
        sector: editingEmployee.sector,
        shift_type: editingEmployee.shift_type,
        status: editingEmployee.status
      }
    });
  };

  const handleCertSubmit = (e) => {
    e.preventDefault();
    if (!quickCertEmployee) return;
    createQuickCertificate.mutate({
      employeeId: quickCertEmployee.id,
      name: quickCertEmployee.name,
      cid: certCid,
      description: certDesc,
      start_date: certStartDate,
      days: certDays
    });
  };

  // Filter & Search Logic
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Search check
      const matchesSearch = 
        emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        emp.coren?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.sector?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      // Role check
      const role = emp.role?.toUpperCase().trim();
      if (roleFilter === 'RT') {
        const isRt = role === 'RES.TECNICA' || role === 'LIDERANÇA';
        if (!isRt) return false;
      } else if (roleFilter === 'ENF') {
        const isEnf = role === 'ENFERMEIRA' || role === 'ENFERMEIRO';
        if (!isEnf) return false;
      } else if (roleFilter === 'TEC') {
        const isTec = role === 'TEC.ENF' || role === 'AUX.ENF';
        if (!isTec) return false;
      }

      // Shift check
      if (shiftFilter !== 'ALL') {
        if (emp.shift_type !== shiftFilter) return false;
      }

      // Apply active KPI card filter
      if (activeFilter === 'has_shifts') {
        const schedule = schedules.find(s => s.employee_name?.trim() === emp.name?.trim());
        const hasShifts = schedule && Object.values(schedule.days || {}).includes('P');
        if (!hasShifts) return false;
      }
      if (activeFilter === 'diurno') {
        const isDiurno = emp.shift_type?.includes('diurno');
        if (!isDiurno) return false;
      }
      if (activeFilter === 'has_atestado') {
        const schedule = schedules.find(s => s.employee_name?.trim() === emp.name?.trim());
        const hasAtestado = schedule && Object.values(schedule.days || {}).includes('AT');
        if (!hasAtestado) return false;
      }
      if (activeFilter === 'on_leave') {
        if (emp.status !== 'on_leave') return false;
      }
      if (activeFilter === 'has_vacation') {
        const schedule = schedules.find(s => s.employee_name?.trim() === emp.name?.trim());
        const hasVacation = schedule && Object.values(schedule.days || {}).includes('V');
        if (!hasVacation) return false;
      }
      
      return true;
    });
  }, [employees, schedules, searchQuery, roleFilter, shiftFilter, activeFilter]);

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold">Gerenciamento</h1>
          <p className="text-sm text-muted-foreground">Gerencie status, turnos e colaboradores</p>
        </div>
        <Button 
          onClick={() => navigate('/novo')}
          className="flex items-center gap-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          Registrar Novo Colaborador
        </Button>
      </motion.div>

      {/* Cards de Métricas Rápidas em Linha Única com Filtros Interativos */}
      <motion.div 
        initial={{ opacity: 0, y: -5 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.05 }}
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

      {/* Filter and Search Bar containing the marked RED space! */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card border border-border p-4 rounded-xl shadow-sm"
      >
        {/* Left: Search Input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Pesquisar por nome, coren..." 
            value={searchQuery}
            onChange={e => setSearchQuery(formatName(e.target.value))}
            className="w-full h-9 pl-9 pr-4 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-card-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Center: Shift Filters (The RED box space!) */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border self-start lg:self-auto">
          <button 
            onClick={() => setShiftFilter(shiftFilter === 'diurno_a' ? 'ALL' : 'diurno_a')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              shiftFilter === 'diurno_a' 
                ? 'bg-success/15 text-success border border-success/30 font-bold' 
                : 'border border-transparent text-muted-foreground hover:text-card-foreground'
            }`}
          >
            Diurno A
          </button>
          <button 
            onClick={() => setShiftFilter(shiftFilter === 'diurno_b' ? 'ALL' : 'diurno_b')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              shiftFilter === 'diurno_b' 
                ? 'bg-success/15 text-success border border-success/30 font-bold' 
                : 'border border-transparent text-muted-foreground hover:text-card-foreground'
            }`}
          >
            Diurno B
          </button>
          <button 
            onClick={() => setShiftFilter(shiftFilter === 'noturno_a' ? 'ALL' : 'noturno_a')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              shiftFilter === 'noturno_a' 
                ? 'bg-accent/15 text-accent border border-accent/30 font-bold' 
                : 'border border-transparent text-muted-foreground hover:text-card-foreground'
            }`}
          >
            Noturno A
          </button>
          <button 
            onClick={() => setShiftFilter(shiftFilter === 'noturno_b' ? 'ALL' : 'noturno_b')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              shiftFilter === 'noturno_b' 
                ? 'bg-accent/15 text-accent border border-accent/30 font-bold' 
                : 'border border-transparent text-muted-foreground hover:text-card-foreground'
            }`}
          >
            Noturno B
          </button>
        </div>

        {/* Right: Quick Role Filters */}
        <div className="flex flex-wrap items-center gap-1.5 self-start lg:self-auto">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Filtrar:
          </span>
          <button 
            onClick={() => setRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              roleFilter === 'ALL' 
                ? 'bg-primary/10 border-primary text-primary' 
                : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
            }`}
          >
            Todos ({employees.length})
          </button>
          <button 
            onClick={() => setRoleFilter('RT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              roleFilter === 'RT' 
                ? 'bg-purple-500/10 border-purple-500 text-purple-500' 
                : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
            }`}
          >
            RT & Liderança
          </button>
          <button 
            onClick={() => setRoleFilter('ENF')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              roleFilter === 'ENF' 
                ? 'bg-teal-600/10 border-teal-600 text-teal-600 dark:text-teal-400' 
                : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
            }`}
          >
            Enfermeiros
          </button>
          <button 
            onClick={() => setRoleFilter('TEC')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              roleFilter === 'TEC' 
                ? 'bg-blue-600/10 border-blue-600 text-blue-600 dark:text-blue-400' 
                : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
            }`}
          >
            Técnicos & Aux.
          </button>
        </div>
      </motion.div>

      {/* Main Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.1 }} 
        className="bg-card rounded-xl border border-border overflow-hidden shadow-sm"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Nome</TableHead>
                <TableHead className="font-semibold">CPF</TableHead>
                <TableHead className="font-semibold">Função</TableHead>
                <TableHead className="font-semibold">COREN</TableHead>
                <TableHead className="font-semibold">Turno</TableHead>
                <TableHead className="font-semibold">Horário</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-xs">
                    {employees.length === 0 
                      ? 'Nenhum colaborador registrado.' 
                      : 'Nenhum resultado encontrado para a busca/filtro selecionado.'
                    }
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map(emp => (
                  <TableRow key={emp.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-xs py-3 max-w-[200px] truncate">
                      <div>
                        <p className="font-semibold text-card-foreground">{emp.name}</p>
                        <span className="text-[10px] text-muted-foreground block truncate">{emp.sector || 'Sem Setor'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] font-semibold border-muted-foreground/30">
                        {emp.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{emp.cpf || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{emp.coren || '-'}</TableCell>
                    <TableCell>
                      <Select
                        value={emp.shift_type}
                        onValueChange={v => changeShift.mutate({ id: emp.id, shift_type: v })}
                      >
                        <SelectTrigger className="h-7 text-xs w-28 font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diurno_a">Diurno A</SelectItem>
                          <SelectItem value="diurno_b">Diurno B</SelectItem>
                          <SelectItem value="noturno_a">Noturno A</SelectItem>
                          <SelectItem value="noturno_b">Noturno B</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{emp.work_hours || '-'}</TableCell>
                    <TableCell>
                      <Badge className={`text-[9px] font-bold border ${statusColors[emp.status || 'active']}`}>
                        {statusLabels[emp.status || 'active']}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex gap-1 justify-end">
                        {/* 1. Edit Action */}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 hover:bg-primary/10 hover:text-primary transition-colors" 
                          onClick={() => setEditingEmployee({ ...emp })}
                          title="Editar cadastro"
                        >
                          <Pencil className="h-3.5 w-3.5 text-primary" />
                        </Button>

                        {/* 2. Quick Medical Certificate Action */}
                        {emp.status === 'active' && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive transition-colors" 
                            onClick={() => {
                              setQuickCertEmployee(emp);
                              setCertCid('');
                              setCertDesc('');
                            }}
                            title="Registrar Atestado Médico"
                          >
                            <FileHeart className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}

                        {/* 3. Leave Toggle Action */}
                        {emp.status !== 'active' ? (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 hover:bg-success/10" 
                            onClick={() => updateStatus.mutate({ id: emp.id, status: 'active' })}
                            title="Reativar / Voltar de Afastamento"
                          >
                            <UserCheck className="h-3.5 w-3.5 text-success" />
                          </Button>
                        ) : (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 hover:bg-warning/10" 
                            onClick={() => updateStatus.mutate({ id: emp.id, status: 'on_leave' })}
                            title="Afastar colaborador"
                          >
                            <EyeOff className="h-3.5 w-3.5 text-warning" />
                          </Button>
                        )}

                        {/* 4. Inactivate Action */}
                        {emp.status !== 'inactive' && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 hover:bg-destructive/10" 
                            onClick={() => updateStatus.mutate({ id: emp.id, status: 'inactive' })}
                            title="Inativar colaborador"
                          >
                            <UserX className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}

                        {/* 5. Delete Action */}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 hover:bg-red-500/10 text-red-500 hover:text-red-600 transition-colors" 
                          onClick={() => setEmployeeToDelete(emp)}
                          title="Excluir colaborador"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>

      {/* Edit Details Overlay Modal */}
      <AnimatePresence>
        {editingEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingEmployee(null)}
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
                  <Pencil className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-bold text-card-foreground">Editar Dados do Colaborador</h2>
                </div>
                <button 
                  onClick={() => setEditingEmployee(null)} 
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Nome Completo</label>
                    <input 
                      type="text" 
                      required
                      value={editingEmployee.name} 
                      onChange={e => setEditingEmployee({ ...editingEmployee, name: formatName(e.target.value) })}
                      className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={editingEmployee.cpf && editingEmployee.cpf.length === 14 && !validateCPF(editingEmployee.cpf) ? "text-[10px] uppercase font-bold text-destructive tracking-wider" : "text-[10px] uppercase font-bold text-muted-foreground tracking-wider"}>CPF</label>
                    <input 
                      type="text" 
                      value={editingEmployee.cpf || ''} 
                      onChange={e => setEditingEmployee({ ...editingEmployee, cpf: formatCPF(e.target.value) })}
                      placeholder="000.000.000-00"
                      className={`w-full h-9 rounded-lg border bg-card px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary ${
                        editingEmployee.cpf && editingEmployee.cpf.length === 14 && !validateCPF(editingEmployee.cpf) ? "border-destructive focus-visible:ring-destructive" : "border-border"
                      }`}
                    />
                    {editingEmployee.cpf && editingEmployee.cpf.length === 14 && !validateCPF(editingEmployee.cpf) && (
                      <p className="text-[10px] text-destructive mt-1 font-semibold">CPF inválido</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Telefone / WhatsApp</label>
                  <input 
                    type="text" 
                    value={editingEmployee.phone || ''} 
                    onChange={e => setEditingEmployee({ ...editingEmployee, phone: formatPhone(e.target.value) })}
                    placeholder="(11) 99999-9999"
                    className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">COREN</label>
                    <input 
                      type="text" 
                      required
                      value={editingEmployee.coren} 
                      onChange={e => setEditingEmployee({ ...editingEmployee, coren: e.target.value })}
                      className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Função</label>
                    <select 
                      value={editingEmployee.role}
                      onChange={e => setEditingEmployee({ ...editingEmployee, role: e.target.value })}
                      className="w-full h-9 rounded-lg border border-border bg-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="RES.TECNICA">RT (Responsável Técnica)</option>
                      <option value="LIDERANÇA">Liderança</option>
                      <option value="ENFERMEIRA">Enfermeira</option>
                      <option value="ENFERMEIRO">Enfermeiro</option>
                      <option value="TEC.ENF">Técnico de Enfermagem</option>
                      <option value="AUX.ENF">Auxiliar de Enfermagem</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Setor</label>
                    <input 
                      type="text" 
                      required
                      value={editingEmployee.sector || ''} 
                      onChange={e => setEditingEmployee({ ...editingEmployee, sector: formatName(e.target.value) })}
                      className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Horário de Trabalho</label>
                    <input 
                      type="text" 
                      required
                      value={editingEmployee.work_hours} 
                      onChange={e => setEditingEmployee({ ...editingEmployee, work_hours: e.target.value })}
                      className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Turno Padrão</label>
                    <select 
                      value={editingEmployee.shift_type}
                      onChange={e => setEditingEmployee({ ...editingEmployee, shift_type: e.target.value })}
                      className="w-full h-9 rounded-lg border border-border bg-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="diurno_a">Diurno A</option>
                      <option value="diurno_b">Diurno B</option>
                      <option value="noturno_a">Noturno A</option>
                      <option value="noturno_b">Noturno B</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Status Cadastral</label>
                    <select 
                      value={editingEmployee.status}
                      onChange={e => setEditingEmployee({ ...editingEmployee, status: e.target.value })}
                      className="w-full h-9 rounded-lg border border-border bg-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="active">Ativo</option>
                      <option value="on_leave">Afastado (Licença)</option>
                      <option value="inactive">Inativo</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingEmployee(null)}
                    className="text-xs h-9 px-4"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    size="sm"
                    disabled={updateEmployeeDetails.isPending}
                    className="text-xs h-9 px-4 bg-primary text-primary-foreground flex items-center gap-1.5"
                  >
                    {updateEmployeeDetails.isPending ? (
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

      {/* Quick Medical Certificate Modal */}
      <AnimatePresence>
        {quickCertEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuickCertEmployee(null)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-10"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2 text-destructive">
                  <FileHeart className="h-4 w-4" />
                  <h2 className="text-sm font-bold text-card-foreground">Lançar Atestado Rápido</h2>
                </div>
                <button 
                  onClick={() => setQuickCertEmployee(null)} 
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCertSubmit} className="p-6 space-y-4">
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Colaborador Selecionado</span>
                  <p className="text-xs font-bold text-card-foreground mt-0.5">{quickCertEmployee.name}</p>
                  <span className="text-[10px] text-muted-foreground">Coren: {quickCertEmployee.coren} · Setor: {quickCertEmployee.sector || 'Sem Setor'}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">CID-10</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: M54.5"
                      value={certCid} 
                      onChange={e => setCertCid(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Dias de Afastamento</label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      max="90"
                      value={certDays} 
                      onChange={e => setCertDays(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Data de Início</label>
                  <input 
                    type="date" 
                    required
                    value={certStartDate} 
                    onChange={e => setCertStartDate(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Diagnóstico / Observações</label>
                  <textarea 
                    rows="3"
                    required
                    placeholder="Descrição do sintoma ou justificativa médica..."
                    value={certDesc} 
                    onChange={e => setCertDesc(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card p-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setQuickCertEmployee(null)}
                    className="text-xs h-9 px-4"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    size="sm"
                    disabled={createQuickCertificate.isPending}
                    className="text-xs h-9 px-4 bg-destructive hover:bg-destructive/90 text-destructive-foreground flex items-center gap-1.5 shadow-sm"
                  >
                    {createQuickCertificate.isPending ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileHeart className="h-3.5 w-3.5" />
                    )}
                    Afastar e Registrar
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Custom Delete Confirmation Modal */}
        {employeeToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEmployeeToDelete(null)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-10 p-6"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-card-foreground">Excluir Colaborador</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tem certeza que deseja excluir <strong>{employeeToDelete.name}</strong>? Essa ação não poderá ser desfeita.
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setEmployeeToDelete(null)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="button" 
                    variant="destructive"
                    className="flex-1 gap-2"
                    disabled={deleteEmployeeAction.isPending}
                    onClick={() => {
                      deleteEmployeeAction.mutate(employeeToDelete.id);
                      setEmployeeToDelete(null);
                    }}
                  >
                    {deleteEmployeeAction.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Sim, Excluir
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}