"use client"

import * as React from "react"
import { Plane, CalendarDays, ClipboardList, ShieldCheck } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function FeriasPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2 rounded-xl">
            <Plane className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase text-primary">Gestão de Férias</h2>
            <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">Acompanhamento e solicitação de períodos de descanso.</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="nova-solicitacao" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[450px] h-12 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="nova-solicitacao" className="rounded-lg uppercase text-[10px] font-bold flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" /> NOVA SOLICITAÇÃO
          </TabsTrigger>
          <TabsTrigger value="gestao-analise" className="rounded-lg uppercase text-[10px] font-bold flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5" /> GESTÃO / ANÁLISE
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nova-solicitacao" className="mt-6">
          <Card className="border-2 border-dashed bg-slate-50/30 rounded-3xl">
            <CardContent className="h-64 flex items-center justify-center">
              <div className="text-center space-y-2">
                <CalendarDays className="h-10 w-10 text-muted-foreground/20 mx-auto" />
                <p className="text-[10px] font-bold uppercase text-muted-foreground italic tracking-widest">
                  Conteúdo da aba Nova Solicitação.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gestao-analise" className="mt-6">
          <Card className="border-2 border-dashed bg-slate-50/30 rounded-3xl">
            <CardContent className="h-64 flex items-center justify-center">
              <div className="text-center space-y-2">
                <ClipboardList className="h-10 w-10 text-muted-foreground/20 mx-auto" />
                <p className="text-[10px] font-bold uppercase text-muted-foreground italic tracking-widest">
                  Conteúdo da aba Gestão / Análise.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="text-center">
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
          NRH - GMVV • SISTEMA DE GESTÃO • MÓDULO EM CONSTRUÇÃO
        </p>
      </div>
    </div>
  )
}
