
"use client"

import * as React from "react"
import { 
  Search, 
  Loader2, 
  FileText,
  User,
  Phone,
  MapPin,
  Fingerprint,
  Baby,
  Heart,
  Calendar,
  ExternalLink
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
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirestore, useCollection } from '@/firebase'
import { collection, query, orderBy } from 'firebase/firestore'

export default function DadosPerfilPage() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const firestore = useFirestore()

  const employeesRef = React.useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'employees'), orderBy('name', 'asc'));
  }, [firestore]);

  const { data: employees, loading } = useCollection(employeesRef);

  // Filtra apenas servidores que ativaram a conta (possuem UID)
  const activatedEmployees = React.useMemo(() => {
    if (!employees) return [];
    return employees.filter(emp => !!emp.uid);
  }, [employees]);

  const filteredData = React.useMemo(() => {
    const term = searchTerm.toLowerCase();
    return activatedEmployees.filter(emp => 
      emp.name?.toLowerCase().includes(term) ||
      emp.qra?.toLowerCase().includes(term) ||
      emp.matricula?.toLowerCase().includes(term)
    );
  }, [activatedEmployees, searchTerm]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderInfoRow = (label: string, value: any, icon?: React.ReactNode) => (
    <div className="flex flex-col space-y-1 py-2 border-b border-slate-100 last:border-0">
      <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
        {icon} {label}
      </span>
      <span className="text-[11px] font-bold uppercase text-slate-800">{value || "---"}</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2 rounded-xl">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase text-primary">DADOS PERFIL</h2>
            <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">AUDITORIA DE FICHAS FUNCIONAIS ATIVAS.</p>
          </div>
        </div>
      </div>

      <Card className="card-shadow border-primary/10 overflow-hidden rounded-xl border">
        <CardHeader className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-4 bg-muted/5 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="BUSCAR POR NOME, QRA OU MATRÍCULA..." 
              className="pl-8 uppercase h-9 text-[10px] border-muted/50 bg-background/50" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 font-bold px-3 py-1 rounded-lg text-xs">
            {filteredData.length} SERVIDORES ATIVOS
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/20">
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="font-bold uppercase text-[9px] min-w-[150px]">SERVIDOR / QRA</TableHead>
                  <TableHead className="font-bold uppercase text-[9px] min-w-[100px]">MATRÍCULA</TableHead>
                  <TableHead className="font-bold uppercase text-[9px] min-w-[120px]">CPF</TableHead>
                  <TableHead className="font-bold uppercase text-[9px] min-w-[150px]">TELEFONE</TableHead>
                  <TableHead className="font-bold uppercase text-[9px] min-w-[100px] text-center">DETALHES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center uppercase text-[10px] font-bold text-muted-foreground italic tracking-widest">
                      NENHUM PERFIL ATIVO ENCONTRADO.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((emp) => (
                    <TableRow key={emp.id} className="hover:bg-blue-50/30 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-[11px] uppercase text-slate-800">{emp.name}</span>
                          <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">QRA: {emp.qra} • {emp.role}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] uppercase font-bold text-slate-600">{emp.matricula}</TableCell>
                      <TableCell className="font-mono text-[10px] uppercase font-bold text-slate-600">{emp.cpf || "---"}</TableCell>
                      <TableCell className="text-[10px] font-bold text-slate-600 uppercase">{emp.phone || "---"}</TableCell>
                      <TableCell className="text-center">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-50 text-blue-600">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[95vw] sm:max-w-3xl rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
                            <DialogHeader className="bg-primary p-6 text-white">
                              <div className="flex items-center gap-4">
                                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                                  <User className="h-8 w-8 text-white" />
                                </div>
                                <div>
                                  <DialogTitle className="text-2xl font-black uppercase tracking-tight leading-none">{emp.name}</DialogTitle>
                                  <p className="text-[10px] font-bold uppercase opacity-80 tracking-widest mt-1">
                                    QRA: {emp.qra} • MAT: {emp.matricula} • {emp.status}
                                  </p>
                                </div>
                              </div>
                            </DialogHeader>
                            <ScrollArea className="max-h-[70vh]">
                              <div className="p-6 space-y-8">
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 border-b pb-2">
                                    <Fingerprint className="h-4 w-4 text-blue-600" />
                                    <h4 className="text-xs font-black uppercase text-slate-900 tracking-widest">Documentos & Pessoais</h4>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {renderInfoRow("CPF", emp.cpf)}
                                    {renderInfoRow("Data Nascimento", emp.birthDate?.split('-').reverse().join('/'), <Calendar className="h-2.5 w-2.5" />)}
                                    {renderInfoRow("Admissão", emp.admissionDate?.split('-').reverse().join('/'), <Calendar className="h-2.5 w-2.5" />)}
                                    {renderInfoRow("CNH (Nº)", emp.cnhNumber)}
                                    {renderInfoRow("CNH (Cat)", emp.cnhCategory)}
                                    {renderInfoRow("CNH (Val)", emp.cnhExpiration?.split('-').reverse().join('/'))}
                                    {renderInfoRow("Título Eleitor", emp.voterId)}
                                    {renderInfoRow("Zona", emp.voterZone)}
                                    {renderInfoRow("Local Votação", emp.votingLocation)}
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 border-b pb-2">
                                    <MapPin className="h-4 w-4 text-blue-600" />
                                    <h4 className="text-xs font-black uppercase text-slate-900 tracking-widest">Contato & Endereço</h4>
                                  </div>
                                  <div className="grid grid-cols-1 gap-4">
                                    {renderInfoRow("Endereço Completo", emp.address, <MapPin className="h-2.5 w-2.5" />)}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                      {renderInfoRow("Telefone", emp.phone, <Phone className="h-2.5 w-2.5" />)}
                                      {renderInfoRow("Contato Emergência", emp.emergencyContactName)}
                                      {renderInfoRow("Tel. Emergência", emp.emergencyPhone, <Phone className="h-2.5 w-2.5" />)}
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 border-b pb-2">
                                    <Heart className="h-4 w-4 text-red-600" />
                                    <h4 className="text-xs font-black uppercase text-slate-900 tracking-widest">Família & Dependentes</h4>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {renderInfoRow("Cônjuge", emp.spouseName)}
                                  </div>
                                  {emp.children && emp.children.length > 0 && (
                                    <div className="space-y-2 mt-4">
                                      <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                                        <Baby className="h-2.5 w-2.5" /> Filhos / Dependentes
                                      </span>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {emp.children.map((child: any, idx: number) => (
                                          <div key={idx} className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-1">
                                            <div className="flex justify-between items-center">
                                              <span className="text-[10px] font-bold uppercase">{child.name}</span>
                                              <Badge variant="secondary" className="text-[8px] font-black">{child.age} ANOS</Badge>
                                            </div>
                                            {child.cpf && (
                                              <span className="text-[9px] font-mono font-bold text-muted-foreground">CPF: {child.cpf}</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
