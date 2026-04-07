
"use client"

import * as React from "react"
import { 
  CalendarCheck, 
  Search, 
  Loader2, 
  Download,
  CalendarDays
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFirestore, useCollection } from '@/firebase'
import { collection, query, orderBy } from 'firebase/firestore'

const MONTHS = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
];

const normalizeStr = (str: string) => str?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";

export default function FrequenciaPage() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear())
  
  const firestore = useFirestore()

  // Consultas ao Firestore
  const employeesRef = React.useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'employees'), orderBy('name', 'asc'));
  }, [firestore]);

  const launchesRef = React.useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'launches');
  }, [firestore]);

  const { data: employees, loading: loadingEmployees } = useCollection(employeesRef);
  const { data: launches, loading: loadingLaunches } = useCollection(launchesRef);

  // Cálculo de dias no mês selecionado
  const daysInMonth = React.useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedMonth, selectedYear]);

  // Anos para o seletor (2024 até 2030)
  const years = React.useMemo(() => {
    const startYear = 2024;
    const endYear = 2030;
    const list = [];
    for (let i = startYear; i <= endYear; i++) list.push(i);
    return list;
  }, []);

  // Lógica de filtragem por Nome, Matrícula ou QRA
  const filteredData = React.useMemo(() => {
    if (!employees) return [];
    const term = searchTerm.toLowerCase();
    return employees.filter(emp => 
      emp.name?.toLowerCase().includes(term) ||
      emp.matricula?.toLowerCase().includes(term) ||
      emp.qra?.toLowerCase().includes(term)
    );
  }, [employees, searchTerm]);

  if (loadingEmployees || loadingLaunches) {
    return (
      <div className="flex h-full items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl">
            <CalendarCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase text-primary">MAPA DE FREQUÊNCIA</h2>
            <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">CONSOLIDADO ESTRATÉGICO DA UNIDADE.</p>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" size="sm" className="h-9 uppercase font-bold text-[10px] gap-2 border-primary/20 hover:bg-primary/5 text-primary">
            <Download className="h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>

      <Card className="card-shadow border-primary/10 overflow-hidden rounded-xl border">
        <CardHeader className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 p-4 bg-muted/5 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="BUSCAR POR NOME, QRA OU MATRÍCULA..." 
              className="pl-8 uppercase h-9 text-[10px] border-muted/50 bg-background/50 focus:bg-background transition-colors" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="h-9 w-[140px] uppercase text-[10px] font-bold bg-background/50">
                  <SelectValue placeholder="MÊS" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, idx) => (
                    <SelectItem key={idx} value={idx.toString()} className="uppercase text-[10px] font-bold">
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="h-9 w-[100px] uppercase text-[10px] font-bold bg-background/50">
                <SelectValue placeholder="ANO" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()} className="uppercase text-[10px] font-bold">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 font-bold px-3 py-1 rounded-lg text-[10px] h-9 whitespace-nowrap">
              {filteredData.length} SERVIDORES
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/20">
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="font-bold uppercase text-[9px] w-[50px] text-center">Nº</TableHead>
                  <TableHead className="font-bold uppercase text-[9px] min-w-[80px]">MATRÍCULA</TableHead>
                  <TableHead className="font-bold uppercase text-[9px] min-w-[200px]">NOME COMPLETO</TableHead>
                  <TableHead className="font-bold uppercase text-[9px] text-center bg-blue-50/50 text-blue-700">PRESENÇA</TableHead>
                  <TableHead className="font-bold uppercase text-[9px] text-center">ESPECIAL</TableHead>
                  <TableHead className="font-bold uppercase text-[9px] text-center">FOLGA/TRE</TableHead>
                  <TableHead className="font-bold uppercase text-[9px] text-center">FÉRIAS</TableHead>
                  <TableHead className="font-bold uppercase text-[9px] text-center">ATESTADO</TableHead>
                  <TableHead className="font-bold uppercase text-[9px] text-center">ABONO</TableHead>
                  <TableHead className="font-bold uppercase text-[9px] text-center">FALTA</TableHead>
                  <TableHead className="font-bold uppercase text-[9px] text-center">LICENÇA</TableHead>
                  <TableHead className="font-bold uppercase text-[9px] text-center bg-muted/30">TOTAL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="h-32 text-center uppercase text-[10px] font-bold text-muted-foreground italic tracking-widest">
                      NENHUM SERVIDOR ENCONTRADO PARA OS FILTROS APLICADOS.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((emp, index) => {
                    // Filtrar lançamentos do servidor para o período selecionado
                    const employeeLaunches = (launches || []).filter(l => {
                      if (l.employeeId !== emp.id) return false;
                      if (!l.startDate) return false;
                      const launchDate = new Date(l.startDate + "T00:00:00");
                      return launchDate.getMonth() === selectedMonth && launchDate.getFullYear() === selectedYear;
                    });

                    let special = 0;
                    let folga = 0;
                    let ferias = 0;
                    let atestado = 0;
                    let abono = 0;
                    let falta = 0;
                    let licenca = 0;

                    employeeLaunches.forEach(l => {
                      const type = normalizeStr(l.type || "");
                      const d = Number(l.days) || 0;
                      const q = Number(l.qtdEscala) || 0;

                      // Regra de Especial: Soma qtdEscala apenas para "ESCALA ESPECIAL"
                      if (type === "ESCALA ESPECIAL") {
                        special += q;
                      } 
                      // Outras colunas: Somam campo dias e afetam a presença
                      else if (type.includes("FOLGA") || type.includes("TRE DEBITO")) {
                        folga += d;
                      } else if (type.includes("FERIAS")) {
                        ferias += d;
                      } else if (type.includes("ATESTADO")) {
                        atestado += d;
                      } else if (type.includes("ABONO")) {
                        abono += d;
                      } else if (type.includes("FALTA")) {
                        falta += d;
                      } else if (type.includes("LICENCA")) {
                        licenca += d;
                      }
                    });

                    const totalAbsences = folga + ferias + atestado + abono + falta + licenca;
                    const presence = daysInMonth - totalAbsences;
                    const finalTotal = presence + totalAbsences;

                    return (
                      <TableRow key={emp.id} className="hover:bg-blue-50/30 transition-colors">
                        <TableCell className="font-mono text-[9px] text-center text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-mono text-[10px] uppercase font-bold text-slate-600">{emp.matricula}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-[11px] uppercase text-slate-800 leading-tight">{emp.name}</span>
                            <span className="text-[9px] text-primary uppercase font-bold tracking-tighter">QRA: {emp.qra}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-[11px] font-black text-blue-700 bg-blue-50/20">{presence}</TableCell>
                        <TableCell className="text-center font-mono text-[10px] font-bold text-amber-600">{special || "0"}</TableCell>
                        <TableCell className="text-center font-mono text-[10px]">{folga || "0"}</TableCell>
                        <TableCell className="text-center font-mono text-[10px]">{ferias || "0"}</TableCell>
                        <TableCell className="text-center font-mono text-[10px]">{atestado || "0"}</TableCell>
                        <TableCell className="text-center font-mono text-[10px]">{abono || "0"}</TableCell>
                        <TableCell className="text-center font-mono text-[10px] text-red-600 font-bold">{falta || "0"}</TableCell>
                        <TableCell className="text-center font-mono text-[10px]">{licenca || "0"}</TableCell>
                        <TableCell className="text-center font-mono text-[11px] font-black bg-muted/5">{finalTotal}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
