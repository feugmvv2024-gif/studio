
"use client"

import * as React from "react"
import { 
  FileText, 
  User, 
  Calendar, 
  Clock, 
  Send,
  Loader2,
  Check,
  ShieldCheck,
  Briefcase,
  Plus,
  Trash2,
  UserX,
  ChevronDown,
  ChevronUp,
  History,
  Star,
  Timer,
  Users,
  Car,
  Save,
  MessageSquare,
  ClipboardList,
  Archive,
  Eye,
  CheckCircle2,
  X
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useAuth } from '@/firebase'
import { collection, query, orderBy, where, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore'
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

const normalizeStr = (str: string) => str?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";

const getSaoPauloDate = () => {
  const now = new Date();
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now).split('/').reverse().join('-');
};

const getSaoPauloTime = () => {
  const now = new Date();
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now);
};

const formatDateBR = (dateStr: string) => {
  if (!dateStr) return "---";
  return dateStr.split('-').reverse().join('/');
};

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function RelatoriosPage() {
  const { toast } = useToast()
  const firestore = useFirestore()
  const { user: currentUser } = useAuth()
  const [loading, setLoading] = React.useState(false)

  // Estados de Colapso
  const [isSubTeamOpen, setIsSubTeamOpen] = React.useState(false)
  const [isAbsencesOpen, setIsAbsencesOpen] = React.useState(false)
  const [isAfastadosOpen, setIsAfastadosOpen] = React.useState(false)
  const [isEspecialOpen, setIsEspecialOpen] = React.useState(false)
  const [isTeamOpen, setIsTeamOpen] = React.useState(false)

  // Estados para valores padrão
  const [defaultDate, setDefaultDate] = React.useState("")
  const [defaultTime, setDefaultTime] = React.useState("")
  const [selectedEscalaId, setSelectedEscalaId] = React.useState("")
  const [observations, setObservations] = React.useState("")

  // Estados do Rascunho
  const [isDraftDialogOpen, setIsDraftDialogOpen] = React.useState(false)
  const [tempDraft, setTempDraft] = React.useState<any>(null)

  React.useEffect(() => {
    setDefaultDate(getSaoPauloDate());
    setDefaultTime(getSaoPauloTime());

    const saved = localStorage.getItem('nrg_relatorio_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTempDraft(parsed);
        setIsDraftDialogOpen(true);
      } catch (e) {
        console.error("Erro ao ler rascunho", e);
      }
    }
  }, []);

  // Estados para Inspetor (Fixo)
  const [inspetorTerm, setInspetorTerm] = React.useState("")
  const [inspetorId, setInspetorId] = React.useState("")
  const [inspetorInfo, setInspetorInfo] = React.useState("")
  const [showInspetorSuggestions, setShowInspetorSuggestions] = React.useState(false)

  // Estados para Subinspetores (Dinâmico)
  const [subinspetorRows, setSubinspetorRows] = React.useState([
    { id: generateId(), term: "", info: "", show: false, empId: "" }
  ]);

  // Estados para Faltas (Dinâmico)
  const [faltaRows, setFaltaRows] = React.useState([
    { id: generateId(), term: "", info: "", show: false, empId: "" }
  ]);

  // Estados para Escala Especial (Dinâmico)
  const [especialRows, setEspecialRows] = React.useState([
    { id: generateId(), term: "", info: "", show: false, periodId: "", empId: "" }
  ]);

  // ESTRUTURA: EQUIPE DO DIA (Setores -> Postos -> Membros)
  const [sectorBlocks, setSectorBlocks] = React.useState<any[]>([
    {
      id: generateId(),
      sectorType: "",
      chiefData: { id: "", term: "", info: "", show: false },
      posts: [
        {
          id: generateId(),
          type: "",
          vtrNumber: "",
          members: [
            { id: generateId(), empId: "", term: "", show: false }
          ]
        }
      ]
    }
  ]);

  // Lógica de Rascunho
  const handleSaveDraft = () => {
    const draft = {
      defaultDate,
      defaultTime,
      selectedEscalaId,
      inspetorTerm,
      inspetorId,
      inspetorInfo,
      subinspetorRows,
      faltaRows,
      especialRows,
      sectorBlocks,
      observations
    };
    localStorage.setItem('nrg_relatorio_draft', JSON.stringify(draft));
    toast({ title: "RASCUNHO SALVO", description: "As informações foram guardadas no seu navegador." });
  };

  const handleLoadDraft = () => {
    if (tempDraft) {
      setDefaultDate(tempDraft.defaultDate || getSaoPauloDate());
      setDefaultTime(tempDraft.defaultTime || getSaoPauloTime());
      setSelectedEscalaId(tempDraft.selectedEscalaId || "");
      setInspetorTerm(tempDraft.inspetorTerm || "");
      setInspetorId(tempDraft.inspetorId || "");
      setInspetorInfo(tempDraft.inspetorInfo || "");
      setSubinspetorRows(tempDraft.subinspetorRows || [{ id: generateId(), term: "", info: "", show: false, empId: "" }]);
      setFaltaRows(tempDraft.faltaRows || [{ id: generateId(), term: "", info: "", show: false, empId: "" }]);
      setEspecialRows(tempDraft.especialRows || [{ id: generateId(), term: "", info: "", show: false, periodId: "", empId: "" }]);
      setSectorBlocks(tempDraft.sectorBlocks || []);
      setObservations(tempDraft.observations || "");
      setIsDraftDialogOpen(false);
      toast({ title: "RASCUNHO CARREGADO" });
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('nrg_relatorio_draft');
    setIsDraftDialogOpen(false);
    toast({ variant: "destructive", title: "RASCUNHO DESCARTADO" });
  };

  // Auxiliares Subinspetores
  const addSubinspetorRow = () => setSubinspetorRows([...subinspetorRows, { id: generateId(), term: "", info: "", show: false, empId: "" }]);
  const removeSubinspetorRow = (index: number) => {
    const newRows = subinspetorRows.filter((_, i) => i !== index);
    setSubinspetorRows(newRows.length ? newRows : [{ id: generateId(), term: "", info: "", show: false, empId: "" }]);
  };
  const updateSubinspetorRow = (index: number, updates: any) => {
    setSubinspetorRows(prev => {
      const newRows = [...prev];
      newRows[index] = { ...newRows[index], ...updates };
      return newRows;
    });
  };

  // Auxiliares Faltas
  const addFaltaRow = () => setFaltaRows([...faltaRows, { id: generateId(), term: "", info: "", show: false, empId: "" }]);
  const removeFaltaRow = (index: number) => {
    const newRows = faltaRows.filter((_, i) => i !== index);
    setFaltaRows(newRows.length ? newRows : [{ id: generateId(), term: "", info: "", show: false, empId: "" }]);
  };
  const updateFaltaRow = (index: number, updates: any) => {
    setFaltaRows(prev => {
      const newRows = [...prev];
      newRows[index] = { ...newRows[index], ...updates };
      return newRows;
    });
  };

  // Auxiliares Escala Especial
  const addEspecialRow = () => setEspecialRows([...especialRows, { id: generateId(), term: "", info: "", show: false, periodId: "", empId: "" }]);
  const removeEspecialRow = (index: number) => {
    const newRows = especialRows.filter((_, i) => i !== index);
    setEspecialRows(newRows.length ? newRows : [{ id: generateId(), term: "", info: "", show: false, periodId: "", empId: "" }]);
  };
  const updateEspecialRow = (index: number, updates: any) => {
    setEspecialRows(prev => {
      const newRows = [...prev];
      newRows[index] = { ...newRows[index], ...updates };
      return newRows;
    });
  };

  // Funções de Equipe
  const addSectorBlock = () => {
    setSectorBlocks([...sectorBlocks, {
      id: generateId(),
      sectorType: "",
      chiefData: { id: "", term: "", info: "", show: false },
      posts: [{ id: generateId(), type: "", vtrNumber: "", members: [{ id: generateId(), empId: "", term: "", show: false }] }]
    }]);
  };

  const removeSectorBlock = (index: number) => {
    const newBlocks = sectorBlocks.filter((_, i) => i !== index);
    setSectorBlocks(newBlocks.length ? newBlocks : []);
  };

  const updateSectorBlock = (index: number, updates: any) => {
    setSectorBlocks(prev => {
      const newBlocks = [...prev];
      newBlocks[index] = { ...newBlocks[index], ...updates };
      return newBlocks;
    });
  };

  const updateSectorChiefData = (index: number, updates: any) => {
    setSectorBlocks(prev => {
      const newBlocks = [...prev];
      if (!newBlocks[index]) return prev;
      newBlocks[index] = {
        ...newBlocks[index],
        chiefData: { ...newBlocks[index].chiefData, ...updates }
      };
      return newBlocks;
    });
  };

  const addPostToSector = (sectorIndex: number) => {
    const newBlocks = [...sectorBlocks];
    newBlocks[sectorIndex].posts.push({
      id: generateId(),
      type: "",
      vtrNumber: "",
      members: [{ id: generateId(), empId: "", term: "", show: false }]
    });
    setSectorBlocks(newBlocks);
  };

  const removePostFromSector = (sectorIndex: number, postIndex: number) => {
    const newBlocks = [...sectorBlocks];
    newBlocks[sectorIndex].posts = newBlocks[sectorIndex].posts.filter((_: any, i: number) => i !== postIndex);
    setSectorBlocks(newBlocks);
  };

  const addMemberToPost = (sectorIndex: number, postIndex: number) => {
    const newBlocks = [...sectorBlocks];
    const post = newBlocks[sectorIndex].posts[postIndex];
    const isVTR = post.type === "VTR";
    const limit = isVTR ? 4 : 15;

    if (post.members.length >= limit) {
      toast({ variant: "destructive", title: "LIMITE ATINGIDO", description: `MÁXIMO DE ${limit} SERVIDORES PARA ESTE POSTO.` });
      return;
    }
    post.members.push({ id: generateId(), empId: "", term: "", show: false });
    setSectorBlocks(newBlocks);
  };

  const removeMemberFromPost = (sectorIndex: number, postIndex: number, memberIndex: number) => {
    const newBlocks = [...sectorBlocks];
    newBlocks[sectorIndex].posts[postIndex].members = newBlocks[sectorIndex].posts[postIndex].members.filter((_: any, i: number) => i !== memberIndex);
    setSectorBlocks(newBlocks);
  };

  const updateMemberInPost = (sectorIndex: number, postIndex: number, memberIndex: number, updates: any) => {
    setSectorBlocks(prev => {
      const newBlocks = [...prev];
      const sector = { ...newBlocks[sectorIndex] };
      const posts = [...sector.posts];
      const post = { ...posts[postIndex] };
      const members = [...post.members];
      members[memberIndex] = { ...members[memberIndex], ...updates };
      post.members = members;
      posts[postIndex] = post;
      sector.posts = posts;
      newBlocks[sectorIndex] = sector;
      return newBlocks;
    });
  };

  // Coleções
  const employeesRef = React.useMemo(() => firestore ? query(collection(firestore, 'employees'), orderBy('name', 'asc')) : null, [firestore]);
  const shiftPeriodsRef = React.useMemo(() => firestore ? query(collection(firestore, 'shiftPeriods'), orderBy('escalaName', 'asc')) : null, [firestore]);
  const launchesRef = React.useMemo(() => {
    if (!firestore) return null;
    const today = getSaoPauloDate();
    return query(collection(firestore, 'launches'), where('startDate', '<=', today));
  }, [firestore]);

  // Queries para abas de auditoria
  const pendingReportsRef = React.useMemo(() => 
    firestore ? query(collection(firestore, 'dailyReports'), where('status', '==', 'PENDENTE'), orderBy('createdAt', 'desc')) : null
  , [firestore]);

  const archivedReportsRef = React.useMemo(() => 
    firestore ? query(collection(firestore, 'dailyReports'), where('status', '==', 'ARQUIVADO'), orderBy('createdAt', 'desc')) : null
  , [firestore]);

  const { data: allEmployees, loading: loadingEmployees } = useCollection(employeesRef);
  const { data: shiftPeriods } = useCollection(shiftPeriodsRef);
  const { data: allLaunches } = useCollection(launchesRef);
  const { data: pendingReports } = useCollection(pendingReportsRef);
  const { data: archivedReports } = useCollection(archivedReportsRef);

  // Períodos filtrados para Escala Especial
  const specialPeriodsList = React.useMemo(() => {
    if (!shiftPeriods) return [];
    return shiftPeriods.filter(p => normalizeStr(p.escalaName).includes("ESCALA ESPECIAL"));
  }, [shiftPeriods]);

  // Afastados Hoje
  const absentTodayList = React.useMemo(() => {
    if (!allLaunches || !allEmployees || !inspetorId) return [];
    
    const selectedInspetor = allEmployees.find(e => e.id === inspetorId);
    if (!selectedInspetor) return [];

    const today = getSaoPauloDate();
    const types = ["FOLGA", "ABONO", "FERIAS", "LICENCA", "ATESTADO", "TRE DEBITO"];
    
    return allLaunches.filter(l => {
      const normType = normalizeStr(l.type || "");
      const isActive = l.startDate <= today && l.endDate >= today;
      if (!isActive || !types.some(t => normType.includes(t))) return false;

      const emp = allEmployees.find(e => e.id === l.employeeId);
      if (!emp) return false;

      const isSameShiftAndSchedule = emp.escala === selectedInspetor.escala && emp.turno === selectedInspetor.turno;
      const isOrdinario = normalizeStr(emp.escala || "") === "ORDINARIO";

      return isSameShiftAndSchedule || isOrdinario;
    }).map(l => ({
      ...l,
      unit: allEmployees.find(e => e.id === l.employeeId)?.unit || "N/A"
    })).sort((a, b) => (a.employeeName || "").localeCompare(b.employeeName || ""));
  }, [allLaunches, allEmployees, inspetorId]);

  // Listas de Controle de Ausência Real
  const trulyAbsentIds = React.useMemo(() => {
    const ids = faltaRows.map(r => r.empId).filter(Boolean);
    absentTodayList.forEach(l => ids.push(l.employeeId));
    return Array.from(new Set(ids));
  }, [faltaRows, absentTodayList]);

  const subTeamIds = React.useMemo(() => {
    const ids = [inspetorId, ...subinspetorRows.map(r => r.empId)].filter(Boolean);
    return Array.from(new Set(ids));
  }, [inspetorId, subinspetorRows]);

  const teamMemberIds = React.useMemo(() => {
    const ids: string[] = [];
    sectorBlocks.forEach(s => s.posts.forEach((p: any) => p.members.forEach((m: any) => { if (m.empId) ids.push(m.empId); })));
    return Array.from(new Set(ids));
  }, [sectorBlocks]);

  const availableChiefsForSectors = React.useMemo(() => {
    if (!allEmployees) return [];
    return allEmployees.filter(emp => subTeamIds.includes(emp.id));
  }, [allEmployees, subTeamIds]);

  // Verificações de Preenchimento
  const subTeamFilled = React.useMemo(() => subinspetorRows.some(r => !!r.empId), [subinspetorRows]);
  const absencesFilled = React.useMemo(() => faltaRows.some(r => !!r.empId), [faltaRows]);
  const especialFilled = React.useMemo(() => especialRows.some(r => !!r.empId), [especialRows]);
  const teamFilled = React.useMemo(() => sectorBlocks.some(s => s.sectorType && s.posts.some((p: any) => p.members.some((m: any) => !!m.empId))), [sectorBlocks]);
  const afastadosFilled = absentTodayList.length > 0;

  const chefiaList = React.useMemo(() => {
    if (!allEmployees) return [];
    const allowedRoles = ["INSPETOR", "SUBINSPETOR", "INSPETOR GERAL", "COMANDANTE"];
    return allEmployees.filter(emp => allowedRoles.includes(normalizeStr(emp.role || "")));
  }, [allEmployees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !currentUser) return;

    if (!inspetorId || !selectedEscalaId) {
      toast({ variant: "destructive", title: "DADOS INCOMPLETOS", description: "SELECIONE O INSPETOR E A ESCALA." });
      return;
    }

    setLoading(true);

    const reportData = {
      date: defaultDate,
      time: defaultTime,
      escalaId: selectedEscalaId,
      escalaName: shiftPeriods?.find((p: any) => p.id === selectedEscalaId)?.escalaName || "N/A",
      inspector: {
        id: inspetorId,
        name: inspetorTerm.split(' (')[0],
        qra: inspetorTerm.match(/\(([^)]+)\)/)?.[1] || inspetorTerm,
        info: inspetorInfo
      },
      subinspectors: subinspetorRows.filter(r => !!r.empId).map(r => ({
        id: r.empId,
        name: r.term.split(' (')[0],
        qra: r.term.match(/\(([^)]+)\)/)?.[1] || r.term,
        info: r.info
      })),
      absences: faltaRows.filter(r => !!r.empId).map(r => ({
        id: r.empId,
        name: r.term.split(' (')[0],
        qra: r.term.match(/\(([^)]+)\)/)?.[1] || r.term,
        info: r.info
      })),
      absentTodayList: absentTodayList,
      specialSchedule: especialRows.filter(r => !!r.empId).map(r => ({
        id: r.empId,
        name: r.term.split(' (')[0],
        qra: r.term.match(/\(([^)]+)\)/)?.[1] || r.term,
        info: r.info,
        periodId: r.periodId,
        periodName: specialPeriodsList.find((p: any) => p.id === r.periodId)?.escalaName || "N/A"
      })),
      sectors: sectorBlocks.map(s => ({
        id: s.id,
        sectorType: s.sectorType,
        chief: {
          id: s.chiefData.id,
          name: s.chiefData.term.split(' (')[0],
          qra: s.chiefData.term.match(/\(([^)]+)\)/)?.[1] || s.chiefData.term
        },
        posts: s.posts.map((p: any) => ({
          id: p.id,
          type: p.type,
          vtrNumber: p.vtrNumber,
          members: p.members.filter((m: any) => !!m.empId).map((m: any) => ({
            id: m.empId,
            qra: m.term
          }))
        }))
      })),
      observations: observations,
      status: "PENDENTE",
      createdBy: currentUser.uid,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(firestore, 'dailyReports'), reportData);
      localStorage.removeItem('nrg_relatorio_draft');
      toast({ title: "RELATÓRIO ENVIADO", description: "O registro foi salvo para auditoria." });
      
      // Resetar formulário
      setObservations("");
      setInspetorId("");
      setInspetorTerm("");
      setInspetorInfo("");
      setSubinspetorRows([{ id: generateId(), term: "", info: "", show: false, empId: "" }]);
      setFaltaRows([{ id: generateId(), term: "", info: "", show: false, empId: "" }]);
      setEspecialRows([{ id: generateId(), term: "", info: "", show: false, periodId: "", empId: "" }]);
      setSectorBlocks([{ id: generateId(), sectorType: "", chiefData: { id: "", term: "", info: "", show: false }, posts: [{ id: generateId(), type: "", vtrNumber: "", members: [{ id: generateId(), empId: "", term: "", show: false }] }] }]);
    } catch (err) {
      toast({ variant: "destructive", title: "ERRO AO SALVAR", description: "Verifique sua conexão." });
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveReport = async (reportId: string) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'dailyReports', reportId), { status: 'ARQUIVADO' });
      toast({ title: "RELATÓRIO ARQUIVADO", description: "Homologação concluída com sucesso." });
    } catch (err) {
      toast({ variant: "destructive", title: "ERRO AO ARQUIVAR" });
    }
  };

  const renderAutocomplete = (
    label: string, 
    term: string, 
    setTerm: (v: string) => void, 
    setId: (v: string) => void, 
    id: string, 
    show: boolean, 
    setShow: (v: boolean) => void,
    setInfo: (v: string) => void,
    sourceList: any[],
    excludeIds: string[] = [],
    isOptional?: boolean,
    displayType: 'full' | 'qra' = 'full'
  ) => {
    const filtered = sourceList.filter(e => 
      (normalizeStr(e.name).includes(normalizeStr(term)) || normalizeStr(e.qra).includes(normalizeStr(term))) &&
      (!excludeIds.includes(e.id) || e.id === id)
    );

    return (
      <div className="space-y-1 relative flex-1">
        <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
          <User className="h-3 w-3" /> {label}
        </Label>
        <div className="relative">
          <Input 
            placeholder={`BUSCAR...`} 
            className="h-11 uppercase font-bold text-xs bg-slate-50/50 focus:bg-white transition-colors pr-10" 
            value={term}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setTerm(val);
              setShow(true);
              if (!val) { setId(""); setInfo(""); }
            }}
            onFocus={() => setShow(true)}
            required={!isOptional}
          />
          {id && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <Check className="h-4 w-4 text-green-600" />
            </div>
          )}
        </div>

        {show && term && (
          <div className="absolute z-[100] left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {filtered.length > 0 ? (
              filtered.map(emp => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => {
                    setTerm(displayType === 'qra' ? emp.qra : `${emp.name} (${emp.qra})`);
                    setId(emp.id);
                    setInfo(`${emp.escala} / ${emp.turno}`);
                    setShow(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 flex flex-col border-b border-slate-100 last:border-0 transition-colors"
                >
                  <span className="text-[11px] font-black text-slate-900 uppercase">{emp.name}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[8px] font-bold bg-blue-50 text-blue-700 border-blue-100 uppercase">{emp.role}</Badge>
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">QRA: {emp.qra}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-4 text-[10px] text-muted-foreground italic uppercase text-center font-bold">Nenhum servidor disponível.</div>
            )}
          </div>
        )}
        {show && <div className="fixed inset-0 z-[90]" onClick={() => setShow(false)} />}
      </div>
    );
  };

  const renderReportList = (reports: any[], emptyMessage: string, showArchiveAction?: boolean) => (
    <div className="grid gap-4">
      {reports.length === 0 ? (
        <div className="text-center py-20 uppercase text-[10px] font-bold text-muted-foreground italic tracking-widest border-2 border-dashed rounded-2xl">
          {emptyMessage}
        </div>
      ) : (
        reports.map(report => (
          <Card key={report.id} className="card-shadow border-none rounded-xl overflow-hidden hover:shadow-md transition-all">
            <div className="flex flex-col sm:flex-row items-stretch">
              <div className={cn(
                "w-full sm:w-16 flex flex-col items-center justify-center p-4 shrink-0 text-white",
                report.status === 'ARQUIVADO' ? 'bg-green-600' : 'bg-blue-600'
              )}>
                <FileText className="h-6 w-6" />
              </div>
              <div className="flex-1 p-4 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Data / Turno</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{formatDateBR(report.date)} - {report.time}</p>
                  <Badge variant="secondary" className="text-[8px] uppercase font-bold mt-1">{report.escalaName}</Badge>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Inspetor Responsável</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{report.inspector?.name}</p>
                  <p className="text-[9px] font-bold text-primary uppercase">QRA: {report.inspector?.qra}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[8px] uppercase font-bold">{report.sectors?.length} Setores</Badge>
                  <Badge variant="outline" className="text-[8px] uppercase font-bold">{report.absentTodayList?.length + report.absences?.length} Ausências</Badge>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-blue-600 hover:bg-blue-50">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
                      <DialogHeader className="bg-primary p-6 text-white shrink-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm"><FileText className="h-6 w-6" /></div>
                            <div>
                              <DialogTitle className="text-xl font-black uppercase tracking-tight leading-none">Detalhamento do Relatório</DialogTitle>
                              <p className="text-[10px] font-bold uppercase opacity-80 tracking-widest mt-1">Ref: {formatDateBR(report.date)} • {report.escalaName}</p>
                            </div>
                          </div>
                          {showArchiveAction && (
                            <Button onClick={() => handleArchiveReport(report.id)} size="sm" className="bg-green-500 hover:bg-green-600 text-white font-black uppercase text-[10px] h-9 gap-2 shadow-lg shadow-green-900/20">
                              <CheckCircle2 className="h-4 w-4" /> Homologar
                            </Button>
                          )}
                        </div>
                      </DialogHeader>
                      <ScrollArea className="max-h-[70vh]">
                        <div className="p-6 space-y-8 pb-12">
                          {/* Resumo Chefia */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Inspetor / Responsável</Label>
                              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-sm font-black uppercase">{report.inspector?.name} ({report.inspector?.qra})</p>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">{report.inspector?.info}</p>
                              </div>
                            </div>
                            {report.subinspectors?.length > 0 && (
                              <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Subinspetores</Label>
                                <div className="space-y-2">
                                  {report.subinspectors.map((sub: any, idx: number) => (
                                    <div key={idx} className="p-2 bg-slate-50/50 rounded-lg border border-slate-100 flex justify-between items-center">
                                      <span className="text-[11px] font-black uppercase">{sub.name} ({sub.qra})</span>
                                      <Badge variant="outline" className="text-[8px] font-bold">{sub.info}</Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Equipe do Dia Hierárquico */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 border-b pb-2">
                              <Users className="h-4 w-4 text-blue-600" />
                              <h4 className="text-xs font-black uppercase text-slate-900 tracking-widest">Equipe do Dia</h4>
                            </div>
                            <div className="space-y-6">
                              {report.sectors?.map((sector: any, sIdx: number) => (
                                <div key={sIdx} className="space-y-3 bg-slate-50/30 p-4 rounded-2xl border border-slate-100">
                                  <div className="flex items-center justify-between">
                                    <Badge className="bg-blue-600 text-white font-black uppercase text-[10px] px-3">{sector.sectorType}</Badge>
                                    <span className="text-[10px] font-black uppercase text-slate-600">Chefe: {sector.chief?.name} ({sector.chief?.qra})</span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {sector.posts?.map((post: any, pIdx: number) => (
                                      <div key={pIdx} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm space-y-2">
                                        <div className="flex items-center justify-between border-b pb-1">
                                          <span className="text-[9px] font-black uppercase text-slate-500">{post.type} {post.vtrNumber ? `• VTR ${post.vtrNumber}` : ""}</span>
                                          <Badge variant="outline" className="text-[8px] font-bold">{post.members?.length} Membros</Badge>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                          {post.members?.map((m: any, mIdx: number) => (
                                            <Badge key={mIdx} variant="secondary" className="text-[9px] font-bold bg-slate-100 text-slate-700 uppercase">{m.qra}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Faltas e Especial */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 border-b pb-2">
                                <UserX className="h-4 w-4 text-red-600" />
                                <h4 className="text-xs font-black uppercase text-slate-900 tracking-widest">Ausências do Turno</h4>
                              </div>
                              <div className="space-y-2">
                                {[...(report.absences || []), ...(report.absentTodayList || [])].map((aus: any, idx: number) => (
                                  <div key={idx} className="p-2 bg-red-50/30 rounded-lg border border-red-100 flex justify-between items-center">
                                    <div className="flex flex-col">
                                      <span className="text-[11px] font-black uppercase text-red-900">{aus.employeeQra || aus.qra} - {aus.employeeName || aus.name}</span>
                                      <span className="text-[8px] font-bold text-red-600 uppercase">{aus.type || "FALTA NÃO JUSTIFICADA"}</span>
                                    </div>
                                    <Badge variant="outline" className="text-[8px] border-red-200 text-red-700 font-bold uppercase">{aus.escala || aus.info}</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 border-b pb-2">
                                <Star className="h-4 w-4 text-amber-600" />
                                <h4 className="text-xs font-black uppercase text-slate-900 tracking-widest">Escala Especial</h4>
                              </div>
                              <div className="space-y-2">
                                {report.specialSchedule?.map((esp: any, idx: number) => (
                                  <div key={idx} className="p-2 bg-amber-50/30 rounded-lg border border-amber-100 flex justify-between items-center">
                                    <div className="flex flex-col">
                                      <span className="text-[11px] font-black uppercase text-amber-900">{esp.name} ({esp.qra})</span>
                                      <span className="text-[8px] font-bold text-amber-600 uppercase">{esp.periodName}</span>
                                    </div>
                                    <Badge variant="outline" className="text-[8px] border-amber-200 text-amber-700 font-bold uppercase">{esp.info}</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Observações */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 border-b pb-2">
                              <MessageSquare className="h-4 w-4 text-slate-600" />
                              <h4 className="text-xs font-black uppercase text-slate-900 tracking-widest">Relato de Ocorrências</h4>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-[11px] text-slate-700 uppercase leading-relaxed whitespace-pre-wrap">
                              {report.observations || "NENHUMA OCORRÊNCIA REGISTRADA."}
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                  {showArchiveAction && (
                    <Button onClick={() => handleArchiveReport(report.id)} variant="ghost" size="sm" className="h-9 w-9 p-0 text-green-600 hover:bg-green-50">
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <AlertDialog open={isDraftDialogOpen} onOpenChange={setIsDraftDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="bg-amber-50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <History className="h-6 w-6 text-amber-600" />
            </div>
            <AlertDialogTitle className="uppercase text-xl font-black">Rascunho Identificado</AlertDialogTitle>
            <AlertDialogDescription className="uppercase text-[10px] font-bold text-muted-foreground leading-relaxed">
              EXISTE UM RELATÓRIO SALVO NO NAVEGADOR. DESEJA CARREGAR OU INICIAR UM NOVO?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2">
            <AlertDialogCancel onClick={handleDiscardDraft} className="h-12 uppercase font-black text-xs tracking-widest border-red-100 text-red-600 hover:bg-red-50">DESCARTAR</AlertDialogCancel>
            <AlertDialogAction onClick={handleLoadDraft} className="h-12 uppercase font-black text-xs tracking-widest bg-amber-600 hover:bg-amber-700 shadow-xl shadow-amber-100">CARREGAR RASCUNHO</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2 rounded-xl"><FileText className="h-6 w-6 text-blue-600" /></div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase text-primary">AUDITORIA DE TURNOS</h2>
            <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">GESTÃO DE RELATÓRIOS E REGISTROS OPERACIONAIS.</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="new" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px] h-12 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="new" className="rounded-lg uppercase text-[10px] font-bold flex items-center gap-2">
            <Plus className="h-3.5 w-3.5" /> NOVO RELATÓRIO
          </TabsTrigger>
          <TabsTrigger value="sent" className="rounded-lg uppercase text-[10px] font-bold flex items-center gap-2">
            <ClipboardList className="h-3.5 w-3.5" /> 
            ENVIADOS
            {pendingReports && pendingReports.length > 0 && (
              <Badge className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center bg-primary text-primary-foreground text-[8px] rounded-full">
                {pendingReports.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived" className="rounded-lg uppercase text-[10px] font-bold flex items-center gap-2">
            <Archive className="h-3.5 w-3.5" /> ARQUIVO
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-6">
          <Card className="card-shadow border-none rounded-2xl overflow-hidden">
            <form onSubmit={handleSubmit}>
              <CardHeader className="bg-primary/5 border-b p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-black uppercase text-slate-900 tracking-tight">RELATÓRIO OPERACIONAL</CardTitle>
                    <CardDescription className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Preenchimento obrigatório para registro de atividade.</CardDescription>
                  </div>
                  <div className="bg-white/50 px-4 py-2 rounded-xl border border-primary/10 flex items-center gap-3 shrink-0">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">Área de Chefia</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2"><Calendar className="h-3 w-3" /> Data</Label>
                    <input type="date" value={defaultDate} onChange={(e) => setDefaultDate(e.target.value)} className="h-11 font-bold text-xs bg-slate-50/50 focus:bg-white transition-colors border rounded-md px-3 outline-none w-full" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2"><Clock className="h-3 w-3" /> Horário</Label>
                    <input type="time" value={defaultTime} onChange={(e) => setDefaultTime(e.target.value)} className="h-11 font-bold text-xs bg-slate-50/50 focus:bg-white transition-colors border rounded-md px-3 outline-none w-full" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2"><Briefcase className="h-3 w-3" /> Escala de Serviço</Label>
                    <Select value={selectedEscalaId} onValueChange={setSelectedEscalaId} required>
                      <SelectTrigger className="h-11 uppercase text-xs font-bold bg-slate-50/50"><SelectValue placeholder="SELECIONE..." /></SelectTrigger>
                      <SelectContent>
                        {shiftPeriods?.map((p: any) => (
                          <SelectItem key={p.id} value={p.id} className="uppercase text-xs font-bold">{p.escalaName} ({p.startTime} ÀS {p.endTime})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderAutocomplete("Inspetor / Responsável", inspetorTerm, setInspetorTerm, setInspetorId, inspetorId, showInspetorSuggestions, setShowInspetorSuggestions, setInspetorInfo, chefiaList, [...trulyAbsentIds, ...subTeamIds.filter(id => id !== inspetorId)])}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">Escala e Turno (Inspetor)</Label>
                    <Input value={inspetorInfo} readOnly placeholder="--" className="h-11 uppercase font-bold text-xs bg-muted/30 border-dashed cursor-not-allowed text-primary" />
                  </div>
                </div>

                <Collapsible open={isSubTeamOpen} onOpenChange={setIsSubTeamOpen} className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <CollapsibleTrigger asChild>
                        <button type="button" className={cn("p-2 rounded-xl transition-colors border shadow-sm", subTeamFilled ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-red-50 text-red-500 border-red-100")}><User className="h-5 w-5" /></button>
                      </CollapsibleTrigger>
                      <div className="flex flex-col">
                        <h4 className="text-sm font-black uppercase text-slate-700 tracking-widest leading-none">Equipe de Subinspetoria</h4>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase mt-1 tracking-tighter">{subTeamFilled ? "SESSÃO PREENCHIDA" : "AGUARDANDO DADOS"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={addSubinspetorRow} className="h-8 text-[10px] font-black uppercase gap-1.5 rounded-xl border-primary/20 text-primary hover:bg-primary/5"><Plus className="h-3.5 w-3.5" /> ADICIONAR</Button>
                      <CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">{isSubTeamOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button></CollapsibleTrigger>
                    </div>
                  </div>
                  <CollapsibleContent className="space-y-4">
                    {subinspetorRows.map((row, index) => (
                      <div key={row.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end animate-in fade-in slide-in-from-top-2 duration-300">
                        {renderAutocomplete("Subinspetor", row.term, (v) => updateSubinspetorRow(index, { term: v }), (v) => updateSubinspetorRow(index, { empId: v }), row.empId, row.show, (v) => updateSubinspetorRow(index, { show: v }), (v) => updateSubinspetorRow(index, { info: v }), chefiaList, [...trulyAbsentIds, ...subTeamIds.filter(id => id !== row.empId)])}
                        <div className="w-full space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">Escala e Turno (Subinspetor)</Label>
                          <Input value={row.info} readOnly placeholder="--" className="h-11 uppercase font-bold text-xs bg-muted/30 border-dashed cursor-not-allowed text-primary" />
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeSubinspetorRow(index)} className="h-11 w-11 text-destructive hover:bg-red-50 rounded-xl"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={isAbsencesOpen} onOpenChange={setIsAbsencesOpen} className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <CollapsibleTrigger asChild>
                        <button type="button" className={cn("p-2 rounded-xl transition-colors border shadow-sm", absencesFilled ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-red-50 text-red-500 border-red-100")}><UserX className="h-5 w-5" /></button>
                      </CollapsibleTrigger>
                      <div className="flex flex-col">
                        <h4 className="text-sm font-black uppercase text-slate-700 tracking-widest leading-none">Faltas</h4>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase mt-1 tracking-tighter">{absencesFilled ? "SESSÃO PREENCHIDA" : "NENHUMA FALTA"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={addFaltaRow} className="h-8 text-[10px] font-black uppercase gap-1.5 rounded-xl border-red-200 text-red-600 hover:bg-red-50"><Plus className="h-3.5 w-3.5" /> ADICIONAR</Button>
                      <CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">{isAbsencesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button></CollapsibleTrigger>
                    </div>
                  </div>
                  <CollapsibleContent className="space-y-4">
                    {faltaRows.map((row, index) => (
                      <div key={row.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end animate-in fade-in slide-in-from-top-2 duration-300">
                        {renderAutocomplete("Servidor (Falta)", row.term, (v) => updateFaltaRow(index, { term: v }), (v) => updateFaltaRow(index, { empId: v }), row.empId, row.show, (v) => updateFaltaRow(index, { show: v }), (v) => updateFaltaRow(index, { info: v }), allEmployees || [], [...trulyAbsentIds.filter(id => id !== row.empId), ...subTeamIds, ...teamMemberIds])}
                        <div className="w-full space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">Escala e Turno (Servidor)</Label>
                          <Input value={row.info} readOnly placeholder="--" className="h-11 uppercase font-bold text-xs bg-muted/30 border-dashed cursor-not-allowed text-primary" />
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeFaltaRow(index)} className="h-11 w-11 text-destructive hover:bg-red-50 rounded-xl"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={isAfastadosOpen} onOpenChange={setIsAfastadosOpen} className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <CollapsibleTrigger asChild>
                        <button type="button" className={cn("p-2 rounded-xl transition-colors border shadow-sm", afastadosFilled ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-red-50 text-red-500 border-red-100")}><History className="h-5 w-5" /></button>
                      </CollapsibleTrigger>
                      <div className="flex flex-col">
                        <h4 className="text-sm font-black uppercase text-slate-700 tracking-widest leading-none">Afastamentos / Folgas (Hoje)</h4>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase mt-1 tracking-tighter">{afastadosFilled ? "REGISTROS ENCONTRADOS" : "NENHUM REGISTRO"}</span>
                      </div>
                    </div>
                    <CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">{isAfastadosOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button></CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="space-y-4">
                    <div className="overflow-x-auto border rounded-xl bg-white shadow-sm overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow>
                            <TableHead className="font-bold uppercase text-[9px]">QRA / NOME</TableHead>
                            <TableHead className="font-bold uppercase text-[9px]">ESCALA / TURNO</TableHead>
                            <TableHead className="font-bold uppercase text-[9px]">SETOR</TableHead>
                            <TableHead className="font-bold uppercase text-[9px]">TIPO</TableHead>
                            <TableHead className="font-bold uppercase text-[9px] text-center">DATA FIM</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {absentTodayList.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-12 uppercase text-[10px] font-bold text-muted-foreground italic tracking-widest">Nenhum registro para hoje.</TableCell></TableRow>
                          ) : (
                            absentTodayList.map((item) => (
                              <TableRow key={item.id} className="hover:bg-slate-50/50">
                                <TableCell className="py-3"><div className="flex flex-col"><span className="font-black uppercase text-[12px] text-slate-900 leading-tight">{item.employeeQra}</span><span className="text-[10px] uppercase text-muted-foreground font-medium">{item.employeeName}</span></div></TableCell>
                                <TableCell className="text-[11px] font-bold uppercase text-slate-700">{item.escala} / {item.turno}</TableCell>
                                <TableCell><Badge variant="secondary" className="text-[9px] uppercase font-bold bg-slate-100 text-slate-600 px-2 py-0">{item.unit}</Badge></TableCell>
                                <TableCell><Badge className={cn("text-[9px] uppercase font-black border-none px-3 h-6", normalizeStr(item.type).includes("FERIAS") ? "bg-blue-600 text-white" : normalizeStr(item.type).includes("LICENCA") ? "bg-purple-600 text-white" : normalizeStr(item.type).includes("ATESTADO") ? "bg-red-600 text-white" : "bg-orange-500 text-white")}>{item.type}</Badge></TableCell>
                                <TableCell className="text-center"><div className="flex items-center justify-center gap-1.5"><Calendar className="h-3 w-3 text-muted-foreground" /><span className="text-[11px] font-black font-mono text-slate-900">{formatDateBR(item.endDate)}</span></div></TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={isEspecialOpen} onOpenChange={setIsEspecialOpen} className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <CollapsibleTrigger asChild>
                        <button type="button" className={cn("p-2 rounded-xl transition-colors border shadow-sm", especialFilled ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-red-50 text-red-500 border-red-100")}><Star className="h-5 w-5" /></button>
                      </CollapsibleTrigger>
                      <div className="flex flex-col">
                        <h4 className="text-sm font-black uppercase text-slate-700 tracking-widest leading-none">Escala Especial</h4>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase mt-1 tracking-tighter">{especialFilled ? "SESSÃO PREENCHIDA" : "NENHUM SERVIDOR"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={addEspecialRow} className="h-8 text-[10px] font-black uppercase gap-1.5 rounded-xl border-primary/20 text-primary hover:bg-primary/5"><Plus className="h-3.5 w-3.5" /> ADICIONAR</Button>
                      <CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">{isEspecialOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button></CollapsibleTrigger>
                    </div>
                  </div>
                  <CollapsibleContent className="space-y-6">
                    {especialRows.map((row, index) => (
                      <div key={row.id} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-4 items-end animate-in fade-in slide-in-from-top-2 duration-300 bg-slate-50/30 p-4 rounded-xl border border-dashed border-slate-200">
                        {renderAutocomplete(
                          "Servidor", 
                          row.term, 
                          (v) => updateEspecialRow(index, { term: v }), 
                          (v) => updateEspecialRow(index, { empId: v }), 
                          row.empId, 
                          row.show, 
                          (v) => updateEspecialRow(index, { show: v }), 
                          (v) => updateEspecialRow(index, { info: v }), 
                          allEmployees || [], 
                          [...trulyAbsentIds, ...especialRows.map(r => r.empId).filter(id => id !== row.empId)]
                        )}
                        <div className="w-full space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Escala e Turno</Label><Input value={row.info} readOnly placeholder="--" className="h-11 uppercase font-bold text-xs bg-white border-dashed cursor-not-allowed" /></div>
                        <div className="w-full space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2"><Timer className="h-3 w-3" /> Horário Especial</Label>
                          <Select value={row.periodId} onValueChange={(v) => updateEspecialRow(index, { periodId: v })}><SelectTrigger className="h-11 uppercase text-[9px] font-bold bg-white"><SelectValue placeholder="SELECIONE..." /></SelectTrigger>
                            <SelectContent>{specialPeriodsList.map((p: any) => (<SelectItem key={p.id} value={p.id} className="uppercase text-[9px] font-bold">{p.escalaName} ({p.startTime} ÀS {p.endTime})</SelectItem>))}</SelectContent>
                          </Select>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeEspecialRow(index)} className="h-11 w-11 text-destructive hover:bg-red-50 rounded-xl"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={isTeamOpen} onOpenChange={setIsTeamOpen} className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <CollapsibleTrigger asChild>
                        <button type="button" className={cn("p-2 rounded-xl transition-colors border shadow-sm", teamFilled ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-red-50 text-red-500 border-red-100")}><Users className="h-5 w-5" /></button>
                      </CollapsibleTrigger>
                      <div className="flex flex-col">
                        <h4 className="text-sm font-black uppercase text-slate-700 tracking-widest leading-none">Equipe do Dia</h4>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase mt-1 tracking-tighter">{teamFilled ? "SESSÃO PREENCHIDA" : "AGUARDANDO DADOS"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={addSectorBlock} className="h-8 text-[10px] font-black uppercase gap-1.5 rounded-xl border-primary/20 text-primary hover:bg-primary/5"><Plus className="h-3.5 w-3.5" /> ADICIONAR BLOCO</Button>
                      <CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">{isTeamOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button></CollapsibleTrigger>
                    </div>
                  </div>
                  <CollapsibleContent className="space-y-6">
                    {sectorBlocks.map((sector, sIdx) => (
                      <div key={sector.id} className="relative p-3 rounded-xl border-2 border-slate-100 bg-slate-50/20 space-y-4 animate-in zoom-in-95 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 bg-white p-3 rounded-xl border border-dashed items-end">
                          <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Setor</Label>
                            <Select value={sector.sectorType} onValueChange={(v) => updateSectorBlock(sIdx, { sectorType: v })}><SelectTrigger className="h-11 uppercase text-xs font-bold bg-slate-50/50"><SelectValue placeholder="SELECIONE..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SETOR 1" className="uppercase text-xs font-bold">SETOR 1</SelectItem>
                                <SelectItem value="SETOR 2" className="uppercase text-xs font-bold">SETOR 2</SelectItem>
                                <SelectItem value="SETOR 3" className="uppercase text-xs font-bold">SETOR 3</SelectItem>
                                <SelectItem value="COVV" className="uppercase text-xs font-bold">COVV</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-full">
                            {renderAutocomplete("Chefia Responsável", sector.chiefData.term, (v) => updateSectorChiefData(sIdx, { term: v }), (v) => updateSectorChiefData(sIdx, { id: v }), sector.chiefData.id, sector.chiefData.show, (v) => updateSectorChiefData(sIdx, { show: v }), (v) => updateSectorChiefData(sIdx, { info: v }), availableChiefsForSectors, sectorBlocks.filter((_, i) => i !== sIdx).map(s => s.chiefData.id).filter(Boolean))}
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeSectorBlock(sIdx)} className="h-11 w-11 text-destructive hover:bg-red-50 rounded-xl"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                        <div className="space-y-2">
                          {sector.posts.map((post: any, pIdx: number) => {
                            const isVTR = post.type === "VTR";
                            return (
                              <div key={post.id} className="space-y-2 bg-white/50 p-3 rounded-xl border border-slate-100 shadow-sm">
                                <div className="flex flex-col md:flex-row items-stretch md:items-end gap-4">
                                  <div className="flex-1 space-y-1.5"><Label className="text-[9px] font-bold uppercase text-muted-foreground">Posto / Serviço</Label>
                                    <Select value={post.type} onValueChange={(v) => { const newPosts = [...sector.posts]; newPosts[pIdx].type = v; if (v === "VTR" && newPosts[pIdx].members.length > 4) newPosts[pIdx].members = newPosts[pIdx].members.slice(0, 4); updateSectorBlock(sIdx, { posts: newPosts }); }}><SelectTrigger className="h-10 uppercase text-xs font-bold bg-slate-50/50"><SelectValue placeholder="SELECIONE..." /></SelectTrigger>
                                      <SelectContent><SelectItem value="CENTRAL" className="uppercase text-xs font-bold">CENTRAL</SelectItem><SelectItem value="SENTINELA" className="uppercase text-xs font-bold">SENTINELA</SelectItem><SelectItem value="VIDEOMONITORAMENTO" className="uppercase text-xs font-bold">VIDEOMONITORAMENTO</SelectItem><SelectItem value="VTR" className="uppercase text-xs font-bold">VTR</SelectItem></SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => addMemberToPost(sIdx, pIdx)} className="h-10 text-[9px] font-black uppercase border-dashed border-primary/30 text-primary hover:bg-primary/5"><Plus className="h-3.5 w-3.5 mr-1" /> SERVIDOR ({post.members.length}/{isVTR ? 4 : 15})</Button>
                                    {sector.posts.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removePostFromSector(sIdx, pIdx)} className="h-10 w-10 text-destructive hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>}
                                  </div>
                                </div>
                                <div className={cn("grid gap-2 pt-1", isVTR ? "grid-cols-1 md:grid-cols-5" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
                                  {isVTR && (
                                    <div className="space-y-1.5 animate-in zoom-in-95 duration-300">
                                      <Label className="text-[9px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-1.5"><Car className="h-3 w-3" /> VTR nº</Label>
                                      <Input placeholder="001" className="h-11 uppercase font-bold text-xs bg-blue-50/30 border-blue-100 focus:bg-white" value={post.vtrNumber || ""} onChange={(e) => { const newPosts = [...sector.posts]; newPosts[pIdx].vtrNumber = e.target.value.toUpperCase(); updateSectorBlock(sIdx, { posts: newPosts }); }} />
                                    </div>
                                  )}
                                  {post.members.map((member: any, mIdx: number) => (
                                    <div key={member.id} className={cn("flex flex-col gap-2 p-2 rounded-lg border border-slate-100 bg-white/80 shadow-sm animate-in fade-in slide-in-from-left-2 duration-200", isVTR && "border-blue-100")}>
                                      <div className="flex gap-2 items-end">
                                        <div className="flex-1">
                                          {renderAutocomplete(`Servidor ${mIdx + 1}`, member.term, (v) => updateMemberInPost(sIdx, pIdx, mIdx, { term: v }), (v) => updateMemberInPost(sIdx, pIdx, mIdx, { empId: v }), member.empId, member.show, (v) => updateMemberInPost(sIdx, pIdx, mIdx, { show: v }), () => {}, allEmployees || [], [...trulyAbsentIds, ...teamMemberIds.filter(id => id !== member.empId)], false, 'qra')}
                                        </div>
                                        {post.members.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removeMemberFromPost(sIdx, pIdx, mIdx)} className="h-11 w-11 text-destructive/50 hover:text-destructive rounded-xl"><Trash2 className="h-3.5 w-3.5" /></Button>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                          <div className="flex justify-start">
                            <Button type="button" variant="ghost" size="sm" onClick={() => addPostToSector(sIdx)} className="h-6 text-[9px] font-black uppercase text-primary gap-1.5 hover:bg-primary/5"><Plus className="h-3.5 w-3.5" /> ADICIONAR POSTO</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {sectorBlocks.length === 0 && (
                      <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-slate-50/50">
                        <p className="uppercase text-[10px] font-black text-muted-foreground tracking-widest">Nenhuma equipe configurada.</p>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-50 p-2 rounded-xl border border-amber-100 shadow-sm"><MessageSquare className="h-5 w-5 text-amber-600" /></div>
                    <div className="flex flex-col"><h4 className="text-sm font-black uppercase text-slate-700 tracking-widest leading-none">Observações do Turno</h4><span className="text-[9px] font-bold text-muted-foreground uppercase mt-1 tracking-tighter">RELATO DE OCORRÊNCIAS.</span></div>
                  </div>
                  <Textarea placeholder="DESCREVA AS OCORRÊNCIAS DO TURNO..." className="min-h-[150px] uppercase text-xs p-4 rounded-xl bg-slate-50/30 border-slate-200 focus:bg-white transition-all resize-none leading-relaxed" value={observations} onChange={(e) => setObservations(e.target.value.toUpperCase())} />
                </div>
              </CardContent>

              <CardFooter className="bg-slate-50 border-t p-6 flex flex-col sm:flex-row gap-4">
                <Button type="button" variant="outline" onClick={handleSaveDraft} className="w-full sm:w-auto h-14 uppercase font-black text-xs tracking-widest border-primary/20 text-primary hover:bg-primary/5"><Save className="h-5 w-5 mr-2" /> Salvar Rascunho</Button>
                <Button type="submit" disabled={loading || loadingEmployees} className="flex-1 h-14 uppercase font-black text-xs tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-blue-200 transition-all active:scale-95">{loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="h-5 w-5 mr-2" />} Enviar Relatório</Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="sent" className="mt-6">
          {renderReportList(pendingReports || [], "Nenhum relatório aguardando auditoria no momento.", true)}
        </TabsContent>

        <TabsContent value="archived" className="mt-6">
          {renderReportList(archivedReports || [], "Arquivo histórico vazio.")}
        </TabsContent>
      </Tabs>
    </div>
  )
}
