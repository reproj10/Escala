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
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

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

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleGeneratePDF = async () => {
    const input = document.getElementById("print-area-container");
    if (!input) {
      toast.error("Erro ao localizar container de impressão.");
      return;
    }

    try {
      setIsGeneratingPDF(true);
      toast.info("Preparando escala e gerando visualização em PDF...");

      // Select inner wrappers to force horizontal expansion and bypass scroll bounds
      const tableWrapper = input.querySelector(".overflow-x-auto");
      const borderWrapper = input.querySelector(".border.rounded-xl");
      
      // Backup original styles
      const originalInputStyle = input.style.cssText;
      const originalTableWrapperStyle = tableWrapper ? tableWrapper.style.cssText : "";
      const originalBorderWrapperStyle = borderWrapper ? borderWrapper.style.cssText : "";

      // Apply robust inline overrides to force full landscape scaling
      input.style.setProperty("width", "1450px", "important");
      input.style.setProperty("min-width", "1450px", "important");
      input.style.setProperty("max-width", "none", "important");
      input.style.setProperty("height", "auto", "important");
      input.style.setProperty("overflow", "visible", "important");

      if (tableWrapper) {
        tableWrapper.style.setProperty("overflow", "visible", "important");
        tableWrapper.style.setProperty("width", "auto", "important");
        tableWrapper.style.setProperty("max-width", "none", "important");
      }

      if (borderWrapper) {
        borderWrapper.style.setProperty("overflow", "visible", "important");
      }

      // Allow DOM repaint
      await new Promise(r => setTimeout(r, 400));

      const canvas = await html2canvas(input, {
        scale: 2.2, // high quality
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 1450,
        windowWidth: 1500
      });

      // Restore original styles
      input.style.cssText = originalInputStyle;
      if (tableWrapper) tableWrapper.style.cssText = originalTableWrapperStyle;
      if (borderWrapper) borderWrapper.style.cssText = originalBorderWrapperStyle;

      const imgData = canvas.toDataURL("image/png");
      
      // Standard landscape A4 PDF orientation
      const pdf = new jsPDF('l', 'mm', 'a4');

      const pageWidth = 297; // A4 landscape width in mm
      const pageHeight = 210; // A4 landscape height in mm
      
      // Scale proportionally to fit within 297x210 mm bounds
      let imgWidth = pageWidth - 10; // 5mm margin on left/right
      let imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight > (pageHeight - 10)) {
        imgHeight = pageHeight - 10; // 5mm margin on top/bottom
        imgWidth = (canvas.width * imgHeight) / canvas.height;
      }

      // Center the image perfectly on the landscape A4 page
      const xOffset = (pageWidth - imgWidth) / 2;
      const yOffset = (pageHeight - imgHeight) / 2;

      pdf.addImage(imgData, "PNG", xOffset, yOffset, imgWidth, imgHeight);

      // Open in new tab
      const pdfBlob = pdf.output("bloburl");
      window.open(pdfBlob, "_blank");

      toast.success("Visualização gerada com sucesso! Verifique a nova aba.");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Ocorreu um erro ao processar o PDF de visualização.");
    } finally {
      setIsGeneratingPDF(false);
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
            className="fixed inset-0 z-[100] bg-background flex flex-col print-modal-container"
          >
            {/* Dynamic CSS Print Injections */}
            <style>{`
              @page {
                size: landscape;
                margin: 5mm 8mm;
              }
              @media print {
                @page {
                  size: landscape;
                  margin: 5mm 8mm;
                }
                
                /* Reset HTML, body, root, main and panels to allow natural document flow */
                html, body, #root, #root > div, main, .h-screen, .h-full, .flex-1 {
                  background-color: #fff !important;
                  color: #000 !important;
                  height: auto !important;
                  max-height: none !important;
                  overflow: visible !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                
                /* Hide everything except the modal content */
                body * {
                  visibility: hidden !important;
                }
                
                /* Make the modal print container and all its children visible */
                .print-modal-container,
                .print-modal-container * {
                  visibility: visible !important;
                }
                
                /* Position the print-modal-container perfectly at the top-left */
                .print-modal-container {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  background-color: #fff !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  box-shadow: none !important;
                }
                
                /* Hide all UI elements that have the no-print class */
                .no-print {
                  display: none !important;
                  height: 0 !important;
                  width: 0 !important;
                  overflow: hidden !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  border: none !important;
                }
                
                /* Layout container resets to avoid physical page cuts */
                .flex-1.overflow-y-auto,
                .overflow-x-auto,
                .overflow-y-auto {
                  overflow: visible !important;
                  max-height: none !important;
                  height: auto !important;
                  width: 100% !important;
                }
                
                /* Force modal card white/black background/text resets */
                .bg-background.shadow-2xl {
                  background-color: #fff !important;
                  color: #000 !important;
                  border: none !important;
                }
                
                /* Fit table fully onto landscape width */
                table {
                  width: 100% !important;
                  min-width: 0 !important;
                  table-layout: fixed !important;
                  border-collapse: collapse !important;
                }
                
                /* Reset borders and pad slightly smaller */
                th, td {
                  font-size: 7px !important;
                  padding: 3px 1.5px !important;
                  height: auto !important;
                  border: 1px solid #94a3b8 !important;
                  text-align: center !important;
                  color: #000 !important;
                }
                
                /* Colaborador Name Column */
                th:first-child, td:first-child {
                  width: 155px !important;
                  min-width: 155px !important;
                  position: static !important;
                  box-shadow: none !important;
                  background-color: #fff !important;
                  font-size: 7.5px !important;
                  font-weight: 900 !important;
                  text-align: left !important;
                  padding-left: 6px !important;
                }
                
                th {
                  background-color: #f1f5f9 !important;
                  font-weight: bold !important;
                }
                
                /* Ensure weekend columns have light backgrounds */
                .bg-red-50 {
                  background-color: #f8fafc !important;
                }
                
                /* Force colors to print */
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }

                /* Avoid breaks inside rows */
                tr {
                  page-break-inside: avoid !important;
                }
                
                /* Signature Block display */
                .print-signature {
                  display: block !important;
                  page-break-inside: avoid !important;
                  margin-top: 30px !important;
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleGeneratePDF} 
                  disabled={isGeneratingPDF}
                  className="gap-1.5 h-7 text-xs no-print border-indigo-200 hover:bg-indigo-50/50 dark:border-indigo-900/50 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-semibold"
                >
                  <Download className="h-3.5 w-3.5" />
                  {isGeneratingPDF ? "Gerando..." : "Visualizar PDF (Paisagem)"}
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.print()} 
                  className="gap-1.5 h-7 text-xs no-print border-emerald-200 hover:bg-emerald-50/50 dark:border-emerald-900/50 dark:hover:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-semibold"
                >
                  <Printer className="h-3.5 w-3.5 text-emerald-500" />
                  Imprimir Escala
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
            <div id="print-area-container" className="flex-1 overflow-auto min-h-0 relative bg-background p-4 print:p-0">
              {/* Print Only Header */}
              <div className="hidden print:block text-center border-b pb-4 mb-4">
                <h1 className="text-lg font-black uppercase text-slate-900">UPA - Unidade de Pronto Atendimento</h1>
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mt-0.5">
                  Escala de Trabalho Mensal - Enfermagem
                </h2>
                <p className="text-[10px] font-mono text-slate-500 mt-1">
                  Mês de Referência: {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][selectedMonth - 1]} / {selectedYear}
                </p>
              </div>

              {isEntriesLoading && (
                <div className="absolute inset-0 z-50 bg-background/50 flex flex-col items-center justify-center backdrop-blur-sm no-print">
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

              {/* Print Footer Area (Legend + Signature) */}
              <div className="hidden print:block mt-6 space-y-6">
                {/* Legend Replica for Printing */}
                <div className="p-4 bg-white border border-slate-300 rounded-xl">
                  <LegendBar />
                </div>

                {/* Print Signature Footer Block */}
                <div className="pt-6 border-t border-slate-350 print-signature">
                  <div className="w-full flex items-center justify-between px-16">
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Data de Emissão:</span>
                      <span className="text-xs font-semibold text-slate-900 border-b border-dotted border-black w-32 h-5 text-center mt-1">
                        ____ / ____ / ________
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-center gap-1.5 min-w-[280px]">
                      <div className="w-full border-b border-black h-5" />
                      <span className="text-[11.5px] font-black text-slate-900 uppercase tracking-wider text-center">
                        Renata Ap. Bueno Pereira
                      </span>
                      <span className="text-[9.5px] font-bold text-slate-600 uppercase tracking-wide text-center">
                        Enfermeira Responsável Técnica (RT)
                      </span>
                      <span className="text-[9px] font-mono font-bold text-slate-500 text-center">
                        COREN-SP 484843
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Legenda compacta */}
            <div className="flex-shrink-0 border-t border-border no-print">
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