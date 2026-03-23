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
  Stethoscope,
  Info,
  X,
  Calendar
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

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

const formatDateBR = (dateStr: string) => {
  if (!dateStr) return "---";
  return dateStr.split('-').reverse().join('/');
};

export default function Dashboard() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isAbsentModalOpen, setIsAbsentModalOpen] = React.useState(false);
  const [isAfastadosModalOpen, setIsAfastadosModalOpen] = React.useState(false);

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

  // Listas para os Modais
  const absentList = React.useMemo(() => {
    if (!launches) return [];
    const today = getSaoPauloDate();
    return launches.filter(l => {
      const type = normalizeStr(l.type);
      const isActive = l.startDate <= today && l.endDate >= today;
      return isActive && (type.includes("FOLGA") || type.includes("ABONO") || type.includes("FALTA"));
    }).sort((a, b) => (a.employeeName || "").localeCompare(b.employeeName || ""));
  }, [launches]);

  const afastadosList = React.useMemo(() => {
    if (!employees || !launches) return [];
    const today = getSaoPauloDate();
    const statusAfastados = ["FÉRIAS", "LICENÇA", "ATESTADO"];
    
    return employees
      .filter(e => statusAfastados.includes(e.status))
      .map(e => {
        // Encontra o lançamento ativo para este afastado
        const activeLaunch = launches.find(l => 
          l.employeeId === e.id && 
          l.startDate <= today && 
          l.endDate >= today &&
          ["FERIAS", "LICENCA", "ATESTADO"].some(type => normalizeStr(l.type).includes(type))
        );
        return { ...e, endDate: activeLaunch?.endDate || null };
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [employees, launches]);

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

  // Cálculo de Efetivo Disponível
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

  const renderModalTable = (data: any[], type: 'absent' | 'afastado') => (
    <ScrollArea className="h-[550px] mt-4 rounded-xl border bg-background">
      <Table>
        <TableHeader className="bg-muted/30 sticky top-0 z-10">
          <TableRow>
            <TableHead className="font-bold uppercase text-[11px] h-12">QRA / NOME</TableHead>
            <TableHead className="font-bold uppercase text-[11px] h-12">ESCALA / TURNO</TableHead>
            <TableHead className="font-bold uppercase text-[11px] h-12">SETOR</TableHead>
            <TableHead className="font-bold uppercase text-[11px] h-12">TIPO</TableHead>
            <TableHead className="font-bold uppercase text-[11px] h-12 text-center">DATA FIM</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id} className="hover:bg-muted/10">
              <TableCell className="py-4">
                <div className="flex flex-col gap-0.5">
                  <span className="font-black uppercase text-[14px] text-slate-900 leading-none">{type === 'absent' ? item.employeeQra : item.qra}</span>
                  <span className="text-[11px] uppercase text-muted-foreground font-medium">{type === 'absent' ? item.employeeName : item.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-[12px] uppercase font-bold text-slate-700">
                {item.escala} / {item.turno}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-[10px] uppercase font-bold whitespace-nowrap bg-slate-100 px-2 py-0.5">
                  {type === 'absent' ? (employees?.find(e => e.id === item.employeeId)?.unit || "N/A") : item.unit}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn(
                  "text-[10px] uppercase font-black whitespace-nowrap border-none px-3 py-1",
                  (normalizeStr(item.type || item.status).includes("FERIAS")) ? "bg-blue-600 text-white" :
                  (normalizeStr(item.type || item.status).includes("LICENCA")) ? "bg-purple-600 text-white" :
                  (normalizeStr(item.type || item.status).includes("ATESTADO")) ? "bg-red-600 text-white" :
                  (normalizeStr(item.type || item.status).includes("FALTA")) ? "bg-red-900 text-white" :
                  "bg-orange-500 text-white"
                )}>
                  {item.type || item.status}
                </Badge>
              </TableCell>
              <TableCell className="text-center py-4">
                <div className="flex flex-col items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground/50" />
                  <span className="text-[12px] font-black font-mono text-slate-900">
                    {formatDateBR(item.endDate)}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-20 uppercase text-[11px] font-bold text-muted-foreground italic">
                NENHUM SERVIDOR NESTA CONDIÇÃO HOJE.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </ScrollArea>
  );

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
        <Card className="card-shadow border-primary/20 bg-primary/5 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase">EFETIVO DISPONÍVEL</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-primary">{availableStats.disponivel}</div>
            <p className="text-[9px] text-muted-foreground uppercase mt-1">TOTAL CADASTRADO: {stats.total}</p>
          </CardContent>
        </Card>

        <Card className="card-shadow border-blue-500/20 bg-blue-50/10 transition-all">
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

        <Card className="card-shadow border-purple-500/20 bg-purple-50/10 transition-all">
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

        {/* CARD AUSENTES (INTERATIVO) */}
        <Dialog open={isAbsentModalOpen} onOpenChange={setIsAbsentModalOpen}>
          <DialogTrigger asChild>
            <Card className="card-shadow border-red-500/20 bg-red-50/5 cursor-pointer hover:bg-red-50/20 transition-all active:scale-95 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[10px] font-bold uppercase group-hover:text-red-700 transition-colors">AUSENTES (HOJE)</CardTitle>
                <UserMinus className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-red-700">{absentStats.total}</div>
                  <Badge variant="outline" className="text-[7px] uppercase font-bold border-red-200 text-red-700">CLIQUE PARA VER</Badge>
                </div>
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
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-6xl rounded-2xl border-none shadow-2xl p-6 sm:p-8">
            <DialogHeader>
              <div className="flex items-center gap-4">
                <div className="bg-red-50 p-3 rounded-2xl border border-red-100">
                  <UserMinus className="h-7 w-7 text-red-600" />
                </div>
                <div>
                  <DialogTitle className="uppercase text-xl sm:text-2xl font-black tracking-tight">DETALHAMENTO: AUSENTES HOJE</DialogTitle>
                  <p className="text-xs uppercase font-bold text-muted-foreground tracking-widest mt-1">SERVIDORES COM LANÇAMENTO DE FOLGA, ABONO OU FALTA EM ATIVIDADE.</p>
                </div>
              </div>
            </DialogHeader>
            {renderModalTable(absentList, 'absent')}
          </DialogContent>
        </Dialog>

        {/* CARD AFASTADOS (INTERATIVO) */}
        <Dialog open={isAfastadosModalOpen} onOpenChange={setIsAfastadosModalOpen}>
          <DialogTrigger asChild>
            <Card className="card-shadow border-accent/20 bg-slate-50/50 cursor-pointer hover:bg-slate-100/80 transition-all active:scale-95 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[10px] font-bold uppercase group-hover:text-primary transition-colors">AFASTADOS</CardTitle>
                <FileText className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{stats.leave + stats.vacation + stats.medical}</div>
                  <Badge variant="outline" className="text-[7px] uppercase font-bold border-slate-300 text-slate-700">CLIQUE PARA VER</Badge>
                </div>
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
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-6xl rounded-2xl border-none shadow-2xl p-6 sm:p-8">
            <DialogHeader>
              <div className="flex items-center gap-4">
                <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100">
                  <FileText className="h-7 w-7 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="uppercase text-xl sm:text-2xl font-black tracking-tight">DETALHAMENTO: SERVIDORES AFASTADOS</DialogTitle>
                  <p className="text-xs uppercase font-bold text-muted-foreground tracking-widest mt-1">SERVIDORES ATUALMENTE EM GOZO DE FÉRIAS, LICENÇA OU AFASTAMENTO MÉDICO.</p>
                </div>
              </div>
            </DialogHeader>
            {renderModalTable(afastadosList, 'afastado')}
          </DialogContent>
        </Dialog>
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
