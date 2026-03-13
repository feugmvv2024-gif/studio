
"use client"

import * as React from "react"
import { Plus, Trash2, Loader2, Settings2, Calendar, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFirestore, useCollection } from '@/firebase'
import { collection, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

export default function SettingsPage() {
  const [newValue, setNewValue] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const firestore = useFirestore()
  const { toast } = useToast()

  const schedulesQuery = React.useMemo(() => {
    if (!firestore) return null
    return query(collection(firestore, 'schedules'), orderBy('name', 'asc'))
  }, [firestore])

  const shiftsQuery = React.useMemo(() => {
    if (!firestore) return null
    return query(collection(firestore, 'shifts'), orderBy('name', 'asc'))
  }, [firestore])

  const { data: schedules, loading: loadingSchedules } = useCollection(schedulesQuery)
  const { data: shifts, loading: loadingShifts } = useCollection(shiftsQuery)

  async function handleAddItem(category: 'schedules' | 'shifts') {
    if (!newValue.trim() || !firestore) return

    setIsSubmitting(true)
    const val = newValue.toUpperCase().trim()
    
    const list = category === 'schedules' ? schedules : shifts
    if (list.some((item: any) => item.name === val)) {
      toast({ variant: "destructive", title: "ERRO", description: "ESTE ITEM JÁ EXISTE." })
      setIsSubmitting(false)
      return
    }

    try {
      await addDoc(collection(firestore, category), { name: val })
      setNewValue("")
      toast({ title: "SUCESSO", description: "ITEM ADICIONADO COM SUCESSO." })
    } catch (error) {
      toast({ variant: "destructive", title: "ERRO", description: "FALHA AO SALVAR NO BANCO." })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteItem(id: string, category: 'schedules' | 'shifts') {
    if (!firestore) return
    try {
      await deleteDoc(doc(firestore, category, id))
      toast({ title: "REMOVIDO", description: "ITEM EXCLUÍDO COM SUCESSO." })
    } catch (error) {
      toast({ variant: "destructive", title: "ERRO", description: "FALHA AO REMOVER." })
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 px-2 sm:px-0">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Settings2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase text-primary">CONFIGURAÇÃO</h2>
        </div>
        <p className="text-muted-foreground uppercase text-[10px] sm:text-sm">GERENCIE AS DEFINIÇÕES GERAIS DO SISTEMA.</p>
      </div>

      <Tabs defaultValue="schedules" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="schedules" className="gap-2 uppercase text-[10px] sm:text-xs font-bold">
            <Calendar className="h-4 w-4" /> ESCALAS
          </TabsTrigger>
          <TabsTrigger value="shifts" className="gap-2 uppercase text-[10px] sm:text-xs font-bold">
            <Clock className="h-4 w-4" /> TURNOS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="mt-4 sm:mt-6">
          <Card className="card-shadow border-primary/10">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl uppercase flex items-center gap-2">
                GERENCIAR ESCALAS
              </CardTitle>
              <CardDescription className="uppercase text-[9px] sm:text-[10px]">DEFINIÇÕES DE ESCALAS DE SERVIÇO.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 sm:pt-0">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input 
                  placeholder="EX: 12X36, ADMINISTRATIVA..." 
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem('schedules')}
                  className="uppercase font-semibold text-xs sm:text-sm h-9 sm:h-10"
                />
                <Button 
                  onClick={() => handleAddItem('schedules')} 
                  disabled={isSubmitting || !newValue.trim()}
                  size="sm"
                  className="gap-2 w-full sm:w-auto h-9 sm:h-10"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  ADICIONAR
                </Button>
              </div>

              <Separator />

              <div className="grid gap-2">
                {loadingSchedules ? (
                  <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : schedules.length === 0 ? (
                  <p className="text-center py-4 text-[10px] sm:text-xs text-muted-foreground uppercase italic">NENHUMA ESCALA CADASTRADA.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {schedules.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between p-2 sm:p-3 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors group">
                        <span className="font-bold text-xs sm:text-sm uppercase">{item.name}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 sm:h-8 sm:w-8 text-destructive opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteItem(item.id, 'schedules')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shifts" className="mt-4 sm:mt-6">
          <Card className="card-shadow border-primary/10">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl uppercase flex items-center gap-2">
                GERENCIAR TURNOS
              </CardTitle>
              <CardDescription className="uppercase text-[9px] sm:text-[10px]">DEFINIÇÕES DE TURNOS DE TRABALHO.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 sm:pt-0">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input 
                  placeholder="EX: DIURNO, ALFA, BRAVO..." 
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem('shifts')}
                  className="uppercase font-semibold text-xs sm:text-sm h-9 sm:h-10"
                />
                <Button 
                  onClick={() => handleAddItem('shifts')} 
                  disabled={isSubmitting || !newValue.trim()}
                  size="sm"
                  className="gap-2 w-full sm:w-auto h-9 sm:h-10"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  ADICIONAR
                </Button>
              </div>

              <Separator />

              <div className="grid gap-2">
                {loadingShifts ? (
                  <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : shifts.length === 0 ? (
                  <p className="text-center py-4 text-[10px] sm:text-xs text-muted-foreground uppercase italic">NENHUM TURNO CADASTRADO.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {shifts.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between p-2 sm:p-3 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors group">
                        <span className="font-bold text-xs sm:text-sm uppercase">{item.name}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 sm:h-8 sm:w-8 text-destructive opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteItem(item.id, 'shifts')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
