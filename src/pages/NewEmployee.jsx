const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function NewEmployee() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '', role: 'TEC.ENF', coren: '', shift_type: 'diurno_a',
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
      setForm({ name: '', role: 'TEC.ENF', coren: '', shift_type: 'diurno_a', work_hours: '07:00 as 19:00', sector: '', cycle: 'par', contract_type: '', status: 'active' });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createEmployee.mutate(form);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Novo Colaborador</h1>
        <p className="text-sm text-muted-foreground">Adicione um novo profissional à escala</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4 text-primary" />
              Dados do Colaborador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>Nome Completo</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Nome do colaborador" />
                </div>
                <div>
                  <Label>Função</Label>
                  <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ENFERMEIRA">Enfermeira</SelectItem>
                      <SelectItem value="ENFERMEIRO">Enfermeiro</SelectItem>
                      <SelectItem value="TEC.ENF">Téc. Enfermagem</SelectItem>
                      <SelectItem value="AUX.ENF">Aux. Enfermagem</SelectItem>
                      <SelectItem value="RES.TECNICA">Resp. Técnica</SelectItem>
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
                  <Input value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} placeholder="Ex: Emergência" />
                </div>
                <div>
                  <Label>Contrato</Label>
                  <Input value={form.contract_type} onChange={e => setForm({ ...form, contract_type: e.target.value })} placeholder="CLT, Estatutário..." />
                </div>
              </div>
              <Button type="submit" className="w-full gap-2" disabled={createEmployee.isPending}>
                <Check className="h-4 w-4" />
                {createEmployee.isPending ? 'Salvando...' : 'Adicionar Colaborador'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}