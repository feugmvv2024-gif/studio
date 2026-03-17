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
  CalendarDays,
  ShieldCheck,
  UserMinus,
  Plane,
  Stethoscope
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
import { collection, query, where, updateDoc, doc } from 'firebase/firestore'
import { useToast } from "@/hooks/use-toast"

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

const getSaoPauloDate = () => {
  const now = new Date();
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now).split('/').reverse().join('-');
};

export default function Dashboard() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const employeesRef = React.useMemo(() => collection(firestore, 'employees'), [firestore]);
  const launchesRef = React.useMemo(() => collection(firestore, 'launches'), [firestore]);

  const { data: employees, loading: loadingEmployees } = useCollection(employeesRef);
  const { data: launches, loading: loadingLaunches } = useCollection(launchesRef);

  // Automação de Reconciliação de Status
  React.useEffect(() => {
    if (!employees || !launches || loadingEmployees || loadingLaunches) return;

    const today = getSaoPauloDate();
    const syncStatus = async () => {
      let syncCount = 0;

      for (const emp of employees) {
        const activeLaunches = launches.filter(l => 
          l.employeeId === emp.id && 
          ["FERIAS", "LICENCA", "ATESTADO"].some(type => normalizeStr(l.type).includes(type))
        );

        const currentLaunch = activeLaunches.find(l => l.startDate <= today && l.endDate >= today);

        let targetStatus = "ATIVO";
        if (currentLaunch) {
          const type = normalizeStr(currentLaunch.type);
          if (type.includes("FERIAS")) targetStatus = "FÉRIAS";
          else if (type.includes("ATESTADO")) targetStatus = "ATESTADO";
          else targetStatus = "LICENÇA";
        }

        const validTransitions = ["ATIVO", "FÉRIAS", "LICENÇA", "ATESTADO"];
        if (emp.status !== targetStatus && validTransitions.includes(emp.status)) {
          await new Promise(r => setTimeout(r, 100));
          await updateDoc(doc(firestore, 'employees', emp.id), { status: targetStatus });
          syncCount++;
        }
      }

      if (syncCount > 0) {
        toast({ title: "SINCRONIZAÇÃO OPERACIONAL", description: `${syncCount} STATUS ATUALIZADOS CONFORME ESCALA.` });
      }
    };

    syncStatus();
  }, [employees, launches, loadingEmployees, loadingLaunches, firestore, toast]);

  // Estatísticas Gerais
  const stats = React.useMemo(() => {
    if (!employees) return { total: 0, active: 0, pending: 0, leave: 0, vacation: 0, medical: 0 };
    return {
      total: employees.length,
      active: employees.filter(e => e.status === "ATIVO").length,
      pending: employees.filter(e => e.status === "PENDENTE").length,
      leave: employees.filter(e => e.status === "LICENÇA").length,
      vacation: employees.filter(e => e.status === "FÉRIAS").length,
      medical: employees.filter(e => e.status === "ATESTADO").length,
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

  // Estatísticas de Ausentes (Hoje)
  const absentStats = React.useMemo(() => {
    if (!launches) return { total: 0, folga: 0, abono: 0, falta: 0 };
    const today = getSaoPauloDate();
    
    return launches.reduce((acc, l) => {
      const type = normalizeStr(l.type);
      const isActive = l.startDate <= today && l.endDate >= today;
      
      if (isActive) {
        if (type.includes("FOLGA")) { acc.folga++; acc.total++; }
        else if (type.includes("ABONO")) { acc.abono++; acc.total++; }
        else if (type.includes("FALTA")) { acc.falta++; acc.total++; }
      }
      
      return acc;
    }, { total: 0, folga: 0, abono: 0, falta: 0 });
  }, [launches]);

  // Cálculo de Efetivo Disponível (Disponível = Total - Afastados - Ausentes Hoje - Pendentes)
  const availableStats = React.useMemo(() => {
    const totalAfastados = stats.leave + stats.vacation + stats.medical;
    const totalAusentes = absentStats.total;
    const totalPendentes = stats.pending;
    const disponivel = stats.total - totalAfastados - totalAusentes - totalPendentes;
    return { disponivel, total: stats.total };
  }, [stats, absentStats]);

  const personnelStats = React.useMemo(() => [
    { name: "Ativos", value: stats.active, color: "hsl(var(--primary))" },
    { name: "Licença", value: stats.leave, color: "hsl(var(--accent))" },
    { name: "Férias", value: stats.vacation, color: "hsl(var(--chart-3))" },
    { name: "Atestado", value: stats.medical, color: "hsl(var(--destructive))" },
    { name: "Pendente", value: stats.pending, color: "#94a3b8" },
  ], [stats]);

  const chartData = [
    { name: "Ativos", total: stats.active },
    { name: "Licença", total: stats.leave },
    { name: "Férias", total: stats.vacation },
    { name: "Atestado", total: stats.medical },
    { name: "Pendente", total: stats.pending },
  ];

  if (loadingEmployees || loadingLaunches) {
    return (
      <div className="flex h-full items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase">VISÃO GERAL</h2>
          <p className="text-muted-foreground text-sm sm:text-base uppercase text-[10px]">PAINEL ADMINISTRATIVO EM TEMPO REAL.</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-green-600" />
          <span className="text-[10px] font-bold text-green-700 uppercase">Sincronização de Status Ativa</span>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {/* 1. EFETIVO DISPONÍVEL (PRONTO) */}
        <Card className="card-shadow border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase">EFETIVO DISPONÍVEL</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-primary">{availableStats.disponivel}</div>
            <p className="text-[9px] text-muted-foreground uppercase mt-1">TOTAL CADASTRADO: {stats.total}</p>
          </CardContent>
        </Card>

        {/* 2. BANCO DE HORAS */}
        <Card className="card-shadow border-blue-500/20 bg-blue-50/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase">BANCO DE HORAS</CardTitle>
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

        {/* 3. TRE (SALDO) */}
        <Card className="card-shadow border-purple-500/20 bg-purple-50/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase">TRE (SALDO)</CardTitle>
            <CalendarDays className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-purple-700">
              {operationStats.treCredit - operationStats.treDebit} DIAS
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-purple-100">
              <div>
                <p className="text-[8px] font-bold text-muted-foreground uppercase">CRÉDITO</p>
                <p className="text-[11px] font-bold text-green-600">{operationStats.treCredit}D</p>
              </div>
              <div>
                <p className="text-[8px] font-bold text-muted-foreground uppercase">DÉBITO</p>
                <p className="text-[11px] font-bold text-red-600">-{operationStats.treDebit}D</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. AUSENTES (HOJE) */}
        <Card className="card-shadow border-red-500/20 bg-red-50/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase">AUSENTES (HOJE)</CardTitle>
            <UserMinus className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{absentStats.total}</div>
            <div className="grid grid-cols-3 gap-1 mt-2 pt-2 border-t border-red-100">
              <div>
                <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-tighter">FOLGA</p>
                <p className="text-[10px] font-black text-red-600">{absentStats.folga}</p>
              </div>
              <div>
                <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-tighter">ABONO</p>
                <p className="text-[10px] font-black text-orange-600">{absentStats.abono}</p>
              </div>
              <div>
                <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-tighter">FALTA</p>
                <p className="text-[10px] font-black text-red-900">{absentStats.falta}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. AFASTADOS */}
        <Card className="card-shadow border-accent/20 bg-slate-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase">AFASTADOS</CardTitle>
            <FileText className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.leave + stats.vacation + stats.medical}</div>
            <div className="grid grid-cols-3 gap-1 mt-2 pt-2 border-t border-slate-100">
              <div>
                <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-tighter">FÉRIAS</p>
                <p className="text-[10px] font-black text-blue-600">{stats.vacation}</p>
              </div>
              <div>
                <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-tighter">LICENÇA</p>
                <p className="text-[10px] font-black text-purple-600">{stats.leave}</p>
              </div>
              <div>
                <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-tighter">ATESTADO</p>
                <p className="text-[10px] font-black text-red-600">{stats.medical}</p>
              </div>
            </div>
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
