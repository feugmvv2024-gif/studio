
"use client"

import * as React from "react"
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Settings2, 
  Calendar, 
  Clock, 
  Briefcase, 
  FilePlus, 
  LayoutGrid, 
  X,
  History,
  Timer
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFirestore, useCollection } from '@/firebase'
import { collection, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

type Category = 'schedules' | 'shifts' | 'roles' | 'launchTypes' | 'units' | 'shiftPeriods';

const applyTimeMask = (value: string) => {
  let v = value.replace(/\D/g, "");
  if (v.length > 4) v = v.slice(0, 4);
  if (v.length <= 2) return v;
  return `${v.slice(0, 2)}:${v.slice(2)}`;
};

const calculateDuration = (start: string, end: string) => {
  if (start.length !== 5 || end.length !== 5) return "";
  
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return "";
  
  let totalMinutesStart = h1 * 60 + m1;
  let totalMinutesEnd = h2 * 60 + m2;
  
  if (totalMinutesEnd <= totalMinutesStart) {
    totalMinutesEnd += 24 * 60; // Trata virada de dia
  }
  
  const diffMinutes = totalMinutesEnd - totalMinutesStart;
  const h = Math.floor(diffMinutes / 60);
  const m = diffMinutes % 60;
  
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export default function SettingsPage() {
  const [newValue, setNewValue] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  
  // Estados para Períodos
  const [periodData, setPeriodData] = React.useState({
    escalaId: "",
    startTime: "",
    endTime: "",
    duration: ""
  })

  const firestore = useFirestore()
  const { toast } = useToast()

  const schedulesQuery = React.useMemo(() => firestore ? query(collection(firestore, 'schedules'), orderBy('name', 'asc')) : null, [firestore])
  const shiftsQuery = React.useMemo(() => firestore ? query(collection(firestore, 'shifts'), orderBy('name', 'asc')) : null, [firestore])
  const rolesQuery = React.useMemo(() => firestore ? query(collection(firestore, 'roles'), orderBy('name', 'asc')) : null, [firestore])
  const launchTypesQuery = React.useMemo(() => firestore ? query(collection(firestore, 'launchTypes'), orderBy('name', 'asc')) : null, [firestore])
  const unitsQuery = React.useMemo(() => firestore ? query(collection(firestore, 'units'), orderBy('name', 'asc')) : null, [firestore])
  const shiftPeriodsQuery = React.useMemo(() => firestore ? query(collection(firestore, 'shiftPeriods'), orderBy('escalaName', 'asc')) : null, [firestore])

  const { data: schedules, loading: loadingSchedules } = useCollection(schedulesQuery)
  const { data: shifts, loading: loadingShifts } = useCollection(shiftsQuery)
  const { data: roles, loading: loadingRoles } = useCollection(rolesQuery)
  const { data: launchTypes, loading: loadingLaunchTypes } = useCollection(launchTypesQuery)
  const { data: units, loading: loadingUnits } = useCollection(unitsQuery)
  const { data: shiftPeriods, loading: loadingShiftPeriods } = useCollection(shiftPeriodsQuery)

  React.useEffect(() => {
    if (periodData.startTime.length === 5 && periodData.endTime.length === 5) {
      const duration = calculateDuration(periodData.startTime, periodData.endTime);
      setPeriodData(prev => ({ ...prev, duration }));
    } else {
      setPeriodData(prev => ({ ...prev, duration: "" }));
    }
  }, [periodData.startTime, periodData.endTime]);

  async function handleAddItem(category: Category) {
    if (!firestore) return

    if (category !== 'shiftPeriods' && !newValue.trim()) return;
    if (category === 'shiftPeriods' && (!periodData.escalaId || !periodData.duration)) {
      toast({ variant: "destructive", title: "ERRO", description: "PREENCHA TODOS OS CAMPOS DO PERÍODO." });
      return;
    }

    setIsSubmitting(true)
    
    let payload: any = {};
    if (category === 'shiftPeriods') {
      const escala = schedules.find((s: any) => s.id === periodData.escalaId);
      payload = {
        escalaId: periodData.escalaId,
        escalaName: escala?.name || "N/A",
        startTime: periodData.startTime,
        endTime: periodData.endTime,
        duration: periodData.duration
      };
    } else {
      payload = { name: newValue.toUpperCase().trim() };
      
      let currentList: any[] = [];
      if (category === 'schedules') currentList = schedules;
      else if (category === 'shifts') currentList = shifts;
      else if (category === 'roles') currentList = roles;
      else if (category === 'launchTypes') currentList = launchTypes;
      else if (category === 'units') currentList = units;

      if (currentList.some((item: any) => item.name === payload.name)) {
        toast({ variant: "destructive", title: "ERRO", description: "ESTE ITEM JÁ EXISTE." })
        setIsSubmitting(false)
        return
      }
    }

    addDoc(collection(firestore, category), payload)
      .then(() => {
        setNewValue("")
        if (category === 'shiftPeriods') {
          setPeriodData({ escalaId: "", startTime: "", endTime: "", duration: "" });
        }
        toast({ title: "SUCESSO", description: "ITEM ADICIONADO COM SUCESSO." })
      })
      .catch((error: any) => {
        const permissionError = new FirestorePermissionError({
          path: category,
          operation: 'create',
          requestResourceData: payload
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setIsSubmitting(false))
  }

  async function handleDeleteItem(id: string, category: Category) {
    if (!firestore) return
    const docRef = doc(firestore, category, id);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: "REMOVIDO", description: "ITEM EXCLUÍDO COM SUCESSO." })
      })
      .catch((error: any) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete'
        });
        errorEmitter.emit('permission-error', permissionError);
      })
  }

  const renderCategoryContent = (
    category: Category, 
    title: string, 
    description: string, 
    items: any[], 
    loading: boolean, 
    placeholder: string
  ) => (
    <Card className="card-shadow border-none rounded-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
      <CardHeader className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold uppercase flex items-center gap-3">
              {title}
              <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 font-bold px-2 py-0.5 rounded-lg text-xs">
                {items.length}
              </Badge>
            </CardTitle>
            <CardDescription className="uppercase text-[10px] font-medium tracking-wide text-muted-foreground">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-6">
        {category === 'shiftPeriods' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Escala</Label>
                <Select value={periodData.escalaId} onValueChange={(v) => setPeriodData(p => ({ ...p, escalaId: v }))}>
                  <SelectTrigger className="h-11 uppercase text-xs font-bold bg-white">
                    <SelectValue placeholder="SELECIONE..." />
                  </SelectTrigger>
                  <SelectContent>
                    {schedules.map((s: any) => (
                      <SelectItem key={s.id} value={s.id} className="uppercase text-xs font-bold">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Início (HH:mm)</Label>
                <Input 
                  placeholder="07:00" 
                  value={periodData.startTime}
                  onChange={(e) => setPeriodData(p => ({ ...p, startTime: applyTimeMask(e.target.value) }))}
                  className="h-11 text-center font-mono font-bold bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Fim (HH:mm)</Label>
                <Input 
                  placeholder="21:00" 
                  value={periodData.endTime}
                  onChange={(e) => setPeriodData(p => ({ ...p, endTime: applyTimeMask(e.target.value) }))}
                  className="h-11 text-center font-mono font-bold bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Tempo Total</Label>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={periodData.duration ? `${periodData.duration}H` : ""}
                    placeholder="--"
                    className="h-11 text-center font-mono font-bold bg-blue-50 text-blue-600 border-blue-200 cursor-not-allowed"
                  />
                  <Button 
                    onClick={() => handleAddItem('shiftPeriods')} 
                    disabled={isSubmitting || !periodData.escalaId || !periodData.duration}
                    className="h-11 w-11 p-0 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 rounded-xl"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="bg-muted/50" />

            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" /></div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-muted/50 rounded-2xl">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest italic">NENHUM PERÍODO CADASTRADO.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border border-muted bg-background hover:bg-slate-50 transition-all group animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex flex-col gap-1">
                      <span className="font-black text-xs uppercase tracking-tight text-blue-600">{item.escalaName}</span>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold">
                        <Clock className="h-3 w-3" />
                        <span>{item.startTime} ÀS {item.endTime}</span>
                        <Separator orientation="vertical" className="h-3" />
                        <Timer className="h-3 w-3 text-primary" />
                        <span className="text-primary">{item.duration}H</span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:bg-red-50 hover:text-destructive rounded-lg transition-colors"
                      onClick={() => handleDeleteItem(item.id, category)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input 
                placeholder={placeholder} 
                value={newValue}
                onChange={(e) => setNewValue(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem(category)}
                className="uppercase font-semibold text-xs h-11 bg-background/50 focus:bg-background transition-all border-muted"
              />
              <Button 
                onClick={() => handleAddItem(category)} 
                disabled={isSubmitting || !newValue.trim()}
                className="gap-2 w-full sm:w-auto h-11 px-6 uppercase font-bold text-xs bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 rounded-xl"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                ADICIONAR
              </Button>
            </div>

            <Separator className="bg-muted/50" />

            <div className="grid gap-3">
              {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" /></div>
              ) : items.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-muted/50 rounded-2xl">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest italic">NENHUM ITEM CADASTRADO.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
                  {items.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border border-muted bg-background hover:bg-slate-50 transition-all group animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <span className="font-bold text-xs uppercase tracking-tight text-slate-700">{item.name}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:bg-red-50 hover:text-destructive rounded-lg transition-colors"
                        onClick={() => handleDeleteItem(item.id, category)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2 rounded-xl">
            <Settings2 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase text-primary">CONFIGURAÇÃO</h2>
            <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">GERENCIE AS DEFINIÇÕES GERAIS DO SISTEMA.</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="launchTypes" className="w-full">
        <TabsList className="flex flex-wrap items-center justify-start bg-muted/40 p-1.5 rounded-2xl h-auto gap-1">
          <TabsTrigger value="launchTypes" className="flex-1 gap-2 uppercase text-[10px] font-bold py-2.5 rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all whitespace-nowrap">
            <FilePlus className="h-4 w-4" /> LANÇAMENTOS
          </TabsTrigger>
          <TabsTrigger value="shiftPeriods" className="flex-1 gap-2 uppercase text-[10px] font-bold py-2.5 rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all whitespace-nowrap">
            <History className="h-4 w-4" /> PERÍODOS
          </TabsTrigger>
          <TabsTrigger value="schedules" className="flex-1 gap-2 uppercase text-[10px] font-bold py-2.5 rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all whitespace-nowrap">
            <Calendar className="h-4 w-4" /> ESCALAS
          </TabsTrigger>
          <TabsTrigger value="shifts" className="flex-1 gap-2 uppercase text-[10px] font-bold py-2.5 rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all whitespace-nowrap">
            <Clock className="h-4 w-4" /> TURNOS
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex-1 gap-2 uppercase text-[10px] font-bold py-2.5 rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all whitespace-nowrap">
            <Briefcase className="h-4 w-4" /> CARGOS
          </TabsTrigger>
          <TabsTrigger value="units" className="flex-1 gap-2 uppercase text-[10px] font-bold py-2.5 rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all whitespace-nowrap">
            <LayoutGrid className="h-4 w-4" /> SETORES
          </TabsTrigger>
        </TabsList>

        <div className="mt-8">
          <TabsContent value="launchTypes">
            {renderCategoryContent('launchTypes', 'Gerenciar Lançamentos', 'DEFINIÇÕES PARA O BANCO DE HORAS.', launchTypes || [], loadingLaunchTypes, 'EX: OPERAÇÃO, EXTRA, COMPENSAÇÃO...')}
          </TabsContent>

          <TabsContent value="shiftPeriods">
            {renderCategoryContent('shiftPeriods', 'Gerenciar Períodos', 'DEFINA OS HORÁRIOS PADRÃO DAS ESCALAS.', shiftPeriods || [], loadingShiftPeriods, '')}
          </TabsContent>

          <TabsContent value="schedules">
            {renderCategoryContent('schedules', 'Gerenciar Escalas', 'DEFINIÇÕES DE ESCALAS DE SERVIÇO.', schedules || [], loadingSchedules, 'EX: 12X36, ADMINISTRATIVA...')}
          </TabsContent>

          <TabsContent value="shifts">
            {renderCategoryContent('shifts', 'Gerenciar Turnos', 'DEFINIÇÕES DE TURNOS DE TRABALHO.', shifts || [], loadingShifts, 'EX: DIURNO, ALFA, BRAVO...')}
          </TabsContent>

          <TabsContent value="roles">
            {renderCategoryContent('roles', 'Gerenciar Cargos', 'DEFINIÇÕES DE CARGOS E FUNÇÕES.', roles || [], loadingRoles, 'EX: INSPETOR, AGENTE, COORDENADOR...')}
          </TabsContent>

          <TabsContent value="units">
            {renderCategoryContent('units', 'Gerenciar Setores', 'DEFINIÇÕES DE SETORES E UNIDADES.', units || [], loadingUnits, 'EX: UNIDADE CENTRO, ADM, OPERACIONAL...')}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
