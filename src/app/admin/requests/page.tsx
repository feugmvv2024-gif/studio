"use client"

import * as React from "react"
import { 
  MessageSquare, 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  Clock,
  ArrowRight,
  Send
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { operationalRequestResponseAssistant } from "@/ai/flows/operational-request-response-assistant"
import { useToast } from "@/hooks/use-toast"

const pendingRequests = [
  {
    id: "REQ-002",
    employee: "Juliana Lima",
    type: "Permuta",
    details: "Solicito permuta do plantão de 15/05 para o dia 16/05 com o Agente Silva.",
    status: "Pendente"
  },
  {
    id: "REQ-003",
    employee: "Carlos Eduardo",
    type: "Folga",
    details: "Solicitação de folga compensatória referente ao banco de horas acumulado em Abril.",
    status: "Pendente"
  }
]

export default function AdminRequestsPage() {
  const [selectedReq, setSelectedReq] = React.useState<typeof pendingRequests[0] | null>(null)
  const [adminNotes, setAdminNotes] = React.useState("")
  const [aiDraft, setAiDraft] = React.useState("")
  const [isGenerating, setIsGenerating] = React.useState(false)
  const { toast } = useToast()

  const generateDraft = async () => {
    if (!selectedReq) return
    setIsGenerating(true)
    try {
      const result = await operationalRequestResponseAssistant({
        employeeName: selectedReq.employee,
        requestType: selectedReq.type,
        requestDetails: selectedReq.details,
        currentStatus: selectedReq.status,
        adminNotes: adminNotes
      })
      setAiDraft(result.suggestedResponse)
      toast({
        title: "Rascunho Gerado",
        description: "A IA sugeriu uma resposta baseada nos detalhes do pedido."
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao gerar rascunho com IA."
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestão de Pedidos</h2>
          <p className="text-muted-foreground">Analise e responda às solicitações do efetivo.</p>
        </div>

        <div className="space-y-4">
          {pendingRequests.map((req) => (
            <Card 
              key={req.id} 
              className={`cursor-pointer transition-all hover:border-primary ${selectedReq?.id === req.id ? 'border-primary ring-1 ring-primary/20' : 'card-shadow'}`}
              onClick={() => setSelectedReq(req)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline">{req.id}</Badge>
                  <Badge className="bg-yellow-500">{req.status}</Badge>
                </div>
                <h3 className="font-bold text-lg">{req.employee}</h3>
                <p className="text-sm font-medium text-primary mb-2">{req.type}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{req.details}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {selectedReq ? (
          <div className="space-y-6 sticky top-24 p-6 border rounded-xl bg-card card-shadow animate-in slide-in-from-right-4 duration-300">
            <div className="space-y-1">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none mb-2">
                Solicitação {selectedReq.id}
              </Badge>
              <h3 className="text-2xl font-bold tracking-tight">{selectedReq.employee}</h3>
              <p className="text-muted-foreground font-medium">{selectedReq.type}</p>
            </div>

            <div className="space-y-6">
              <div className="p-4 bg-muted/50 rounded-lg text-sm italic border-l-4 border-primary/30">
                &quot;{selectedReq.details}&quot;
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-semibold">Notas Internas (Opcional)</Label>
                <Textarea 
                  id="notes"
                  placeholder="Adicione observações para orientar a IA..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="bg-background border-slate-200 focus:bg-white transition-colors min-h-[100px]"
                />
              </div>

              <Button 
                onClick={generateDraft} 
                disabled={isGenerating}
                className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-md border-none h-11"
              >
                <Sparkles className="h-4 w-4" />
                {isGenerating ? "Gerando Resposta..." : "Gerar Resposta com IA"}
              </Button>

              {aiDraft && (
                <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label className="flex items-center gap-2 text-primary font-bold">
                    <MessageSquare className="h-4 w-4" />
                    Sugestão da Assistente
                  </Label>
                  <Textarea 
                    value={aiDraft} 
                    onChange={(e) => setAiDraft(e.target.value)}
                    className="min-h-[180px] border-accent/30 focus:ring-accent bg-accent/5"
                  />
                </div>
              )}

              <div className="flex justify-between items-center border-t pt-6">
                <div className="flex gap-3">
                  <Button variant="outline" size="icon" className="text-destructive border-destructive/20 hover:bg-destructive hover:text-white transition-colors h-11 w-11">
                    <XCircle className="h-5 w-5" />
                  </Button>
                  <Button variant="outline" size="icon" className="text-green-600 border-green-200 hover:bg-green-600 hover:text-white transition-colors h-11 w-11">
                    <CheckCircle className="h-5 w-5" />
                  </Button>
                </div>
                <Button className="gap-2 h-11 px-6 shadow-sm">
                  Enviar Resposta
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-12 border-2 border-dashed rounded-xl bg-muted/20">
            <div className="p-4 rounded-full bg-white shadow-sm mb-4">
              <ArrowRight className="h-8 w-8 text-primary/40" />
            </div>
            <p className="text-center font-medium">Selecione uma solicitação à esquerda para analisar e responder usando IA.</p>
          </div>
        )}
      </div>
    </div>
  )
}
