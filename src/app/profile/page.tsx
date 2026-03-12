
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Edit2, Camera, Clock, Calendar, Download } from "lucide-react"

const timeBank = [
  { date: "02/05/2024", type: "Extra", hours: "+4:00", description: "Operação Impacto" },
  { date: "05/05/2024", type: "Compensação", hours: "-8:00", description: "Folga Compensatória" },
  { date: "10/05/2024", type: "Extra", hours: "+2:30", description: "Reunião de Coordenação" },
  { date: "12/05/2024", type: "Extra", hours: "+5:00", description: "Plantão Especial" },
]

export default function ProfilePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Meu Perfil</h2>
        <p className="text-muted-foreground">Gerencie suas informações e visualize seu banco de horas.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <Card className="md:col-span-1 card-shadow">
          <CardContent className="pt-8 flex flex-col items-center">
            <div className="relative group">
              <Avatar className="h-32 w-32 border-4 border-primary/10">
                <AvatarImage src="https://picsum.photos/seed/user1/150/150" />
                <AvatarFallback>RS</AvatarFallback>
              </Avatar>
              <Button size="icon" variant="secondary" className="absolute bottom-0 right-0 rounded-full h-8 w-8 shadow-lg">
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <h3 className="mt-4 text-xl font-bold">Ricardo Santos</h3>
            <Badge variant="outline" className="mt-1 font-mono">QRA-2024-001</Badge>
            <p className="text-sm text-muted-foreground mt-2">Inspetor de Segurança</p>
            
            <div className="w-full mt-6 space-y-3">
              <div className="flex justify-between items-center text-sm p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> Banco de Horas</span>
                <span className="font-bold text-primary">+12:30h</span>
              </div>
              <div className="flex justify-between items-center text-sm p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> Última Férias</span>
                <span className="font-medium">Out/2023</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 card-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Mantenha seus dados de contato atualizados.</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Edit2 className="h-4 w-4" /> Editar
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>E-mail</Label>
              <Input value="ricardo.santos@gmvv.gov.br" readOnly className="bg-muted/50" />
            </div>
            <div className="grid gap-2">
              <Label>Telefone</Label>
              <Input value="(27) 99888-7766" readOnly className="bg-muted/50" />
            </div>
            <div className="grid gap-2">
              <Label>Data de Admissão</Label>
              <Input value="15/01/2020" readOnly className="bg-muted/50" />
            </div>
            <div className="grid gap-2">
              <Label>Lotação</Label>
              <Input value="Unidade Centro - Vitória" readOnly className="bg-muted/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-shadow">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Extrato do Banco de Horas</CardTitle>
            <CardDescription>Detalhamento de horas extras e compensações.</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" /> Exportar PDF
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeBank.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.date}</TableCell>
                    <TableCell>
                      <Badge variant={item.type === "Extra" ? "default" : "secondary"}>
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.description}</TableCell>
                    <TableCell className={`text-right font-bold ${item.hours.startsWith('+') ? 'text-primary' : 'text-destructive'}`}>
                      {item.hours}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
