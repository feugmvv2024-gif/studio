
"use client"

import * as React from "react"
import { 
  Plane, 
  CalendarDays, 
  ClipboardList, 
  ShieldCheck, 
  Save, 
  AlertCircle, 
  Loader2, 
  Star, 
  CheckCircle2, 
  XCircle, 
  History,
  Lock,
  ArrowRight,
  MessageSquare,
  X,
  Coins,
  Scissors
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useAuth, useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, query, where, orderBy, serverTimestamp, updateDoc, doc } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

const MONTHS = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
];

const normalizeStr = (str: string) => str?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";

export default function FeriasPage() {
  const { user, employeeData } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [opt1, setOpt1] = React.useState({ year: "", month: "" });
  const [opt2, setOpt2] = React.useState({ year: "", month: "" });
  const [opt3, setOpt3] = React.useState({ year: "", month: "" });
  
  const [advance13th, setAdvance13th] = React.useState("nao");
  const [splitVacation, setSplitVacation] = React.useState("nao");
  
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("nova-solicitacao");

  // Estados para Modal de Indeferimento
  const [isDenyModalOpen, setIsDenyModalOpen] = React.useState(false);
  const [planToDenyId, setPlanToDenyId] = React.useState<string | null>(null);
  const [denialReason, setDenialReason] = React.useState("");
  const [isProcessingDeny, setIsProcessingDeny] = React.useState(false);

  // Controle de Acesso de Gestão
  const isManager = React.useMemo(() => {
    if (!employeeData) return false;
    const role = normalizeStr(employeeData.role || "");
    return ["COMANDANTE", "INSPETOR GERAL", "GESTOR DE RH"].some(r => role.includes(r));
  }, [employeeData]);

  // Queries para o Firestore
  const myPlansQuery = React.useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'vacationPlans'), where('employeeId', '==', user.uid), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const allPlansQuery = React.useMemo(() => {
    if (!firestore || !isManager) return null;
    return query(collection(firestore, 'vacationPlans'), where('status', '==', 'PENDENTE'), orderBy('createdAt', 'asc'));
  }, [firestore, isManager]);

  const { data: myPlans, loading: loadingMyPlans } = useCollection(myPlansQuery);
  const { data: allPlans, loading: loadingAllPlans } = useCollection(allPlansQuery);

  // Histórico de datas negadas para o servidor logado
  const deniedDates = React.useMemo(() => {
    if (!myPlans) return [];
    const denied = myPlans.filter(p => p.status === "NEGADO");
    const dates: string[] = [];
    denied.forEach(p => {
      p.options?.forEach((o: any) => dates.push(`${o.year}-${o.month}`));
    });
    return Array.from(new Set(dates));
  }, [myPlans]);

  const nextYears = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear + 1, currentYear + 2];
  }, []);

  const handleSave = async () => {
    if (!user || !employeeData) return;
    setIsSubmitting(true);

    const payload = {
      employeeId: user.uid,
      employeeName: employeeData.name,
      employeeQra: employeeData.qra,
      employeeEscala: employeeData.escala || "N/A",
      employeeTurno: employeeData.turno || "N/A",
      advance13th: advance13th === "sim",
      splitVacation: splitVacation === "sim",
      options: [opt1, opt2, opt3],
      status: "PENDENTE",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await addDoc(collection(firestore, 'vacationPlans'), payload);
      toast({ title: "INTENÇÃO GRAVADA!", description: "Suas opções foram enviadas para análise do RH." });
      setOpt1({ year: "", month: "" });
      setOpt2({ year: "", month: "" });
      setOpt3({ year: "", month: "" });
      setAdvance13th("nao");
      setSplitVacation("nao");
      setActiveTab("gestao-analise");
    } catch (error) {
      toast({ variant: "destructive", title: "ERRO AO ENVIAR", description: "Tente novamente mais tarde." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcess = async (planId: string, action: 'approve' | 'deny', selectedOpt?: any, reason?: string) => {
    if (!firestore) return;
    
    try {
      const updates: any = {
        status: action === 'approve' ? "APROVADO" : "NEGADO",
        updatedAt: serverTimestamp()
      };

      if (action === 'approve') {
        updates.selectedOption = selectedOpt;
      }

      if (reason) {
        updates.adminResponse = reason.toUpperCase();
      }

      await updateDoc(doc(firestore, 'vacationPlans', planId), updates);
      toast({ title: action === 'approve' ? "FÉRIAS HOMOLOGADAS!" : "PEDIDO INDEFERIDO" });
    } catch (error) {
      toast({ variant: "destructive", title: "ERRO NO PROCESSAMENTO" });
    }
  };

  const handleConfirmDeny = async () => {
    if (!planToDenyId || !denialReason.trim()) {
      toast({ variant: "destructive", title: "JUSTIFICATIVA OBRIGATÓRIA" });
      return;
    }

    setIsProcessingDeny(true);
    await handleProcess(planToDenyId, 'deny', null, denialReason);
    setIsProcessingDeny(false);
    setIsDenyModalOpen(false);
    setPlanToDenyId(null);
    setDenialReason("");
  };

  const isBlocked = (year: string, month: string) => {
    return deniedDates.includes(`${year}-${month}`);
  };

  const isCombinationTaken = (year: string, month: string, currentPriority: number) => {
    if (!year || !month) return false;
    const selections = [opt1, opt2, opt3];
    return selections.some((sel, idx) => {
      if (idx + 1 === currentPriority) return false;
      return sel.year === year && sel.month === month;
    });
  };

  const isFormValid = opt1.year && opt1.month && opt2.year && opt2.month && opt3.year && opt3.month;

  const renderOptionRow = (
    priority: number, 
    data: { year: string, month: string }, 
    setData: (val: { year: string, month: string }) => void,
    label: string
  ) => {
    const isThisBlocked = data.year && data.month && isBlocked(data.year, data.month);

    return (
      <div className={cn(
        "p-4 rounded-2xl border transition-all animate-in slide-in-from-left-2 duration-300 space-y-4",
        isThisBlocked ? "bg-red-50 border-red-200" : "bg-slate-50/50 border-slate-100"
      )}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <Star className={cn("h-4 w-4", priority === 1 ? "text-amber-500 fill-amber-500" : "text-primary")} />
            </div>
            <span className="text-[11px] font-black uppercase text-slate-700 tracking-widest">{label}</span>
          </div>
          {isThisBlocked && (
            <Badge variant="destructive" className="text-[8px] font-black uppercase animate-pulse">BLOQUEADO PELO RH</Badge>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-tight">Ano</Label>
            <Select value={data.year} onValueChange={(v) => setData({ ...data, year: v })}>
              <SelectTrigger className="h-10 uppercase font-bold text-xs bg-white">
                <SelectValue placeholder="ANO..." />
              </SelectTrigger>
              <SelectContent>
                {nextYears.map(year => (
                  <SelectItem key={year} value={year.toString()} className="uppercase font-bold text-xs">{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-tight">Mês</Label>
            <Select value={data.month} onValueChange={(v) => setData({ ...data, month: v })}>
              <SelectTrigger className="h-10 uppercase font-bold text-xs bg-white">
                <SelectValue placeholder="MÊS..." />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(month => (
                  <SelectItem 
                    key={month} 
                    value={month} 
                    disabled={isCombinationTaken(data.year, month, priority) || isBlocked(data.year, month)}
                    className="uppercase font-bold text-xs"
                  >
                    {month} {isBlocked(data.year, month) ? "(INDISPONÍVEL)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Modal de Justificativa de Indeferimento */}
      <Dialog open={isDenyModalOpen} onOpenChange={setIsDenyModalOpen}>
        <DialogContent className="rounded-2xl border-none shadow-2xl p-6 sm:p-8">
          <DialogHeader>
            <div className="bg-red-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="uppercase text-xl font-black">Justificar Indeferimento</DialogTitle>
            <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1 tracking-widest">Informe o motivo pelo qual as opções do servidor não podem ser atendidas.</p>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-700 tracking-tight">Parecer da Administração</Label>
              <Textarea 
                placeholder="EX: EXCESSO DE SERVIDORES NO PERÍODO, NECESSIDADE DO SERVIÇO..." 
                className="min-h-[120px] uppercase text-xs p-4 bg-slate-50 border-slate-200 focus:bg-white transition-all resize-none" 
                value={denialReason}
                onChange={(e) => setDenialReason(e.target.value.toUpperCase())}
              />
            </div>
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[9px] text-amber-800 font-bold uppercase leading-relaxed">
                Ao confirmar, estas datas ficarão bloqueadas para o servidor. Ele deverá realizar um novo pedido com períodos diferentes.
              </p>
            </div>
          </div>
          <DialogFooter className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <Button variant="ghost" onClick={() => setIsDenyModalOpen(false)} className="h-12 uppercase font-black text-xs tracking-widest">Cancelar</Button>
            <Button 
              onClick={handleConfirmDeny} 
              disabled={!denialReason.trim() || isProcessingDeny}
              className="h-12 uppercase font-black text-xs tracking-widest bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-100"
            >
              {isProcessingDeny ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Confirmar Indeferimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2 rounded-xl">
            <Plane className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase text-primary">Gestão de Férias</h2>
            <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">Acompanhamento e solicitação de períodos de descanso.</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[450px] h-12 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="nova-solicitacao" className="rounded-lg uppercase text-[10px] font-bold flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" /> NOVA SOLICITAÇÃO
          </TabsTrigger>
          <TabsTrigger value="gestao-analise" className="rounded-lg uppercase text-[10px] font-bold flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5" /> {isManager ? "PAINEL DE GESTÃO" : "MEUS PEDIDOS"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nova-solicitacao" className="mt-6 space-y-6">
          <Card className="card-shadow border-none rounded-2xl overflow-hidden">
            <CardHeader className="bg-blue-50/50 border-b p-6">
              <div className="flex items-center gap-4">
                <div className="bg-white p-2 rounded-xl border shadow-sm">
                  <CalendarDays className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black uppercase text-slate-900 tracking-tight">Intenção de Férias</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Escolha períodos distintos. Datas negadas anteriormente ficam bloqueadas.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {renderOptionRow(1, opt1, setOpt1, "1ª Prioridade")}
                {renderOptionRow(2, opt2, setOpt2, "2ª Prioridade")}
                {renderOptionRow(3, opt3, setOpt3, "3ª Prioridade")}
              </div>

              {/* SEÇÃO: PREFERÊNCIAS ADICIONAIS */}
              <div className="pt-6 border-t border-slate-100 space-y-6">
                <h4 className="text-[11px] font-black uppercase text-slate-800 tracking-widest flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-blue-600" /> Preferências de Gozo e Pagamento
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-slate-50/30 border-dashed shadow-none rounded-xl overflow-hidden">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-lg border shadow-sm">
                          <Coins className="h-5 w-5 text-amber-500" />
                        </div>
                        <Label className="text-[10px] font-bold uppercase text-slate-700 leading-tight">
                          Deseja receber o 13º antecipado (nas férias)?
                        </Label>
                      </div>
                      <RadioGroup value={advance13th} onValueChange={setAdvance13th} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="sim" id="a13-sim" />
                          <Label htmlFor="a13-sim" className="text-[10px] font-bold uppercase">SIM</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="nao" id="a13-nao" />
                          <Label htmlFor="a13-nao" className="text-[10px] font-bold uppercase">NÃO</Label>
                        </div>
                      </RadioGroup>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-50/30 border-dashed shadow-none rounded-xl overflow-hidden">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-lg border shadow-sm">
                          <Scissors className="h-5 w-5 text-blue-500" />
                        </div>
                        <Label className="text-[10px] font-bold uppercase text-slate-700 leading-tight">
                          Dividir minhas férias em dois períodos?
                        </Label>
                      </div>
                      <RadioGroup value={splitVacation} onValueChange={setSplitVacation} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="sim" id="sv-sim" />
                          <Label htmlFor="sv-sim" className="text-[10px] font-bold uppercase">SIM</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="nao" id="sv-nao" />
                          <Label htmlFor="sv-nao" className="text-[10px] font-bold uppercase">NÃO</Label>
                        </div>
                      </RadioGroup>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-4">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[11px] font-black uppercase text-amber-900 leading-none tracking-tight">Regras do Sistema</p>
                  <p className="text-[10px] text-amber-800 font-medium uppercase leading-relaxed mt-1">
                    Cada opção deve ser uma combinação única. O sistema bloqueia automaticamente a escolha de meses que já foram negados pela administração para o seu perfil.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t p-6 flex justify-end">
              <Button 
                onClick={handleSave}
                disabled={!isFormValid || isSubmitting}
                className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-200 transition-all active:scale-95"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Enviar para Análise
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="gestao-analise" className="mt-6 space-y-6">
          {isManager ? (
            <div className="space-y-4">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <p className="text-[11px] font-black uppercase text-blue-800 tracking-tight">FILA DE HOMOLOGAÇÃO: ANALISE AS INTENÇÕES DO EFETIVO.</p>
              </div>
              
              {loadingAllPlans ? <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /> : (
                <div className="grid gap-4">
                  {allPlans.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-3xl uppercase text-[10px] font-bold text-muted-foreground italic tracking-widest">NENHUMA SOLICITAÇÃO PENDENTE.</div>
                  ) : (
                    allPlans.map(plan => (
                      <Card key={plan.id} className="card-shadow border-none rounded-xl overflow-hidden">
                        <div className="flex flex-col lg:flex-row">
                          <div className="lg:w-64 bg-slate-50 p-6 border-b lg:border-b-0 lg:border-r space-y-3">
                            <div className="space-y-1">
                              <p className="text-sm font-black uppercase text-slate-900 leading-tight">{plan.employeeName}</p>
                              <Badge className="bg-primary text-white font-black text-[9px] h-5">QRA: {plan.employeeQra}</Badge>
                              <div className="flex flex-col mt-1">
                                <span className="text-[9px] font-black uppercase text-blue-600 tracking-tighter leading-tight">
                                  {plan.employeeEscala || "N/A"} / {plan.employeeTurno || "N/A"}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1.5 pt-2 border-t">
                              <div className="flex items-center gap-2">
                                <Coins className="h-3 w-3 text-amber-600" />
                                <span className="text-[8px] font-black uppercase text-slate-500">13º Antecipado:</span>
                                <Badge variant={plan.advance13th ? "default" : "outline"} className={cn("text-[7px] font-black", plan.advance13th ? "bg-amber-500" : "")}>
                                  {plan.advance13th ? "SIM" : "NÃO"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Scissors className="h-3 w-3 text-blue-600" />
                                <span className="text-[8px] font-black uppercase text-slate-500">Dividir Férias:</span>
                                <Badge variant={plan.splitVacation ? "default" : "outline"} className={cn("text-[7px] font-black", plan.splitVacation ? "bg-blue-600" : "")}>
                                  {plan.splitVacation ? "SIM" : "NÃO"}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase pt-2">Solicitado em: {new Date(plan.createdAt?.seconds * 1000).toLocaleDateString('pt-BR')}</p>
                          </div>
                          <div className="flex-1 p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {plan.options.map((opt: any, idx: number) => (
                                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3 flex flex-col items-center text-center">
                                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{idx + 1}ª OPÇÃO</span>
                                  <div className="flex flex-col">
                                    <span className="text-lg font-black uppercase text-primary leading-none">{opt.month}</span>
                                    <span className="text-xs font-bold text-slate-500">{opt.year}</span>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleProcess(plan.id, 'approve', opt)}
                                    className="w-full h-8 uppercase font-black text-[9px] bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> HOMOLOGAR
                                  </Button>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-end pt-4 border-t">
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => { setPlanToDenyId(plan.id); setIsDenyModalOpen(true); }}
                                className="h-9 px-6 uppercase font-black text-[10px] gap-2 rounded-xl"
                              >
                                <XCircle className="h-4 w-4" /> INDEFERIR TODAS AS OPÇÕES
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b pb-4">
                <History className="h-6 w-6 text-slate-400" />
                <h3 className="text-xl font-black uppercase text-slate-700 tracking-tight">Meu Histórico de Solicitações</h3>
              </div>
              
              {loadingMyPlans ? <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /> : (
                <div className="grid gap-4">
                  {myPlans.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-3xl uppercase text-[10px] font-bold text-muted-foreground italic tracking-widest">VOCÊ AINDA NÃO ENVIOU INTENÇÕES DE FÉRIAS.</div>
                  ) : (
                    myPlans.map(plan => (
                      <Card key={plan.id} className="card-shadow border-none rounded-xl overflow-hidden group">
                        <div className="flex flex-col sm:flex-row items-stretch">
                          <div className={cn(
                            "w-full sm:w-24 flex flex-col items-center justify-center p-4 text-white",
                            plan.status === 'APROVADO' ? 'bg-green-600' : plan.status === 'NEGADO' ? 'bg-red-600' : 'bg-amber-500'
                          )}>
                            <span className="text-[10px] font-black uppercase text-center leading-tight mb-2">{plan.status}</span>
                            {plan.status === 'APROVADO' ? <CheckCircle2 className="h-6 w-6" /> : plan.status === 'NEGADO' ? <XCircle className="h-6 w-6" /> : <Loader2 className="h-6 w-6 animate-spin" />}
                          </div>
                          <div className="flex-1 p-5 space-y-4">
                            {plan.status === 'APROVADO' ? (
                              <div className="flex items-center gap-4 bg-green-50 p-3 rounded-xl border border-green-100">
                                <Star className="h-6 w-6 text-green-600 fill-green-600" />
                                <div>
                                  <p className="text-[9px] font-black uppercase text-green-800 tracking-widest">PERÍODO HOMOLOGADO PELO RH:</p>
                                  <p className="text-xl font-black uppercase text-green-900 leading-none mt-1">
                                    {plan.selectedOption?.month} / {plan.selectedOption?.year}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {plan.options.map((opt: any, i: number) => (
                                  <div key={i} className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{i + 1}ª Opção</span>
                                    <span className="text-[11px] font-black uppercase text-slate-800">{opt.month} / {opt.year}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* EXIBIÇÃO DE PREFERÊNCIAS NO HISTÓRICO */}
                            <div className="flex gap-4 pt-2 border-t border-slate-100">
                              <div className="flex items-center gap-2">
                                <Coins className="h-3 w-3 text-amber-500" />
                                <span className="text-[8px] font-black uppercase text-slate-500">13º Antecipado:</span>
                                <Badge variant="outline" className="text-[7px] font-black uppercase">{plan.advance13th ? "SIM" : "NÃO"}</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Scissors className="h-3 w-3 text-blue-500" />
                                <span className="text-[8px] font-black uppercase text-slate-500">Dividir Férias:</span>
                                <Badge variant="outline" className="text-[7px] font-black uppercase">{plan.splitVacation ? "SIM" : "NÃO"}</Badge>
                              </div>
                            </div>

                            {plan.status === 'NEGADO' && (
                              <div className="space-y-3 mt-2 animate-in slide-in-from-top-1 duration-500">
                                <div className="flex items-start gap-3 bg-red-50 p-4 rounded-xl border border-red-100">
                                  <Lock className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                  <div className="space-y-1">
                                    <p className="text-[10px] text-red-800 font-black uppercase tracking-tight">DATAS BLOQUEADAS PELA ADMINISTRAÇÃO</p>
                                    <p className="text-[9px] text-red-700 font-medium uppercase leading-relaxed">
                                      ESTAS OPÇÕES NÃO PODEM SER SELECIONADAS NOVAMENTE. POR FAVOR, ENVIE UM NOVO PEDIDO COM DIFERENTES MESES.
                                    </p>
                                  </div>
                                </div>
                                {plan.adminResponse && (
                                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 border-l-4 border-l-red-600">
                                    <p className="text-[9px] font-black uppercase text-slate-500 mb-1 flex items-center gap-1.5">
                                      <MessageSquare className="h-3 w-3" /> Justificativa do RH:
                                    </p>
                                    <p className="text-[11px] font-bold uppercase text-slate-800 italic leading-relaxed">
                                      "{plan.adminResponse}"
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="text-center">
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
          NRH - GMVV • SISTEMA DE GESTÃO OPERACIONAL • VERSÃO 1.0
        </p>
      </div>
    </div>
  )
}
