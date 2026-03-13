
"use client"

import * as React from "react"
import { 
  Search, 
  MoreHorizontal, 
  UserPlus, 
  Edit, 
  Trash2,
  Loader2,
  Upload,
  Trash,
  Filter,
  X,
  RefreshCw,
  AlertCircle,
  Users,
  CheckCircle2,
  Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, doc, deleteDoc, query, orderBy, updateDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area"
import * as XLSX from 'xlsx';

// Função auxiliar movida para fora para evitar recriação
function generateValidationCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function EfetivoPage() {
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false)
  const [isBatchDeleteAlertOpen, setIsBatchDeleteAlertOpen] = React.useState(false)
  const [selectedEmployee, setSelectedEmployee] = React.useState<any>(null)
  const [employeeToDelete, setEmployeeToDelete] = React.useState<string | null>(null)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [searchTerm, setSearchTerm] = React.useState("")
  const [loadingImport, setLoadingImport] = React.useState(false)
  const [generatedCode, setGeneratedCode] = React.useState("")
  
  const [filters, setFilters] = React.useState({
    qra: "",
    name: "",
    escala: "",
    turno: "",
    role: "",
    unit: ""
  })

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  const employeesRef = React.useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'employees'), orderBy('qra', 'asc'));
  }, [firestore]);

  const { data: employees, loading: loadingCollection } = useCollection(employeesRef);

  const stats = React.useMemo(() => {
    if (!employees) return { total: 0, active: 0, pending: 0 };
    return {
      total: employees.length,
      active: employees.filter(e => e.status === "ATIVO").length,
      pending: employees.filter(e => e.status === "PENDENTE").length
    };
  }, [employees]);

  React.useEffect(() => {
    if (isAddOpen) {
      setGeneratedCode(generateValidationCode());
    }
  }, [isAddOpen]);

  const filteredEmployees = React.useMemo(() => {
    if (!employees) return [];
    const term = searchTerm.toLowerCase();
    
    return employees.filter(emp => {
      const matchesSearch = !searchTerm || (
        emp.name?.toLowerCase().includes(term) ||
        emp.qra?.toLowerCase().includes(term) ||
        emp.matricula?.toLowerCase().includes(term) ||
        emp.unit?.toLowerCase().includes(term)
      );

      const matchesQra = !filters.qra || emp.qra?.toLowerCase().includes(filters.qra.toLowerCase());
      const matchesName = !filters.name || emp.name?.toLowerCase().includes(filters.name.toLowerCase());
      const matchesEscala = !filters.escala || emp.escala?.toLowerCase().includes(filters.escala.toLowerCase());
      const matchesTurno = !filters.turno || emp.turno?.toLowerCase().includes(filters.turno.toLowerCase());
      const matchesRole = !filters.role || emp.role?.toLowerCase().includes(filters.role.toLowerCase());
      const matchesUnit = !filters.unit || emp.unit?.toLowerCase().includes(filters.unit.toLowerCase());

      return matchesSearch && matchesQra && matchesName && matchesEscala && matchesTurno && matchesRole && matchesUnit;
    });
  }, [employees, searchTerm, filters]);

  function handleAddEmployee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!firestore) return;

    const formData = new FormData(e.currentTarget);
    const newEmployee = {
      name: (formData.get('name') as string).toUpperCase(),
      email: (formData.get('email') as string || "").toUpperCase(),
      matricula: (formData.get('matricula') as string).toUpperCase(),
      validationCode: (formData.get('validationCode') as string || generatedCode).toUpperCase(),
      escala: (formData.get('escala') as string).toUpperCase(),
      turno: (formData.get('turno') as string).toUpperCase(),
      role: (formData.get('role') as string).toUpperCase(),
      unit: (formData.get('unit') as string).toUpperCase(),
      qra: (formData.get('qra') as string || "").toUpperCase(),
      status: "PENDENTE",
      avatar: `https://picsum.photos/seed/${Math.random()}/100/100`,
      admissionDate: new Date().toISOString().split('T')[0]
    };

    setIsAddOpen(false);
    addDoc(collection(firestore, 'employees'), newEmployee)
      .then(() => toast({ title: "SUCESSO!", description: "REGISTRO CRIADO." }))
      .catch(() => toast({ variant: "destructive", title: "ERRO", description: "FALHA AO SALVAR." }));
  }

  function handleUpdateEmployee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!firestore || !selectedEmployee) return;

    const formData = new FormData(e.currentTarget);
    const updates: any = {
      name: (formData.get('name') as string).toUpperCase(),
      matricula: (formData.get('matricula') as string).toUpperCase(),
      validationCode: (formData.get('validationCode') as string || "").toUpperCase(),
      escala: (formData.get('escala') as string).toUpperCase(),
      turno: (formData.get('turno') as string).toUpperCase(),
      role: (formData.get('role') as string).toUpperCase(),
      unit: (formData.get('unit') as string).toUpperCase(),
      qra: (formData.get('qra') as string || "").toUpperCase(),
    };

    if (selectedEmployee.status !== "PENDENTE") {
      updates.status = (formData.get('status') as string).toUpperCase();
    }

    const id = selectedEmployee.id;
    setIsEditOpen(false);
    setSelectedEmployee(null);

    updateDoc(doc(firestore, 'employees', id), updates)
      .then(() => toast({ title: "SUCESSO!", description: "REGISTRO ATUALIZADO." }))
      .catch(() => toast({ variant: "destructive", title: "ERRO", description: "FALHA AO ATUALIZAR." }));
  }

  function handleImportExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !firestore) return;

    setLoadingImport(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      setTimeout(() => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws) as any[];

          data.forEach((row) => {
            const name = (row['SERVIDOR'] || "").toString().toUpperCase();
            const qra = (row['QRAs'] || row['QRA'] || "").toString().toUpperCase();
            const matricula = (row['MATRICULA'] || row['MATRÍCULA'] || "").toString().toUpperCase();
            const validationCode = (row['CÓD. VALIDAÇÃO'] || row['VALIDACAO'] || generateValidationCode()).toString().toUpperCase();
            const escala = (row['ESCALA'] || "").toString().toUpperCase();
            const turno = (row['TURNO'] || "").toString().toUpperCase();
            const role = (row['CARGO'] || "").toString().toUpperCase();
            const unit = (row['SETOR'] || "").toString().toUpperCase();

            if (name && matricula) {
              addDoc(collection(firestore, 'employees'), {
                name, qra, matricula, validationCode, escala, turno, role, unit,
                status: "PENDENTE",
                avatar: `https://picsum.photos/seed/${Math.random()}/100/100`,
                admissionDate: new Date().toISOString().split('T')[0],
                email: ""
              });
            }
          });

          toast({ title: "IMPORTAÇÃO CONCLUÍDA", description: `${data.length} REGISTROS PROCESSADOS.` });
        } catch (error) {
          toast({ variant: "destructive", title: "ERRO NA IMPORTAÇÃO" });
        } finally {
          setLoadingImport(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }, 50);
    };
    reader.readAsBinaryString(file);
  }

  function confirmDelete() {
    if (!firestore || !employeeToDelete) return;
    const id = employeeToDelete;
    setEmployeeToDelete(null);
    setIsDeleteAlertOpen(false);
    deleteDoc(doc(firestore, 'employees', id))
      .then(() => toast({ title: "REGISTRO REMOVIDO" }))
      .catch(() => toast({ variant: "destructive", title: "ERRO AO EXCLUIR" }));
  }

  function handleBatchDelete() {
    if (!firestore || selectedIds.length === 0) return;
    const idsToRemove = [...selectedIds];
    setSelectedIds([]);
    setIsBatchDeleteAlertOpen(false);
    idsToRemove.forEach(id => deleteDoc(doc(firestore, 'employees', id)));
    toast({ title: "EXCLUSÃO EM LOTE", description: `${idsToRemove.length} REGISTROS REMOVIDOS.` });
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredEmployees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEmployees.map(emp => emp.id));
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  const clearFilters = () => setFilters({ qra: "", name: "", escala: "", turno: "", role: "", unit: "" });
  const hasActiveFilters = Object.values(filters).some(v => v !== "");

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold tracking-tight uppercase text-primary">EFETIVO</h2>
          <p className="text-muted-foreground uppercase text-sm">GESTÃO INTEGRADA DO EFETIVO DA UNIDADE.</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button 
              variant="destructive" 
              className="gap-2 uppercase animate-in fade-in zoom-in duration-200"
              onClick={() => setIsBatchDeleteAlertOpen(true)}
            >
              <Trash className="h-4 w-4" />
              EXCLUIR ({selectedIds.length})
            </Button>
          )}
          <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleImportExcel} />
          <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={loadingImport}>
            {loadingImport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            IMPORTAR EXCEL
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><UserPlus className="h-4 w-4" />NOVO REGISTRO</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleAddEmployee}>
                <DialogHeader><DialogTitle className="uppercase">CADASTRAR INTEGRANTE</DialogTitle></DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4 mt-4">
                  <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                      <Label htmlFor="name" className="uppercase">NOME COMPLETO</Label>
                      <Input id="name" name="name" required className="uppercase" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2"><Label htmlFor="qra" className="uppercase">QRA</Label><Input id="qra" name="qra" required className="uppercase" /></div>
                      <div className="grid gap-2"><Label htmlFor="matricula" className="uppercase">MATRÍCULA</Label><Input id="matricula" name="matricula" required className="uppercase" /></div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="validationCode" className="uppercase">CÓDIGO DE VALIDAÇÃO</Label>
                      <div className="flex gap-2">
                        <Input id="validationCode" name="validationCode" value={generatedCode} onChange={(e) => setGeneratedCode(e.target.value.toUpperCase())} className="uppercase font-mono font-bold text-primary" />
                        <Button type="button" variant="outline" size="icon" onClick={() => setGeneratedCode(generateValidationCode())}><RefreshCw className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2"><Label htmlFor="unit" className="uppercase">SETOR</Label><Input id="unit" name="unit" required className="uppercase" /></div>
                      <div className="grid gap-2"><Label htmlFor="escala" className="uppercase">ESCALA</Label><Input id="escala" name="escala" required className="uppercase" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2"><Label htmlFor="turno" className="uppercase">TURNO</Label><Input id="turno" name="turno" required className="uppercase" /></div>
                      <div className="grid gap-2"><Label htmlFor="role" className="uppercase">CARGO</Label><Input id="role" name="role" required className="uppercase" /></div>
                    </div>
                  </div>
                </ScrollArea>
                <DialogFooter className="mt-6">
                  <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>CANCELAR</Button>
                  <Button type="submit">GRAVAR</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-shadow border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase">TOTAL EFETIVO</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-[10px] text-muted-foreground uppercase">SERVIDORES CADASTRADOS</p>
          </CardContent>
        </Card>
        <Card className="card-shadow border-green-500/20 bg-green-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase text-green-600">ATIVOS</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-[10px] text-muted-foreground uppercase">AGENTES ATIVOS</p>
          </CardContent>
        </Card>
        <Card className="card-shadow border-orange-500/20 bg-orange-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase text-orange-600">AGUARDANDO CADASTRO</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <p className="text-[10px] text-muted-foreground uppercase">AGUARDANDO VALIDAÇÃO</p>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="uppercase">CONFIRMAR EXCLUSÃO</AlertDialogTitle>
            <AlertDialogDescription className="uppercase text-xs">AÇÃO IRREVERSÍVEL. O REGISTRO SERÁ REMOVIDO.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="uppercase">CANCELAR</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive uppercase">EXCLUIR</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBatchDeleteAlertOpen} onOpenChange={setIsBatchDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="uppercase">EXCLUIR {selectedIds.length} REGISTROS?</AlertDialogTitle>
            <AlertDialogDescription className="uppercase text-xs">ESTA AÇÃO É IRREVERSÍVEL.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="uppercase">CANCELAR</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchDelete} className="bg-destructive uppercase">EXCLUIR SELECIONADOS</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedEmployee && (
            <form onSubmit={handleUpdateEmployee}>
              <DialogHeader><DialogTitle className="uppercase">EDITAR SERVIDOR</DialogTitle></DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-4 mt-4">
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2"><Label htmlFor="edit-name" className="uppercase">NOME COMPLETO</Label><Input id="edit-name" name="name" defaultValue={selectedEmployee.name} required className="uppercase" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label htmlFor="edit-qra" className="uppercase">QRA</Label><Input id="edit-qra" name="qra" defaultValue={selectedEmployee.qra} required className="uppercase" /></div>
                    <div className="grid gap-2"><Label htmlFor="edit-matricula" className="uppercase">MATRÍCULA</Label><Input id="edit-matricula" name="matricula" defaultValue={selectedEmployee.matricula} required className="uppercase" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label htmlFor="edit-validationCode" className="uppercase">CÓDIGO DE VALIDAÇÃO</Label><Input id="edit-validationCode" name="validationCode" defaultValue={selectedEmployee.validationCode} className="uppercase font-mono font-bold text-primary" /></div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-status" className="uppercase">STATUS</Label>
                      <Select name="status" defaultValue={selectedEmployee.status} disabled={selectedEmployee.status === "PENDENTE"}>
                        <SelectTrigger id="edit-status"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDENTE">PENDENTE</SelectItem>
                          <SelectItem value="ATIVO">ATIVO</SelectItem>
                          <SelectItem value="FÉRIAS">FÉRIAS</SelectItem>
                          <SelectItem value="LICENÇA">LICENÇA</SelectItem>
                          <SelectItem value="INATIVO">INATIVO</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label htmlFor="edit-unit" className="uppercase">SETOR</Label><Input id="edit-unit" name="unit" defaultValue={selectedEmployee.unit} required className="uppercase" /></div>
                    <div className="grid gap-2"><Label htmlFor="edit-escala" className="uppercase">ESCALA</Label><Input id="edit-escala" name="escala" defaultValue={selectedEmployee.escala} required className="uppercase" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label htmlFor="edit-turno" className="uppercase">TURNO</Label><Input id="edit-turno" name="turno" defaultValue={selectedEmployee.turno} required className="uppercase" /></div>
                    <div className="grid gap-2"><Label htmlFor="edit-role" className="uppercase">CARGO</Label><Input id="edit-role" name="role" defaultValue={selectedEmployee.role} required className="uppercase" /></div>
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter className="mt-6">
                <Button variant="outline" type="button" onClick={() => setIsEditOpen(false)}>CANCELAR</Button>
                <Button type="submit">SALVAR</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Card className="card-shadow border-primary/20">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="BUSCAR POR SERVIDOR, MATRÍCULA OU QRA..." className="pl-8 uppercase" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={hasActiveFilters ? "default" : "outline"} className="gap-2">
                <Filter className="h-4 w-4" /> FILTROS {hasActiveFilters && <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px] bg-white text-primary">!</Badge>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-4" align="end">
              <div className="grid gap-4">
                <div className="flex items-center justify-between border-b pb-2"><h4 className="font-bold uppercase text-xs">FILTROS AVANÇADOS</h4><Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearFilters}><X className="h-4 w-4" /></Button></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5"><Label className="text-[10px] uppercase font-bold">QRA</Label><Input className="h-8 text-xs uppercase" value={filters.qra} onChange={(e) => setFilters({...filters, qra: e.target.value})} /></div>
                  <div className="grid gap-1.5"><Label className="text-[10px] uppercase font-bold">NOME</Label><Input className="h-8 text-xs uppercase" value={filters.name} onChange={(e) => setFilters({...filters, name: e.target.value})} /></div>
                  <div className="grid gap-1.5"><Label className="text-[10px] uppercase font-bold">ESCALA</Label><Input className="h-8 text-xs uppercase" value={filters.escala} onChange={(e) => setFilters({...filters, escala: e.target.value})} /></div>
                  <div className="grid gap-1.5"><Label className="text-[10px] uppercase font-bold">TURNO</Label><Input className="h-8 text-xs uppercase" value={filters.turno} onChange={(e) => setFilters({...filters, turno: e.target.value})} /></div>
                  <div className="grid gap-1.5"><Label className="text-[10px] uppercase font-bold">CARGO</Label><Input className="h-8 text-xs uppercase" value={filters.role} onChange={(e) => setFilters({...filters, role: e.target.value})} /></div>
                  <div className="grid gap-1.5"><Label className="text-[10px] uppercase font-bold">SETOR</Label><Input className="h-8 text-xs uppercase" value={filters.unit} onChange={(e) => setFilters({...filters, unit: e.target.value})} /></div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </CardHeader>
        <CardContent>
          {loadingCollection ? (
            <div className="flex h-32 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[40px]"><Checkbox checked={filteredEmployees.length > 0 && selectedIds.length === filteredEmployees.length} onCheckedChange={toggleSelectAll} /></TableHead>
                    <TableHead className="w-[50px] font-bold uppercase text-[10px]">Nº</TableHead>
                    <TableHead className="font-bold uppercase text-[10px]">QRAs</TableHead>
                    <TableHead className="font-bold uppercase text-[10px]">SERVIDOR</TableHead>
                    <TableHead className="font-bold uppercase text-[10px]">MATRÍCULA</TableHead>
                    <TableHead className="font-bold uppercase text-[10px]">ESCALA</TableHead>
                    <TableHead className="font-bold uppercase text-[10px]">TURNO</TableHead>
                    <TableHead className="font-bold uppercase text-[10px]">CARGO</TableHead>
                    <TableHead className="font-bold uppercase text-[10px]">SETOR</TableHead>
                    <TableHead className="font-bold uppercase text-[10px]">CÓD. VALIDAÇÃO</TableHead>
                    <TableHead className="font-bold uppercase text-[10px]">STATUS</TableHead>
                    <TableHead className="text-right font-bold uppercase text-[10px]">AÇÕES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee, index) => (
                    <TableRow key={employee.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell><Checkbox checked={selectedIds.includes(employee.id)} onCheckedChange={() => toggleSelect(employee.id)} /></TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-semibold text-xs uppercase">{employee.qra}</TableCell>
                      <TableCell className="font-semibold text-xs uppercase">{employee.name}</TableCell>
                      <TableCell className="font-mono text-xs uppercase">{employee.matricula}</TableCell>
                      <TableCell className="text-xs uppercase">{employee.escala}</TableCell>
                      <TableCell className="text-xs uppercase">{employee.turno}</TableCell>
                      <TableCell className="text-xs uppercase">{employee.role}</TableCell>
                      <TableCell><Badge variant="secondary" className="uppercase text-[9px]">{employee.unit}</Badge></TableCell>
                      <TableCell className="text-xs uppercase">{employee.validationCode || "---"}</TableCell>
                      <TableCell>
                        <Badge variant={employee.status === "PENDENTE" ? "outline" : "default"} className={`uppercase text-[9px] font-bold ${employee.status === "PENDENTE" ? "border-orange-500 text-orange-600 bg-orange-50" : "bg-green-600"}`}>{employee.status || "PENDENTE"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => { setSelectedEmployee(employee); setTimeout(() => setIsEditOpen(true), 150); }} className="uppercase text-xs cursor-pointer"><Edit className="mr-2 h-3.5 w-3.5" /> EDITAR</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => { setEmployeeToDelete(employee.id); setTimeout(() => setIsDeleteAlertOpen(true), 150); }} className="text-destructive uppercase text-xs cursor-pointer"><Trash2 className="mr-2 h-3.5 w-3.5" /> EXCLUIR</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
