"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
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
  ShieldCheck,
  Save,
  Plus,
  Trash2,
  Heart,
  Baby,
  Vote,
  Fingerprint,
  Info
} from "lucide-react"
import { useAuth, useFirestore } from "@/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export default function ProfilePage() {
  const { employeeData, loading: authLoading } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  // Estados dos campos
  const [phone, setPhone] = React.useState("");
  const [emergencyPhone, setEmergencyPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [maritalStatus, setMaritalStatus] = React.useState("");
  const [spouseName, setSpouseName] = React.useState("");
  const [isSpouseEducationEmployee, setIsSpouseEducationEmployee] = React.useState(false);
  const [voterId, setVoterId] = React.useState("");
  const [voterZone, setVoterZone] = React.useState("");
  const [votingLocation, setVotingLocation] = React.useState("");
  const [birthDate, setBirthDate] = React.useState("");
  const [cpf, setCpf] = React.useState("");
  const [children, setChildren] = React.useState<{ name: string; age: string }[]>([]);

  // Inicializa estados com dados do Firestore
  React.useEffect(() => {
    if (employeeData) {
      setPhone(employeeData.phone || "");
      setEmergencyPhone(employeeData.emergencyPhone || "");
      setAddress(employeeData.address || "");
      setMaritalStatus(employeeData.maritalStatus || "SOLTEIRO(A)");
      setSpouseName(employeeData.spouseName || "");
      setIsSpouseEducationEmployee(!!employeeData.isSpouseEducationEmployee);
      setVoterId(employeeData.voterId || "");
      setVoterZone(employeeData.voterZone || "");
      setVotingLocation(employeeData.votingLocation || "");
      setBirthDate(employeeData.birthDate || "");
      setCpf(employeeData.cpf || "");
      setChildren(employeeData.children || []);
    }
  }, [employeeData]);

  const handleAddChild = () => {
    setChildren([...children, { name: "", age: "" }]);
  };

  const handleUpdateChild = (index: number, field: "name" | "age", value: string) => {
    const newChildren = [...children];
    newChildren[index][field] = value.toUpperCase();
    setChildren(newChildren);
  };

  const handleRemoveChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeData?.id || !firestore) return;

    setIsSaving(true);
    const updates = {
      phone: phone.toUpperCase(),
      emergencyPhone: emergencyPhone.toUpperCase(),
      address: address.toUpperCase(),
      maritalStatus: maritalStatus.toUpperCase(),
      spouseName: spouseName.toUpperCase(),
      isSpouseEducationEmployee,
      voterId: voterId.toUpperCase(),
      voterZone: voterZone.toUpperCase(),
      votingLocation: votingLocation.toUpperCase(),
      birthDate,
      cpf: cpf.toUpperCase(),
      children: children.filter(c => c.name.trim() !== ""),
    };

    try {
      await updateDoc(doc(firestore, "employees", employeeData.id), updates);
      toast({ title: "SUCESSO!", description: "DADOS CADASTRAIS ATUALIZADOS." });
    } catch (error) {
      toast({ variant: "destructive", title: "ERRO AO SALVAR", description: "Tente novamente mais tarde." });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
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

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase text-primary">FICHA DO SERVIDOR</h2>
          <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">MANTENHA SEUS DADOS SEMPRE ATUALIZADOS.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* CARD PRINCIPAL (HEADER) */}
        <Card className="card-shadow border-primary/10 overflow-hidden rounded-2xl">
          <div className="h-24 bg-primary/5 border-b" />
          <CardContent className="-mt-12 flex flex-col md:flex-row items-center gap-6 pb-8">
            <div className="relative group">
              <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background shadow-xl">
                <AvatarImage src={employeeData.avatar || `https://picsum.photos/seed/${employeeData.id}/150/150`} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                  {employeeData.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <Button type="button" size="icon" variant="secondary" className="absolute bottom-1 right-1 rounded-full h-8 w-8 shadow-lg border-2 border-background hover:scale-110 transition-transform">
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-1 text-center md:text-left space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-tight">
                {employeeData.name}
              </h3>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <Badge variant="outline" className="font-mono text-[10px] font-bold uppercase border-primary/20 text-primary bg-primary/5 px-3">
                  QRA: {employeeData.qra}
                </Badge>
                <Badge variant="secondary" className="font-mono text-[10px] font-bold uppercase px-3">
                  MATRÍCULA: {employeeData.matricula}
                </Badge>
                <Badge className="bg-green-600 text-white border-none text-[9px] uppercase font-bold px-3">
                  {employeeData.status}
                </Badge>
              </div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                {employeeData.role} • {employeeData.unit}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ALINHAMENTO VERTICAL DOS CARDS */}
        <div className="flex flex-col gap-8">
          {/* SEÇÃO 1: DADOS PESSOAIS */}
          <Card className="card-shadow border-none rounded-2xl">
            <CardHeader className="border-b bg-muted/5">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                  <Fingerprint className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-sm uppercase font-black tracking-widest">Dados Pessoais & Documentos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">CPF</Label>
                  <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" className="uppercase font-bold text-xs h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Data de Nascimento</Label>
                  <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="font-bold text-xs h-11" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Data de Admissão</Label>
                  <Input value={employeeData.admissionDate ? employeeData.admissionDate.split('-').reverse().join('/') : ""} readOnly className="bg-muted/30 uppercase font-bold text-xs h-11 cursor-not-allowed" />
                  <p className="text-[8px] text-muted-foreground italic uppercase">Dado bloqueado para edição.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Email Institucional</Label>
                  <Input value={employeeData.email || ""} readOnly className="bg-muted/30 uppercase font-bold text-xs h-11 cursor-not-allowed" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 2: CONTATO E ENDEREÇO */}
          <Card className="card-shadow border-none rounded-2xl">
            <CardHeader className="border-b bg-muted/5">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-sm uppercase font-black tracking-widest">Contato & Localização</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Phone className="h-3 w-3" /> Telefone Principal
                  </Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(27) 99999-9999" className="uppercase font-bold text-xs h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Phone className="h-3 w-3" /> Telefone de Emergência
                  </Label>
                  <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="(27) 99999-9999" className="uppercase font-bold text-xs h-11" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="h-3 w-3" /> Endereço Residencial Completo
                </Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="RUA, NÚMERO, BAIRRO, CIDADE..." className="uppercase font-bold text-xs h-11" />
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 3: FAMÍLIA E DEPENDENTES */}
          <Card className="card-shadow border-none rounded-2xl">
            <CardHeader className="border-b bg-muted/5">
              <div className="flex items-center gap-3">
                <div className="bg-red-50 p-2 rounded-lg border border-red-100">
                  <Heart className="h-5 w-5 text-red-600" />
                </div>
                <CardTitle className="text-sm uppercase font-black tracking-widest">Família & Dependentes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* ESTADO CIVIL */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Estado Civil</Label>
                    <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                      <SelectTrigger className="h-11 uppercase text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SOLTEIRO(A)" className="uppercase text-xs">SOLTEIRO(A)</SelectItem>
                        <SelectItem value="CASADO(A)" className="uppercase text-xs">CASADO(A)</SelectItem>
                        <SelectItem value="UNIÃO ESTÁVEL" className="uppercase text-xs">UNIÃO ESTÁVEL</SelectItem>
                        <SelectItem value="DIVORCIADO(A)" className="uppercase text-xs">DIVORCIADO(A)</SelectItem>
                        <SelectItem value="VIÚVO(A)" className="uppercase text-xs">VIÚVO(A)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(maritalStatus === "CASADO(A)" || maritalStatus === "UNIÃO ESTÁVEL") && (
                    <div className="space-y-4 p-4 bg-slate-50 border rounded-xl animate-in slide-in-from-top-2 duration-300">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nome do Cônjuge</Label>
                        <Input value={spouseName} onChange={(e) => setSpouseName(e.target.value)} className="uppercase font-bold text-xs h-11 bg-white" />
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase leading-tight tracking-widest">
                          Cônjuge é servidor da Educação de Vila Velha?
                        </Label>
                        <Switch checked={isSpouseEducationEmployee} onCheckedChange={setIsSpouseEducationEmployee} />
                      </div>
                    </div>
                  )}
                </div>

                <Separator orientation="vertical" className="hidden md:block h-auto" />

                {/* FILHOS */}
                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Baby className="h-4 w-4 text-primary" />
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Filhos (Dependentes)</Label>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddChild} className="h-8 text-[9px] font-bold uppercase gap-2 rounded-xl">
                      <Plus className="h-3 w-3" /> ADICIONAR FILHO
                    </Button>
                  </div>

                  {children.length === 0 ? (
                    <div className="p-8 border-2 border-dashed rounded-2xl text-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold italic">Nenhum filho cadastrado.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {children.map((child, index) => (
                        <div key={index} className="flex gap-2 items-end p-3 border rounded-xl bg-slate-50 animate-in zoom-in-95 duration-200">
                          <div className="flex-1 space-y-1.5">
                            <Label className="text-[8px] font-bold uppercase text-muted-foreground">Nome Completo</Label>
                            <Input value={child.name} onChange={(e) => handleUpdateChild(index, "name", e.target.value)} className="h-9 uppercase text-xs font-bold bg-white" />
                          </div>
                          <div className="w-20 space-y-1.5">
                            <Label className="text-[8px] font-bold uppercase text-muted-foreground">Idade</Label>
                            <Input value={child.age} onChange={(e) => handleUpdateChild(index, "age", e.target.value)} className="h-9 text-center text-xs font-bold bg-white" />
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveChild(index)} className="h-9 w-9 text-destructive hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 4: DADOS ELEITORAIS */}
          <Card className="card-shadow border-none rounded-2xl">
            <CardHeader className="border-b bg-muted/5">
              <div className="flex items-center gap-3">
                <div className="bg-purple-50 p-2 rounded-lg border border-purple-100">
                  <Vote className="h-5 w-5 text-purple-600" />
                </div>
                <CardTitle className="text-sm uppercase font-black tracking-widest">Dados Eleitorais (Votação)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Número do Título</Label>
                  <Input value={voterId} onChange={(e) => setVoterId(e.target.value)} placeholder="0000 0000 0000" className="uppercase font-bold text-xs h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Zona Eleitoral</Label>
                  <Input value={voterZone} onChange={(e) => setVoterZone(e.target.value)} placeholder="000" className="uppercase font-bold text-xs h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Local de Votação (Escola/Sede)</Label>
                  <Input value={votingLocation} onChange={(e) => setVotingLocation(e.target.value)} placeholder="NOME DA ESCOLA..." className="uppercase font-bold text-xs h-11" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* NOTA DE RODAPÉ E BOTÃO SALVAR */}
        <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-6 p-6 bg-slate-50 border border-slate-200 rounded-3xl">
          <div className="flex items-start gap-4 max-w-xl">
            <div className="bg-white p-2 rounded-xl border shadow-sm">
              <Info className="h-5 w-5 text-blue-500" />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-black uppercase text-slate-900 tracking-tight">Compromisso com a Veracidade</p>
              <p className="text-[9px] text-muted-foreground uppercase leading-relaxed font-bold">
                Ao salvar estas informações, você declara que os dados fornecidos são verdadeiros e assume a responsabilidade por qualquer inconsistência. Os dados oficiais de Matrícula e Admissão só podem ser alterados pelo RH.
              </p>
            </div>
          </div>
          
          <Button 
            type="submit" 
            disabled={isSaving} 
            className="w-full md:w-auto h-14 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-200 transition-all active:scale-95"
          >
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
            GRAVAR ATUALIZAÇÃO CADASTRAL
          </Button>
        </div>
      </form>
    </div>
  )
}
