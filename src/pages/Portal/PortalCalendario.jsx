import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { LogOut, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format, isBefore, startOfToday, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PortalCalendario({ employee, onLogout }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [requests, setRequests] = useState([]);
  const [shiftRequests, setShiftRequests] = useState([]);

  // Limite de pessoas de folga por plantão (Pode ser configurável no admin, usando 1 por padrão)
  const MAX_OFF_PER_SHIFT = 1;

  const fetchData = async () => {
    setFetching(true);
    try {
      const today = new Date();
      const nextMonth = addMonths(today, 1);
      
      const start = startOfMonth(today).toISOString();
      const end = endOfMonth(addMonths(today, 2)).toISOString();

      // Busca as solicitações DESTE funcionário
      const { data: myReqs, error: err1 } = await supabase
        .from('time_off_requests')
        .select('*')
        .eq('employee_id', employee.id)
        .gte('requested_date', start)
        .lte('requested_date', end);

      if (err1) throw err1;
      setRequests(myReqs || []);

      // Busca solicitações de TODOS do mesmo plantão para calcular a trava
      const { data: allReqs, error: err2 } = await supabase
        .from('time_off_requests')
        .select('*, employees!inner(shift_type)')
        .eq('employees.shift_type', employee.shift_type)
        .gte('requested_date', start)
        .lte('requested_date', end);

      if (err2) throw err2;
      setShiftRequests(allReqs || []);

    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar o calendário.');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [employee]);

  const handleRequestTimeOff = async () => {
    if (!selectedDate) return;

    setLoading(true);
    try {
      // Usamos toLocaleDateString('en-CA') para pegar YYYY-MM-DD no fuso local e evitar problemas de timezone
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const { error } = await supabase
        .from('time_off_requests')
        .insert({
          employee_id: employee.id,
          requested_date: dateStr,
          status: 'pending'
        });

      if (error) {
        // Trata duplicidade se tivermos constraint
        if (error.code === '23505') {
            toast.error('Você já solicitou folga para este dia!');
        } else {
            throw error;
        }
      } else {
        toast.success('Folga solicitada com sucesso!');
        setSelectedDate(null);
        fetchData(); // Recarrega
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao solicitar folga.');
    } finally {
      setLoading(false);
    }
  };

  // Função que determina quais dias estão bloqueados no calendário
  const disabledDays = (date) => {
    // 1. Bloqueia dias no passado
    if (isBefore(date, startOfToday())) return true;

    const dateStr = format(date, 'yyyy-MM-dd');

    // 2. Bloqueia se o próprio funcionário já pediu folga nesse dia
    const alreadyRequested = requests.some(r => r.requested_date === dateStr);
    if (alreadyRequested) return true;

    // 3. A TRAVA: Bloqueia se o limite do plantão foi atingido
    const shiftReqsOnDate = shiftRequests.filter(r => r.requested_date === dateStr);
    if (shiftReqsOnDate.length >= MAX_OFF_PER_SHIFT) return true;

    return false;
  };

  // Modificadores de CSS para o calendário
  const modifiers = {
    requested: (date) => requests.some(r => r.requested_date === format(date, 'yyyy-MM-dd')),
    blocked: (date) => {
       if (isBefore(date, startOfToday())) return false; // passado ignora
       const dateStr = format(date, 'yyyy-MM-dd');
       // Não marca como bloqueado se for o meu pedido
       if (requests.some(r => r.requested_date === dateStr)) return false;
       // Marca como vermelho se estourou a trava
       const shiftReqsOnDate = shiftRequests.filter(r => r.requested_date === dateStr);
       return shiftReqsOnDate.length >= MAX_OFF_PER_SHIFT;
    }
  };

  const modifiersStyles = {
    requested: { backgroundColor: '#10b981', color: 'white' }, // Verde esmeralda
    blocked: { backgroundColor: '#ef4444', color: 'white', opacity: 0.5 }, // Vermelho
  };

  return (
    <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 text-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">{employee.name}</CardTitle>
          <p className="text-sm text-zinc-400">{employee.role} • {employee.shift_type}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onLogout} className="text-zinc-400 hover:text-white">
          <LogOut className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <div className="bg-zinc-950 p-4 rounded-xl flex justify-center border border-zinc-800">
          {fetching ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : (
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={disabledDays}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              locale={ptBR}
              className="text-white"
            />
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-zinc-400 justify-center">
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div> Suas Folgas</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 opacity-50 rounded-full"></div> Limite Atingido (Trava)</div>
        </div>

        <Button 
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-4" 
          disabled={!selectedDate || loading}
          onClick={handleRequestTimeOff}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <CalendarIcon className="h-4 w-4 mr-2" />
          )}
          {selectedDate ? `Solicitar folga dia ${format(selectedDate, 'dd/MM/yyyy')}` : 'Selecione um dia'}
        </Button>
      </CardContent>
    </Card>
  );
}
