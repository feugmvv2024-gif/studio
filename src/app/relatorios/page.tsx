"use client"

import * as React from "react"
import { BarChart3 } from "lucide-react"

export default function RelatoriosPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2 rounded-xl">
            <BarChart3 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase text-primary">RELATÓRIOS</h2>
            <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">MÓDULO DE INTELIGÊNCIA E ESTATÍSTICAS.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-muted/50 rounded-2xl bg-slate-50/30">
        <BarChart3 className="h-12 w-12 text-muted/30 mb-4" />
        <p className="text-muted-foreground uppercase text-xs font-bold tracking-widest">ÁREA EM BRANCO PARA DESENVOLVIMENTO FUTURO</p>
        <p className="text-[10px] text-muted-foreground/60 uppercase mt-2">OS RELATÓRIOS OPERACIONAIS SERÃO IMPLEMENTADOS NESTA SEÇÃO.</p>
      </div>
    </div>
  )
}
