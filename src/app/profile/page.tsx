
"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Camera, 
  Loader2, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin,
  ShieldCheck
} from "lucide-react"
import { useAuth } from "@/firebase"

export default function ProfilePage() {
  const { employeeData, loading } = useAuth();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "---";
    try {
      return dateStr.split('-').reverse().join('/');
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <ShieldCheck className="h-12 w-12 text-muted-foreground opacity-20" />
        <p className="text-muted-foreground uppercase text-xs font-bold tracking-widest">REGISTRO NÃO LOCALIZADO NO SISTEMA.</p>
      </div>
    );
  }

  // Lotação combinada: UNIDADE / CARGO / ESCALA - TURNO
  const fullLotacao = `${employeeData.unit || "N/A"} / ${employeeData.role || "N/A"} / ${employeeData.escala || "N/A"} - ${employeeData.turno || "N/A"}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase text-primary">MEU PERFIL</h2>
        <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">CONSULTA DE DADOS CADASTRAIS OFICIAIS.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* CARD DO AVATAR */}
        <Card className="lg:col-span-1 card-shadow border-primary/10 overflow-hidden">
          <div className="h-24 bg-primary/5 border-b" />
          <CardContent className="-mt-12 flex flex-col items-center pb-8">
            <div className="relative group">
              <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background shadow-xl">
                <AvatarImage src={employeeData.avatar || `https://picsum.photos/seed/${employeeData.id}/150/150`} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                  {employeeData.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <Button size="icon" variant="secondary" className="absolute bottom-1 right-1 rounded-full h-8 w-8 shadow-lg border-2 border-background hover:scale-110 transition-transform">
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="mt-4 text-center space-y-1">
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-900 leading-tight">
                {employeeData.name}
              </h3>
              <div className="flex items-center justify-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px] font-bold uppercase border-primary/20 text-primary bg-primary/5">
                  QRA: {employeeData.qra}
                </Badge>
                <Badge variant="secondary" className="font-mono text-[10px] font-bold uppercase">
                  MAT: {employeeData.matricula}
                </Badge>
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest pt-2">
                {employeeData.role}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CARD DE INFORMAÇÕES PESSOAIS */}
        <Card className="lg:col-span-2 card-shadow border-primary/10 rounded-2xl">
          <CardHeader className="border-b bg-muted/5">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg uppercase font-bold">Dados Cadastrais</CardTitle>
                <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">
                  Informações registradas no núcleo de recursos humanos.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 p-6 pt-8">
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-bold text-muted-foreground flex items-center gap-2 tracking-widest">
                  <Mail className="h-3.5 w-3.5" /> E-MAIL INSTITUCIONAL
                </Label>
                <Input value={employeeData.email || "---"} readOnly className="bg-muted/30 uppercase text-[11px] font-bold h-11 border-muted/50 cursor-default" />
              </div>
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-bold text-muted-foreground flex items-center gap-2 tracking-widest">
                  <Phone className="h-3.5 w-3.5" /> CONTATO TELEFÔNICO
                </Label>
                <Input value={employeeData.phone || "---"} readOnly className="bg-muted/30 uppercase text-[11px] font-bold h-11 border-muted/50 cursor-default" />
              </div>
            </div>

            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-bold text-muted-foreground flex items-center gap-2 tracking-widest">
                  <Calendar className="h-3.5 w-3.5" /> DATA DE ADMISSÃO
                </Label>
                <Input value={formatDate(employeeData.admissionDate)} readOnly className="bg-muted/30 uppercase text-[11px] font-bold h-11 border-muted/50 cursor-default" />
              </div>
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-bold text-muted-foreground flex items-center gap-2 tracking-widest">
                  <ShieldCheck className="h-3.5 w-3.5" /> CÓDIGO DE ATIVAÇÃO
                </Label>
                <Input value={employeeData.validationCode || "---"} readOnly className="bg-muted/30 uppercase font-mono font-bold h-11 border-muted/50 text-primary cursor-default" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="uppercase text-[10px] font-bold text-muted-foreground flex items-center gap-2 tracking-widest">
                <MapPin className="h-3.5 w-3.5" /> LOTAÇÃO OPERACIONAL (SETOR / CARGO / ESCALA - TURNO)
              </Label>
              <Input value={fullLotacao.toUpperCase()} readOnly className="bg-blue-50/30 uppercase text-[11px] font-bold h-11 border-blue-100 text-blue-900 cursor-default" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-4 shadow-sm">
        <div className="bg-white p-2 rounded-lg border shadow-sm shrink-0">
          <ShieldCheck className="h-5 w-5 text-blue-500" />
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-black uppercase tracking-tight text-slate-900">Segurança de Dados</p>
          <p className="text-[10px] text-muted-foreground uppercase leading-relaxed font-medium">
            Seus dados cadastrais são sensíveis. Caso identifique qualquer erro nas informações acima, como data de admissão ou unidade de lotação, por favor abra um chamado junto ao Núcleo de RH para correção imediata nos registros oficiais.
          </p>
        </div>
      </div>
    </div>
  )
}
