
"use client"

import * as React from "react"
import { 
  Clock, 
  CheckCircle2, 
  Loader2,
  Send,
  Trash2,
  ShieldCheck,
  Check,
  ChevronRight,
  CalendarDays,
  FileText,
  MessageSquare,
  User,
  Plus,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useFirestore, useCollection, useAuth } from '@/firebase';
import { collection, addDoc, query, orderBy, where, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils"

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

const normalizeStr = (str: string) => str?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";
const formatDateBR = (dateStr: string) => dateStr ? dateStr.split('-').reverse().join('/') : "";

export default function RequestsPage() {
  const firestore = useFirestore();
  const { user, employeeData, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("new");
  
  // Estados do formulário
  const [requestType, setRequestType] = React.useState<string>("");
  const [multiDates, setMultiDates] = React.useState<string[]>([""]);
  
  // Estados Reprogramação de Férias
  const [currentVacationStart, setCurrentVacationStart] = React.useState("");
  const [currentVacationEnd, setCurrentVacationEnd] = React.useState("");
  const [newVacationStart, setNewVacationStart] = React.useState("");
  const [newVacationEnd, setNewVacationEnd] = React.useState("");
  
  // Estados Abono de Aniversário
  const [birthdayDate, setBirthdayDate] = React.useState("");
  const [abonoDate, setAbonoDate] = React.useState("");
  
  // Estados Troca de Escala
  const [swapFromDate, setSwapFromDate] = React.useState("");
  const [swapToDate, setSwapToDate] = React.useState("");
  
  // Estados Permuta
  const [permutaMyOriginalDate, setPermutaMyOriginalDate] = React.useState("");
  const [permutaMyNewDate, setPermutaMyNewDate] = React.useState("");
  const [permutaPartnerId, setPermutaPartnerId] = React.useState("");
  const [permutaPartnerTerm, setPermutaPartnerTerm] = React.useState("");
  const [permutaPartnerShow, setPermutaPartnerShow] = React.useState(false);
  const [permutaPartnerData, setPermutaPartnerData] = React.useState<any>(null);

  const [chefiaRows, setChefiaRows] = React.useState([{ id: "", uid: "", term: "", show: false }]);
  const [adminResponseDraft, setAdminResponseDraft] = React.useState<{ [key: string]: string }>({});

  // Consultas
  const requestsQuery = React.useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'requests'), where('employeeId', '==', user.uid), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const managementQuery = React.useMemo(() => {
    if (!firestore || !user || !employeeData) return null;
    const role = normalizeStr(employeeData.role || "");
    const isRH = role.includes("GESTOR DE RH");
    if (isRH) return query(collection(firestore, 'requests'), where('status', 'in', ['Aprovado pela Chefia', 'Pendente']));
    return query(collection(firestore, 'requests'), where('chefiaIds', 'array-contains', user.uid), where('status', '==', 'Pendente'));
  }, [firestore, user, employeeData]);

  const allEmployeesRef = React.useMemo(() => firestore ? collection(firestore, 'employees') : null, [firestore]);
  const myLaunchesRef = React.useMemo(() => (firestore && employeeData?.id) ? query(collection(firestore, 'launches'), where('employeeId', '==', employeeData.id)) : null, [firestore, employeeData?.id]);
  const shiftPeriodsRef = React.useMemo(() => firestore ? collection(firestore, 'shiftPeriods') : null, [firestore]);

  const { data: myRequests, loading: loadingRequests } = useCollection(requestsQuery);
  const { data: managementRequests, loading: loadingManagement } = useCollection(managementQuery);
  const { data: allEmployees } = useCollection(allEmployeesRef);
  const { data: myLaunches } = useCollection(myLaunchesRef);
  const { data: shiftPeriods } = useCollection(shiftPeriodsRef);

  const myShiftPeriod = React.useMemo(() => (employeeData?.escala && shiftPeriods) ? shiftPeriods.find(p => p.escalaName === employeeData.escala) : null, [employeeData?.escala, shiftPeriods]);
  const requiredMinutesForFolga = React.useMemo(() => myShiftPeriod?.duration ? hhmmToMinutes(myShiftPeriod.duration) : 0, [myShiftPeriod]);

  // Automação Abono de Aniversário
  React.useEffect(() => {
    if (requestType === "ABONO DE ANIVERSÁRIO" && employeeData?.birthDate) {
      const parts = employeeData.birthDate.split('-');
      if (parts.length === 3) {
        const [, month, day] = parts;
        const currentYear = new Date().getFullYear();
        setBirthdayDate(`${currentYear}-${month}-${day}`);
      }
    }
  }, [requestType, employeeData?.birthDate]);

  // Cálculos de Saldo Banco de Horas
  const reservedMinutes = React.useMemo(() => {
    if (!myRequests || !requiredMinutesForFolga) return 0;
    return myRequests.filter(req => req.status === "Pendente" && req.type === "FOLGA").reduce((acc, req) => acc + (req.date ? req.date.split(',').length * requiredMinutesForFolga : 0), 0);
  }, [myRequests, requiredMinutesForFolga]);

  const myBalanceMinutes = React.useMemo(() => {
    if (!myLaunches) return 0;
    const base = myLaunches.reduce((acc, l) => {
      const type = normalizeStr(l.type || "");
      const min = hhmmToMinutes(l.hours || "00:00");
      if (type === "BANCO DE HORAS CREDITO") return acc + min;
      if (type === "BANCO DE HORAS DEBITO" || type === "FOLGA") return acc - min;
      return acc;
    }, 0);
    return base - reservedMinutes;
  }, [myLaunches, reservedMinutes]);

  const simulatedRemainingMinutes = React.useMemo(() => {
    if (requestType !== "FOLGA") return myBalanceMinutes;
    return myBalanceMinutes - (multiDates.filter(d => d).length * requiredMinutesForFolga);
  }, [requestType, myBalanceMinutes, multiDates, requiredMinutesForFolga]);

  // Cálculos de Saldo TRE
  const reservedTreDays = React.useMemo(() => {
    if (!myRequests) return 0;
    return myRequests.filter(req => req.status === "Pendente" && req.type === "ABONO TRE").reduce((acc, req) => acc + (req.date ? req.date.split(',').length : 0), 0);
  }, [myRequests]);

  const myBalanceTreDays = React.useMemo(() => {
    if (!myLaunches) return 0;
    const base = myLaunches.reduce((acc, l) => {
      const type = normalizeStr(l.type || "");
      const days = Number(l.days) || 0;
      if (type === "TRE CREDITO") return acc + days;
      if (type === "TRE DEBITO") return acc - days;
      return acc;
    }, 0);
    return base - reservedTreDays;
  }, [myLaunches, reservedTreDays]);

  const simulatedRemainingTreDays = React.useMemo(() => {
    if (requestType !== "ABONO TRE") return myBalanceTreDays;
    return myBalanceTreDays - multiDates.filter(d => d).length;
  }, [requestType, myBalanceTreDays, multiDates]);

  // Validação de Permuta no mesmo mês
  const hasInvalidPermutaMonth = React.useMemo(() => {
    if (requestType === "PERMUTA" && permutaMyOriginalDate && permutaMyNewDate) {
      return permutaMyOriginalDate.substring(0, 7) !== permutaMyNewDate.substring(0, 7);
    }
    return false;
  }, [requestType, permutaMyOriginalDate, permutaMyNewDate]);

  const hasInsufficientBalance = requestType === "FOLGA" && simulatedRemainingMinutes < 0;
  const hasInsufficientTreBalance = requestType === "ABONO TRE" && simulatedRemainingTreDays < 0;
  const hasInvalidAbonoDate = requestType === "ABONO DE ANIVERSÁRIO" && birthdayDate && abonoDate && abonoDate < birthdayDate;

  const isManagement = React.useMemo(() => {
    if (!employeeData) return false;
    const role = normalizeStr(employeeData.role || "");
    return ["INSPETOR GERAL", "INSPETOR", "SUBINSPETOR", "GESTOR DE RH"].includes(role);
  }, [employeeData]);

  const filteredManagementRequests = React.useMemo(() => {
    if (!managementRequests || !user || !employeeData) return [];
    const role = normalizeStr(employeeData.role || "");
    const isRH = role.includes("GESTOR DE RH");
    return managementRequests.filter(req => {
      const isChefiaForThis = req.chefiaIds?.includes(user.uid);
      if (isRH) {
        if (req.status === "Aprovado pela Chefia") return true;
        if (req.status === "Pendente" && isChefiaForThis) return true;
        return false;
      }
      return req.status === "Pendente" && isChefiaForThis;
    });
  }, [managementRequests, user, employeeData]);

  const historyBadgeCount = React.useMemo(() => 
    myRequests?.filter(req => req.status === "Pendente" || req.status === "Em Revisão").length || 0
  , [myRequests]);

  const managementBadgeCount = React.useMemo(() => 
    filteredManagementRequests.length
  , [filteredManagementRequests]);

  const addChefiaRow = () => setChefiaRows([...chefiaRows, { id: "", uid: "", term: "", show: false }]);
  const removeChefiaRow = (index: number) => {
    const newRows = chefiaRows.filter((_, i) => i !== index);
    setChefiaRows(newRows.length ? newRows : [{ id: "", uid: "", term: "", show: false }]);
  };
  const updateChefiaRow = (index: number, updates: Partial<{id: string, uid: string, term: string, show: boolean}>) => {
    setChefiaRows(prev => {
      const newRows = [...prev];
      newRows[index] = { ...newRows[index], ...updates };
      return newRows;
    });
  };

  async function handleSendRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!firestore || !user) return;

    const selectedChefias = chefiaRows.filter(r => r.uid);
    if (selectedChefias.length === 0) {
      toast({ variant: "destructive", title: "ATENÇÃO", description: "SELECIONE AO MENOS UMA CHEFIA." });
      return;
    }

    if (hasInvalidPermutaMonth) {
      toast({ variant: "destructive", title: "ERRO DE DATA", description: "A PERMUTA DEVE SER NO MESMO MÊS." });
      return;
    }

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const description = (formData.get('description') as string || "").toUpperCase();
    
    let finalDate = "";
    if (["FOLGA", "ABONO TRE", "ESCALA ESPECIAL"].includes(requestType)) {
      finalDate = multiDates.filter(d => d).map(d => formatDateBR(d)).join(", ");
    } else if (requestType === "REPROGRAMAÇÃO DE FÉRIAS") {
      finalDate = `AGENDADO: ${formatDateBR(currentVacationStart)} À ${formatDateBR(currentVacationEnd)} | NOVO: ${formatDateBR(newVacationStart)} À ${formatDateBR(newVacationEnd)}`;
    } else if (requestType === "ABONO DE ANIVERSÁRIO") {
      finalDate = `ANIV: ${formatDateBR(birthdayDate)} | FOLGA: ${formatDateBR(abonoDate)}`;
    } else if (requestType === "TROCA DE ESCALA") {
      finalDate = `DE: ${formatDateBR(swapFromDate)} | PARA: ${formatDateBR(swapToDate)}`;
    } else if (requestType === "PERMUTA") {
      finalDate = `PERMUTA COM ${permutaPartnerData?.name || "N/A"} | EU: ${formatDateBR(permutaMyOriginalDate)}->${formatDateBR(permutaMyNewDate)} | PARCEIRO: ${formatDateBR(permutaMyNewDate)}->${formatDateBR(permutaMyOriginalDate)}`;
    } else {
      finalDate = formatDateBR(formData.get('date') as string || "");
    }

    const newRequest = {
      employeeId: user.uid,
      employeeName: (employeeData?.name || "USUÁRIO").toUpperCase(),
      employeeQra: (employeeData?.qra || "N/A").toUpperCase(),
      escala: (employeeData?.escala || "N/A").toUpperCase(),
      turno: (employeeData?.turno || "N/A").toUpperCase(),
      type: requestType,
      date: finalDate,
      description: description,
      status: "Pendente",
      chefiaImediata: selectedChefias.map(c => c.term).join(" / "),
      chefiaIds: selectedChefias.map(c => c.uid),
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(firestore, 'requests'), newRequest);
      toast({ title: "SOLICITAÇÃO ENVIADA!" });
      setActiveTab("history");
      resetForm();
    } catch (err) {
      toast({ variant: "destructive", title: "ERRO AO ENVIAR" });
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
    setRequestType("");
    setMultiDates([""]);
    setChefiaRows([{ id: "", uid: "", term: "", show: false }]);
    setPermutaPartnerData(null);
    setPermutaPartnerTerm("");
    setPermutaMyOriginalDate("");
    setPermutaMyNewDate("");
    setBirthdayDate("");
    setAbonoDate("");
    setCurrentVacationStart("");
    setCurrentVacationEnd("");
    setNewVacationStart("");
    setNewVacationEnd("");
    setSwapFromDate("");
    setSwapToDate("");
  };

  async function handleProcessRequest(request: any, action: 'approve' | 'deny') {
    if (!firestore) return;
    let nextStatus = action === 'deny' ? "Negado" : (request.status === "Pendente" ? "Aprovado pela Chefia" : "Aprovado");
    const response = adminResponseDraft[request.id] || "";
    try {
      await updateDoc(doc(firestore, 'requests', request.id), { status: nextStatus, adminResponse: response.toUpperCase(), updatedAt: serverTimestamp() });
      toast({ title: "SOLICITAÇÃO PROCESSADA" });
    } catch (err) {
      toast({ variant: "destructive", title: "ERRO AO PROCESSAR" });
    }
  }

  if (authLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight uppercase text-primary">REQUERIMENTOS</h2>
        <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">CENTRAL DE SOLICITAÇÕES OPERACIONAIS GMVV.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={cn("grid w-full bg-muted/50 p-1 rounded-xl", isManagement ? "grid-cols-3 lg:w-[650px]" : "grid-cols-2 lg:w-[450px]")}>
          <TabsTrigger value="new" className="rounded-lg uppercase text-[10px] font-bold">NOVA SOLICITAÇÃO</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg uppercase text-[10px] font-bold flex items-center gap-2">
            HISTÓRICO
            {historyBadgeCount > 0 && (
              <Badge variant="secondary" className="h-4 w-4 p-0 flex items-center justify-center text-[8px] bg-blue-600 text-white border-none rounded-full">
                {historyBadgeCount}
              </Badge>
            )}
          </TabsTrigger>
          {isManagement && (
            <TabsTrigger value="management" className="rounded-lg uppercase text-[10px] font-bold text-primary flex items-center gap-2">
              GESTÃO DE REQUERIMENTOS
              {managementBadgeCount > 0 && (
                <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[8px] bg-primary text-primary-foreground border-none rounded-full">
                  {managementBadgeCount}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="new" className="mt-6">
           <Card className="card-shadow border-none rounded-2xl overflow-hidden">
            <form onSubmit={handleSendRequest}>
              <CardHeader className="bg-primary/5 border-b py-3 px-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-xl border shadow-sm shrink-0">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <span className="text-2xl sm:text-3xl font-black uppercase text-slate-900 tracking-tighter block leading-none">
                        {employeeData?.name} ({employeeData?.qra})
                      </span>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Identificação Funcional NRH</p>
                    </div>
                   </div>
                   <div className="bg-white/50 px-4 py-1.5 rounded-xl border border-primary/10 flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <div className="text-right">
                      <span className="text-base sm:text-lg font-black uppercase text-primary tracking-tight leading-none block">{employeeData?.escala}</span>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{employeeData?.turno}</span>
                    </div>
                   </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-5 px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label className="text-[9px] font-bold uppercase text-muted-foreground tracking-tight">Tipo de Solicitação</Label>
                    <Select value={requestType} onValueChange={setRequestType} required>
                      <SelectTrigger className="h-10 uppercase text-[10px] font-bold"><SelectValue placeholder="SELECIONE..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FOLGA" className="uppercase text-[10px]">FOLGA (BANCO DE HORAS)</SelectItem>
                        <SelectItem value="ABONO DE ANIVERSÁRIO" className="uppercase text-[10px]">ABONO DE ANIVERSÁRIO</SelectItem>
                        <SelectItem value="ABONO TRE" className="uppercase text-[10px]">ABONO TRE</SelectItem>
                        <SelectItem value="REPROGRAMAÇÃO DE FÉRIAS" className="uppercase text-[10px]">REPROGRAMAÇÃO DE FÉRIAS</SelectItem>
                        <SelectItem value="ESCALA ESPECIAL" className="uppercase text-[10px]">ESCALA ESPECIAL</SelectItem>
                        <SelectItem value="TROCA DE ESCALA" className="uppercase text-[10px]">TROCA DE ESCALA</SelectItem>
                        <SelectItem value="PERMUTA" className="uppercase text-[10px]">PERMUTA</SelectItem>
                        <SelectItem value="OUTROS" className="uppercase text-[10px]">OUTROS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {requestType === "FOLGA" && (
                    <div className="grid gap-1.5 animate-in fade-in duration-300">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground tracking-tight">Saldo Banco de Horas</Label>
                      <div className={cn("h-10 flex items-center px-4 rounded-lg border font-black text-[10px] uppercase", hasInsufficientBalance ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700")}>
                        {minutesToHHmm(simulatedRemainingMinutes)}H DISPONÍVEIS
                      </div>
                    </div>
                  )}

                  {requestType === "ABONO TRE" && (
                    <div className="grid gap-1.5 animate-in fade-in duration-300">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground tracking-tight">Saldo TRE</Label>
                      <div className={cn("h-10 flex items-center px-4 rounded-lg border font-black text-[10px] uppercase", hasInsufficientTreBalance ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700")}>
                        {simulatedRemainingTreDays} DIAS DISPONÍVEIS
                      </div>
                    </div>
                  )}
                </div>

                {requestType === "REPROGRAMAÇÃO DE FÉRIAS" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border rounded-xl animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                      <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest border-b pb-1">Agendamento Atual</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="grid gap-1">
                          <Label className="text-[8px] font-bold uppercase text-muted-foreground">Início</Label>
                          <Input type="date" value={currentVacationStart} onChange={(e) => setCurrentVacationStart(e.target.value)} required className="h-9 text-[10px] font-bold bg-white" />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-[8px] font-bold uppercase text-muted-foreground">Fim</Label>
                          <Input type="date" value={currentVacationEnd} onChange={(e) => setCurrentVacationEnd(e.target.value)} required className="h-9 text-[10px] font-bold bg-white" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[8px] font-black uppercase text-blue-600 tracking-widest border-b border-blue-100 pb-1">Novo Período</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="grid gap-1">
                          <Label className="text-[8px] font-bold uppercase text-muted-foreground">Início</Label>
                          <Input type="date" value={newVacationStart} onChange={(e) => setNewVacationStart(e.target.value)} required className="h-9 text-[10px] font-bold bg-white border-blue-200" />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-[8px] font-bold uppercase text-muted-foreground">Fim</Label>
                          <Input type="date" value={newVacationEnd} onChange={(e) => setNewVacationEnd(e.target.value)} required className="h-9 text-[10px] font-bold bg-white border-blue-200" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {requestType === "ABONO DE ANIVERSÁRIO" && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border rounded-xl animate-in slide-in-from-top-2 duration-300">
                    <div className="grid gap-1">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground">Data Aniversário</Label>
                      <Input type="date" value={birthdayDate} onChange={(e) => setBirthdayDate(e.target.value)} required className="h-9 text-[10px] font-bold bg-white" />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground">Data da Folga</Label>
                      <Input type="date" value={abonoDate} onChange={(e) => setAbonoDate(e.target.value)} required className="h-9 text-[10px] font-bold bg-white" />
                      {birthdayDate && abonoDate && abonoDate < birthdayDate && (
                        <p className="text-[8px] text-destructive font-black uppercase absolute mt-9">A folga deve ser após o aniversário.</p>
                      )}
                    </div>
                  </div>
                )}

                {requestType === "PERMUTA" && (
                  <div className="space-y-4 p-4 bg-slate-50 border rounded-xl animate-in slide-in-from-top-2 duration-300">
                    {/* MINHA ESCALA */}
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase text-blue-800 tracking-widest block border-b pb-1">Minha Escala</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1">
                          <Label className="text-[8px] font-bold uppercase text-muted-foreground">De (Data Original)</Label>
                          <Input 
                            type="date" 
                            value={permutaMyOriginalDate} 
                            onChange={(e) => setPermutaMyOriginalDate(e.target.value)} 
                            required 
                            className="h-9 text-[10px] font-bold bg-white border-blue-200" 
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-[8px] font-bold uppercase text-muted-foreground">Para (Nova Data)</Label>
                          <Input 
                            type="date" 
                            value={permutaMyNewDate} 
                            onChange={(e) => setPermutaMyNewDate(e.target.value)} 
                            required 
                            className="h-9 text-[10px] font-bold bg-white border-blue-200" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* PARCEIRO */}
                    <div className="grid gap-1.5 relative">
                      <Label className="text-[9px] font-black uppercase text-slate-800 tracking-widest block border-b pb-1">Parceiro da Troca</Label>
                      <div className="relative mt-1">
                        <Input 
                          placeholder="BUSCAR NOME OU QRA..."
                          value={permutaPartnerTerm}
                          onChange={(e) => { setPermutaPartnerTerm(e.target.value.toUpperCase()); setPermutaPartnerShow(true); setPermutaPartnerId(""); setPermutaPartnerData(null); }}
                          onFocus={() => setPermutaPartnerShow(true)}
                          className="h-9 border-muted uppercase text-[10px] font-bold bg-white pr-8"
                        />
                        {permutaPartnerId && <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-green-600" />}
                        {permutaPartnerShow && permutaPartnerTerm && (
                          <div className="absolute z-[65] left-0 right-0 top-full mt-1 bg-background border rounded-lg shadow-2xl max-h-40 overflow-y-auto">
                            {allEmployees?.filter(e => e.uid !== user?.uid && (normalizeStr(e.name).includes(permutaPartnerTerm) || normalizeStr(e.qra).includes(permutaPartnerTerm))).map(c => (
                              <button key={c.id} type="button" onMouseDown={() => { setPermutaPartnerId(c.uid); setPermutaPartnerData(c); setPermutaPartnerTerm(`${c.name} (${c.qra})`); setPermutaPartnerShow(false); }} className="w-full px-3 py-2 text-left hover:bg-blue-50 text-[9px] uppercase border-b last:border-0 flex flex-col">
                                <span className="font-black">{c.name} ({c.qra})</span>
                                <span className="text-muted-foreground">{c.escala} / {c.turno}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ESCALA PARCEIRO (INVERTIDA AUTOMATICAMENTE) */}
                    <div className="space-y-2 pt-2">
                      <Label className="text-[9px] font-black uppercase text-purple-700 tracking-widest block border-b pb-1">Escala do Parceiro (Automático)</Label>
                      <div className="grid grid-cols-2 gap-3 opacity-80">
                        <div className="grid gap-1">
                          <Label className="text-[8px] font-bold uppercase text-muted-foreground">De (Data Original)</Label>
                          <Input 
                            type="date" 
                            value={permutaMyNewDate} 
                            readOnly 
                            className="h-9 text-[10px] font-bold bg-purple-50 border-purple-100 cursor-not-allowed" 
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-[8px] font-bold uppercase text-muted-foreground">Para (Nova Data)</Label>
                          <Input 
                            type="date" 
                            value={permutaMyOriginalDate} 
                            readOnly 
                            className="h-9 text-[10px] font-bold bg-purple-50 border-purple-100 cursor-not-allowed" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* VALIDAÇÃO DE MÊS */}
                    {hasInvalidPermutaMonth && (
                      <div className="bg-red-50 border border-red-100 rounded-lg p-2.5 flex items-center gap-2 animate-in zoom-in-95">
                        <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                        <p className="text-[10px] font-black uppercase text-red-700">
                          ERRO: A permuta deve ocorrer dentro do mesmo mês calendário.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {["FOLGA", "ABONO TRE", "ESCALA ESPECIAL"].includes(requestType) && (
                   <div className="space-y-2 p-3 bg-muted/10 border rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground">Datas Desejadas ({multiDates.filter(d => d).length})</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setMultiDates([...multiDates, ""])} className="h-5 text-[8px] font-black uppercase text-primary px-2 hover:bg-primary/10">
                        <Plus className="h-3 w-3 mr-1" /> ADICIONAR
                      </Button>
                    </div>
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                      {multiDates.map((date, index) => (
                        <div key={index} className="flex gap-1 group">
                          <Input type="date" value={date} onChange={(e) => { const nd = [...multiDates]; nd[index] = e.target.value; setMultiDates(nd); }} required className="h-8 text-[10px] font-bold" />
                          {multiDates.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => setMultiDates(multiDates.filter((_, i) => i !== index))} className="h-8 w-8 text-destructive/50 hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {requestType === "TROCA DE ESCALA" && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border rounded-xl animate-in slide-in-from-top-2 duration-300">
                    <div className="grid gap-1">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground">De (Data Original)</Label>
                      <Input type="date" value={swapFromDate} onChange={(e) => setSwapFromDate(e.target.value)} required className="h-9 text-[10px] font-bold bg-white" />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground">Para (Nova Data)</Label>
                      <Input type="date" value={swapToDate} onChange={(e) => setSwapToDate(e.target.value)} required className="h-9 text-[10px] font-bold bg-white" />
                    </div>
                  </div>
                )}

                <div className="grid gap-1.5">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground tracking-tight">Justificativa / Observações</Label>
                  <Textarea name="description" placeholder="DETALHE O MOTIVO DA SOLICITAÇÃO..." className="min-h-[60px] uppercase text-[11px] p-3 rounded-xl bg-muted/5 border-muted focus:bg-white transition-colors" required />
                </div>

                <div className="pt-3 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[9px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" /> Chefia Imediata (Ciência)
                    </Label>
                    <Button type="button" variant="ghost" size="sm" onClick={addChefiaRow} className="h-5 text-[8px] font-black uppercase text-primary px-2 hover:bg-primary/5">
                      <Plus className="h-3 w-3 mr-1" /> Adicionar Outra
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {chefiaRows.map((row, index) => (
                      <div key={index} className="flex gap-1.5 relative">
                        <div className="relative flex-1">
                          <Input 
                            placeholder="BUSCAR CHEFIA..."
                            value={row.term}
                            onChange={(e) => updateChefiaRow(index, { term: e.target.value.toUpperCase(), uid: "" })}
                            onFocus={() => updateChefiaRow(index, { show: true })}
                            className="h-8 border-muted uppercase text-[9px] font-bold pr-8"
                          />
                          {row.uid && <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-green-600" />}
                          {row.show && row.term && (
                            <div className="absolute z-[60] left-0 right-0 top-full mt-1 bg-background border rounded-lg shadow-xl max-h-32 overflow-y-auto">
                              {allEmployees?.filter(e => ["INSPETOR", "SUBINSPETOR", "GESTOR DE RH"].includes(normalizeStr(e.role || "")) && (normalizeStr(e.name).includes(row.term) || normalizeStr(e.qra).includes(row.term))).map(c => (
                                <button key={c.id} type="button" onMouseDown={() => updateChefiaRow(index, { uid: c.uid, term: `${c.name} (${c.qra})`, show: false })} className="w-full px-3 py-1.5 text-left hover:bg-muted text-[9px] uppercase border-b last:border-0">
                                  {c.name} ({c.qra})
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {chefiaRows.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removeChefiaRow(index)} className="h-8 w-8 text-destructive/50 hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t p-4 bg-muted/5">
                <Button 
                  type="submit" 
                  disabled={loading || hasInsufficientBalance || hasInsufficientTreBalance || hasInvalidAbonoDate || hasInvalidPermutaMonth} 
                  className="w-full h-11 uppercase font-black text-xs tracking-widest shadow-xl shadow-blue-100 transition-all active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Finalizar e Enviar Solicitação
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6 space-y-4">
          {loadingRequests ? <div className="flex h-32 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
            <div className="grid gap-4">
              {myRequests?.length === 0 && (
                <div className="text-center py-20 uppercase text-[10px] font-bold text-muted-foreground italic tracking-widest">
                  NENHUMA SOLICITAÇÃO ENCONTRADA.
                </div>
              )}
              {myRequests?.map(req => {
                const isApproved = req.status === 'Aprovado';
                const isDenied = req.status === 'Negado';
                const isAwaitingRH = req.status === 'Aprovado pela Chefia';
                
                const isFolga = req.type === "FOLGA";
                const isTre = req.type === "ABONO TRE";
                // Conta datas para exibição de débito
                const dateCount = req.date ? req.date.split(',').length : 0;

                const isSpecialType = ["REPROGRAMAÇÃO DE FÉRIAS", "PERMUTA", "TROCA DE ESCALA"].includes(req.type);

                return (
                  <Card key={req.id} className="card-shadow border-none rounded-xl overflow-hidden hover:shadow-md transition-all group">
                    <div className="flex flex-col sm:flex-row min-h-[120px]">
                      {/* Bloco Lateral de Status */}
                      <div className={cn(
                        "w-full sm:w-32 flex flex-col items-center justify-center p-4 shrink-0 text-white",
                        isApproved ? 'bg-green-600' : 
                        isDenied ? 'bg-red-600' : 
                        isAwaitingRH ? 'bg-blue-600' : 'bg-orange-500'
                      )}>
                        <span className="font-black uppercase text-sm tracking-tight text-center leading-tight mb-2">
                          {req.status}
                        </span>
                        {isApproved ? <CheckCircle2 className="h-7 w-7" /> : <Clock className="h-7 w-7" />}
                      </div>

                      {/* Conteúdo Principal */}
                      <CardContent className="flex-1 p-5 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="space-y-1 w-full">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-2 h-6">
                                <h4 className="font-black uppercase text-base text-slate-900 leading-none">{req.type}</h4>
                                <span className="text-slate-400 font-bold">-</span>
                              </div>
                              
                              {isSpecialType ? (
                                <div className="flex flex-col gap-1.5 w-full sm:w-auto pt-0.5">
                                  {req.date.split('|').map((part: string, i: number) => (
                                    <div key={i} className="bg-blue-50 px-2 py-1 rounded border border-blue-100 w-fit">
                                      <span className="text-[10px] font-black text-blue-700 uppercase">
                                        - {part.trim()}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="bg-blue-50 px-2 py-0.5 rounded border border-blue-100 h-fit self-center">
                                  <span className="text-[10px] font-black text-blue-700 uppercase">{req.date}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <ShieldCheck className="h-3 w-3 text-muted-foreground" />
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                {req.escala || "---"} / {req.turno || "---"}
                              </p>
                              {(isFolga || isTre) && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">
                                    DÉBITO: {isFolga ? `${minutesToHHmm(dateCount * requiredMinutesForFolga)}H` : `${dateCount} DIAS`}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                          <Label className="text-[8px] font-black uppercase text-muted-foreground mb-1 block">Justificativa Enviada:</Label>
                          <p className="text-[11px] text-slate-600 uppercase leading-relaxed italic">
                            "{req.description}"
                          </p>
                        </div>

                        {req.adminResponse && (
                          <div className="bg-blue-50/30 p-3 rounded-lg border-l-4 border-primary animate-in slide-in-from-left-1">
                            <p className="text-[9px] font-black uppercase text-primary mb-1">Resposta RH/Chefia:</p>
                            <p className="text-[11px] uppercase font-bold text-slate-800 leading-snug">{req.adminResponse}</p>
                          </div>
                        )}
                      </CardContent>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {isManagement && (
          <TabsContent value="management" className="mt-6 space-y-3">
            {loadingManagement ? <div className="flex h-32 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
              <div className="grid gap-4">
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  <p className="text-[11px] font-bold uppercase text-blue-800 tracking-tight">PEDIDOS AGUARDANDO SEU PARECER OU DECISÃO DO RH.</p>
                </div>
                {filteredManagementRequests?.length === 0 && (
                  <div className="text-center py-16 uppercase text-[10px] font-bold text-muted-foreground italic tracking-widest border-2 border-dashed rounded-2xl">
                    SUA FILA DE GESTÃO ESTÁ VAZIA.
                  </div>
                )}
                {filteredManagementRequests?.map(req => {
                  const role = normalizeStr(employeeData?.role || "");
                  const isRH = role.includes("GESTOR DE RH");
                  const isPending = req.status === "Pendente";
                  const isAwaitingRH = req.status === "Aprovado pela Chefia";
                  const isChefiaForThis = req.chefiaIds?.includes(user?.uid);
                  const canAct = (isChefiaForThis && isPending) || (isRH && isAwaitingRH);
                  const label = isAwaitingRH ? "APROVAR DEFINITIVO" : "APROVAR PARECER";
                  
                  return (
                    <Card key={req.id} className="card-shadow border-primary/10 rounded-xl overflow-hidden">
                      <div className="flex flex-col sm:flex-row">
                        <div className="sm:w-56 bg-muted/5 p-4 border-b sm:border-b-0 sm:border-r space-y-4 shrink-0">
                          <div className="space-y-1">
                            <p className="text-sm font-black uppercase text-slate-900 leading-tight">{req.employeeName}</p>
                            <p className="text-[11px] font-bold text-primary uppercase">QRA: {req.employeeQra}</p>
                          </div>
                          <div className="space-y-2">
                            <Badge variant="outline" className="text-[9px] uppercase font-bold border-primary/20 text-primary bg-primary/5 px-2 py-0.5">{req.type}</Badge>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{req.escala} / {req.turno}</p>
                          </div>
                          <Badge className="w-full justify-center bg-amber-100 text-amber-700 border-none uppercase text-[9px] font-black h-6">{req.status}</Badge>
                        </div>

                        <div className="flex-1 flex flex-col min-w-0">
                          <CardContent className="p-4 flex-1 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <Label className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
                                  <CalendarDays className="h-3 w-3" /> Data(s) Solicitada(s)
                                </Label>
                                <p className="text-[11px] font-black uppercase text-blue-900 leading-relaxed">
                                  {req.date}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                  <ShieldCheck className="h-3 w-3" /> Chefia para Ciência
                                </Label>
                                <p className="text-[10px] font-bold uppercase text-slate-700 leading-relaxed">
                                  {req.chefiaImediata}
                                </p>
                              </div>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                              <Label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                <FileText className="h-3 w-3" /> Justificativa
                              </Label>
                              <p className="text-[10px] uppercase text-slate-600 leading-relaxed italic">
                                "{req.description}"
                              </p>
                            </div>

                            <div className="pt-2 border-t">
                              <Label className="text-[10px] font-black uppercase text-primary flex items-center gap-1.5 mb-2">
                                <MessageSquare className="h-3 w-3" /> Parecer Administrativo
                              </Label>
                              <Textarea 
                                value={adminResponseDraft[req.id] || ""} 
                                onChange={(e) => setAdminResponseDraft(prev => ({ ...prev, [req.id]: e.target.value }))} 
                                placeholder="DIGITE O PARECER OU RESPOSTA..." 
                                className="min-h-[50px] uppercase text-[10px] p-2 rounded-lg bg-blue-50/10 border-blue-100 resize-none leading-relaxed" 
                              />
                            </div>
                          </CardContent>

                          <CardFooter className="bg-muted/5 p-3 border-t flex items-center justify-end gap-3">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="uppercase text-[10px] font-black text-red-600 h-8 px-4 hover:bg-red-50" 
                              onClick={() => handleProcessRequest(req, 'deny')}
                            >
                              NEGAR
                            </Button>
                            <Button 
                              size="sm" 
                              disabled={!canAct} 
                              className="uppercase text-[10px] font-black h-8 px-6 bg-blue-600 hover:bg-blue-700 shadow-md transition-all active:scale-95" 
                              onClick={() => handleProcessRequest(req, 'approve')}
                            >
                              {label} <ChevronRight className="ml-1 h-3 w-3" />
                            </Button>
                          </CardFooter>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
