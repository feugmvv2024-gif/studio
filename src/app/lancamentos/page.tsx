"use client"

import * as React from "react"
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Loader2, 
  MoreHorizontal,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useFirestore, useCollection } from '@/firebase'
import { 
  collection, 
  addDoc, 
  doc, 
  deleteDoc, 
  query, 
  orderBy, 
  updateDoc, 
  limit, 
  serverTimestamp
} from 'firebase/firestore'
import { useToast } from "@/hooks/use-toast"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { cn } from "@/lib/utils"

// Utilitários
const getSaoPauloDate = () => {
  const now = new Date();
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now).split('/').reverse().join('-');
};

const applyHoursMask = (value: string) => {
  let v = value.replace(/\D/g, "");
  if (v.length > 6) v = v.slice(0, 6);
  if (v.length <= 2) return v;
  const minutes = v.slice(-2);
  const hours = v.slice(0, -2);
  return `${hours}:${minutes}`;
};

export default function LancamentosPage() {
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false)
  const [selectedLaunch, setSelectedLaunch] = React.useState<any>(null)
  const [launchToDelete, setLaunchToDelete] = React.useState<string | null>(null)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  
  // Estados do Formulário
  const [hoursInput, setHoursInput] = React.useState("")
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string>("")
  const [searchEmployeeTerm, setSearchEmployeeTerm] = React.useState("")
  const [formDays, setFormDays] = React.useState<number>(0)
  const [formStartDate, setFormStartDate] = React.useState<string>("")
  const [formEndDate, setFormEndDate] = React.useState<string>("")
  
  // Novos Estados para o Input Customizado
  const [showServidorSuggestions, setShowServidorSuggestions] = React.useState(false)
  const servidorSearchInputRef = React.useRef<HTMLInputElement>(null)

  const firestore = useFirestore()
  const { toast } = useToast()

  // Queries
  const launchesQuery = React.useMemo(() => firestore ? query(collection(firestore, 'launches'), orderBy('createdAt', 'desc'), limit(100)) : null, [firestore]);
  const employeesQuery = React.useMemo(() => firestore ? query(collection(firestore, 'employees'), orderBy('name', 'asc')) : null, [firestore]);
  const launchTypesQuery = React.useMemo(() => firestore ? query(collection(firestore, 'launchTypes'), orderBy('name', 'asc')) : null, [firestore]);

  const { data: launches, loading: loadingLaunches } = useCollection(launchesQuery)
  const { data: employees } = useCollection(employeesQuery)
  const { data: launchTypes } = useCollection(launchTypesQuery)

  // Sincronização de Edição
  React.useEffect(() => {
    if (selectedLaunch) {
      setHoursInput(selectedLaunch.hours || "");
      setSelectedEmployeeId(selectedLaunch.employeeId || "");
      // Preenche o campo de busca com o nome do servidor editado
      setSearchEmployeeTerm(`${selectedLaunch.employeeName} (${selectedLaunch.employeeQra})`);
      setFormDays(selectedLaunch.days || 0);
      setFormStartDate(selectedLaunch.startDate || "");
      setFormEndDate(selectedLaunch.endDate || "");
    } else if (isAddOpen) {
      setHoursInput("");
      setSelectedEmployeeId("");
      setSearchEmployeeTerm("");
      setFormDays(0);
      setFormStartDate(getSaoPauloDate());
      setFormEndDate(getSaoPauloDate());
    }
  }, [selectedLaunch, isAddOpen, isEditOpen]);

  // Cálculo Automático de Data Fim
  React.useEffect(() => {
    if (formStartDate && formDays > 0) {
      const start = new Date(formStartDate + "T00:00:00");
      const end = new Date(start);
      end.setDate(start.getDate() + (formDays - 1));
      setFormEndDate(end.toISOString().split('T')[0]);
    } else {
      setFormEndDate(formStartDate);
    }
  }, [formStartDate, formDays]);

  const filteredLaunches = React.useMemo(() => {
    if (!launches) return [];
    const term = searchTerm.toLowerCase();
    return launches.filter(l => 
      l.employeeName?.toLowerCase().includes(term) || 
      l.employeeQra?.toLowerCase().includes(term) ||
      l.type?.toLowerCase().includes(term)
    );
  }, [launches, searchTerm]);

  const filteredEmployeesForSelection = React.useMemo(() => {
    if (!employees) return [];
    const term = searchEmployeeTerm.toLowerCase();
    return employees.filter(emp => 
      emp.name?.toLowerCase().includes(term) || 
      emp.qra?.toLowerCase().includes(term) ||
      emp.matricula?.toLowerCase().includes(term)
    ).slice(0, 50);
  }, [employees, searchEmployeeTerm]);

  const selectedEmployee = React.useMemo(() => 
    employees?.find(emp => emp.id === selectedEmployeeId), 
    [employees, selectedEmployeeId]
  );

  const resetForm = () => {
    setSelectedLaunch(null);
    setSelectedEmployeeId("");
    setSearchEmployeeTerm("");
    setHoursInput("");
    setFormDays(0);
    setFormStartDate(getSaoPauloDate());
  };

  async function handleMutation(e: React.FormEvent<HTMLFormElement>, isUpdate: boolean) {
    e.preventDefault();
    if (!firestore || !selectedEmployee) {
      toast({ variant: "destructive", title: "ERRO", description: "SELECIONE UM SERVIDOR." });
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      date: formData.get('date') as string,
      employeeId: selectedEmployeeId,
      employeeName: selectedEmployee.name || "N/A",
      employeeQra: selectedEmployee.qra || "N/A",
      escala: selectedEmployee.escala || "N/A",
      turno: selectedEmployee.turno || "N/A",
      type: (formData.get('type') as string).toUpperCase(),
      days: Number(formDays),
      hours: hoursInput,
      startDate: formStartDate,
      endDate: formEndDate,
      observations: (formData.get('observations') as string || "").toUpperCase(),
      ...(isUpdate ? {} : { createdAt: serverTimestamp() })
    };

    const docRef = isUpdate ? doc(firestore, 'launches', selectedLaunch.id) : null;
    const action = isUpdate ? updateDoc(docRef!, data) : addDoc(collection(firestore, 'launches'), data);

    action.then(() => {
      toast({ title: "SUCESSO!", description: isUpdate ? "LANÇAMENTO ATUALIZADO." : "LANÇAMENTO REALIZADO." });
      setIsAddOpen(false);
      setIsEditOpen(false);
      resetForm();
    }).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: isUpdate ? docRef!.path : 'launches',
        operation: isUpdate ? 'update' : 'create',
        requestResourceData: data
      }));
    }).finally(() => setIsSubmitting(false));
  }

  const renderFormFields = (isEdit: boolean) => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label className="uppercase text-[10px] font-bold">DATA LANÇAMENTO</Label>
          <Input name="date" type="date" defaultValue={isEdit ? selectedLaunch?.date : getSaoPauloDate()} required className="h-9" />
        </div>
        
        {/* NOVO CAMPO ADAPTADO: BUSCA DE SERVIDOR */}
        <div className="grid gap-2 sm:col-span-2 relative">
          <Label className="uppercase text-[10px] font-bold">SERVIDOR (NOME OU QRA)</Label>
          <div className="relative">
            <Input 
              ref={servidorSearchInputRef}
              type="text"
              placeholder="DIGITE O NOME, QRA OU MATRÍCULA..."
              value={searchEmployeeTerm}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setSearchEmployeeTerm(val);
                setShowServidorSuggestions(true);
                
                // Se apagar tudo, limpa o ID selecionado
                if (!val) {
                  setSelectedEmployeeId('');
                }

                // Tenta achar por QRA exato enquanto digita
                if (employees) {
                  const exactMatch = employees.find(s => s.qra === val.trim());
                  if (exactMatch) {
                    setSelectedEmployeeId(exactMatch.id);
                  }
                }
              }}
              onFocus={() => setShowServidorSuggestions(true)}
              className="w-full h-9 uppercase text-[11px] pr-20"
            />
            
            {/* Indicador de Seleção com pulse verde */}
            {selectedEmployeeId && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[9px] font-bold text-green-600 uppercase">OK</span>
              </div>
            )}
          </div>

          {/* Lista de Sugestões Absoluta */}
          {showServidorSuggestions && searchEmployeeTerm && (
            <div className="absolute z-[60] left-0 right-0 top-full mt-1 bg-background border border-border rounded-md shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
              {filteredEmployeesForSelection.length > 0 ? (
                filteredEmployeesForSelection.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedEmployeeId(s.id);
                      setSearchEmployeeTerm(`${s.name} (${s.qra})`);
                      setShowServidorSuggestions(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-muted flex flex-col border-b border-border last:border-0 transition-colors"
                  >
                    <span className="text-[11px] font-bold text-foreground uppercase">{s.name}</span>
                    <span className="text-[9px] text-muted-foreground uppercase">QRA: {s.qra} • MAT: {s.matricula}</span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-[10px] text-muted-foreground italic uppercase">
                  NENHUM SERVIDOR ENCONTRADO
                </div>
              )}
            </div>
          )}
          
          {/* Overlay invisível para fechar sugestões ao clicar fora */}
          {showServidorSuggestions && (
            <div 
              className="fixed inset-0 z-[55]" 
              onClick={() => setShowServidorSuggestions(false)}
            />
          )}

          {/* Input oculto para não quebrar a validação HTML (required) do formulário */}
          <input type="hidden" name="employeeId" value={selectedEmployeeId} required />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label className="uppercase text-[10px] font-bold">TIPO</Label>
          <Select name="type" defaultValue={isEdit ? selectedLaunch?.type : undefined} required>
            <SelectTrigger className="h-9 uppercase text-[11px]"><SelectValue placeholder="SELECIONE..." /></SelectTrigger>
            <SelectContent>
              {launchTypes?.map((type: any) => <SelectItem key={type.id} value={type.name} className="uppercase text-[11px]">{type.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-2">
            <Label className="uppercase text-[10px] font-bold">DIAS</Label>
            <Input name="days" type="number" value={formDays} onChange={(e) => setFormDays(Number(e.target.value))} className="h-9" />
          </div>
          <div className="grid gap-2">
            <Label className="uppercase text-[10px] font-bold">HORAS (HH:MM)</Label>
            <Input name="hours" placeholder="00:00" value={hoursInput} onChange={(e) => setHoursInput(applyHoursMask(e.target.value))} required className="h-9" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label className="uppercase text-[10px] font-bold">DATA INÍCIO</Label>
          <Input name="startDate" type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} className="h-9" />
        </div>
        <div className="grid gap-2">
          <Label className="uppercase text-[10px] font-bold">DATA FIM</Label>
          <Input name="endDate" type="date" value={formEndDate} readOnly className="h-9 bg-muted/50 cursor-not-allowed" />
        </div>
      </div>

      <div className="grid gap-2">
        <Label className="uppercase text-[10px] font-bold">OBSERVAÇÕES</Label>
        <Textarea name="observations" defaultValue={isEdit ? selectedLaunch?.observations : ""} className="uppercase text-xs min-h-[80px]" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase text-primary">LANÇAMENTOS</h2>
          <p className="text-muted-foreground uppercase text-[10px]">GESTOR DE BANCO DE HORAS E AFASTAMENTOS.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 uppercase font-bold text-xs h-9"><Plus className="h-4 w-4" /> NOVO LANÇAMENTO</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[95vh] flex flex-col p-0 overflow-hidden">
            <form onSubmit={(e) => handleMutation(e, false)} className="flex flex-col h-full">
              <DialogHeader className="p-6 pb-2"><DialogTitle className="uppercase">EFETUAR LANÇAMENTO</DialogTitle></DialogHeader>
              <ScrollArea className="flex-1 p-6 pt-2 overflow-visible">
                {renderFormFields(false)}
              </ScrollArea>
              <DialogFooter className="p-6 pt-4 border-t gap-2 sm:gap-0">
                <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)} className="uppercase text-xs font-bold">CANCELAR</Button>
                <Button type="submit" disabled={isSubmitting} className="uppercase text-xs font-bold">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "GRAVAR"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="card-shadow border-primary/10 overflow-hidden">
        <CardHeader className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="BUSCAR POR SERVIDOR OU TIPO..." className="pl-8 uppercase h-9 text-[10px]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingLaunches ? <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[60px] font-bold uppercase text-[9px] px-4">Nº</TableHead>
                    <TableHead className="font-bold uppercase text-[9px] min-w-[90px]">DATA</TableHead>
                    <TableHead className="font-bold uppercase text-[9px] min-w-[180px]">SERVIDOR</TableHead>
                    <TableHead className="font-bold uppercase text-[9px] min-w-[120px]">ESCALA/TURNO</TableHead>
                    <TableHead className="font-bold uppercase text-[9px] min-w-[110px]">TIPO</TableHead>
                    <TableHead className="font-bold uppercase text-[9px] min-w-[60px]">DIAS</TableHead>
                    <TableHead className="font-bold uppercase text-[9px] min-w-[70px]">HORAS</TableHead>
                    <TableHead className="font-bold uppercase text-[9px] min-w-[90px]">INÍCIO</TableHead>
                    <TableHead className="font-bold uppercase text-[9px] min-w-[90px]">FIM</TableHead>
                    <TableHead className="font-bold uppercase text-[9px] min-w-[150px]">OBSERVAÇÕES</TableHead>
                    <TableHead className="text-right font-bold uppercase text-[9px] pr-4">AÇÕES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLaunches.map((launch, index) => (
                    <TableRow key={launch.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-[9px] px-4">{filteredLaunches.length - index}</TableCell>
                      <TableCell className="text-[11px] whitespace-nowrap">{launch.date?.split('-').reverse().join('/')}</TableCell>
                      <TableCell><div className="flex flex-col"><span className="font-bold text-[11px] uppercase">{launch.employeeName}</span><span className="text-[9px] text-muted-foreground uppercase">{launch.employeeQra}</span></div></TableCell>
                      <TableCell className="text-[10px] uppercase">{launch.escala} / {launch.turno}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[9px] uppercase">{launch.type}</Badge></TableCell>
                      <TableCell className="text-[11px] font-bold">{launch.days || 0}D</TableCell>
                      <TableCell className="text-[11px] font-bold text-primary">{launch.hours}H</TableCell>
                      <TableCell className="text-[10px] whitespace-nowrap">{launch.startDate?.split('-').reverse().join('/')}</TableCell>
                      <TableCell className="text-[10px] whitespace-nowrap">{launch.endDate?.split('-').reverse().join('/')}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-[10px] uppercase text-muted-foreground">{launch.observations}</TableCell>
                      <TableCell className="text-right pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => { setSelectedLaunch(launch); setIsEditOpen(true); }} className="uppercase text-[10px]"><Edit className="mr-2 h-3.5 w-3.5" /> EDITAR</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => { setLaunchToDelete(launch.id); setIsDeleteAlertOpen(true); }} className="text-destructive uppercase text-[10px]"><Trash2 className="mr-2 h-3.5 w-3.5" /> EXCLUIR</DropdownMenuItem>
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

      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[95vh] flex flex-col p-0 overflow-hidden">
          {selectedLaunch && (
            <form onSubmit={(e) => handleMutation(e, true)} className="flex flex-col h-full">
              <DialogHeader className="p-6 pb-2"><DialogTitle className="uppercase">EDITAR LANÇAMENTO</DialogTitle></DialogHeader>
              <ScrollArea className="flex-1 p-6 pt-2 overflow-visible">
                {renderFormFields(true)}
              </ScrollArea>
              <DialogFooter className="p-6 pt-4 border-t gap-2 sm:gap-0">
                <Button variant="outline" type="button" onClick={() => setIsEditOpen(false)} className="uppercase text-xs font-bold">CANCELAR</Button>
                <Button type="submit" disabled={isSubmitting} className="uppercase text-xs font-bold">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "SALVAR"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="max-w-[90vw]">
          <AlertDialogHeader>
            <AlertDialogTitle className="uppercase">CONFIRMAR EXCLUSÃO</AlertDialogTitle>
            <AlertDialogDescription className="uppercase text-[10px]">AÇÃO IRREVERSÍVEL. O LANÇAMENTO SERÁ REMOVIDO.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="uppercase text-xs">CANCELAR</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { 
                if (launchToDelete) {
                  deleteDoc(doc(firestore, 'launches', launchToDelete))
                    .then(() => toast({ title: "REMOVIDO" }))
                    .catch(err => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `launches/${launchToDelete}`, operation: 'delete' })))
                    .finally(() => setIsDeleteAlertOpen(false));
                }
              }} 
              className="bg-destructive uppercase text-xs"
            >
              EXCLUIR
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
