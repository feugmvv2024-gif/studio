
"use client"

import * as React from "react"
import { 
  History, 
  Timer, 
  CalendarDays, 
  Loader2 
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useFirestore, useCollection, useAuth } from '@/firebase'
import { collection, query, where } from 'firebase/firestore'

// Utilitários de cálculo
const hhmmToMinutes = (hhmm: string) => {
  if (!hhmm || !hhmm.includes(':')) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (h * 60) + (m || 0);
};

const minutesToHHmm = (totalMinutes: number) => {
  const isNegative = totalMinutes < 0;
  const absMinutes = Math.abs(totalMinutes);
  const h = Math.floor(absMinutes / 60);
  const m = absMinutes % 60;
  return `${isNegative ? '-' : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const normalizeStr = (str: string) => str?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";

export default function MeusLancamentosPage() {
  const { employeeData, loading: loadingAuth } = useAuth();
  const firestore = useFirestore();

  // Busca apenas os lançamentos do servidor logado
  const myLaunchesRef = React.useMemo(() => {
    if (!firestore || !employeeData?.id) return null;
    return query(
      collection(firestore, 'launches'), 
      where('employeeId', '==', employeeData.id)
    );
  }, [firestore, employeeData?.id]);

  const { data: myLaunches, loading: loadingLaunches } = useCollection(myLaunchesRef);

  // Cálculo de Saldos Individuais
  const myStats = React.useMemo(() => {
    if (!myLaunches) return { bhCredit: 0, bhDebit: 0, treCredit: 0, treDebit: 0 };
    
    return myLaunches.reduce((acc, l) => {
      const type = normalizeStr(l.type);
      const minutes = hhmmToMinutes(l.hours || "00:00");
      const days = Number(l.days) || 0;

      if (type === "BANCO DE HORAS CREDITO") acc.bhCredit += minutes;
      if (type === "BANCO DE HORAS DEBITO" || type === "FOLGA") acc.bhDebit += minutes;
      if (type === "TRE CREDITO") acc.treCredit += days;
      if (type === "TRE DEBITO") acc.treDebit += days;
      
      return acc;
    }, { bhCredit: 0, bhDebit: 0, treCredit: 0, treDebit: 0 });
  }, [myLaunches]);

  if (loadingAuth || loadingLaunches) {
    return (
      <div className="flex h-full items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2 rounded-xl">
            <History className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase text-primary">MEUS LANÇAMENTOS</h2>
            <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">CONSULTA INDIVIDUAL DE REGISTROS E SALDOS.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {/* 1. BANCO DE HORAS INDIVIDUAL */}
        <Card className="card-shadow border-blue-500/20 bg-blue-50/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase">MEU BANCO DE HORAS</CardTitle>
            <Timer className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-700">
              {minutesToHHmm(myStats.bhCredit - myStats.bhDebit)}H
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-blue-100">
              <div>
                <p className="text-[8px] font-bold text-muted-foreground uppercase">TOTAL CRÉDITOS</p>
                <p className="text-xs font-bold text-green-600">{minutesToHHmm(myStats.bhCredit)}H</p>
              </div>
              <div>
                <p className="text-[8px] font-bold text-muted-foreground uppercase">TOTAL DÉBITOS</p>
                <p className="text-xs font-bold text-red-600">-{minutesToHHmm(myStats.bhDebit)}H</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. TRE INDIVIDUAL (SALDO) */}
        <Card className="card-shadow border-purple-500/20 bg-purple-50/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase">MEU SALDO TRE</CardTitle>
            <CalendarDays className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-purple-700">
              {myStats.treCredit - myStats.treDebit} DIAS
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-purple-100">
              <div>
                <p className="text-[8px] font-bold text-muted-foreground uppercase">TOTAL CRÉDITOS</p>
                <p className="text-xs font-bold text-green-600">{myStats.treCredit}D</p>
              </div>
              <div>
                <p className="text-[8px] font-bold text-muted-foreground uppercase">TOTAL DÉBITOS</p>
                <p className="text-xs font-bold text-red-600">-{myStats.treDebit}D</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-muted/50 rounded-2xl bg-slate-50/30">
        <History className="h-12 w-12 text-muted/30 mb-4" />
        <p className="text-muted-foreground uppercase text-xs font-bold tracking-widest">HISTÓRICO EM DESENVOLVIMENTO</p>
        <p className="text-[10px] text-muted-foreground/60 uppercase mt-2 text-center max-w-xs">
          EM BREVE VOCÊ PODERÁ VER A LISTAGEM DETALHADA DE CADA REGISTRO QUE COMPÕE SEU SALDO.
        </p>
      </div>
    </div>
  )
}
