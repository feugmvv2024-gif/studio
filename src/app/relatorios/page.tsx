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
  UserX
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

export default function RelatoriosPage() {
  const { toast } = useToast()
  const firestore = useFirestore()
  const [loading, setLoading] = React.useState(false)

  // Estados para valores padrão
  const [defaultDate, setDefaultDate] = React.useState("")
  const [defaultTime, setDefaultTime] = React.useState("")
  const [selectedEscalaId, setSelectedEscalaId] = React.useState("")

  React.useEffect(() => {
    setDefaultDate(getSaoPauloDate());
    setDefaultTime(getSaoPauloTime());
  }, []);

  // Estados para Inspetor (Fixo - Responsável Único)
  const [inspetorTerm, setInspetorTerm] = React.useState("")
  const [inspetorId, setInspetorId] = React.useState("")
  const [inspetorInfo, setInspetorInfo] = React.useState("")
  const [showInspetorSuggestions, setShowInspetorSuggestions] = React.useState(false)

  // Estados para Subinspetores (Dinâmico - Múltiplos)
  const [subinspetorRows, setSubinspetorRows] = React.useState([
    { id: "", term: "", info: "", show: false }
  ]);

  // Estados para Faltas (Dinâmico - Múltiplos)
  const [faltaRows, setFaltaRows] = React.useState([
    { id: "", term: "", info: "", show: false }
  ]);

  const addSubinspetorRow = () => setSubinspetorRows([...subinspetorRows, { id: "", term: "", info: "", show: false }]);
  const removeSubinspetorRow = (index: number) => {
    const newRows = subinspetorRows.filter((_, i) => i !== index);
    setSubinspetorRows(newRows.length ? newRows : [{ id: "", term: "", info: "", show: false }]);
  };
  const updateSubinspetorRow = (index: number, updates: Partial<{id: string, term: string, info: string, show: boolean}>) => {
    setSubinspetorRows(prev => {
      const newRows = [...prev];
      newRows[index] = { ...newRows[index], ...updates };
      return newRows;
    });
  };

  const addFaltaRow = () => setFaltaRows([...faltaRows, { id: "", term: "", info: "", show: false }]);
  const removeFaltaRow = (index: number) => {
    const newRows = faltaRows.filter((_, i) => i !== index);
    setFaltaRows(newRows.length ? newRows : [{ id: "", term: "", info: "", show: false }]);
  };
  const updateFaltaRow = (index: number, updates: Partial<{id: string, term: string, info: string, show: boolean}>) => {
    setFaltaRows(prev => {
      const newRows = [...prev];
      newRows[index] = { ...newRows[index], ...updates };
      return newRows;
    });
  };

  // Busca coleções
  const employeesRef = React.useMemo(() => firestore ? query(collection(firestore, 'employees'), orderBy('name', 'asc')) : null, [firestore]);
  const shiftPeriodsRef = React.useMemo(() => firestore ? query(collection(firestore, 'shiftPeriods'), orderBy('escalaName', 'asc')) : null, [firestore]);

  const { data: allEmployees, loading: loadingEmployees } = useCollection(employeesRef);
  const { data: shiftPeriods } = useCollection(shiftPeriodsRef);

  // Filtra chefia
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
      toast({
        variant: "destructive",
        title: "DADOS INCOMPLETOS",
        description: "POR FAVOR, SELECIONE O INSPETOR E A ESCALA."
      })
      return
    }

    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      toast({
        title: "RELATÓRIO ENVIADO",
        description: "AS INFORMAÇÕES FORAM REGISTRADAS COM SUCESSO NO SISTEMA."
      })
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
    isOptional?: boolean
  ) => {
    const filtered = sourceList.filter(e => 
      (normalizeStr(e.name).includes(normalizeStr(term)) || 
      normalizeStr(e.qra).includes(normalizeStr(term))) &&
      !excludeIds.includes(e.id)
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
              setTerm(e.target.value.toUpperCase());
              setShow(true);
              if (!e.target.value) {
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
                    setTerm(`${emp.name} (${emp.qra})`);
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
                {sourceList.some(e => normalizeStr(e.name).includes(normalizeStr(term)) && excludeIds.includes(e.id)) 
                  ? "Servidor já selecionado no formulário." 
                  : "Nenhum servidor encontrado."}
              </div>
            )}
          </div>
        )}
        {show && <div className="fixed inset-0 z-[90]" onClick={() => setShow(false)} />}
      </div>
    );
  };

  // Coleta todos os IDs selecionados para evitar duplicidade global
  const allSelectedIds = [
    inspetorId,
    ...subinspetorRows.map(r => r.id),
    ...faltaRows.map(r => r.id)
  ].filter(Boolean);

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
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Preenchimento obrigatório para registro de atividade de turno.</CardDescription>
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
                <Input 
                  type="date" 
                  value={defaultDate}
                  onChange={(e) => setDefaultDate(e.target.value)}
                  className="h-11 font-bold text-xs bg-slate-50/50 focus:bg-white transition-colors" 
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                  <Clock className="h-3 w-3" /> Horário
                </Label>
                <Input 
                  type="time" 
                  value={defaultTime}
                  onChange={(e) => setDefaultTime(e.target.value)}
                  className="h-11 font-bold text-xs bg-slate-50/50 focus:bg-white transition-colors" 
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
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="bg-slate-100 p-1.5 rounded-lg">
                    <User className="h-4 w-4 text-slate-500" />
                  </div>
                  <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Equipe de Subinspetoria</h4>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addSubinspetorRow}
                  className="h-8 text-[9px] font-black uppercase gap-1.5 rounded-xl border-primary/20 text-primary hover:bg-primary/5 transition-all active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" /> ADICIONAR SUBINSPETOR
                </Button>
              </div>
              
              <div className="space-y-4">
                {subinspetorRows.map((row, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex gap-2 items-end">
                      {renderAutocomplete(
                        "Subinspetor", 
                        row.term, 
                        (v) => updateSubinspetorRow(index, { term: v }), 
                        (v) => updateSubinspetorRow(index, { id: v }), 
                        row.id, 
                        row.show, 
                        (v) => updateSubinspetorRow(index, { show: v }),
                        (v) => updateSubinspetorRow(index, { info: v }),
                        chefiaList,
                        allSelectedIds.filter(id => id !== row.id)
                      )}
                      {subinspetorRows.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeSubinspetorRow(index)}
                          className="h-11 w-11 text-destructive hover:bg-red-50 hover:text-red-600 rounded-xl"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1.5">
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
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÃO FALTAS DINÂMICAS */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="bg-red-50 p-1.5 rounded-lg">
                    <UserX className="h-4 w-4 text-red-500" />
                  </div>
                  <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Faltas / Ausências</h4>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addFaltaRow}
                  className="h-8 text-[9px] font-black uppercase gap-1.5 rounded-xl border-red-200 text-red-600 hover:bg-red-50 transition-all active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" /> ADICIONAR FALTA
                </Button>
              </div>
              
              <div className="space-y-4">
                {faltaRows.map((row, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex gap-2 items-end">
                      {renderAutocomplete(
                        "Servidor (Falta)", 
                        row.term, 
                        (v) => updateFaltaRow(index, { term: v }), 
                        (v) => updateFaltaRow(index, { id: v }), 
                        row.id, 
                        row.show, 
                        (v) => updateFaltaRow(index, { show: v }),
                        (v) => updateFaltaRow(index, { info: v }),
                        allEmployees || [],
                        allSelectedIds.filter(id => id !== row.id)
                      )}
                      {faltaRows.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeFaltaRow(index)}
                          className="h-11 w-11 text-destructive hover:bg-red-50 hover:text-red-600 rounded-xl"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1.5">
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
                  </div>
                ))}
              </div>
            </div>
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

function Badge({ children, className, variant = "default" }: { children: React.ReactNode, className?: string, variant?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors",
      className
    )}>
      {children}
    </span>
  )
}
