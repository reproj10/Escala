import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "motion/react";
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
  Download
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
    name: "Plantão Ímpar Diurno ☀️",
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
    id: "par_diurno",
    name: "Plantão Par Diurno ☀️",
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
    id: "impar_noturno",
    name: "Plantão Ímpar Noturno 🌙",
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
    id: "par_noturno",
    name: "Plantão Par Noturno 🌙",
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
    shiftName: "Plantão Ímpar Diurno ☀️",
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
    shiftName: "Plantão Par Diurno ☀️",
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
    shiftName: "Plantão Ímpar Noturno 🌙",
    requestedDay: 27,
    justification: "Direito de folga por doação de sangue anual (Atestado protocolado).",
    status: "pending",
    requestedAt: "2026-05-24T00:15:00Z",
    rtApproval: "pending",
    leadApproval: "pending"
  }
];

export default function WorkScale() {
  // Tabs: "overview" (Quadro & Escalas), "request-portal" (Profissional Escolhe Dias), "approval-desk" (Palavra Final da Gestão)
  const [activeTab, setActiveTab] = useState<"overview" | "request-portal" | "approval-desk">("overview");

  // Load state from localStorage or seeded default
  const [shifts, setShifts] = useState<ShiftGroup[]>(() => {
    const stored = localStorage.getItem("upa_shifts_data_12x36");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Ensure Renata Pereira's full name is migrated correctly from cached local storage
        if (Array.isArray(parsed)) {
          return parsed.map((s: ShiftGroup) => ({
            ...s,
            staff: s.staff.map((m: StaffMember) => {
              if (m.id === "staff-renata") {
                return { ...m, name: "Renata Pereira" };
              }
              if (m.id === "staff-maria") {
                return { ...m, name: "Maria Eduarda" };
              }
              return m;
            })
          }));
        }
        return parsed;
      } catch (e) { console.error(e); }
    }
    return initialShifts;
  });

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

  // Professional modal helper
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"nurse" | "technician">("technician");

  // Global monthly scale view modal states
  const [isGlobalScaleOpen, setIsGlobalScaleOpen] = useState(false);
  const [isGlobalScaleMaximized, setIsGlobalScaleMaximized] = useState(true);
  const [globalRoleFilter, setGlobalRoleFilter] = useState<"all" | "nurse" | "technician">("all");
  const [globalShiftFilter, setGlobalShiftFilter] = useState<string>("all");
  const [globalSearch, setGlobalSearch] = useState("");
  const [isExcelMode, setIsExcelMode] = useState(false);
  const [selectedExcelCell, setSelectedExcelCell] = useState<{ memberName: string; day: number; colLetter: string; rowNum: number; status: string } | null>(null);
  const [globalSortField, setGlobalSortField] = useState<"name" | "group" | null>(null);
  const [globalSortDirection, setGlobalSortDirection] = useState<"asc" | "desc">("asc");

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
  const [editingRole, setEditingRole] = useState<"nurse" | "technician">("technician");
  const [editingShiftId, setEditingShiftId] = useState("");
  const [editingCellStatus, setEditingCellStatus] = useState<"default" | "duty" | "off-duty" | "leave-approved" | "leave-pending" | "FE" | "FA" | "BH" | "LM">("default");

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
    toast.info(`Slide de Escala: Visualizando Dia ${dayNum} de Maio (${dayIsOdd ? "ÍMPAR" : "PAR"})`);
  };

  // Active shift
  const currentActiveShift = useMemo(() => {
    return shifts.find(s => s.id === activeShiftId) || shifts[0];
  }, [shifts, activeShiftId]);

  // All professionals database compiled from shifts (sorted so that Renata Pereira - RT is always at the very beginning)
  const allProfessionals = useMemo(() => {
    const arr: { id: string; name: string; role: "nurse" | "technician"; shiftId: string; shiftName: string }[] = [];
    shifts.forEach(s => {
      s.staff.forEach(member => {
        arr.push({
          id: member.id,
          name: member.name,
          role: member.role,
          shiftId: s.id,
          shiftName: s.name
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
    }

    return list;
  }, [allProfessionals, globalSearch, globalRoleFilter, globalShiftFilter, globalSortField, globalSortDirection]);

  // Helper to resolve weekday for May 2026 (Starts on a Friday)
  const getWeekday = (day: number) => {
    const dayOfWeek = (day - 1 + 5) % 7;
    const weekdays = ["D", "S", "T", "Q", "Q", "S", "S"];
    return weekdays[dayOfWeek];
  };

  // Resolve specific day duty/leave status
  const getDayStatus = (p: { id: string; name: string; role: "nurse" | "technician"; shiftId: string }, d: number) => {
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

    // 3. Determine if it is a scheduled work day according to work shift rules
    let isScheduledWorkDay = false;
    if (p.shiftId === "rt_lideranca") {
      const dayOfWeek = (d - 1 + 5) % 7;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      isScheduledWorkDay = !isWeekend;
    } else {
      const isOddDay = d % 2 !== 0;
      const isShiftOdd = p.shiftId.startsWith("impar_");
      const isShiftEven = p.shiftId.startsWith("par_");
      isScheduledWorkDay = (isShiftOdd && isOddDay) || (isShiftEven && !isOddDay);
    }

    // 4. Check general status toggle in the shift (only for scheduled work days to keep non-work days clean)
    const shiftObj = shifts.find(s => s.id === p.shiftId);
    const staffMember = shiftObj?.staff.find(m => m.id === p.id);
    if (staffMember?.status === "leave" && isScheduledWorkDay) {
      return "leave-toggled";
    }

    // 5. Shift schedule type parity checks
    return isScheduledWorkDay ? "duty" : "off-duty";
  };

  // Helper to stylize each shift differently in the global overview
  const getShiftColorStyles = (shiftId: string) => {
    switch (shiftId) {
      case "impar_diurno":
        return {
          bg: "bg-amber-500",
          bgLight: "bg-amber-100 dark:bg-amber-950/45",
          border: "border-amber-500/20",
          text: "text-amber-700 dark:text-amber-400 font-extrabold",
          label: "☀️ Ímpar Diurno",
          badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        };
      case "par_diurno":
        return {
          bg: "bg-blue-500",
          bgLight: "bg-blue-100 dark:bg-blue-950/45",
          border: "border-blue-500/20",
          text: "text-blue-700 dark:text-blue-450 font-extrabold",
          label: "☀️ Par Diurno",
          badge: "bg-blue-500/10 text-blue-600 dark:text-blue-450 border-blue-500/20"
        };
      case "impar_noturno":
        return {
          bg: "bg-purple-500",
          bgLight: "bg-purple-100 dark:bg-purple-950/45",
          border: "border-purple-500/20",
          text: "text-purple-700 dark:text-purple-400 font-extrabold",
          label: "🌙 Ímpar Noturno",
          badge: "bg-purple-550/10 text-purple-650 dark:text-purple-400 border-purple-500/20"
        };
      case "par_noturno":
        return {
          bg: "bg-indigo-650",
          bgLight: "bg-indigo-100 dark:bg-indigo-950/45",
          border: "border-indigo-600/20",
          text: "text-indigo-650 dark:text-indigo-400 font-extrabold",
          label: "🌙 Par Noturno",
          badge: "bg-indigo-650/10 text-indigo-650 dark:text-indigo-400 border-indigo-600/20"
        };
      case "rt_lideranca":
        return {
          bg: "bg-emerald-600",
          bgLight: "bg-emerald-100 dark:bg-emerald-950/45",
          border: "border-emerald-600/20",
          text: "text-emerald-700 dark:text-emerald-400 font-extrabold",
          label: "💼 RT / Liderança",
          badge: "bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-600/20"
        };
      default:
        return {
          bg: "bg-slate-550",
          bgLight: "bg-slate-100 dark:bg-slate-900/40",
          border: "border-slate-500/20",
          text: "text-slate-700 dark:text-slate-400 font-extrabold",
          label: "Outros",
          badge: "bg-slate-500/10 text-slate-600 border-slate-500/20"
        };
    }
  };

  // Count active stats for current selected shift
  const shiftStats = useMemo(() => {
    const staff = currentActiveShift.staff;
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
  const getExcelValueForFormulaBar = (p: { id: string; name: string; role: "nurse" | "technician"; shiftId: string }, d: number, dayStatus: string) => {
    const isOdd = d % 2 !== 0;
    const isShiftOdd = p.shiftId.startsWith("impar_");
    const isShiftEven = p.shiftId.startsWith("par_");
    
    if (dayStatus === "duty") {
      const isDefaultDuty = (isShiftOdd && isOdd) || (isShiftEven && !isOdd);
      if (isDefaultDuty) {
        return `SE(OU(REGRA_12X36_IMPAR(Dia=${d}; Grupo="${p.shiftId}"); REGRA_12X36_PAR(Dia=${d}; Grupo="${p.shiftId}")); "P_PLANTÃO"; "-")`;
      } else {
        return `CONFORMIDADE_SOBREAVISO_EXTRA(Cargo="${p.role}"; Colaborador="${p.name}"; Dia=${d}; Status="P_FORÇADO")`;
      }
    } else if (dayStatus === "leave-approved" || dayStatus === "leave-toggled") {
      return `FOLGA_DE_DIREITO_DEFERIDA(Responsável="RT Renata Pereira"; Solicitante="${p.name}"; Dia=${d}; Mês=5; Status="DEFERIDO")`;
    } else if (dayStatus === "leave-pending") {
      return `SE(ANALISE_DE_COBERTURA_ESTATISTICA(Dia=${d})=VERDADEIRO; "?_PENDENTE"; "-")`;
    } else if (dayStatus === "FE") {
      return `FOLGA_ELEITORAL_PRESTACAO_COMPENSATORIA(Colaborador="${p.name}"; Dia=${d}; Mês=5; Juri/Eleição=12h)`;
    } else if (dayStatus === "FA") {
      return `FOLGA_ANIVERSARIO_DIREITO_LEGAL(Colaborador="${p.name}"; Dia=${d}; Mês=5; DataNascimento="Maio")`;
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
    html += `<p><b>Mês/Ano de Referência:</b> Maio de 2026</p>`;
    html += `<p><b>Data de Exportação:</b> ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>`;
    html += `<br/>`;
    
    html += `<table>`;
    // Excel Column letters row (A, B, C...)
    html += `<thead><tr>`;
    html += `<th class="col-header" style="min-width: 40px;"></th>`; // row number header cell
    html += `<th class="col-header" style="min-width: 250px;">A</th>`; // A: Nome
    html += `<th class="col-header" style="min-width: 140px;">B</th>`; // B: Grupo
    for (let d = 1; d <= 31; d++) {
      html += `<th class="col-header">${getExcelColumnLetter(d + 1)}</th>`; // C onwards
    }
    html += `</tr>`;
    
    // Day headers row
    html += `<tr>`;
    html += `<th style="background-color: #16a34a; color: white;">N°</th>`;
    html += `<th style="background-color: #16a34a; color: white; text-align: left;">Colaborador</th>`;
    html += `<th style="background-color: #16a34a; color: white;">Grupo Escala</th>`;
    for (let d = 1; d <= 31; d++) {
      html += `<th style="background-color: #16a34a; color: white;">Dia ${d}</th>`;
    }
    html += `</tr></thead><tbody>`;
    
    // Data rows
    filteredGlobals.forEach((p, index) => {
      html += `<tr>`;
      html += `<td class="row-index">${index + 1}</td>`;
      html += `<td class="member-name">${p.name} (${p.role === "nurse" ? "Enfermeiro" : "Técnico"})</td>`;
      html += `<td>${getShiftColorStyles(p.shiftId).label}</td>`;
      
      for (let d = 1; d <= 31; d++) {
        const dayStatus = getDayStatus(p, d);
        let cellText = "-";
        let cellClass = "";
        
        if (dayStatus === "duty") {
          cellText = "P";
          if (p.shiftId === "impar_diurno") cellClass = "class='duty-amber'";
          else if (p.shiftId === "par_diurno") cellClass = "class='duty-blue'";
          else if (p.shiftId === "impar_noturno") cellClass = "class='duty-purple'";
          else if (p.shiftId === "par_noturno") cellClass = "class='duty-indigo'";
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
    a.download = `escala_unificada_upa_maio_2026.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Excel (.xls) exportado com as formatações e cores preservadas!", {
      description: "Pronto para abrir diretamente no Microsoft Excel ou Google Planilhas."
    });
  };

  // Handle cell selection and buffering in Global Scale View
  const handleCellClick = (p: { id: string; name: string; role: "nurse" | "technician"; shiftId: string }, dayNum: number, currentStatus: string) => {
    setEditingCell({
      memberId: p.id,
      memberName: p.name,
      memberRole: p.role,
      shiftId: p.shiftId,
      day: dayNum,
      initialStatus: currentStatus
    });

    setEditingName(p.name);
    setEditingRole(p.role);
    setEditingShiftId(p.shiftId);

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

  // Persist custom cell overrides and general profile changes
  const saveCellEdits = () => {
    if (!editingCell) return;
    const { memberId, day } = editingCell;

    // 1. Update Profile characteristics: Name, Role, and Shift Group
    setShifts(prevShifts => {
      let targetMember: StaffMember | null = null;
      
      const filteredShifts = prevShifts.map(s => {
        const hasMember = s.staff.some(m => m.id === memberId);
        if (hasMember) {
          const found = s.staff.find(m => m.id === memberId);
          if (found) {
            targetMember = { 
              ...found, 
              name: editingName.trim() || found.name,
              role: editingRole
            };
          }
          // Remove from old if shift changed
          if (s.id !== editingShiftId) {
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
                name: editingName.trim() || m.name, 
                role: editingRole 
              } : m)
            };
          }
        }
        return s;
      });

      // Insert member into new shift category if group changed
      if (targetMember && !filteredShifts.find(s => s.id === editingShiftId)?.staff.some(m => m.id === memberId)) {
        return filteredShifts.map(s => {
          if (s.id === editingShiftId) {
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

    // 2. Clear pre-existing requests/overrides for this cell to refresh state
    setRequests(prev => prev.filter(r => !(r.memberId === memberId && r.requestedDay === day)));
    setDayOverrides(prev => prev.filter(o => !(o.memberId === memberId && o.day === day)));

    // 3. Define the new interactive status
    if (editingCellStatus === "leave-approved") {
      const newReq: LeaveRequest = {
        id: "req-cell-" + Date.now(),
        memberId,
        memberName: editingName,
        memberRole: editingRole,
        shiftId: editingShiftId,
        shiftName: shifts.find(s => s.id === editingShiftId)?.name || "",
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
    } else if (editingCellStatus === "leave-pending") {
      const newReq: LeaveRequest = {
        id: "req-cell-" + Date.now(),
        memberId,
        memberName: editingName,
        memberRole: editingRole,
        shiftId: editingShiftId,
        shiftName: shifts.find(s => s.id === editingShiftId)?.name || "",
        requestedDay: day,
        justification: "Folga sob análise iniciada via Grade de Planejamento de Células.",
        status: "pending",
        requestedAt: new Date().toISOString(),
        rtApproval: "pending",
        leadApproval: "pending"
      };
      setRequests(prev => [newReq, ...prev]);
    } else if (editingCellStatus === "duty") {
      setDayOverrides(prev => [...prev, { memberId, day, status: "duty" }]);
    } else if (editingCellStatus === "off-duty") {
      setDayOverrides(prev => [...prev, { memberId, day, status: "off-duty" }]);
    } else if (editingCellStatus === "FE") {
      setDayOverrides(prev => [...prev, { memberId, day, status: "FE" }]);
    } else if (editingCellStatus === "FA") {
      setDayOverrides(prev => [...prev, { memberId, day, status: "FA" }]);
    } else if (editingCellStatus === "BH") {
      setDayOverrides(prev => [...prev, { memberId, day, status: "BH" }]);
    } else if (editingCellStatus === "LM") {
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

  // Delete professional
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
    toast.info(`${name} desagregado da escala.`);
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
        if (rtApproval === "rejected" || leadApproval === "rejected") {
          newStatus = "rejected";
        } else if (rtApproval === "approved" && leadApproval === "approved") {
          newStatus = "approved";
        }
        
        return {
          ...r,
          rtApproval,
          status: newStatus,
          reviewedBy: newStatus !== "pending" ? `RT Renata & Liderança Maria Eduarda` : undefined,
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
          toast.success("FOLGA DEFERIDA CONJUNTAMENTE!", {
            description: `Tanto Renata (RT) quanto Maria Eduarda (Liderança) concederam a folga para ${finalReq.memberName} no dia ${finalReq.requestedDay}.`
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
            description: `Houve recusa por parte de uma das decisoras (Renata ou Maria Eduarda) para ${finalReq.memberName} no dia ${finalReq.requestedDay}.`
          });
        } else {
          toast.info(`Renata (RT) registrou parecer: ${decision === "approved" ? "FAVORÁVEL" : "DESFAVORÁVEL"}. Aguardando decisão de Maria Eduarda.`);
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
        if (rtApproval === "rejected" || leadApproval === "rejected") {
          newStatus = "rejected";
        } else if (rtApproval === "approved" && leadApproval === "approved") {
          newStatus = "approved";
        }
        
        return {
          ...r,
          leadApproval,
          status: newStatus,
          reviewedBy: newStatus !== "pending" ? `RT Renata & Liderança Maria Eduarda` : undefined,
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
          toast.success("FOLGA DEFERIDA CONJUNTAMENTE!", {
            description: `Tanto Renata (RT) quanto Maria Eduarda (Liderança) concederam a folga para ${finalReq.memberName} no dia ${finalReq.requestedDay}.`
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
            description: `Houve recusa por parte de uma das decisoras (Renata ou Maria Eduarda) para ${finalReq.memberName} no dia ${finalReq.requestedDay}.`
          });
        } else {
          toast.info(`Maria Eduarda (Liderança) registrou parecer: ${decision === "approved" ? "FAVORÁVEL" : "DESFAVORÁVEL"}. Aguardando decisão de Renata.`);
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
    const q = searchQuery.toLowerCase().trim();
    if (!q) return currentActiveShift.staff;
    return currentActiveShift.staff.filter(m => 
      m.name.toLowerCase().includes(q) || 
      m.role.toLowerCase().includes(q)
    );
  }, [currentActiveShift.staff, searchQuery]);

  // Calendar mapping array (May 2026 - 31 Days)
  const daysArray = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-4">
      
      {/* HEADER SECTION WITH INTEGRATED THEME BRANDING */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2.5 bg-indigo-500/20 text-indigo-300 font-extrabold text-[10px] uppercase rounded border border-indigo-500/30 tracking-wider">
                Recursos Humanos & Escalabilidade
              </span>
              <span className="p-1 px-2 bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] uppercase rounded border border-emerald-500/30 tracking-wider">
                Direito e Benefício Constitucional
              </span>
            </div>
            <h1 className="text-2xl font-black mt-2 tracking-tight uppercase flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-indigo-400" />
              Gestão de Escalas & Escolha de Folgas
            </h1>
            <p className="text-xs text-slate-350 max-w-2xl font-medium">
              A folga é um direito do profissional de saúde da UPA. Use este painel para registrar as opções de folga escolhidas pelos colaboradores, enquanto a Gestão Geral detém a palavra final para avaliar a cobertura mínima de equipe.
            </p>
          </div>
          
          <div className="shrink-0 bg-slate-800/60 p-3 rounded-xl border border-slate-700 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-black">
              Assinatura Autorizada (Gestão Geral)
            </span>
            <Input 
              value={managerSignature} 
              onChange={(e) => setManagerSignature(e.target.value)}
              className="h-8 max-w-[240px] text-xs bg-slate-900 border-slate-700 text-white font-bold rounded-lg"
              placeholder="Nome do Gestor Geral"
            />
          </div>
        </div>
      </div>

      {/* CORE STATS BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50 bg-card shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-black tracking-wider">Teto Crítico de Ausências</span>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
                Limite máximo simultâneo por plantão de <strong className="text-foreground">3 Técnicos</strong> e <strong className="text-foreground">1 Enfermeiro</strong> em folga concorrente.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-black tracking-wider">Solicitações Ativas de Folga</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Atualmente existem <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold">{requests.filter(r => r.status === "pending").length} de folgas aguardando</strong> validação e palavra final da gestão geral.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-black tracking-wider">Direito & Amparo Legal</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Asseguramos o registro das vontades e escala móvel com total conformidade trabalhista na UPA.
              </p>
            </div>
          </CardContent>
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
      <AnimatePresence>
        {isGlobalScaleOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "fixed inset-0 z-[40] bg-black/60 backdrop-blur-sm flex items-center justify-center overflow-hidden transition-all duration-200",
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
                {/* Top sticky bar */}
                <div className="border-b bg-card px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="h-6 w-6 text-teal-500" />
                      <h2 className="uppercase font-black tracking-tight text-xl text-foreground">
                        Escala Mensal Unificada — Maio de 2026
                      </h2>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Visão integralizada e automatizada de todo o mês aberto. Identifique as escalas de plantonistas na rotatividade 12x36 e as respectivas folgas deferidas pelo comitê gestor.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant={isExcelMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setIsExcelMode(!isExcelMode);
                        if (!isExcelMode) {
                          toast.success("Modo Planilha Excel ativado!", {
                            description: "Veja colunas nomeadas (A, B, C...) e a Barra de Fórmulas Dinâmica de conformidade acima da tabela."
                          });
                        } else {
                          setSelectedExcelCell(null);
                        }
                      }}
                      className={cn(
                        "h-9 px-3 text-xs gap-1.5 font-bold shrink-0 transition-all cursor-pointer",
                        isExcelMode 
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold border-emerald-600" 
                          : "hover:bg-muted text-foreground"
                      )}
                    >
                      <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                      {isExcelMode ? "Visualizar Escala Clássica" : "Modo Planilha Excel"}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportToExcel}
                      className="h-9 px-3 text-xs gap-1.5 font-black hover:bg-green-50 dark:hover:bg-emerald-950/20 border-emerald-650/40 text-emerald-600 dark:text-emerald-400 shrink-0"
                    >
                      <Download className="h-4 w-4 text-emerald-600" />
                      Baixar como Excel (.XLS)
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsGlobalScaleMaximized(!isGlobalScaleMaximized)}
                      className="h-9 px-3 text-xs gap-1.5 font-bold hover:bg-muted shrink-0 hidden sm:flex"
                    >
                      {isGlobalScaleMaximized ? (
                        <>
                          <Minimize2 className="h-4 w-4 text-indigo-500" />
                          Restaurar Janela
                        </>
                      ) : (
                        <>
                          <Maximize2 className="h-4 w-4 text-emerald-500" />
                          Maximizar Janela (Tela Cheia)
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsGlobalScaleOpen(false)}
                      className="rounded-full hover:bg-slate-150 dark:hover:bg-slate-800 shrink-0"
                    >
                      <X className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>

                {/* Scrollable contents */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                {/* LEGEND & DETAILED CODES */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-2 text-xs">
                  <strong className="text-indigo-655 dark:text-indigo-400 text-[11px] uppercase font-black">
                    Legenda e Código de Escala:
                  </strong>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-3 items-center mt-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center text-[10.5px] rounded-lg font-black bg-amber-500 text-white shadow-sm">P</span>
                      <span className="text-muted-foreground text-[11px] font-semibold">Ímpar Diurno</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center text-[10.5px] rounded-lg font-black bg-blue-500 text-white shadow-sm">P</span>
                      <span className="text-muted-foreground text-[11px] font-semibold">Par Diurno</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center text-[10.5px] rounded-lg font-black bg-purple-500 text-white shadow-sm">P</span>
                      <span className="text-muted-foreground text-[11px] font-semibold">Ímpar Noturno</span>
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

                {/* INTERACTIVE FILTERS ROW */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                        <SelectItem value="nurse">Enfermeiro Supervisor</SelectItem>
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
                        {shifts.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* EXCEL FORMULA BAR */}
                {isExcelMode && (
                  <div className="flex items-center gap-2 bg-[#f3f4f6] dark:bg-slate-900 border border-[#c0c0c0] dark:border-slate-850 p-2 rounded-xl text-xs font-mono select-none shadow-sm">
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

                {/* INTEGRATED SHEET TABLE */}
                <div className={cn(
                  "border rounded-xl overflow-hidden bg-card shadow-sm transition-all duration-200",
                  isExcelMode 
                    ? "border-[#a3a3a3] dark:border-slate-800" 
                    : "border-slate-200 dark:border-slate-800"
                )}>
                  <div className="overflow-x-auto">
                    <table className={cn(
                      "w-full border-collapse text-left text-xs min-w-[1300px]",
                      isExcelMode && "font-sans border-[#c0c0c0] dark:border-[#2d3748]"
                    )}>
                      <thead>
                        {/* Excel Row header letters (A, B, C...) */}
                        {isExcelMode && (
                          <tr className="bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase border-b border-[#c0c0c0] dark:border-slate-800 divide-x divide-slate-300 dark:divide-slate-700">
                            <th className="p-1 px-2 text-center bg-slate-200 dark:bg-slate-850 sticky left-0 z-20 border-r border-[#c0c0c0] dark:border-slate-800 text-[9px]">
                              X
                            </th>
                            <th 
                              onClick={() => handleSortToggle("name")}
                              className="p-1 text-center font-black sticky left-[40px] bg-slate-200 dark:bg-slate-850 z-10 border-r border-[#c0c0c0] dark:border-slate-800 cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-emerald-600 select-none"
                              title="Clique para ordenar por Nome (Coluna A)"
                            >
                              A{renderSortIndicator("name")}
                            </th>
                            <th 
                              onClick={() => handleSortToggle("group")}
                              className="p-1 text-center font-black border-r border-[#c0c0c0] dark:border-slate-200 cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-emerald-600 select-none"
                              title="Clique para ordenar por Grupo (Coluna B)"
                            >
                              B{renderSortIndicator("group")}
                            </th>
                            {daysArray.map((d) => (
                              <th key={`letter-${d}`} className="p-1 text-center font-bold min-w-[34px]">
                                {getExcelColumnLetter(d + 1)}
                              </th>
                            ))}
                          </tr>
                        )}
                        <tr className={cn(
                          isExcelMode 
                            ? "bg-[#f3f4f6] dark:bg-slate-900 border-b border-[#c0c0c0] dark:border-slate-800 divide-[#c0c0c0]" 
                            : "bg-slate-100 dark:bg-slate-900 border-b"
                        )}>
                          {isExcelMode ? (
                            <>
                              <th className="p-2 py-3 font-bold uppercase sticky left-0 z-20 bg-slate-200 dark:bg-slate-850 border-r border-[#c0c0c0] dark:border-slate-800 text-center text-slate-550 dark:text-slate-400 w-[40px] min-w-[40px]">
                                N°
                              </th>
                              <th 
                                onClick={() => handleSortToggle("name")}
                                className="p-3 font-bold text-slate-600 dark:text-slate-300 uppercase sticky left-[40px] bg-slate-100 dark:bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r border-[#c0c0c0] dark:border-slate-800 min-w-[190px] z-10 text-left cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 select-none transition-colors group"
                                title="Clique para ordenar por Nome"
                              >
                                <div className="flex items-center gap-1.5 justify-between">
                                  <span>Nome assistencial</span>
                                  <span className="text-[10px] text-emerald-600 font-extrabold">
                                    {globalSortField === "name" ? (globalSortDirection === "asc" ? "▲" : "▼") : "↕"}
                                  </span>
                                </div>
                              </th>
                            </>
                          ) : (
                            <th 
                              onClick={() => handleSortToggle("name")}
                              className="p-3 font-bold text-slate-500 uppercase sticky left-0 bg-slate-100 dark:bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r min-w-[230px] z-10 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 select-none transition-colors group"
                              title="Clique para ordenar por Nome"
                            >
                              <div className="flex items-center gap-1.5 justify-between">
                                <span>Nome assistencial</span>
                                <span className="text-[10px] text-emerald-600 font-extrabold">
                                  {globalSortField === "name" ? (globalSortDirection === "asc" ? "▲" : "▼") : "↕"}
                                </span>
                              </div>
                            </th>
                          )}
                          <th 
                            onClick={() => handleSortToggle("group")}
                            className={cn(
                              "p-3 font-bold uppercase border-r text-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 select-none transition-colors group",
                              isExcelMode 
                                ? "text-slate-600 dark:text-slate-300 bg-[#f3f4f6] dark:bg-slate-900 border-[#c0c0c0] dark:border-slate-800 min-w-[130px]" 
                                : "text-slate-500 border-r text-center min-w-[130px]"
                            )}
                            title="Clique para ordenar por Grupo de Escala"
                          >
                            <div className="flex items-center gap-1.5 justify-center">
                              <span>Grupo de Escala</span>
                              <span className="text-[10px] text-emerald-600 font-extrabold">
                                {globalSortField === "group" ? (globalSortDirection === "asc" ? "▲" : "▼") : "↕"}
                              </span>
                            </div>
                          </th>
                          {daysArray.map((d) => {
                            const wDay = getWeekday(d);
                            const dayOfWeekIndex = (d - 1 + 5) % 7;
                            const isWeekend = dayOfWeekIndex === 0 || dayOfWeekIndex === 6;
                            
                            return (
                              <th
                                key={d}
                                className={cn(
                                  "p-2 text-center font-extrabold border-r min-w-[34px]",
                                  isWeekend
                                    ? "bg-red-500/[0.04] text-red-600 dark:text-red-400"
                                    : "text-slate-600 dark:text-slate-400"
                                )}
                              >
                                <span className="block text-xs font-black">{d}</span>
                                <span className="text-[8.5px] opacity-80 uppercase font-bold">{wDay}</span>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {filteredGlobals.length === 0 ? (
                          <tr>
                            <td colSpan={33} className="p-10 text-center text-muted-foreground font-bold">
                              Nenhum profissional assistencial corresponde aos critérios selecionados.
                            </td>
                          </tr>
                        ) : (
                          filteredGlobals.map((p, index) => {
                            const stylingObj = getShiftColorStyles(p.shiftId);
                            
                            return (
                              <tr key={p.id} className={cn(
                                "hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all",
                                isExcelMode && "divide-x divide-slate-300 dark:divide-slate-800"
                              )}>
                                {isExcelMode ? (
                                  <>
                                    {/* Excel Row Index Column (1, 2, 3...) */}
                                    <td className="p-2 text-center bg-slate-200 dark:bg-slate-800 font-bold border-r border-[#c0c0c0] dark:border-slate-800 text-slate-500 sticky left-0 z-20 text-[10px] w-[40px] select-none h-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                      {index + 1}
                                    </td>
                                    {/* Excel Name Column (A) sticky at left-[40px] */}
                                    <td className="p-3 font-extrabold border-r sticky left-[40px] bg-card shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-b border-[#c0c0c0] dark:border-slate-800 z-10 text-xs text-left">
                                      <div className="flex items-center justify-between gap-2 max-w-[170px]">
                                        <div className="truncate">
                                          <span className="block text-[12px] truncate max-w-[150px] text-foreground font-black">
                                            {p.name}
                                          </span>
                                          <span className="inline-block text-[9px] font-semibold uppercase text-slate-400">
                                            {p.id === "staff-renata" 
                                              ? "Responsável Técnica" 
                                              : p.id === "staff-maria" 
                                                ? "Liderança" 
                                                : p.role === "nurse" 
                                                  ? "Enfermeiro" 
                                                  : "Téc. Enfermagem"
                                            }
                                          </span>
                                        </div>
                                        <span 
                                          className={cn("h-2.5 w-2.5 rounded shrink-0 border", stylingObj.border, stylingObj.bg)} 
                                          title={stylingObj.label} 
                                        />
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  /* Professional info column (sticky left) */
                                  <td className="p-3 font-extrabold border-r sticky left-0 bg-card shadow-[2px_0_5px_rgba(0,0,0,0.05)] z-10">
                                    <div className="flex items-center justify-between gap-2">
                                      <div>
                                        <span className="block text-[12px] truncate max-w-[160px] text-foreground font-black">
                                          {p.name}
                                        </span>
                                        <span className="inline-block text-[9px] font-semibold uppercase text-slate-500">
                                          {p.id === "staff-renata" 
                                            ? "Responsável Técnica" 
                                            : p.id === "staff-maria" 
                                              ? "Liderança" 
                                              : p.role === "nurse" 
                                                ? "Enfermeiro" 
                                                : "Téc. Enfermagem"
                                          }
                                        </span>
                                      </div>
                                      <span 
                                        className={cn("h-3 w-3 rounded-md shrink-0 border", stylingObj.border, stylingObj.bg)} 
                                        title={stylingObj.label} 
                                      />
                                    </div>
                                  </td>
                                )}
 
                                {/* Scale group tag */}
                                <td className={cn(
                                  "p-2 border-r text-center",
                                  isExcelMode && "border-[#c0c0c0] dark:border-slate-800"
                                )}>
                                  <Badge variant="outline" className={cn("text-[9px] font-black uppercase rounded-lg px-2 py-0.5 border", stylingObj.badge)}>
                                    {stylingObj.label}
                                  </Badge>
                                </td>
 
                                {/* Monthly Calendar Row */}
                                {daysArray.map((d) => {
                                  const dayStatus = getDayStatus(p, d);
                                  let cellBg = "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-900/60";
                                  let cellText = "-";
                                  let cellClass = "font-black text-slate-350 dark:text-slate-700";
 
                                  if (dayStatus === "duty") {
                                    cellBg = stylingObj.bg;
                                    cellText = "P";
                                    cellClass = "text-white font-black shadow-sm rounded-lg scale-[0.85]";
                                  } else if (dayStatus === "leave-approved") {
                                    cellBg = "bg-emerald-500 text-white rounded-lg scale-[0.85] border border-emerald-600";
                                    cellText = "F";
                                    cellClass = "font-black shadow-sm text-white";
                                  } else if (dayStatus === "leave-pending") {
                                    cellBg = "bg-amber-500 text-white rounded-lg scale-[0.85] border border-amber-600";
                                    cellText = "?";
                                    cellClass = "font-black shadow-sm text-white animate-pulse";
                                  } else if (dayStatus === "leave-toggled") {
                                    cellBg = "bg-red-500 text-white rounded-lg scale-[0.85] border border-red-650";
                                    cellText = "F";
                                    cellClass = "font-black shadow-sm text-white";
                                  } else if (dayStatus === "FE") {
                                    cellBg = "bg-pink-600 text-white rounded-lg scale-[0.85] border border-pink-750";
                                    cellText = "FE";
                                    cellClass = "font-black shadow-sm text-white text-[10px]";
                                  } else if (dayStatus === "FA") {
                                    cellBg = "bg-cyan-550 text-white rounded-lg scale-[0.85] border border-cyan-650";
                                    cellText = "FA";
                                    cellClass = "font-black shadow-sm text-white text-[10px]";
                                  } else if (dayStatus === "BH") {
                                    cellBg = "bg-violet-600 text-white rounded-lg scale-[0.85] border border-violet-700";
                                    cellText = "BH";
                                    cellClass = "font-black shadow-sm text-white text-[10px]";
                                  } else if (dayStatus === "LM") {
                                    cellBg = "bg-red-700 text-white rounded-lg scale-[0.85] border border-red-800";
                                    cellText = "LM";
                                    cellClass = "font-black shadow-sm text-white text-[10px]";
                                  }
 
                                  const isSelectedCell = selectedExcelCell && selectedExcelCell.memberName === p.name && selectedExcelCell.day === d;

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
                                      className={cn(
                                        "p-0 text-center border-r select-none h-10 w-10 min-w-[34px] cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/85 transition-all relative group",
                                        isExcelMode && "border-[#c0c0c0] dark:border-slate-800/60",
                                        isExcelMode && isSelectedCell && "outline outline-2 outline-emerald-500 outline-offset-[-2px] z-30"
                                      )}
                                      title={`CLIQUE PARA ALTERAR — ${p.name} — Dia ${d}/05: ${
                                        dayStatus === "duty" ? "Plantão Clínico Ativo" :
                                        dayStatus === "leave-approved" ? "Folga de Direito Concedida" :
                                        dayStatus === "leave-pending" ? "Folga Solicitada (Sob Análise)" :
                                        dayStatus === "leave-toggled" ? "Folga Cadastrada Ativa" :
                                        dayStatus === "FE" ? "Folga Eleitoral (FE)" :
                                        dayStatus === "FA" ? "Folga Aniversário (FA)" :
                                        dayStatus === "BH" ? "Banco de Horas (BH)" :
                                        dayStatus === "LM" ? "Licença Médica (LM)" :
                                        "Folga de Revezamento Escala 12x36"
                                      }`}
                                    >
                                      <div className={cn(
                                        "w-full h-full flex items-center justify-center transition-all group-hover:scale-105 group-hover:shadow-sm",
                                        isExcelMode && dayStatus === "off-duty" ? "text-slate-300 dark:text-slate-755 bg-transparent" : cellBg,
                                        cellClass
                                      )}>
                                        {cellText}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Bottom bar */}
              <div className="border-t bg-card px-6 py-4 flex items-center justify-end shrink-0 shadow-[0_-2px_5px_rgba(0,0,0,0.02)]">
                <Button
                  onClick={() => setIsGlobalScaleOpen(false)}
                  className="px-6 h-10 text-xs bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 text-white font-black rounded-lg shadow-sm"
                >
                  Fechar Painel de Escala
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

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
              <Tabs defaultValue="status" className="w-full">
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
                          onValueChange={(val: "nurse" | "technician") => setEditingRole(val)}
                        >
                          <SelectTrigger className="h-10 text-xs rounded-lg bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nurse" className="text-xs">Enfermeiro</SelectItem>
                            <SelectItem value="technician" className="text-xs">Téc. Enfermagem</SelectItem>
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
              onClick={saveCellEdits}
              className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg h-9 text-xs font-black uppercase tracking-wider"
            >
              Confirmar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TAB CONTENT: OVERVIEW BLOCK */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* L. CALENDAR CONTROL PANEL */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="border-border/40 shadow-sm relative overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/15">
                <CardTitle className="text-xs uppercase font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> Seleção de Dia de Plantão
                </CardTitle>
                <CardDescription className="text-xs">
                  Alterne entre dias Ímpares ou Pares para carregar as equipes da Escala 12x36 Correspondente em Maio de 2026.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-7 gap-1.5 text-center mb-4">
                  {["D", "S", "T", "Q", "Q", "S", "S"].map((d, idx) => (
                    <span key={idx} className="text-[10px] font-black text-slate-400 dark:text-slate-500">
                      {d}
                    </span>
                  ))}

                  {/* Offset empty spaces for May 2026 starting Friday (5 offset days) */}
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={`empty-${i}`} className="bg-transparent aspect-square" />
                  ))}

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
                    Mapeamento Selecionado: Dia {selectedDay} de Maio de 2026
                  </div>
                  <p className="text-[11px] text-slate-550 dark:text-slate-400">
                    Ativação automática para o grupo de plantões de dias <strong className="text-indigo-600 dark:text-indigo-400">{isSelectedDayOdd ? "ÍMPARES" : "PARES"}</strong>.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* SECTORS METRIC COMPLIANCE CARD */}
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/15">
                <CardTitle className="text-xs uppercase font-black text-slate-700 dark:text-slate-350">
                  Resumo das Escalas 12x36
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {shifts.map((s) => {
                  const sNurses = s.staff.filter(m => m.role === "nurse");
                  const sTechs = s.staff.filter(m => m.role === "technician");
                  const offNurses = sNurses.filter(m => m.status === "leave").length;
                  const offTechs = sTechs.filter(m => m.status === "leave").length;
                  
                  const isSShiftActive = activeShiftId === s.id;
                  const isWarn = offTechs > 3 || offNurses > 1;

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
                          <span>Supervisor Off: <strong className={offNurses > 1 ? "text-red-500" : "text-emerald-500"}>{offNurses}/1</strong></span>
                          <span>Técnico Off: <strong className={offTechs > 3 ? "text-red-500" : "text-emerald-500"}>{offTechs}/3</strong></span>
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

            <Card className="border-border/40 shadow-sm">
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
                              <SelectItem value="nurse">Enfermeiro Supervisor</SelectItem>
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
                      <TableHead className="font-bold text-xs uppercase text-slate-500 text-right">Ação</TableHead>
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
                          <TableCell className="py-3 text-right">
                            <Button 
                              variant="ghost" 
                              onClick={() => handleRemoveStaff(member.id, member.name)}
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded-lg"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* LIVE DOCUMENTATION BOX */}
            <div className="p-4 bg-slate-900 text-slate-300 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-white uppercase text-[11px] tracking-wider">
                <ShieldAlert className="h-4 w-4 text-amber-400" /> Nota sobre Direitos Coletivos & Escala SUS
              </div>
              <p className="leading-relaxed">
                A substituição de plantões 12x36 e folga é um direito fundamental. Para que o fluxo de atendimento não seja interrompido na UPA, o sistema impõe limites. O trabalhador escolhe seus dias preferidos no <strong className="text-indigo-300">Menu de Seleção de Folgas</strong>, mas o preenchimento na escala oficial é sempre validado pela <strong className="text-indigo-400 font-extrabold">Palavra Final da Gestão Geral</strong>, autorizando de forma discricionária.
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
                  <CardTitle className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight flex items-center gap-1.5">
                    <UserCheck className="h-4.5 w-4.5 text-blue-600" /> 1. Identificação do Profissional
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Selecione o seu turno de trabalho (escala 12x36 padrão) e o seu nome nos campos para mapear de forma fácil a sua escala para Maio de 2026.
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
                        let icon = "☀️";
                        if (group.id === "rt_lideranca") icon = "💼";
                        else if (group.id.includes("noturno")) icon = "🌙";
                        const label = group.name.replace(/Plantão|RT & Liderança/g, "").trim();
                        return (
                          <SelectItem key={group.id} value={group.id} className="text-xs font-semibold cursor-pointer">
                            {icon} {label} ({group.staff.length} Profissionais)
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
                      {selectedCollabObj.name.charAt(selectedCollabObj.name.indexOf(".") + 2) || selectedCollabObj.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <span>{selectedCollabObj.name}</span>
                        <Badge className="bg-blue-100/70 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-black text-[9px] uppercase border-transparent">
                          {selectedCollabObj.role === "nurse" ? "Enfermeiro" : "Técnico de Enfermagem"}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-semibold block">
                        Vínculo: <strong>Escala 12x36 Cíclica</strong> • Turno de Plantão: <strong>{selectedCollabObj.shiftName}</strong>
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
                    Selecione no calendário o dia de Maio de 2026 que você deseja solicitar folga de direito legal. Os dias com <strong>P</strong> representam seus plantões programados.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 flex-1 flex flex-col justify-between">
                  {selectedCollabObj ? (
                    <div className="space-y-4">
                      {/* MINI CALENDAR GRID WITH CYCLE HIGHLIGHTING */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Calendário de Turnos (Maio de 2026)</Label>
                          <Badge className="bg-indigo-600 text-white font-black uppercase rounded text-[10px] px-2 py-0.5 animate-pulse">
                            Dia {collabRequestDay} de Maio Selecionado
                          </Badge>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/35 rounded-xl p-4 border border-border/80 shadow-inner">
                          <div className="grid grid-cols-7 gap-2 text-center mb-2">
                            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, index) => (
                              <span key={index} className="text-[10px] font-black text-slate-400 dark:text-slate-500 py-1 uppercase">
                                {d}
                              </span>
                            ))}

                            {/* Offset empty spaces for May 2026 starting Friday (5 offset days) */}
                            {Array.from({ length: 5 }).map((_, i) => (
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
                                  onClick={() => setCollabRequestDay(day)}
                                  className={cn(
                                    "aspect-square text-xs rounded-xl transition-all flex flex-col items-center justify-between p-2 relative cursor-pointer border select-none group",
                                    isSelected
                                      ? "bg-blue-600 border-blue-600 text-white font-black shadow-md scale-105 z-10"
                                      : isRequestDay 
                                        ? "bg-amber-100 dark:bg-amber-950/40 border-amber-300 text-amber-850 dark:text-amber-400 hover:bg-amber-200 font-bold"
                                        : details.bgClass
                                  )}
                                >
                                  <span className="font-extrabold text-xs self-start leading-none">{day}</span>
                                  
                                  <span className={cn(
                                    "text-[8px] font-black uppercase tracking-tighter px-1.5 py-[1px] rounded-sm self-end",
                                    isSelected 
                                      ? "bg-blue-750 text-blue-100" 
                                      : details.badgeClass
                                  )}>
                                    {details.label}
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
                            ⚡ Status Real: Dia {collabRequestDay} de Maio de 2026 é um dia de{" "}
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
                          <span className="text-[9px] text-muted-foreground block font-medium">Dia {r.requestedDay} de Maio / {r.shiftName.replace(/✨|☀️|🌙/g, "").trim()}</span>
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
              ⚡ <strong>Regra de Decisão Conjunta:</strong> Renata (RT Enfermagem) e Maria Eduarda (Liderança) devem ambas deferir as folgas para homologação oficial na escala. O indeferimento de qualquer uma das duas reprova a solicitação.
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
                      Sem solicitações pendentes no momento. Todos os direitos de folgas foram apreciados por Renata (RT) e Maria Eduarda (Liderança).
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
                          <span className="font-extrabold text-foreground block">Dia {req.requestedDay} de Maio</span>
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
    </div>
  );
}
