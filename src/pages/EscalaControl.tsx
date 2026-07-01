// @ts-nocheck
import React, { useState, useEffect, useMemo, Component, useRef } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import db from "@/api/dbClient";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  CalendarDays, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  UserPlus, 
  Search, 
  Calendar, 
  ArrowRight,
  UserCheck, 
  AlertTriangle,
  FileCheck,
  Building2,
  Briefcase,
  Undo2,
  Trash2,
  Lock,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Award,
  CalendarCheck,
  Check,
  X,
  User,
  Maximize2,
  Minimize2,
  FileSpreadsheet,
  Download,
  Settings,
  ShieldOff,
  Printer,
  Sun,
  MoonStar,
  Settings2,
  MoreHorizontal,
  Edit2,
  ArrowRightLeft,
  Stethoscope
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { useScaleSettings } from "@/hooks/useScaleSettings";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// Define TypeScript structures
export interface StaffMember {
  id: string;
  name: string;
  role: "nurse" | "technician";
  status: "working" | "leave"; // 'working' = Em Plantão, 'leave' = Folga de Direito
}

export interface ShiftGroup {
  id: string; // 'impar_diurno', 'par_diurno', 'impar_noturno', 'par_noturno'
  name: string;
  timing: string;
  type: "ímpar" | "par";
  period: "diurno" | "noturno";
  staff: StaffMember[];
  authorizedByManager: boolean;
  authorizedReason?: string;
  authorizedBy?: string;
}

export interface LeaveRequest {
  id: string;
  memberId: string;
  memberName: string;
  memberRole: "nurse" | "technician";
  shiftId: string;
  shiftName: string;
  requestedDay: number; // e.g. Day of May 2026
  justification: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rtApproval?: "pending" | "approved" | "rejected";
  leadApproval?: "pending" | "approved" | "rejected";
}

export interface DayOverride {
  memberId: string;
  day: number;
  status: "duty" | "off-duty" | "default" | "FE" | "FA" | "BH" | "LM";
}

// Pre-seeded robust data simulation 
const initialShifts: ShiftGroup[] = [
  {
    id: "rt_lideranca",
    name: "RT & Liderança 💼",
    timing: "08:00 às 17:00 (Administrativo)",
    type: "par",
    period: "diurno",
    authorizedByManager: true,
    staff: [
      { id: "staff-renata", name: "Renata Pereira", role: "nurse", status: "working" },
      { id: "staff-maria", name: "Maria Eduarda", role: "nurse", status: "working" }
    ]
  },
  {
    id: "impar_diurno",
    name: "Ímpar Diurno",
    timing: "07:00 às 19:00 (Dias Ímpares)",
    type: "ímpar",
    period: "diurno",
    authorizedByManager: false,
    staff: [
      { id: "id-101", name: "Enf. Roberta Mendes", role: "nurse", status: "working" },
      { id: "id-102", name: "Enf. Thiago Santos", role: "nurse", status: "working" },
      { id: "id-103", name: "Téc. Aline Souza", role: "technician", status: "working" },
      { id: "id-104", name: "Téc. Bruno Costa", role: "technician", status: "working" },
      { id: "id-105", name: "Téc. Camila Oliveira", role: "technician", status: "leave" },
      { id: "id-106", name: "Téc. Diego Ramos", role: "technician", status: "working" },
      { id: "id-107", name: "Téc. Eliane Lima", role: "technician", status: "working" }
    ]
  },
  {
    id: "impar_noturno",
    name: "Ímpar Noturno",
    timing: "19:00 às 07:00 (Dias Ímpares)",
    type: "ímpar",
    period: "noturno",
    authorizedByManager: false,
    staff: [
      { id: "id-301", name: "Enf. Kátia Silveira", role: "nurse", status: "working" },
      { id: "id-302", name: "Téc. Leonardo Martins", role: "technician", status: "working" },
      { id: "id-303", name: "Téc. Marina Fontes", role: "technician", status: "working" },
      { id: "id-304", name: "Téc. Nivaldo Silva", role: "technician", status: "working" },
      { id: "id-305", name: "Téc. Otávio Ribeiro", role: "technician", status: "working" },
      { id: "id-306", name: "Téc. Priscila Rocha", role: "technician", status: "working" }
    ]
  },
  {
    id: "par_diurno",
    name: "Par Diurno",
    timing: "07:00 às 19:00 (Dias Pares)",
    type: "par",
    period: "diurno",
    authorizedByManager: false,
    staff: [
      { id: "id-201", name: "Enf. Gabriela Prado", role: "nurse", status: "working" },
      { id: "id-202", name: "Téc. Fábio Melo", role: "technician", status: "working" },
      { id: "id-203", name: "Téc. Giovanna Reis", role: "technician", status: "working" },
      { id: "id-204", name: "Téc. Hudson Ferreira", role: "technician", status: "leave" },
      { id: "id-205", name: "Téc. Isabela Cruz", role: "technician", status: "working" },
      { id: "id-206", name: "Téc. Jefferson Gomes", role: "technician", status: "working" }
    ]
  },
  {
    id: "par_noturno",
    name: "Par Noturno",
    timing: "19:00 às 07:00 (Dias Pares)",
    type: "par",
    period: "noturno",
    authorizedByManager: false,
    staff: [
      { id: "id-401", name: "Enf. Samuel Viana", role: "nurse", status: "working" },
      { id: "id-402", name: "Téc. Quésia Santos", role: "technician", status: "working" },
      { id: "id-403", name: "Téc. Rodrigo Mendes", role: "technician", status: "working" },
      { id: "id-404", name: "Téc. Sandra Moreira", role: "technician", status: "working" },
      { id: "id-405", name: "Téc. Tatiana Cardoso", role: "technician", status: "working" },
      { id: "id-406", name: "Téc. Ueliton Fonseca", role: "technician", status: "working" },
      { id: "id-407", name: "Téc. Valéria Couto", role: "technician", status: "leave" }
    ]
  }
];

// Seeded initial requests to demonstrate the system immediately
const initialRequests: LeaveRequest[] = [
  {
    id: "req-1",
    memberId: "id-103",
    memberName: "Téc. Aline Souza",
    memberRole: "technician",
    shiftId: "impar_diurno",
    shiftName: "Ímpar Diurno",
    requestedDay: 25,
    justification: "Folga adquirida pelo dia trabalhado nas eleições nacionais.",
    status: "pending",
    requestedAt: "2026-05-23T10:00:00Z",
    rtApproval: "approved",
    leadApproval: "pending"
  },
  {
    id: "req-2",
    memberId: "id-201",
    memberName: "Enf. Gabriela Prado",
    memberRole: "nurse",
    shiftId: "par_diurno",
    shiftName: "Par Diurno",
    requestedDay: 26,
    justification: "Compensação de banco de horas (Banco de Horas de Plantão Extra).",
    status: "pending",
    requestedAt: "2026-05-23T14:30:00Z",
    rtApproval: "pending",
    leadApproval: "approved"
  },
  {
    id: "req-3",
    memberId: "id-301",
    memberName: "Enf. Kátia Silveira",
    memberRole: "nurse",
    shiftId: "impar_noturno",
    shiftName: "Ímpar Noturno",
    requestedDay: 27,
    justification: "Direito de folga por doação de sangue anual (Atestado protocolado).",
    status: "pending",
    requestedAt: "2026-05-24T00:15:00Z",
    rtApproval: "pending",
    leadApproval: "pending"
  }
];

