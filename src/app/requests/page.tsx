
"use client"

import * as React from "react"
import { 
  Clock, 
  CheckCircle2, 
  Loader2,
  Send,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  User,
  Timer,
  ShieldCheck,
  RefreshCw,
  ArrowRightLeft,
  Users,
  Search,
  Check,
  Info
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
import { useFirestore, useCollection, useAuth } from '@/firebase';
import { collection, addDoc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils"

// Utilitários de cálculo de horas
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

export default function RequestsPage() {
  const firestore = useFirestore();
  const { user, employeeData, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("new");
  
  // Estados do formulário dinâmico
  const [requestType, setRequestType] = React.useState<string>("");
  const [multiDates, setMultiDates] = React.useState<string[]>([""]);
  
  // Estados para Reprogramação de Férias (Intervalos)
  const [currentVacationStart, setCurrentVacationStart] = React.useState("");
  const [currentVacationEnd, setCurrentVacationEnd] = React.useState("");
  const [newVacationStart, setNewVacationStart] = React.useState("");
  const [newVacationEnd, setNewVacationEnd] = React.useState("");

  // Estados para Abono de Aniversário
  const [birthdayDate, setBirthdayDate] = React.useState("");
  const [abonoDate, setAbonoDate] = React.useState("");

  // Estados para Troca de Escala
  const [swapOutDate, setSwapOutDate] = React.useState("");
  const [swapInDate, setSwapInDate] = React.useState("");
  const [swapInShift, setSwapInShift] = React.useState("");

  // Estados para Permuta
  const [permutaOutDate, setPermutaOutDate] = React.useState("");
  const [permutaInDate, setPermutaInDate] = React.useState("");
  const [permutaPartnerId, setPermutaPartnerId] = React.useState("");
  const [searchPartnerTerm, setSearchPartnerTerm] = React.useState("");
  const [showPartnerSuggestions, setShowPartnerSuggestions] = React.useState(false);
  const partnerInputRef = React.useRef<HTMLInputElement>(null);

  // Estados para Chefia Imediata (Múltiplos)
  const [chefiaRows, setChefiaRows] = React.useState([{ id: "", term: "", show: false }]);

  // Consulta de solicitações do usuário
  const requestsRef = React.useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'requests'), 
      where('employeeId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  // Consultas para saldo e validações
  const myLaunchesRef = React.useMemo(() => {
    if (!firestore || !employeeData?.id) return null;
    return query(collection(firestore, 'launches'), where('employeeId', '==', employeeData.id));
  }, [firestore, employeeData?.id]);

  const { data: myLaunches } = useCollection(myLaunchesRef);

  // Cálculo de Saldo Atual (Total no Banco)
  const myBalanceMinutes = React.useMemo(() => {
    if (!myLaunches) return 0;
    return myLaunches.reduce((acc, l) => {
      const type = normalizeStr(l.type || "");
      const minutes = hhmmToMinutes(l.hours || "00:00");
      if (type === "BANCO DE HORAS CREDITO") return acc + minutes;
      if (type === "BANCO DE HORAS DEBITO" || type === "FOLGA") return acc - minutes;
      return acc;
    }, 0);
  }, [myLaunches]);

  // Consultas auxiliares
  const shiftPeriodsRef = React.useMemo(() => firestore ? collection(firestore, 'shiftPeriods') : null, [firestore]);
  const schedulesRef = React.useMemo(() => firestore ? query(collection(firestore, 'schedules'), orderBy('name', 'asc')) : null, [firestore]);
  const shiftsRef = React.useMemo(() => firestore ? query(collection(firestore, 'shifts'), orderBy('name', 'asc')) : null, [firestore]);
  const employeesRef = React.useMemo(() => firestore ? query(collection(firestore, 'employees'), orderBy('name', 'asc')) : null, [firestore]);

  const { data: myRequests, loading: loadingRequests } = useCollection(requestsRef);
  const { data: shiftPeriods } = useCollection(shiftPeriodsRef);
  const { data: allSchedules } = useCollection(schedulesRef);
  const { data: allShifts } = useCollection(shiftsRef);
  const { data: allEmployees } = useCollection(employeesRef);

  // Identificação do período de escala do servidor
  const myShiftPeriod = React.useMemo(() => {
    if (!employeeData?.escala || !shiftPeriods) return null;
    return shiftPeriods.find(p => p.escalaName === employeeData.escala);
  }, [employeeData?.escala, shiftPeriods]);

  // Minutos necessários para uma folga (com base na escala)
  const requiredMinutesForFolga = React.useMemo(() => {
    if (!myShiftPeriod?.duration) return 0;
    return hhmmToMinutes(myShiftPeriod.duration);
  }, [myShiftPeriod]);

  // Simulação de Saldo Restante (Saldo Atual - (Número de Datas * Duração da Escala))
  const simulatedRemainingMinutes = React.useMemo(() => {
    if (requestType !== "FOLGA") return myBalanceMinutes;
    const dateCount = multiDates.filter(d => d).length || 1; // Mínimo de 1 para simulação inicial
    return myBalanceMinutes - (dateCount * requiredMinutesForFolga);
  }, [requestType, myBalanceMinutes, multiDates, requiredMinutesForFolga]);

  // Validação de saldo para o botão (Baseado na simulação)
  const hasInsufficientBalance = React.useMemo(() => {
    if (requestType !== "FOLGA") return false;
    return simulatedRemainingMinutes < 0;
  }, [requestType, simulatedRemainingMinutes]);

  // Combinações de Escala e Turno para o Select
  const shiftCombinations = React.useMemo(() => {
    if (!allSchedules || !allShifts) return [];
    const combos: string[] = [];
    allSchedules.forEach(s => {
      allShifts.forEach(sh => {
        combos.push(`${s.name} - ${sh.name}`);
      });
    });
    return combos.sort();
  }, [allSchedules, allShifts]);

  // Filtro de comando para Chefia Imediata
  const filteredChefias = React.useMemo(() => {
    if (!allEmployees) return [];
    const validRoles = ["INSPETOR GERAL", "INSPETOR", "SUBINSPETOR", "GESTOR DE RH"];
    return allEmployees.filter(emp => 
      validRoles.includes(normalizeStr(emp.role || ""))
    );
  }, [allEmployees]);

  // Parceiros para permuta
  const filteredPartners = React.useMemo(() => {
    if (!allEmployees || !searchPartnerTerm) return [];
    const term = searchPartnerTerm.toLowerCase();
    return allEmployees.filter(emp => 
      emp.uid !== user?.uid && (
        emp.name?.toLowerCase().includes(term) || 
        emp.qra?.toLowerCase().includes(term) ||
        emp.matricula?.toLowerCase().includes(term)
      )
    ).slice(0, 5);
  }, [allEmployees, searchPartnerTerm, user?.uid]);

  const permutaPartner = React.useMemo(() => {
    if (!permutaPartnerId || !allEmployees) return null;
    return allEmployees.find(e => e.id === permutaPartnerId);
  }, [permutaPartnerId, allEmployees]);

  const partnerShiftPeriod = React.useMemo(() => {
    if (!permutaPartner?.escala || !shiftPeriods) return null;
    return shiftPeriods.find(p => p.escalaName === permutaPartner.escala);
  }, [permutaPartner?.escala, shiftPeriods]);

  const addDateRow = () => setMultiDates([...multiDates, ""]);
  const removeDateRow = (index: number) => {
    const newDates = multiDates.filter((_, i) => i !== index);
    setMultiDates(newDates.length ? newDates : [""]);
  };
  const updateDate = (index: number, val: string) => {
    const newDates = [...multiDates];
    newDates[index] = val;
    setMultiDates(newDates);
  };

  // Funções para Chefia Imediata
  const addChefiaRow = () => setChefiaRows([...chefiaRows, { id: "", term: "", show: false }]);
  const removeChefiaRow = (index: number) => {
    const newRows = chefiaRows.filter((_, i) => i !== index);
    setChefiaRows(newRows.length ? newRows : [{ id: "", term: "", show: false }]);
  };
  const updateChefiaRow = (index: number, updates: Partial<{id: string, term: string, show: boolean}>) => {
    setChefiaRows(prev => {
      const newRows = [...prev];
      newRows[index] = { ...newRows[index], ...updates };
      return newRows;
    });
  };

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return "";
    return dateStr.split('-').reverse().join('/');
  };

  async function handleSendRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!firestore || !user) {
      toast({ variant: "destructive", title: "ERRO", description: "USUÁRIO NÃO AUTENTICADO." });
      return;
    }

    if (hasInsufficientBalance) {
      toast({ variant: "destructive", title: "SALDO INSUFICIENTE", description: "VOCÊ NÃO POSSUI BANCO DE HORAS SUFICIENTE PARA SOLICITAR ESTA FOLGA." });
      return;
    }

    // Validação obrigatória: pelo menos uma chefia com ID selecionado
    const selectedChefias = chefiaRows.filter(r => r.id);
    if (selectedChefias.length === 0) {
      toast({ variant: "destructive", title: "ATENÇÃO", description: "SELECIONE AO MENOS UMA CHEFIA IMEDIATA DA LISTA." });
      return;
    }

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const description = (formData.get('description') as string || "").toUpperCase();
    
    let finalDate = "";

    if (requestType === "FOLGA" || requestType === "ABONO TRE" || requestType === "ESCALA ESPECIAL") {
      finalDate = multiDates.filter(d => d).map(d => formatDateBR(d)).join(", ");
    } else if (requestType === "REPROGRAMAÇÃO DE FÉRIAS") {
      finalDate = `AGENDADO: ${formatDateBR(currentVacationStart)} À ${formatDateBR(currentVacationEnd)} | REPROGRAMAR PARA: ${formatDateBR(newVacationStart)} À ${formatDateBR(newVacationEnd)}`;
    } else if (requestType === "ABONO DE ANIVERSÁRIO") {
      finalDate = `ANIVERSÁRIO: ${formatDateBR(birthdayDate)} | SOLICITADO PARA: ${formatDateBR(abonoDate)}`;
    } else if (requestType === "TROCA DE ESCALA") {
      const myInfo = `${employeeData?.escala || "N/A"} - ${employeeData?.turno || "N/A"}`;
      finalDate = `SAI DO DIA: ${formatDateBR(swapOutDate)} (ESC: ${myInfo}) | ENTRA NO DIA: ${formatDateBR(swapInDate)} (ESC: ${swapInShift.toUpperCase()})`;
    } else if (requestType === "PERMUTA") {
      const myInfo = `${employeeData?.escala || "N/A"} - ${employeeData?.turno || "N/A"}`;
      const partnerInfo = `${permutaPartner?.name} (${permutaPartner?.escala} - ${permutaPartner?.turno})`;
      finalDate = `PERMUTA COM: ${partnerInfo.toUpperCase()} | EU SAI EM: ${formatDateBR(permutaOutDate)} (ESC: ${myInfo}) | EU ENTRO EM: ${formatDateBR(permutaInDate)} (ESC PARCEIRO)`;
    } else {
      finalDate = formatDateBR(formData.get('date') as string || "");
    }

    const chefiaNames = selectedChefias.map(c => c.term).join(" / ");

    const newRequest = {
      employeeId: user.uid,
      employeeName: (employeeData?.name || user.displayName || "USUÁRIO NRH").toUpperCase(),
      type: requestType,
      date: finalDate,
      description: description,
      status: "Pendente",
      chefiaImediata: chefiaNames,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(firestore, 'requests'), newRequest);
      toast({
        title: "SOLICITAÇÃO ENVIADA!",
        description: "SEU PEDIDO FOI REGISTRADO COM SUCESSO.",
      });
      setActiveTab("history");
      resetForm();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "ERRO AO ENVIAR",
        description: "NÃO FOI POSSÍVEL PROCESSAR SUA SOLICITAÇÃO.",
      });
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
    setRequestType("");
    setMultiDates([""]);
    setCurrentVacationStart("");
    setCurrentVacationEnd("");
    setNewVacationStart("");
    setNewVacationEnd("");
    setBirthdayDate("");
    setAbonoDate("");
    setSwapOutDate("");
    setSwapInDate("");
    setSwapInShift("");
    setPermutaOutDate("");
    setPermutaInDate("");
    setPermutaPartnerId("");
    setSearchPartnerTerm("");
    setChefiaRows([{ id: "", term: "", show: false }]);
  };

  const isMultiDateType = ["FOLGA", "ABONO TRE", "ESCALA ESPECIAL"].includes(requestType);
  const isReprogrammingType = requestType === "REPROGRAMAÇÃO DE FÉRIAS";
  const isBirthdayType = requestType === "ABONO DE ANIVERSÁRIO";
  const isSwapType = requestType === "TROCA DE ESCALA";
  const isPermutaType = requestType === "PERMUTA";

  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight uppercase text-primary">SOLICITAÇÕES OPERACIONAIS</h2>
        <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">CENTRAL DE REQUERIMENTOS AO NÚCLEO DE RH.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px] h-11 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="new" className="rounded-lg uppercase text-[10px] font-bold">NOVA SOLICITAÇÃO</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg uppercase text-[10px] font-bold">HISTÓRICO</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-6 space-y-6">
          <Card className="card-shadow border-none rounded-2xl overflow-hidden">
            <form onSubmit={handleSendRequest}>
              <CardHeader className="bg-primary/5 border-b">
                <CardTitle className="text-lg uppercase font-bold">Formulário de Requerimento</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">
                  Preencha os campos abaixo conforme a sua necessidade.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-8">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/20 border rounded-xl mb-6">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                      <User className="h-3 w-3" /> SERVIDOR SOLICITANTE
                    </Label>
                    <p className="text-sm font-black uppercase text-slate-900 leading-tight">{employeeData?.name || "CARREGANDO..."}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">MATRÍCULA: {employeeData?.matricula || "---"}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                      <Timer className="h-3 w-3" /> ESCALA E HORÁRIO
                    </Label>
                    <p className="text-sm font-black uppercase text-primary leading-tight">
                      {employeeData?.escala || "NÃO DEFINIDA"} {employeeData?.turno ? `- ${employeeData.turno}` : ""}
                    </p>
                    {myShiftPeriod ? (
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {myShiftPeriod.startTime} ÀS {myShiftPeriod.endTime} ({myShiftPeriod.duration}H)
                      </p>
                    ) : (
                      <p className="text-[10px] font-bold text-destructive uppercase italic tracking-tight">HORÁRIO NÃO CONFIGURADO NO RH</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="requestType" className="text-[10px] font-bold uppercase text-muted-foreground">TIPO DE SOLICITAÇÃO</Label>
                    <Select value={requestType} onValueChange={setRequestType} required>
                      <SelectTrigger id="requestType" className="h-11 uppercase text-[11px] font-bold">
                        <SelectValue placeholder="SELECIONE..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FOLGA" className="uppercase text-[11px]">FOLGA</SelectItem>
                        <SelectItem value="ABONO DE ANIVERSÁRIO" className="uppercase text-[11px]">ABONO DE ANIVERSÁRIO</SelectItem>
                        <SelectItem value="ABONO TRE" className="uppercase text-[11px]">ABONO TRE</SelectItem>
                        <SelectItem value="REPROGRAMAÇÃO DE FÉRIAS" className="uppercase text-[11px]">REPROGRAMAÇÃO DE FÉRIAS</SelectItem>
                        <SelectItem value="ESCALA ESPECIAL" className="uppercase text-[11px]">ESCALA ESPECIAL</SelectItem>
                        <SelectItem value="TROCA DE ESCALA" className="uppercase text-[11px]">TROCA DE ESCALA</SelectItem>
                        <SelectItem value="PERMUTA" className="uppercase text-[11px]">PERMUTA</SelectItem>
                        <SelectItem value="OUTROS" className="uppercase text-[11px]">OUTROS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {requestType === "FOLGA" && (
                    <div className="grid gap-2 animate-in slide-in-from-left-2 duration-300">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">PREVISÃO DE SALDO (SIMULADO)</Label>
                      <div className={cn(
                        "h-11 flex flex-col justify-center px-4 rounded-xl border-2 font-black uppercase",
                        hasInsufficientBalance ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"
                      )}>
                        <div className="flex items-center w-full">
                          <span className="text-[11px]">{minutesToHHmm(simulatedRemainingMinutes)}H DISPONÍVEIS</span>
                          {hasInsufficientBalance ? <AlertCircle className="ml-auto h-4 w-4" /> : <CheckCircle2 className="ml-auto h-4 w-4" />}
                        </div>
                      </div>
                      <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">Saldo previsto após o usufruto das datas selecionadas.</p>
                    </div>
                  )}

                  {!isMultiDateType && !isReprogrammingType && !isBirthdayType && !isSwapType && !isPermutaType && requestType !== "FOLGA" && (
                    <div className="grid gap-2">
                      <Label htmlFor="date" className="text-[10px] font-bold uppercase text-muted-foreground">DATA PREVISTA</Label>
                      <Input id="date" name="date" type="date" required className="h-11" />
                    </div>
                  )}
                </div>

                {(isMultiDateType || requestType === "FOLGA") && (
                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">DATAS SOLICITADAS ({multiDates.length})</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addDateRow} className="h-8 text-[10px] font-bold uppercase gap-2">
                        <Plus className="h-3 w-3" /> ADICIONAR DATA
                      </Button>
                    </div>
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                      {multiDates.map((date, index) => (
                        <div key={index} className="flex gap-2">
                          <Input 
                            type="date" 
                            value={date} 
                            onChange={(e) => updateDate(index, e.target.value)}
                            required
                            className="h-11 font-medium" 
                          />
                          {multiDates.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeDateRow(index)} className="h-11 w-11 text-destructive shrink-0">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    {requestType === "FOLGA" && hasInsufficientBalance && (
                      <div className="bg-red-100 border border-red-200 p-4 rounded-xl flex items-start gap-3 mt-4 animate-bounce">
                        <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                        <div className="space-y-1">
                          <p className="text-[11px] font-black uppercase text-red-900 tracking-tight">Simulação Negativa</p>
                          <p className="text-[10px] text-red-700 font-bold uppercase leading-tight">
                            Consumo total: {multiDates.filter(d => d).length * (myShiftPeriod?.duration ? hhmmToMinutes(myShiftPeriod.duration) / 60 : 0)} horas. 
                            Saldo atual: {minutesToHHmm(myBalanceMinutes)}H. 
                            Você não possui horas suficientes para cobrir todas as datas selecionadas.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isBirthdayType && (
                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-blue-700 font-bold uppercase leading-tight">
                        Informe sua data de aniversário para validação do abono e o dia em que deseja usufruir da folga.
                      </p>
                    </div>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">DATA DE ANIVERSÁRIO</Label>
                        <Input 
                          type="date" 
                          value={birthdayDate} 
                          onChange={(e) => setBirthdayDate(e.target.value)} 
                          required 
                          className="h-11" 
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">DATA DA FOLGA (ABONO)</Label>
                        <Input 
                          type="date" 
                          value={abonoDate} 
                          onChange={(e) => setAbonoDate(e.target.value)} 
                          required 
                          min={birthdayDate}
                          className="h-11 border-blue-200 bg-blue-50/20" 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {isReprogrammingType && (
                  <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-700 font-bold uppercase leading-tight">
                        Informe os períodos de início e fim que já estavam agendados e os novos períodos desejados.
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase text-primary tracking-widest block border-b pb-1">PERÍODO ATUALMENTE AGENDADO</Label>
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                          <Label className="text-[9px] font-bold uppercase text-muted-foreground">DATA INÍCIO ATUAL</Label>
                          <Input type="date" value={currentVacationStart} onChange={(e) => setCurrentVacationStart(e.target.value)} required className="h-11" />
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-[9px] font-bold uppercase text-muted-foreground">DATA FIM ATUAL</Label>
                          <Input type="date" value={currentVacationEnd} onChange={(e) => setCurrentVacationEnd(e.target.value)} required className="h-11" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <Label className="text-[10px] font-black uppercase text-blue-600 tracking-widest block border-b pb-1 border-blue-100">NOVO PERÍODO DESEJADO</Label>
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                          <Label className="text-[9px] font-bold uppercase text-muted-foreground">NOVA DATA INÍCIO</Label>
                          <Input type="date" value={newVacationStart} onChange={(e) => setNewVacationStart(e.target.value)} required className="h-11 border-blue-200 bg-blue-50/20" />
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-[9px] font-bold uppercase text-muted-foreground">NOVA DATA FIM</Label>
                          <Input type="date" value={newVacationEnd} onChange={(e) => setNewVacationEnd(e.target.value)} required className="h-11 border-blue-200 bg-blue-50/20" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isSwapType && (
                  <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-start gap-3">
                      <ArrowRightLeft className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-slate-700 font-bold uppercase leading-tight">
                        Informe a data do seu serviço original e a data do serviço que você está assumindo.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 p-4 border rounded-xl bg-muted/5">
                      <div className="grid gap-1.5">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">DATA DO SERVIÇO A TROCAR (SAÍDA)</Label>
                        <Input 
                          type="date" 
                          value={swapOutDate} 
                          onChange={(e) => setSwapOutDate(e.target.value)} 
                          required 
                          className="h-11" 
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">MINHA ESCALA/TURNO</Label>
                        <Input 
                          value={`${employeeData?.escala || "N/A"} - ${employeeData?.turno || "N/A"}`} 
                          readOnly 
                          className="h-11 bg-muted/30 font-bold uppercase text-[10px] cursor-not-allowed" 
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 p-4 border rounded-xl bg-blue-50/10 border-blue-100">
                      <div className="grid gap-1.5">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">DATA QUE IRÁ TRABALHAR (ENTRADA)</Label>
                        <Input 
                          type="date" 
                          value={swapInDate} 
                          onChange={(e) => setSwapInDate(e.target.value)} 
                          required 
                          className="h-11 border-blue-200" 
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">ESCALA/TURNO DO SERVIÇO (DESTINO)</Label>
                        <Select value={swapInShift} onValueChange={setSwapInShift} required>
                          <SelectTrigger className="h-11 border-blue-200 uppercase text-[10px]">
                            <SelectValue placeholder="SELECIONE..." />
                          </SelectTrigger>
                          <SelectContent>
                            {shiftCombinations.map((combo) => (
                              <SelectItem key={combo} value={combo} className="uppercase text-[10px]">
                                {combo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {isPermutaType && (
                  <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-start gap-3">
                      <ArrowRightLeft className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-slate-700 font-bold uppercase leading-tight">
                        Informe as datas da troca. O sistema espelhará automaticamente os períodos para o parceiro selecionado.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 p-4 border rounded-xl bg-muted/5">
                      <div className="grid gap-1.5">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">DATA QUE EU IRIA TRABALHAR (MINHA SAÍDA)</Label>
                        <Input 
                          type="date" 
                          value={permutaOutDate} 
                          onChange={(e) => setPermutaOutDate(e.target.value)} 
                          required 
                          className="h-11" 
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">DATA QUE PASSAREI A TRABALHAR (MINHA ENTRADA)</Label>
                        <Input 
                          type="date" 
                          value={permutaInDate} 
                          onChange={(e) => setPermutaInDate(e.target.value)} 
                          required 
                          className="h-11" 
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 p-4 border rounded-xl bg-blue-50/10 border-blue-100">
                      <div className="grid gap-1.5 relative">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">PARCEIRO DA PERMUTA</Label>
                        <div className="relative">
                          <Input 
                            ref={partnerInputRef}
                            placeholder="BUSCAR POR QRA OU NOME COMPLETO..."
                            value={searchPartnerTerm}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              setSearchPartnerTerm(val);
                              setShowPartnerSuggestions(true);
                              if (!val) setPermutaPartnerId("");
                            }}
                            onFocus={() => setShowPartnerSuggestions(true)}
                            className="h-11 border-blue-200 uppercase text-[10px] pr-10"
                          />
                          {permutaPartnerId && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Check className="h-4 w-4 text-green-600" />
                            </div>
                          )}
                        </div>

                        {showPartnerSuggestions && searchPartnerTerm && (
                          <div className="absolute z-[60] left-0 right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-2xl max-h-48 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                            {filteredPartners.length > 0 ? (
                              filteredPartners.map(p => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setPermutaPartnerId(p.id);
                                    setSearchPartnerTerm(`${p.name} (${p.qra}) - ${p.escala} / ${p.turno}`);
                                    setShowPartnerSuggestions(false);
                                  }}
                                  className="w-full px-4 py-3 text-left hover:bg-blue-50/50 flex flex-col border-b last:border-0 transition-colors"
                                >
                                  <span className="text-[11px] font-bold text-foreground uppercase">{p.name}</span>
                                  <span className="text-[9px] text-muted-foreground uppercase mt-0.5">QRA: {p.qra} • {p.escala} - {p.turno}</span>
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-[10px] text-muted-foreground italic uppercase text-center">
                                NENHUM SERVIDOR ENCONTRADO
                              </div>
                            )}
                          </div>
                        )}
                        {showPartnerSuggestions && (
                          <div className="fixed inset-0 z-[55]" onClick={() => setShowPartnerSuggestions(false)} />
                        )}
                        
                        {permutaPartner && (
                          <div className="mt-2 flex flex-col gap-1">
                             <div className="flex items-center gap-2">
                               <Timer className="h-3 w-3 text-blue-600" />
                               <span className="text-[10px] font-bold text-blue-700 uppercase">
                                 HORÁRIO DO PARCEIRO: {partnerShiftPeriod ? `${partnerShiftPeriod.startTime} ÀS ${partnerShiftPeriod.endTime} (${partnerShiftPeriod.duration}H)` : "NÃO CONFIGURADO"}
                               </span>
                             </div>
                             <div className="flex items-center gap-2">
                               <ShieldCheck className="h-3 w-3 text-primary/70" />
                               <span className="text-[10px] font-bold text-slate-600 uppercase">
                                 ESCALA: {permutaPartner.escala} | TURNO: {permutaPartner.turno}
                               </span>
                             </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="grid gap-4 sm:grid-cols-2 mt-2">
                        <div className="grid gap-1.5">
                          <Label className="text-[9px] font-bold uppercase text-muted-foreground">PARCEIRO TRABALHA NO DIA (ENTRADA)</Label>
                          <Input 
                            value={formatDateBR(permutaOutDate)} 
                            readOnly 
                            className="h-11 bg-blue-100/30 font-bold uppercase text-[10px] cursor-not-allowed" 
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-[9px] font-bold uppercase text-muted-foreground">PARCEIRO SAI DO DIA (SAÍDA)</Label>
                          <Input 
                            value={formatDateBR(permutaInDate)} 
                            readOnly 
                            className="h-11 bg-blue-100/30 font-bold uppercase text-[10px] cursor-not-allowed" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="description" className="text-[10px] font-bold uppercase text-muted-foreground">JUSTIFICATIVA / DETALHES ADICIONAIS</Label>
                  <Textarea 
                    id="description" 
                    name="description"
                    placeholder="DESCREVA DETALHADAMENTE O SEU PEDIDO..." 
                    className="min-h-[120px] uppercase text-xs p-4 rounded-xl resize-none"
                    required
                  />
                </div>

                {/* Seção de Chefia Imediata (Múltiplos) */}
                <div className="space-y-4 pt-4 border-t mt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">CHEFIA IMEDIATA (CIÊNCIA)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addChefiaRow} className="h-8 text-[10px] font-bold uppercase gap-2">
                      <Plus className="h-3 w-3" /> ADICIONAR CHEFIA
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {chefiaRows.map((row, index) => {
                      const searchResults = filteredChefias.filter(c => 
                        row.term && (
                          c.name?.toLowerCase().includes(row.term.toLowerCase()) || 
                          c.qra?.toLowerCase().includes(row.term.toLowerCase())
                        )
                      ).slice(0, 5);

                      return (
                        <div key={index} className="space-y-2 relative">
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Input 
                                placeholder="BUSCAR CHEFIA POR QRA OU NOME..."
                                value={row.term}
                                onChange={(e) => {
                                  const val = e.target.value.toUpperCase();
                                  updateChefiaRow(index, { term: val, id: "" }); // Reseta o ID se o usuário digitar
                                }}
                                onFocus={() => updateChefiaRow(index, { show: true })}
                                className="h-11 border-muted uppercase text-[10px] pr-10"
                              />
                              {row.id && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                  <Check className="h-4 w-4 text-green-600" />
                                </div>
                              )}
                            </div>
                            {chefiaRows.length > 1 && (
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeChefiaRow(index)} className="h-11 w-11 text-destructive shrink-0">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          {row.show && row.term && (
                            <div className="absolute z-[60] left-0 right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-2xl max-h-48 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                              {searchResults.length > 0 ? (
                                searchResults.map(c => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault(); // Importante para não perder o foco e fechar antes de selecionar
                                      updateChefiaRow(index, {
                                        id: c.id,
                                        term: `${c.name} (${c.qra}) - ${c.role}`,
                                        show: false
                                      });
                                    }}
                                    className="w-full px-4 py-3 text-left hover:bg-blue-50/50 flex flex-col border-b last:border-0 transition-colors"
                                  >
                                    <span className="text-[11px] font-bold text-foreground uppercase">{c.name}</span>
                                    <span className="text-[9px] text-muted-foreground uppercase mt-0.5">QRA: {c.qra} • CARGO: {c.role}</span>
                                  </button>
                                ))
                              ) : (
                                <div className="px-4 py-3 text-[10px] text-muted-foreground italic uppercase text-center">
                                  NENHUMA CHEFIA ENCONTRADA
                                </div>
                              )}
                            </div>
                          )}
                          {row.show && (
                            <div className="fixed inset-0 z-[55]" onClick={() => updateChefiaRow(index, { show: false })} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 border-t p-6 bg-muted/5">
                <Button variant="outline" type="button" onClick={resetForm} className="w-full sm:w-auto uppercase font-bold text-[10px] h-11 px-8 rounded-xl">LIMPAR</Button>
                <Button 
                  type="submit" 
                  disabled={loading || !requestType || hasInsufficientBalance} 
                  variant={hasInsufficientBalance ? "destructive" : "default"}
                  className={cn(
                    "w-full sm:w-auto uppercase font-bold text-[10px] h-11 px-8 rounded-xl shadow-lg transition-all",
                    !hasInsufficientBalance && "shadow-primary/20",
                    hasInsufficientBalance && "shadow-destructive/20 active:scale-100"
                  )}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {hasInsufficientBalance ? `SALDO INSUFICIENTE (PREVISÃO NEGATIVA)` : "ENVIAR SOLICITAÇÃO"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6 space-y-4">
          {loadingRequests ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !myRequests || myRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-3xl bg-slate-50/50">
              <Calendar className="h-12 w-12 text-muted/30 mb-4" />
              <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">Você ainda não enviou nenhuma solicitação.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myRequests.map((req) => (
                <Card key={req.id} className="card-shadow border-none rounded-2xl overflow-hidden hover:bg-slate-50 transition-colors">
                  <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 gap-4">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "p-3 rounded-2xl shrink-0",
                        req.status === 'Aprovado' ? 'bg-green-100 text-green-700' : 
                        req.status === 'Negado' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      )}>
                        {req.status === 'Aprovado' ? <CheckCircle2 className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black uppercase text-sm tracking-tight text-slate-900">{req.type}</span>
                          <Badge variant="outline" className="font-mono text-[9px] uppercase font-bold tracking-tighter bg-white">ID: {req.id.slice(0, 5)}</Badge>
                        </div>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-tight">{req.date}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1 uppercase font-medium mt-1">{req.description}</p>
                        {req.chefiaImediata && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <ShieldCheck className="h-3 w-3 text-slate-400" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase">CHEFIA: {req.chefiaImediata}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                      <Badge className={cn(
                        "uppercase text-[10px] font-black px-3 py-1 rounded-lg border-none",
                        req.status === 'Aprovado' ? 'bg-green-600' : 
                        req.status === 'Negado' ? 'bg-red-600' : 'bg-amber-500'
                      )}>
                        {req.status}
                      </Badge>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">
                        {req.createdAt?.toDate ? new Intl.DateTimeFormat('pt-BR').format(req.createdAt.toDate()) : '---'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
