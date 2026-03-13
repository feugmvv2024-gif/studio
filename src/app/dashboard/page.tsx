
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Users, 
  Clock, 
  TrendingUp, 
  FileText
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

const data = [
  { name: "Jan", total: 400 },
  { name: "Fev", total: 420 },
  { name: "Mar", total: 450 },
  { name: "Abr", total: 465 },
  { name: "Mai", total: 480 },
  { name: "Jun", total: 500 },
]

const personnelStats = [
  { name: "Ativos", value: 450, color: "hsl(var(--primary))" },
  { name: "Licença", value: 30, color: "hsl(var(--accent))" },
  { name: "Férias", value: 20, color: "hsl(var(--chart-3))" },
]

export default function Dashboard() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Visão Geral</h2>
        <p className="text-muted-foreground text-sm sm:text-base">Bem-vindo ao painel administrativo do NRH.</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pessoal Efetivo</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">500</div>
            <p className="text-xs text-muted-foreground">+4% em relação ao mês anterior</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitações Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">3 urgentes necessitam atenção</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lançamentos Recentes</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">+24</div>
            <p className="text-xs text-muted-foreground">Novos registros esta semana</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas em Banco</CardTitle>
            <FileText className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">1,240h</div>
            <p className="text-xs text-muted-foreground">Total acumulado da unidade</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="lg:col-span-4 card-shadow">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Crescimento do Efetivo</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Evolução mensal do número de funcionários.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm text-[10px]">
                            <div className="grid grid-cols-2 gap-2">
                              <span className="uppercase text-muted-foreground">Mês</span>
                              <span className="uppercase text-muted-foreground">Total</span>
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
            <CardTitle className="text-lg sm:text-xl">Distribuição de Pessoal</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Status atual de todos os colaboradores.</CardDescription>
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
                    <span className="text-xs sm:text-sm font-medium">{stat.name}</span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground">{stat.value} ({Math.round((stat.value / 500) * 100)}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
