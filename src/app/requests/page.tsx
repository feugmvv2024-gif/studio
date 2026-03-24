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
  Info,
  ChevronRight,
  Sparkles,
  MessageSquare
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
import { operationalRequestResponseAssistant } from "@/ai/flows/operational-request-response-assistant"

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
  
  // Estados específicos de tipos de pedido
  const [currentVacationStart, setCurrentVacationStart] = React.useState("");
  const [currentVacationEnd, setCurrentVacationEnd] = React.useState("");
  const [newVacationStart, setNewVacationStart] = React.useState("");
  const [newVacationEnd, setNewVacationEnd] = React.useState("");
  const [birthdayDate, setBirthdayDate] = React.useState("");
  const [abonoDate, setAbonoDate] = React.useState("");
  const [swapOutDate, setSwapOutDate] = React.useState("");
  const [swapInDate, setSwapInDate] = React.useState("");
  const [swapInShift, setSwapInShift] = React.useState("");
  const [permutaOutDate, setPermutaOutDate] = React.useState("");
  const [permutaInDate, setPermutaInDate] = React.useState("");
  const [chefiaRows, setChefiaRows] = React.useState([{ id: "", uid: "", term: "", show: false }]);
  
  // Estados de Gestão
  const [aiLoadingId, setAiLoadingId] = React.useState<string | null>(null);
  const [adminResponseDraft, setAdminResponseDraft] = React.useState<{ [key: string]: string }>({});

  // Consultas de pedidos do próprio servidor
  const requestsQuery = React.useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'requests'), where('employeeId', '==', user.uid), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const { data: myRequests, loading: loadingRequests } = useCollection(requestsQuery);

  // Consulta de Gestão (Hierárquica)
  const managementQuery = React.useMemo(() => {
    if (!firestore || !user || !employeeData) return null;
    const role = normalizeStr(employeeData.role || "");
    const isRH = role.includes("GESTOR DE RH");
    
    // Se for RH, vê o que a chefia aprovou ou o que está pendente de RH
    if (isRH) {
      return query(collection(firestore, 'requests'), where('status', 'in', ['Aprovado pela Chefia', 'Pendente']));
    }
    
    // Se for Chefia (Inspetor, etc), vê o que está pendente onde seu UID está na lista
    return query(collection(firestore, 'requests'), where('chefiaIds', 'array-contains', user.uid), where('status', '==', 'Pendente'));
  }, [firestore, user, employeeData]);

  const { data: managementRequests, loading: loadingManagement } = useCollection(managementQuery);

  const allEmployeesRef = React.useMemo(() => firestore ? collection(firestore, 'employees') : null, [firestore]);
  const { data: allEmployees } = useCollection(allEmployeesRef);

  const myLaunchesRef = React.useMemo(() => {
    if (!firestore || !employeeData?.id) return null;
    return query(collection(firestore, 'launches'), where('employeeId', '==', employeeData.id));
  }, [firestore, employeeData?.id]);
  const { data: myLaunches } = useCollection(myLaunchesRef);

  const shiftPeriodsRef = React.useMemo(() => firestore ? collection(firestore, 'shiftPeriods') : null, [firestore]);
  const { data: shiftPeriods } = useCollection(shiftPeriodsRef);

  const myShiftPeriod = React.useMemo(() => {
    if (!employeeData?.escala || !shiftPeriods) return null;
    return shiftPeriods.find(p => p.escalaName === employeeData.escala);
  }, [employeeData?.escala, shiftPeriods]);

  const requiredMinutesForFolga = React.useMemo(() => myShiftPeriod?.duration ? hhmmToMinutes(myShiftPeriod.duration) : 0, [myShiftPeriod]);

  const reservedMinutes = React.useMemo(() => {
    if (!myRequests || !requiredMinutesForFolga) return 0;
    return myRequests
      .filter(req => req.status === "Pendente" && req.type === "FOLGA")
      .reduce((acc, req) => acc + (req.date ? req.date.split(',').length * requiredMinutesForFolga : 0), 0);
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

  const hasInsufficientBalance = requestType === "FOLGA" && simulatedRemainingMinutes < 0;

  const isManagement = React.useMemo(() => {
    if (!employeeData) return false;
    const role = normalizeStr(employeeData.role || "");
    const managementRoles = ["INSPETOR GERAL", "INSPETOR", "SUBINSPETOR", "GESTOR DE RH"];
    return managementRoles.includes(role);
  }, [employeeData]);

  // Handlers
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

  const formatDateBR = (dateStr: string) => dateStr ? dateStr.split('-').reverse().join('/') : "";

  async function handleSendRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!firestore || !user) return;

    const selectedChefias = chefiaRows.filter(r => r.uid);
    if (selectedChefias.length === 0) {
      toast({ variant: "destructive", title: "ATENÇÃO", description: "SELECIONE AO MENOS UMA CHEFIA DA LISTA." });
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
      finalDate = `SAI: ${formatDateBR(swapOutDate)} | ENTRA: ${formatDateBR(swapInDate)} (${swapInShift.toUpperCase()})`;
    } else if (requestType === "PERMUTA") {
      finalDate = `PERMUTA COM PARCEIRO | EU SAI: ${formatDateBR(permutaOutDate)} | EU ENTRO: ${formatDateBR(permutaInDate)}`;
    } else {
      finalDate = formatDateBR(formData.get('date') as string || "");
    }

    const newRequest = {
      employeeId: user.uid,
      employeeName: (employeeData?.name || "USUÁRIO").toUpperCase(),
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
  };

  // Lógica de Gestão
  async function handleProcessRequest(requestId: string, action: 'approve' | 'deny' | 'review') {
    if (!firestore || !employeeData) return;
    
    const role = normalizeStr(employeeData.role || "");
    const isRH = role.includes("GESTOR DE RH");
    
    let nextStatus = "";
    if (action === 'deny') nextStatus = "Negado";
    else if (action === 'review') nextStatus = "Em Revisão";
    else {
      nextStatus = isRH ? "Aprovado" : "Aprovado pela Chefia";
    }

    const response = adminResponseDraft[requestId] || "";
    
    try {
      await updateDoc(doc(firestore, 'requests', requestId), {
        status: nextStatus,
        adminResponse: response.toUpperCase(),
        updatedAt: serverTimestamp()
      });
      toast({ title: "SOLICITAÇÃO PROCESSADA", description: `STATUS: ${nextStatus.toUpperCase()}` });
    } catch (err) {
      toast({ variant: "destructive", title: "ERRO AO PROCESSAR" });
    }
  }

  async function handleAskIA(request: any) {
    setAiLoadingId(request.id);
    try {
      const response = await operationalRequestResponseAssistant({
        requestType: request.type,
        requestDetails: request.description,
        employeeName: request.employeeName,
        currentStatus: request.status,
        adminNotes: "Analise a pertinência operacional com base nas regras de RH."
      });
      setAdminResponseDraft(prev => ({ ...prev, [request.id]: response.suggestedResponse }));
      toast({ title: "SUGESTÃO DA IA GERADA", icon: <Sparkles className="h-4 w-4 text-primary" /> });
    } catch (err) {
      toast({ variant: "destructive", title: "IA INDISPONÍVEL NO MOMENTO" });
    } finally {
      setAiLoadingId(null);
    }
  }

  if (authLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight uppercase text-primary">REQUERIMENTOS</h2>
        <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">CENTRAL DE SOLICITAÇÕES OPERACIONAIS GMVV.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={cn(
          "grid w-full bg-muted/50 p-1 rounded-xl",
          isManagement ? "grid-cols-3 lg:w-[600px]" : "grid-cols-2 lg:w-[400px]"
        )}>
          <TabsTrigger value="new" className="rounded-lg uppercase text-[10px] font-bold">NOVA SOLICITAÇÃO</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg uppercase text-[10px] font-bold">HISTÓRICO</TabsTrigger>
          {isManagement && <TabsTrigger value="management" className="rounded-lg uppercase text-[10px] font-bold text-primary">GESTÃO DE REQUERIMENTOS</TabsTrigger>}
        </TabsList>

        <TabsContent value="new" className="mt-6">
           <Card className="card-shadow border-none rounded-2xl overflow-hidden">
            <form onSubmit={handleSendRequest}>
              <CardHeader className="bg-primary/5 border-b">
                <CardTitle className="text-lg uppercase font-bold">Formulário de Requerimento</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">PREENCHA OS CAMPOS CONFORME A SUA NECESSIDADE.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-8">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/20 border rounded-xl">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">SERVIDOR SOLICITANTE</Label>
                    <p className="text-sm font-black uppercase text-slate-900">{employeeData?.name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">ESCALA ATUAL</Label>
                    <p className="text-sm font-black uppercase text-primary">{employeeData?.escala} - {employeeData?.turno}</p>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">TIPO DE SOLICITAÇÃO</Label>
                    <Select value={requestType} onValueChange={setRequestType} required>
                      <SelectTrigger className="h-11 uppercase text-[11px] font-bold">
                        <SelectValue placeholder="SELECIONE..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FOLGA" className="uppercase text-[11px]">FOLGA (BANCO DE HORAS)</SelectItem>
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
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">SALDO LÍQUIDO DISPONÍVEL</Label>
                      <div className={cn(
                        "h-11 flex items-center px-4 rounded-xl border-2 font-black text-[11px] uppercase",
                        hasInsufficientBalance ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"
                      )}>
                        {minutesToHHmm(simulatedRemainingMinutes)}H DISPONÍVEIS
                      </div>
                    </div>
                  )}
                </div>

                {["FOLGA", "ABONO TRE", "ESCALA ESPECIAL"].includes(requestType) && (
                   <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">DATAS SOLICITADAS ({multiDates.length})</Label>
                      <Button type="button" variant="outline" size="sm" onClick={() => setMultiDates([...multiDates, ""])} className="h-8 text-[10px] font-bold uppercase">
                        + ADICIONAR DATA
                      </Button>
                    </div>
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                      {multiDates.map((date, index) => (
                        <div key={index} className="flex gap-2">
                          <Input type="date" value={date} onChange={(e) => { const nd = [...multiDates]; nd[index] = e.target.value; setMultiDates(nd); }} required className="h-11" />
                          {multiDates.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => setMultiDates(multiDates.filter((_, i) => i !== index))} className="h-11 text-destructive"><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">JUSTIFICATIVA</Label>
                  <Textarea name="description" placeholder="..." className="min-h-[100px] uppercase text-xs p-4 rounded-xl" required />
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">CHEFIA IMEDIATA (PARA CIÊNCIA)</Label>
                  {chefiaRows.map((row, index) => (
                    <div key={index} className="flex gap-2 relative">
                      <div className="relative flex-1">
                        <Input 
                          placeholder="BUSCAR CHEFIA POR QRA OU NOME..."
                          value={row.term}
                          onChange={(e) => updateChefiaRow(index, { term: e.target.value.toUpperCase(), uid: "" })}
                          onFocus={() => updateChefiaRow(index, { show: true })}
                          className="h-11 border-muted uppercase text-[10px] pr-10"
                        />
                        {row.uid && <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />}
                        {row.show && row.term && (
                          <div className="absolute z-[60] left-0 right-0 top-full mt-1 bg-background border rounded-lg shadow-xl max-h-40 overflow-y-auto">
                            {allEmployees?.filter(e => ["INSPETOR", "SUBINSPETOR", "GESTOR DE RH"].includes(normalizeStr(e.role || "")) && (e.name.includes(row.term) || e.qra.includes(row.term))).map(c => (
                              <button key={c.id} type="button" onMouseDown={() => updateChefiaRow(index, { uid: c.uid, term: `${c.name} (${c.qra})`, show: false })} className="w-full px-4 py-2 text-left hover:bg-muted text-[10px] uppercase border-b last:border-0">
                                {c.name} ({c.qra}) - {c.role}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeChefiaRow(index)} className="h-11 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addChefiaRow} className="text-[10px] font-bold uppercase">+ ADICIONAR CHEFIA</Button>
                </div>

              </CardContent>
              <CardFooter className="border-t p-6 bg-muted/5">
                <Button type="submit" disabled={loading || hasInsufficientBalance} className="w-full h-11 uppercase font-bold text-xs tracking-widest shadow-lg">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  ENVIAR SOLICITAÇÃO
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6 space-y-4">
          {loadingRequests ? <div className="flex h-32 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
            <div className="grid gap-4">
              {myRequests?.map(req => (
                <Card key={req.id} className="card-shadow border-none rounded-2xl overflow-hidden hover:bg-slate-50 transition-all group">
                  <CardContent className="p-6 flex flex-col sm:flex-row justify-between gap-4">
                    <div className="flex gap-4">
                      <div className={cn(
                        "p-3 rounded-2xl shrink-0 h-fit",
                        req.status === 'Aprovado' ? 'bg-green-100 text-green-700' : 
                        req.status === 'Negado' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      )}>
                        {req.status === 'Aprovado' ? <CheckCircle2 className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black uppercase text-sm">{req.type}</span>
                          <Badge variant="secondary" className="text-[8px] uppercase">{req.status}</Badge>
                        </div>
                        <p className="text-[10px] font-bold text-primary uppercase">{req.date}</p>
                        <p className="text-xs text-muted-foreground uppercase mt-2 italic">"{req.description}"</p>
                        {req.adminResponse && (
                          <div className="bg-slate-100 p-2 rounded-lg mt-3 border-l-4 border-primary">
                            <p className="text-[9px] font-black uppercase text-primary mb-1">Resposta do RH/Chefia:</p>
                            <p className="text-[10px] uppercase font-medium">{req.adminResponse}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {isManagement && (
          <TabsContent value="management" className="mt-6 space-y-4">
            {loadingManagement ? <div className="flex h-32 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
              <div className="grid gap-6">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6 text-blue-600" />
                  <p className="text-[10px] font-bold uppercase text-blue-800 tracking-tight">
                    ESTA ÁREA EXIBE SOLICITAÇÕES QUE AGUARDAM SEU PARECER OU DECISÃO DO RH.
                  </p>
                </div>

                {managementRequests?.map(req => (
                  <Card key={req.id} className="card-shadow border-2 border-primary/5 rounded-2xl overflow-hidden">
                    <CardHeader className="bg-muted/5 border-b pb-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-sm font-black uppercase">{req.employeeName}</CardTitle>
                          <Badge variant="outline" className="text-[9px] uppercase font-bold">{req.type}</Badge>
                        </div>
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none uppercase text-[8px]">{req.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold text-muted-foreground uppercase">DATA(S) SOLICITADA(S)</Label>
                          <p className="text-[10px] font-black uppercase text-slate-900 bg-slate-50 p-2 rounded-lg border">{req.date}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold text-muted-foreground uppercase">CHEFIA SELECIONADA</Label>
                          <p className="text-[10px] font-medium uppercase text-slate-700 bg-slate-50 p-2 rounded-lg border">{req.chefiaImediata}</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold text-muted-foreground uppercase">JUSTIFICATIVA DO SERVIDOR</Label>
                        <p className="text-[11px] uppercase p-4 bg-muted/20 rounded-xl italic">"{req.description}"</p>
                      </div>

                      <Separator className="my-4" />

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-bold uppercase text-primary">Parecer / Despacho Administrativo</Label>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 gap-2 text-[10px] font-bold uppercase text-primary hover:bg-primary/5"
                            onClick={() => handleAskIA(req)}
                            disabled={aiLoadingId === req.id}
                          >
                            {aiLoadingId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                            Assistente IA
                          </Button>
                        </div>
                        <Textarea 
                          value={adminResponseDraft[req.id] || ""}
                          onChange={(e) => setAdminResponseDraft(prev => ({ ...prev, [req.id]: e.target.value }))}
                          placeholder="ESCREVA SEU PARECER OU USE A SUGESTÃO DA IA..."
                          className="min-h-[100px] uppercase text-[11px] font-medium p-4 rounded-xl resize-none bg-blue-50/10 border-blue-100"
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="bg-muted/5 p-4 border-t flex flex-wrap gap-2 justify-end">
                      <Button variant="ghost" size="sm" className="uppercase text-[10px] font-black text-red-600 hover:bg-red-50 h-10 px-6" onClick={() => handleProcessRequest(req.id, 'deny')}>NEGAR PEDIDO</Button>
                      <Button variant="outline" size="sm" className="uppercase text-[10px] font-black text-slate-600 h-10 px-6" onClick={() => handleProcessRequest(req.id, 'review')}>EM REVISÃO</Button>
                      <Button size="sm" className="uppercase text-[10px] font-black h-10 px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100" onClick={() => handleProcessRequest(req.id, 'approve')}>
                        {normalizeStr(employeeData.role).includes("RH") ? "APROVAR DEFINITIVO" : "APROVAR PARECER"}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}

                {managementRequests?.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed">
                    <CheckCircle2 className="h-12 w-12 text-green-200 mb-4" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tudo em dia! Nenhuma solicitação aguarda seu parecer.</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
