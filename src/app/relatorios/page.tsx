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
  Info,
  Star,
  Timer,
  Users,
  Car
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from '@/firebase'
import { collection, query, orderBy } from 'firebase/firestore'
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

  React.useEffect(() => {
    setDefaultDate(getSaoPauloDate());
    setDefaultTime(getSaoPauloTime());
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
      chiefData: { id: "", uid: "", term: "", info: "", show: false },
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

  // FUNÇÕES DE MANIPULAÇÃO DA EQUIPE
  const addSectorBlock = () => {
    setSectorBlocks([...sectorBlocks, {
      id: generateId(),
      sectorType: "",
      chiefData: { id: "", uid: "", term: "", info: "", show: false },
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
      toast({ 
        variant: "destructive", 
        title: "LIMITE ATINGIDO", 
        description: `MÁXIMO DE ${limit} SERVIDORES PARA ESTE POSTO (${post.type}).` 
      });
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
      newBlocks[sectorIndex].posts[postIndex].members[memberIndex] = {
        ...newBlocks[sectorIndex].posts[postIndex].members[memberIndex],
        ...updates
      };
      return newBlocks;
    });
  };

  // Busca coleções
  const employeesRef = React.useMemo(() => firestore ? query(collection(firestore, 'employees'), orderBy('name', 'asc')) : null, [firestore]);
  const shiftPeriodsRef = React.useMemo(() => firestore ? query(collection(firestore, 'shiftPeriods'), orderBy('escalaName', 'asc')) : null, [firestore]);
  const launchesRef = React.useMemo(() => firestore ? collection(firestore, 'launches') : null, [firestore]);

  const { data: allEmployees, loading: loadingEmployees } = useCollection(employeesRef);
  const { data: shiftPeriods } = useCollection(shiftPeriodsRef);
  const { data: allLaunches } = useCollection(launchesRef);

  // Períodos filtrados para Escala Especial
  const specialPeriodsList = React.useMemo(() => {
    if (!shiftPeriods) return [];
    return shiftPeriods.filter(p => normalizeStr(p.escalaName).includes("ESCALA ESPECIAL"));
  }, [shiftPeriods]);

  // Lista de Chefias Disponíveis para Setores (Baseado na Equipe de Subinspetoria Selecionada)
  const availableChiefsForSectors = React.useMemo(() => {
    if (!allEmployees) return [];
    const subIdList = subinspetorRows.map(r => r.empId).filter(Boolean);
    const validChiefIds = [inspetorId, ...subIdList];
    return allEmployees.filter(emp => validChiefIds.includes(emp.id));
  }, [allEmployees, subinspetorRows, inspetorId]);

  // Lista de Afastados Hoje (Automatizada e Filtrada por Inspetor)
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
    }).map(l => {
      const emp = allEmployees.find(e => e.id === l.employeeId);
      return {
        ...l,
        unit: emp?.unit || "N/A"
      };
    }).sort((a, b) => (a.employeeName || "").localeCompare(b.employeeName || ""));
  }, [allLaunches, allEmployees, inspetorId]);

  // IDs selecionados para exclusão global (Impede duplicidade de nomes)
  const allSelectedIds = React.useMemo(() => {
    const ids = [inspetorId];
    subinspetorRows.forEach(r => r.empId && ids.push(r.empId));
    faltaRows.forEach(r => r.empId && ids.push(r.empId));
    especialRows.forEach(r => r.empId && ids.push(r.empId));
    
    sectorBlocks.forEach(s => {
      // Chief ID não entra na exclusão de membros operacionais necessariamente,
      // mas monitoramos para evitar duplicidade de comando.
      if (s.chiefData.id) ids.push(s.chiefData.id);
      s.posts.forEach((p: any) => {
        p.members.forEach((m: any) => {
          if (m.empId) ids.push(m.empId);
        });
      });
    });
    
    return ids.filter(Boolean);
  }, [inspetorId, subinspetorRows, faltaRows, especialRows, sectorBlocks]);

  // Verificação de preenchimento
  const subTeamFilled = React.useMemo(() => subinspetorRows.some(r => !!r.empId), [subinspetorRows]);
  const absencesFilled = React.useMemo(() => faltaRows.some(r => !!r.empId), [faltaRows]);
  const especialFilled = React.useMemo(() => especialRows.some(r => !!r.empId), [especialRows]);
  const teamFilled = React.useMemo(() => sectorBlocks.some(s => s.sectorType && s.posts.some((p: any) => p.members.some((m: any) => !!m.empId))), [sectorBlocks]);
  const afastadosFilled = absentTodayList.length > 0;

  // Filtra chefia geral (usado apenas na Subinspetoria)
  const chefiaList = React.useMemo(() => {
    if (!allEmployees) return [];
    const allowedRoles = ["INSPETOR", "SUBINSPETOR", "INSPETOR GERAL", "COMANDANTE"];
    return allEmployees.filter(emp => {
      const role = normalizeStr(emp.role || "");
      return allowedRoles.some(allowed => role === allowed);
    });
  }, [allEmployees]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inspetorId || !selectedEscalaId) {
      toast({ variant: "destructive", title: "DADOS INCOMPLETOS", description: "POR FAVOR, SELECIONE O INSPETOR E A ESCALA." })
      return
    }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      toast({ title: "RELATÓRIO ENVIADO", description: "AS INFORMAÇÕES FORAM REGISTRADAS COM SUCESSO." })
    }, 1000)
  }

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
      (normalizeStr(e.name).includes(normalizeStr(term)) || 
      normalizeStr(e.qra).includes(normalizeStr(term))) &&
      (!excludeIds.includes(e.id) || e.id === id)
    );

    return (
      <div className="space-y-1.5 relative flex-1">
        <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
          <User className="h-3 w-3" /> {label}
        </Label>
        <div className="relative">
          <Input 
            placeholder={`BUSCAR ${label.toUpperCase()}...`} 
            className="h-11 uppercase font-bold text-xs bg-slate-50/50 focus:bg-white transition-colors pr-10" 
            value={term}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setTerm(val);
              setShow(true);
              if (!val) {
                setId("");
                setInfo("");
              }
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
              <div className="px-4 py-4 text-[10px] text-muted-foreground italic uppercase text-center font-bold">
                Servidor indisponível ou não encontrado.
              </div>
            )}
          </div>
        )}
        {show && <div className="fixed inset-0 z-[90]" onClick={() => setShow(false)} />}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2 rounded-xl">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase text-primary">RELATÓRIO SUBINSPETORIA</h2>
            <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">NÚCLEO DE REGISTRO E GESTÃO - NRG GMVV</p>
          </div>
        </div>
      </div>

      <Card className="card-shadow border-none rounded-2xl overflow-hidden">
        <form onSubmit={handleSubmit}>
          <CardHeader className="bg-primary/5 border-b p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-black uppercase text-slate-900 tracking-tight">RELATÓRIO SUBINSPETORIA - NRG GMVV</CardTitle>
                <CardDescription className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Preenchimento obrigatório para registro de atividade de turno.</CardDescription>
              </div>
              <div className="bg-white/50 px-4 py-2 rounded-xl border border-primary/10 flex items-center gap-3 shrink-0">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Área de Chefia</span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 space-y-10">
            {/* LINHA 1: DATA, HORÁRIO, ESCALA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                  <Calendar className="h-3 w-3" /> Data
                </Label>
                <input 
                  type="date" 
                  value={defaultDate}
                  onChange={(e) => setDefaultDate(e.target.value)}
                  className="h-11 font-bold text-xs bg-slate-50/50 focus:bg-white transition-colors border rounded-md px-3 outline-none" 
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                  <Clock className="h-3 w-3" /> Horário
                </Label>
                <input 
                  type="time" 
                  value={defaultTime}
                  onChange={(e) => setDefaultTime(e.target.value)}
                  className="h-11 font-bold text-xs bg-slate-50/50 focus:bg-white transition-colors border rounded-md px-3 outline-none" 
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                  <Briefcase className="h-3 w-3" /> Escala de Serviço
                </Label>
                <Select value={selectedEscalaId} onValueChange={setSelectedEscalaId} required>
                  <SelectTrigger className="h-11 uppercase text-xs font-bold bg-slate-50/50">
                    <SelectValue placeholder="SELECIONE A ESCALA..." />
                  </SelectTrigger>
                  <SelectContent>
                    {shiftPeriods?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id} className="uppercase text-xs font-bold">
                        {p.escalaName} ({p.startTime} ÀS {p.endTime})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* LINHA 2: INSPETOR (FIXO) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderAutocomplete(
                "Inspetor / Responsável", 
                inspetorTerm, 
                setInspetorTerm, 
                setInspetorId, 
                inspetorId, 
                showInspetorSuggestions, 
                setShowInspetorSuggestions,
                setInspetorInfo,
                chefiaList,
                allSelectedIds.filter(id => id !== inspetorId)
              )}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                  Escala e Turno (Inspetor)
                </Label>
                <Input 
                  value={inspetorInfo}
                  readOnly 
                  placeholder="--"
                  className="h-11 uppercase font-bold text-xs bg-muted/30 border-dashed cursor-not-allowed text-primary" 
                />
              </div>
            </div>

            {/* SEÇÃO SUBINSPETORES DINÂMICOS */}
            <Collapsible open={isSubTeamOpen} onOpenChange={setIsSubTeamOpen} className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <CollapsibleTrigger asChild>
                    <button type="button" className={cn(
                      "p-2 rounded-xl transition-colors border shadow-sm",
                      subTeamFilled ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-red-50 text-red-500 border-red-100"
                    )}>
                      <User className="h-5 w-5" />
                    </button>
                  </CollapsibleTrigger>
                  <div className="flex flex-col">
                    <h4 className="text-sm font-black uppercase text-slate-700 tracking-widest leading-none">Equipe de Subinspetoria</h4>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase mt-1 tracking-tighter">{subTeamFilled ? "SESSÃO PREENCHIDA" : "AGUARDANDO DADOS"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addSubinspetorRow}
                    className="h-8 text-[10px] font-black uppercase gap-1.5 rounded-xl border-primary/20 text-primary hover:bg-primary/5"
                  >
                    <Plus className="h-3.5 w-3.5" /> ADICIONAR SUBINSPETOR
                  </Button>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      {isSubTeamOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
              
              <CollapsibleContent className="space-y-4">
                {subinspetorRows.map((row, index) => (
                  <div key={row.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="w-full">
                      {renderAutocomplete(
                        "Subinspetor", 
                        row.term, 
                        (v) => updateSubinspetorRow(index, { term: v }), 
                        (v) => updateSubinspetorRow(index, { empId: v }), 
                        row.empId, 
                        row.show, 
                        (v) => updateSubinspetorRow(index, { show: v }),
                        (v) => updateSubinspetorRow(index, { info: v }),
                        chefiaList,
                        allSelectedIds.filter(id => id !== row.empId)
                      )}
                    </div>
                    <div className="w-full space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                        Escala e Turno (Subinspetor)
                      </Label>
                      <Input 
                        value={row.info}
                        readOnly 
                        placeholder="--"
                        className="h-11 uppercase font-bold text-xs bg-muted/30 border-dashed cursor-not-allowed text-primary" 
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeSubinspetorRow(index)}
                      className="h-11 w-11 text-destructive hover:bg-red-50 hover:text-red-600 rounded-xl shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* SEÇÃO FALTAS */}
            <Collapsible open={isAbsencesOpen} onOpenChange={setIsAbsencesOpen} className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <CollapsibleTrigger asChild>
                    <button type="button" className={cn(
                      "p-2 rounded-xl transition-colors border shadow-sm",
                      absencesFilled ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-red-50 text-red-500 border-red-100"
                    )}>
                      <UserX className="h-5 w-5" />
                    </button>
                  </CollapsibleTrigger>
                  <div className="flex flex-col">
                    <h4 className="text-sm font-black uppercase text-slate-700 tracking-widest leading-none">Faltas</h4>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase mt-1 tracking-tighter">{absencesFilled ? "SESSÃO PREENCHIDA" : "NENHUMA FALTA REGISTRADA"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addFaltaRow}
                    className="h-8 text-[10px] font-black uppercase gap-1.5 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Plus className="h-3.5 w-3.5" /> ADICIONAR FALTA
                  </Button>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      {isAbsencesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
              
              <CollapsibleContent className="space-y-4">
                {faltaRows.map((row, index) => (
                  <div key={row.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="w-full">
                      {renderAutocomplete(
                        "Servidor (Falta)", 
                        row.term, 
                        (v) => updateFaltaRow(index, { term: v }), 
                        (v) => updateFaltaRow(index, { empId: v }), 
                        row.empId, 
                        row.show, 
                        (v) => updateFaltaRow(index, { show: v }),
                        (v) => updateFaltaRow(index, { info: v }),
                        allEmployees || [],
                        allSelectedIds.filter(id => id !== row.empId)
                      )}
                    </div>
                    <div className="w-full space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                        Escala e Turno (Servidor)
                      </Label>
                      <Input 
                        value={row.info}
                        readOnly 
                        placeholder="--"
                        className="h-11 uppercase font-bold text-xs bg-muted/30 border-dashed cursor-not-allowed text-primary" 
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeFaltaRow(index)}
                      className="h-11 w-11 text-destructive hover:bg-red-50 hover:text-red-600 rounded-xl shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* SEÇÃO AFASTAMENTOS E FOLGAS */}
            <Collapsible open={isAfastadosOpen} onOpenChange={setIsAfastadosOpen} className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <CollapsibleTrigger asChild>
                    <button type="button" className={cn(
                      "p-2 rounded-xl transition-colors border shadow-sm",
                      afastadosFilled ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-red-50 text-red-500 border-red-100"
                    )}>
                      <History className="h-5 w-5" />
                    </button>
                  </CollapsibleTrigger>
                  <div className="flex flex-col">
                    <h4 className="text-sm font-black uppercase text-slate-700 tracking-widest leading-none">Afastamentos / Folgas (Hoje)</h4>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase mt-1 tracking-tighter">{afastadosFilled ? "REGISTROS ENCONTRADOS" : "NENHUM REGISTRO NO SISTEMA"}</span>
                  </div>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    {isAfastadosOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
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
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12">
                            <span className="uppercase text-[10px] font-bold text-muted-foreground italic tracking-widest">NENHUM REGISTRO PARA ESTE TURNO HOJE.</span>
                          </TableCell>
                        </TableRow>
                      ) : (
                        absentTodayList.map((item) => (
                          <TableRow key={item.id} className="hover:bg-slate-50/50">
                            <TableCell className="py-3">
                              <div className="flex flex-col">
                                <span className="font-black uppercase text-[12px] text-slate-900 leading-tight">{item.employeeQra}</span>
                                <span className="text-[10px] uppercase text-muted-foreground font-medium">{item.employeeName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-[11px] font-bold uppercase text-slate-700">{item.escala} / {item.turno}</TableCell>
                            <TableCell><Badge variant="secondary" className="text-[9px] uppercase font-bold bg-slate-100 text-slate-600 px-2 py-0">{item.unit}</Badge></TableCell>
                            <TableCell>
                              <Badge className={cn(
                                "text-[9px] uppercase font-black border-none px-3 h-6",
                                normalizeStr(item.type).includes("FERIAS") ? "bg-blue-600 text-white" :
                                normalizeStr(item.type).includes("LICENCA") ? "bg-purple-600 text-white" :
                                normalizeStr(item.type).includes("ATESTADO") ? "bg-red-600 text-white" :
                                "bg-orange-500 text-white"
                              )}>{item.type}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-[11px] font-black font-mono text-slate-900">{formatDateBR(item.endDate)}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* SEÇÃO ESCALA ESPECIAL */}
            <Collapsible open={isEspecialOpen} onOpenChange={setIsEspecialOpen} className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <CollapsibleTrigger asChild>
                    <button type="button" className={cn(
                      "p-2 rounded-xl transition-colors border shadow-sm",
                      especialFilled ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-red-50 text-red-500 border-red-100"
                    )}>
                      <Star className="h-5 w-5" />
                    </button>
                  </CollapsibleTrigger>
                  <div className="flex flex-col">
                    <h4 className="text-sm font-black uppercase text-slate-700 tracking-widest leading-none">Escala Especial</h4>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase mt-1 tracking-tighter">{especialFilled ? "SESSÃO PREENCHIDA" : "NENHUM SERVIDOR EM EXTRA"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addEspecialRow}
                    className="h-8 text-[10px] font-black uppercase gap-1.5 rounded-xl border-primary/20 text-primary hover:bg-primary/5"
                  >
                    <Plus className="h-3.5 w-3.5" /> ADICIONAR SERVIDOR
                  </Button>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      {isEspecialOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
              
              <CollapsibleContent className="space-y-6">
                {especialRows.map((row, index) => (
                  <div key={row.id} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-4 items-end animate-in fade-in slide-in-from-top-2 duration-300 bg-slate-50/30 p-4 rounded-xl border border-dashed border-slate-200">
                    <div className="w-full">
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
                        allSelectedIds.filter(id => id !== row.empId)
                      )}
                    </div>
                    <div className="w-full space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Escala e Turno (Original)</Label>
                      <Input value={row.info} readOnly placeholder="--" className="h-11 uppercase font-bold text-xs bg-white border-dashed cursor-not-allowed" />
                    </div>
                    <div className="w-full space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2">
                        <Timer className="h-3 w-3" /> Período Escala Especial
                      </Label>
                      <Select value={row.periodId} onValueChange={(v) => updateEspecialRow(index, { periodId: v })}>
                        <SelectTrigger className="h-11 uppercase text-[9px] font-bold bg-white">
                          <SelectValue placeholder="SELECIONE O HORÁRIO..." />
                        </SelectTrigger>
                        <SelectContent>
                          {specialPeriodsList.map((p: any) => (
                            <SelectItem key={p.id} value={p.id} className="uppercase text-[9px] font-bold">
                              {p.escalaName} ({p.startTime} ÀS {p.endTime})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeEspecialRow(index)}
                      className="h-11 w-11 text-destructive hover:bg-red-50 hover:text-red-600 rounded-xl shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* SEÇÃO EQUIPE DO DIA */}
            <Collapsible open={isTeamOpen} onOpenChange={setIsTeamOpen} className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <CollapsibleTrigger asChild>
                    <button type="button" className={cn(
                      "p-2 rounded-xl transition-colors border shadow-sm",
                      teamFilled ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-red-50 text-red-500 border-red-100"
                    )}>
                      <Users className="h-5 w-5" />
                    </button>
                  </CollapsibleTrigger>
                  <div className="flex flex-col">
                    <h4 className="text-sm font-black uppercase text-slate-700 tracking-widest leading-none">Equipe do Dia</h4>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase mt-1 tracking-tighter">{teamFilled ? "SESSÃO PREENCHIDA" : "AGUARDANDO DADOS"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addSectorBlock}
                    className="h-8 text-[10px] font-black uppercase gap-1.5 rounded-xl border-primary/20 text-primary hover:bg-primary/5"
                  >
                    <Plus className="h-3.5 w-3.5" /> ADICIONAR NOVO BLOCO (SETOR)
                  </Button>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      {isTeamOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
              
              <CollapsibleContent className="space-y-6">
                {sectorBlocks.map((sector, sIdx) => (
                  <div key={sector.id} className="relative p-4 rounded-xl border-2 border-slate-100 bg-slate-50/20 space-y-4 animate-in zoom-in-95 duration-300">
                    
                    {/* CABEÇALHO DO SETOR */}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 bg-white p-3 rounded-xl border border-dashed items-end">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Setor</Label>
                        <Select value={sector.sectorType} onValueChange={(v) => updateSectorBlock(sIdx, { sectorType: v })}>
                          <SelectTrigger className="h-11 uppercase text-xs font-bold bg-slate-50/50">
                            <SelectValue placeholder="SELECIONE O SETOR..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SETOR 1" className="uppercase text-xs font-bold">SETOR 1</SelectItem>
                            <SelectItem value="SETOR 2" className="uppercase text-xs font-bold">SETOR 2</SelectItem>
                            <SelectItem value="SETOR 3" className="uppercase text-xs font-bold">SETOR 3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-full">
                        {renderAutocomplete(
                          "Chefia Responsável", 
                          sector.chiefData.term, 
                          (v) => updateSectorBlock(sIdx, { chiefData: { ...sector.chiefData, term: v } }), 
                          (v) => updateSectorBlock(sIdx, { chiefData: { ...sector.chiefData, id: v } }), 
                          sector.chiefData.id, 
                          sector.chiefData.show, 
                          (v) => updateSectorBlock(sIdx, { chiefData: { ...sector.chiefData, show: v } }),
                          (v) => updateSectorBlock(sIdx, { chiefData: { ...sector.chiefData, info: v } }),
                          availableChiefsForSectors,
                          sectorBlocks.filter((_, i) => i !== sIdx).map(s => s.chiefData.id).filter(Boolean)
                        )}
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeSectorBlock(sIdx)}
                        className="h-11 w-11 text-destructive hover:bg-red-50 rounded-xl"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* LISTA DE POSTOS DENTRO DO SETOR */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-1">
                        <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Postos e Integrantes</h5>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => addPostToSector(sIdx)}
                          className="h-6 text-[9px] font-black uppercase text-primary gap-1.5 hover:bg-primary/5"
                        >
                          <Plus className="h-3.5 w-3.5" /> ADICIONAR POSTO
                        </Button>
                      </div>

                      {sector.posts.map((post: any, pIdx: number) => {
                        const isVTR = post.type === "VTR";
                        const memberLimit = isVTR ? 4 : 15;

                        return (
                          <div key={post.id} className="space-y-2 bg-white/50 p-3 rounded-xl border border-slate-100 shadow-sm">
                            <div className="flex flex-col md:flex-row items-stretch md:items-end gap-4">
                              <div className="flex-1 space-y-1.5">
                                <Label className="text-[9px] font-bold uppercase text-muted-foreground">Posto / Serviço</Label>
                                <Select value={post.type} onValueChange={(v) => {
                                  const newPosts = [...sector.posts];
                                  newPosts[pIdx].type = v;
                                  // Limpa excesso de membros se mudar para VTR
                                  if (v === "VTR" && newPosts[pIdx].members.length > 4) {
                                    newPosts[pIdx].members = newPosts[pIdx].members.slice(0, 4);
                                  }
                                  updateSectorBlock(sIdx, { posts: newPosts });
                                }}>
                                  <SelectTrigger className="h-10 uppercase text-xs font-bold bg-slate-50/50">
                                    <SelectValue placeholder="SELECIONE O POSTO..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="CENTRAL" className="uppercase text-xs font-bold">CENTRAL</SelectItem>
                                    <SelectItem value="SENTINELA" className="uppercase text-xs font-bold">SENTINELA</SelectItem>
                                    <SelectItem value="VIDEOMONITORAMENTO" className="uppercase text-xs font-bold">VIDEOMONITORAMENTO</SelectItem>
                                    <SelectItem value="VTR" className="uppercase text-xs font-bold">VTR</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => addMemberToPost(sIdx, pIdx)}
                                  className="h-10 text-[9px] font-black uppercase border-dashed border-primary/30 text-primary hover:bg-primary/5"
                                >
                                  <Plus className="h-3.5 w-3.5 mr-1" /> SERVIDOR ({post.members.length}/{memberLimit})
                                </Button>
                                {sector.posts.length > 1 && (
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => removePostFromSector(sIdx, pIdx)}
                                    className="h-10 w-10 text-destructive hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* INTEGRANTES DO POSTO */}
                            <div className={cn(
                              "grid gap-2 pt-1",
                              isVTR ? "grid-cols-1 md:grid-cols-5" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                            )}>
                              {isVTR && (
                                <div className="space-y-1.5 animate-in zoom-in-95 duration-300">
                                  <Label className="text-[9px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-1.5">
                                    <Car className="h-3 w-3" /> VTR nº
                                  </Label>
                                  <Input 
                                    placeholder="EX: 001" 
                                    className="h-11 uppercase font-bold text-xs bg-blue-50/30 border-blue-100 focus:bg-white"
                                    value={post.vtrNumber || ""}
                                    onChange={(e) => {
                                      const newPosts = [...sector.posts];
                                      newPosts[pIdx].vtrNumber = e.target.value.toUpperCase();
                                      updateSectorBlock(sIdx, { posts: newPosts });
                                    }}
                                  />
                                </div>
                              )}

                              {post.members.map((member: any, mIdx: number) => (
                                <div key={member.id} className={cn(
                                  "flex flex-col gap-2 p-2 rounded-lg border border-slate-100 bg-white/80 shadow-sm animate-in fade-in slide-in-from-left-2 duration-200",
                                  isVTR && "border-blue-100"
                                )}>
                                  <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                      {renderAutocomplete(
                                        `Servidor ${mIdx + 1}`, 
                                        member.term, 
                                        (v) => updateMemberInPost(sIdx, pIdx, mIdx, { term: v }), 
                                        (v) => updateMemberInPost(sIdx, pIdx, mIdx, { empId: v }), 
                                        member.empId, 
                                        member.show, 
                                        (v) => updateMemberInPost(sIdx, pIdx, mIdx, { show: v }),
                                        () => {},
                                        allEmployees || [],
                                        allSelectedIds.filter(id => id !== member.empId),
                                        false,
                                        'qra'
                                      )}
                                    </div>
                                    {post.members.length > 1 && (
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => removeMemberFromPost(sIdx, pIdx, mIdx)}
                                        className="h-11 w-11 text-destructive/50 hover:text-destructive hover:bg-red-50 rounded-xl"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {sectorBlocks.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-slate-50/50">
                    <p className="uppercase text-[10px] font-black text-muted-foreground tracking-widest">Nenhuma equipe configurada para este relatório.</p>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>

          <CardFooter className="bg-slate-50 border-t p-6">
            <Button 
              type="submit" 
              disabled={loading || loadingEmployees}
              className="w-full h-14 uppercase font-black text-xs tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-blue-200 transition-all active:scale-95"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="h-5 w-5 mr-2" />}
              Enviar Relatório para o Sistema
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
