const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, X, Maximize2, ShieldOff, ShieldCheck, Printer, Download, User, ShieldAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ScheduleGrid from '@/components/schedule/ScheduleGrid';
import LegendBar from '@/components/schedule/LegendBar';
import { useAuth } from '@/lib/AuthContext';
import { useScheduleUnlock } from '@/hooks/useScheduleUnlock';

const SHIFT_TABS = [
  { value: 'todos', label: 'Todos os Turnos' },
  { value: 'diurno_a', label: 'Diurno A' },
  { value: 'noturno_a', label: 'Noturno A' },
  { value: 'diurno_b', label: 'Diurno B' },
  { value: 'noturno_b', label: 'Noturno B' },
];

export default function Schedule() {
  const [shiftType, setShiftType] = useState('todos');
  const [open, setOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(6);
  const [selectedYear, setSelectedYear] = useState(2026);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { unlocked, loading: unlockLoading, toggle: toggleUnlock } = useScheduleUnlock();
  const isAdmin = user?.role === 'admin';

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleUnlockClick = () => {
    if (unlocked) {
      toggleUnlock(user);
    } else {
      setUsername('');
      setPassword('');
      setAuthError('');
      setIsAuthModalOpen(true);
    }
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setAuthError('Preencha todos os campos!');
      return;
    }
    const userLower = username.trim().toLowerCase();
    const pass = password.trim();
    
    if (userLower === 'admin' && (pass === 'upa123' || pass === 'admin')) {
      toggleUnlock(user);
      setIsAuthModalOpen(false);
    } else {
      setAuthError('Usuário ou senha incorretos!');
    }
  };

  const { data: entries = [], isLoading: isEntriesLoading } = useQuery({
    queryKey: ['schedules', selectedMonth, selectedYear],
    queryFn: () => db.entities.ScheduleEntry.filter({ month: selectedMonth, year: selectedYear }),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => db.entities.Employee.list(),
  });

  const handleUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['schedules', selectedMonth, selectedYear] });
  };

  const handleLockToggle = async () => {
    const shiftEntries = shiftType === 'todos' ? entries : entries.filter(e => e.shift_type === shiftType);
    const anyUnlocked = shiftEntries.some(e => !e.locked);
    // Batch in groups of 5 to avoid rate limit
    const chunks = [];
    for (let i = 0; i < shiftEntries.length; i += 5) {
      chunks.push(shiftEntries.slice(i, i + 5));
    }
    for (const chunk of chunks) {
      await Promise.all(chunk.map(entry =>
        db.entities.ScheduleEntry.update(entry.id, { locked: anyUnlocked })
      ));
    }

    const label = shiftType === 'todos' ? 'todos os turnos' : 
                  shiftType === 'diurno_a' ? 'Diurno A' :
                  shiftType === 'diurno_b' ? 'Diurno B' :
                  shiftType === 'noturno_a' ? 'Noturno A' : 'Noturno B';
    await db.entities.AuditLog.create({
      type: 'lock_toggle',
      description: `${anyUnlocked ? 'Bloqueou' : 'Desbloqueou'} a escala do turno ${label}`,
      employee_name: user?.name || 'Administrador',
    });

    handleUpdate();
  };

  const currentEntries = shiftType === 'todos' ? entries : entries.filter(e => e.shift_type === shiftType);
  const allLocked = currentEntries.length > 0 && currentEntries.every(e => e.locked);

  return (
    <>
      {/* Card normal na página */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center gap-6 py-16 no-print">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Escala de Enfermagem</h1>
          <p className="text-sm text-muted-foreground mt-1">Escala Dinâmica — UPA Zilda Arns</p>
        </div>
        <Button size="lg" onClick={() => setOpen(true)} className="gap-2 text-base px-8 py-6">
          <Maximize2 className="h-5 w-5" />
          Abrir Escala Completa
        </Button>
      </motion.div>

      {/* Modal fullscreen */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background flex flex-col"
          >
            {/* Dynamic CSS Print Injections */}
            <style>{`
              /* Set landscape at the top-level (forces and locks browser preview to landscape automatically!) */
              @page {
                size: landscape;
                margin: 4mm;
              }

              @media print {
                @page {
                  size: landscape;
                  margin: 4mm;
                }
                
                /* Hide sidebar and all other interactive page elements */
                .no-print,
                aside,
                [role="tablist"],
                header,
                nav {
                  display: none !important;
                }
                
                /* Reset layout bounds and allow full size print expansion */
                html, body, #root, .h-screen, main, .h-full, .flex-1 {
                  background-color: #fff !important;
                  color: #000 !important;
                  height: auto !important;
                  overflow: visible !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  box-shadow: none !important;
                }
                
                /* Reset sidebar margin on main wrapper */
                main {
                  margin-left: 0 !important;
                }
                
                /* Fullscreen modal reset for printing flow */
                .fixed.inset-0 {
                  position: static !important;
                  display: block !important;
                  background-color: #fff !important;
                  color: #000 !important;
                  z-index: auto !important;
                  width: 100% !important;
                  height: auto !important;
                  overflow: visible !important;
                }
                
                .flex-1.overflow-auto {
                  overflow: visible !important;
                  height: auto !important;
                  min-height: 0 !important;
                }
                
                /* Table size adjustments for A4 landscape fitting */
                table {
                  width: 100% !important;
                  table-layout: auto !important;
                  border-collapse: collapse !important;
                  font-size: 6px !important;
                }
                
                th, td {
                  border: 1px solid #666 !important;
                  padding: 0.5px 1px !important;
                  font-size: 5.5px !important;
                  line-height: 1.05 !important;
                }
                
                /* Override sticky columns in print mode to align cleanly */
                .sticky.left-0 {
                  position: static !important;
                  background-color: transparent !important;
                }

                /* LegendBar print optimizations */
                .bg-card.rounded-xl.border.border-border.p-4 {
                  border: none !important;
                  padding: 0 !important;
                  background: transparent !important;
                  box-shadow: none !important;
                }
                
                .bg-card.rounded-xl.border.border-border.p-4 h4 {
                  display: none !important;
                }
                
                .flex.flex-wrap.gap-2 {
                  gap: 3px !important;
                }
                
                /* Retain badge colors */
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              }
            `}</style>

            {/* Header do modal */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card flex-shrink-0 no-print">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                    <SelectTrigger className="w-[120px] h-7 text-xs font-bold border-none bg-muted/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
                        <SelectItem key={i+1} value={String(i+1)} className="text-xs">{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-[80px] h-7 text-xs font-bold border-none bg-muted/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      {[2026, 2027, 2028, 2029, 2030].map(y => (
                        <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Tabs value={shiftType} onValueChange={setShiftType}>
                  <TabsList className="bg-muted h-7">
                    {SHIFT_TABS.map(tab => (
                      <TabsTrigger key={tab.value} value={tab.value} className="text-[11px] h-6 px-3">
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Button
                    variant={unlocked ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={handleUnlockClick}
                    disabled={unlockLoading}
                    className="gap-1.5 h-7 text-xs"
                    title={unlocked ? 'Folgas extras habilitadas — clique para bloquear' : 'Folgas extras bloqueadas — clique para liberar'}
                  >
                    {unlocked ? <ShieldCheck className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
                    {unlocked ? 'Escala Destravada' : 'Destravar Escala'}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 h-7 text-xs no-print border-destructive/20 hover:bg-destructive/5 text-destructive font-semibold">
                  <Download className="h-3.5 w-3.5" />
                  Baixar PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 h-7 text-xs no-print">
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir
                </Button>
                <Button variant="outline" size="sm" onClick={handleLockToggle} className="gap-1.5 h-7 text-xs no-print">
                  {allLocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {allLocked ? 'Desbloquear' : 'Bloquear Mês'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-7 w-7 p-0 no-print">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tabela ocupa todo o espaço */}
            <div className="flex-1 overflow-auto min-h-0 relative">
              {isEntriesLoading && (
                <div className="absolute inset-0 z-50 bg-background/50 flex flex-col items-center justify-center backdrop-blur-sm">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                  <p className="text-sm font-medium">Projetando escala...</p>
                </div>
              )}
              <ScheduleGrid
                entries={entries}
                employees={employees}
                daysInMonth={new Date(selectedYear, selectedMonth, 0).getDate()}
                month={selectedMonth}
                year={selectedYear}
                shiftType={shiftType}
                onUpdate={handleUpdate}
                extraLeavesUnlocked={unlocked}
              />
            </div>

            {/* Legenda compacta */}
            <div className="flex-shrink-0 border-t border-border">
              <LegendBar />
            </div>
          </motion.div>
        )}

        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Glassmorphic Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />

            {/* Modal Content container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col z-10 p-6"
            >
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="absolute top-4 right-4 rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors text-xs"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Lock className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-card-foreground">Liberar Folgas Extras</h3>
                  <p className="text-xs text-muted-foreground">Insira as credenciais administrativas para habilitar os itens verdes da escala.</p>
                </div>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4 mt-6">
                <div className="space-y-1 text-left">
                  <Label htmlFor="auth-username" className="text-[10px] uppercase font-bold tracking-wide">Usuário</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="auth-username"
                      type="text"
                      placeholder="admin"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-9 h-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <Label htmlFor="auth-password" className="text-[10px] uppercase font-bold tracking-wide">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="auth-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 h-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {authError && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-medium text-left"
                    >
                      <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                      <span>{authError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAuthModalOpen(false)}
                    className="flex-1 text-xs h-9"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/95 shadow"
                  >
                    Confirmar
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}