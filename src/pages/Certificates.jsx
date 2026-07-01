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
import { Plus, FileHeart, X, Search, Calendar, Trash2, HeartPulse, ShieldAlert, Award, Stethoscope, Percent, Pencil, CheckCircle2, Save, RefreshCw, Copy, Printer } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const typeLabels = { 
  AT: 'Atestado Médico', 
  LM: 'Licença Maternidade', 
  LTS: 'Licença Tratamento Saúde', 
  LS: 'Licença Saúde' 
};

const COLORS = ['hsl(173,58%,39%)', 'hsl(262,52%,47%)', 'hsl(199,89%,48%)', 'hsl(43,74%,66%)', 'hsl(0,72%,51%)'];

// Helper function to normalize strings for accent-insensitive comparison
const normalizeName = (name) => {
  if (!name) return '';
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim();
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

export default function Certificates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState(null); // 'total' | 'dias' | 'media' | 'afastados' | 'cid' | 'absent' | null
  const [editingCert, setEditingCert] = useState(null); // MedicalCertificate | null
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'delete' | 'complete', cert: any } | null
  
  const [form, setForm] = useState({ 
    employee_name: '', 
    type: 'AT', 
    cid: '', 
    start_date: new Date().toISOString().split('T')[0], 
    end_date: calculateEndDate(new Date().toISOString().split('T')[0], 3), 
    days_count: 3, 
    notes: '' 
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => db.entities.MedicalCertificate.list('-created_date'),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => db.entities.Employee.list(),
  });

  const createCert = useMutation({
    mutationFn: async (data) => {
      const { days_count, notes, type, ...payload } = data;
      const days = parseInt(data.days_count || data.days || 0);
      const created = await db.entities.MedicalCertificate.create({
        ...payload,
        days: days,
        description: `[${typeLabels[type] || type || 'Atestado'}] ${notes || data.description || ''}`.trim(),
        created_date: new Date().toISOString()
      });

      // Find employee accent-insensitively
      const normCertName = normalizeName(data.employee_name);
      const emp = employees.find(e => normalizeName(e.name) === normCertName);
      if (emp) {
        await db.entities.Employee.update(emp.id, { status: 'on_leave' });
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({ title: 'Atestado registrado e colaborador afastado!' });
      setShowForm(false);
      setForm({ 
        employee_name: '', 
        type: 'AT', 
        cid: '', 
        start_date: new Date().toISOString().split('T')[0], 
        end_date: calculateEndDate(new Date().toISOString().split('T')[0], 3), 
        days_count: 3, 
        notes: '' 
      });
    },
    onError: (err) => {
      toast({ 
        title: 'Erro ao registrar atestado', 
        description: err.message, 
        variant: 'destructive' 
      });
    }
  });

  const updateCert = useMutation({
    mutationFn: async (data) => {
      const { days_count, notes, type, ...payload } = data;
      const days = parseInt(data.days_count || data.days || 0);
      const updated = await db.entities.MedicalCertificate.update(data.id, {
        ...payload,
        days: days,
        description: `[${typeLabels[type] || type || 'Atestado'}] ${notes || data.description || ''}`.trim()
      });

      // Find employee accent-insensitively
      const normCertName = normalizeName(data.employee_name);
      const emp = employees.find(e => normalizeName(e.name) === normCertName);
      if (emp) {
        await db.entities.Employee.update(emp.id, { status: 'on_leave' });
      }
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({ title: 'Atestado atualizado com sucesso!' });
      setEditingCert(null);
    },
    onError: (err) => {
      toast({ 
        title: 'Erro ao atualizar atestado', 
        description: err.message, 
        variant: 'destructive' 
      });
    }
  });

  const deleteCert = useMutation({
    mutationFn: async (id) => {
      // Find certificate loosely by ID comparison
      const cert = certificates.find(c => c.id == id || c.id?.toString() === id?.toString());
      if (cert) {
        // Find employee accent-insensitively
        const normCertName = normalizeName(cert.employee_name);
        const emp = employees.find(e => normalizeName(e.name) === normCertName);
        if (emp) {
          await db.entities.Employee.update(emp.id, { status: 'active' });
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
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({ title: 'Atestado removido com sucesso!' });
    },
    onError: (err) => {
      toast({ 
        title: 'Erro ao remover atestado', 
        description: err.message, 
        variant: 'destructive' 
      });
    }
  });

  const completeCertEarly = useMutation({
    mutationFn: async (cert) => {
      const todayStr = new Date().toISOString().split('T')[0];
      
      await db.entities.MedicalCertificate.update(cert.id, {
        end_date: todayStr,
        description: (cert.notes || cert.description || '') + ` [Retorno Antecipado em ${format(new Date(), 'dd/MM/yyyy')}]`
      });

      // Find employee accent-insensitively
      const normCertName = normalizeName(cert.employee_name);
      const emp = employees.find(e => normalizeName(e.name) === normCertName);
      if (emp) {
        await db.entities.Employee.update(emp.id, { status: 'active' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({ title: 'Afastamento encerrado e colaborador reativado!' });
    },
    onError: (err) => {
      toast({ 
        title: 'Erro ao encerrar atestado', 
        description: err.message, 
        variant: 'destructive' 
      });
    }
  });

  // Calculate dynamic stats
  const totalDays = useMemo(() => {
    return certificates.reduce((acc, cert) => acc + (parseInt(cert.days_count || cert.days || 0)), 0);
  }, [certificates]);

  const mediaDays = useMemo(() => {
    if (certificates.length === 0) return 0;
    return (totalDays / certificates.length).toFixed(1);
  }, [certificates, totalDays]);

  const activeLeaves = useMemo(() => {
    return employees.filter(e => e.status === 'on_leave').length;
  }, [employees]);

  // Frequent CID calculations
  const frequentCid = useMemo(() => {
    if (certificates.length === 0) return 'Nenhum';
    const cids = {};
    certificates.forEach(c => {
      if (c.cid) cids[c.cid] = (cids[c.cid] || 0) + 1;
    });
    const sorted = Object.entries(cids).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : 'Nenhum';
  }, [certificates]);

  // Absenteísmo rate (estimated: certificate days / total scheduled month workdays)
  const absenteismoRate = useMemo(() => {
    if (employees.length === 0) return '0.0%';
    const totalMonthWorkdays = employees.length * 15; // 15 workdays on average per CLT/12x36 employee
    return ((totalDays / totalMonthWorkdays) * 100).toFixed(2) + '%';
  }, [employees, totalDays]);

  // Calculations for dynamic Recharts charts
  const roleAbsenceData = useMemo(() => {
    const dist = {};
    certificates.forEach(cert => {
      const emp = employees.find(e => normalizeName(e.name) === normalizeName(cert.employee_name));
      const role = emp ? emp.role : 'Outros';
      const days = parseInt(cert.days_count || cert.days || 0);
      dist[role] = (dist[role] || 0) + days;
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [certificates, employees]);

  const certTypeData = useMemo(() => {
    const dist = {};
    certificates.forEach(cert => {
      const type = typeLabels[cert.type] || cert.type || 'Atestado';
      dist[type] = (dist[type] || 0) + 1;
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [certificates]);

  // Filtered List
  const filteredCertificates = useMemo(() => {
    return certificates.filter(c => 
      c.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.cid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.notes?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [certificates, searchQuery]);

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingCert) return;
    updateCert.mutate(editingCert);
  };

  // Helper to copy certificate details to clipboard
  const handleCopy = (cert) => {
    const daysVal = cert.days_count || cert.days || 0;
    const text = `📋 *Atestado Médico / Licença - UPA Zilda Arns*\n` +
                 `• Colaborador: ${cert.employee_name}\n` +
                 `• Tipo: ${typeLabels[cert.type] || cert.type}\n` +
                 `• CID-10: ${cert.cid || 'N/A'}\n` +
                 `• Período: ${format(new Date(cert.start_date), 'dd/MM/yyyy')} a ${format(new Date(cert.end_date), 'dd/MM/yyyy')} (${daysVal} dias)\n` +
                 `• Observações: ${cert.notes || cert.description || 'Nenhuma'}`;
    
    navigator.clipboard.writeText(text);
    toast({ 
      title: 'Ficha Copiada!', 
      description: 'Resumo formatado copiado para enviar via WhatsApp/E-mail.' 
    });
  };

  // Helper to trigger print of the certificates table
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
          <h1 className="text-2xl font-bold">Atestados e Licenças</h1>
          <p className="text-sm text-muted-foreground">Gerencie afastamentos, CID-10 e licenças médicas</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm">
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? 'Cancelar' : 'Registrar Novo Atestado'}
        </Button>
      </motion.div>

      {/* 1. Dynamic 6-Stats Clickable Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard 
          icon={FileHeart} 
          label="Total Ocorrências" 
          value={certificates.length} 
          color="teal" 
          subtitle="Registros de Junho" 
          onClick={() => setActiveModal('total')}
        />
        <StatCard 
          icon={Calendar} 
          label="Total Dias Perdidos" 
          value={`${totalDays} dias`} 
          color="red" 
          subtitle="Ausências acum." 
          onClick={() => setActiveModal('dias')}
        />
        <StatCard 
          icon={Award} 
          label="Média de Dias" 
          value={`${mediaDays} dias`} 
          color="purple" 
          subtitle="Por atestado" 
          onClick={() => setActiveModal('media')}
        />
        <StatCard 
          icon={ShieldAlert} 
          label="Colaboradores Afast." 
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
          subtitle="CID-10 dominante" 
          onClick={() => setActiveModal('cid')}
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
                  Lançar Novo Atestado Médico / Licença
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <form onSubmit={e => { e.preventDefault(); createCert.mutate(form); }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold tracking-wide">Colaborador</Label>
                      <select 
                        required
                        value={form.employee_name} 
                        onChange={e => setForm({ ...form, employee_name: e.target.value })}
                        className="w-full h-9 rounded-lg border border-border bg-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Selecione um profissional...</option>
                        {employees.map(e => <option key={e.id} value={e.name}>{e.name} ({e.role})</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold tracking-wide">Tipo de Afastamento</Label>
                      <select 
                        required
                        value={form.type} 
                        onChange={e => setForm({ ...form, type: e.target.value })}
                        className="w-full h-9 rounded-lg border border-border bg-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold tracking-wide">CID-10 / Diagnóstico</Label>
                      <Input 
                        placeholder="Ex: M54.5" 
                        value={form.cid || ''} 
                        onChange={e => setForm({ ...form, cid: e.target.value })}
                        className="h-9 text-xs" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold tracking-wide">Dias de Afastamento</Label>
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
                      <Label className="text-[10px] uppercase font-bold tracking-wide">Data Início</Label>
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
                      <Label className="text-[10px] uppercase font-bold tracking-wide">Data Fim</Label>
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
                    <Label className="text-[10px] uppercase font-bold tracking-wide">Observações Médicas / Justificativa</Label>
                    <Textarea 
                      placeholder="Descreva observações, nome do médico emissor ou detalhes adicionais..."
                      value={form.notes} 
                      onChange={e => setForm({ ...form, notes: e.target.value })} 
                      rows={2} 
                      className="text-xs resize-none"
                    />
                  </div>

                  <Button type="submit" disabled={createCert.isPending} className="w-full text-xs font-semibold h-9 bg-primary text-primary-foreground hover:bg-primary/95 transition-all">
                    {createCert.isPending ? 'Registrando...' : 'Confirmar e Afastar Colaborador'}
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
              placeholder="Pesquisar atestados por nome ou CID..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
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
              {filteredCertificates.length} de {certificates.length} registros
            </span>
          </div>
        </div>

        {/* Clean printable title, hidden on screen, visible only when printing */}
        <div className="hidden print:block border-b border-black pb-3 mb-4">
          <h2 className="text-lg font-bold text-black">Relatório de Afastamentos e Licenças Médicas</h2>
          <p className="text-xs text-slate-600 mt-1">UPA Zilda Arns · Gerado em {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Colaborador</TableHead>
                <TableHead className="font-semibold">Tipo</TableHead>
                <TableHead className="font-semibold">CID-10</TableHead>
                <TableHead className="font-semibold">Período</TableHead>
                <TableHead className="font-semibold">Dias</TableHead>
                <TableHead className="font-semibold">Observações / Diagnóstico</TableHead>
                <TableHead className="font-semibold text-right pr-6 no-print">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCertificates.map(cert => {
                const daysVal = cert.days_count || cert.days || 0;
                
                return (
                  <TableRow key={cert.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-semibold text-xs py-3">{cert.employee_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] font-semibold border-muted-foreground/30">
                        {typeLabels[cert.type] || cert.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono font-bold text-destructive">{cert.cid || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {cert.start_date ? format(new Date(cert.start_date), 'dd/MM/yyyy') : '-'} a {cert.end_date ? format(new Date(cert.end_date), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-card-foreground">{daysVal} dias</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate print:max-w-none print:whitespace-normal" title={cert.notes || cert.description}>
                      {cert.notes || cert.description || '—'}
                    </TableCell>
                    <TableCell className="text-right pr-6 no-print">
                      <div className="flex gap-1 justify-end">
                        {/* 1. Copy Ficha Details Action */}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          onClick={() => handleCopy(cert)}
                          title="Copiar resumo da ficha para WhatsApp/Email"
                        >
                          <Copy className="h-3.5 w-3.5 text-slate-500" />
                        </Button>

                        {/* 2. Edit Action */}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={() => setEditingCert({ ...cert })}
                          title="Editar detalhes do atestado"
                        >
                          <Pencil className="h-3.5 w-3.5 text-primary" />
                        </Button>

                        {/* 3. Return Early Action */}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                          onClick={() => setConfirmAction({ type: 'complete', cert })}
                          title="Encerrar afastamento / Retorno Antecipado"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                        </Button>

                        {/* 4. Delete Action */}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive transition-colors"
                          onClick={() => setConfirmAction({ type: 'delete', cert })}
                          title="Remover atestado"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredCertificates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-10">
                    Nenhum atestado médico correspondente encontrado.
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
            <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Principais Tipos de Ausência</CardTitle></CardHeader>
            <CardContent>
              <div className="h-60 flex flex-col justify-between">
                {certTypeData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sem dados suficientes para exibição.</div>
                ) : (
                  <>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={certTypeData} 
                            cx="50%" 
                            cy="50%" 
                            innerRadius={45} 
                            outerRadius={75} 
                            paddingAngle={3} 
                            dataKey="value" 
                            animationDuration={1500}
                          >
                            {certTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                      {certTypeData.map((item, i) => (
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

      {/* 5. Edit Medical Certificate Modal Overlay */}
      <AnimatePresence>
        {editingCert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingCert(null)}
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
                  <h2 className="text-sm font-bold text-card-foreground">Editar Detalhes do Atestado</h2>
                </div>
                <button 
                  onClick={() => setEditingCert(null)} 
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Colaborador</span>
                  <p className="text-xs font-bold text-card-foreground mt-0.5">{editingCert.employee_name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold tracking-wide">Tipo de Afastamento</Label>
                    <select 
                      value={editingCert.type} 
                      onChange={e => setEditingCert({ ...editingCert, type: e.target.value })}
                      className="w-full h-9 rounded-lg border border-border bg-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold tracking-wide">CID-10</Label>
                    <Input 
                      placeholder="Ex: M54.5" 
                      value={editingCert.cid || ''} 
                      onChange={e => setEditingCert({ ...editingCert, cid: e.target.value })}
                      className="h-9 text-xs" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold tracking-wide">Dias</Label>
                    <Input 
                      type="number" 
                      required
                      min="1"
                      value={editingCert.days_count || editingCert.days || ''} 
                      onChange={e => {
                        const days = parseInt(e.target.value) || 0;
                        setEditingCert({ ...editingCert, days_count: days, days: days, end_date: calculateEndDate(editingCert.start_date, days) });
                      }}
                      className="h-9 text-xs" 
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold tracking-wide">Data Início</Label>
                    <Input 
                      type="date" 
                      required
                      value={editingCert.start_date} 
                      onChange={e => {
                        const start = e.target.value;
                        const days = editingCert.days_count || editingCert.days || 0;
                        setEditingCert({ ...editingCert, start_date: start, end_date: calculateEndDate(start, days) });
                      }}
                      className="h-9 text-xs" 
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold tracking-wide">Data Fim</Label>
                    <Input 
                      type="date" 
                      required
                      value={editingCert.end_date} 
                      onChange={e => setEditingCert({ ...editingCert, end_date: e.target.value })}
                      className="h-9 text-xs" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold tracking-wide">Observações / Justificativa</Label>
                  <Textarea 
                    value={editingCert.notes || editingCert.description || ''} 
                    onChange={e => setEditingCert({ ...editingCert, notes: e.target.value, description: e.target.value })} 
                    rows={3} 
                    className="text-xs resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-end gap-2 text-right">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingCert(null)}
                    className="text-xs h-9 px-4"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    size="sm"
                    disabled={updateCert.isPending}
                    className="text-xs h-9 px-4 bg-primary text-primary-foreground flex items-center gap-1.5 shadow-sm"
                  >
                    {updateCert.isPending ? (
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
                    {confirmAction.type === 'delete' ? 'Remover Atestado?' : 'Confirmar Retorno?'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {confirmAction.type === 'delete' 
                      ? `Tem certeza que deseja excluir o atestado de ${confirmAction.cert.employee_name}?`
                      : `Deseja registrar o retorno antecipado de ${confirmAction.cert.employee_name} ao trabalho hoje?`}
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
                      deleteCert.mutate(confirmAction.cert.id);
                    } else {
                      completeCertEarly.mutate(confirmAction.cert);
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

      {/* 7. Atestados Glassmorphic Detail Modals */}
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
                  {activeModal === 'cid' && <Stethoscope className="h-5 w-5 text-accent" />}
                  {activeModal === 'absent' && <Percent className="h-5 w-5 text-amber-500" />}
                  <h2 className="text-sm font-bold text-card-foreground">
                    {activeModal === 'total' && 'Ocorrências por Tipo'}
                    {activeModal === 'dias' && 'Afastamento Acumulado por Pessoa'}
                    {activeModal === 'media' && 'Análise de Média de Dias'}
                    {activeModal === 'afastados' && 'Profissionais Afastados da Escala'}
                    {activeModal === 'cid' && 'Distribuição de Diagnósticos (CID-10)'}
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
                    <p className="text-xs text-muted-foreground">Distribuição total das ocorrências ativas em Junho 2026:</p>
                    <div className="space-y-2">
                      {certTypeData.map((item, i) => (
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
                      {certificates.map(c => {
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
                    <h3 className="text-lg font-bold text-purple-500">{mediaDays} dias por atestado</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Esta média indica a gravidade dos atestados médicos apresentados. Atestados acima de 15 dias consecutivos exigem encaminhamento da UPA Zilda Arns para perícia médica oficial no INSS.
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
                {activeModal === 'cid' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Distribuição de diagnósticos médicos por código CID-10:</p>
                    <div className="bg-muted/40 p-4 rounded-xl border border-border text-center space-y-2">
                      <Stethoscope className="h-8 w-8 text-accent mx-auto" />
                      <h4 className="text-lg font-bold text-accent">{frequentCid}</h4>
                      <p className="text-[10px] text-muted-foreground">
                        Código dominante no período. O monitoramento epidemiológico do CID-10 ajuda a propor melhorias de ergonomia (como em casos de dorsalgia e lombalgia na equipe de enfermagem).
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