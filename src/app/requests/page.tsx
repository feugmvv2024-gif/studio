
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
import { useFirestore, useCollection, useUser } from '@/firebase';
import { collection, addDoc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils"

export default function RequestsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
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

  const requestsRef = React.useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'requests'), 
      where('employeeId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: myRequests, loading: loadingRequests } = useCollection(requestsRef);

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

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const description = (formData.get('description') as string || "").toUpperCase();
    
    let finalDate = "";

    // Lógica de processamento por tipo
    if (requestType === "FOLGA" || requestType === "ABONO TRE") {
      finalDate = multiDates.filter(d => d).map(d => formatDateBR(d)).join(", ");
    } else if (requestType === "REPROGRAMAÇÃO DE FÉRIAS") {
      finalDate = `AGENDADO: ${formatDateBR(currentVacationStart)} À ${formatDateBR(currentVacationEnd)} | REPROGRAMAR PARA: ${formatDateBR(newVacationStart)} À ${formatDateBR(newVacationEnd)}`;
    } else {
      finalDate = formatDateBR(formData.get('date') as string || "");
    }

    const newRequest = {
      employeeId: user.uid,
      employeeName: (user.displayName || "USUÁRIO NRH").toUpperCase(),
      type: requestType,
      date: finalDate,
      description: description,
      status: "Pendente",
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
  };

  const isMultiDateType = ["FOLGA", "ABONO TRE"].includes(requestType);
  const isReprogrammingType = requestType === "REPROGRAMAÇÃO DE FÉRIAS";

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
                        <SelectItem value="TROCA DE SERVIÇO" className="uppercase text-[11px]">TROCA DE SERVIÇO</SelectItem>
                        <SelectItem value="PERMUTA" className="uppercase text-[11px]">PERMUTA</SelectItem>
                        <SelectItem value="OUTROS" className="uppercase text-[11px]">OUTROS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {!isMultiDateType && !isReprogrammingType && (
                    <div className="grid gap-2">
                      <Label htmlFor="date" className="text-[10px] font-bold uppercase text-muted-foreground">DATA PREVISTA</Label>
                      <Input id="date" name="date" type="date" required className="h-11" />
                    </div>
                  )}
                </div>

                {/* Campos dinâmicos para Múltiplas Datas (Folga e TRE) */}
                {isMultiDateType && (
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
                  </div>
                )}

                {/* Campos dinâmicos para Reprogramação de Férias (Intervalos) */}
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
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 border-t p-6 bg-muted/5">
                <Button variant="outline" type="button" onClick={resetForm} className="w-full sm:w-auto uppercase font-bold text-[10px] h-11 px-8 rounded-xl">LIMPAR</Button>
                <Button type="submit" disabled={loading || !requestType} className="w-full sm:w-auto uppercase font-bold text-[10px] h-11 px-8 rounded-xl shadow-lg shadow-primary/20">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  ENVIAR SOLICITAÇÃO
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
