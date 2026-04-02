
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
  ShieldCheck
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from '@/firebase'
import { collection, query, orderBy } from 'firebase/firestore'
import { cn } from "@/lib/utils"

const normalizeStr = (str: string) => str?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";

export default function RelatoriosPage() {
  const { toast } = useToast()
  const firestore = useFirestore()
  const [loading, setLoading] = React.useState(false)

  // Estados para Inspetor
  const [inspetorTerm, setInspetorTerm] = React.useState("")
  const [inspetorId, setInspetorId] = React.useState("")
  const [showInspetorSuggestions, setShowInspetorSuggestions] = React.useState(false)

  // Estados para Subinspetor
  const [subinspetorTerm, setSubinspetorTerm] = React.useState("")
  const [subinspetorId, setSubinspetorId] = React.useState("")
  const [showSubinspetorSuggestions, setShowSubinspetorSuggestions] = React.useState(false)

  // Busca servidores
  const employeesRef = React.useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'employees'), orderBy('name', 'asc'));
  }, [firestore]);

  const { data: allEmployees, loading: loadingEmployees } = useCollection(employeesRef);

  // Filtra servidores permitidos (Inspetor, Subinspetor, Inspetor Geral, Comandante)
  const chefiaList = React.useMemo(() => {
    if (!allEmployees) return [];
    const allowedRoles = ["INSPETOR", "SUBINSPETOR", "INSPETOR GERAL", "COMANDANTE"];
    return allEmployees.filter(emp => {
      const role = normalizeStr(emp.role || "");
      return allowedRoles.some(allowed => role === allowed);
    });
  }, [allEmployees]);

  // Obtém data e hora atuais para valores padrão
  const now = new Date()
  const defaultDate = now.toISOString().split('T')[0]
  const defaultTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inspetorId || !subinspetorId) {
      toast({
        variant: "destructive",
        title: "DADOS INCOMPLETOS",
        description: "POR FAVOR, SELECIONE O INSPETOR E O SUBINSPETOR DA LISTA."
      })
      return
    }

    setLoading(true)
    
    // Simulação de salvamento
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
    setShow: (v: boolean) => void
  ) => {
    const filtered = chefiaList.filter(e => 
      normalizeStr(e.name).includes(normalizeStr(term)) || 
      normalizeStr(e.qra).includes(normalizeStr(term))
    );

    return (
      <div className="space-y-1.5 relative">
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
              if (!e.target.value) setId("");
            }}
            onFocus={() => setShow(true)}
            required
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
                Nenhum oficial encontrado.
              </div>
            )}
          </div>
        )}
        {show && <div className="fixed inset-0 z-[90]" onClick={() => setShow(false)} />}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
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
          
          <CardContent className="p-6 space-y-8">
            {/* Linha 1: Inspetor, Data, Horário */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-2">
                {renderAutocomplete(
                  "Inspetor Responsável", 
                  inspetorTerm, 
                  setInspetorTerm, 
                  setInspetorId, 
                  inspetorId, 
                  showInspetorSuggestions, 
                  setShowInspetorSuggestions
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                  <Calendar className="h-3 w-3" /> Data
                </Label>
                <Input 
                  type="date" 
                  defaultValue={defaultDate}
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
                  defaultValue={defaultTime}
                  className="h-11 font-bold text-xs bg-slate-50/50 focus:bg-white transition-colors" 
                  required
                />
              </div>
            </div>

            {/* Linha 2: Subinspetor */}
            <div className="grid grid-cols-1 gap-6">
              {renderAutocomplete(
                "Subinspetor Auxiliar", 
                subinspetorTerm, 
                setSubinspetorTerm, 
                setSubinspetorId, 
                subinspetorId, 
                showSubinspetorSuggestions, 
                setShowSubinspetorSuggestions
              )}
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
