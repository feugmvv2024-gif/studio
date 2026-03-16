"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Users, 
  Clock, 
  TrendingUp, 
  FileText,
  Loader2,
  Timer,
  CalendarDays
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from "recharts"
import { useFirestore, useCollection } from '@/firebase'
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

export default function Dashboard() {
  const firestore = useFirestore();

  const employeesRef = React.useMemo(() => collection(firestore, 'employees'), [firestore]);
  const requestsRef = React.useMemo(() => collection(firestore, 'requests'), [firestore]);
  const pendingRequestsRef = React.useMemo(() => query(collection(firestore, 'requests'), where('status', '==', 'PENDENTE')), [firestore]);
  const launchesRef = React.useMemo(() => collection(firestore, 'launches'), [firestore]);

  const { data: employees, loading: loadingEmployees } = useCollection(employeesRef);
  const { data: requests, loading: loadingRequests } = useCollection(requestsRef);
  const { data: pendingRequests } = useCollection(pendingRequestsRef);
  const { data: launches, loading: loadingLaunches } = useCollection(launchesRef);

  // Estatísticas Gerais
  const stats = React.useMemo(() => {
    if (!employees) return { total: 0, active: 0, pending: 0, leave: 0, vacation: 0 };
    return {
      total: employees.length,
      active: employees.filter(e => e.status === "ATIVO").length,
      pending: employees.filter(e => e.status === "PENDENTE").length,
      leave: employees.filter(e => e.status === "LICENÇA").length,
      vacation: employees.filter(e => e.status === "FÉRIAS").length,
    };
  }, [employees]);

  // Estatísticas de Banco de Horas e TRE
  const operationStats = React.useMemo(() => {
    if (!launches) return { bhCredit: 0, bhDebit: 0, treCredit: 0, treDebit: 0 };
    
    return launches.reduce((acc, l) => {
      const type = normalizeStr(l.type);
      const minutes = hhmmToMinutes(l.hours || "00:00");
      const days = Number(l.days) || 0;

      if (type === "BANCO DE HORAS CREDITO") acc.bhCredit += minutes;
      if (type === "BANCO DE HORAS DEBITO" || type === "FOLGA") acc.bhDebit += minutes;
      if (type === "TRE CREDITO") acc.treCredit += days;
      if (type === "TRE DEBITO") acc.treDebit += days;
      
      return acc;
    }, { bhCredit: 0, bhDebit: 0, treCredit: 0, treDebit: 0 });
  }, [launches]);

  const personnelStats = React.useMemo(() => [
    { name: "Ativos", value: stats.active, color: "hsl(var(--primary))" },
    { name: "Licença", value: stats.leave, color: "hsl(var(--accent))" },
    { name: "Férias", value: stats.vacation, color: "hsl(var(--chart-3))" },
    { name: "Pendente", value: stats.pending, color: "hsl(var(--destructive))" },
  ], [stats]);

  const chartData = [
    { name: "Ativos", total: stats.active },
    { name: "Licença", total: stats.leave },
    { name: "Férias", total: stats.vacation },
    { name: "Pendente", total: stats.pending },
  ];

  if (loadingEmployees || loadingRequests || loadingLaunches) {
    return (
      <div className="flex h-full items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase">VISÃO GERAL</h2>
        <p className="text-muted-foreground text-sm sm:text-base uppercase text-[10px]">PAINEL ADMINISTRATIVO EM TEMPO REAL.</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card Pessoal */}
        <Card className="card-shadow border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase">PESSOAL EFETIVO</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-[9px] text-muted-foreground uppercase">SERVIDORES CADASTRADOS</p>
          </CardContent>
        </Card>

        {/* Card Pedidos */}
        <Card className="card-shadow border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase">PEDIDOS PENDENTES</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests?.length || 0}</div>
            <p className="text-[9px] text-muted-foreground uppercase">AGUARDANDO ANÁLISE</p>
          </CardContent>
        </Card>

        {/* Card Ativos */}
        <Card className="card-shadow border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase">AGENTES ATIVOS</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-[9px] text-muted-foreground uppercase">EM SERVIÇO ATIVO</p>
          </CardContent>
        </Card>

        {/* Card: Banco de Horas */}
        <Card className="card-shadow border-blue-500/20 bg-blue-50/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase">BANCO DE HORAS (SALDO)</CardTitle>
            <Timer className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-700">
              {minutesToHHmm(operationStats.bhCredit - operationStats.bhDebit)}H
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-blue-100">
              <div>
                <p className="text-[8px] font-bold text-muted-foreground uppercase">CRÉDITO</p>
                <p className="text-[11px] font-bold text-green-600">{minutesToHHmm(operationStats.bhCredit)}H</p>
              </div>
              <div>
                <p className="text-[8px] font-bold text-muted-foreground uppercase">DÉBITO</p>
                <p className="text-[11px] font-bold text-red-600">-{minutesToHHmm(operationStats.bhDebit)}H</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card: TRE */}
        <Card className="card-shadow border-purple-500/20 bg-purple-50/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase">TRE (SALDO DIAS)</CardTitle>
            <CalendarDays className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-purple-700">
              {operationStats.treCredit - operationStats.treDebit} DIAS
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-purple-100">
              <div>
                <p className="text-[8px] font-bold text-muted-foreground uppercase">CRÉDITO</p>
                <p className="text-[11px] font-bold text-green-600">{operationStats.treCredit} DIAS</p>
              </div>
              <div>
                <p className="text-[8px] font-bold text-muted-foreground uppercase">DÉBITO</p>
                <p className="text-[11px] font-bold text-red-600">-{operationStats.treDebit} DIAS</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Afastamentos */}
        <Card className="card-shadow border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase">AFASTADOS</CardTitle>
            <FileText className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.leave + stats.vacation}</div>
            <p className="text-[9px] text-muted-foreground uppercase">LICENÇA OU FÉRIAS</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="lg:col-span-4 card-shadow">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl uppercase">DISTRIBUIÇÃO POR STATUS</CardTitle>
            <CardDescription className="text-xs sm:text-sm uppercase text-[9px]">QUANTITATIVO POR SITUAÇÃO FUNCIONAL.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm text-[10px]">
                            <div className="grid grid-cols-2 gap-2">
                              <span className="uppercase text-muted-foreground">STATUS</span>
                              <span className="uppercase text-muted-foreground">TOTAL</span>
                              <span className="font-bold">{payload[0].payload.name}</span>
                              <span className="font-bold text-primary">{payload[0].value}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 card-shadow">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl uppercase">PERCENTUAL DE EFETIVO</CardTitle>
            <CardDescription className="text-xs sm:text-sm uppercase text-[9px]">COMPOSIÇÃO PROPORCIONAL DA UNIDADE.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="h-[200px] sm:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={personnelStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {personnelStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {personnelStats.map((stat) => (
                <div key={stat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stat.color }} />
                    <span className="text-xs sm:text-sm font-medium uppercase">{stat.name}</span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground">{stat.value} ({stats.total > 0 ? Math.round((stat.value / stats.total) * 100) : 0}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
