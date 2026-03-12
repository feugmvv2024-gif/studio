
"use client"

import * as React from "react"
import { 
  Search, 
  MoreHorizontal, 
  UserPlus, 
  QrCode, 
  Edit, 
  Trash2,
  Filter,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
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
import { useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";

export default function EfetivoPage() {
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const firestore = useFirestore();
  const { toast } = useToast();

  const employeesRef = React.useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'employees'), orderBy('name', 'asc'));
  }, [firestore]);

  const { data: employees, loading: loadingCollection } = useCollection(employeesRef);

  const filteredEmployees = React.useMemo(() => {
    if (!employees) return [];
    return employees.filter(emp => 
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.qra?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  async function handleAddEmployee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!firestore) return;

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).toUpperCase();
    const email = (formData.get('email') as string).toUpperCase();
    const role = (formData.get('role') as string).toUpperCase();

    const newEmployee = {
      name,
      email,
      role,
      qra: `QRA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`.toUpperCase(),
      status: "ATIVO",
      avatar: `https://picsum.photos/seed/${Math.random()}/100/100`,
      admissionDate: new Date().toISOString().split('T')[0]
    };

    try {
      await addDoc(collection(firestore, 'employees'), newEmployee);
      setIsAddOpen(false);
      toast({
        title: "SUCESSO!",
        description: "NOVO REGISTRO CRIADO NO SISTEMA.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "ERRO",
        description: "NÃO FOI POSSÍVEL SALVAR O REGISTRO.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!firestore || !confirm("TEM CERTEZA QUE DESEJA EXCLUIR ESTE REGISTRO?")) return;
    
    try {
      await deleteDoc(doc(firestore, 'employees', id));
      toast({
        title: "REGISTRO REMOVIDO",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "ERRO AO EXCLUIR",
      });
    }
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">EFETIVO</h2>
          <p className="text-muted-foreground">GERENCIE O REGISTRO E DADOS DE TODO O EFETIVO DA UNIDADE.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              NOVO REGISTRO
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleAddEmployee}>
              <DialogHeader>
                <DialogTitle>CADASTRAR NOVO INTEGRANTE</DialogTitle>
                <DialogDescription>
                  PREENCHA OS DADOS BÁSICOS. O QRA E CÓDIGO DE VALIDAÇÃO SERÃO GERADOS AUTOMATICAMENTE.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">NOME COMPLETO</Label>
                  <Input id="name" name="name" placeholder="EX: JOÃO DA SILVA" required className="uppercase" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">E-MAIL INSTITUCIONAL</Label>
                  <Input id="email" name="email" type="email" placeholder="JOAO.SILVA@GMVV.GOV.BR" required className="uppercase" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">CARGO / FUNÇÃO</Label>
                  <Input id="role" name="role" placeholder="EX: AGENTE DE SEGURANÇA" required className="uppercase" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>CANCELAR</Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  GERAR REGISTRO
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="card-shadow">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="BUSCAR POR NOME, E-MAIL OU QRA..."
                className="pl-8 uppercase"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingCollection ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">FOTO</TableHead>
                    <TableHead>NOME</TableHead>
                    <TableHead>QRA</TableHead>
                    <TableHead>FUNÇÃO</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead className="text-right">AÇÕES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        NENHUM INTEGRANTE ENCONTRADO.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={employee.avatar} alt={employee.name} />
                            <AvatarFallback>{employee.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <div className="uppercase">{employee.name}</div>
                            <div className="text-xs text-muted-foreground font-normal uppercase">{employee.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono uppercase">{employee.qra}</Badge>
                        </TableCell>
                        <TableCell className="uppercase">{employee.role}</TableCell>
                        <TableCell>
                          <Badge variant={employee.status === "ATIVO" ? "default" : "secondary"} className="uppercase">
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
                              <DropdownMenuLabel>AÇÕES</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" /> EDITAR
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <QrCode className="mr-2 h-4 w-4" /> VER QRA
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(employee.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> EXCLUIR
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
