
"use client"

import * as React from "react"
import { 
  Clock, 
  CheckCircle2, 
  Loader2,
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

export default function RequestsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("new");

  const requestsRef = React.useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'requests'), 
      where('employeeId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: myRequests, loading: loadingRequests } = useCollection(requestsRef);

  async function handleSendRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!firestore || !user) {
      toast({ variant: "destructive", title: "Erro", description: "Usuário não autenticado." });
      return;
    }

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as string;
    const date = formData.get('date') as string;
    const description = formData.get('description') as string;

    const newRequest = {
      employeeId: user.uid,
      employeeName: user.displayName || "Usuário NRH",
      type,
      date,
      description,
      status: "Pendente",
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(firestore, 'requests'), newRequest);
      toast({
        title: "Solicitação enviada!",
        description: "Seu pedido está em análise pela administração.",
      });
      setActiveTab("history");
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar",
        description: "Não foi possível processar sua solicitação.",
      });
    } finally {
      setLoading(false);
    }
  }

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'vacation': return 'Férias';
      case 'leave': return 'Folga / Abono';
      case 'exchange': return 'Permuta de Serviço';
      default: return 'Outros';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Solicitações Operacionais</h2>
        <p className="text-muted-foreground">Envie pedidos de férias, folgas ou permutas de serviço.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="new">Nova Solicitação</TabsTrigger>
          <TabsTrigger value="history">Minhas Solicitações</TabsTrigger>
        </TabsList>
        <TabsContent value="new" className="mt-6 space-y-6">
          <Card className="card-shadow">
            <form onSubmit={handleSendRequest}>
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
                    <Select name="type" required>
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
                    <Input id="date" name="date" type="date" required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Justificativa / Detalhes</Label>
                  <Textarea 
                    id="description" 
                    name="description"
                    placeholder="Descreva detalhadamente o seu pedido..." 
                    className="min-h-[120px]"
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-6">
                <Button variant="outline" type="reset">Limpar</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Enviar Solicitação
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
          ) : myRequests?.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <p className="text-muted-foreground">Você ainda não enviou nenhuma solicitação.</p>
              </CardContent>
            </Card>
          ) : (
            myRequests?.map((req) => (
              <Card key={req.id} className="card-shadow">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${req.status === 'Aprovado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {req.status === 'Aprovado' ? <CheckCircle2 className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{getTypeLabel(req.type)}</span>
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">Ref: {req.id.slice(0, 5)}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{req.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">Data solicitada: {req.date}</p>
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
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
