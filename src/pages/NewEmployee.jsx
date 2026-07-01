const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Check, X, Eraser } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatName, formatPhone, formatCPF, validateCPF } from '@/lib/utils';

export default function NewEmployee() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '', cpf: '', phone: '', role: 'TEC.ENF', coren: '', shift_type: 'diurno_a',
    work_hours: '07:00 as 19:00', sector: '', cycle: 'par', contract_type: '', status: 'active',
  });

  const createEmployee = useMutation({
    mutationFn: (data) => db.entities.Employee.create(data),
    onSuccess: async (emp) => {
      // Auto-generate schedule entry
      const days = {};
      const startDay = form.cycle === 'par' ? 1 : 2;
      for (let d = 1; d <= 30; d++) {
        const dayIndex = d - startDay;
        if (dayIndex >= 0 && dayIndex % 2 === 0) {
          days[String(d)] = 'P';
        } else if (dayIndex >= 0) {
          days[String(d)] = 'F';
        }
      }
      await db.entities.ScheduleEntry.create({
        employee_id: emp.id,
        employee_name: form.name,
        month: 6,
        year: 2026,
        shift_type: form.shift_type,
        days,
        locked: false,
      });
      
      await db.entities.AuditLog.create({
        type: 'employee_create',
        description: `Adicionou o colaborador ${emp.name} (${emp.role})`,
        employee_name: emp.name,
      });

      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({ title: 'Colaborador adicionado com sucesso!' });
      
      // Auto-limpa o formulário para o próximo cadastro
      setForm({
        name: '', cpf: '', phone: '', role: 'TEC.ENF', coren: '', shift_type: 'diurno_a',
        work_hours: '07:00 as 19:00', sector: '', cycle: 'par', contract_type: '', status: 'active',
      });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao adicionar colaborador', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (form.cpf && !validateCPF(form.cpf)) {
      toast({
        title: 'CPF Inválido',
        description: 'Por favor, digite um CPF válido.',
        variant: 'destructive'
      });
      return;
    }
    
    createEmployee.mutate(form);
  };

  const handleClear = () => {
    setForm({
      name: '', cpf: '', phone: '', role: 'TEC.ENF', coren: '', shift_type: 'diurno_a',
      work_hours: '07:00 as 19:00', sector: '', cycle: 'par', contract_type: '', status: 'active',
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Novo Colaborador</h1>
        <p className="text-sm text-muted-foreground">Adicione um novo profissional à escala</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="relative">
          <button
            type="button"
            onClick={() => navigate('/gerenciamento')}
            className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4 text-primary" />
              Dados do Colaborador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Nome Completo</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: formatName(e.target.value) })} required placeholder="Nome do colaborador" />
                </div>
                <div>
                  <Label className={form.cpf && form.cpf.length === 14 && !validateCPF(form.cpf) ? "text-destructive" : ""}>CPF</Label>
                  <Input 
                    value={form.cpf} 
                    onChange={e => setForm({ ...form, cpf: formatCPF(e.target.value) })} 
                    placeholder="000.000.000-00" 
                    className={form.cpf && form.cpf.length === 14 && !validateCPF(form.cpf) ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {form.cpf && form.cpf.length === 14 && !validateCPF(form.cpf) && (
                    <p className="text-[10px] text-destructive mt-1 font-semibold">CPF inválido</p>
                  )}
                </div>
                <div>
                  <Label>Telefone / WhatsApp</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="(11) 99999-9999" />
                </div>
                <div>
                  <Label>Função</Label>
                  <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RES.TECNICA">Resp. Técnica</SelectItem>
                      <SelectItem value="LIDERANÇA">Liderança</SelectItem>
                      <SelectItem value="ENFERMEIRA">Enfermeira</SelectItem>
                      <SelectItem value="ENFERMEIRO">Enfermeiro</SelectItem>
                      <SelectItem value="TEC.ENF">Téc. Enfermagem</SelectItem>
                      <SelectItem value="AUX.ENF">Aux. Enfermagem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>COREN</Label>
                  <Input value={form.coren} onChange={e => setForm({ ...form, coren: e.target.value })} placeholder="Nº COREN" />
                </div>
                <div>
                  <Label>Turno</Label>
                  <Select value={form.shift_type} onValueChange={v => setForm({ ...form, shift_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diurno_a">Diurno A</SelectItem>
                      <SelectItem value="diurno_b">Diurno B</SelectItem>
                      <SelectItem value="noturno_a">Noturno A</SelectItem>
                      <SelectItem value="noturno_b">Noturno B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Horário</Label>
                  <Input value={form.work_hours} onChange={e => setForm({ ...form, work_hours: e.target.value })} placeholder="07:00 as 19:00" />
                </div>
                <div>
                  <Label>Ciclo (12x36)</Label>
                  <Select value={form.cycle} onValueChange={v => setForm({ ...form, cycle: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="par">Par (dias 1, 3, 5...)</SelectItem>
                      <SelectItem value="impar">Ímpar (dias 2, 4, 6...)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Setor</Label>
                  <Input value={form.sector} onChange={e => setForm({ ...form, sector: formatName(e.target.value) })} placeholder="Ex: Emergência" />
                </div>
                <div>
                  <Label>Contrato</Label>
                  <Input value={form.contract_type} onChange={e => setForm({ ...form, contract_type: formatName(e.target.value) })} placeholder="CLT, Estatutário..." />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/40 mt-4">
                <Button type="button" variant="ghost" className="w-full sm:w-auto gap-2 text-muted-foreground" onClick={handleClear}>
                  <Eraser className="h-4 w-4" />
                  Limpar
                </Button>
                <div className="flex-1" />
                <Button type="button" variant="outline" className="w-full sm:w-auto gap-2" onClick={() => navigate('/gerenciamento')}>
                  <X className="h-4 w-4" />
                  Fechar
                </Button>
                <Button type="submit" className="w-full sm:w-auto gap-2" disabled={createEmployee.isPending}>
                  <Check className="h-4 w-4" />
                  {createEmployee.isPending ? 'Salvando...' : 'Adicionar Colaborador'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}