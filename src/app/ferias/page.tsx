"use client"

import * as React from "react"
import { Plane, CalendarDays, ClipboardList, ShieldCheck, Save, AlertCircle, Info, Loader2 } from "lucide-react"
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
import { useToast } from "@/hooks/use-toast"

const MONTHS = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
];

export default function FeriasPage() {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = React.useState("");
  const [option1, setOption1] = React.useState("");
  const [option2, setOption2] = React.useState("");
  const [option3, setOption3] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Calcula dinamicamente os próximos 2 anos
  const nextYears = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear + 1, currentYear + 2];
  }, []);

  const handleSave = () => {
    setIsSubmitting(true);
    // Simulação de salvamento local (futuramente integrado ao Firestore)
    setTimeout(() => {
      toast({
        title: "INTENÇÃO GRAVADA!",
        description: `Sua solicitação para o exercício ${selectedYear} foi enviada com sucesso.`,
      });
      setIsSubmitting(false);
      // Mantém os dados para conferência do usuário
    }, 1000);
  };

  const isFormValid = selectedYear && option1 && option2 && option3;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
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

      <Tabs defaultValue="nova-solicitacao" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[450px] h-12 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="nova-solicitacao" className="rounded-lg uppercase text-[10px] font-bold flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" /> NOVA SOLICITAÇÃO
          </TabsTrigger>
          <TabsTrigger value="gestao-analise" className="rounded-lg uppercase text-[10px] font-bold flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5" /> GESTÃO / ANÁLISE
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
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Escolha três opções de meses para o planejamento anual.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* SELETOR DE ANO */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-700 tracking-widest flex items-center gap-2">
                    <Info className="h-3 w-3 text-blue-600" /> Ano do Exercício
                  </Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="h-11 uppercase font-bold text-xs bg-slate-50 border-slate-200">
                      <SelectValue placeholder="SELECIONE..." />
                    </SelectTrigger>
                    <SelectContent>
                      {nextYears.map(year => (
                        <SelectItem key={year} value={year.toString()} className="uppercase font-bold text-xs">
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* OPÇÃO 1 */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-700 tracking-widest">1ª Opção de Mês</Label>
                    <Select value={option1} onValueChange={setOption1}>
                      <SelectTrigger className="h-11 uppercase font-bold text-xs bg-slate-50 border-slate-200">
                        <SelectValue placeholder="MÊS..." />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map(month => (
                          <SelectItem 
                            key={month} 
                            value={month} 
                            disabled={month === option2 || month === option3}
                            className="uppercase font-bold text-xs"
                          >
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* OPÇÃO 2 */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-700 tracking-widest">2ª Opção de Mês</Label>
                    <Select value={option2} onValueChange={setOption2}>
                      <SelectTrigger className="h-11 uppercase font-bold text-xs bg-slate-50 border-slate-200">
                        <SelectValue placeholder="MÊS..." />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map(month => (
                          <SelectItem 
                            key={month} 
                            value={month} 
                            disabled={month === option1 || month === option3}
                            className="uppercase font-bold text-xs"
                          >
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* OPÇÃO 3 */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-700 tracking-widest">3ª Opção de Mês</Label>
                    <Select value={option3} onValueChange={setOption3}>
                      <SelectTrigger className="h-11 uppercase font-bold text-xs bg-slate-50 border-slate-200">
                        <SelectValue placeholder="MÊS..." />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map(month => (
                          <SelectItem 
                            key={month} 
                            value={month} 
                            disabled={month === option1 || month === option2}
                            className="uppercase font-bold text-xs"
                          >
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-4">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[11px] font-black uppercase text-amber-900 leading-none tracking-tight">Regras de Preenchimento</p>
                  <p className="text-[10px] text-amber-800 font-medium uppercase leading-relaxed mt-1">
                    Você deve selecionar o ano do exercício e três meses distintos por ordem de preferência. O sistema bloqueia automaticamente a repetição de meses entre as opções.
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
                Gravar Intenção de Férias
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="gestao-analise" className="mt-6">
          <Card className="border-2 border-dashed bg-slate-50/30 rounded-3xl">
            <CardContent className="h-64 flex items-center justify-center">
              <div className="text-center space-y-2">
                <ClipboardList className="h-10 w-10 text-muted-foreground/20 mx-auto" />
                <p className="text-[10px] font-bold uppercase text-muted-foreground italic tracking-widest">
                  Acompanhamento de solicitações e análise do RH.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="text-center">
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
          NRH - GMVV • SISTEMA DE GESTÃO • MÓDULO EM CONSTRUÇÃO
        </p>
      </div>
    </div>
  )
}
