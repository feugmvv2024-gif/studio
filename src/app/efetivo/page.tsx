
"use client"

import * as React from "react"
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  UserPlus, 
  QrCode, 
  Edit, 
  Trash2,
  Filter
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const employees = [
  {
    id: "1",
    name: "Ricardo Santos",
    email: "ricardo.santos@gmvv.gov.br",
    qra: "QRA-2024-001",
    role: "Inspetor",
    status: "Ativo",
    avatar: "https://picsum.photos/seed/emp1/100/100"
  },
  {
    id: "2",
    name: "Juliana Lima",
    email: "juliana.lima@gmvv.gov.br",
    qra: "QRA-2024-002",
    role: "Agente",
    status: "Férias",
    avatar: "https://picsum.photos/seed/emp2/100/100"
  },
  {
    id: "3",
    name: "Marcos Oliveira",
    email: "marcos.oliveira@gmvv.gov.br",
    qra: "QRA-2024-003",
    role: "Coordenador",
    status: "Ativo",
    avatar: "https://picsum.photos/seed/emp3/100/100"
  }
]

export default function EfetivoPage() {
  const [isAddOpen, setIsAddOpen] = React.useState(false)

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Efetivo</h2>
          <p className="text-muted-foreground">Gerencie o registro e dados de todo o efetivo da unidade.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Novo Registro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Integrante</DialogTitle>
              <DialogDescription>
                Preencha os dados básicos. O QRA e código de validação serão gerados automaticamente.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" placeholder="Ex: João da Silva" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">E-mail Institucional</Label>
                <Input id="email" type="email" placeholder="joao.silva@gmvv.gov.br" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Cargo / Função</Label>
                <Input id="role" placeholder="Ex: Agente de Segurança" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
              <Button type="submit">Gerar Registro</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="card-shadow">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail ou QRA..."
                className="pl-8"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Foto</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>QRA</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={employee.avatar} alt={employee.name} />
                        <AvatarFallback>{employee.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>
                        <div>{employee.name}</div>
                        <div className="text-xs text-muted-foreground font-normal">{employee.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{employee.qra}</Badge>
                    </TableCell>
                    <TableCell>{employee.role}</TableCell>
                    <TableCell>
                      <Badge variant={employee.status === "Ativo" ? "default" : "secondary"}>
                        {employee.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px]">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <QrCode className="mr-2 h-4 w-4" /> Ver QRA
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
