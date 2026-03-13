"use client"

import * as React from "react"
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Loader2, 
  MoreHorizontal,
  Check,
  ChevronsUpDown
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  const [formDays, setFormDays] = React.useState<number>(0)
  const [formStartDate, setFormStartDate] = React.useState<string>("")
  const [formEndDate, setFormEndDate] = React.useState<string>("")
  const [openCombobox, setOpenCombobox] = React.useState(false)

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
      setFormDays(selectedLaunch.days || 0);
      setFormStartDate(selectedLaunch.startDate || "");
      setFormEndDate(selectedLaunch.endDate || "");
    } else if (isAddOpen) {
      setHoursInput("");
      setSelectedEmployeeId("");
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

  const selectedEmployee = React.useMemo(() => 
    employees?.find(emp => emp.id === selectedEmployeeId), 
    [employees, selectedEmployeeId]
  );

  const resetForm = () => {
    setSelectedLaunch(null);
    setSelectedEmployeeId("");
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
        
        <div className="grid gap-2 sm:col-span-2">
          <Label className="uppercase text-[10px] font-bold">SERVIDOR</Label>
          <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCombobox}
                className="w-full justify-between h-9 uppercase text-[11px] font-normal"
              >
                {selectedEmployee ? `${selectedEmployee.name} (QRA: ${selectedEmployee.qra})` : "BUSCAR E SELECIONAR SERVIDOR..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[380px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Digite o nome, QRA ou matrícula..." className="h-9 uppercase text-[11px]" />
                <CommandList>
                  <CommandEmpty className="py-4 text-center text-xs uppercase text-muted-foreground">
                    Nenhum servidor encontrado.
                  </CommandEmpty>
                  <CommandGroup>
                    <ScrollArea className="h-[200px]">
                      {employees?.map((emp) => (
                        <CommandItem
                          key={emp.id}
                          value={`${emp.name} ${emp.qra} ${emp.matricula}`}
                          onSelect={() => {
                            setSelectedEmployeeId(emp.id);
                            setOpenCombobox(false);
                          }}
                          className="uppercase text-[11px] cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 text-primary",
                              selectedEmployeeId === emp.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-bold">{emp.name}</span>
                            <span className="text-[9px] text-muted-foreground">QRA: {emp.qra} | MAT: {emp.matricula}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </ScrollArea>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
              <ScrollArea className="flex-1 p-6 pt-2">{renderFormFields(false)}<ScrollBar /></ScrollArea>
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
              <ScrollArea className="flex-1 p-6 pt-2">{renderFormFields(true)}<ScrollBar /></ScrollArea>
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
