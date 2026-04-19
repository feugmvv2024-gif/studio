"use client"

import * as React from "react"
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Loader2, 
  MoreHorizontal,
  Check,
  X,
  Info,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Timer,
  CalendarDays,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useFirestore, useCollection, useAuth } from '@/firebase'
import { 
  collection, 
  addDoc, 
  doc, 
  deleteDoc, 
  query, 
  orderBy, 
  updateDoc, 
  serverTimestamp,
  getDocs,
  where
} from 'firebase/firestore'
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { cn } from "@/lib/utils"

// Utilitários de Cálculo
const hhmmToMinutes = (hhmm: string) => {
  if (!hhmm || !hhmm.includes(':')) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (h * 60) + (m || 0);
};

const minutesToHHmm = (totalMinutes: number) => {
  const isNegative = totalMinutes < 0;
  const absMinutes = Math.abs(totalMinutes);
  const h = Math.floor(absMinutes / 60);
  const m = absMinutes % 60;
  return `${isNegative ? '-' : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const getSaoPauloDate = () => {
  const now = new Date();
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now).split('/').reverse().join('-');
};

const applyHoursMask = (value: string) => {
  let v = value.replace(/\D/g, "");
  if (v.length > 6) v = v.slice(0, 6);
  if (v.length <= 2) return v;
  const minutes = v.slice(-2);
  const hours = v.slice(0, -2);
  return `${hours}:${minutes}`;
};

const normalizeStr = (str: string) => str?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";

const MONTHS = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
];

const ITEMS_PER_PAGE = 50;

export default function LancamentosPage() {
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false)
  const [selectedLaunch, setSelectedLaunch] = React.useState<any>(null)
  const [launchToDelete, setLaunchToDelete] = React.useState<string | null>(null)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  
  // Estado de Filtros de Data
  const [filterMonth, setFilterMonth] = React.useState("ALL");
  const [filterYear, setFilterYear] = React.useState("ALL");

  // Estado de Paginação
  const [currentPage, setCurrentPage] = React.useState(1);

  // Estados do Formulário
  const [hoursInput, setHoursInput] = React.useState("")
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string>("")
  const [searchEmployeeTerm, setSearchEmployeeTerm] = React.useState("")
  const [formDays, setFormDays] = React.useState<number | "">("")
  const [formQtdEscala, setFormQtdEscala] = React.useState<number | "">("")
  const [formStartDate, setFormStartDate] = React.useState<string>("")
  const [formEndDate, setFormEndDate] = React.useState<string>("")
  const [selectedType, setSelectedType] = React.useState<string>("")
  
  // Estados para a busca de Servidor
  const [showServidorSuggestions, setShowServidorSuggestions] = React.useState(false)
  const servidorSearchInputRef = React.useRef<HTMLInputElement>(null)

  const firestore = useFirestore()
  const { employeeData } = useAuth()
  const { toast } = useToast()

  // Queries
  const launchesQuery = React.useMemo(() => firestore ? query(collection(firestore, 'launches'), orderBy('createdAt', 'desc')) : null, [firestore]);
  const employeesQuery = React.useMemo(() => firestore ? query(collection(firestore, 'employees'), orderBy('name', 'asc')) : null, [firestore]);
  const launchTypesQuery = React.useMemo(() => firestore ? query(collection(firestore, 'launchTypes'), orderBy('name', 'asc')) : null, [firestore]);

  const { data: launches, loading: loadingLaunches } = useCollection(launchesQuery)
  const { data: employees } = useCollection(employeesQuery)
  const { data: launchTypes } = useCollection(launchTypesQuery)

  // Sincronização de Edição
  React.useEffect(() => {
    if (selectedLaunch) {
      setHoursInput(selectedLaunch.hours || "");
      setSelectedEmployeeId(selectedLaunch.employeeId || "");
      setSearchEmployeeTerm(`${selectedLaunch.employeeName} (${selectedLaunch.employeeQra})`);
      setFormDays(selectedLaunch.days ?? "");
      setFormQtdEscala(selectedLaunch.qtdEscala ?? "");
      setFormStartDate(selectedLaunch.startDate || "");
      setFormEndDate(selectedLaunch.endDate || "");
      setSelectedType(selectedLaunch.type || "");
    }
  }, [selectedLaunch]);

  // Cálculo Automático de Data Fim
  React.useEffect(() => {
    if (formStartDate && typeof formDays === 'number' && formDays > 0) {
      const start = new Date(formStartDate + "T00:00:00");
      const end = new Date(start);
      end.setDate(start.getDate() + (formDays - 1));
      setFormEndDate(end.toISOString().split('T')[0]);
    } else if (formStartDate) {
      setFormEndDate(formStartDate);
    } else {
      setFormEndDate("");
    }
  }, [formStartDate, formDays]);

  const filteredLaunches = React.useMemo(() => {
    if (!launches) return [];
    const term = searchTerm.toLowerCase();
    return launches.filter(l => {
      const matchesSearch = !searchTerm || (
        l.employeeName?.toLowerCase().includes(term) || 
        l.employeeQra?.toLowerCase().includes(term) ||
        l.type?.toLowerCase().includes(term) ||
        l.launchNumber?.toString().includes(term)
      );

      if (!matchesSearch) return false;

      // Filtro Temporal
      const launchDate = l.date; // YYYY-MM-DD
      if (!launchDate) return true;

      const [y, m] = launchDate.split('-');
      const matchesMonth = filterMonth === "ALL" || parseInt(m) === parseInt(filterMonth) + 1;
      const matchesYear = filterYear === "ALL" || y === filterYear;

      return matchesMonth && matchesYear;
    });
  }, [launches, searchTerm, filterMonth, filterYear]);

  // Lógica de Cálculo de Saldos para os Cards (Baseado no Filtro)
  const summaryStats = React.useMemo(() => {
    if (!filteredLaunches || searchTerm.length === 0) return null;
    
    return filteredLaunches.reduce((acc, l) => {
      const type = normalizeStr(l.type || "");
      const minutes = hhmmToMinutes(l.hours || "00:00");
      const days = Number(l.days) || 0;
      const qtdEscala = Number(l.qtdEscala) || 0;

      if (type === "BANCO DE HORAS CREDITO") acc.bhCredit += minutes;
      if (type === "BANCO DE HORAS DEBITO" || type === "FOLGA") acc.bhDebit += minutes;
      if (type === "TRE CREDITO") acc.treCredit += days;
      if (type === "TRE DEBITO") acc.treDebit += days;
      
      if (type.includes("GSE")) acc.gseTotal += qtdEscala;
      if (type.includes("ESPECIAL")) acc.especialTotal += qtdEscala;
      
      return acc;
    }, { bhCredit: 0, bhDebit: 0, treCredit: 0, treDebit: 0, gseTotal: 0, especialTotal: 0 });
  }, [filteredLaunches, searchTerm]);

  // Reseta página quando busca ou filtros mudam
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterMonth, filterYear]);

  const paginatedLaunches = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLaunches.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredLaunches, currentPage]);

  const totalPages = Math.ceil(filteredLaunches.length / ITEMS_PER_PAGE);

  const filteredEmployeesForSelection = React.useMemo(() => {
    if (!employees) return [];
    const term = searchEmployeeTerm.toLowerCase();
    return employees.filter(emp => 
      emp.name?.toLowerCase().includes(term) || 
      emp.qra?.toLowerCase().includes(term) ||
      emp.matricula?.toLowerCase().includes(term)
    ).slice(0, 50);
  }, [employees, searchEmployeeTerm]);

  const selectedEmployee = React.useMemo(() => 
    employees?.find(emp => emp.id === selectedEmployeeId), 
    [employees, selectedEmployeeId]
  );

  const resetForm = () => {
    setSelectedLaunch(null);
    setSelectedEmployeeId("");
    setSearchEmployeeTerm("");
    setHoursInput("");
    setFormDays("");
    setFormQtdEscala("");
    setFormStartDate("");
    setFormEndDate("");
    setSelectedType("");
  };

  const partialResetForm = () => {
    setSelectedEmployeeId("");
    setSearchEmployeeTerm("");
    setTimeout(() => {
      servidorSearchInputRef.current?.focus();
    }, 100);
  };

  async function handleMutation(e: React.FormEvent<HTMLFormElement>, isUpdate: boolean) {
    e.preventDefault();
    if (!firestore || !selectedEmployee) {
      toast({ variant: "destructive", title: "ERRO", description: "SELECIONE UM SERVIDOR." });
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const today = getSaoPauloDate();
    
    // Captura e formatação da observação
    const rawObservations = (formData.get('observations') as string || "").toUpperCase().trim();
    const adminQra = (employeeData?.qra || "SISTEMA").toUpperCase();
    const finalObservations = `${adminQra}: ${rawObservations}`;
    
    const launchData: any = {
      date: formData.get('date') as string,
      employeeId: selectedEmployeeId,
      employeeName: selectedEmployee.name || "N/A",
      employeeQra: selectedEmployee.qra || "N/A",
      escala: selectedEmployee.escala || "N/A",
      turno: selectedEmployee.turno || "N/A",
      type: selectedType.toUpperCase(),
      days: formDays === "" ? 0 : Number(formDays),
      qtdEscala: formQtdEscala === "" ? 0 : Number(formQtdEscala),
      hours: hoursInput,
      startDate: formStartDate,
      endDate: formEndDate,
      observations: finalObservations,
      ...(isUpdate ? {} : { createdAt: serverTimestamp() })
    };

    try {
      // VALIDAÇÃO DE SOBREPOSIÇÃO DE DATAS
      if (launchData.startDate && launchData.endDate) {
        const qOverlap = query(
          collection(firestore, 'launches'),
          where('employeeId', '==', selectedEmployeeId)
        );
        const overlapSnap = await getDocs(qOverlap);
        
        const hasOverlap = overlapSnap.docs.some(docSnap => {
          if (isUpdate && docSnap.id === selectedLaunch.id) return false;
          
          const existing = docSnap.data();
          if (!existing.startDate || !existing.endDate) return false;

          // Tipos que impedem duplicidade (Afastamentos e Ausências)
          const blockTypes = ["FERIAS", "FERIAS - GOZO", "LICENCA", "ATESTADO", "FOLGA", "ABONO", "FALTA", "TRE DEBITO"];
          const normExistingType = normalizeStr(existing.type || "");
          const normNewType = normalizeStr(launchData.type || "");

          // Verifica se ambos os tipos estão na lista de bloqueio e se há intersecção de datas
          if (blockTypes.some(t => normExistingType.includes(t)) && blockTypes.some(t => normNewType.includes(t))) {
             return (launchData.startDate <= existing.endDate && launchData.endDate >= existing.startDate);
          }
          return false;
        });

        if (hasOverlap) {
          toast({ 
            variant: "destructive", 
            title: "CONFLITO DE DATAS", 
            description: "O SERVIDOR JÁ POSSUI UM LANÇAMENTO ATIVO NESTE PERÍODO." 
          });
          setIsSubmitting(false);
          return;
        }
      }

      if (!isUpdate) {
        const q = query(collection(firestore, 'launches'), orderBy('launchNumber', 'desc'));
        const querySnapshot = await getDocs(q);
        let nextNumber = 1;
        if (!querySnapshot.empty) {
          const lastLaunch = querySnapshot.docs[0].data();
          nextNumber = (lastLaunch.launchNumber || 0) + 1;
        }
        launchData.launchNumber = nextNumber;
      }

      const normalizedType = normalizeStr(launchData.type);
      let targetStatus = "";
      if (normalizedType.includes("FERIAS")) targetStatus = "FÉRIAS";
      else if (normalizedType.includes("ATESTADO")) targetStatus = "ATESTADO";
      else if (normalizedType.includes("LICENCA")) targetStatus = "LICENÇA";

      const docRef = isUpdate ? doc(firestore, 'launches', selectedLaunch.id) : null;
      const action = isUpdate ? updateDoc(docRef!, launchData) : addDoc(collection(firestore, 'launches'), launchData);

      await action;

      if (targetStatus && launchData.startDate <= today && launchData.endDate >= today) {
        updateDoc(doc(firestore, 'employees', selectedEmployeeId), { status: targetStatus });
      }

      toast({ 
        title: "SUCESSO!", 
        description: isUpdate ? "LANÇAMENTO ATUALIZADO." : `LANÇAMENTO Nº ${launchData.launchNumber} REALIZADO.` 
      });
      
      if (isUpdate) {
        setIsEditOpen(false);
        resetForm();
      } else {
        partialResetForm();
      }
    } catch (err: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: isUpdate ? `launches/${selectedLaunch.id}` : 'launches',
        operation: isUpdate ? 'update' : 'create',
        requestResourceData: launchData
      }));
    } finally {
      setIsSubmitting(false);
    }
  }

  const isHoursRequired = React.useMemo(() => {
    if (!selectedType) return false;
    const normalizedType = normalizeStr(selectedType);
    return ["BANCO DE HORAS CREDITO", "BANCO DE HORAS DEBITO", "FOLGA"].includes(normalizedType);
  }, [selectedType]);

  const isQtdEscalaRequired = React.useMemo(() => {
    if (!selectedType) return false;
    const normalizedType = normalizeStr(selectedType);
    return ["ESCALA GSE", "ESCALA ESPECIAL"].includes(normalizedType);
  }, [selectedType]);

  const isDaysRequired = React.useMemo(() => {
    if (!selectedType) return false;
    const normalizedType = normalizeStr(selectedType);
    return ["ESCALA GSE", "ESCALA ESPECIAL", "TRE CREDITO", "TRE DEBITO", "FERIAS", "FERIAS - GOZO", "LICENCA", "ATESTADO", "ABONO", "FALTA", "FOLGA"].includes(normalizedType);
  }, [selectedType]);

  const renderFormFields = (isEdit: boolean) => (
    <div className="space-y-4 py-4 px-2">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3">
        <div className="bg-white rounded-full p-1 border border-blue-200 shadow-sm">
          <Info className="h-4 w-4 text-blue-500" />
        </div>
        <span className="text-blue-600 text-[10px] font-medium uppercase tracking-tight">
          Lançamentos de Férias, Licença ou Atestado atualizarão o status do servidor automaticamente conforme as datas.
        </span>
      </div>

      <div className="space-y-4">
        <div className="grid gap-1.5 relative">
          <Label className="uppercase text-[10px] font-bold text-muted-foreground tracking-wide">SERVIDOR (NOME OU QRA)</Label>
          <div className="relative">
            <input 
              ref={servidorSearchInputRef}
              type="text"
              placeholder="DIGITE O NOME OU QRA..."
              value={searchEmployeeTerm}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setSearchEmployeeTerm(val);
                setShowServidorSuggestions(true);
                if (!val) setSelectedEmployeeId('');
              }}
              onFocus={() => setShowServidorSuggestions(true)}
              className="w-full h-11 uppercase text-[11px] pr-10 border-muted bg-background/50 focus:bg-background transition-colors border rounded-md px-3 outline-none"
            />
            {selectedEmployeeId && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[9px] font-bold text-green-600 uppercase">OK</span>
              </div>
            )}
          </div>

          {showServidorSuggestions && searchEmployeeTerm && (
            <div className="absolute z-[60] left-0 right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-2xl max-h-48 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-200">
              {filteredEmployeesForSelection.length > 0 ? (
                filteredEmployeesForSelection.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedEmployeeId(s.id);
                      setSearchEmployeeTerm(`${s.name} (${s.qra})`);
                      setShowServidorSuggestions(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50/50 flex flex-col border-b border-border/50 last:border-0 transition-colors"
                  >
                    <span className="text-[11px] font-bold text-foreground uppercase">{s.name}</span>
                    <span className="text-[9px] text-muted-foreground uppercase mt-0.5 tracking-wider">QRA: {s.qra} • MAT: {s.matricula}</span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-[10px] text-muted-foreground italic uppercase">
                  NENHUM SERVIDOR ENCONTRADO
                </div>
              )}
            </div>
          )}
          {showServidorSuggestions && (
            <div className="fixed inset-0 z-[55]" onClick={() => setShowServidorSuggestions(false)} />
          )}
          <input type="hidden" name="employeeId" value={selectedEmployeeId} required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="grid gap-1.5">
            <Label className="uppercase text-[10px] font-bold text-muted-foreground tracking-wide">DATA LANÇAMENTO</Label>
            <Input name="date" type="date" defaultValue={isEdit ? selectedLaunch?.date : getSaoPauloDate()} required className="h-11 bg-background/50 border-muted" />
          </div>
          <div className="grid gap-1.5">
            <Label className="uppercase text-[10px] font-bold text-muted-foreground tracking-wide">TURNO</Label>
            <Input 
              value={selectedEmployee?.turno || ""} 
              readOnly 
              placeholder="--"
              className="h-11 bg-muted/30 border-muted uppercase text-[11px] cursor-not-allowed font-medium" 
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="uppercase text-[10px] font-bold text-muted-foreground tracking-wide">ESCALA</Label>
            <Input 
              value={selectedEmployee?.escala || ""} 
              readOnly 
              placeholder="--"
              className="h-11 bg-muted/30 border-muted uppercase text-[11px] cursor-not-allowed font-medium" 
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label className="uppercase text-[10px] font-bold text-muted-foreground tracking-wide">TIPO DE LANÇAMENTO</Label>
          <Select value={selectedType} onValueChange={setSelectedType} required>
            <SelectTrigger className="h-11 uppercase text-[11px] bg-background/50 border-muted">
              <SelectValue placeholder="--" />
            </SelectTrigger>
            <SelectContent>
              {launchTypes?.map((type: any) => <SelectItem key={type.id} value={type.name} className="uppercase text-[11px]">{type.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="grid gap-1.5">
            <Label className="uppercase text-[10px] font-bold text-muted-foreground tracking-wide">HORAS (HH:MM) {isHoursRequired && '*'}</Label>
            <Input 
              name="hours" 
              placeholder="00:00" 
              value={hoursInput} 
              onChange={(e) => setHoursInput(applyHoursMask(e.target.value))} 
              required={isHoursRequired}
              className="h-11 bg-background/50 border-muted text-center font-mono font-medium" 
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="uppercase text-[10px] font-bold text-muted-foreground tracking-wide">QTD ESCALA {isQtdEscalaRequired && '*'}</Label>
            <Input 
              name="qtdEscala" 
              type="number" 
              value={formQtdEscala} 
              onChange={(e) => setFormQtdEscala(e.target.value === "" ? "" : Number(e.target.value))} 
              required={isQtdEscalaRequired}
              className="h-11 bg-background/50 border-muted text-center font-medium" 
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="uppercase text-[10px] font-bold text-muted-foreground tracking-wide">DIAS {isDaysRequired && '*'}</Label>
            <Input 
              name="days" 
              type="number" 
              value={formDays} 
              onChange={(e) => setFormDays(e.target.value === "" ? "" : Number(e.target.value))} 
              required={isDaysRequired}
              className="h-11 bg-background/50 border-muted text-center font-medium" 
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="uppercase text-[10px] font-bold text-muted-foreground tracking-wide">DATA INÍCIO</Label>
            <Input 
              name="startDate" 
              type="date" 
              value={formStartDate} 
              onChange={(e) => setFormStartDate(e.target.value)} 
              className="h-11 bg-background/50 border-muted font-medium" 
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="uppercase text-[10px] font-bold text-muted-foreground tracking-wide">DATA FIM</Label>
            <Input 
              name="endDate" 
              type="date" 
              value={formEndDate} 
              readOnly 
              className="h-11 bg-muted/30 border-muted cursor-not-allowed font-medium" 
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label className="uppercase text-[10px] font-bold text-muted-foreground tracking-wide">OBSERVAÇÃO</Label>
          <Textarea 
            name="observations" 
            placeholder="OBSERVAÇÕES ADICIONAIS..."
            defaultValue={isEdit ? (selectedLaunch?.observations?.replace(/^[^:]+:\s*/, '') || "") : ""} 
            className="uppercase text-xs min-h-[100px] bg-background/50 border-muted rounded-xl p-3 resize-none" 
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase text-primary">
            LANÇAMENTOS
            <Badge variant="secondary" className="ml-2 bg-blue-50 text-blue-600 border-blue-100 font-bold px-2 py-0.5 rounded-lg text-xs">
              {filteredLaunches.length}
            </Badge>
          </h2>
          <p className="text-muted-foreground uppercase text-[10px]">GESTOR DE BANCO DE HORAS E AFASTAMENTOS.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 uppercase font-bold text-xs h-9 shadow-md"><Plus className="h-4 w-4" /> NOVO LANÇAMENTO</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[95vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl border-none">
            <form onSubmit={(e) => handleMutation(e, false)} className="flex flex-col h-full">
              <DialogHeader className="p-6 pb-2 border-b flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 p-1.5 rounded-lg">
                    <Plus className="h-5 w-5 text-blue-600" />
                  </div>
                  <DialogTitle className="uppercase text-lg font-bold tracking-tight">Novo Lançamento</DialogTitle>
                </div>
                <DialogClose className="rounded-full h-8 w-8 flex items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors">
                  <X className="h-4 w-4" />
                </DialogClose>
              </DialogHeader>
              <ScrollArea className="flex-1 p-4 sm:p-6 overflow-visible">
                {renderFormFields(false)}
              </ScrollArea>
              <DialogFooter className="p-6 pt-4 border-t grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={resetForm}
                  className="uppercase text-xs font-bold gap-2 h-11 rounded-xl border-muted/50 text-muted-foreground hover:bg-muted/20"
                >
                  <RefreshCw className="h-4 w-4" />
                  LIMPAR
                </Button>
                <Button 
                  variant="secondary" 
                  type="button" 
                  onClick={() => setIsAddOpen(false)} 
                  className="uppercase text-xs font-bold h-11 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 border-none"
                >
                  CANCELAR
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="uppercase text-xs font-bold h-11 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Lançamento"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* CARDS DE SALDO DINÂMICOS (VISÍVEIS APENAS DURANTE BUSCA) */}
      {summaryStats && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 animate-in slide-in-from-top-4 duration-500">
          <Card className="card-shadow border-blue-500/20 bg-blue-50/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-bold uppercase">MOVIMENTAÇÃO BANCO DE HORAS</CardTitle>
              <Timer className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-black",
                (summaryStats.bhCredit - summaryStats.bhDebit) < 0 ? "text-red-600" : "text-blue-700"
              )}>
                {minutesToHHmm(summaryStats.bhCredit - summaryStats.bhDebit)}H
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-blue-100">
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                  <p className="text-[10px] font-bold text-green-600">{minutesToHHmm(summaryStats.bhCredit)}H</p>
                </div>
                <div className="flex items-center gap-1">
                  <ArrowDownRight className="h-3 w-3 text-red-600" />
                  <p className="text-[10px] font-bold text-red-600">-{minutesToHHmm(summaryStats.bhDebit)}H</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-shadow border-purple-500/20 bg-purple-50/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-bold uppercase">SALDO TRE</CardTitle>
              <CalendarDays className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-black",
                (summaryStats.treCredit - summaryStats.treDebit) < 0 ? "text-red-600" : "text-purple-700"
              )}>
                {summaryStats.treCredit - summaryStats.treDebit} DIAS
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-purple-100">
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                  <p className="text-[10px] font-bold text-green-600">{summaryStats.treCredit}D</p>
                </div>
                <div className="flex items-center gap-1">
                  <ArrowDownRight className="h-3 w-3 text-red-600" />
                  <p className="text-[10px] font-bold text-red-600">-{summaryStats.treDebit}D</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-shadow border-orange-500/20 bg-orange-50/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-bold uppercase">ESCALAS EXTRAS</CardTitle>
              <Briefcase className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-orange-700">
                {summaryStats.gseTotal + summaryStats.especialTotal} UNID.
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-orange-100">
                <p className="text-[9px] font-bold text-slate-600 uppercase">GSE: {summaryStats.gseTotal}</p>
                <p className="text-[9px] font-bold text-slate-600 uppercase">ESPECIAL: {summaryStats.especialTotal}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="card-shadow border-primary/10 overflow-hidden rounded-xl border">
        <CardHeader className="p-4 border-b bg-muted/5 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="BUSCAR POR SERVIDOR, TIPO OU Nº..." 
              className="pl-8 uppercase h-9 text-[10px] border-muted/50 bg-background/50" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="h-9 w-[130px] uppercase text-[10px] font-bold bg-background/50">
                <SelectValue placeholder="MÊS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="uppercase text-[10px] font-bold">TODOS OS MESES</SelectItem>
                {MONTHS.map((m, idx) => (
                  <SelectItem key={idx} value={idx.toString()} className="uppercase text-[10px] font-bold">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="h-9 w-[100px] uppercase text-[10px] font-bold bg-background/50">
                <SelectValue placeholder="ANO" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="uppercase text-[10px] font-bold">TODOS</SelectItem>
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                  <SelectItem key={y} value={y.toString()} className="uppercase text-[10px] font-bold">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingLaunches ? <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/20">
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="w-[60px] font-bold uppercase text-[9px] px-4">Nº</TableHead>
                      <TableHead className="font-bold uppercase text-[9px] min-w-[90px]">DATA</TableHead>
                      <TableHead className="font-bold uppercase text-[9px] min-w-[180px]">SERVIDOR</TableHead>
                      <TableHead className="font-bold uppercase text-[9px] min-w-[120px]">ESCALA/TURNO</TableHead>
                      <TableHead className="font-bold uppercase text-[9px] min-w-[110px]">TIPO</TableHead>
                      <TableHead className="font-bold uppercase text-[9px] min-w-[60px] leading-tight text-center">
                        QTD <br /> ESCALAS
                      </TableHead>
                      <TableHead className="font-bold uppercase text-[9px] min-w-[60px] text-center">DIAS</TableHead>
                      <TableHead className="font-bold uppercase text-[9px] min-w-[70px] text-center">HORAS</TableHead>
                      <TableHead className="font-bold uppercase text-[9px] min-w-[90px]">INÍCIO</TableHead>
                      <TableHead className="font-bold uppercase text-[9px] min-w-[90px]">FIM</TableHead>
                      <TableHead className="font-bold uppercase text-[9px] min-w-[150px]">OBSERVAÇÕES</TableHead>
                      <TableHead className="text-right font-bold uppercase text-[9px] pr-4">AÇÕES</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLaunches.map((launch) => {
                      const normType = normalizeStr(launch.type);
                      const isBhDebit = normType === "BANCO DE HORAS DEBITO" || normType === "FOLGA";
                      const isTreDebit = normType === "TRE DEBITO";
                      
                      const isVacation = normType.includes("FERIAS");
                      const isMedical = normType.includes("ATESTADO");
                      const isLeave = normType.includes("LICENCA");

                      return (
                        <TableRow key={launch.id} className="hover:bg-blue-50/30 transition-colors">
                          <TableCell className="font-mono font-bold text-[10px] px-4 text-primary">
                            {launch.launchNumber || "-"}
                          </TableCell>
                          <TableCell className="text-[11px] whitespace-nowrap font-medium">{launch.date?.split('-').reverse().join('/') || "-"}</TableCell>
                          <TableCell><div className="flex flex-col"><span className="font-bold text-[11px] uppercase text-slate-800">{launch.employeeName || "-"}</span><span className="text-[9px] text-muted-foreground uppercase">{launch.employeeQra || "-"}</span></div></TableCell>
                          <TableCell className="text-[10px] uppercase font-medium">{launch.escala} / {launch.turno}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              "text-[9px] uppercase font-bold",
                              isVacation ? "bg-blue-600 text-white border-none" :
                              isMedical ? "bg-red-600 text-white border-none" :
                              isLeave ? "bg-purple-600 text-white border-none" :
                              isBhDebit || isTreDebit ? "text-red-700 bg-red-50/50 border-red-200" : "text-blue-700 bg-blue-50/50 border-blue-200"
                            )}>
                              {launch.type || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[11px] font-medium text-center">{launch.qtdEscala || "-"}</TableCell>
                          <TableCell className={cn("text-[11px] font-bold text-center", isTreDebit && "text-red-600")}>
                            {launch.days ? `${isTreDebit ? '-' : ''}${launch.days}` : "-"}
                          </TableCell>
                          <TableCell className={cn("text-[11px] font-black text-center", isBhDebit ? "text-red-600" : "text-blue-600")}>
                            {launch.hours ? `${isBhDebit ? '-' : ''}${launch.hours}H` : "-"}
                          </TableCell>
                          <TableCell className="text-[10px] whitespace-nowrap">{launch.startDate?.split('-').reverse().join('/') || "-"}</TableCell>
                          <TableCell className="text-[10px] whitespace-nowrap">{launch.endDate?.split('-').reverse().join('/') || "-"}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-[10px] uppercase text-muted-foreground italic">{launch.observations || "-"}</TableCell>
                          <TableCell className="text-right pr-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl shadow-xl border-muted/50">
                                <DropdownMenuItem onSelect={() => { setSelectedLaunch(launch); setTimeout(() => setIsEditOpen(true), 150); }} className="uppercase text-[10px] py-2 px-3 focus:bg-blue-50 cursor-pointer"><Edit className="mr-2 h-3.5 w-3.5 text-blue-600" /> EDITAR</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => { setLaunchToDelete(launch.id); setTimeout(() => setIsDeleteAlertOpen(true), 150); }} className="text-destructive uppercase text-[10px] py-2 px-3 focus:bg-red-50 cursor-pointer"><Trash2 className="mr-2 h-3.5 w-3.5" /> EXCLUIR</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {paginatedLaunches.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={12} className="h-32 text-center uppercase text-[10px] font-bold text-muted-foreground italic">
                          NENHUM REGISTRO ENCONTRADO PARA OS FILTROS APLICADOS.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/5">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">
                    Exibindo {paginatedLaunches.length} de {filteredLaunches.length} registros (Página {currentPage} de {totalPages})
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let pageNum = i + 1;
                        if (totalPages > 5 && currentPage > 3) {
                          pageNum = Math.min(currentPage - 2 + i, totalPages - 4 + i);
                        }
                        if (pageNum > totalPages || pageNum <= 0) return null;

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={cn(
                              "h-8 w-8 p-0 text-[10px] font-bold",
                              currentPage === pageNum ? "bg-primary text-white" : ""
                            )}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[800px] max-h-[95vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl border-none">
          {selectedLaunch && (
            <form onSubmit={(e) => handleMutation(e, true)} className="flex flex-col h-full">
              <DialogHeader className="p-6 pb-2 border-b flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 p-1.5 rounded-lg">
                    <Edit className="h-5 w-5 text-blue-600" />
                  </div>
                  <DialogTitle className="uppercase text-lg font-bold tracking-tight">Editar Lançamento Nº {selectedLaunch.launchNumber}</DialogTitle>
                </div>
                <DialogClose className="rounded-full h-8 w-8 flex items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors">
                  <X className="h-4 w-4" />
                </DialogClose>
              </DialogHeader>
              <ScrollArea className="flex-1 p-4 sm:p-6 overflow-visible">
                {renderFormFields(true)}
              </ScrollArea>
              <DialogFooter className="p-6 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button 
                  variant="secondary" 
                  type="button" 
                  onClick={() => setIsEditOpen(false)} 
                  className="uppercase text-xs font-bold h-11 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 border-none"
                >
                  CANCELAR
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="uppercase text-xs font-bold h-11 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="max-w-[90vw] rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="uppercase text-lg font-bold">Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="uppercase text-[10px] font-medium text-muted-foreground">
              AÇÃO IRREVERSÍVEL. O LANÇAMENTO SERÁ REMOVIDO PERMANENTEMENTE DO SISTEMA.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="uppercase text-xs font-bold rounded-xl h-11 border-none bg-slate-100 text-slate-600 hover:bg-slate-200">CANCELAR</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { 
                if (launchToDelete) {
                  deleteDoc(doc(firestore, 'launches', launchToDelete))
                    .then(() => toast({ title: "REMOVIDO" }))
                    .catch(err => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `launches/${launchToDelete}`, operation: 'delete' })))
                    .finally(() => setIsDeleteAlertOpen(false));
                }
              }} 
              className="bg-destructive hover:bg-destructive/90 uppercase text-xs font-bold rounded-xl h-11 shadow-lg shadow-red-100"
            >
              EXCLUIR AGORA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
