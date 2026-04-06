"use client"

import * as React from "react"
import { Plane, ArrowLeft, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"

export default function FeriasPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="relative">
          <div className="bg-blue-50 p-6 rounded-full animate-pulse">
            <Plane className="h-16 w-16 text-blue-600" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-blue-500 p-2 rounded-lg border-2 border-background animate-bounce">
            <CalendarDays className="h-6 w-6 text-white" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-tight">Módulo de Férias</h2>
          <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest max-w-xs mx-auto">
            ESTAMOS PREPARANDO UM ESPAÇO PARA GESTÃO INTEGRADA DO SEU PERÍODO DE DESCANSO.
          </p>
        </div>
      </div>

      <Card className="max-w-md w-full border-none shadow-xl bg-slate-50/50 rounded-3xl overflow-hidden">
        <CardContent className="p-8 text-center space-y-6">
          <div className="bg-white p-4 rounded-2xl border shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-600 leading-relaxed">
              EM BREVE: CONSULTA DE PERÍODOS AQUISITIVOS, SOLICITAÇÃO DE AGENDAMENTO E ACOMPANHAMENTO DE ESCALAS DE FÉRIAS.
            </p>
          </div>
          
          <Button 
            onClick={() => router.back()}
            variant="outline" 
            className="w-full h-12 uppercase font-black text-xs tracking-widest rounded-xl gap-2 hover:bg-white transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </CardContent>
      </Card>
      
      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
        NRH - GMVV • SISTEMA DE GESTÃO • DESENVOLVIMENTO EM CURSO
      </p>
    </div>
  )
}
