
"use client"

import * as React from "react"
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Loader2, 
  FileText,
  Calendar,
  Clock,
  MoreHorizontal,
  X,
  Filter
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  serverTimestamp,
  where
} from 'firebase/firestore'
import { useToast } from "@/hooks/use-toast"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'

// Função para formatar data BRT (São Paulo)
function getSaoPauloDate() {
  const now = new Date();
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now).split('/').reverse().join('-');
}

export default function LancamentosPage() {
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false)
  const [selectedLaunch, setSelectedLaunch] = React.useState<any>(null)
  const [launchToDelete, setLaunchToDelete] = React.useState<string | null>(null)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const firestore = useFirestore()
  const { toast } = useToast()

  // Queries otimizadas
  const launchesQuery = React.useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'launches'), orderBy('createdAt', 'desc'), limit(100));
  }, [firestore]);

  const employeesQuery = React.useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'employees'), orderBy('name', 'asc'));
  }, [firestore]);

  const launchTypesQuery = React.useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'launchTypes'), orderBy('name', 'asc'));
  }, [firestore]);

  const { data: launches, loading: loadingLaunches } = useCollection(launchesQuery)
  const { data: employees } = useCollection(employeesQuery)
  const { data: launchTypes } = useCollection(launchTypesQuery)

  const filteredLaunches = React.useMemo(() => {
    if (!launches) return [];
    const term = searchTerm.toLowerCase();
    return launches.filter(l => 
      l.employeeName?.toLowerCase().includes(term) || 
      l.employeeQra?.toLowerCase().includes(term) ||
      l.type?.toLowerCase().includes(term)
    );
  }, [launches, searchTerm]);

  async function handleAddLaunch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!firestore) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const empId = formData.get('employeeId') as string;
    const employee = employees.find(emp => emp.id === empId);

    const newLaunch = {
      date: formData.get('date') as string,
      employeeId: empId,
      employeeName: employee?.name || "N/A",
      employeeNameQra: `${employee?.name || "N/A"} (${employee?.qra || "N/A"})`,
      employeeQra: employee?.qra || "N/A",
      escala: employee?.escala || "N/A",
      turno: employee?.turno || "N/A",
      escalaTurno: `${employee?.escala || "N/A"} / ${employee?.turno || "N/A"}`,
      type: (formData.get('type') as string).toUpperCase(),
      days: Number(formData.get('days') || 0),
      hours: formData.get('hours') as string,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      observations: (formData.get('observations') as string || "").toUpperCase(),
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(firestore, 'launches'), newLaunch);
      setIsAddOpen(false);
      toast({ title: "SUCESSO!", description: "LANÇAMENTO REALIZADO." });
    } catch (err) {
      const error = new FirestorePermissionError({
        path: 'launches',
        operation: 'create',
        requestResourceData: newLaunch
      });
      errorEmitter.emit('permission-error', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateLaunch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!firestore || !selectedLaunch) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const empId = formData.get('employeeId') as string;
    const employee = employees.find(emp => emp.id === empId);

    const updates = {
      date: formData.get('date') as string,
      employeeId: empId,
      employeeName: employee?.name || "N/A",
      employeeNameQra: `${employee?.name || "N/A"} (${employee?.qra || "N/A"})`,
      employeeQra: employee?.qra || "N/A",
      escala: employee?.escala || "N/A",
      turno: employee?.turno || "N/A",
      escalaTurno: `${employee?.escala || "N/A"} / ${employee?.turno || "N/A"}`,
      type: (formData.get('type') as string).toUpperCase(),
      days: Number(formData.get('days') || 0),
      hours: formData.get('hours') as string,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      observations: (formData.get('observations') as string || "").toUpperCase(),
    };

    const docRef = doc(firestore, 'launches', selectedLaunch.id);
    try {
      await updateDoc(docRef, updates);
      setIsEditOpen(false);
      setSelectedLaunch(null);
      toast({ title: "SUCESSO!", description: "LANÇAMENTO ATUALIZADO." });
    } catch (err) {
      const error = new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: updates
      });
      errorEmitter.emit('permission-error', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!firestore || !launchToDelete) return;
    const docRef = doc(firestore, 'launches', launchToDelete);
    try {
      await deleteDoc(docRef);
      setIsDeleteAlertOpen(false);
      setLaunchToDelete(null);
      toast({ title: "REMOVIDO", description: "LANÇAMENTO EXCLUÍDO." });
    } catch (err) {
      const error = new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete'
      });
      errorEmitter.emit('permission-error', error);
    }
  }

  const renderForm = (launch?: any) => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label className="uppercase text-[10px] font-bold">DATA DO LANÇAMENTO</Label>
          <Input name="date" type="date" defaultValue={launch?.date || getSaoPauloDate()} required className="h-9" />
        </div>
        <div className="grid gap-2">
          <Label className="uppercase text-[10px] font-bold">SERVIDOR</Label>
          <Select name="employeeId" defaultValue={launch?.employeeId} required>
            <SelectTrigger className="h-9 uppercase text-[11px]">
              <SelectValue placeholder="SELECIONE O AGENTE..." />
            </SelectTrigger>
            <SelectContent>
              {employees?.map((emp: any) => (
                <SelectItem key={emp.id} value={emp.id} className="uppercase text-[11px]">
                  {emp.name} ({emp.qra})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label className="uppercase text-[10px] font-bold">TIPO DE LANÇAMENTO</Label>
          <Select name="type" defaultValue={launch?.type} required>
            <SelectTrigger className="h-9 uppercase text-[11px]">
              <SelectValue placeholder="SELECIONE O TIPO..." />
            </SelectTrigger>
            <SelectContent>
              {launchTypes?.map((type: any) => (
                <SelectItem key={type.id} value={type.name} className="uppercase text-[11px]">
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-2">
            <Label className="uppercase text-[10px] font-bold">DIAS</Label>
            <Input name="days" type="number" defaultValue={launch?.days || 0} className="h-9" />
          </div>
          <div className="grid gap-2">
            <Label className="uppercase text-[10px] font-bold">HORAS (HH:MM)</Label>
            <Input name="hours" placeholder="00:00" defaultValue={launch?.hours} required className="h-9" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label className="uppercase text-[10px] font-bold">DATA INÍCIO</Label>
          <Input name="startDate" type="date" defaultValue={launch?.startDate} className="h-9" />
        </div>
        <div className="grid gap-2">
          <Label className="uppercase text-[10px] font-bold">DATA FIM</Label>
          <Input name="endDate" type="date" defaultValue={launch?.endDate} className="h-9" />
        </div>
      </div>

      <div className="grid gap-2">
        <Label className="uppercase text-[10px] font-bold">OBSERVAÇÕES</Label>
        <Textarea name="observations" defaultValue={launch?.observations} className="uppercase text-xs min-h-[80px]" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase text-primary">LANÇAMENTOS</h2>
          <p className="text-muted-foreground uppercase text-[10px] sm:text-sm">GESTOR DE BANCO DE HORAS E AFASTAMENTOS.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 uppercase font-bold text-xs h-9">
              <Plus className="h-4 w-4" /> NOVO LANÇAMENTO
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[95vh] flex flex-col p-0 overflow-hidden">
            <form onSubmit={handleAddLaunch} className="flex flex-col h-full">
              <DialogHeader className="p-6 pb-2"><DialogTitle className="uppercase">EFETUAR LANÇAMENTO</DialogTitle></DialogHeader>
              <ScrollArea className="flex-1 p-6 pt-2">
                {renderForm()}
                <ScrollBar orientation="vertical" />
              </ScrollArea>
              <DialogFooter className="p-6 pt-4 border-t gap-2 sm:gap-0">
                <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)} className="uppercase text-xs font-bold">CANCELAR</Button>
                <Button type="submit" disabled={isSubmitting} className="uppercase text-xs font-bold">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "GRAVAR"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="card-shadow border-primary/10 overflow-hidden">
        <CardHeader className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="BUSCAR POR SERVIDOR OU TIPO..." 
              className="pl-8 uppercase h-9 text-[10px] sm:text-xs" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingLaunches ? (
            <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
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
                    <TableHead className="font-bold uppercase text-[9px] min-w-[90px]">DATA INÍCIO</TableHead>
                    <TableHead className="font-bold uppercase text-[9px] min-w-[90px]">DATA FIM</TableHead>
                    <TableHead className="font-bold uppercase text-[9px] min-w-[150px]">OBSERVAÇÕES</TableHead>
                    <TableHead className="text-right font-bold uppercase text-[9px] pr-4">AÇÕES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLaunches.length === 0 ? (
                    <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground uppercase text-xs italic">NENHUM LANÇAMENTO ENCONTRADO.</TableCell></TableRow>
                  ) : (
                    filteredLaunches.map((launch, index) => (
                      <TableRow key={launch.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono text-[9px] text-muted-foreground px-4">{filteredLaunches.length - index}</TableCell>
                        <TableCell className="text-[11px] font-medium whitespace-nowrap">{launch.date?.split('-').reverse().join('/')}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-[11px] uppercase whitespace-nowrap">{launch.employeeName}</span>
                            <span className="text-[9px] text-muted-foreground font-mono uppercase">{launch.employeeQra}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] uppercase whitespace-nowrap">
                          {launch.escala} / {launch.turno}
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-[9px] uppercase border-primary/30 text-primary whitespace-nowrap">{launch.type}</Badge></TableCell>
                        <TableCell className="text-[11px] font-bold">{launch.days || 0}D</TableCell>
                        <TableCell className="text-[11px] font-bold text-primary whitespace-nowrap">{launch.hours}H</TableCell>
                        <TableCell className="text-[10px] whitespace-nowrap">{launch.startDate?.split('-').reverse().join('/') || "---"}</TableCell>
                        <TableCell className="text-[10px] whitespace-nowrap">{launch.endDate?.split('-').reverse().join('/') || "---"}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-[10px] uppercase text-muted-foreground">{launch.observations || "---"}</TableCell>
                        <TableCell className="text-right pr-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => { setSelectedLaunch(launch); setTimeout(() => setIsEditOpen(true), 150); }} className="uppercase text-[10px] cursor-pointer"><Edit className="mr-2 h-3.5 w-3.5" /> EDITAR</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => { setLaunchToDelete(launch.id); setTimeout(() => setIsDeleteAlertOpen(true), 150); }} className="text-destructive uppercase text-[10px] cursor-pointer"><Trash2 className="mr-2 h-3.5 w-3.5" /> EXCLUIR</DropdownMenuItem>
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

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[95vh] flex flex-col p-0 overflow-hidden">
          {selectedLaunch && (
            <form onSubmit={handleUpdateLaunch} className="flex flex-col h-full">
              <DialogHeader className="p-6 pb-2"><DialogTitle className="uppercase">EDITAR LANÇAMENTO</DialogTitle></DialogHeader>
              <ScrollArea className="flex-1 p-6 pt-2">
                {renderForm(selectedLaunch)}
                <ScrollBar orientation="vertical" />
              </ScrollArea>
              <DialogFooter className="p-6 pt-4 border-t gap-2 sm:gap-0">
                <Button variant="outline" type="button" onClick={() => setIsEditOpen(false)} className="uppercase text-xs font-bold">CANCELAR</Button>
                <Button type="submit" disabled={isSubmitting} className="uppercase text-xs font-bold">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "SALVAR ALTERAÇÕES"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="uppercase">CONFIRMAR EXCLUSÃO</AlertDialogTitle>
            <AlertDialogDescription className="uppercase text-[10px]">AÇÃO IRREVERSÍVEL. O LANÇAMENTO SERÁ REMOVIDO DO HISTÓRICO.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="uppercase text-xs">CANCELAR</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive uppercase text-xs">EXCLUIR</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
