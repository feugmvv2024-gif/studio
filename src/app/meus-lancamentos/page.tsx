
"use client"

import * as React from "react"
import { History } from "lucide-react"

export default function MeusLancamentosPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2 rounded-xl">
            <History className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase text-primary">MEUS LANÇAMENTOS</h2>
            <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">CONSULTA INDIVIDUAL DE REGISTROS.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-muted/50 rounded-2xl bg-slate-50/30">
        <History className="h-12 w-12 text-muted/30 mb-4" />
        <p className="text-muted-foreground uppercase text-xs font-bold tracking-widest">MÓDULO EM DESENVOLVIMENTO</p>
        <p className="text-[10px] text-muted-foreground/60 uppercase mt-2">AQUI VOCÊ PODERÁ CONSULTAR SEU HISTÓRICO PESSOAL DE HORAS E AFASTAMENTOS.</p>
      </div>
    </div>
  )
}
