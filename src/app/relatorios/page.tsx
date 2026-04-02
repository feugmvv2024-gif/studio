
"use client"

import * as React from "react"
import { 
  FileText, 
  User, 
  Calendar, 
  Clock, 
  Send,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export default function RelatoriosPage() {
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(false)

  // Obtém data e hora atuais para valores padrão
  const now = new Date()
  const defaultDate = now.toISOString().split('T')[0]
  const defaultTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
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
            <CardTitle className="text-xl font-black uppercase text-slate-900 tracking-tight">RELATÓRIO SUBINSPETORIA - NRG GMVV</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Preenchimento obrigatório para registro de atividade de turno.</CardDescription>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            {/* Linha 1: Inspetor, Data, Horário */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                  <User className="h-3 w-3" /> Inspetor Responsável
                </Label>
                <Input 
                  placeholder="NOME DO INSPETOR..." 
                  className="h-11 uppercase font-bold text-xs bg-slate-50/50 focus:bg-white transition-colors" 
                  required
                />
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
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                <User className="h-3 w-3" /> Subinspetor Auxiliar
              </Label>
              <Input 
                placeholder="NOME DO SUBINSPETOR..." 
                className="h-11 uppercase font-bold text-xs bg-slate-50/50 focus:bg-white transition-colors" 
                required
              />
            </div>
          </CardContent>

          <CardFooter className="bg-slate-50 border-t p-6">
            <Button 
              type="submit" 
              disabled={loading}
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