class ErrorBoundary extends Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-500/10 border border-red-500 text-red-750 dark:text-red-400 rounded-xl space-y-4 m-6">
          <h2 className="text-lg font-bold">⚠️ Ocorreu um erro ao carregar a página</h2>
          <pre className="text-xs bg-black/80 text-red-400 p-4 rounded-lg overflow-auto max-h-[300px] whitespace-pre-wrap">
            {this.state.error?.stack || this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="px-4 py-2 bg-red-650 text-white rounded-lg hover:bg-red-700 transition-all font-bold text-xs uppercase cursor-pointer"
          >
            Limpar Banco de Dados (Reset LocalStorage) e Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function EscalaControl() {
  const { limits, codes, updateLimits, updateCodes, resetToDefault } = useScaleSettings();
  const queryClient = useQueryClient();
  const printAreaRef = useRef(null);

  // Tabs: "overview" (Quadro & Escalas), "request-portal" (Profissional Escolhe Dias), "approval-desk" (Palavra Final da Gestão), "settings" (Configurações)
  const [activeTab, setActiveTab] = useState<"overview" | "request-portal" | "approval-desk" | "settings">("overview");

  // Month and Year states
  const [selectedMonth, setSelectedMonth] = useState<number>(6);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  const [shifts, setShifts] = useState<ShiftGroup[]>(initialShifts);

  useEffect(() => {
    const loadFromDb = () => {
      Promise.all([
        db.entities.Employee.list(),
        db.entities.ScheduleEntry.filter({ month: selectedMonth, year: selectedYear })
      ]).then(([employees, schedules]) => {
        const newShifts = initialShifts.map(s => {
          const dbShiftType = s.id === 'impar_diurno' ? 'diurno_a' :
                              s.id === 'par_diurno' ? 'diurno_b' :
                              s.id === 'impar_noturno' ? 'noturno_a' :
                              s.id === 'par_noturno' ? 'noturno_b' : 'rt_lideranca';
          
          let shiftEmployees = [];
          if (dbShiftType === 'rt_lideranca') {
            shiftEmployees = employees.filter(e => e.role === 'RES.TECNICA' || e.role === 'LIDERANÇA' || e.name.toLowerCase().includes('maria eduarda'));
          } else {
            shiftEmployees = employees.filter(e => e.shift_type === dbShiftType && e.role !== 'RES.TECNICA' && e.role !== 'LIDERANÇA' && !e.name.toLowerCase().includes('maria eduarda'));
          }
          
          const staff = shiftEmployees.map(emp => {
            const sched = schedules.find(sch => sch.employee_name?.trim() === emp.name?.trim());
            const isNurse = emp.role === 'ENFERMEIRA' || emp.role === 'ENFERMEIRO' || emp.role === 'RES.TECNICA' || emp.role === 'LIDERANÇA';
            
            return {
              id: emp.id,
              name: emp.name,
              role: isNurse ? 'nurse' : 'technician',
              roleCategory: emp.role,
              coren: emp.coren || '—',
              status: 'working',
              days: sched ? sched.days : {}
            };
          });

          return {
            ...s,
            staff
          };
        });
        setShifts(newShifts);
      }).catch(err => {
        console.error("Erro carregando do banco de dados:", err);
      });
    };

    loadFromDb();
    
    window.addEventListener('escala-db-updated', loadFromDb);
    return () => {
      window.removeEventListener('escala-db-updated', loadFromDb);
    };
  }, [selectedMonth, selectedYear]);

  const [requests, setRequests] = useState<LeaveRequest[]>(() => {
    const stored = localStorage.getItem("upa_leave_requests_data");
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { console.error(e); }
    }
    return initialRequests;
  });

  // Target calendars for simulation
  const [selectedDay, setSelectedDay] = useState<number>(24);
  const isSelectedDayOdd = selectedDay % 2 !== 0;

  // Active shift scale highlight state
  const [activeShiftId, setActiveShiftId] = useState<string>("impar_diurno");
  const [searchQuery, setSearchQuery] = useState("");

  const getMonthName = (m: number) => {
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return months[m - 1] || "";
  };

  // Professional modal helper
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"nurse" | "technician">("technician");

  // Global monthly scale view modal states
  const [isGlobalScaleOpen, setIsGlobalScaleOpen] = useState(false);
  const [isGlobalScaleMaximized, setIsGlobalScaleMaximized] = useState(true);
  const [globalRoleFilter, setGlobalRoleFilter] = useState<"all" | "nurse" | "technician">("all");
  const [globalShiftFilter, setGlobalShiftFilter] = useState<string>("impar_diurno");
  const [globalSearch, setGlobalSearch] = useState("");
  const [isExcelMode, setIsExcelMode] = useState(false);
  const [selectedExcelCell, setSelectedExcelCell] = useState<{ memberName: string; day: number; colLetter: string; rowNum: number; status: string } | null>(null);
  const [globalSortField, setGlobalSortField] = useState<"name" | "group" | null>(null);
  const [globalSortDirection, setGlobalSortDirection] = useState<"asc" | "desc">("asc");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  // Estado real de desbloqueio — controla se o calendário permite edições
  const [isMonthUnlocked, setIsMonthUnlocked] = useState(false);
  const [isLockConfirmOpen, setIsLockConfirmOpen] = useState(false);

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setAuthError('Preencha todos os campos!');
      return;
    }
    const userLower = username.trim().toLowerCase();
    const pass = password.trim();
    
    if (userLower === 'admin' && (pass === 'upa123' || pass === 'admin')) {
      toast.success("✅ Mês destravado! Agora você pode selecionar dias de folga.");
      setIsMonthUnlocked(true);
      setIsAuthModalOpen(false);
      setUsername('');
      setPassword('');
      setAuthError('');
    } else {
      setAuthError('Usuário ou senha incorretos!');
    }
  };

  // Ao trocar de mês, trava novamente exigindo nova autenticação
  const handleMonthChange = (newMonth: number, newYear: number) => {
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
    setIsMonthUnlocked(false);
    setCollabRequestDay(1);
    toast.info(`Mês alterado para ${getMonthName(newMonth)} de ${newYear}. Desbloqueie para editar.`);
  };

  const goToPrevMonth = () => {
    if (selectedMonth === 1) handleMonthChange(12, selectedYear - 1);
    else handleMonthChange(selectedMonth - 1, selectedYear);
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) handleMonthChange(1, selectedYear + 1);
    else handleMonthChange(selectedMonth + 1, selectedYear);
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleGeneratePDF = async () => {
    const input = printAreaRef.current;
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

      // Select print-only elements (legend + signature + header) that are hidden by default
      const printOnlyElements = input.querySelectorAll(".pdf-print-footer, .pdf-print-header");
      const hiddenOriginalDisplays: string[] = [];

      // Backup original styles
      const originalInputStyle = input.style.cssText;
      const originalTableWrapperStyle = tableWrapper ? tableWrapper.style.cssText : "";
      const originalBorderWrapperStyle = borderWrapper ? borderWrapper.style.cssText : "";
      const originalScrollLeft = tableWrapper ? tableWrapper.scrollLeft : 0;

      // Add generating-pdf class to show print-only elements and borders during screenshot
      input.classList.add("generating-pdf");

      // Force show the hidden print-only elements
      printOnlyElements.forEach((el: Element) => {
        const htmlEl = el as HTMLElement;
        hiddenOriginalDisplays.push(htmlEl.style.display);
        const isHeader = htmlEl.classList.contains("pdf-print-header");
        htmlEl.style.setProperty("display", isHeader ? "flex" : "block", "important");
      });

      // Temporarily neutralize all parent positioning and transforms to prevent html2canvas offset bugs
      const parentsToUnclip: { el: HTMLElement; overflow: string; position: string; transform: string; display: string; left: string; top: string }[] = [];
      let parentNode = input.parentElement;
      while (parentNode && parentNode !== document.body) {
        parentsToUnclip.push({ 
          el: parentNode, 
          overflow: parentNode.style.overflow,
          position: parentNode.style.position,
          transform: parentNode.style.transform,
          display: parentNode.style.display,
          left: parentNode.style.left,
          top: parentNode.style.top
        });
        parentNode.style.setProperty("overflow", "visible", "important");
        parentNode.style.setProperty("position", "static", "important");
        parentNode.style.setProperty("transform", "none", "important");
        parentNode.style.setProperty("display", "block", "important");
        parentNode.style.setProperty("left", "auto", "important");
        parentNode.style.setProperty("top", "auto", "important");
        parentNode = parentNode.parentElement;
      }

      // Rely on clean CSS-only overrides for position:static, left:auto, and transform:none.

      // Apply robust inline overrides to wrap the table exactly
      // html2canvas crashes with max-content, so we calculate exact pixel width
      const tableEl = input.querySelector("table");
      const exactWidth = tableEl ? tableEl.scrollWidth + 32 : 1800; // 32px for padding
      
      input.style.setProperty("width", `${exactWidth}px`, "important");
      input.style.setProperty("min-width", `${exactWidth}px`, "important");
      input.style.setProperty("max-width", "none", "important");
      input.style.setProperty("height", "auto", "important");
      input.style.setProperty("overflow", "visible", "important");

      if (tableWrapper) {
        tableWrapper.style.setProperty("overflow", "visible", "important");
        tableWrapper.style.setProperty("width", "100%", "important");
        tableWrapper.style.setProperty("max-width", "none", "important");
        tableWrapper.scrollLeft = 0;
      }

      if (borderWrapper) {
        borderWrapper.style.setProperty("overflow", "visible", "important");
      }

      // Allow DOM repaint
      await new Promise(r => setTimeout(r, 500));

      const canvas = await html2canvas(input, {
        scale: 2,       // good quality for the generated image
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: exactWidth,
        windowWidth: exactWidth
      });

      // Restore original styles, scroll position, and class immediately
      input.classList.remove("generating-pdf");
      input.style.cssText = originalInputStyle;
      if (tableWrapper) {
        tableWrapper.style.cssText = originalTableWrapperStyle;
        tableWrapper.scrollLeft = originalScrollLeft;
      }
      if (borderWrapper) borderWrapper.style.cssText = originalBorderWrapperStyle;

      // Restore parent overflow and positioning
      parentsToUnclip.forEach(({ el, overflow, position, transform, display, left, top }) => {
        el.style.overflow = overflow;
        el.style.position = position;
        el.style.transform = transform;
        el.style.display = display;
        el.style.left = left;
        el.style.top = top;
      });

      // Sticky elements are perfectly managed via CSS overrides.

      // Restore hidden print-only elements
      printOnlyElements.forEach((el: Element, i: number) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.display = hiddenOriginalDisplays[i] || "";
      });

      const imgData = canvas.toDataURL("image/png");

      // A4 landscape: 297 x 210 mm
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 5; // 5mm margin all sides

      const maxImgWidth  = pageWidth  - margin * 2; // 287mm
      const maxImgHeight = pageHeight - margin * 2; // 200mm

      // ALWAYS fill full width — the wide canvas ensures height fits within page
      let imgWidth  = maxImgWidth;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Safety: if height still overflows, scale down proportionally
      if (imgHeight > maxImgHeight) {
        const scale = maxImgHeight / imgHeight;
        imgWidth  = imgWidth  * scale;
        imgHeight = maxImgHeight;
      }

      // Center horizontally, align to top with margin
      const xOffset = (pageWidth - imgWidth) / 2;
      const yOffset = margin;

      pdf.addImage(imgData, "PNG", xOffset, yOffset, imgWidth, imgHeight);

      let shiftSuffix = "Geral";
      if (globalShiftFilter === 'impar_diurno') shiftSuffix = 'Diurno_A';
      else if (globalShiftFilter === 'par_diurno') shiftSuffix = 'Diurno_B';
      else if (globalShiftFilter === 'impar_noturno') shiftSuffix = 'Noturno_A';
      else if (globalShiftFilter === 'par_noturno') shiftSuffix = 'Noturno_B';
      const pdfFilename = `Escala_de_Enfermagem_${shiftSuffix}.pdf`;

      try {
        if ('showSaveFilePicker' in window) {
          const pdfBlob = pdf.output('blob');
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: pdfFilename,
            types: [{
              description: 'PDF Document',
              accept: {'application/pdf': ['.pdf']},
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(pdfBlob);
          await writable.close();
          toast.success("PDF salvo no local escolhido!");
        } else {
          // Fallback para navegadores que não suportam a API
          pdf.save(pdfFilename);
          toast.success("PDF baixado com sucesso!");
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("Erro ao salvar usando showSaveFilePicker:", err);
          pdf.save(pdfFilename);
          toast.success("PDF baixado com sucesso!");
        } else {
          toast.info("Salvamento cancelado pelo usuário.");
        }
      }
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Ocorreu um erro ao processar o PDF de visualização.");
    } finally {
      setIsGeneratingPDF(false);
      const cleanInput = printAreaRef.current;
      if (cleanInput) {
        cleanInput.classList.remove("generating-pdf");
      }
    }
  };

  // Collaborator request form states
  const [selectedCollabId, setSelectedCollabId] = useState<string>("");
  const [collabRequestDay, setCollabRequestDay] = useState<number>(25);
  const [collabJustification, setCollabJustification] = useState("");
  const [collabSearchQuery, setCollabSearchQuery] = useState("");
  const [isCollabListExpanded, setIsCollabListExpanded] = useState(false);
  const [collabActiveShiftId, setCollabActiveShiftId] = useState<string>("rt_lideranca");

  // Custom interactive grid overrides and buffers
  const [dayOverrides, setDayOverrides] = useState<DayOverride[]>(() => {
    const stored = localStorage.getItem("upa_day_overrides");
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { console.error(e); }
    }
    return [];
  });

  const [editingCell, setEditingCell] = useState<{
    memberId: string;
    memberName: string;
    memberRole: "nurse" | "technician";
    shiftId: string;
    day: number;
    initialStatus: string;
  } | null>(null);

  const [editingName, setEditingName] = useState("");
  const [editingRole, setEditingRole] = useState<string>("technician");
  const [editingShiftId, setEditingShiftId] = useState("");
  const [editingCellStatus, setEditingCellStatus] = useState<"default" | "duty" | "off-duty" | "leave-approved" | "leave-pending" | "FE" | "FA" | "BH" | "LM">("default");
  const [activeEditTab, setActiveEditTab] = useState("status");

  // Popup de exclusão
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, name: string } | null>(null);

  // Popup de transferência de turno
  const [transferConfirm, setTransferConfirm] = useState<{ id: string, name: string, currentShiftId: string } | null>(null);
  const [transferTargetShift, setTransferTargetShift] = useState<string>("");

  // Popup de histórico
  const [historyModal, setHistoryModal] = useState<{ id: string, name: string, role: string, shiftId: string } | null>(null);

  // Popup de confirmação de 2ª etapa (antes de salvar na escala)
  const [pendingConfirm, setPendingConfirm] = useState<{
    memberName: string;
    memberRole: string;
    shiftName: string;
    day: number;
    statusLabel: string;
    statusCode: string;
    type?: 'success' | 'warning';
    warningMsg?: string;
    // Snapshot do editingCell para ser usado pelo saveCellEdits após o dialog fechar
    snapshotCell: {
      memberId: string;
      memberName: string;
      memberRole: "nurse" | "technician";
      shiftId: string;
      day: number;
      initialStatus: string;
    };
    snapshotStatus: "default" | "duty" | "off-duty" | "leave-approved" | "leave-pending" | "FE" | "FA" | "BH" | "LM";
    snapshotName: string;
    snapshotRole: "nurse" | "technician";
    snapshotShiftId: string;
  } | null>(null);

  // Popup vermelho de alerta de violação de regra
  const [cellAlert, setCellAlert] = useState<{
    memberName: string;
    memberRole: string;
    shiftName: string;
    msg: string;
    snapshotCell: {
      memberId: string;
      memberName: string;
      memberRole: "nurse" | "technician";
      shiftId: string;
      day: number;
      initialStatus: string;
    };
    snapshotStatus: "default" | "duty" | "off-duty" | "leave-approved" | "leave-pending" | "FE" | "FA" | "BH" | "LM";
    snapshotName: string;
    snapshotRole: "nurse" | "technician";
    snapshotShiftId: string;
  } | null>(null);

  // Manage override password simulation
  const [managerSignature, setManagerSignature] = useState("Renata Pereira (Responsável Técnica)");

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("upa_shifts_data_12x36", JSON.stringify(shifts));
  }, [shifts]);

  useEffect(() => {
    localStorage.setItem("upa_leave_requests_data", JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    localStorage.setItem("upa_day_overrides", JSON.stringify(dayOverrides));
  }, [dayOverrides]);

  // Synchronize calendar days logic
  const handleDaySelect = (dayNum: number) => {
    setSelectedDay(dayNum);
    const dayIsOdd = dayNum % 2 !== 0;
    const isNight = activeShiftId.includes("noturno");
    if (dayIsOdd) {
      setActiveShiftId(isNight ? "impar_noturno" : "impar_diurno");
    } else {
      setActiveShiftId(isNight ? "par_noturno" : "par_diurno");
    }
    toast.info(`Slide de Escala: Visualizando Dia ${dayNum} de ${getMonthName(selectedMonth)} (${dayIsOdd ? "ÍMPAR" : "PAR"})`);
  };

  // Active shift
  const currentActiveShift = useMemo(() => {
    return shifts.find(s => s.id === activeShiftId) || shifts[0] || { id: "", name: "", timing: "", staff: [] };
  }, [shifts, activeShiftId]);

  // All professionals database compiled from shifts (sorted so that Renata Pereira - RT is always at the very beginning)
  const allProfessionals = useMemo(() => {
    const arr: { id: string; name: string; role: "nurse" | "technician"; roleCategory: string; coren: string; shiftId: string; shiftName: string; days?: Record<string, string> }[] = [];
    (shifts || []).forEach(s => {
      (s.staff || []).forEach(member => {
        arr.push({
          id: member.id,
          name: member.name,
          role: member.role,
          roleCategory: (member as any).roleCategory || (member.role === 'nurse' ? 'ENFERMEIRA' : 'TEC.ENF'),
          coren: (member as any).coren || '—',
          shiftId: s.id,
          shiftName: s.name,
          days: (member as any).days
        });
      });
    });
    return arr.sort((a, b) => {
      if (a.id === "staff-renata" && b.id !== "staff-renata") return -1;
      if (b.id === "staff-renata" && a.id !== "staff-renata") return 1;
      if (a.id === "staff-maria" && b.id !== "staff-maria") return -1;
      if (b.id === "staff-maria" && a.id !== "staff-maria") return 1;
      return 0;
    });
  }, [shifts]);

  // Autofill colleague selection on tab mount
  useEffect(() => {
    if (allProfessionals.length > 0 && !selectedCollabId) {
      setSelectedCollabId(allProfessionals[0].id);
    }
  }, [allProfessionals, selectedCollabId]);

  // Selected colleague helper
  const selectedCollabObj = useMemo(() => {
    return allProfessionals.find(p => p.id === selectedCollabId);
  }, [allProfessionals, selectedCollabId]);

  // Sync selected group tab when selected colleague changes
  useEffect(() => {
    if (selectedCollabObj && selectedCollabObj.shiftId !== collabActiveShiftId) {
      setCollabActiveShiftId(selectedCollabObj.shiftId);
    }
  }, [selectedCollabId, selectedCollabObj, collabActiveShiftId]);

  const handleSortToggle = (field: "name" | "group") => {
    if (globalSortField === field) {
      if (globalSortDirection === "asc") {
        setGlobalSortDirection("desc");
        toast.info(`Ordenado por ${field === "name" ? "Nome" : "Grupo"} (Decrescente)`);
      } else {
        setGlobalSortField(null);
        toast.info("Ordenação padrão restaurada");
      }
    } else {
      setGlobalSortField(field);
      setGlobalSortDirection("asc");
      toast.info(`Ordenado por ${field === "name" ? "Nome" : "Grupo"} (Crescente)`);
    }
  };

  const renderSortIndicator = (field: "name" | "group") => {
    if (globalSortField !== field) return "";
    return globalSortDirection === "asc" ? " ▲" : " ▼";
  };

  // Filtered list of professionals in global scale view
  const filteredGlobals = useMemo(() => {
    let list = allProfessionals.filter(p => {
      if (globalSearch.trim() && !p.name.toLowerCase().includes(globalSearch.toLowerCase().trim())) {
        return false;
      }
      if (globalRoleFilter !== "all" && p.role !== globalRoleFilter) {
        return false;
      }
      if (globalShiftFilter !== "all" && p.shiftId !== globalShiftFilter) {
        return false;
      }
      return true;
    });

    const getRoleOrder = (role) => {
      const r = String(role || '').toUpperCase().trim();
      if (r === 'RES.TECNICA' || r === 'LIDERANÇA' || r === 'SUPERVISÃO') return 0;
      if (r === 'ENFERMEIRA' || r === 'ENFERMEIRO' || r === 'NURSE') return 1;
      return 2;
    };

    if (globalSortField === "name") {
      list = [...list].sort((a, b) => {
        const comp = a.name.localeCompare(b.name, "pt-BR");
        return globalSortDirection === "asc" ? comp : -comp;
      });
    } else if (globalSortField === "group") {
      list = [...list].sort((a, b) => {
        const comp = a.shiftName.localeCompare(b.shiftName, "pt-BR");
        return globalSortDirection === "asc" ? comp : -comp;
      });
    } else {
      // Default: Role order first, then alphabetical name
      list = [...list].sort((a, b) => {
        const orderA = getRoleOrder(a.roleCategory || (a.id === "staff-renata" ? "RES.TECNICA" : a.id === "staff-maria" ? "LIDERANÇA" : ""));
        const orderB = getRoleOrder(b.roleCategory || (b.id === "staff-renata" ? "RES.TECNICA" : b.id === "staff-maria" ? "LIDERANÇA" : ""));
        if (orderA !== orderB) return orderA - orderB;
        // Tie-breaker: Renata is always first, then Maria, then alphabetical
        if (a.id === "staff-renata" || a.name.includes("Renata Ap. Bueno Pereira")) return -1;
        if (b.id === "staff-renata" || b.name.includes("Renata Ap. Bueno Pereira")) return 1;
        if (a.id === "staff-maria" || a.name.includes("Maria Eduarda")) return -1;
        if (b.id === "staff-maria" || b.name.includes("Maria Eduarda")) return 1;
        return a.name.localeCompare(b.name, "pt-BR");
      });
    }

    return list;
  }, [allProfessionals, globalSearch, globalRoleFilter, globalShiftFilter, globalSortField, globalSortDirection]);

  // Count of staff per shift group (computed from allProfessionals for accurate totals)
  const shiftCounts = useMemo(() => {
    const counts: Record<string, number> = { impar_diurno: 0, par_diurno: 0, impar_noturno: 0, par_noturno: 0 };
    allProfessionals.forEach(p => {
      if (counts[p.shiftId] !== undefined) counts[p.shiftId]++;
    });
    return counts;
  }, [allProfessionals]);

  // Helper to resolve weekday dynamically based on selected month and year
  const getWeekday = (day: number) => {
    const dayOfWeek = new Date(selectedYear, selectedMonth - 1, day).getDay();
    const weekdays = ["D", "S", "T", "Q", "Q", "S", "S"];
    return weekdays[dayOfWeek];
  };

  // Resolve specific day duty/leave status
  const getDayStatus = (p: { id: string; name: string; role: "nurse" | "technician"; shiftId: string; days?: Record<string, string> } | undefined, d: number) => {
    if (!p || !p.id) return "off-duty";
    // 1. Check leave requests
    const matchedReq = requests.find(r => r.memberId === p.id && r.requestedDay === d);
    if (matchedReq) {
      if (matchedReq.status === "approved") return "leave-approved";
      if (matchedReq.status === "pending") return "leave-pending";
    }

    // 2. Check custom manual cell overrides for individual days (specific overrides take preference)
    const matchedOverride = dayOverrides.find(o => o.memberId === p.id && o.day === d);
    if (matchedOverride) {
      if (matchedOverride.status === "duty") return "duty";
      if (matchedOverride.status === "off-duty") return "off-duty";
      if (matchedOverride.status === "FE") return "FE";
      if (matchedOverride.status === "FA") return "FA";
      if (matchedOverride.status === "BH") return "BH";
      if (matchedOverride.status === "LM") return "LM";
    }

    // 3. If there are pre-parsed days from the Excel file, use them directly!
    if (p.days && p.days[String(d)]) {
      const val = p.days[String(d)];
      if (val === 'P') return "duty";
      if (val === 'F') return "off-duty";
      if (val === 'V') return "leave-approved"; // Férias
      if (val === 'LM' || val === 'LTS' || val === 'LS' || val === 'AT' || val === 'LNR') return "LM"; // Licença Médica / Atestado
      if (val === 'FE') return "FE";
      if (val === 'FA') return "FA";
      if (val === 'BH') return "BH";
      return "off-duty";
    }

    // 4. Determine if it is a scheduled work day according to work shift rules (parity fallback)
    let isScheduledWorkDay = false;
    if (p.shiftId === "rt_lideranca") {
      const dayOfWeek = (d - 1 + 5) % 7;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      isScheduledWorkDay = !isWeekend;
    } else {
      const isOddDay = d % 2 !== 0;
      const isShiftOdd = p.shiftId === "impar_diurno" || p.shiftId === "diurno_a" || p.shiftId === "impar_noturno" || p.shiftId === "noturno_a";
      const isShiftEven = p.shiftId === "par_diurno" || p.shiftId === "diurno_b" || p.shiftId === "par_noturno" || p.shiftId === "noturno_b";
      isScheduledWorkDay = (isShiftOdd && isOddDay) || (isShiftEven && !isOddDay);
    }

    // 5. Check general status toggle in the shift (only for scheduled work days to keep non-work days clean)
    const shiftObj = shifts.find(s => s.id === p.shiftId);
    const staffMember = shiftObj?.staff.find(m => m.id === p.id);
    if (staffMember?.status === "leave" && isScheduledWorkDay) {
      return "leave-toggled";
    }

    // 6. Shift schedule type parity checks
    return isScheduledWorkDay ? "duty" : "off-duty";
  };

  if (typeof window !== 'undefined') {
    (window as any).__SHIFTS__ = shifts;
    (window as any).__ALL_PROFESSIONALS__ = allProfessionals;
    (window as any).__GET_DAY_STATUS__ = getDayStatus;
  }

  // Helper to stylize each shift differently in the global overview
  const getShiftColorStyles = (shiftId: string) => {
    switch (shiftId) {
      case "impar_diurno":
      case "diurno_a":
        return {
          bg: "bg-amber-500",
          bgLight: "bg-amber-100 dark:bg-amber-950/45",
          border: "border-amber-500/20",
          text: "text-amber-700 dark:text-amber-400 font-extrabold",
          label: "Ímpar Diurno",
          iconNode: <Sun className="w-3.5 h-3.5 inline-block mr-1 text-amber-500 fill-amber-500" />,
          badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        };
      case "par_diurno":
      case "diurno_b":
        return {
          bg: "bg-blue-500",
          bgLight: "bg-blue-100 dark:bg-blue-950/45",
          border: "border-blue-500/20",
          text: "text-blue-700 dark:text-blue-450 font-extrabold",
          label: "Par Diurno",
          iconNode: <Sun className="w-3.5 h-3.5 inline-block mr-1 text-blue-500 fill-blue-500" />,
          badge: "bg-blue-500/10 text-blue-600 dark:text-blue-450 border-blue-500/20"
        };
      case "impar_noturno":
      case "noturno_a":
        return {
          bg: "bg-purple-500",
          bgLight: "bg-purple-100 dark:bg-purple-950/45",
          border: "border-purple-500/20",
          text: "text-purple-700 dark:text-purple-400 font-extrabold",
          label: "Ímpar Noturno",
          iconNode: <MoonStar className="w-3.5 h-3.5 inline-block mr-1 text-purple-600 fill-purple-600" />,
          badge: "bg-purple-550/10 text-purple-650 dark:text-purple-400 border-purple-500/20"
        };
      case "par_noturno":
      case "noturno_b":
        return {
          bg: "bg-indigo-650",
          bgLight: "bg-indigo-100 dark:bg-indigo-950/45",
          border: "border-indigo-600/20",
          text: "text-indigo-650 dark:text-indigo-400 font-extrabold",
          label: "Par Noturno",
          iconNode: <MoonStar className="w-3.5 h-3.5 inline-block mr-1 text-indigo-600 fill-indigo-600" />,
          badge: "bg-indigo-650/10 text-indigo-650 dark:text-indigo-400 border-indigo-600/20"
        };
      case "rt_lideranca":
        return {
          bg: "bg-emerald-600",
          bgLight: "bg-emerald-100 dark:bg-emerald-950/45",
          border: "border-emerald-600/20",
          text: "text-emerald-700 dark:text-emerald-400 font-extrabold",
          label: "RT / Liderança",
          iconNode: <Briefcase className="w-3.5 h-3.5 inline-block mr-1 text-emerald-600" />,
          badge: "bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-600/20"
        };
      default:
        return {
          bg: "bg-slate-550",
          bgLight: "bg-slate-100 dark:bg-slate-900/40",
          border: "border-slate-500/20",
          text: "text-slate-700 dark:text-slate-400 font-extrabold",
          label: "Outros",
          iconNode: null,
          badge: "bg-slate-500/10 text-slate-600 border-slate-500/20"
        };
    }
  };

  // Count active stats for current selected shift
  const shiftStats = useMemo(() => {
    const staff = currentActiveShift?.staff || [];
    const nurses = staff.filter(m => m.role === "nurse");
    const technicians = staff.filter(m => m.role === "technician");
    
    const nursesOff = nurses.filter(m => m.status === "leave").length;
    const techsOff = technicians.filter(m => m.status === "leave").length;

    // Rules verification limits: Max 3 technicians off, Max 1 nurse off
    const techBreached = techsOff > 3;
    const nurseBreached = nursesOff > 1;

    return {
      nursesCount: nurses.length,
      nursesOff,
      techsCount: technicians.length,
      techsOff,
      techBreached,
      nurseBreached,
      isAnyRuleBreached: techBreached || nurseBreached
    };
  }, [currentActiveShift]);

  // Toggle state between Working / On Leave on scale directly 
  const toggleMemberState = (memberId: string) => {
    setShifts(prevShifts => {
      return prevShifts.map(s => {
        if (s.id !== activeShiftId) return s;
        return {
          ...s,
          staff: s.staff.map(m => m.id === memberId ? {
            ...m,
            status: m.status === "working" ? "leave" : "working"
          } : m)
        };
      });
    });
    toast.success("Estatísticas de equipe e coberturas recalculadas.");
  };

  // Helper to convert index to Excel Column letter
  const getExcelColumnLetter = (colIndex: number) => {
    let temp = colIndex;
    let letter = "";
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  // Helper to determine active Excel Formula Bar value
  const getExcelValueForFormulaBar = (p: { id: string; name: string; role: "nurse" | "technician"; shiftId: string; days?: Record<string, string> } | undefined, d: number, dayStatus: string) => {
    if (!p) return "";
    const isOdd = d % 2 !== 0;
    const isShiftOdd = p.shiftId === "impar_diurno" || p.shiftId === "diurno_a" || p.shiftId === "impar_noturno" || p.shiftId === "noturno_a";
    const isShiftEven = p.shiftId === "par_diurno" || p.shiftId === "diurno_b" || p.shiftId === "par_noturno" || p.shiftId === "noturno_b";
    
    if (dayStatus === "duty") {
      const isDefaultDuty = (isShiftOdd && isOdd) || (isShiftEven && !isOdd);
      if (isDefaultDuty) {
        return `SE(OU(REGRA_12X36_IMPAR(Dia=${d}; Grupo="${p.shiftId}"); REGRA_12X36_PAR(Dia=${d}; Grupo="${p.shiftId}")); "P_PLANTÃO"; "-")`;
      } else {
        return `CONFORMIDADE_SOBREAVISO_EXTRA(Cargo="${p.role}"; Colaborador="${p.name}"; Dia=${d}; Status="P_FORÇADO")`;
      }
    } else if (dayStatus === "leave-approved" || dayStatus === "leave-toggled") {
      return `FOLGA_DE_DIREITO_DEFERIDA(Responsável="RT Renata Pereira"; Solicitante="${p.name}"; Dia=${d}; Mês=${selectedMonth}; Status="DEFERIDO")`;
    } else if (dayStatus === "leave-pending") {
      return `SE(ANALISE_DE_COBERTURA_ESTATISTICA(Dia=${d})=VERDADEIRO; "?_PENDENTE"; "-")`;
    } else if (dayStatus === "FE") {
      return `FOLGA_ELEITORAL_PRESTACAO_COMPENSATORIA(Colaborador="${p.name}"; Dia=${d}; Mês=${selectedMonth}; Juri/Eleição=12h)`;
    } else if (dayStatus === "FA") {
      return `FOLGA_ANIVERSARIO_DIREITO_LEGAL(Colaborador="${p.name}"; Dia=${d}; Mês=${selectedMonth}; DataNascimento="${getMonthName(selectedMonth)}")`;
    } else if (dayStatus === "BH") {
      return `BH_COMPENSACAO_BANCO_HORAS(Colaborador="${p.name}"; QtdDebito=12; Dia=${d}; SaldoRestante=24)`;
    } else if (dayStatus === "LM") {
      return `LICENÇA_MEDICA_ATESTADO_HOMOLOGADO(Cid10="M54.5"; Médico="Clinico Geral"; Colaborador="${p.name}"; Dia=${d})`;
    }
    return `SE(REGRA_SALA_ROTATIVA_12X36(Grupo="${p.shiftId}"; Dia=${d}); "P"; "-_FOLGA_ESCALA")`;
  };

  // Export full scale to Excel format (.xls with rich custom table formatting and colors)
  const exportToExcel = () => {
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
    html += `<head><meta charset="utf-8" /><style>`;
    html += `table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; }`;
    html += `th { background-color: #15803d; color: #ffffff; font-weight: bold; border: 1px solid #c0c0c0; text-align: center; font-size: 11pt; padding: 6px; }`;
    html += `td { border: 1px solid #d3d3d3; text-align: center; font-size: 10pt; padding: 5px; }`;
    html += `.col-header { background-color: #e5e7eb; color: #374151; font-weight: bold; border: 1px solid #c0c0c0; text-align: center; }`;
    html += `.row-index { background-color: #e5e7eb; color: #6b7280; font-weight: bold; text-align: center; border: 1px solid #c0c0c0; }`;
    html += `.member-name { text-align: left; font-weight: bold; background-color: #ffffff; }`;
    html += `.duty-amber { background-color: #f59e0b; color: #ffffff; font-weight: bold; }`;
    html += `.duty-blue { background-color: #3b82f6; color: #ffffff; font-weight: bold; }`;
    html += `.duty-purple { background-color: #a855f7; color: #ffffff; font-weight: bold; }`;
    html += `.duty-indigo { background-color: #4f46e5; color: #ffffff; font-weight: bold; }`;
    html += `.duty-green { background-color: #059669; color: #ffffff; font-weight: bold; }`;
    html += `.leave-approved { background-color: #10b981; color: #ffffff; font-weight: bold; }`;
    html += `.leave-pending { background-color: #f59e0b; color: #ffffff; font-weight: bold; }`;
    html += `.leave-fe { background-color: #ec4899; color: #ffffff; font-weight: bold; }`;
    html += `.leave-fa { background-color: #06b6d4; color: #ffffff; font-weight: bold; }`;
    html += `.leave-bh { background-color: #8b5cf6; color: #ffffff; font-weight: bold; }`;
    html += `.leave-lm { background-color: #b91c1c; color: #ffffff; font-weight: bold; }`;
    html += `</style></head><body>`;
    
    // Add title block
    html += `<h2>ESCALA MENSAL UNIFICADA DE ENFERMAGEM - UPA 24H</h2>`;
    html += `<p><b>Gestor de Escalas:</b> Renata Pereira (Responsável Técnica)</p>`;
    html += `<p><b>Mês/Ano de Referência:</b> ${getMonthName(selectedMonth)} de ${selectedYear}</p>`;
    html += `<p><b>Data de Exportação:</b> ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>`;
    html += `<br/>`;
    
    html += `<table>`;
    // Excel Column letters row (A, B, C...)
    html += `<thead><tr>`;
    html += `<th class="col-header" style="min-width: 40px;"></th>`; // row number header cell
    html += `<th class="col-header" style="min-width: 250px;">A</th>`; // A: Nome
    html += `<th class="col-header" style="min-width: 140px;">B</th>`; // B: Grupo
    const totalDays = daysArray.length;
    for (let d = 1; d <= totalDays; d++) {
      html += `<th class="col-header">${getExcelColumnLetter(d + 1)}</th>`; // C onwards
    }
    html += `</tr>`;
    
    // Day headers row
    html += `<tr>`;
    html += `<th style="background-color: #16a34a; color: white;">N°</th>`;
    html += `<th style="background-color: #16a34a; color: white; text-align: left;">Colaborador</th>`;
    html += `<th style="background-color: #16a34a; color: white;">Grupo Escala</th>`;
    for (let d = 1; d <= totalDays; d++) {
      html += `<th style="background-color: #16a34a; color: white;">Dia ${d}</th>`;
    }
    html += `</tr></thead><tbody>`;
    
    // Data rows
    filteredGlobals.forEach((p, index) => {
      html += `<tr>`;
      html += `<td class="row-index">${index + 1}</td>`;
      html += `<td class="member-name">${p.name} (${p.role === "nurse" ? "Enfermeiro" : "Técnico"})</td>`;
      html += `<td>${getShiftColorStyles(p.shiftId).label}</td>`;
      
      for (let d = 1; d <= totalDays; d++) {
        const dayStatus = getDayStatus(p, d);
        let cellText = "-";
        let cellClass = "";
        
        if (dayStatus === "duty") {
          cellText = "P";
          if (p.shiftId === "impar_diurno" || p.shiftId === "diurno_a") cellClass = "class='duty-amber'";
          else if (p.shiftId === "par_diurno" || p.shiftId === "diurno_b") cellClass = "class='duty-blue'";
          else if (p.shiftId === "impar_noturno" || p.shiftId === "noturno_a") cellClass = "class='duty-purple'";
          else if (p.shiftId === "par_noturno" || p.shiftId === "noturno_b") cellClass = "class='duty-indigo'";
          else cellClass = "class='duty-green'";
        } else if (dayStatus === "leave-approved" || dayStatus === "leave-toggled") {
          cellText = "F";
          cellClass = "class='leave-approved'";
        } else if (dayStatus === "leave-pending") {
          cellText = "?";
          cellClass = "class='leave-pending'";
        } else if (dayStatus === "FE") {
          cellText = "FE";
          cellClass = "class='leave-fe'";
        } else if (dayStatus === "FA") {
          cellText = "FA";
          cellClass = "class='leave-fa'";
        } else if (dayStatus === "BH") {
          cellText = "BH";
          cellClass = "class='leave-bh'";
        } else if (dayStatus === "LM") {
          cellText = "LM";
          cellClass = "class='leave-lm'";
        }
        
        html += `<td ${cellClass}>${cellText}</td>`;
      }
      html += `</tr>`;
    });
    
    html += `</tbody></table>`;
    html += `</body></html>`;
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `escala_unificada_upa_${getMonthName(selectedMonth).toLowerCase()}_${selectedYear}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Excel (.xls) exportado com as formatações e cores preservadas!", {
      description: "Pronto para abrir diretamente no Microsoft Excel ou Google Planilhas."
    });
  };

  // Handle cell selection and buffering in Global Scale View
  const handleCellClick = (p: { id: string; name: string; role: "nurse" | "technician"; shiftId: string; roleCategory?: string }, dayNum: number, currentStatus: string) => {
    setEditingCell({
      memberId: p.id,
      memberName: p.name,
      memberRole: p.role,
      shiftId: p.shiftId,
      day: dayNum,
      initialStatus: currentStatus
    });

    setEditingName(p.name);
    setEditingRole(p.roleCategory || (p.role === "nurse" ? "ENFERMEIRA" : "TEC.ENF"));
    setEditingShiftId(p.shiftId);
    setActiveEditTab("status");

    // Load current status value
    const matchedOverride = dayOverrides.find(o => o.memberId === p.id && o.day === dayNum);
    const matchedReq = requests.find(r => r.memberId === p.id && r.requestedDay === dayNum);

    if (matchedReq) {
      if (matchedReq.status === "approved") {
        setEditingCellStatus("leave-approved");
      } else {
        setEditingCellStatus("leave-pending");
      }
    } else if (matchedOverride) {
      if (matchedOverride.status === "duty") {
        setEditingCellStatus("duty");
      } else if (matchedOverride.status === "off-duty") {
        setEditingCellStatus("off-duty");
      } else if (matchedOverride.status === "FE") {
        setEditingCellStatus("FE");
      } else if (matchedOverride.status === "FA") {
        setEditingCellStatus("FA");
      } else if (matchedOverride.status === "BH") {
        setEditingCellStatus("BH");
      } else if (matchedOverride.status === "LM") {
        setEditingCellStatus("LM");
      } else {
        setEditingCellStatus("default");
      }
    } else {
      setEditingCellStatus("default");
    }
  };

  // ─── VALIDAÇÃO DE REGRAS DE NEGÓCIO DA ESCALA ────────────────────────────
  // Retorna { ok: true } se a mudança é permitida, ou { ok: false, msg } com a violação.
  const validateCellChange = (memberId: string, memberName: string, memberRole: string, shiftId: string, day: number, newStatus: string) => {
    // Status de ausência que contam para os limites de folga por dia
    const ABSENCE_STATUSES = ['F', 'FE', 'FA', 'AU', 'AT', 'LM', 'BH', 'V', 'LTS', 'LS', 'FI', 'leave-approved', 'leave-pending', 'off-duty'];
    const TEC_ROLES = ['technician'];
    const ENF_ROLES = ['nurse'];

    // Só valida ausências pesadas se não for, verifica se é um plantão extra de aviso
    if (!ABSENCE_STATUSES.includes(newStatus)) {
      if (newStatus === 'duty') {
        const isOddDay = day % 2 !== 0;
        const isImparShift = shiftId.startsWith('impar');
        const isParShift = shiftId.startsWith('par');

        if ((isImparShift && !isOddDay) || (isParShift && isOddDay)) {
          return { ok: true, type: 'warning', msg: `⚠️ Você está lançando um Plantão Extra no Dia ${day}, que é o dia de folga padrão do ciclo 12x36.\n\nDeseja confirmar este plantão extra?` };
        }
      }
      return { ok: true };
    }

    // Busca todos os colaboradores do mesmo turno
    const sameShiftMembers = allProfessionals.filter(p => p.shiftId === shiftId && p.id !== memberId);

    // ── REGRA 1: Limite diário de folgas de Técnicos/Auxiliares ──
    if (TEC_ROLES.includes(memberRole)) {
      const maxTec = limits?.technicians || 3;
      let tecAbsences = 0;
      sameShiftMembers.forEach(p => {
        if (TEC_ROLES.includes(p.role)) {
          const dayStatus = getDayStatus(p, day);
          if (ABSENCE_STATUSES.includes(dayStatus)) tecAbsences++;
        }
      });
      if (tecAbsences >= maxTec) {
        return { ok: false, msg: `⚠️ Dia ${day}: limite de ${maxTec} folgas de Téc./Aux. já atingido neste plantão (${shiftId.replace('_', ' ').toUpperCase()}).\nTente outro dia disponível.` };
      }
    }

    // ── REGRA 2: Limite diário de folgas de Enfermeiros(as) ──
    if (ENF_ROLES.includes(memberRole)) {
      const maxEnf = limits?.nurses || 1;
      let enfAbsences = 0;
      sameShiftMembers.forEach(p => {
        if (ENF_ROLES.includes(p.role)) {
          const dayStatus = getDayStatus(p, day);
          if (ABSENCE_STATUSES.includes(dayStatus)) enfAbsences++;
        }
      });
      if (enfAbsences >= maxEnf) {
        return { ok: false, msg: `⚠️ Dia ${day}: já existe o limite de ${maxEnf} folga(s) de Enfermeiro(a) neste plantão.\nEscolha outro dia para lançar a folga.` };
      }
    }

    // ── REGRA 3: FE/FA só pode substituir Plantão (P) ──
    if (newStatus === 'FE' || newStatus === 'FA') {
      const currentSelf = allProfessionals.find(p => p.id === memberId);
      const currentDayStatus = getDayStatus(currentSelf, day);
      if (currentDayStatus !== 'duty') {
        return { ok: false, msg: `⚠️ ${newStatus === 'FE' ? 'Folga Eleitoral (FE)' : 'Folga Aniversário (FA)'} só pode substituir um dia de Plantão (P).\nO dia ${day} não é Plantão para ${memberName}.` };
      }
    }

    // ── REGRA 4: BH/LM só pode ser lançado em dia de Plantão (P) ──
    if (newStatus === 'BH' || newStatus === 'LM') {
      const currentSelf = allProfessionals.find(p => p.id === memberId);
      const currentDayStatus = getDayStatus(currentSelf, day);
      if (currentDayStatus !== 'duty') {
        const label = newStatus === 'BH' ? 'Banco de Horas (BH)' : 'Licença Médica (LM)';
        return { ok: false, msg: `⚠️ ${label} só pode ser lançado em dia de Plantão (P).\nO dia ${day} não é Plantão para ${memberName}.` };
      }
    }

    // ── REGRA 5: Máximo de 2 folgas extras (FE/FA) por colaborador no mês ──
    if (newStatus === 'FE' || newStatus === 'FA') {
      const selfEntry = allProfessionals.find(p => p.id === memberId);
      let extraCount = 0;
      if (selfEntry?.days) {
        Object.values(selfEntry.days).forEach(v => {
          if (v === 'FE' || v === 'FA') extraCount++;
        });
      }
      // Também conta overrides pendentes
      dayOverrides.forEach(o => {
        if (o.memberId === memberId && (o.status === 'FE' || o.status === 'FA') && o.day !== day) extraCount++;
      });
      if (extraCount >= 2) {
        return { ok: false, msg: `⚠️ Limite de 2 folgas extras (FE/FA) por mês já atingido para ${memberName}.\nNão é possível adicionar mais folgas especiais este mês.` };
      }
    }

    return { ok: true };
  };

  // Abre o popup de confirmação de 2ª etapa antes de salvar
  const requestSaveCellEdits = () => {
    if (!editingCell) return;
    const shiftName = shifts.find(s => s.id === editingShiftId)?.name || editingShiftId;
    const STATUS_LABELS: Record<string, string> = {
      default: 'Seguir Escala Padrão 12x36',
      duty: 'Forçar Plantão (P)',
      'off-duty': 'Forçar Folga de Revezamento (F)',
      'leave-approved': 'Folga de Direito Deferida (F)',
      'leave-pending': 'Folga Sob Análise (?)',
      FE: 'Folga Eleitoral (FE)',
      FA: 'Folga Aniversário (FA)',
      BH: 'Compensação Banco de Horas (BH)',
      LM: 'Licença Médica / Atestado (LM)',
    };
    const statusLabel = STATUS_LABELS[editingCellStatus] || editingCellStatus;
    // ── Validação de regras ANTES de confirmar ──
    const memberRoleForValidation = editingCell.memberRole; // 'nurse' | 'technician'
    const validation = validateCellChange(
      editingCell.memberId,
      editingCell.memberName,
      memberRoleForValidation,
      editingShiftId,
      editingCell.day,
      editingCellStatus
    );

    if (!validation.ok) {
      // Fecha o editor e abre o popup vermelho de violação
      setEditingCell(null);
      setCellAlert({
        memberName: editingCell.memberName,
        memberRole: memberRoleForValidation === 'nurse' ? 'Enfermeiro(a)' : 'Téc. Enfermagem',
        shiftName,
        msg: validation.msg,
        snapshotCell: { ...editingCell },
        snapshotStatus: editingCellStatus,
        snapshotName: editingName,
        snapshotRole: editingRole,
        snapshotShiftId: editingShiftId,
      });
      return;
    }

    // Guarda snapshot completo antes de fechar o dialog
    const snap = {
      memberName: editingCell.memberName,
      memberRole: editingCell.memberRole === 'nurse' ? 'Enfermeiro(a)' : 'Téc. Enfermagem',
      shiftName,
      day: editingCell.day,
      statusLabel,
      statusCode: editingCellStatus,
      type: validation.type as 'success' | 'warning' | undefined,
      warningMsg: validation.msg,
      snapshotCell: { ...editingCell },
      snapshotStatus: editingCellStatus,
      snapshotName: editingName,
      snapshotRole: editingRole as any,
      snapshotShiftId: editingShiftId,
    };
    // Fecha o dialog de edição e abre o popup de confirmação
    setEditingCell(null);
    setPendingConfirm(snap);
  };

  // Persist custom cell overrides and general profile changes
  // Pode receber override de dados para uso após o popup de confirmação
  const saveCellEdits = (overrideData?: {
    cell: typeof editingCell;
    status: typeof editingCellStatus;
    name: string;
    role: typeof editingRole;
    shiftId: string;
  }) => {
    const cell = overrideData?.cell ?? editingCell;
    const status = overrideData?.status ?? editingCellStatus;
    const name = overrideData?.name ?? editingName;
    const role = overrideData?.role ?? editingRole;
    const shiftId = overrideData?.shiftId ?? editingShiftId;

    if (!cell) return;
    // Aliases para manter o restante do código igual
    const memberId = cell.memberId;
    const day = cell.day;
    const memberName = cell.memberName;

    // 1. Update the database ScheduleEntry and invalidate cache
    db.entities.ScheduleEntry.filter({ month: 6, year: 2026 }).then(schedules => {
      const sched = schedules.find(s => s.employee_name?.trim() === memberName?.trim());
      if (sched) {
        let newStatus = 'F';
        if (status === 'duty') newStatus = 'P';
        else if (status === 'leave-approved' || status === 'leave-toggled') newStatus = 'F';
        else if (status === 'FE') newStatus = 'FE';
        else if (status === 'FA') newStatus = 'FA';
        else if (status === 'BH') newStatus = 'BH';
        else if (status === 'LM') newStatus = 'LM';
        
        const updatedDays = { ...sched.days, [String(day)]: newStatus };
        db.entities.ScheduleEntry.update(sched.id, { days: updatedDays }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['schedules'] });
          window.dispatchEvent(new Event('escala-db-updated'));
        });
      }
    });

    // 2. Update the database Employee and invalidate cache
    db.entities.Employee.get(memberId).then(emp => {
      if (emp) {
        const dbShiftType = shiftId === 'impar_diurno' ? 'diurno_a' :
                            shiftId === 'par_diurno' ? 'diurno_b' :
                            shiftId === 'impar_noturno' ? 'noturno_a' :
                            shiftId === 'par_noturno' ? 'noturno_b' : emp.shift_type;
        
        const updatedRole = role === 'nurse' ? 'ENFERMEIRA' : (role === 'technician' ? 'TEC.ENF' : role);

        db.entities.Employee.update(memberId, {
          name: name.trim() || emp.name,
          role: updatedRole,
          shift_type: dbShiftType
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['employees'] });
          window.dispatchEvent(new Event('escala-db-updated'));
        });
      }
    });

    // 3. Update Profile characteristics: Name, Role, and Shift Group in local state
    setShifts(prevShifts => {
      let targetMember: StaffMember | null = null;
      
      const filteredShifts = prevShifts.map(s => {
        const hasMember = s.staff.some(m => m.id === memberId);
        if (hasMember) {
          const found = s.staff.find(m => m.id === memberId);
          if (found) {
            targetMember = { 
              ...found, 
              name: name.trim() || found.name,
              role: role
            };
          }
          // Remove from old if shift changed
          if (s.id !== shiftId) {
            return {
              ...s,
              staff: s.staff.filter(m => m.id !== memberId)
            };
          } else {
            // Update inline properties
            return {
              ...s,
              staff: s.staff.map(m => m.id === memberId ? { 
                ...m, 
                name: name.trim() || m.name, 
                role: role 
              } : m)
            };
          }
        }
        return s;
      });

      // Insert member into new shift category if group changed
      if (targetMember && !filteredShifts.find(s => s.id === shiftId)?.staff.some(m => m.id === memberId)) {
        return filteredShifts.map(s => {
          if (s.id === shiftId) {
            return {
              ...s,
              staff: [...s.staff, targetMember!]
            };
          }
          return s;
        });
      }

      return filteredShifts;
    });

    // 4. Clear pre-existing requests/overrides for this cell to refresh state
    setRequests(prev => prev.filter(r => !(r.memberId === memberId && r.requestedDay === day)));
    setDayOverrides(prev => prev.filter(o => !(o.memberId === memberId && o.day === day)));

    // 5. Define the new interactive status
    if (status === "leave-approved") {
      const newReq: LeaveRequest = {
        id: "req-cell-" + Date.now(),
        memberId,
        memberName: name,
        memberRole: role,
        shiftId: shiftId,
        shiftName: shifts.find(s => s.id === shiftId)?.name || "",
        requestedDay: day,
        justification: "Folga programada e deferida via painel multifuncional de células.",
        status: "approved",
        requestedAt: new Date().toISOString(),
        rtApproval: "approved",
        leadApproval: "approved",
        reviewedBy: "RT Renata Pereira & Liderança Maria Eduarda",
        reviewedAt: new Date().toISOString()
      };
      setRequests(prev => [newReq, ...prev]);
    } else if (status === "leave-pending") {
      const newReq: LeaveRequest = {
        id: "req-cell-" + Date.now(),
        memberId,
        memberName: name,
        memberRole: role,
        shiftId: shiftId,
        shiftName: shifts.find(s => s.id === shiftId)?.name || "",
        requestedDay: day,
        justification: "Folga sob análise iniciada via Grade de Planejamento de Células.",
        status: "pending",
        requestedAt: new Date().toISOString(),
        rtApproval: "pending",
        leadApproval: "pending"
      };
      setRequests(prev => [newReq, ...prev]);
    } else if (status === "duty") {
      setDayOverrides(prev => [...prev, { memberId, day, status: "duty" }]);
    } else if (status === "off-duty") {
      setDayOverrides(prev => [...prev, { memberId, day, status: "off-duty" }]);
    } else if (status === "FE") {
      setDayOverrides(prev => [...prev, { memberId, day, status: "FE" }]);
    } else if (status === "FA") {
      setDayOverrides(prev => [...prev, { memberId, day, status: "FA" }]);
    } else if (status === "BH") {
      setDayOverrides(prev => [...prev, { memberId, day, status: "BH" }]);
    } else if (status === "LM") {
      setDayOverrides(prev => [...prev, { memberId, day, status: "LM" }]);
    }

    setEditingCell(null);
    toast.success("Célula e cadastro recalibrados!", {
      description: `Mais informações e coberturas recalculadas para dia ${day} de Maio.`
    });
  };

  // Add Professional manually to the scale
  const handleAddNewStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("Nome inválido");
      return;
    }

    const formattedPrefix = newRole === "nurse" ? "Enf. " : "Téc. ";
    const finalName = formattedPrefix + newName.trim();
    const newId = "staff-" + Date.now();

    setShifts(prev => {
      return prev.map(s => {
        if (s.id !== activeShiftId) return s;
        return {
          ...s,
          staff: [...s.staff, { id: newId, name: finalName, role: newRole, status: "working" }]
        };
      });
    });

    setNewName("");
    setIsAddOpen(false);
    toast.success(`${finalName} integrado à escala do ${currentActiveShift.name}.`);
  };

  // Delete professional (confirmed)
  const handleRemoveStaff = (id: string, name: string) => {
    setShifts(prev => {
      return prev.map(s => {
        if (s.id !== activeShiftId) return s;
        return {
          ...s,
          staff: s.staff.filter(m => m.id !== id)
        };
      });
    });
    toast.info(`${name} removido(a) da escala.`);
    setDeleteConfirm(null);
  };

  // Toggle role in active shift
  const handleToggleRole = (id: string, currentRole: "nurse" | "technician") => {
    setShifts(prev => prev.map(s => {
      if (s.id !== activeShiftId) return s;
      return {
        ...s,
        staff: s.staff.map(m => m.id === id ? { ...m, role: currentRole === "nurse" ? "technician" : "nurse" } : m)
      };
    }));
    toast.success(currentRole === "nurse" ? `Função alterada para Técnico de Enfermagem.` : `Função alterada para Enfermeiro Liderança.`);
  };

  // Transfer shift function
  const executeTransferShift = () => {
    if (!transferConfirm || !transferTargetShift) return;
    
    setShifts(prev => {
      let targetMember: StaffMember | null = null;
      // Remove do turno atual
      const updatedShifts = prev.map(s => {
        if (s.id === transferConfirm.currentShiftId) {
          const found = s.staff.find(m => m.id === transferConfirm.id);
          if (found) targetMember = found;
          return { ...s, staff: s.staff.filter(m => m.id !== transferConfirm.id) };
        }
        return s;
      });

      // Adiciona no turno alvo
      if (targetMember) {
        return updatedShifts.map(s => {
          if (s.id === transferTargetShift) {
            return { ...s, staff: [...s.staff, targetMember!] };
          }
          return s;
        });
      }
      return updatedShifts;
    });

    toast.success(`${transferConfirm.name} transferido(a) com sucesso!`);
    setTransferConfirm(null);
    setTransferTargetShift("");
  };

  // Add collaborator request
  const submitLeaveRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollabId) {
      toast.error("Selecione um profissional cadastrado.");
      return;
    }
    if (!collabJustification.trim()) {
      toast.error("Por favor descreva o benefício ou justificativa da folga.");
      return;
    }

    const colleague = selectedCollabObj;
    if (!colleague) return;

    // Check pre-existing request for same day
    const match = requests.find(r => r.memberId === colleague.id && r.requestedDay === collabRequestDay && r.status === "pending");
    if (match) {
      toast.warning("Já existe uma solicitação pendente para esse dia!");
      return;
    }

    const newReq: LeaveRequest = {
      id: "req-" + Date.now(),
      memberId: colleague.id,
      memberName: colleague.name,
      memberRole: colleague.role,
      shiftId: colleague.shiftId,
      shiftName: colleague.shiftName,
      requestedDay: collabRequestDay,
      justification: collabJustification.trim(),
      status: "pending",
      requestedAt: new Date().toISOString(),
      rtApproval: "pending",
      leadApproval: "pending"
    };

    setRequests(prev => [newReq, ...prev]);
    setCollabJustification("");
    toast.success("Solicitação enviada de acordo com o direito do colaborador!", {
      description: "Sua solicitação está sob análise. Para ser homologada, são necessários os pareceres favoráveis da RT Renata e da Liderança Maria Eduarda."
    });
  };

  const handleRTDecision = (reqId: string, decision: "approved" | "rejected") => {
    setRequests(prev => {
      const updated = prev.map(r => {
        if (r.id !== reqId) return r;
        
        const rtApproval = decision;
        const leadApproval = r.leadApproval || "pending";
        
        let newStatus: "pending" | "approved" | "rejected" = "pending";
        if (rtApproval === "approved" || leadApproval === "approved") {
          newStatus = "approved";
        } else if (rtApproval === "rejected" || leadApproval === "rejected") {
          newStatus = "rejected";
        }
        
        return {
          ...r,
          rtApproval,
          status: newStatus,
          reviewedBy: newStatus !== "pending" ? (newStatus === "approved" ? "RT Renata" : "RT Renata") : undefined,
          reviewedAt: newStatus !== "pending" ? new Date().toISOString() : undefined
        };
      });

      // Check if status transitioned to approved or rejected, and update shifts
      const finalReq = updated.find(r => r.id === reqId);
      if (finalReq) {
        if (finalReq.status === "approved") {
          setShifts(prevShifts => prevShifts.map(s => {
            if (s.id !== finalReq.shiftId) return s;
            return {
              ...s,
              staff: s.staff.map(m => m.id === finalReq.memberId ? { ...m, status: "leave" } : m)
            };
          }));
          toast.success("FOLGA DEFERIDA!", {
            description: `A folga foi concedida por Renata (RT) para ${finalReq.memberName} no dia ${finalReq.requestedDay}.`
          });
        } else if (finalReq.status === "rejected") {
          setShifts(prevShifts => prevShifts.map(s => {
            if (s.id !== finalReq.shiftId) return s;
            return {
              ...s,
              staff: s.staff.map(m => m.id === finalReq.memberId ? { ...m, status: "working" } : m)
            };
          }));
          toast.error("SOLICITAÇÃO INDEFERIDA!", {
            description: `A folga de ${finalReq.memberName} no dia ${finalReq.requestedDay} foi recusada por Renata (RT).`
          });
        }
      }
      return updated;
    });
  };

  const handleLeadDecision = (reqId: string, decision: "approved" | "rejected") => {
    setRequests(prev => {
      const updated = prev.map(r => {
        if (r.id !== reqId) return r;
        
        const rtApproval = r.rtApproval || "pending";
        const leadApproval = decision;
        
        let newStatus: "pending" | "approved" | "rejected" = "pending";
        if (rtApproval === "approved" || leadApproval === "approved") {
          newStatus = "approved";
        } else if (rtApproval === "rejected" || leadApproval === "rejected") {
          newStatus = "rejected";
        }
        
        return {
          ...r,
          leadApproval,
          status: newStatus,
          reviewedBy: newStatus !== "pending" ? (newStatus === "approved" ? "Liderança Maria Eduarda" : "Liderança Maria Eduarda") : undefined,
          reviewedAt: newStatus !== "pending" ? new Date().toISOString() : undefined
        };
      });

      // Check if status transitioned to approved or rejected, and update shifts
      const finalReq = updated.find(r => r.id === reqId);
      if (finalReq) {
        if (finalReq.status === "approved") {
          setShifts(prevShifts => prevShifts.map(s => {
            if (s.id !== finalReq.shiftId) return s;
            return {
              ...s,
              staff: s.staff.map(m => m.id === finalReq.memberId ? { ...m, status: "leave" } : m)
            };
          }));
          toast.success("FOLGA DEFERIDA!", {
            description: `A folga foi concedida por Maria Eduarda (Liderança) para ${finalReq.memberName} no dia ${finalReq.requestedDay}.`
          });
        } else if (finalReq.status === "rejected") {
          setShifts(prevShifts => prevShifts.map(s => {
            if (s.id !== finalReq.shiftId) return s;
            return {
              ...s,
              staff: s.staff.map(m => m.id === finalReq.memberId ? { ...m, status: "working" } : m)
            };
          }));
          toast.error("SOLICITAÇÃO INDEFERIDA!", {
            description: `A folga de ${finalReq.memberName} no dia ${finalReq.requestedDay} foi recusada por Maria Eduarda (Liderança).`
          });
        }
      }
      return updated;
    });
  };

  // Clear or revoke decision
  const removeRequest = (id: string) => {
    setRequests(prev => prev.filter(r => r.id !== id));
    toast.info("Histórico de solicitação removido.");
  };

  // Filter lists inside active shift
  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return currentActiveShift?.staff || [];
    return (currentActiveShift?.staff || []).filter(m => 
      m.name.toLowerCase().includes(q) || 
      m.role.toLowerCase().includes(q)
    );
  }, [currentActiveShift?.staff, searchQuery]);

  // Calendar mapping array dynamic depending on selected month and year
  const daysArray = useMemo(() => {
    const numDays = new Date(selectedYear, selectedMonth, 0).getDate();
    return Array.from({ length: numDays }, (_, i) => i + 1);
  }, [selectedYear, selectedMonth]);

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION WITH INTEGRATED THEME BRANDING */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-start justify-between gap-4"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-indigo-500" />
            Gestão de Escalas & Escolha de Folgas
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            A folga é um direito do profissional de saúde da UPA. Use este painel para registrar as opções de folga escolhidas pelos colaboradores, enquanto a Gestão Geral detém a palavra final para avaliar a cobertura mínima de equipe.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-[10px] font-bold tracking-wider uppercase">
              Recursos Humanos & Escalabilidade
            </Badge>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold tracking-wider uppercase">
              Direito e Benefício Constitucional
            </Badge>
          </div>
        </div>
        
        <div className="shrink-0 bg-card p-3 rounded-xl border border-border shadow-sm space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-bold">
            Assinatura Autorizada (Gestão Geral)
          </span>
          <Input 
            value={managerSignature} 
            onChange={(e) => setManagerSignature(e.target.value)}
            className="h-8 max-w-[240px] text-xs font-bold rounded-lg focus-visible:ring-1 focus-visible:ring-primary"
            placeholder="Nome do Gestor Geral"
          />
        </div>
      </motion.div>

      {/* CORE STATS BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="flex-shrink-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent shadow-sm relative overflow-hidden transition-all duration-300 hover:scale-[1.02] border border-border/60 hover:border-amber-500/30">
          <CardContent className="p-4 flex items-center justify-between gap-4 h-full">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">Teto Crítico de Ausências</span>
              <p className="text-[11px] text-muted-foreground font-medium leading-snug">
                Limite por plantão de <strong className="text-foreground font-black">{limits?.technicians || 3} Técnicos</strong> e <strong className="text-foreground font-black">{limits?.nurses || 1} Enfermeiro</strong> em folga.
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 flex-shrink-0">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </CardContent>
          <div className="absolute top-0 right-0 h-1.5 w-1.5 rounded-bl bg-amber-500" />
        </Card>

        <Card className="flex-shrink-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent shadow-sm relative overflow-hidden transition-all duration-300 hover:scale-[1.02] border border-border/60 hover:border-indigo-500/30">
          <CardContent className="p-4 flex items-center justify-between gap-4 h-full">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">Solicitações Ativas de Folga</span>
              <p className="text-[11px] text-muted-foreground font-medium leading-snug">
                <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold">{requests.filter(r => r.status === "pending").length} solicitações</strong> aguardam validação final da gestão.
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 flex-shrink-0">
              <Briefcase className="h-4 w-4" />
            </div>
          </CardContent>
          <div className="absolute top-0 right-0 h-1.5 w-1.5 rounded-bl bg-indigo-500" />
        </Card>

        <Card className="flex-shrink-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent shadow-sm relative overflow-hidden transition-all duration-300 hover:scale-[1.02] border border-border/60 hover:border-emerald-500/30">
          <CardContent className="p-4 flex items-center justify-between gap-4 h-full">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">Direito & Amparo Legal</span>
              <p className="text-[11px] text-muted-foreground font-medium leading-snug">
                Asseguramos o registro das vontades e escala móvel com total conformidade trabalhista na UPA.
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0">
              <Award className="h-4 w-4" />
            </div>
          </CardContent>
          <div className="absolute top-0 right-0 h-1.5 w-1.5 rounded-bl bg-emerald-500" />
        </Card>
      </div>

      {/* CORE NAVIGATION TAB ROW WITH THE "VISÃO GLOBAL" ACTION BUTTON */}
      <div className="flex border-b border-border/70 flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 outline-none cursor-pointer",
              activeTab === "overview" 
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-black" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <CalendarDays className="h-4 w-4 text-indigo-500" />
            1. Quadro de Plantões
          </button>

          <button
            onClick={() => setActiveTab("request-portal")}
            className={cn(
              "px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 outline-none cursor-pointer",
              activeTab === "request-portal" 
                ? "border-blue-600 text-blue-600 dark:text-blue-400 font-black" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <Briefcase className="h-4 w-4 text-blue-500" />
            2. Escala do Profissional (Escolher Folga)
          </button>

          <button
            onClick={() => setActiveTab("approval-desk")}
            className={cn(
              "px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 outline-none cursor-pointer relative",
              activeTab === "approval-desk" 
                ? "border-purple-650 text-purple-600 dark:text-purple-400 font-black" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <Building2 className="h-4 w-4 text-purple-500" />
            3. Pareceres e Homologação de Folgas
            {requests.filter(r => r.status === "pending").length > 0 && (
              <span className="absolute top-1.5 right-1 h-2 w-2 rounded-full bg-red-500 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={cn(
              "px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 outline-none cursor-pointer",
              activeTab === "settings" 
                ? "border-slate-800 dark:border-slate-300 text-slate-800 dark:text-slate-300 font-black" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <Settings className="h-4 w-4 text-slate-500" />
            4. Configurações da Escala
          </button>
        </div>

        {/* Global scale calendar view button */}
        <div className="pb-2 pr-2 md:pb-0">
          <Button
            onClick={() => setIsGlobalScaleOpen(true)}
            className="h-9 px-4 text-xs bg-gradient-to-r from-teal-600 to-indigo-650 hover:from-teal-700 hover:to-indigo-700 text-white font-extrabold gap-1.5 rounded-lg shadow-md transition-all scale-100 active:scale-95"
          >
            <CalendarCheck className="h-4 w-4 text-emerald-400" />
            Visão Global da Escala (Mês Todo)
          </Button>
        </div>
      </div>

      {/* GLOBAL SCALE DETAILED MONTHLY PANEL - ENTIRE MONTH OF MAY 2026 (BEAUTIFULLY FRAMED MODAL OVERLAY WITH GUARANTEED VISIBLE FOOTER) */}
      {createPortal(
        <AnimatePresence>
          {isGlobalScaleOpen && (
            <motion.div
              initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "fixed inset-0 z-[45] bg-black/60 backdrop-blur-sm flex items-center justify-center overflow-hidden transition-all duration-200 print-modal-container",
              isGlobalScaleMaximized ? "p-0" : "p-4 md:p-6 lg:p-10"
            )}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.25 }}
              className={cn(
                "bg-background shadow-2xl w-full h-full flex flex-col overflow-hidden transition-all duration-200",
                isGlobalScaleMaximized 
                  ? "max-h-screen h-screen w-screen rounded-none border-0" 
                  : "border border-border rounded-xl max-h-[85vh] md:max-h-[88vh]"
              )}
            >
              <div className="flex flex-col h-full w-full">
                {/* Print Orientation & Formatting Overrides */}
                <style>{`
                  @page {
                    size: landscape;
                    margin: 5mm 8mm;
                  }
                  
                  /* Sticky Name Column on Screen */
                  .colaborador-header {
                    position: sticky !important;
                    left: 0 !important;
                    z-index: 20 !important;
                  }
                  .colaborador-cell {
                    position: sticky !important;
                    left: 0 !important;
                    z-index: 10 !important;
                  }
                  .group-header-cell {
                    position: sticky !important;
                    left: 0 !important;
                    z-index: 10 !important;
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

                    #print-area-container {
                      width: 1640px !important;
                      min-width: 1640px !important;
                      max-width: 1640px !important;
                      zoom: 0.66 !important;
                      overflow: visible !important;
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
                      font-size: 7.5px !important;
                      padding: 0 !important;
                      border: 1.5px solid #94a3b8 !important;
                      text-align: center !important;
                      color: #000 !important;
                    }
                    th {
                      height: 45px !important;
                    }
                    td {
                      height: 40px !important;
                    }
                    td > div {
                      display: flex !important;
                      align-items: center !important;
                      height: 100% !important;
                      width: 100% !important;
                    }
                    
                    /* Colaborador Name Column */
                    .colaborador-header,
                    .colaborador-cell {
                      width: 220px !important;
                      min-width: 220px !important;
                      position: static !important;
                      left: auto !important;
                      transform: none !important;
                      box-shadow: none !important;
                      background-color: #fff !important;
                      font-size: 8px !important;
                      font-weight: 900 !important;
                      text-align: left !important;
                      padding-left: 6px !important;
                    }
                    
                    td:first-child {
                      position: static !important;
                      left: auto !important;
                      transform: none !important;
                      box-shadow: none !important;
                    }

                    .categoria-header,
                    .categoria-cell {
                      width: 120px !important;
                      min-width: 120px !important;
                      position: static !important;
                      left: auto !important;
                      transform: none !important;
                      text-align: center !important;
                    }

                    .coren-header,
                    .coren-cell {
                      width: 100px !important;
                      min-width: 100px !important;
                      position: static !important;
                      left: auto !important;
                      transform: none !important;
                      text-align: center !important;
                    }
                    
                    th {
                      background-color: #f1f5f9 !important;
                      font-weight: bold !important;
                    }
                    
                    /* Ensure weekend columns have light gray backgrounds */
                    .bg-red-50 {
                      background-color: #f8fafc !important;
                    }
                    
                    /* Group Header overrides in print */
                    .bg-purple-50, .bg-purple-50 td, .bg-purple-50 th {
                      background-color: #faf5ff !important;
                      color: #7e22ce !important;
                      border: none !important;
                      height: 32px !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                    }
                    .bg-teal-50, .bg-teal-50 td, .bg-teal-50 th {
                      background-color: #f0fdfa !important;
                      color: #0f766e !important;
                      border: none !important;
                      height: 32px !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                    }
                    .bg-blue-50, .bg-blue-50 td, .bg-blue-50 th {
                      background-color: #eff6ff !important;
                      color: #1d4ed8 !important;
                      border: none !important;
                      height: 32px !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                    }
                    .group-header-cell {
                      position: static !important;
                      left: auto !important;
                      transform: none !important;
                      box-shadow: none !important;
                      width: auto !important;
                      min-width: 0 !important;
                    }
                    
                    /* Dynamic print background colors for cells */
                    .bg-green-100 { background-color: #dcfce7 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .bg-teal-100 { background-color: #ccfbf1 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .bg-sky-100 { background-color: #e0f2fe !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .bg-violet-100 { background-color: #ede9fe !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .bg-purple-100 { background-color: #f3e8ff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .bg-yellow-100 { background-color: #fef9c3 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .bg-orange-100 { background-color: #ffedd5 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .bg-red-200 { background-color: #fee2e2 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .bg-sky-200 { background-color: #bae6fd !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

                    /* Avoid breaks inside rows */
                    tr {
                      page-break-inside: avoid !important;
                    }
                    
                    /* Make sure the legend is completely visible */
                    .print-legend {
                      display: flex !important;
                      flex-direction: column !important;
                      border: 1.5px solid #cbd5e1 !important;
                      background-color: #fff !important;
                      page-break-inside: avoid !important;
                      margin-top: 15px !important;
                      padding: 10px !important;
                      border-radius: 8px !important;
                    }
                    
                    /* Signature Block display */
                    .print-signature {
                      display: block !important;
                      page-break-inside: avoid !important;
                      margin-top: 30px !important;
                    }
                  }

                  /* High-fidelity PDF capture overrides for html2canvas */
                  .generating-pdf {
                    background-color: #ffffff !important;
                    color: #000000 !important;
                    padding: 20px !important;
                  }
                  .generating-pdf .print-only-block {
                    display: block !important;
                  }
                  .generating-pdf .no-print {
                    display: none !important;
                  }
                  .generating-pdf table {
                    width: 100% !important;
                    table-layout: fixed !important;
                    border-collapse: collapse !important;
                  }
                  .generating-pdf th, .generating-pdf td {
                    font-size: 7.5px !important;
                    padding: 0 !important;
                    border: 1.5px solid #94a3b8 !important;
                    color: #000000 !important;
                    background-color: #ffffff !important;
                    text-align: center !important;
                  }
                  .generating-pdf th {
                    height: 45px !important;
                  }
                  .generating-pdf td {
                    height: 40px !important;
                  }
                  .generating-pdf td > div {
                    display: flex !important;
                    align-items: center !important;
                    height: 100% !important;
                    width: 100% !important;
                  }
                  .generating-pdf th > div {
                    display: flex !important;
                    align-items: center !important;
                    height: 100% !important;
                    width: 100% !important;
                  }
                  .generating-pdf .print-legend .gap-2 {
                    display: flex !important;
                    align-items: center !important;
                    height: 100% !important;
                  }
                  
                  /* Colaborador needs its specific padding-bottom to stay perfect */
                  .generating-pdf td.colaborador-cell > div {
                    padding-bottom: 10px !important;
                    box-sizing: border-box !important;
                  }

                  /* Push TEXT inside the badges up, leaving the badge boxes perfectly centered */
                  .generating-pdf .pdf-inner-text {
                    position: relative !important;
                    top: -6px !important;
                    display: inline-block;
                  }

                  /* Push up raw text and header numbers */
                  .generating-pdf th .pdf-content-shift,
                  .generating-pdf td:not(.colaborador-cell) .pdf-content-shift,
                  .generating-pdf th > div > span {
                    position: relative !important;
                    top: -6px !important;
                    display: inline-block;
                  }

                  /* Ajuste estético para centralizar o título da legenda no PDF */
                  .generating-pdf .print-legend > strong {
                    position: relative !important;
                    top: -6px !important;
                  }
                  .generating-pdf .colaborador-header,
                  .generating-pdf .colaborador-cell {
                    width: 220px !important;
                    min-width: 220px !important;
                    position: static !important;
                    left: auto !important;
                    transform: none !important;
                    font-size: 8px !important;
                    font-weight: 900 !important;
                    text-align: center !important;
                    padding-left: 0px !important;
                    box-shadow: none !important;
                    background-color: #ffffff !important;
                  }
                  .generating-pdf .colaborador-header div,
                  .generating-pdf .colaborador-cell div {
                    display: flex !important;
                    align-items: center !important;
                    width: 100% !important;
                    height: 100% !important;
                  }
                  .generating-pdf .colaborador-header div span,
                  .generating-pdf .colaborador-cell div span {
                    width: 100% !important;
                    text-align: center !important;
                  }
                  
                  .generating-pdf td:first-child {
                    position: static !important;
                    left: auto !important;
                    transform: none !important;
                    box-shadow: none !important;
                  }
                  
                  .generating-pdf .categoria-header,
                  .generating-pdf .categoria-cell {
                    width: 120px !important;
                    min-width: 120px !important;
                    position: static !important;
                    left: auto !important;
                    transform: none !important;
                    text-align: center !important;
                  }
                  
                  .generating-pdf .coren-header,
                  .generating-pdf .coren-cell {
                    width: 100px !important;
                    min-width: 100px !important;
                    position: static !important;
                    left: auto !important;
                    transform: none !important;
                    text-align: center !important;
                  }
                  .generating-pdf th {
                    background-color: #f1f5f9 !important;
                  }
                  /* Group Header overrides in generating-pdf */
                  .generating-pdf .bg-purple-50,
                  .generating-pdf .bg-purple-50 td {
                    background-color: #faf5ff !important;
                    color: #7e22ce !important;
                    border: none !important;
                    height: 32px !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .generating-pdf .bg-teal-50,
                  .generating-pdf .bg-teal-50 td {
                    background-color: #f0fdfa !important;
                    color: #0f766e !important;
                    border: none !important;
                    height: 32px !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .generating-pdf .bg-blue-50,
                  .generating-pdf .bg-blue-50 td {
                    background-color: #eff6ff !important;
                    color: #1d4ed8 !important;
                    border: none !important;
                    height: 32px !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .generating-pdf .group-header-cell {
                    position: static !important;
                    left: auto !important;
                    transform: none !important;
                    box-shadow: none !important;
                    width: auto !important;
                    min-width: 0 !important;
                  }
                  
                  .generating-pdf .bg-green-100 { background-color: #dcfce7 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                  .generating-pdf .bg-teal-100 { background-color: #ccfbf1 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                  .generating-pdf .bg-sky-100 { background-color: #e0f2fe !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                  .generating-pdf .bg-violet-100 { background-color: #ede9fe !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                  .generating-pdf .bg-purple-100 { background-color: #f3e8ff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                  .generating-pdf .bg-yellow-100 { background-color: #fef9c3 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                  .generating-pdf .bg-orange-100 { background-color: #ffedd5 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                  .generating-pdf .bg-red-200 { background-color: #fee2e2 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                  .generating-pdf .bg-sky-200 { background-color: #bae6fd !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                  
                  .generating-pdf .print-legend {
                    display: flex !important;
                    flex-direction: column !important;
                    border: 1.5px solid #cbd5e1 !important;
                    background-color: #ffffff !important;
                    margin-top: 15px !important;
                    padding: 10px !important;
                    border-radius: 8px !important;
                  }
                  .generating-pdf .print-signature {
                    display: block !important;
                    margin-top: 30px !important;
                  }
                `}</style>

                {/* Top sticky bar */}
                <div className="border-b bg-card px-4 py-2 flex items-center justify-between shadow-sm shrink-0 no-print flex-wrap gap-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Select value={String(selectedMonth)} onValueChange={(val) => setSelectedMonth(Number(val))}>
                        <SelectTrigger className="w-[120px] h-7 text-xs font-bold border border-blue-200 hover:bg-blue-50 text-blue-600 dark:border-blue-900/50 dark:hover:bg-blue-950/20 dark:text-blue-400 bg-transparent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[200]">
                          {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
                            <SelectItem key={i+1} value={String(i+1)} className="text-xs">{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}>
                        <SelectTrigger className="w-[80px] h-7 text-xs font-bold border border-fuchsia-200 hover:bg-fuchsia-50 text-fuchsia-600 dark:border-fuchsia-900/50 dark:hover:bg-fuchsia-950/20 dark:text-fuchsia-400 bg-transparent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[200]">
                          {[2026, 2027, 2028, 2029, 2030].map(y => (
                            <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Shift Tabs */}
                    <div className="hidden sm:flex bg-muted/60 rounded-md p-0.5 h-7 border border-slate-200 dark:border-slate-800">
                      <button 
                        onClick={() => setGlobalShiftFilter("all")} 
                        className={cn("text-[11px] px-3 h-full rounded transition-all", globalShiftFilter === "all" ? "font-bold bg-teal-100 dark:bg-teal-900/30 shadow-sm text-teal-700 dark:text-teal-400" : "font-medium text-muted-foreground hover:text-foreground")}
                      >Todos os Turnos</button>
                      <button 
                        onClick={() => setGlobalShiftFilter("impar_diurno")} 
                        className={cn("text-[11px] px-3 h-full rounded transition-all", globalShiftFilter === "impar_diurno" ? "font-bold bg-orange-100 dark:bg-orange-900/30 shadow-sm text-orange-700 dark:text-orange-400" : "font-medium text-muted-foreground hover:text-foreground")}
                      >Diurno A</button>
                      <button 
                        onClick={() => setGlobalShiftFilter("impar_noturno")} 
                        className={cn("text-[11px] px-3 h-full rounded transition-all", globalShiftFilter === "impar_noturno" ? "font-bold bg-indigo-100 dark:bg-indigo-900/30 shadow-sm text-indigo-700 dark:text-indigo-400" : "font-medium text-muted-foreground hover:text-foreground")}
                      >Noturno A</button>
                      <button 
                        onClick={() => setGlobalShiftFilter("par_diurno")} 
                        className={cn("text-[11px] px-3 h-full rounded transition-all", globalShiftFilter === "par_diurno" ? "font-bold bg-orange-100 dark:bg-orange-900/30 shadow-sm text-orange-700 dark:text-orange-400" : "font-medium text-muted-foreground hover:text-foreground")}
                      >Diurno B</button>
                      <button 
                        onClick={() => setGlobalShiftFilter("par_noturno")} 
                        className={cn("text-[11px] px-3 h-full rounded transition-all", globalShiftFilter === "par_noturno" ? "font-bold bg-indigo-100 dark:bg-indigo-900/30 shadow-sm text-indigo-700 dark:text-indigo-400" : "font-medium text-muted-foreground hover:text-foreground")}
                      >Noturno B</button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsGlobalScaleOpen(false)}
                      className="gap-1.5 h-7 text-xs font-semibold border-teal-200 hover:bg-teal-100 text-teal-600 hover:text-teal-700 dark:border-teal-900/50 dark:hover:bg-teal-900/30 dark:text-teal-400 dark:hover:text-teal-300 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 shadow-sm hover:shadow-md"
                    >
                      <Undo2 className="h-3.5 w-3.5" /> Voltar
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { if (!isMonthUnlocked) setIsAuthModalOpen(true); }}
                      className={cn(
                        "gap-1.5 h-7 text-xs hidden md:flex font-semibold transition-all duration-200 shadow-sm",
                        !isMonthUnlocked
                          ? "border-amber-200 hover:bg-amber-100 text-amber-600 hover:text-amber-700 dark:border-amber-900/50 dark:hover:bg-amber-900/30 dark:text-amber-400 dark:hover:text-amber-300 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 hover:shadow-md"
                          : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 cursor-default opacity-70"
                      )}
                      title={!isMonthUnlocked ? "Folgas extras bloqueadas — clique para liberar" : "A escala já está destravada"}
                    >
                      <ShieldOff className="h-3 w-3" /> {isMonthUnlocked ? "Escala Liberada" : "Destravar Escala"}
                    </Button>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.print()} 
                      className="gap-1.5 h-7 text-xs no-print border-emerald-200 hover:bg-emerald-100 dark:border-emerald-900/50 dark:hover:bg-emerald-900/30 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-semibold hidden lg:flex transition-all duration-200 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 shadow-sm hover:shadow-md"
                    >
                      <Printer className="h-3.5 w-3.5 text-emerald-500" /> Imprimir Escala
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleGeneratePDF}
                      disabled={isGeneratingPDF}
                      className="gap-1.5 h-7 text-xs no-print border-blue-200 hover:bg-blue-100 dark:border-blue-900/50 dark:hover:bg-blue-900/30 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold hidden lg:flex transition-all duration-200 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 shadow-sm hover:shadow-md"
                    >
                      <Download className={`h-3.5 w-3.5 text-blue-500 ${isGeneratingPDF ? "animate-pulse" : ""}`} /> 
                      {isGeneratingPDF ? "Gerando..." : "Salvar em PDF"}
                    </Button>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => { 
                        if (isMonthUnlocked) {
                          setIsLockConfirmOpen(true); 
                        } else {
                          toast.warning("A escala JÁ ESTÁ bloqueada. Se deseja editar, clique em Destravar Escala.", {
                            style: {
                              background: '#fefce8',
                              color: '#a16207',
                              border: '1px solid #fde047',
                              padding: '16px',
                              borderRadius: '12px',
                              boxShadow: '0 20px 25px -5px rgba(234, 179, 8, 0.15)',
                              fontSize: '14px',
                              fontWeight: '600'
                            },
                            iconTheme: { primary: '#ca8a04', secondary: '#fefce8' }
                          });
                        }
                      }}
                      className={cn(
                        "gap-1.5 h-7 text-xs no-print hidden xl:flex font-semibold transition-all duration-200 shadow-sm",
                        isMonthUnlocked
                          ? "border-rose-200 hover:bg-rose-100 text-rose-600 hover:text-rose-700 dark:border-rose-900/50 dark:hover:bg-rose-900/30 dark:text-rose-400 dark:hover:text-rose-300 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 hover:shadow-md bg-rose-50 dark:bg-rose-900/10"
                          : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 cursor-default opacity-70"
                      )}
                      title={isMonthUnlocked ? "A escala está destravada e editável. Clique para bloquear novamente." : "A escala já está bloqueada"}
                    >
                      <Lock className="h-3 w-3" /> {isMonthUnlocked ? "Bloquear Mês" : "Mês Bloqueado"}
                    </Button>

                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsGlobalScaleOpen(false)}
                      className="rounded-full hover:bg-slate-150 dark:hover:bg-slate-800 shrink-0 h-7 w-7 transition-all duration-200 hover:-translate-y-0.5 active:scale-90 active:translate-y-0"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>

                {/* Scrollable contents */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">

                  {/* LEGEND & DETAILED CODES */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-2 text-xs no-print">
                    <strong className="text-indigo-655 dark:text-indigo-400 text-[11px] uppercase font-black">
                    Legenda e Código de Escala:
                  </strong>
                  <div className="flex flex-wrap gap-x-5 gap-y-3.5 items-center mt-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center text-[10.5px] rounded-lg font-black bg-amber-500 text-white shadow-sm">P</span>
                      <span className="text-muted-foreground text-[11px] font-semibold">Ímpar Diurno</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center text-[10.5px] rounded-lg font-black bg-purple-500 text-white shadow-sm">P</span>
                      <span className="text-muted-foreground text-[11px] font-semibold">Ímpar Noturno</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center text-[10.5px] rounded-lg font-black bg-blue-500 text-white shadow-sm">P</span>
                      <span className="text-muted-foreground text-[11px] font-semibold">Par Diurno</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center text-[10.5px] rounded-lg font-black bg-indigo-650 text-white shadow-sm">P</span>
                      <span className="text-muted-foreground text-[11px] font-semibold">Par Noturno</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center text-[10.5px] rounded-lg font-black bg-emerald-600 text-white shadow-sm">P</span>
                      <span className="text-muted-foreground text-[11px] font-semibold">Administrativo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center text-[10.5px] rounded-lg font-black bg-emerald-500 text-white shadow-sm">F</span>
                      <span className="text-muted-foreground text-[11px] font-semibold text-emerald-650 dark:text-emerald-400">Folga Deferida</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center text-[10.5px] rounded-lg font-black bg-amber-500 text-white shadow-sm">?</span>
                      <span className="text-muted-foreground text-[11px] font-semibold text-amber-600 dark:text-amber-400">Folga Sob Análise</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center text-[10px] rounded-lg font-black bg-pink-600 text-white shadow-sm">FE</span>
                      <span className="text-muted-foreground text-[11px] font-semibold text-pink-700 dark:text-pink-400" title="Folga Eleitoral">Folga Eleitoral</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center text-[10px] rounded-lg font-black bg-cyan-550 text-white shadow-sm">FA</span>
                      <span className="text-muted-foreground text-[11px] font-semibold text-cyan-650 dark:text-cyan-400" title="Folga Aniversário">Folga Aniversário</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center text-[10px] rounded-lg font-black bg-violet-600 text-white shadow-sm">BH</span>
                      <span className="text-muted-foreground text-[11px] font-semibold text-violet-700 dark:text-violet-400" title="Banco de Horas">Banco de Horas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center text-[10px] rounded-lg font-black bg-red-700 text-white shadow-sm">LM</span>
                      <span className="text-muted-foreground text-[11px] font-semibold text-red-700 dark:text-red-400" title="Licença Médica">Licença Médica</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center text-[10.5px] rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 border font-extrabold">-</span>
                      <span className="text-muted-foreground text-[11px] font-semibold font-medium">Folga de Escala</span>
                    </div>
                  </div>
                </div>

                {/* TOTALS PANEL */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 no-print">
                  {/* Total Geral */}
                  <div 
                    className={cn(
                      "sm:col-span-1 rounded-xl p-3 border shadow flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all hover:scale-[1.03]",
                      globalShiftFilter === "all" 
                        ? "bg-emerald-500 border-emerald-600 shadow-emerald-200 dark:shadow-emerald-900" 
                        : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                    )}
                    onClick={() => setGlobalShiftFilter("all")}
                  >
                    <span className={cn("text-[10px] uppercase font-bold tracking-widest", globalShiftFilter === "all" ? "text-white" : "text-emerald-700 dark:text-emerald-400")}>Total Geral</span>
                    <span className={cn("text-3xl font-black leading-none", globalShiftFilter === "all" ? "text-white" : "text-emerald-600 dark:text-emerald-300")}>{allProfessionals.length}</span>
                    <span className={cn("text-[10px] font-medium", globalShiftFilter === "all" ? "text-emerald-100" : "text-emerald-500 dark:text-emerald-500")}>profissionais</span>
                  </div>

                  {/* Diurno A */}
                  <div className={cn("rounded-xl p-3 border shadow flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all hover:scale-[1.03]",
                    globalShiftFilter === "impar_diurno" ? "bg-amber-500 border-amber-600 shadow-amber-200 dark:shadow-amber-900" : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                  )} onClick={() => setGlobalShiftFilter(globalShiftFilter === "impar_diurno" ? "all" : "impar_diurno")}>
                    <span className={cn("text-[10px] uppercase font-bold tracking-widest", globalShiftFilter === "impar_diurno" ? "text-white" : "text-amber-700 dark:text-amber-400")}>Diurno A</span>
                    <span className={cn("text-3xl font-black leading-none", globalShiftFilter === "impar_diurno" ? "text-white" : "text-amber-600 dark:text-amber-300")}>{shiftCounts.impar_diurno}</span>
                    <span className={cn("text-[10px] font-medium", globalShiftFilter === "impar_diurno" ? "text-amber-100" : "text-amber-500 dark:text-amber-500")}>colaboradores</span>
                  </div>
                  {/* Noturno A */}
                  <div className={cn("rounded-xl p-3 border shadow flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all hover:scale-[1.03]",
                    globalShiftFilter === "impar_noturno" ? "bg-purple-600 border-purple-700 shadow-purple-200 dark:shadow-purple-900" : "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
                  )} onClick={() => setGlobalShiftFilter(globalShiftFilter === "impar_noturno" ? "all" : "impar_noturno")}>
                    <span className={cn("text-[10px] uppercase font-bold tracking-widest", globalShiftFilter === "impar_noturno" ? "text-white" : "text-purple-700 dark:text-purple-400")}>Noturno A</span>
                    <span className={cn("text-3xl font-black leading-none", globalShiftFilter === "impar_noturno" ? "text-white" : "text-purple-600 dark:text-purple-300")}>{shiftCounts.impar_noturno}</span>
                    <span className={cn("text-[10px] font-medium", globalShiftFilter === "impar_noturno" ? "text-purple-100" : "text-purple-500 dark:text-purple-500")}>colaboradores</span>
                  </div>
                  {/* Diurno B */}
                  <div className={cn("rounded-xl p-3 border shadow flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all hover:scale-[1.03]",
                    globalShiftFilter === "par_diurno" ? "bg-blue-500 border-blue-600 shadow-blue-200 dark:shadow-blue-900" : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                  )} onClick={() => setGlobalShiftFilter(globalShiftFilter === "par_diurno" ? "all" : "par_diurno")}>
                    <span className={cn("text-[10px] uppercase font-bold tracking-widest", globalShiftFilter === "par_diurno" ? "text-white" : "text-blue-700 dark:text-blue-400")}>Diurno B</span>
                    <span className={cn("text-3xl font-black leading-none", globalShiftFilter === "par_diurno" ? "text-white" : "text-blue-600 dark:text-blue-300")}>{shiftCounts.par_diurno}</span>
                    <span className={cn("text-[10px] font-medium", globalShiftFilter === "par_diurno" ? "text-blue-100" : "text-blue-500 dark:text-blue-500")}>colaboradores</span>
                  </div>
                  {/* Noturno B */}
                  <div className={cn("rounded-xl p-3 border shadow flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all hover:scale-[1.03]",
                    globalShiftFilter === "par_noturno" ? "bg-indigo-600 border-indigo-700 shadow-indigo-200 dark:shadow-indigo-900" : "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800"
                  )} onClick={() => setGlobalShiftFilter(globalShiftFilter === "par_noturno" ? "all" : "par_noturno")}>
                    <span className={cn("text-[10px] uppercase font-bold tracking-widest", globalShiftFilter === "par_noturno" ? "text-white" : "text-indigo-700 dark:text-indigo-400")}>Noturno B</span>
                    <span className={cn("text-3xl font-black leading-none", globalShiftFilter === "par_noturno" ? "text-white" : "text-indigo-600 dark:text-indigo-300")}>{shiftCounts.par_noturno}</span>
                    <span className={cn("text-[10px] font-medium", globalShiftFilter === "par_noturno" ? "text-indigo-100" : "text-indigo-500 dark:text-indigo-500")}>colaboradores</span>
                  </div>
                </div>

                {/* INTERACTIVE FILTERS ROW */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 no-print">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-slate-500">Filtrar por nome</Label>
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-3" />
                      <Input
                        placeholder="Filtrar por nome do colaborador..."
                        value={globalSearch}
                        onChange={(e) => setGlobalSearch(e.target.value)}
                        className="pl-9 h-10 text-xs bg-background rounded-lg border-slate-200 animate-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-slate-500">Filtrar por papel</Label>
                    <Select value={globalRoleFilter} onValueChange={(val: "all" | "nurse" | "technician") => setGlobalRoleFilter(val)}>
                      <SelectTrigger className="h-10 text-xs rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todo Corpo Assistencial</SelectItem>
                        <SelectItem value="nurse">Enfermeiro Liderança</SelectItem>
                        <SelectItem value="technician">Técnico de Enfermagem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-slate-500">Filtrar por escala</Label>
                    <Select value={globalShiftFilter} onValueChange={(val) => setGlobalShiftFilter(val)}>
                      <SelectTrigger className="h-10 text-xs rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as Escalas</SelectItem>
                        {shifts.map((s) => {
                          let icon = <Sun className="w-3 h-3 inline-block mr-1.5 text-amber-500 fill-amber-500" />;
                          if (s.id === "rt_lideranca") icon = <Briefcase className="w-3 h-3 inline-block mr-1.5 text-slate-500" />;
                          else if (s.id.includes("noturno")) icon = <MoonStar className="w-3 h-3 inline-block mr-1.5 text-slate-800 fill-slate-800 dark:text-slate-200 dark:fill-slate-200" />;
                          return (
                            <SelectItem key={s.id} value={s.id}>
                              <div className="flex items-center">
                                {icon} {s.name}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* EXCEL FORMULA BAR */}
                {isExcelMode && (
                  <div className="flex items-center gap-2 bg-[#f3f4f6] dark:bg-slate-900 border border-[#c0c0c0] dark:border-slate-850 p-2 rounded-xl text-xs font-mono select-none shadow-sm no-print">
                    {/* Name/Address Box */}
                    <div className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 px-3 py-1.5 text-center font-black text-emerald-600 min-w-[70px] rounded-lg shadow-inner">
                      {selectedExcelCell ? `${selectedExcelCell.colLetter}${selectedExcelCell.rowNum}` : "A1"}
                    </div>
                    {/* Divider split */}
                    <div className="h-5 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1" />
                    {/* fx symbol */}
                    <div className="text-emerald-700 dark:text-emerald-400 font-serif italic text-sm font-bold flex items-center justify-center w-8 select-none">
                      fx
                    </div>
                    {/* Input displaying active Excel equation/status */}
                    <div className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 px-3 py-1.5 rounded-lg flex items-center shadow-inner overflow-hidden text-slate-800 dark:text-slate-200 truncate">
                      {selectedExcelCell ? (
                      <div className="flex items-center gap-1">
                          <span className="text-emerald-600 dark:text-emerald-400 font-black">=</span>
                          <span className="font-semibold select-all text-[11.5px]">{selectedExcelCell.status}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10.5px] italic">Selecione (clique) em qualquer célula da escala abaixo para ler sua fórmula de comitê 12x36 na barra de fórmulas</span>
                      )}
                    </div>
                  </div>
                )}

                {/* PRINT AREA CONTAINER FOR PDF & PRINT */}
                <div ref={printAreaRef} id="print-area-container" className="flex flex-col space-y-6 bg-background p-4 print:p-0 w-full max-w-full overflow-hidden">
                  {/* Print Only Header */}
                  <div className="pdf-print-header hidden force-print-flex items-center justify-between border-b border-slate-300 pb-4 mb-4 w-full">
                    <div className="flex-shrink-0 w-[200px] flex justify-start">
                      <img src="/irdesi.png" alt="IRDESI" className="h-14 object-contain" />
                    </div>
                    <div className="flex-grow text-center flex flex-col items-center justify-center">
                      <h1 className="text-[14px] font-black uppercase text-slate-900 tracking-wider">
                        ESCALA DE ENFERMAGEM - {globalShiftFilter === "all" ? "GERAL" : (() => {
                          const sId = globalShiftFilter;
                          if (sId === 'impar_diurno') return 'DIURNO A';
                          if (sId === 'par_diurno') return 'DIURNO B';
                          if (sId === 'impar_noturno') return 'NOTURNO A';
                          if (sId === 'par_noturno') return 'NOTURNO B';
                          return shifts.find(s => s.id === sId)?.name?.toUpperCase() || "";
                        })()}
                      </h1>
                      <h2 className="text-[10px] font-semibold text-slate-700 mt-0.5">
                        Rua Poços de Caldas nº 65 - Jardim Santo Eduardo - CEP 06823-310
                      </h2>
                      <div className="text-[11px] font-extrabold text-slate-900 mt-1.5 flex items-center justify-center gap-10">
                        <span>EMBU DAS ARTES</span>
                        <span className="uppercase">{['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][selectedMonth - 1]} {selectedYear}</span>
                        <span>CNES: 7168456</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-[200px] flex justify-end">
                      <img src="/embu.png" alt="Prefeitura" className="h-14 object-contain" />
                    </div>
                  </div>

                  {/* INTEGRATED SHEET TABLE */}
                  <div className="border rounded-xl overflow-hidden bg-card shadow-sm border-slate-200 dark:border-slate-800 w-full max-w-full">
                  <div className="overflow-x-auto w-full max-w-full">
                    <table className="w-full border-collapse text-left text-xs">
                      <colgroup>
                        <col style={{ width: '220px' }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '100px' }} />
                        {daysArray.map((d) => (
                          <col key={`col-${d}`} style={{ width: '38px' }} />
                        ))}
                        <col style={{ width: '60px' }} />
                      </colgroup>
                      <thead>
                        <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                          <th
                            className="bg-muted colaborador-header"
                            style={{
                              padding: 0,
                              fontWeight: 700,
                              color: '#64748b',
                              textTransform: 'uppercase',
                              borderRight: '1px solid #e2e8f0',
                              width: '220px',
                              minWidth: '220px',
                              height: '45px'
                            }}
                          >
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: isGeneratingPDF ? 'center' : 'flex-start', paddingLeft: isGeneratingPDF ? '0px' : '12px' }}>
                              <span className="pdf-content-shift">Colaborador</span>
                            </div>
                          </th>
                          <th className="categoria-header" style={{ padding: 0, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderRight: '1px solid #e2e8f0', width: '120px', minWidth: '120px', height: '45px' }}>
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span className="pdf-content-shift">Categoria</span>
                            </div>
                          </th>
                          <th className="coren-header" style={{ padding: 0, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderRight: '1px solid #e2e8f0', width: '100px', minWidth: '100px', height: '45px' }}>
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span className="pdf-content-shift">COREN</span>
                            </div>
                          </th>
                          {daysArray.map((d) => {
                            const wDay = getWeekday(d);
                            const dow = new Date(selectedYear, selectedMonth - 1, d).getDay();
                            const isWeekend = dow === 0 || dow === 6;
                            return (
                              <th
                                key={d}
                                style={{
                                  padding: 0,
                                  fontWeight: 800,
                                  borderRight: '1px solid #e2e8f0',
                                  width: '38px',
                                  minWidth: '36px',
                                  height: '45px',
                                  backgroundColor: isWeekend ? 'rgba(239,68,68,0.04)' : '#f1f5f9',
                                  color: isWeekend ? '#dc2626' : '#475569',
                                }}
                              >
                                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 900 }}>{d}</span>
                                  <span style={{ fontSize: '8px', opacity: 0.8, textTransform: 'uppercase', fontWeight: 700 }}>{wDay}</span>
                                </div>
                              </th>
                            );
                          })}
                          <th style={{ padding: 0, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderRight: '1.5px solid #94a3b8', width: '60px', minWidth: '60px', height: '45px' }}>
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              Ass.
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {filteredGlobals.length === 0 ? (
                          <tr>
                            <td colSpan={4 + daysArray.length} className="p-10 text-center text-muted-foreground font-bold">
                              Nenhum profissional assistencial corresponde aos critérios selecionados.
                            </td>
                          </tr>
                        ) : (
                          (() => {
                            const STATUS_STYLES = {
                              duty:             { bg: 'bg-green-100 dark:bg-green-900/40',    text: 'text-green-700 dark:text-green-300',   border: 'border-green-300 dark:border-green-700' },
                              'leave-approved': { bg: 'bg-gray-100 dark:bg-gray-700/40',     text: 'text-gray-650 dark:text-gray-300',     border: 'border-gray-300 dark:border-gray-600' },
                              'leave-toggled':  { bg: 'bg-gray-100 dark:bg-gray-700/40',     text: 'text-gray-650 dark:text-gray-300',     border: 'border-gray-300 dark:border-gray-600' },
                              'leave-pending':  { bg: 'bg-amber-100 dark:bg-amber-900/40',   text: 'text-amber-700 dark:text-amber-300',   border: 'border-amber-300 dark:border-amber-700 animate-pulse' },
                              'off-duty':       { bg: 'bg-transparent',                       text: 'text-slate-350 dark:text-slate-700',   border: 'border-transparent' },
                              FE:  { bg: 'bg-teal-100 dark:bg-teal-900/40',    text: 'text-teal-700 dark:text-teal-300',     border: 'border-teal-300 dark:border-teal-700' },
                              FA:  { bg: 'bg-sky-100 dark:bg-sky-900/40',      text: 'text-sky-700 dark:text-sky-300',       border: 'border-sky-300 dark:border-sky-700' },
                              BH:  { bg: 'bg-violet-100 dark:bg-violet-900/40',text: 'text-violet-750 dark:text-violet-300', border: 'border-violet-300 dark:border-violet-700' },
                              LM:  { bg: 'bg-purple-100 dark:bg-purple-900/40',text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-700' },
                              V:   { bg: 'bg-yellow-100 dark:bg-yellow-900/40',text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-300 dark:border-yellow-700' },
                              LTS: { bg: 'bg-orange-100 dark:bg-orange-900/40',text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700' },
                              LS:  { bg: 'bg-orange-100 dark:bg-orange-900/40',text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700' },
                              FI:  { bg: 'bg-red-200 dark:bg-red-900/60',      text: 'text-red-850 dark:text-red-200',       border: 'border-red-450' },
                              TP:  { bg: 'bg-sky-200 dark:bg-sky-900/60',      text: 'text-sky-850 dark:text-sky-200',       border: 'border-sky-400' },
                            };

                            const getRoleOrder = (role) => {
                              const r = String(role || '').toUpperCase().trim();
                              if (r === 'RES.TECNICA' || r === 'LIDERANÇA' || r === 'SUPERVISÃO') return 0;
                              if (r === 'ENFERMEIRA' || r === 'ENFERMEIRO' || r === 'NURSE') return 1;
                              return 2;
                            };

                            const roleBadgeColor = (role) => {
                              const r = String(role || '').toUpperCase().trim();
                              if (r === 'ENFERMEIRA' || r === 'ENFERMEIRO' || r === 'NURSE') return 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/40 dark:text-teal-300';
                              if (r.startsWith('TEC') || r.startsWith('AUX') || r === 'TECHNICIAN') return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300';
                              if (r === 'RES.TECNICA' || r === 'LIDERANÇA' || r === 'SUPERVISÃO') return 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300';
                              return 'bg-gray-100 text-gray-650 border-gray-300';
                            };

                            return filteredGlobals.map((p, index) => {
                              const role = p.roleCategory || (p.role === 'nurse' ? 'ENFERMEIRA' : 'TEC.ENF');
                              const prevEntry = filteredGlobals[index - 1];
                              const prevRole = prevEntry ? (prevEntry.roleCategory || (prevEntry.role === 'nurse' ? 'ENFERMEIRA' : 'TEC.ENF')) : null;
                              const prevOrder = prevRole ? getRoleOrder(prevRole) : -1;
                              const currOrder = getRoleOrder(role);

                              const showGroupHeader = index === 0 || currOrder !== prevOrder;
                              const groupLabel =
                                currOrder === 0 ? '— RESPONSÁVEL TÉCNICA / LIDERANÇA —' :
                                currOrder === 1 ? '— ENFERMEIROS(AS) —' :
                                '— TÉCNICOS E AUXILIARES DE ENFERMAGEM —';
                              const groupColor =
                                currOrder === 0 ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300' :
                                currOrder === 1 ? 'bg-teal-50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-300' :
                                'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300';

                              return (
                                <React.Fragment key={p.id}>
                                  {showGroupHeader && (
                                    <tr className={`${groupColor}`} style={{ border: 'none' }}>
                                      <td 
                                        colSpan={4 + daysArray.length}
                                        className={`sticky left-0 ${groupColor} z-10 text-[10px] font-bold uppercase tracking-wider group-header-cell`}
                                        style={{ borderTop: 'none', borderBottom: 'none', borderLeft: 'none', borderRight: '1.5px solid #94a3b8', padding: 0, height: '32px', verticalAlign: 'middle', textAlign: 'left' }}
                                      >
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: '12px' }}>
                                          {groupLabel}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all" style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    {/* Name cell */}
                                    <td
                                      className="bg-card colaborador-cell"
                                      style={{
                                        padding: 0,
                                        borderRight: '1px solid #e2e8f0',
                                        width: '220px',
                                        height: '40px',
                                        textAlign: isGeneratingPDF ? 'center' : 'left'
                                      }}
                                    >
                                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: isGeneratingPDF ? 'center' : 'flex-start', paddingLeft: isGeneratingPDF ? '0px' : '12px', paddingRight: '12px' }}>
                                        <span style={{ display: 'block', fontSize: '11px', fontWeight: 900, color: '#0f172a', lineHeight: 1.3, textAlign: isGeneratingPDF ? 'center' : 'left' }} title={p.name}>
                                          {p.name}
                                        </span>
                                      </div>
                                    </td>
                                    {/* Category badge cell */}
                                    <td className="categoria-cell" style={{ padding: 0, borderRight: '1px solid #e2e8f0', width: '120px', height: '40px' }}>
                                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '8px', paddingRight: '8px' }}>
                                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[9px] font-semibold border ${roleBadgeColor(p.roleCategory || p.role)}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                          <span className="pdf-inner-text">{p.roleCategory || p.role}</span>
                                        </span>
                                      </div>
                                    </td>
                                    {/* COREN cell */}
                                    <td className="coren-cell" style={{ padding: 0, borderRight: '1px solid #e2e8f0', width: '100px', height: '40px' }}>
                                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '8px', paddingRight: '8px', fontFamily: 'monospace', fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap' }}>
                                        <span className="pdf-content-shift">{p.coren || '—'}</span>
                                      </div>
                                    </td>
                                    {daysArray.map((d) => {
                                      const dayStatus = getDayStatus(p, d);
                                      const dow = new Date(selectedYear, selectedMonth - 1, d).getDay();
                                      const isWeekend = dow === 0 || dow === 6;
                                      
                                      const style = STATUS_STYLES[dayStatus] || STATUS_STYLES['off-duty'];
                                      
                                      const displayVal = dayStatus === 'duty' ? 'P' :
                                                        dayStatus === 'off-duty' ? '·' :
                                                        dayStatus === 'leave-approved' ? 'F' :
                                                        dayStatus === 'leave-toggled' ? 'F' :
                                                        dayStatus === 'leave-pending' ? '?' : dayStatus;

                                      return (
                                        <td
                                          key={d}
                                          onClick={() => {
                                            setSelectedExcelCell({
                                              memberName: p.name,
                                              day: d,
                                              colLetter: getExcelColumnLetter(d + 1),
                                              rowNum: index + 1,
                                              status: getExcelValueForFormulaBar(p, d, dayStatus)
                                            });
                                            handleCellClick(p, d, dayStatus);
                                          }}
                                          style={{
                                            padding: 0,
                                            textAlign: 'center',
                                            verticalAlign: 'middle',
                                            borderRight: '1px solid #e2e8f0',
                                            width: '38px',
                                            height: '40px',
                                            cursor: 'pointer',
                                            backgroundColor: isWeekend ? 'rgba(254,242,242,1)' : 'transparent',
                                          }}
                                        >
                                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span className={`inline-flex items-center justify-center h-5 w-5 rounded text-[9px] font-semibold border ${style.bg} ${style.text} ${style.border}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '4px', fontSize: '9px', fontWeight: 600 }}>
                                              <span className="pdf-inner-text">{displayVal}</span>
                                            </span>
                                          </div>
                                        </td>
                                      );
                                    })}
                                    <td style={{ padding: 0, borderRight: '1.5px solid #94a3b8', width: '60px', height: '40px' }}>
                                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(100,116,139,0.3)', fontFamily: 'monospace', fontSize: '10px', whiteSpace: 'nowrap' }}>
                                        ____
                                      </div>
                                    </td>
                                  </tr>
                                </React.Fragment>
                              );
                            });
                          })()
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Print Footer Area (Legend + Signature) - shown during PDF gen via JS */}
                <div className="pdf-print-footer mt-6 space-y-6" style={{ display: 'none' }}>
                  {/* Legend Replica for Printing */}
                  <div className="p-4 bg-white border border-slate-300 rounded-xl flex flex-col gap-2 text-xs print-legend">
                    <strong className="text-slate-900 text-[11px] uppercase font-black">
                      Legenda e Código de Escala:
                    </strong>
                    <div className="flex flex-wrap gap-x-6 gap-y-3 items-center mt-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center text-[10px] rounded font-black text-white" style={{ backgroundColor: '#f59e0b', color: 'white', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}><span className="pdf-inner-text">P</span></span>
                        <span className="text-slate-800 text-[10px] font-semibold">Ímpar Diurno</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center text-[10px] rounded font-black text-white" style={{ backgroundColor: '#a855f7', color: 'white', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}><span className="pdf-inner-text">P</span></span>
                        <span className="text-slate-800 text-[10px] font-semibold">Ímpar Noturno</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center text-[10px] rounded font-black text-white" style={{ backgroundColor: '#3b82f6', color: 'white', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}><span className="pdf-inner-text">P</span></span>
                        <span className="text-slate-800 text-[10px] font-semibold">Par Diurno</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center text-[10px] rounded font-black text-white" style={{ backgroundColor: '#4f46e5', color: 'white', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}><span className="pdf-inner-text">P</span></span>
                        <span className="text-slate-800 text-[10px] font-semibold">Par Noturno</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center text-[10px] rounded font-black text-white" style={{ backgroundColor: '#059669', color: 'white', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}><span className="pdf-inner-text">P</span></span>
                        <span className="text-slate-800 text-[10px] font-semibold">Administrativo</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center text-[10px] rounded font-black text-white" style={{ backgroundColor: '#10b981', color: 'white', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}><span className="pdf-inner-text">F</span></span>
                        <span className="text-slate-800 text-[10px] font-semibold">Folga Deferida</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center text-[10px] rounded font-black text-white" style={{ backgroundColor: '#f59e0b', color: 'white', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}><span className="pdf-inner-text">?</span></span>
                        <span className="text-slate-800 text-[10px] font-semibold">Folga Sob Análise</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center text-[9.5px] rounded font-black text-white" style={{ backgroundColor: '#db2777', color: 'white', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}><span className="pdf-inner-text">FE</span></span>
                        <span className="text-slate-800 text-[10px] font-semibold">Folga Eleitoral</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center text-[9.5px] rounded font-black text-white" style={{ backgroundColor: '#06b6d4', color: 'white', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}><span className="pdf-inner-text">FA</span></span>
                        <span className="text-slate-800 text-[10px] font-semibold">Folga Abonada</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center text-[9.5px] rounded font-black text-white" style={{ backgroundColor: '#7c3aed', color: 'white', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}><span className="pdf-inner-text">BH</span></span>
                        <span className="text-slate-800 text-[10px] font-semibold">Banco de Horas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center text-[9.5px] rounded font-black text-white" style={{ backgroundColor: '#b91c1c', color: 'white', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}><span className="pdf-inner-text">LM</span></span>
                        <span className="text-slate-800 text-[10px] font-semibold">Licença Médica</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center text-[10px] rounded border font-extrabold" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1', color: '#64748b', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}><span className="pdf-inner-text">-</span></span>
                        <span className="text-slate-800 text-[10px] font-semibold">Folga de Escala</span>
                      </div>
                    </div>
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
                      
                      <div className="flex flex-col gap-10">
                        {/* Renata */}
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
                        
                        {/* Maria Eduarda */}
                        <div className="flex flex-col items-center gap-1.5 min-w-[280px]">
                          <div className="w-full border-b border-black h-5" />
                          <span className="text-[11.5px] font-black text-slate-900 uppercase tracking-wider text-center">
                            Maria Eduarda Spadini de Oliveira
                          </span>
                          <span className="text-[9.5px] font-bold text-slate-600 uppercase tracking-wide text-center">
                            Liderança
                          </span>
                          <span className="text-[9px] font-mono font-bold text-slate-500 text-center">
                            COREN-SP 635293
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}

      {/* INTERACTIVE CELL EDICTOR MODAL DIALOG */}
      <Dialog open={!!editingCell} onOpenChange={(open) => !open && setEditingCell(null)}>
        <DialogContent className="max-w-md w-full p-6 rounded-xl border border-border bg-background shadow-2xl">
          <DialogHeader className="pb-2 border-b">
            <div className="flex items-center gap-2 mb-1">
              <CalendarCheck className="h-5 w-5 text-indigo-500" />
              <DialogTitle className="text-base font-black uppercase tracking-tight">Editar Célula de Escala</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Ajuste as folgas de direito, plantões ou atualize permanentemente as informações cadastrais do profissional.
            </DialogDescription>
          </DialogHeader>

          {editingCell && (
            <div className="space-y-4 py-1 text-xs">
              {/* Context bar inside modal */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg flex justify-between items-center text-xs">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Profissional</span>
                  <span className="text-sm font-black text-foreground">{editingCell.memberName}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Data e Turno</span>
                  <Badge className="bg-indigo-650 hover:bg-indigo-650 text-white font-black text-xs px-2 py-0.5">
                    Dia {editingCell.day}/Mai
                  </Badge>
                </div>
              </div>

              {/* Tabs wrapper */}
              <Tabs value={activeEditTab} onValueChange={setActiveEditTab} className="w-full">
                <TabsList className="grid grid-cols-2 w-full h-11 bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                  <TabsTrigger value="status" className="text-xs font-bold uppercase py-1.5 cursor-pointer">
                    🗓️ Status / Direitos
                  </TabsTrigger>
                  <TabsTrigger value="profile" className="text-xs font-bold uppercase py-1.5 cursor-pointer">
                    👤 Dados do Cadastro
                  </TabsTrigger>
                </TabsList>

                {/* Tab content: Status and Rights */}
                <TabsContent value="status" className="space-y-3 pt-3">
                  <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider block mb-1">
                    Selecione o Status ou Direito de Folga para o Dia {editingCell.day}/Mai:
                  </span>
                  
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {/* Sub Heading: PLANTÃO VS REVEZAMENTO */}
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block mb-1.5">Atividade & Escala Geral</span>
                      <div className="grid grid-cols-1 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingCellStatus("default")}
                          className={cn(
                            "text-left p-2 rounded-lg border text-xs gap-3 flex items-center justify-between cursor-pointer transition-all",
                            editingCellStatus === "default"
                              ? "border-slate-500 dark:border-slate-400 bg-slate-100 dark:bg-slate-900 font-extrabold shadow-sm"
                              : "border-transparent bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-105/30 text-muted-foreground"
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">🗓️ Seguir Escala Padrão 12x36</span>
                            <span className="text-[9px] text-muted-foreground">Usa o ciclo padrão (ímpar/par) definido para seu grupo.</span>
                          </div>
                          <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold border-transparent text-[9px]">Padrão</Badge>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingCellStatus("duty")}
                          className={cn(
                            "text-left p-2 rounded-lg border text-xs gap-3 flex items-center justify-between cursor-pointer transition-all",
                            editingCellStatus === "duty"
                              ? "border-blue-500 bg-blue-500/[0.04] font-extrabold shadow-sm"
                              : "border-transparent bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-105/30 text-muted-foreground"
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">🔵 Forçar Plantão Clínico (P)</span>
                            <span className="text-[9px] text-muted-foreground">Obriga escala ativa (trabalho) nesta data em definitivo.</span>
                          </div>
                          <Badge className="bg-blue-500 text-white font-bold border-transparent text-[9px]">Plantão</Badge>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingCellStatus("off-duty")}
                          className={cn(
                            "text-left p-2 rounded-lg border text-xs gap-3 flex items-center justify-between cursor-pointer transition-all",
                            editingCellStatus === "off-duty"
                              ? "border-indigo-500 bg-indigo-500/[0.04] font-extrabold shadow-sm"
                              : "border-transparent bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-105/30 text-muted-foreground"
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">⚪ Forçar Folga de Revezamento (-)</span>
                            <span className="text-[9px] text-muted-foreground">Define dia de folga tradicional de ciclo sem plantão clínico.</span>
                          </div>
                          <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold border-transparent text-[9px]">Folga</Badge>
                        </button>
                      </div>
                    </div>

                    {/* Sub Heading: DIREITOS & LEGAL BENEFITS */}
                    <div className="pt-2 border-t">
                      <span className="text-[9px] font-black uppercase text-slate-400 block mb-1.5">Direitos de Folga & Afastamentos Legais</span>
                      <div className="grid grid-cols-1 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingCellStatus("leave-approved")}
                          className={cn(
                            "text-left p-2 rounded-lg border text-xs gap-3 flex items-center justify-between cursor-pointer transition-all",
                            editingCellStatus === "leave-approved"
                              ? "border-emerald-600 bg-emerald-500/[0.04] font-extrabold shadow-sm"
                              : "border-transparent bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-105/30 text-muted-foreground"
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">🟢 Folga de Direito Deferida (F)</span>
                            <span className="text-[9px] text-muted-foreground">Concede folga legal homologada formalmente pela RT Renata.</span>
                          </div>
                          <Badge className="bg-emerald-600 text-white font-bold border-transparent text-[9px] uppercase">Deferido</Badge>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingCellStatus("leave-pending")}
                          className={cn(
                            "text-left p-2 rounded-lg border text-xs gap-3 flex items-center justify-between cursor-pointer transition-all",
                            editingCellStatus === "leave-pending"
                              ? "border-amber-500 bg-amber-500/[0.04] font-extrabold shadow-sm"
                              : "border-transparent bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-105/30 text-muted-foreground"
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">🟡 Folga Sob Análise (?)</span>
                            <span className="text-[9px] text-muted-foreground">Insere solicitação pendente para análise operacional de cobertura.</span>
                          </div>
                          <Badge className="bg-amber-500 text-white font-bold border-transparent text-[9px] uppercase">Análise</Badge>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingCellStatus("FE")}
                          className={cn(
                            "text-left p-2 rounded-lg border text-xs gap-3 flex items-center justify-between cursor-pointer transition-all",
                            editingCellStatus === "FE"
                              ? "border-pink-500 bg-pink-500/[0.04] font-extrabold shadow-sm"
                              : "border-transparent bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-105/30 text-muted-foreground"
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">🌸 Folga Eleitoral (FE)</span>
                            <span className="text-[9px] text-muted-foreground">Direito constitucional decorrente de trabalhos prestados à Justiça Eleitoral.</span>
                          </div>
                          <Badge className="bg-pink-600 text-white font-bold border-transparent text-[9px]">FE</Badge>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingCellStatus("FA")}
                          className={cn(
                            "text-left p-2 rounded-lg border text-xs gap-3 flex items-center justify-between cursor-pointer transition-all",
                            editingCellStatus === "FA"
                              ? "border-cyan-500 bg-cyan-500/[0.04] font-extrabold shadow-sm"
                              : "border-transparent bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-105/30 text-muted-foreground"
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">🎂 Folga Aniversário (FA)</span>
                            <span className="text-[9px] text-muted-foreground">Direito ao dia de descanso remunerado decorrente do aniversário de contrato/vida.</span>
                          </div>
                          <Badge className="bg-cyan-550 text-white font-bold border-transparent text-[9px]">FA</Badge>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingCellStatus("BH")}
                          className={cn(
                            "text-left p-2 rounded-lg border text-xs gap-3 flex items-center justify-between cursor-pointer transition-all",
                            editingCellStatus === "BH"
                              ? "border-violet-500 bg-violet-500/[0.04] font-extrabold shadow-sm"
                              : "border-transparent bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-105/30 text-muted-foreground"
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">⏰ Compensação Banco de Horas (BH)</span>
                            <span className="text-[9px] text-muted-foreground">Usa saldo positivo acumulado para abatimento de horas trabalhadas.</span>
                          </div>
                          <Badge className="bg-violet-600 text-white font-bold border-transparent text-[9px]">BH</Badge>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingCellStatus("LM")}
                          className={cn(
                            "text-left p-2 rounded-lg border text-xs gap-3 flex items-center justify-between cursor-pointer transition-all",
                            editingCellStatus === "LM"
                              ? "border-red-650 bg-red-600/[0.04] font-extrabold shadow-sm"
                              : "border-transparent bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-105/30 text-muted-foreground"
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">🏥 Licença Médica / Atestado (LM)</span>
                            <span className="text-[9px] text-muted-foreground">Afastamento regular por motivo de tratamento médico homologado no SUS.</span>
                          </div>
                          <Badge className="bg-red-700 text-white font-bold border-transparent text-[9px]">LM</Badge>
                        </button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab content: Professional Profile attributes */}
                <TabsContent value="profile" className="space-y-4 pt-3">
                  <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider block">
                    Cadastro Fixo & Grupo de Escala (Afeta todos os dias):
                  </span>

                  <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed">
                    {/* 1. EDIT NAME */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-slate-500">Nome assistencial</Label>
                      <Input 
                        value={editingName} 
                        onChange={(e) => setEditingName(e.target.value)} 
                        className="h-10 text-xs rounded-lg bg-background border-slate-200 dark:border-slate-800"
                        placeholder="Nome de trabalho do profissional"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* 2. EDIT ROLE */}
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-slate-500">Função / Cargo</Label>
                        <Select 
                          value={editingRole} 
                          onValueChange={(val) => setEditingRole(val)}
                        >
                          <SelectTrigger className="h-10 text-xs rounded-lg bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RES.TECNICA" className="text-xs">Resp. Técnica</SelectItem>
                            <SelectItem value="LIDERANÇA" className="text-xs">Liderança</SelectItem>
                            <SelectItem value="ENFERMEIRA" className="text-xs">Enfermeira</SelectItem>
                            <SelectItem value="ENFERMEIRO" className="text-xs">Enfermeiro</SelectItem>
                            <SelectItem value="TEC.ENF" className="text-xs">Téc. Enfermagem</SelectItem>
                            <SelectItem value="AUX.ENF" className="text-xs">Aux. Enfermagem</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 3. EDIT SHIFT GROUP */}
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-slate-500">Grupo de Escala</Label>
                        <Select 
                          value={editingShiftId} 
                          onValueChange={(val) => setEditingShiftId(val)}
                        >
                          <SelectTrigger className="h-10 text-xs rounded-lg bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {shifts.map(s => (
                              <SelectItem key={s.id} value={s.id} className="text-xs">
                                {s.id === "rt_lideranca" ? "RT / Liderança" : s.name.replace(/✨|☀️|🌙/g, "").trim()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="text-[10px] text-muted-foreground bg-amber-500/5 p-2 rounded border border-amber-500/10 leading-tight">
                      ⚠️ <strong>Atenção ao alterar o Grupo de Escala:</strong> Esse profissional será realocado permanentemente para a nova rotatividade 12x36 do turno escolhido.
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <DialogFooter className="mt-4 gap-2 flex justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setEditingCell(null)}
              className="rounded-lg h-9 text-xs"
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={requestSaveCellEdits}
              className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg h-9 text-xs font-black uppercase tracking-wider"
            >
              Confirmar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* POPUP DE CONFIRMAÇÃO DE 2ª ETAPA — Confirmar antes de salvar na escala */}
      <AnimatePresence>
        {pendingConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPendingConfirm(null)}
              className="absolute inset-0 bg-black/50"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className={`relative w-full max-w-sm bg-card border rounded-xl shadow-2xl p-6 z-10 flex flex-col items-center gap-4 ${pendingConfirm.type === 'warning' ? 'border-amber-500/40' : 'border-primary/20'}`}
            >
              {/* Ícone */}
              <div className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center ${pendingConfirm.type === 'warning' ? 'bg-amber-500/10' : 'bg-primary/10'}`}>
                {pendingConfirm.type === 'warning' ? (
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                ) : (
                  <CalendarCheck className="h-6 w-6 text-primary" />
                )}
              </div>

              <div className="space-y-2 w-full">
                <h3 className={`text-sm font-black text-center ${pendingConfirm.type === 'warning' ? 'text-amber-600' : 'text-card-foreground'}`}>
                  {pendingConfirm.type === 'warning' ? 'Aviso de Alteração de Escala' : 'Confirmar Alteração de Escala'}
                </h3>

                {/* Dados do colaborador */}
                <div 
                  className="bg-muted px-3 py-2 rounded-lg text-left border border-border space-y-1.5 w-full cursor-pointer hover:border-primary/40 hover:bg-muted/80 transition-all group/container relative"
                  onClick={() => {
                    setEditingCell(pendingConfirm.snapshotCell);
                    setEditingCellStatus(pendingConfirm.snapshotStatus);
                    setEditingName(pendingConfirm.snapshotName);
                    setEditingRole(pendingConfirm.snapshotRole);
                    setEditingShiftId(pendingConfirm.snapshotShiftId);
                    setActiveEditTab("profile");
                    setPendingConfirm(null);
                  }}
                  title="Clique para voltar e editar a ficha"
                >
                  <div className="absolute top-1 right-2 opacity-0 group-hover/container:opacity-100 transition-opacity">
                    <span className="text-[9px] font-bold text-primary flex items-center gap-1">
                      <Settings2 className="w-3 h-3" /> Editar Ficha
                    </span>
                  </div>
                  <div className="group cursor-pointer p-1 -m-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-all w-fit pr-6">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-bold transition-colors group-hover:text-primary">Colaborador(a)</span>
                    <span className="text-[11px] font-bold text-foreground inline-block transform transition-transform group-hover:translate-x-0.5">{pendingConfirm.memberName}</span>
                  </div>
                  <div className="flex items-center gap-6 border-t border-border/60 pt-1.5 text-[10px]">
                    <div className="group cursor-pointer p-1 -m-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                      <span className="text-[8px] uppercase tracking-wider text-muted-foreground block font-medium transition-colors group-hover:text-primary">Cargo</span>
                      <span className="font-semibold text-foreground inline-block transform transition-transform group-hover:translate-x-0.5">{pendingConfirm.memberRole}</span>
                    </div>
                    <div className="group cursor-pointer p-1 -m-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                      <span className="text-[8px] uppercase tracking-wider text-muted-foreground block font-medium transition-colors group-hover:text-primary">Turno</span>
                      <span className="font-semibold text-foreground inline-block transform transition-transform group-hover:translate-x-0.5">{pendingConfirm.shiftName}</span>
                    </div>
                    <div className="group cursor-pointer p-1 -m-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                      <span className="text-[8px] uppercase tracking-wider text-muted-foreground block font-medium transition-colors group-hover:text-primary">Dia</span>
                      <span className="font-semibold text-foreground inline-block transform transition-transform group-hover:scale-[1.05] origin-left">{pendingConfirm.day}</span>
                    </div>
                  </div>
                </div>

                {/* Novo status ou Mensagem de Aviso */}
                <div className="text-left pt-1">
                  {pendingConfirm.type === 'warning' && pendingConfirm.warningMsg ? (
                    <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap font-medium">
                      {pendingConfirm.warningMsg}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Deseja confirmar a alteração para{' '}
                      <strong className="text-foreground">{pendingConfirm.statusLabel}</strong>?
                    </p>
                  )}
                </div>
              </div>

              {/* Botões */}
              <div className="w-full flex gap-3 pt-1">
                <button
                  onClick={() => setPendingConfirm(null)}
                  className="flex-1 bg-muted hover:bg-muted/80 text-muted-foreground font-semibold text-xs py-2 rounded-lg transition-all border border-border focus:outline-none"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!pendingConfirm) return;
                    // Chama saveCellEdits passando os dados do snapshot diretamente
                    saveCellEdits({
                      cell: pendingConfirm.snapshotCell,
                      status: pendingConfirm.snapshotStatus,
                      name: pendingConfirm.snapshotName,
                      role: pendingConfirm.snapshotRole,
                      shiftId: pendingConfirm.snapshotShiftId,
                    });
                    setPendingConfirm(null);
                  }}
                  className={`flex-1 font-semibold text-xs py-2 rounded-lg transition-all shadow-md focus:outline-none ${
                    pendingConfirm.type === 'warning' 
                      ? 'bg-amber-500 text-white hover:bg-amber-600' 
                      : 'bg-primary text-primary-foreground hover:bg-primary/95'
                  }`}
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP VERMELHO DE ALERTA DE VIOLAÇÃO DE REGRA */}
      <AnimatePresence>
        {cellAlert && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCellAlert(null)}
              className="absolute inset-0 bg-black/50"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-sm bg-card border border-destructive/20 rounded-xl shadow-2xl p-6 z-10 flex flex-col items-center gap-4"
            >
              {/* Ícone */}
              <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>

              <div className="space-y-2 w-full">
                <h3 className="text-sm font-black text-destructive text-center uppercase tracking-tight">
                  Ação Não Permitida
                </h3>

                {/* Dados do colaborador */}
                <div 
                  className="bg-destructive/5 hover:bg-destructive/10 px-3 py-2 rounded-lg text-left border border-destructive/20 hover:border-destructive/40 transition-all duration-300 space-y-1.5 w-full cursor-pointer group/container relative"
                  onClick={() => {
                    setEditingCell(cellAlert.snapshotCell);
                    setEditingCellStatus(cellAlert.snapshotStatus);
                    setEditingName(cellAlert.snapshotName);
                    setEditingRole(cellAlert.snapshotRole);
                    setEditingShiftId(cellAlert.snapshotShiftId);
                    setActiveEditTab("profile");
                    setCellAlert(null);
                  }}
                  title="Clique para voltar e alterar os dados"
                >
                  <div className="absolute top-1 right-2 opacity-0 group-hover/container:opacity-100 transition-opacity">
                    <span className="text-[9px] font-bold text-destructive flex items-center gap-1">
                      <Settings2 className="w-3 h-3" /> Editar Ficha
                    </span>
                  </div>
                  <div className="group p-1 -mx-1 rounded-md hover:bg-destructive/10 transition-all duration-300 w-fit pr-6">
                    <span className="text-[9px] uppercase tracking-wider text-destructive/80 block font-bold transition-colors group-hover:text-destructive">Colaborador(a)</span>
                    <span className="text-[11px] font-bold text-destructive inline-block transform transition-transform duration-300 group-hover:translate-x-1">{cellAlert.memberName}</span>
                  </div>
                  <div className="flex items-center gap-6 border-t border-destructive/10 pt-1.5 text-[10px]">
                    <div className="group p-1 -mx-1 rounded-md hover:bg-destructive/10 transition-all duration-300">
                      <span className="text-[8px] uppercase tracking-wider text-destructive/80 block font-medium transition-colors group-hover:text-destructive">Cargo</span>
                      <span className="font-semibold text-destructive inline-block transform transition-transform duration-300 group-hover:translate-x-1">{cellAlert.memberRole}</span>
                    </div>
                    <div className="group p-1 -mx-1 rounded-md hover:bg-destructive/10 transition-all duration-300">
                      <span className="text-[8px] uppercase tracking-wider text-destructive/80 block font-medium transition-colors group-hover:text-destructive">Turno</span>
                      <span className="font-semibold text-destructive inline-block transform transition-transform duration-300 group-hover:translate-x-1">{cellAlert.shiftName}</span>
                    </div>
                  </div>
                </div>

                {/* Mensagem de erro */}
                <div className="text-left pt-2">
                  <p className="text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed font-medium">
                    {cellAlert.msg}
                  </p>
                </div>
              </div>

              {/* Botão */}
              <div className="w-full flex pt-2">
                <button
                  onClick={() => setCellAlert(null)}
                  className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold text-xs py-2.5 rounded-lg transition-all shadow-md focus:outline-none uppercase tracking-wider"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TAB CONTENT: OVERVIEW BLOCK */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* L. CALENDAR CONTROL PANEL */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="bg-card border border-border shadow-sm rounded-xl relative overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/15">
                <CardTitle className="text-xs uppercase font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> Seleção de Dia de Plantão
                </CardTitle>
                <CardDescription className="text-xs">
                  Alterne entre dias Ímpares ou Pares para carregar as equipes da Escala 12x36 Correspondente em {getMonthName(selectedMonth)} de {selectedYear}.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-7 gap-1.5 text-center mb-4">
                  {["D", "S", "T", "Q", "Q", "S", "S"].map((d, idx) => (
                    <span key={idx} className="text-[10px] font-black text-slate-400 dark:text-slate-500">
                      {d}
                    </span>
                  ))}

                  {/* Offset empty spaces dynamically depending on month and year */}
                  {(() => {
                    const startingOffset = new Date(selectedYear, selectedMonth - 1, 1).getDay();
                    return Array.from({ length: startingOffset }).map((_, i) => (
                      <div key={`empty-${i}`} className="bg-transparent aspect-square" />
                    ));
                  })()}

                  {daysArray.map((dayNum) => {
                    const isOdd = dayNum % 2 !== 0;
                    const isSelected = selectedDay === dayNum;
                    
                    return (
                      <button
                        key={dayNum}
                        onClick={() => handleDaySelect(dayNum)}
                        className={cn(
                          "aspect-square text-[11px] font-bold rounded-lg transition-all flex flex-col items-center justify-center relative cursor-pointer border",
                          isSelected
                            ? "bg-indigo-600 border-indigo-600 text-white font-extrabold shadow-sm"
                            : isOdd
                              ? "bg-purple-500/[0.04] border-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950/40"
                              : "bg-blue-500/[0.04] border-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/40"
                        )}
                      >
                        <span>{dayNum}</span>
                        <span className="text-[6.5px] scale-90 opacity-70 mt-0.5 uppercase leading-none">
                          {isOdd ? "ÍMP" : "PAR"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border text-center space-y-1 text-xs">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Mapeamento Selecionado: Dia {selectedDay} de {getMonthName(selectedMonth)} de {selectedYear}
                  </div>
                  <p className="text-[11px] text-slate-550 dark:text-slate-400">
                    Ativação automática para o grupo de plantões de dias <strong className="text-indigo-600 dark:text-indigo-400">{isSelectedDayOdd ? "ÍMPARES" : "PARES"}</strong>.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* SECTORS METRIC COMPLIANCE CARD */}
            <Card className="bg-card border border-border shadow-sm rounded-xl">
              <CardHeader className="pb-3 border-b border-border/15">
                <CardTitle className="text-xs uppercase font-black text-slate-700 dark:text-slate-350">
                  Resumo das Escalas 12x36
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {shifts.map((s) => {
                  const sNurses = (s.staff || []).filter(m => m.role === "nurse");
                  const sTechs = (s.staff || []).filter(m => m.role === "technician");
                  const offNurses = sNurses.filter(m => m.status === "leave").length;
                  const offTechs = sTechs.filter(m => m.status === "leave").length;
                  
                  const isSShiftActive = activeShiftId === s.id;
                  const isWarn = offTechs > (limits?.technicians || 3) || offNurses > (limits?.nurses || 1);

                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveShiftId(s.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer",
                        isSShiftActive 
                          ? "border-indigo-500 bg-indigo-500/[0.04] dark:bg-indigo-505/10 shadow-sm"
                          : "border-border/40 hover:bg-slate-50 dark:hover:bg-slate-950"
                      )}
                    >
                      <div className="space-y-1">
                        <span className="font-extrabold text-foreground block tracking-tight">
                          {s.name}
                        </span>
                        <div className="flex gap-2 text-[10.5px] text-muted-foreground">
                          <span>Liderança Off: <strong className={offNurses > (limits?.nurses || 1) ? "text-red-500" : "text-emerald-500"}>{offNurses}/{limits?.nurses || 1}</strong></span>
                          <span>Técnico Off: <strong className={offTechs > (limits?.technicians || 3) ? "text-red-500" : "text-emerald-500"}>{offTechs}/{limits?.technicians || 3}</strong></span>
                        </div>
                      </div>

                      <div>
                        {isWarn ? (
                          <Badge variant="destructive" className="text-[9px] font-bold px-1.5 uppercase rounded">
                            Excedido
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 font-bold border-transparent text-[9px] uppercase rounded">
                            Conforme
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* R. DETAILED ACTIVE SHIFT COMPLIANCE ENGINE & ROSTER */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* AUDIT STATUS INDICATOR */}
            {shiftStats.isAnyRuleBreached ? (
              <div className="p-4 rounded-xl bg-amber-500/[0.04] dark:bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-black text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                      Limite de Cobertura de Equipe Excedido! (Plantão Crítico)
                    </h5>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                      Há mais profissionais folgando simultaneamente do que o recomendado ({shiftStats.techsOff} Técnicos [Max 3] ou {shiftStats.nursesOff} Enfermeiros [Max 1]).
                    </p>
                  </div>
                </div>
                
                <Badge className="bg-amber-200 text-amber-800 dark:bg-amber-950 dark:text-amber-300 pointer-events-none self-start sm:self-center">
                  Bypass Operacional Necessário
                </Badge>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-500/[0.03] dark:bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-xs">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <h5 className="font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                    Escala Perfeitamente Equilibrada
                  </h5>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    O número de folgas simultâneas respeita o teto de conformidade clínica da UPA.
                  </p>
                </div>
              </div>
            )}

            <Card className="bg-card border border-border shadow-sm rounded-xl">
              <CardHeader className="pb-3 border-b border-border/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-sm font-black text-foreground uppercase tracking-tight">
                    {currentActiveShift.name} ({currentActiveShift.timing})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Listagem de profissionais de plantão. Altere o status individual se necessário ou use as ferramentas.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-2.5" />
                    <Input 
                      placeholder="Filtrar nesta lista..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 max-w-[180px] pl-8 text-xs bg-background rounded-lg border-slate-200"
                    />
                  </div>

                  {/* Add dialog */}
                  <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                      <Button className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 font-bold gap-1 rounded-lg text-white">
                        <UserPlus className="h-3.5 w-3.5" /> Novo
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle className="uppercase font-black tracking-tight">Adicionar Profissional ao Quadro</DialogTitle>
                        <DialogDescription className="text-xs">
                          Insira as credenciais para cadastrar na base de revezamento de escalas.
                        </DialogDescription>
                      </DialogHeader>

                      <form onSubmit={handleAddNewStaff} className="space-y-4 pt-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-bold uppercase text-slate-500">Nome Completo</Label>
                          <Input 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Ex: Enf. Patrícia Albuquerque" 
                            className="text-sm rounded-lg"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-bold uppercase text-slate-500">Cargo de Atuação</Label>
                          <Select value={newRole} onValueChange={(val: "nurse" | "technician") => setNewRole(val)}>
                            <SelectTrigger className="text-sm rounded-lg bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="technician">Técnico de Enfermagem</SelectItem>
                              <SelectItem value="nurse">Enfermeiro Liderança</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <DialogFooter className="pt-2">
                          <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="h-10 text-xs rounded-lg font-bold">
                            Voltar
                          </Button>
                          <Button type="submit" className="h-10 text-xs bg-indigo-600 hover:bg-indigo-700 font-bold rounded-lg text-white">
                            Adicionar & Confirmar
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900/40">
                    <TableRow>
                      <TableHead className="font-bold text-xs uppercase text-slate-500">Nome assistencial</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-slate-500">Função</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-slate-500">Trabalho / Folga</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-slate-500 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                          Nenhum profissional encontrado com este critério de filtro.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStaff.map((member) => (
                        <TableRow key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 text-xs">
                          <TableCell className="font-extrabold text-foreground py-3">
                            {member.name}
                          </TableCell>
                          <TableCell className="py-3">
                            {member.id === "staff-renata" ? (
                              <Badge variant="secondary" className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20 font-black uppercase text-[9px]">Responsável Técnica</Badge>
                            ) : member.id === "staff-maria" ? (
                              <Badge variant="secondary" className="bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-500/20 font-black uppercase text-[9px]">Liderança</Badge>
                            ) : member.role === "nurse" ? (
                              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold">Enfermeiro</Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-600 font-bold">Técnico Enfermagem</Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-3">
                            <button
                              type="button"
                              onClick={() => toggleMemberState(member.id)}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-bold border cursor-pointer hover:opacity-85 transition-all",
                                member.status === "working"
                                  ? "bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                  : "bg-red-500/[0.08] border-red-500/20 text-red-600 dark:text-red-400"
                              )}
                            >
                              <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", member.status === "working" ? "bg-emerald-500" : "bg-red-500")} />
                              {member.status === "working" ? "Em Plantão Ativo" : "Folga Cadastrada"}
                            </button>
                          </TableCell>
                          <TableCell className="py-3 text-right pr-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                                  <span className="sr-only">Abrir menu de ações</span>
                                  <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel className="text-xs text-muted-foreground uppercase">Ações do Colaborador</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleToggleRole(member.id, member.role)} className="cursor-pointer text-xs font-medium">
                                  <Edit2 className="mr-2 h-3.5 w-3.5 text-blue-500" />
                                  Alterar Função
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTransferConfirm({ id: member.id, name: member.name, currentShiftId: activeShiftId })} className="cursor-pointer text-xs font-medium">
                                  <ArrowRightLeft className="mr-2 h-3.5 w-3.5 text-amber-500" />
                                  Transferir de Turno
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setHistoryModal({ id: member.id, name: member.name, role: member.role, shiftId: activeShiftId })} className="cursor-pointer text-xs font-medium">
                                  <FileCheck className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                                  Ver Histórico
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => setDeleteConfirm({ id: member.id, name: member.name })}
                                  className="cursor-pointer text-xs font-bold text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50"
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  Excluir da Equipe
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* LIVE DOCUMENTATION BOX */}
            <div className="p-4 bg-primary/5 text-muted-foreground rounded-xl border border-primary/20 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-white uppercase text-[11px] tracking-wider">
                <ShieldAlert className="h-4 w-4 text-amber-400" /> Nota sobre Direitos Coletivos & Escala SUS
              </div>
              <p className="leading-relaxed">
                A substituição de plantões 12x36 e folga é um direito fundamental. Para que o fluxo de atendimento não seja interrompido na UPA, o sistema impõe limites. O trabalhador escolhe seus dias preferidos no <strong className="text-primary/80">Menu de Seleção de Folgas</strong>, mas o preenchimento na escala oficial é sempre validado pela <strong className="text-primary font-extrabold">Palavra Final da Gestão Geral</strong>, autorizando de forma discricionária.
              </p>
            </div>
          </div>
        </div>
      )}
      {activeTab === "request-portal" && (
        <div className="space-y-6 animate-fade-in text-xs">
          
          {/* STEP 1 CARD: HORIZONTAL IDENTIFICATION BLOCK (FULL WIDTH) */}
          <Card className="border-border/40 bg-card shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-650" />
            <CardHeader className="pb-3 pt-5 border-b border-border/15">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-black text-slate-700 dark:text-slate-350 uppercase tracking-tight flex items-center gap-1.5">
                    <UserCheck className="h-4.5 w-4.5 text-blue-600" /> 1. Identificação do Profissional
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Selecione o seu turno de trabalho (escala 12x36 padrão) e o seu nome nos campos para mapear de forma fácil a sua escala para {getMonthName(selectedMonth)} de {selectedYear}.
                  </CardDescription>
                </div>
                {selectedCollabId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCollabId("");
                      setCollabSearchQuery("");
                      toast.info("Identificação resetada. Escolha um novo turno/nome.");
                    }}
                    className="h-8 text-slate-500 font-bold border-dashed hover:border-red-500 hover:text-red-650 gap-1.5 cursor-pointer bg-slate-50/50 dark:bg-slate-900"
                  >
                    <X className="h-3.5 w-3.5" /> Limpar Identificação / Retornar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-5 pb-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
                {/* FIELD 1: SHIFT SELECT (HORIZONTALLY ALIGNED) */}
                <div className="md:col-span-4 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Passo A: Escolha seu Turno de Trabalho
                  </span>
                  <Select
                    value={collabActiveShiftId}
                    onValueChange={(val) => {
                      setCollabActiveShiftId(val);
                      setCollabSearchQuery("");
                      const matchedStaff = shifts.find(s => s.id === val)?.staff || [];
                      if (matchedStaff.length > 0) {
                        setSelectedCollabId(matchedStaff[0].id);
                        toast.info(`Turno carregado. Selecionado: ${matchedStaff[0].name}`);
                      }
                    }}
                  >
                    <SelectTrigger className="h-10 text-xs rounded-lg font-bold">
                      <SelectValue placeholder="Selecione o Turno" />
                    </SelectTrigger>
                    <SelectContent>
                      {shifts.map((group) => {
                        let icon = <Sun className="w-3.5 h-3.5 inline-block mr-1.5 text-amber-500 fill-amber-500" />;
                        if (group.id === "rt_lideranca") icon = <Briefcase className="w-3.5 h-3.5 inline-block mr-1.5 text-slate-500" />;
                        else if (group.id.includes("noturno")) icon = <MoonStar className="w-3.5 h-3.5 inline-block mr-1.5 text-slate-800 fill-slate-800 dark:text-slate-200 dark:fill-slate-200" />;
                        const label = group.name.replace(/Plantão|RT & Liderança/g, "").trim();
                        return (
                          <SelectItem key={group.id} value={group.id} className="text-xs font-semibold cursor-pointer">
                            <div className="flex items-center">
                              {icon} {label} ({group.staff.length} Profissionais)
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* FIELD 2: PROFESSIONAL SELECT OR SEARCH (HORIZONTALLY ALIGNED) */}
                <div className="md:col-span-5 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Passo B: Escolha o seu Nome Assistencial
                  </span>
                  <Select
                    value={selectedCollabId}
                    onValueChange={(val) => {
                      setSelectedCollabId(val);
                      toast.info("Escala correspondente carregada.");
                    }}
                  >
                    <SelectTrigger className="h-10 text-xs rounded-lg font-bold">
                      <SelectValue placeholder="Selecione seu Nome" />
                    </SelectTrigger>
                    <SelectContent>
                      {(shifts.find(s => s.id === collabActiveShiftId)?.staff || []).map((p) => {
                        const isRt = p.id === "staff-renata";
                        const isLead = p.id === "staff-maria";
                        const isNurse = p.role === "nurse";
                        return (
                          <SelectItem key={p.id} value={p.id} className="text-xs font-medium cursor-pointer">
                            {p.name} — {isRt ? "RT Técnica" : isLead ? "Liderança" : isNurse ? "Enfermeiro" : "Técnico"}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* QUICK SEARCH FIELD FOR EASIER FINDING (HORIZONTALLY ALIGNED) */}
                <div className="md:col-span-3 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Atalho: Pesquisa Direta em Toda a Equipe
                  </span>
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-3" />
                    <Input 
                      placeholder="Identifique-se pesquisando..."
                      value={collabSearchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCollabSearchQuery(val);
                        if (val.trim().length >= 2) {
                          const matches = allProfessionals.filter(p => p.name.toLowerCase().includes(val.toLowerCase().trim()));
                          if (matches.length > 0) {
                            setSelectedCollabId(matches[0].id);
                            setCollabActiveShiftId(matches[0].shiftId);
                          }
                        }
                      }}
                      className="h-10 pl-9 text-xs bg-background border-slate-200 dark:border-slate-800 rounded-lg shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* CURRENT LOADED PROFILE SUMMARY STRIP */}
              {selectedCollabObj && (
                <div className="mt-4 p-3 rounded-xl border border-blue-500/15 bg-blue-500/[0.02] dark:bg-blue-950/15 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-xs shadow-sm shadow-blue-500/10">
                      {selectedCollabObj?.name ? (selectedCollabObj.name.charAt(selectedCollabObj.name.indexOf(".") + 2) || selectedCollabObj.name.charAt(0)) : ""}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <span>{selectedCollabObj?.name}</span>
                        <Badge className="bg-blue-100/70 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-black text-[9px] uppercase border-transparent">
                          {selectedCollabObj?.role === "nurse" ? "Enfermeiro" : "Técnico de Enfermagem"}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-semibold block">
                        Vínculo: <strong>Escala 12x36 Cíclica</strong> • Turno de Plantão: <strong>{selectedCollabObj?.shiftName}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-background border-blue-200/50 text-blue-700 dark:text-blue-400 text-[10px] font-bold py-1 px-2.5">
                      ✓ Escala Ativa Sincronizada com o Calendário
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* LOWER SECTION: CALENDAR (LEFT, SPACIOUS) AND SUBMIT FORM (RIGHT) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* STEP 2: MULTI-FUNCTIONAL CALENDAR (COLSPAN 7 FOR WIDENESS AND SUPERIOR VISUALIZATION) */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="border-border/40 shadow-sm relative overflow-hidden h-full flex flex-col">
                <CardHeader className="pb-3 border-b border-border/15 shrink-0">
                  <CardTitle className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight flex items-center gap-1.5">
                    <Calendar className="h-4.5 w-4.5 text-blue-600" /> 2. Mapear o Dia de Folga
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Selecione no calendário o dia de {getMonthName(selectedMonth)} de {selectedYear} que você deseja solicitar folga de direito legal. Os dias com <strong>P</strong> representam seus plantões programados.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 flex-1 flex flex-col justify-between">
                  {selectedCollabObj ? (
                    <div className="space-y-4">
                      {/* MINI CALENDAR GRID WITH CYCLE HIGHLIGHTING */}
                      <div className="space-y-2">
                        {/* Cabeçalho com navegação de mês e botão destravar */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={goToPrevMonth}
                              className="h-7 w-7 rounded-lg border border-border/60 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs font-black cursor-pointer"
                              title="Mês anterior"
                            >
                              ‹
                            </button>
                            <Label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 min-w-[160px] text-center">
                              {getMonthName(selectedMonth)} de {selectedYear}
                            </Label>
                            <button
                              type="button"
                              onClick={goToNextMonth}
                              className="h-7 w-7 rounded-lg border border-border/60 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs font-black cursor-pointer"
                              title="Próximo mês"
                            >
                              ›
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            {!isMonthUnlocked ? (
                              <button
                                type="button"
                                onClick={() => { setIsAuthModalOpen(true); setAuthError(''); }}
                                className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-red-500/10 border border-red-400/30 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-wide hover:bg-red-500/20 transition-all cursor-pointer"
                                title="Clique para destravar o mês e permitir edições"
                              >
                                <Lock className="h-3 w-3" /> Destravar Mês
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => { setIsMonthUnlocked(false); toast.info("Mês bloqueado."); }}
                                className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-emerald-500/10 border border-emerald-400/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wide hover:bg-emerald-500/20 transition-all cursor-pointer"
                                title="Clique para bloquear novamente"
                              >
                                <ShieldOff className="h-3 w-3" /> Mês Desbloqueado
                              </button>
                            )}
                            <Badge className={`font-black uppercase rounded text-[10px] px-2 py-0.5 ${isMonthUnlocked ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                              Dia {collabRequestDay} Selecionado
                            </Badge>
                          </div>
                        </div>

                        {/* Aviso quando mês está travado */}
                        {!isMonthUnlocked && (
                          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/8 border border-red-400/20 text-red-600 dark:text-red-400 text-[10px] font-semibold">
                            <Lock className="h-3.5 w-3.5 flex-shrink-0" />
                            Calendário bloqueado. Clique em <strong>"Destravar Mês"</strong> para selecionar dias de folga.
                          </div>
                        )}

                        <div className="bg-slate-50 dark:bg-slate-900/35 rounded-xl p-4 border border-border/80 shadow-inner">
                          <div className="grid grid-cols-7 gap-2 text-center mb-2">
                            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, index) => (
                              <span key={index} className="text-[10px] font-black text-slate-400 dark:text-slate-500 py-1 uppercase">
                                {d}
                              </span>
                            ))}

                            {/* Offset dinâmico: calcula o dia da semana em que o mês começa */}
                            {Array.from({ length: new Date(selectedYear, selectedMonth - 1, 1).getDay() }).map((_, i) => (
                              <div key={`offset-collab-${i}`} className="bg-transparent aspect-square" />
                            ))}

                            {daysArray.map((day) => {
                              const isSelected = collabRequestDay === day;
                              const isRequestDay = requests.some(r => r.memberId === selectedCollabId && r.requestedDay === day);
                              
                              // Retrieve definitive day status from the official scale rules Engine
                              const dayStatus = selectedCollabObj ? getDayStatus(selectedCollabObj, day) : "off-duty";
                              
                              // Map status code to labels, icons and specific tailwind theme classes
                              const details = (() => {
                                switch (dayStatus) {
                                  case "duty":
                                    return { 
                                      label: "P", 
                                      isDuty: true,
                                      bgClass: "bg-blue-500/[0.04] border-blue-500/15 text-blue-700 dark:text-blue-350 hover:bg-blue-100/30",
                                      badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                    };
                                  case "leave-toggled":
                                  case "leave-approved":
                                    return { 
                                      label: "F", 
                                      isDuty: false,
                                      bgClass: "bg-emerald-500/[0.06] border-emerald-500/25 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100/30 font-extrabold",
                                      badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold"
                                    };
                                  case "leave-pending":
                                    return { 
                                      label: "?", 
                                      isDuty: false,
                                      bgClass: "bg-amber-500/[0.06] border-amber-500/25 text-amber-700 dark:text-amber-400 hover:bg-amber-100/30 font-bold",
                                      badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                    };
                                  case "FE":
                                    return { 
                                      label: "FE", 
                                      isDuty: false,
                                      bgClass: "bg-pink-500/[0.06] border-pink-500/25 text-pink-700 dark:text-pink-400 hover:bg-pink-100/30 font-bold",
                                      badgeClass: "bg-pink-500/15 text-pink-600 dark:text-pink-400"
                                    };
                                  case "FA":
                                    return { 
                                      label: "FA", 
                                      isDuty: false,
                                      bgClass: "bg-cyan-500/[0.06] border-cyan-500/25 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-100/30 font-bold",
                                      badgeClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400"
                                    };
                                  case "BH":
                                    return { 
                                      label: "BH", 
                                      isDuty: false,
                                      bgClass: "bg-purple-500/[0.06] border-purple-500/25 text-purple-700 dark:text-purple-400 hover:bg-purple-100/30 font-bold",
                                      badgeClass: "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                                    };
                                  case "LM":
                                    return { 
                                      label: "LM", 
                                      isDuty: false,
                                      bgClass: "bg-red-500/[0.06] border-red-500/25 text-red-700 dark:text-red-400 hover:bg-red-100/30 font-bold",
                                      badgeClass: "bg-red-500/15 text-red-650 dark:text-red-400"
                                    };
                                  case "off-duty":
                                  default:
                                    return { 
                                      label: "-", 
                                      isDuty: false,
                                      bgClass: "bg-slate-100/50 dark:bg-slate-900/40 border-transparent text-slate-400 hover:bg-slate-200/30",
                                      badgeClass: "bg-slate-200 dark:bg-slate-805 text-slate-400"
                                    };
                                }
                              })();

                              return (
                                <button
                                  key={`collab-day-${day}`}
                                  type="button"
                                  onClick={() => {
                                    if (!isMonthUnlocked) {
                                      toast.warning("🔒 Mês bloqueado! Clique em \"Destravar Mês\" para selecionar dias.");
                                      return;
                                    }
                                    setCollabRequestDay(day);
                                  }}
                                  className={cn(
                                    "aspect-square text-xs rounded-xl transition-all flex flex-col items-center justify-between p-2 relative border select-none group",
                                    isMonthUnlocked ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                                    isSelected && isMonthUnlocked
                                      ? "bg-blue-600 border-blue-600 text-white font-black shadow-md scale-105 z-10"
                                      : isRequestDay 
                                        ? "bg-amber-100 dark:bg-amber-950/40 border-amber-300 text-amber-850 dark:text-amber-400 hover:bg-amber-200 font-bold"
                                        : details.bgClass
                                  )}
                                >
                                  <span className="font-extrabold text-xs self-start leading-none">{day}</span>
                                  
                                  <span className={cn(
                                    "text-[8px] font-black uppercase tracking-tighter px-1.5 py-[1px] rounded-sm self-end flex items-center",
                                    isSelected 
                                      ? "bg-blue-750 text-blue-100" 
                                      : details.badgeClass
                                  )}>
                                    {details.iconNode} {details.label}
                                  </span>

                                  {isRequestDay && (
                                    <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Summary notification bar */}
                          <div className="mt-3 p-3 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-850 text-center text-xs rounded-xl text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
                            ⚡ Status Real: Dia {collabRequestDay} de {getMonthName(selectedMonth)} de {selectedYear} é um dia de{" "}
                            {(() => {
                              if (!selectedCollabObj) return "plantão";
                              const statusForDay = getDayStatus(selectedCollabObj, collabRequestDay);
                              if (statusForDay === "duty") {
                                return <strong className="text-blue-600 dark:text-blue-400 font-extrabold">PLANTÃO na sua escala 12x36 (Requer Folga)</strong>;
                              }
                              if (statusForDay === "leave-toggled") {
                                return <strong className="text-emerald-600 font-extrabold">FOLGA GERAL CADASTRADA (Dispensado)</strong>;
                              }
                              if (statusForDay === "leave-approved") {
                                return <strong className="text-emerald-600 font-extrabold">FOLGA DE DIREITO DEFERIDA</strong>;
                              }
                              if (statusForDay === "leave-pending") {
                                return <strong className="text-amber-600 dark:text-amber-400 font-extrabold">SOLICITAÇÃO DE FOLGA EM ANÁLISE</strong>;
                              }
                              if (statusForDay === "FE") {
                                return <strong className="text-pink-600 dark:text-pink-400 font-extrabold">FOLGA ELEITORAL (FE) REGISTRADA</strong>;
                              }
                              if (statusForDay === "FA") {
                                return <strong className="text-cyan-600 dark:text-cyan-400 font-extrabold">FOLGA ANUAL / ATESTADO (FA) REGISTRADO</strong>;
                              }
                              if (statusForDay === "BH") {
                                return <strong className="text-purple-600 dark:text-purple-400 font-extrabold">COMPENSAÇÃO DE BANCO DE HORAS (BH) REGISTRADO</strong>;
                              }
                              if (statusForDay === "LM") {
                                return <strong className="text-red-650 dark:text-red-400 font-extrabold">LICENÇA MÉDICA (LM) REGISTRADA</strong>;
                              }
                              return <strong className="text-slate-500 font-medium">FOLGA Regular já garantida na sua escala</strong>;
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-20 text-xs text-muted-foreground font-semibold">
                      Escolha o Turno e Nome do Profissional no Painel Superior de Identificação (Passo 1).
                    </div>
                  )}
                  
                  <div className="mt-3 text-[10px] leading-relaxed p-3 bg-slate-900 text-slate-300 rounded-xl border border-slate-800 shrink-0">
                    💡 <strong>Direito do Plantonista:</strong> Você só precisa requerer folga de direito (FE, FA, BH, LM ou F) para os seus dias de <strong>PLANTÃO (P)</strong>. Dias marcados com <strong>(-)</strong> já representam seu descanso regular de escala 12x36.
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* STEP 3: SUBMIT FORM & RECENT REQUESTS LIST (COLSPAN 5) */}
            <div className="lg:col-span-5 space-y-4 flex flex-col">
            {/* SUBMIT FORM CARD */}
            <Card className="border-border/40 shadow-sm relative overflow-hidden shrink-0">
              <CardHeader className="pb-3 border-b border-border/15">
                <CardTitle className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight flex items-center gap-1.5">
                  <Briefcase className="h-4.5 w-4.5 text-blue-650" /> 3. Enviar Solicitação
                </CardTitle>
                <CardDescription className="text-xs">
                  Justifique e envie seu pedido de folga para avaliação da RT Renata.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 pb-4">
                <form onSubmit={submitLeaveRequest} className="space-y-3.5">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-slate-500">Fundamentação / Motivo</Label>
                    <Input 
                      placeholder="Ex: Direito à doação de sangue / compensação eleitoral..."
                      value={collabJustification}
                      onChange={(e) => setCollabJustification(e.target.value)}
                      className="text-xs rounded-lg"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 rounded-lg text-xs tracking-wider uppercase">
                    Registrar Opção e Enviar
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* RECENT REQUESTS VIEW LIST */}
            <Card className="border-border/40 shadow-sm flex-1 flex flex-col min-h-0">
              <CardHeader className="pb-2 pt-3 border-b border-border/15 shrink-0">
                <CardTitle className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Solicitações Recentes do Corpo
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 overflow-y-auto pr-1 flex-1 max-h-[290px] space-y-2">
                {requests.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    Nenhuma opção de folga registrada localmente.
                  </div>
                ) : (
                  [...requests].reverse().map((r) => (
                    <div key={r.id} className="p-3 rounded-lg border text-[10.5px] space-y-1.5 bg-slate-50/60 dark:bg-slate-900/40">
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <strong className="text-foreground font-bold block">{r.memberName}</strong>
                          <span className="text-[9px] text-muted-foreground block font-medium">Dia {r.requestedDay} de {getMonthName(selectedMonth)} / {r.shiftName.replace(/✨|☀️|🌙/g, "").trim()}</span>
                        </div>
                        
                        <div>
                          {r.status === "pending" && (
                            <Badge className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-[8.5px] uppercase py-[0.5px] border-transparent">
                              Em Análise
                            </Badge>
                          )}
                          {r.status === "approved" && (
                            <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[8.5px] uppercase py-[0.5px] border-transparent">
                              Homologada
                            </Badge>
                          )}
                          {r.status === "rejected" && (
                            <Badge className="bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-bold text-[8.5px] uppercase py-[0.5px] border-transparent">
                              Recusada
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-1.5 rounded border text-[10px] leading-relaxed text-slate-500 italic">
                        &ldquo;{r.justification}&rdquo;
                      </div>

                      <div className="flex justify-between items-center text-[8.5px] text-muted-foreground">
                        <span>Enviado: {new Date(r.requestedAt).toLocaleDateString("pt-BR")}</span>
                        <Button 
                          variant="ghost" 
                          onClick={() => removeRequest(r.id)} 
                          className="h-5 text-red-500 hover:bg-red-50/20 hover:text-red-600 text-[8.5px] font-bold p-1 uppercase rounded-sm"
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )}

      {/* TAB CONTENT: DECISION MAKER COGNITIVE ENGINE (MANAGEMENT ONLY) */}
      {activeTab === "approval-desk" && (
        <Card className="border-border/40 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
          <CardHeader className="pb-3 border-b border-border/15">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <CardTitle className="text-sm font-black text-purple-650 dark:text-purple-400 uppercase tracking-tight">
                Decisor Geral de Folgas e Benefícios
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              <strong className="text-foreground">Palavra Final da Gestão Geral:</strong> Os profissionais de saúde registram os seus desejos no menu anterior. Aqui, a diretoria tem o poder final discricionário de deferir (**CONCEDER**) ou indeferir o dia de folga solicitado para manter o atendimento regulado.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 p-0">
            <div className="p-4 bg-purple-500/5 border-b text-xs leading-relaxed font-semibold text-purple-800 dark:text-purple-400">
              ⚡ <strong>Regra de Autonomia Igualitária:</strong> Renata (RT Enfermagem) e Maria Eduarda (Liderança) possuem autonomia igual para deferir as folgas. A aprovação ou reprovação por qualquer uma delas será suficiente para validar ou recusar a solicitação na escala oficial.
            </div>

            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/40 text-xs">
                <TableRow>
                  <TableHead className="font-bold text-slate-500 uppercase">Profissional Colaborador</TableHead>
                  <TableHead className="font-bold text-slate-500 uppercase">Dia e Plantão Vinculado</TableHead>
                  <TableHead className="font-bold text-slate-500 uppercase">Fundamento legal</TableHead>
                  <TableHead className="font-bold text-slate-500 uppercase">Validação de Cobertura</TableHead>
                  <TableHead className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">1. RT Renata (Parecer)</TableHead>
                  <TableHead className="font-bold text-purple-650 dark:text-purple-400 uppercase">2. Liderança Maria Eduarda (Parecer)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.filter(r => r.status === "pending").length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground font-bold">
                      Sem solicitações pendentes no momento. Todos os direitos de folgas foram apreciados.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.filter(r => r.status === "pending").map((req) => {
                    // Compute compliance preview
                    const shiftRef = shifts.find(s => s.id === req.shiftId);
                    const techsOff = shiftRef ? shiftRef.staff.filter(m => m.role === "technician" && m.status === "leave").length : 0;
                    const nursesOff = shiftRef ? shiftRef.staff.filter(m => m.role === "nurse" && m.status === "leave").length : 0;

                    const projectedTechs = req.memberRole === "technician" ? techsOff + 1 : techsOff;
                    const projectedNurses = req.memberRole === "nurse" ? nursesOff + 1 : nursesOff;

                    const willExceed = projectedTechs > 3 || projectedNurses > 1;

                    const rtState = req.rtApproval || "pending";
                    const leadState = req.leadApproval || "pending";

                    return (
                      <TableRow key={req.id} className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-950/30">
                        {/* Colaborador */}
                        <TableCell className="align-top py-4">
                          <strong className="text-foreground tracking-tight block text-sm">{req.memberName}</strong>
                          <span className="text-[10px] text-muted-foreground block font-bold uppercase mt-0.5">
                            {req.memberRole === "nurse" ? "Enfermeiro" : "Técnico"}
                          </span>
                        </TableCell>

                        {/* Dia e Plantão */}
                        <TableCell className="align-top py-4 text-slate-600 dark:text-slate-350">
                          <span className="font-extrabold text-foreground block">Dia {req.requestedDay} de {getMonthName(selectedMonth)}</span>
                          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">{req.shiftName}</span>
                        </TableCell>

                        {/* Fundamento */}
                        <TableCell className="align-top py-4 max-w-xs italic text-slate-550">
                          &ldquo;{req.justification}&rdquo;
                        </TableCell>

                        {/* Cobertura */}
                        <TableCell className="align-top py-4">
                          {willExceed ? (
                            <div className="space-y-1">
                              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold border-transparent text-[9.5px]">
                                Excede Teto se Aprovar
                              </Badge>
                              <span className="block text-[10px] text-red-500 leading-tight font-semibold">
                                Projetará {projectedTechs}/3 Técnicos ou {projectedNurses}/1 Enfermeiro off.
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Badge className="bg-emerald-100 text-emerald-850 dark:bg-emerald-950 dark:text-emerald-400 font-bold border-transparent text-[9.5px]">
                                Cobertura Segura
                              </Badge>
                              <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                Mantém equipe mínima no plantão ativa.
                              </span>
                            </div>
                          )}
                        </TableCell>

                        {/* Renata  */}
                        <TableCell className="align-top py-4">
                          {rtState === "approved" && (
                            <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold uppercase text-[10px] border-transparent">
                              ✅ RT: Favorável
                            </Badge>
                          )}
                          {rtState === "rejected" && (
                            <Badge className="bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 font-bold uppercase text-[10px] border-transparent">
                              ❌ RT: Desfavorável
                            </Badge>
                          )}
                          {rtState === "pending" && (
                            <div className="space-y-2">
                              <div className="flex gap-1">
                                <Button
                                  onClick={() => handleRTDecision(req.id, "approved")}
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white h-7 text-[10px] px-2 rounded-md"
                                >
                                  Conceder
                                </Button>
                                <Button
                                  onClick={() => handleRTDecision(req.id, "rejected")}
                                  size="sm"
                                  variant="destructive"
                                  className="bg-red-650 hover:bg-red-700 font-bold text-white h-7 text-[10px] px-2 rounded-md"
                                >
                                  Recusar
                                </Button>
                              </div>
                              <span className="block text-[9.5px] text-muted-foreground italic">Pendente Renata</span>
                            </div>
                          )}
                        </TableCell>

                        {/* Paula */}
                        <TableCell className="align-top py-4">
                          {leadState === "approved" && (
                            <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold uppercase text-[10px] border-transparent">
                              ✅ Lead: Favorável
                            </Badge>
                          )}
                          {leadState === "rejected" && (
                            <Badge className="bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 font-bold uppercase text-[10px] border-transparent">
                              ❌ Lead: Desfavorável
                            </Badge>
                          )}
                          {leadState === "pending" && (
                            <div className="space-y-2">
                              <div className="flex gap-1">
                                <Button
                                  onClick={() => handleLeadDecision(req.id, "approved")}
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white h-7 text-[10px] px-2 rounded-md"
                                >
                                  Conceder
                                </Button>
                                <Button
                                  onClick={() => handleLeadDecision(req.id, "rejected")}
                                  size="sm"
                                  variant="destructive"
                                  className="bg-red-650 hover:bg-red-700 font-bold text-white h-7 text-[10px] px-2 rounded-md"
                                >
                                  Recusar
                                </Button>
                              </div>
                              <span className="block text-[9.5px] text-muted-foreground italic">Pendente Maria Eduarda</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: SETTINGS */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <Card className="border border-border/40 shadow-sm relative overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/15">
              <CardTitle className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight flex items-center gap-1.5">
                <Settings className="h-4.5 w-4.5 text-slate-650" /> Configurações Gerais da Escala
              </CardTitle>
              <CardDescription className="text-xs">
                Defina os limites globais de folga permitidos por plantão para a equipe.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-slate-500">Teto de Enfermeiros em Folga</Label>
                    <Input 
                      type="number"
                      value={limits.nurses}
                      onChange={(e) => updateLimits({ ...limits, nurses: parseInt(e.target.value) || 0 })}
                      className="max-w-[200px]"
                    />
                    <p className="text-[10px] text-muted-foreground">O alerta será disparado se a soma de enfermeiros em folga/licença passar deste valor.</p>
                  </div>
                </div>
                
                <div className="space-y-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-slate-500">Teto de Técnicos em Folga</Label>
                    <Input 
                      type="number"
                      value={limits.technicians}
                      onChange={(e) => updateLimits({ ...limits, technicians: parseInt(e.target.value) || 0 })}
                      className="max-w-[200px]"
                    />
                    <p className="text-[10px] text-muted-foreground">O alerta será disparado se a soma de técnicos em folga/licença passar deste valor.</p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase mb-3 border-b pb-2">Códigos e Direitos (Legenda)</h3>
                <p className="text-xs text-muted-foreground mb-4">Gerencie as legendas disponíveis na tabela global. Esses códigos aparecem ao clicar nas células da escala.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {codes.map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-1 border p-3 rounded-lg shadow-sm bg-card relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`w-8 h-8 flex items-center justify-center text-xs rounded-lg font-black ${item.bgColor} ${item.color.replace('text-', 'text-')}`}>
                          {item.code}
                        </span>
                        <Badge variant="outline" className="text-[9px] uppercase font-bold">{item.type}</Badge>
                      </div>
                      <Label className="text-[10px] text-muted-foreground font-bold">Sigla</Label>
                      <Input 
                        value={item.code}
                        onChange={(e) => {
                          const newCodes = [...codes];
                          newCodes[idx].code = e.target.value.toUpperCase();
                          updateCodes(newCodes);
                        }}
                        className="h-8 text-xs font-bold"
                        maxLength={3}
                      />
                      <Label className="text-[10px] text-muted-foreground font-bold mt-1">Significado</Label>
                      <Input 
                        value={item.label}
                        onChange={(e) => {
                          const newCodes = [...codes];
                          newCodes[idx].label = e.target.value;
                          updateCodes(newCodes);
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                  ))}
                  
                  <div className="flex items-center justify-center border p-3 rounded-lg border-dashed bg-slate-50 dark:bg-slate-900/50 cursor-pointer hover:bg-slate-100 transition-colors"
                       onClick={() => updateCodes([...codes, { code: 'NOVO', label: 'Novo Direito', type: 'off-duty', color: 'text-slate-600', bgColor: 'bg-slate-500/10' }])}>
                    <div className="text-center">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2">
                        <span className="text-lg font-black">+</span>
                      </div>
                      <span className="text-xs font-bold text-slate-500 uppercase">Adicionar Código</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Modal de Confirmação de Exclusão de Colaborador */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-[425px] overflow-hidden border-destructive/20 shadow-2xl shadow-destructive/10">
          <div className="absolute top-0 left-0 w-full h-1 bg-destructive" />
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2 font-black text-lg">
              <div className="bg-destructive/10 p-2 rounded-full">
                <AlertTriangle className="h-5 w-5" />
              </div>
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription className="pt-3 pb-2 text-sm leading-relaxed text-muted-foreground">
              Você está prestes a excluir <strong className="text-foreground">{deleteConfirm?.name}</strong> desta equipe de plantão.
              <br /><br />
              Essa ação <strong className="text-destructive">não pode ser desfeita</strong> e pode afetar imediatamente o dimensionamento do setor.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 border-t border-border/40 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="font-bold">
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (deleteConfirm) {
                  handleRemoveStaff(deleteConfirm.id, deleteConfirm.name);
                }
              }}
              className="font-bold"
            >
              Sim, excluir da escala
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Bloqueio de Mês */}
      <Dialog open={isLockConfirmOpen} onOpenChange={setIsLockConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black text-rose-600 dark:text-rose-400">
              <Lock className="h-5 w-5" />
              Bloquear Mês
            </DialogTitle>
            <DialogDescription className="pt-2 text-xs">
              Tem certeza que deseja bloquear a escala?
              Isso impedirá novas edições no calendário até que a escala seja destravada novamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={(e) => { e.preventDefault(); setIsLockConfirmOpen(false); }} className="h-8 text-xs font-bold">
              Cancelar
            </Button>
            <Button 
              type="button"
              className="h-8 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsMonthUnlocked(false);
                setIsLockConfirmOpen(false);
                setTimeout(() => {
                  toast.success("Mês bloqueado com sucesso! Edições foram travadas.", {
                    style: {
                      background: '#ecfdf5',
                      color: '#047857',
                      border: '1px solid #34d399',
                      padding: '16px',
                      borderRadius: '12px',
                      boxShadow: '0 20px 25px -5px rgba(16, 185, 129, 0.15)',
                      fontSize: '14px',
                      fontWeight: '600'
                    },
                    iconTheme: { primary: '#059669', secondary: '#ecfdf5' }
                  });
                }, 100);
              }}
            >
              <Lock className="h-3.5 w-3.5 mr-2" />
              Confirmar Bloqueio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Transferência de Turno */}
      <Dialog open={!!transferConfirm} onOpenChange={(open) => !open && setTransferConfirm(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black">
              <ArrowRightLeft className="h-5 w-5 text-amber-500" />
              Transferir Colaborador
            </DialogTitle>
            <DialogDescription className="pt-2 text-xs">
              Selecione o novo turno/equipe para onde deseja transferir <strong className="text-foreground">{transferConfirm?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-xs font-bold text-muted-foreground mb-2 block">Turno Destino</Label>
            <Select value={transferTargetShift} onValueChange={setTransferTargetShift}>
              <SelectTrigger className="w-full text-xs font-semibold">
                <SelectValue placeholder="Selecione um turno..." />
              </SelectTrigger>
              <SelectContent>
                {shifts.filter(s => s.id !== transferConfirm?.currentShiftId).map(s => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferConfirm(null)} className="h-9 text-xs font-bold">Cancelar</Button>
            <Button disabled={!transferTargetShift} onClick={executeTransferShift} className="h-9 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white">Confirmar Transferência</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Histórico */}
      <Dialog open={!!historyModal} onOpenChange={(open) => !open && setHistoryModal(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black">
              <FileCheck className="h-5 w-5 text-emerald-500" />
              Histórico do Colaborador
            </DialogTitle>
            <DialogDescription className="pt-1 text-xs">
              Métricas e resumos recentes baseados na escala atual.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border flex gap-4 items-center">
              <div className="h-10 w-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{historyModal?.name}</p>
                <p className="text-xs text-muted-foreground uppercase">{historyModal?.role === 'nurse' ? 'Enfermeiro(a)' : 'Téc. Enfermagem'} • {shifts.find(s => s.id === historyModal?.shiftId)?.name}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="border p-3 rounded-xl bg-card">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Plantões Cumpridos</p>
                <p className="text-2xl font-black text-foreground">
                  {historyModal ? Object.values(allProfessionals.find(p => p.id === historyModal.id)?.days || {}).filter(d => d === 'P').length : 0}
                </p>
              </div>
              <div className="border p-3 rounded-xl bg-card">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Folgas & Ausências</p>
                <p className="text-2xl font-black text-destructive">
                  {historyModal ? Object.values(allProfessionals.find(p => p.id === historyModal.id)?.days || {}).filter(d => d !== 'P' && d !== '-').length : 0}
                </p>
              </div>
            </div>
            
            <div className="text-[11px] text-muted-foreground bg-primary/5 p-3 rounded-lg border border-primary/10">
              ℹ️ O log completo de auditoria das alterações manuais da escala (com horários e responsáveis) será integrado junto ao módulo de fechamento de folha.
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setHistoryModal(null)} className="h-9 text-xs font-bold w-full">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auth Modal for Unlocking Schedule — rendered at root level via portal so it works from any tab */}
      {createPortal(
        <AnimatePresence>
          {isAuthModalOpen && (
            <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl p-6 overflow-hidden"
              >
                <button
                  onClick={() => setIsAuthModalOpen(false)}
                  className="absolute top-4 right-4 rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors text-xs cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex flex-col items-center text-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Lock className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-card-foreground">Destravar Mês</h3>
                    <p className="text-xs text-muted-foreground">Insira as credenciais administrativas para desbloquear o calendário e permitir edições de folga.</p>
                  </div>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-4 mt-6">
                  <div className="space-y-1 text-left">
                    <Label htmlFor="auth-username-global" className="text-[10px] uppercase font-bold tracking-wide">Usuário</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="auth-username-global"
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
                    <Label htmlFor="auth-password-global" className="text-[10px] uppercase font-bold tracking-wide">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="auth-password-global"
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
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

export default function EscalaControlWrapped() {
  return (
    <ErrorBoundary>
      <EscalaControl />
    </ErrorBoundary>
  );
}
