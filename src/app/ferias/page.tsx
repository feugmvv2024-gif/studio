
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
  Scissors,
  User,
  Search,
  LayoutList,
  Printer,
  Settings2,
  CalendarX,
  Baby,
  GraduationCap
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useAuth, useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, addDoc, query, where, orderBy, serverTimestamp, updateDoc, doc, setDoc } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"

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
  const [hasMinorChildren, setHasMinorChildren] = React.useState(false);
  const [spouseIsTeacher, setSpouseIsTeacher] = React.useState(false);
  
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("nova-solicitacao");
  const [searchTermApproved, setSearchTermApproved] = React.useState("");

  // Estados para Modal de Indeferimento
  const [isDenyModalOpen, setIsDenyModalOpen] = React.useState(false);
  const [planToDenyId, setPlanToDenyId] = React.useState<string | null>(null);
  const [denialReason, setDenialReason] = React.useState("");
  const [isProcessingDeny, setIsProcessingDeny] = React.useState(false);

  // Estado para Seleção Múltipla de Homologação (RH)
  const [selectionMap, setSelectionMap] = React.useState<Record<string, any[]>>({});

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

  const approvedPlansQuery = React.useMemo(() => {
    if (!firestore || !isManager) return null;
    return query(collection(firestore, 'vacationPlans'), where('status', '==', 'APROVADO'), orderBy('updatedAt', 'desc'));
  }, [firestore, isManager]);

  const vacationSettingsRef = React.useMemo(() => 
    firestore ? doc(firestore, 'settings', 'vacation') : null
  , [firestore]);

  const { data: myRequests, loading: loadingMyPlans } = useCollection(myPlansQuery);
  const { data: allPlans, loading: loadingAllPlans } = useCollection(allPlansQuery);
  const { data: approvedPlans, loading: loadingApprovedPlans } = useCollection(approvedPlansQuery);
  const { data: vacationSettings, loading: loadingSettings } = useDoc(vacationSettingsRef);

  // Status de abertura do sistema
  const isSolicitationOpen = React.useMemo(() => {
    return vacationSettings?.isOpen ?? true; // Padrão aberto se não configurado
  }, [vacationSettings]);

  // Verificações para campos de prioridade
  const hasChildrenInProfile = React.useMemo(() => {
    return employeeData?.children && employeeData.children.length > 0;
  }, [employeeData]);

  const hasSpouseInProfile = React.useMemo(() => {
    return !!employeeData?.spouseName;
  }, [employeeData]);

  // Histórico de datas negadas para o servidor logado
  const deniedDates = React.useMemo(() => {
    if (!myRequests) return [];
    const denied = myRequests.filter(p => p.status === "NEGADO");
    const dates: string[] = [];
    denied.forEach(p => {
      p.options?.forEach((o: any) => dates.push(`${o.year}-${o.month}`));
    });
    return Array.from(new Set(dates));
  }, [myRequests]);

  const filteredApprovedPlans = React.useMemo(() => {
    if (!approvedPlans) return [];
    const term = searchTermApproved.toLowerCase();
    return approvedPlans.filter(p => 
      p.employeeName?.toLowerCase().includes(term) ||
      p.employeeQra?.toLowerCase().includes(term)
    );
  }, [approvedPlans, searchTermApproved]);

  // Lógica de agrupamento por mês para a impressão
  const groupedPrintData = React.useMemo(() => {
    if (!approvedPlans) return [];
    
    const entries: any[] = [];
    approvedPlans.forEach(plan => {
      (plan.selectedOptions || []).forEach(opt => {
        entries.push({
          month: opt.month,
          year: opt.year,
          startDay: opt.startDay,
          employeeName: plan.employeeName,
          employeeQra: plan.employeeQra,
          employeeEscala: plan.employeeEscala,
          employeeTurno: plan.employeeTurno,
          processedByQra: plan.processedByQra,
          splitVacation: plan.splitVacation
        });
      });
    });

    const groups: Record<string, any[]> = {};
    entries.forEach(entry => {
      const key = `${entry.month} / ${entry.year}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });

    return Object.keys(groups).sort((a, b) => {
      const [mA, yA] = a.split(' / ');
      const [mB, yB] = b.split(' / ');
      if (yA !== yB) return yA.localeCompare(yB);
      return MONTHS.indexOf(mA) - MONTHS.indexOf(mB);
    }).map(key => ({
      title: key,
      members: groups[key].sort((a, b) => a.employeeName.localeCompare(b.employeeName))
    }));
  }, [approvedPlans]);

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
      hasMinorChildren: hasMinorChildren,
      spouseIsTeacher: spouseIsTeacher,
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
      setHasMinorChildren(false);
      setSpouseIsTeacher(false);
      setActiveTab("meus-pedidos");
    } catch (error) {
      toast({ variant: "destructive", title: "ERRO AO ENVIAR", description: "Tente novamente mais tarde." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcess = async (planId: string, action: 'approve' | 'deny', selectedOpts?: any[], reason?: string) => {
    if (!firestore || !employeeData) return;
    
    try {
      const updates: any = {
        status: action === 'approve' ? "APROVADO" : "NEGADO",
        updatedAt: serverTimestamp(),
        processedByQra: (employeeData.qra || "SISTEMA").toUpperCase()
      };

      if (action === 'approve' && selectedOpts) {
        updates.selectedOptions = selectedOpts;
      }

      if (reason) {
        updates.adminResponse = reason.toUpperCase();
      }

      await updateDoc(doc(firestore, 'vacationPlans', planId), updates);
      toast({ title: action === 'approve' ? "FÉRIAS HOMOLOGADAS!" : "PEDIDO INDEFERIDO" });
      
      setSelectionMap(prev => {
        const next = { ...prev };
        delete next[planId];
        return next;
      });
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
    await handleProcess(planToDenyId, 'deny', undefined, denialReason);
    setIsProcessingDeny(false);
    setIsDenyModalOpen(false);
    setPlanToDenyId(null);
    setDenialReason("");
  };

  const handleToggleSystem = async (isOpen: boolean) => {
    if (!firestore) return;
    try {
      await setDoc(doc(firestore, 'settings', 'vacation'), { isOpen }, { merge: true });
      toast({ 
        title: isOpen ? "SISTEMA ABERTO" : "SISTEMA BLOQUEADO", 
        description: isOpen ? "Servidores já podem enviar novas intenções." : "Novas solicitações estão desabilitadas." 
      });
    } catch (error) {
      toast({ variant: "destructive", title: "ERRO AO ATUALIZAR" });
    }
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

  const toggleOptionSelection = (planId: string, opt: any, isSplit: boolean) => {
    const current = selectionMap[planId] || [];
    const isSelected = current.some(s => s.year === opt.year && s.month === opt.month);
    
    if (isSelected) {
      setSelectionMap({ ...selectionMap, [planId]: current.filter(s => !(s.year === opt.year && s.month === opt.month)) });
    } else {
      const newSelection = { ...opt, startDay: "15" }; // Padrão 15
      if (!isSplit) {
        setSelectionMap({ ...selectionMap, [planId]: [newSelection] });
      } else {
        if (current.length < 2) {
          setSelectionMap({ ...selectionMap, [planId]: [...current, newSelection] });
        } else {
          toast({ variant: "default", title: "LIMITE ATINGIDO", description: "O servidor solicitou dividir em apenas 2 períodos." });
        }
      }
    }
  };

  const updateOptionDay = (planId: string, year: string, month: string, day: string) => {
    const current = selectionMap[planId] || [];
    const updated = current.map(s => {
      if (s.year === year && s.month === month) {
        return { ...s, startDay: day };
      }
      return s;
    });
    setSelectionMap({ ...selectionMap, [planId]: updated });
  };

  const handlePrint = () => {
    window.print();
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
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 print:p-0">
      {/* Configurações de Impressão */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 portrait; margin: 1.5cm; }
          
          html, body, main, [data-sidebar="inset"], .flex-1 { 
            overflow: visible !important; 
            height: auto !important; 
            display: block !important;
            background: white !important;
          }

          .print-hidden, header, nav, footer, aside, .tabs-list {
            display: none !important;
          }

          .printable-content {
            display: block !important;
            width: 100% !important;
            color: black !important;
          }

          .report-header {
            margin-bottom: 2rem;
            border-bottom: 2px solid black;
            padding-bottom: 1rem;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }

          .month-section {
            margin-bottom: 2.5rem;
            break-inside: avoid-page;
          }

          .month-title {
            background-color: #f0f0f0 !important;
            -webkit-print-color-adjust: exact;
            padding: 8px 12px;
            font-size: 14pt;
            font-weight: 900;
            text-transform: uppercase;
            border-left: 6px solid black;
            margin-bottom: 1rem;
          }

          .report-table {
            width: 100%;
            border-collapse: collapse;
          }

          .report-table th, .report-table td {
            border: 1px solid #000;
            padding: 8px;
            font-size: 10pt;
            text-align: left;
            text-transform: uppercase;
          }

          .report-table th {
            font-weight: 900;
            background-color: #fafafa !important;
          }

          .report-table td.center { text-align: center; }
        }
      ` }} />

      {/* ÁREA DE IMPRESSÃO EXCLUSIVA */}
      <div className="hidden printable-content">
        <div className="report-header">
          <div>
            <h1 className="text-xl font-black uppercase">Cronograma Geral de Férias</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Núcleo de RH - GMVV</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-mono font-bold uppercase">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>

        {groupedPrintData.map((group, idx) => (
          <div key={idx} className="month-section">
            <div className="month-title">{group.title}</div>
            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ width: '250px' }}>Servidor / QRA</th>
                  <th>Escala / Turno</th>
                  <th style={{ width: '100px' }} className="center">Início</th>
                  <th style={{ width: '100px' }} className="center">Duração</th>
                  <th style={{ width: '120px' }} className="center">Auditoria</th>
                </tr>
              </thead>
              <tbody>
                {group.members.map((member, mIdx) => (
                  <tr key={mIdx}>
                    <td className="font-bold">{member.employeeName} ({member.employeeQra})</td>
                    <td>{member.employeeEscala} / {member.employeeTurno}</td>
                    <td className="center font-black">{member.startDay || "15"}</td>
                    <td className="center font-bold">{member.splitVacation ? "15 DIAS" : "30 DIAS"}</td>
                    <td className="center font-mono" style={{ fontSize: '8pt' }}>{member.processedByQra}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <div className="mt-12 pt-4 border-t border-slate-200 text-center">
          <p className="text-[8px] font-bold uppercase text-muted-foreground">Sistema de Gestão Operacional GMVV - Módulo de Férias</p>
        </div>
      </div>

      {/* Modal de Justificativa de Indeferimento */}
      <div className="print-hidden">
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
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
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
      </div>

      <div className="flex flex-col gap-2 print-hidden">
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full print-hidden">
        <TabsList className={cn(
          "grid w-full bg-muted/50 p-1 rounded-xl h-12",
          isManager ? "grid-cols-4 lg:w-[850px]" : "grid-cols-2 lg:w-[400px]"
        )}>
          <TabsTrigger value="nova-solicitacao" className="rounded-lg uppercase text-[10px] font-bold flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" /> NOVA SOLICITAÇÃO
          </TabsTrigger>
          <TabsTrigger value="meus-pedidos" className="rounded-lg uppercase text-[10px] font-bold flex items-center gap-2">
            <History className="h-3.5 w-3.5" /> MEUS PEDIDOS
          </TabsTrigger>
          {isManager && (
            <>
              <TabsTrigger value="painel-gestao" className="rounded-lg uppercase text-[10px] font-bold flex items-center gap-2 text-primary">
                <ShieldCheck className="h-3.5 w-3.5" /> PAINEL DE GESTÃO
              </TabsTrigger>
              <TabsTrigger value="cronograma" className="rounded-lg uppercase text-[10px] font-bold flex items-center gap-2 text-blue-600">
                <LayoutList className="h-3.5 w-3.5" /> CRONOGRAMA GERAL
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="nova-solicitacao" className="mt-6 space-y-6">
          {!isSolicitationOpen ? (
            <Card className="card-shadow border-none rounded-3xl overflow-hidden animate-in zoom-in-95 duration-500">
              <CardContent className="flex flex-col items-center justify-center p-20 text-center space-y-6 bg-slate-50/50">
                <div className="bg-red-50 p-6 rounded-full border-4 border-white shadow-xl">
                  <CalendarX className="h-16 w-16 text-red-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black uppercase text-slate-900 tracking-tight">Período Encerrado</h3>
                  <p className="text-muted-foreground uppercase text-xs font-bold tracking-widest max-w-md leading-relaxed">
                    O formulário para novas intenções de férias encontra-se desabilitado ou ainda não foi iniciado pela administração da unidade.
                  </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Aguarde novas orientações do RH</span>
                </div>
              </CardContent>
            </Card>
          ) : (
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

                {(hasChildrenInProfile || hasSpouseInProfile) && (
                  <div className="pt-6 border-t border-slate-100 space-y-6">
                    <h4 className="text-[11px] font-black uppercase text-slate-800 tracking-widest flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" /> Critérios de Prioridade (Baseado no Perfil)
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {hasChildrenInProfile && (
                        <Card className="bg-slate-50/50 border-slate-200 shadow-sm rounded-xl overflow-hidden border">
                          <CardContent className="p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-white p-2 rounded-lg border shadow-sm">
                                <Baby className="h-5 w-5 text-blue-600" />
                              </div>
                              <Label className="text-[10px] font-bold uppercase text-slate-700 leading-tight">
                                Tem filhos menores 18 anos, em idade escolar?
                              </Label>
                            </div>
                            <Switch checked={hasMinorChildren} onCheckedChange={setHasMinorChildren} />
                          </CardContent>
                        </Card>
                      )}

                      {hasSpouseInProfile && (
                        <Card className="bg-slate-50/50 border-slate-200 shadow-sm rounded-xl overflow-hidden border">
                          <CardContent className="p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-white p-2 rounded-lg border shadow-sm">
                                <GraduationCap className="h-5 w-5 text-purple-600" />
                              </div>
                              <Label className="text-[10px] font-bold uppercase text-slate-700 leading-tight">
                                Cônjuge professor(a) do Município de Vila Velha?
                              </Label>
                            </div>
                            <Switch checked={spouseIsTeacher} onCheckedChange={setSpouseIsTeacher} />
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-slate-100 space-y-6">
                  <h4 className="text-[11px] font-black uppercase text-slate-800 tracking-widest flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-blue-600" /> Preferências de Gozo e Pagamento
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-slate-50/50 border-slate-200 shadow-sm rounded-xl overflow-hidden border">
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

                    <Card className="bg-slate-50/50 border-slate-200 shadow-sm rounded-xl overflow-hidden border">
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
          )}
        </TabsContent>

        <TabsContent value="meus-pedidos" className="mt-6 space-y-6">
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b pb-4">
              <History className="h-6 w-6 text-slate-400" />
              <h3 className="text-xl font-black uppercase text-slate-700 tracking-tight">Meu Histórico de Solicitações</h3>
            </div>
            
            {loadingMyRequests ? <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /> : (
              <div className="grid gap-4">
                {myRequests.length === 0 ? (
                  <div className="text-center py-20 border-2 border-dashed rounded-3xl uppercase text-[10px] font-bold text-muted-foreground italic tracking-widest">VOCÊ AINDA NÃO ENVIOU INTENÇÕES DE FÉRIAS.</div>
                ) : (
                  myRequests.map(plan => (
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
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1">
                              {plan.status === 'APROVADO' ? (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Star className="h-5 w-5 text-green-600 fill-green-600" />
                                    <p className="text-[10px] font-black uppercase text-green-800 tracking-widest">
                                      PERÍODO(S) HOMOLOGADO(S) PELO RH: {plan.processedByQra || ""}
                                    </p>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(plan.selectedOptions || []).map((opt: any, i: number) => (
                                      <div key={i} className="bg-green-50 p-3 rounded-xl border border-green-100">
                                        <p className="text-xl font-black uppercase text-green-900 leading-none">
                                          {opt.startDay ? `${opt.startDay} ` : ""}{opt.month} / {opt.year}
                                        </p>
                                      </div>
                                    ))}
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
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100">
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
                            {plan.hasMinorChildren && (
                              <div className="flex items-center gap-2">
                                <Baby className="h-3 w-3 text-blue-600" />
                                <span className="text-[8px] font-black uppercase text-slate-500">Filhos Escolares:</span>
                                <Badge className="text-[7px] font-black uppercase bg-blue-600 text-white border-none">SIM</Badge>
                              </div>
                            )}
                            {plan.spouseIsTeacher && (
                              <div className="flex items-center gap-2">
                                <GraduationCap className="h-3 w-3 text-purple-600" />
                                <span className="text-[8px] font-black uppercase text-slate-500">Cônjuge Professor:</span>
                                <Badge className="text-[7px] font-black uppercase bg-purple-600 text-white border-none">SIM</Badge>
                              </div>
                            )}
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
                                    <MessageSquare className="h-3 w-3" /> Justificativa do RH: ({plan.processedByQra || ""})
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
        </TabsContent>

        {isManager && (
          <>
            <TabsContent value="painel-gestao" className="mt-6 space-y-6">
              {/* CONTROLE DE SISTEMA */}
              <Card className="card-shadow border-none rounded-2xl bg-white overflow-hidden animate-in slide-in-from-top-4 duration-500">
                <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-2xl border transition-colors",
                      isSolicitationOpen ? "bg-green-50 text-green-600 border-green-100" : "bg-red-50 text-red-600 border-red-100"
                    )}>
                      <Settings2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase text-slate-900 tracking-tight">Controle do Sistema de Férias</h4>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Habilitar ou desabilitar o envio de intenções pelo efetivo.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      isSolicitationOpen ? "text-green-700" : "text-red-700"
                    )}>
                      {isSolicitationOpen ? "Período Aberto" : "Período Fechado"}
                    </span>
                    <Switch 
                      checked={isSolicitationOpen} 
                      onCheckedChange={handleToggleSystem}
                      className={cn(
                        "data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

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
                      allPlans.map(plan => {
                        const currentSelections = selectionMap[plan.id] || [];
                        const requiredCount = plan.splitVacation ? 2 : 1;
                        const isComplete = currentSelections.length === requiredCount;

                        return (
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

                                <div className="flex flex-wrap gap-2 pt-2 border-t">
                                  {plan.hasMinorChildren && (
                                    <Badge className="bg-blue-600 text-white font-black text-[8px] uppercase gap-1 px-2 h-5">
                                      <Baby className="h-2.5 w-2.5" /> Prioridade Escolar
                                    </Badge>
                                  )}
                                  {plan.spouseIsTeacher && (
                                    <Badge className="bg-purple-600 text-white font-black text-[8px] uppercase gap-1 px-2 h-5">
                                      <GraduationCap className="h-2.5 w-2.5" /> Cônjuge Prof.
                                    </Badge>
                                  )}
                                </div>

                                <div className="space-y-1.5 pt-2 border-t">
                                  <div className="flex items-center gap-2">
                                    <Coins className="h-3 w-3 text-amber-500" />
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
                                {plan.splitVacation && (
                                  <div className="pt-2">
                                    <Badge variant="secondary" className="w-full justify-center bg-blue-100 text-blue-700 border-none font-black text-[9px] py-1">
                                      SELECIONADO: {currentSelections.length} DE 2
                                    </Badge>
                                  </div>
                                )}
                                <p className="text-[9px] font-bold text-muted-foreground uppercase pt-2">Solicitado em: {new Date(plan.createdAt?.seconds * 1000).toLocaleDateString('pt-BR')}</p>
                              </div>
                              <div className="flex-1 p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {plan.options.map((opt: any, idx: number) => {
                                    const selectedItem = currentSelections.find(s => s.year === opt.year && s.month === opt.month);
                                    const isSelected = !!selectedItem;
                                    
                                    return (
                                      <div 
                                        key={idx} 
                                        onClick={() => toggleOptionSelection(plan.id, opt, plan.splitVacation)}
                                        className={cn(
                                          "p-4 rounded-xl border transition-all cursor-pointer space-y-3 flex flex-col items-center text-center group",
                                          isSelected ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-200" : "bg-white border-slate-100 hover:border-blue-300 shadow-sm"
                                        )}
                                      >
                                        <span className={cn("text-[9px] font-black uppercase tracking-widest", isSelected ? "text-white/80" : "text-muted-foreground")}>
                                          {idx + 1}ª OPÇÃO
                                        </span>
                                        <div className="flex flex-col">
                                          <span className={cn("text-lg font-black uppercase leading-none", isSelected ? "text-white" : "text-primary")}>
                                            {opt.month}
                                          </span>
                                          <span className={cn("text-xs font-bold", isSelected ? "text-white/70" : "text-slate-500")}>
                                            {opt.year}
                                          </span>
                                        </div>
                                        
                                        {isSelected && (
                                          <div className="w-full space-y-1.5 mt-2 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                                            <Label className="text-[8px] font-black uppercase text-white/80">Dia de Início</Label>
                                            <Input 
                                              type="text" 
                                              maxLength={2}
                                              value={selectedItem.startDay || "15"}
                                              onChange={(e) => updateOptionDay(plan.id, opt.year, opt.month, e.target.value.replace(/\D/g, ''))}
                                              className="h-8 text-center font-black text-xs bg-white text-blue-700 border-none shadow-inner"
                                            />
                                          </div>
                                        )}

                                        {!isSelected && (
                                          <div className={cn(
                                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                                            "bg-slate-50 border-slate-200 text-transparent group-hover:border-blue-200"
                                          )}>
                                            <CheckCircle2 className="h-4 w-4" />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t gap-4">
                                  <Button 
                                    variant="destructive" 
                                    size="sm" 
                                    onClick={() => { setPlanToDenyId(plan.id); setIsDenyModalOpen(true); }}
                                    className="w-full sm:w-auto h-9 px-6 uppercase font-black text-[10px] gap-2 rounded-xl"
                                  >
                                    <XCircle className="h-4 w-4" /> INDEFERIR TODAS AS OPÇÕES
                                  </Button>
                                  <Button 
                                    disabled={!isComplete}
                                    onClick={() => handleProcess(plan.id, 'approve', currentSelections)}
                                    className={cn(
                                      "w-full sm:w-auto h-11 px-10 uppercase font-black text-[11px] gap-2 rounded-xl transition-all shadow-xl",
                                      isComplete ? "bg-green-600 hover:bg-green-700 shadow-green-100" : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                                    )}
                                  >
                                    <CheckCircle2 className="h-5 w-5" /> 
                                    {plan.splitVacation ? "Homologar 2 Períodos" : "Homologar Escolha"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="cronograma" className="mt-6 space-y-6">
              <Card className="card-shadow border-none rounded-2xl overflow-hidden">
                <CardHeader className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-blue-50/30 border-b p-6">
                  <div>
                    <CardTitle className="text-xl font-black uppercase text-slate-900 tracking-tight">Férias Homologadas</CardTitle>
                    <CardDescription className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Cronograma consolidado de afastamentos aprovados pela unidade.</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="BUSCAR SERVIDOR..." 
                        className="pl-9 h-10 uppercase text-[10px] font-bold bg-white" 
                        value={searchTermApproved}
                        onChange={(e) => setSearchTermApproved(e.target.value.toUpperCase())}
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={handlePrint}
                      className="h-10 uppercase text-[10px] font-black gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      <Printer className="h-4 w-4" />
                      Imprimir Cronograma
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingApprovedPlans ? (
                    <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/20">
                          <TableRow>
                            <TableHead className="font-bold uppercase text-[10px] h-12">Servidor / QRA</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] h-12">Operacional</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] h-12">Período(s) Aprovado(s)</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] h-12">Prioridades</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] h-12">Auditor RH</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] h-12 text-center">Opções</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredApprovedPlans.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="h-40 text-center uppercase text-[10px] font-bold text-muted-foreground italic tracking-widest">
                                NENHUM REGISTRO HOMOLOGADO ENCONTRADO.
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredApprovedPlans.map((plan) => (
                              <TableRow key={plan.id} className="hover:bg-slate-50 transition-colors border-b last:border-0">
                                <TableCell className="py-4">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-black uppercase text-[13px] text-slate-900 leading-tight">{plan.employeeName}</span>
                                    <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">QRA: {plan.employeeQra}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-black uppercase text-slate-700">{plan.employeeEscala}</span>
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">{plan.employeeTurno}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-2">
                                    {(plan.selectedOptions || []).map((opt: any, idx: number) => (
                                      <Badge key={idx} className="bg-green-600 text-white font-black text-[9px] uppercase px-3">
                                        {opt.startDay ? `${opt.startDay} ` : ""}{opt.month} / {opt.year}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {plan.hasMinorChildren && (
                                      <Badge variant="outline" className="text-[8px] font-black uppercase border-blue-200 text-blue-600 bg-blue-50">ESCOLAR</Badge>
                                    )}
                                    {plan.spouseIsTeacher && (
                                      <Badge variant="outline" className="text-[8px] font-black uppercase border-purple-200 text-purple-600 bg-purple-50">PROFESSOR</Badge>
                                    )}
                                    {!plan.hasMinorChildren && !plan.spouseIsTeacher && <span className="text-[8px] text-slate-400 uppercase font-bold">PADRÃO</span>}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                                    <span className="text-[10px] font-black uppercase text-slate-600">{plan.processedByQra || "SISTEMA"}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-3">
                                    <div className="flex items-center gap-1">
                                      <Coins className={cn("h-3.5 w-3.5", plan.advance13th ? "text-amber-500" : "text-slate-300")} />
                                      <span className={cn("text-[8px] font-black", plan.advance13th ? "text-amber-600" : "text-slate-400")}>13º</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Scissors className={cn("h-3.5 w-3.5", plan.splitVacation ? "text-blue-500" : "text-slate-300")} />
                                      <span className={cn("text-[8px] font-black", plan.splitVacation ? "text-blue-600" : "text-slate-400")}>DIV.</span>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>

      <div className="text-center print:hidden">
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
          NRH - GMVV • SISTEMA DE GESTÃO OPERACIONAL • VERSÃO 1.0
        </p>
      </div>
    </div>
  )
}
