
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
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
          <div className="space-y-6 sticky top-24">
            <Card className="card-shadow border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle>Análise do Pedido: {selectedReq.id}</CardTitle>
                <CardDescription>
                  Colaborador: {selectedReq.employee}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg text-sm italic">
                  &quot;{selectedReq.details}&quot;
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas Internas (Opcional)</Label>
                  <Textarea 
                    id="notes"
                    placeholder="Adicione observações para orientar a IA..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={generateDraft} 
                  disabled={isGenerating}
                  className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 border-none"
                >
                  <Sparkles className="h-4 w-4" />
                  {isGenerating ? "Gerando Resposta..." : "Gerar Resposta com IA"}
                </Button>

                {aiDraft && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <Label className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Sugestão da Assistente
                    </Label>
                    <Textarea 
                      value={aiDraft} 
                      onChange={(e) => setAiDraft(e.target.value)}
                      className="min-h-[150px] border-accent/50 focus:ring-accent"
                    />
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-6">
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="text-destructive border-destructive/20 hover:bg-destructive/10">
                    <XCircle className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="text-green-600 border-green-200 hover:bg-green-50">
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
                <Button className="gap-2">
                  Enviar Resposta
                  <Send className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-12 border-2 border-dashed rounded-lg bg-muted/30">
            <div className="p-4 rounded-full bg-muted mb-4">
              <ArrowRight className="h-8 w-8" />
            </div>
            <p className="text-center">Selecione uma solicitação à esquerda para analisar e responder usando IA.</p>
          </div>
        )}
      </div>
    </div>
  )
}
