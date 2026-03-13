
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
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Meu Perfil</h2>
        <p className="text-muted-foreground text-sm sm:text-base">Gerencie suas informações e visualize seu banco de horas.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <Card className="lg:col-span-1 card-shadow">
          <CardContent className="pt-8 flex flex-col items-center">
            <div className="relative group">
              <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-primary/10">
                <AvatarImage src="https://picsum.photos/seed/user1/150/150" />
                <AvatarFallback>RS</AvatarFallback>
              </Avatar>
              <Button size="icon" variant="secondary" className="absolute bottom-0 right-0 rounded-full h-8 w-8 shadow-lg">
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <h3 className="mt-4 text-lg sm:text-xl font-bold">Ricardo Santos</h3>
            <Badge variant="outline" className="mt-1 font-mono text-[10px]">QRA-2024-001</Badge>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">Inspetor de Segurança</p>
            
            <div className="w-full mt-6 space-y-3">
              <div className="flex justify-between items-center text-xs sm:text-sm p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> Banco de Horas</span>
                <span className="font-bold text-primary">+12:30h</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> Última Férias</span>
                <span className="font-medium">Out/2023</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 card-shadow">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl">Informações Pessoais</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Mantenha seus dados de contato atualizados.</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
              <Edit2 className="h-4 w-4" /> Editar
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">E-mail</Label>
              <Input value="ricardo.santos@gmvv.gov.br" readOnly className="bg-muted/50 text-xs sm:text-sm h-9" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Telefone</Label>
              <Input value="(27) 99888-7766" readOnly className="bg-muted/50 text-xs sm:text-sm h-9" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Data de Admissão</Label>
              <Input value="15/01/2020" readOnly className="bg-muted/50 text-xs sm:text-sm h-9" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Lotação</Label>
              <Input value="Unidade Centro - Vitória" readOnly className="bg-muted/50 text-xs sm:text-sm h-9" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-shadow overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg sm:text-xl">Extrato do Banco de Horas</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Detalhamento de horas extras e compensações.</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
            <Download className="h-4 w-4" /> Exportar PDF
          </Button>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <div className="rounded-none sm:rounded-md border-x-0 sm:border overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs uppercase font-bold px-4">Data</TableHead>
                  <TableHead className="text-xs uppercase font-bold">Tipo</TableHead>
                  <TableHead className="text-xs uppercase font-bold">Descrição</TableHead>
                  <TableHead className="text-right text-xs uppercase font-bold pr-4">Horas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeBank.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium text-xs sm:text-sm px-4 whitespace-nowrap">{item.date}</TableCell>
                    <TableCell>
                      <Badge variant={item.type === "Extra" ? "default" : "secondary"} className="text-[10px]">
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs sm:text-sm min-w-[150px]">{item.description}</TableCell>
                    <TableCell className={`text-right font-bold text-xs sm:text-sm pr-4 ${item.hours.startsWith('+') ? 'text-primary' : 'text-destructive'}`}>
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
