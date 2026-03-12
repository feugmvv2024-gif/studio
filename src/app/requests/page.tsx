
"use client"

import * as React from "react"
import { 
  FilePlus, 
  Calendar as CalendarIcon, 
  Repeat, 
  Clock, 
  CheckCircle2, 
  XCircle,
  History
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

const myRequests = [
  {
    id: "REQ-001",
    type: "Férias",
    date: "15/06/2024",
    status: "Aprovado",
    description: "Período aquisitivo 2023/2024."
  },
  {
    id: "REQ-002",
    type: "Permuta",
    date: "10/05/2024",
    status: "Pendente",
    description: "Permuta de plantão com Agente Silva (Mat. 1234)."
  }
]

export default function RequestsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Solicitações Operacionais</h2>
        <p className="text-muted-foreground">Envie pedidos de férias, folgas ou permutas de serviço.</p>
      </div>

      <Tabs defaultValue="new" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="new">Nova Solicitação</TabsTrigger>
          <TabsTrigger value="history">Minhas Solicitações</TabsTrigger>
        </TabsList>
        <TabsContent value="new" className="mt-6 space-y-6">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle>Formulário de Pedido</CardTitle>
              <CardDescription>
                Selecione o tipo de solicitação e forneça os detalhes necessários.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="requestType">Tipo de Solicitação</Label>
                  <Select>
                    <SelectTrigger id="requestType">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacation">Férias</SelectItem>
                      <SelectItem value="leave">Folga / Abono</SelectItem>
                      <SelectItem value="exchange">Permuta de Serviço</SelectItem>
                      <SelectItem value="other">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Data Prevista</Label>
                  <Input id="date" type="date" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Justificativa / Detalhes</Label>
                <Textarea 
                  id="description" 
                  placeholder="Descreva detalhadamente o seu pedido..." 
                  className="min-h-[120px]"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-6">
              <Button variant="outline">Limpar</Button>
              <Button>Enviar Solicitação</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6 space-y-4">
          {myRequests.map((req) => (
            <Card key={req.id} className="card-shadow">
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${req.status === 'Aprovado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {req.status === 'Aprovado' ? <CheckCircle2 className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{req.type}</span>
                      <Badge variant="outline">{req.id}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{req.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">Data: {req.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={req.status === 'Aprovado' ? 'bg-green-600' : 'bg-yellow-500'}>
                    {req.status}
                  </Badge>
                  <div className="mt-2">
                    <Button variant="ghost" size="sm">Ver Detalhes</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
