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
  Loader2,
  FileSpreadsheet,
  Upload
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
import { useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area"
import * as XLSX from 'xlsx';

export default function EfetivoPage() {
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null);
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
      emp.qra?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.matricula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.unit?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  async function handleAddEmployee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!firestore) return;

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const name = (formData.get('name') as string).toUpperCase();
    const matricula = (formData.get('matricula') as string).toUpperCase();
    const escala = (formData.get('escala') as string).toUpperCase();
    const turno = (formData.get('turno') as string).toUpperCase();
    const role = (formData.get('role') as string).toUpperCase();
    const unit = (formData.get('unit') as string).toUpperCase();
    const email = (formData.get('email') as string || "").toUpperCase();

    const newEmployee = {
      name,
      email,
      matricula,
      escala,
      turno,
      role,
      unit,
      qra: `QRA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`.toUpperCase(),
      status: "ATIVO",
      avatar: `https://picsum.photos/seed/${Math.random()}/100/100`,
      admissionDate: new Date().toISOString().split('T')[0]
    };

    try {
      addDoc(collection(firestore, 'employees'), newEmployee);
      setIsAddOpen(false);
      toast({
        title: "SUCESSO!",
        description: "NOVO REGISTRO CRIADO NO SISTEMA EM MAIÚSCULAS.",
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

  async function handleImportExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !firestore) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let importedCount = 0;

        for (const row of data) {
          const name = (row['SERVIDOR'] || "").toString().toUpperCase();
          const qra = (row['QRAs'] || row['QRA'] || `QRA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`).toString().toUpperCase();
          const matricula = (row['MATRICULA'] || row['MATRÍCULA'] || "").toString().toUpperCase();
          const escala = (row['ESCALA'] || "").toString().toUpperCase();
          const turno = (row['TURNO'] || "").toString().toUpperCase();
          const role = (row['CARGO'] || "").toString().toUpperCase();
          const unit = (row['SETOR'] || "").toString().toUpperCase();

          if (name && matricula) {
            const newEmployee = {
              name,
              qra,
              matricula,
              escala,
              turno,
              role,
              unit,
              status: "ATIVO",
              avatar: `https://picsum.photos/seed/${Math.random()}/100/100`,
              admissionDate: new Date().toISOString().split('T')[0],
              email: ""
            };
            addDoc(collection(firestore, 'employees'), newEmployee);
            importedCount++;
          }
        }

        toast({
          title: "IMPORTAÇÃO CONCLUÍDA!",
          description: `${importedCount} REGISTROS FORAM PROCESSADOS E SALVOS.`,
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "ERRO NA IMPORTAÇÃO",
          description: "VERIFIQUE SE O ARQUIVO ESTÁ NO FORMATO CORRETO.",
        });
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
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
          <h2 className="text-3xl font-bold tracking-tight uppercase">EFETIVO</h2>
          <p className="text-muted-foreground uppercase text-sm">GERENCIE O REGISTRO E DADOS DE TODO O EFETIVO DA UNIDADE.</p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".xlsx, .xls"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImportExcel}
          />
          <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            IMPORTAR EXCEL
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                NOVO REGISTRO
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleAddEmployee}>
                <DialogHeader>
                  <DialogTitle className="uppercase">CADASTRAR NOVO INTEGRANTE</DialogTitle>
                  <DialogDescription className="uppercase text-xs">
                    PREENCHA OS DADOS BÁSICOS. TODA INFORMAÇÃO SERÁ GRAVADA EM MAIÚSCULAS.
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name" className="uppercase">SERVIDOR (NOME COMPLETO)</Label>
                      <Input id="name" name="name" placeholder="EX: JOÃO DA SILVA" required className="uppercase" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="matricula" className="uppercase">MATRÍCULA</Label>
                        <Input id="matricula" name="matricula" placeholder="EX: 123456" required className="uppercase" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="unit" className="uppercase">SETOR / UNIDADE</Label>
                        <Input id="unit" name="unit" placeholder="EX: ROMU / PATAMO" required className="uppercase" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="escala" className="uppercase">ESCALA</Label>
                        <Input id="escala" name="escala" placeholder="EX: 12X36 / 24X72" required className="uppercase" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="turno" className="uppercase">TURNO</Label>
                        <Input id="turno" name="turno" placeholder="EX: DIURNO / NOTURNO" required className="uppercase" />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="role" className="uppercase">CARGO / FUNÇÃO</Label>
                      <Input id="role" name="role" placeholder="EX: AGENTE DE SEGURANÇA" required className="uppercase" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email" className="uppercase">E-MAIL (OPCIONAL)</Label>
                      <Input id="email" name="email" type="email" placeholder="EX: JOAO.SILVA@GMVV.GOV.BR" className="uppercase" />
                    </div>
                  </div>
                </ScrollArea>
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
      </div>

      <Card className="card-shadow">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="BUSCAR POR SERVIDOR, MATRÍCULA, SETOR OU QRA..."
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
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[50px] font-bold">Nº</TableHead>
                    <TableHead className="font-bold">QRAs</TableHead>
                    <TableHead className="font-bold">SERVIDOR</TableHead>
                    <TableHead className="font-bold">MATRÍCULA</TableHead>
                    <TableHead className="font-bold">ESCALA</TableHead>
                    <TableHead className="font-bold">TURNO</TableHead>
                    <TableHead className="font-bold">CARGO</TableHead>
                    <TableHead className="font-bold">SETOR</TableHead>
                    <TableHead className="text-right font-bold">AÇÕES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground uppercase">
                        NENHUM INTEGRANTE ENCONTRADO.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee, index) => (
                      <TableRow key={employee.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono text-xs">{index + 1}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono uppercase text-[10px]">{employee.qra}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold uppercase text-xs">{employee.name}</span>
                        </TableCell>
                        <TableCell className="font-mono text-xs uppercase">{employee.matricula}</TableCell>
                        <TableCell className="text-xs uppercase">{employee.escala}</TableCell>
                        <TableCell className="text-xs uppercase">{employee.turno}</TableCell>
                        <TableCell className="text-xs uppercase">{employee.role}</TableCell>
                        <TableCell className="text-xs uppercase">
                          <Badge variant="secondary" className="font-normal uppercase text-[10px]">{employee.unit}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[160px]">
                              <DropdownMenuLabel className="uppercase text-[10px]">GERENCIAR</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="uppercase text-[11px]">
                                <Edit className="mr-2 h-3.5 w-3.5" /> EDITAR
                              </DropdownMenuItem>
                              <DropdownMenuItem className="uppercase text-[11px]">
                                <QrCode className="mr-2 h-3.5 w-3.5" /> VER QRA
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive uppercase text-[11px]" onClick={() => handleDelete(employee.id)}>
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> EXCLUIR
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
