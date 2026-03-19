
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc 
} from 'firebase/firestore';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, ShieldCheck, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { auth, firestore, user } = useAuth();

  // Redireciona se já estiver logado
  React.useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const qraInput = (formData.get('qra') as string).toUpperCase();
    const password = formData.get('password') as string;

    try {
      // 1. Busca o servidor pelo QRA
      const q = query(collection(firestore, 'employees'), where('qra', '==', qraInput));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({
          variant: 'destructive',
          title: 'ACESSO NEGADO',
          description: 'QRA NÃO ENCONTRADO NO SISTEMA.',
        });
        setLoading(false);
        return;
      }

      const employeeDoc = querySnapshot.docs[0];
      const employeeData = employeeDoc.data();

      if (!employeeData.email) {
        toast({
          variant: 'destructive',
          title: 'PENDÊNCIA DE CADASTRO',
          description: 'PRIMEIRO ACESSO NECESSÁRIO PARA VINCULAR E-MAIL.',
        });
        setLoading(false);
        return;
      }

      // 2. Login com o e-mail encontrado
      await signInWithEmailAndPassword(auth, employeeData.email, password);
      
      toast({
        title: 'BEM-VINDO!',
        description: `ACESSO AUTORIZADO PARA ${employeeData.name}.`,
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error(error);
      let message = 'ERRO AO REALIZAR LOGIN.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'SENHA INCORRETA.';
      } else if (error.code === 'auth/user-not-found') {
        message = 'USUÁRIO NÃO ENCONTRADO.';
      }
      toast({
        variant: 'destructive',
        title: 'FALHA NA AUTENTICAÇÃO',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const qraInput = (formData.get('qra') as string).toUpperCase();
    const valCode = (formData.get('valCode') as string).toUpperCase();
    const email = (formData.get('email') as string).toUpperCase();
    const password = formData.get('password') as string;

    try {
      // 1. Valida QRA e Código
      const q = query(
        collection(firestore, 'employees'), 
        where('qra', '==', qraInput),
        where('validationCode', '==', valCode)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({
          variant: 'destructive',
          title: 'VALIDAÇÃO FALHOU',
          description: 'QRA OU CÓDIGO DE ATIVAÇÃO INCORRETOS.',
        });
        setLoading(false);
        return;
      }

      const employeeDoc = querySnapshot.docs[0];
      const employeeData = employeeDoc.data();

      if (employeeData.uid) {
        toast({
          variant: 'destructive',
          title: 'ERRO',
          description: 'ESTE QRA JÁ POSSUI UM USUÁRIO VINCULADO.',
        });
        setLoading(false);
        return;
      }

      // 2. Cria usuário no Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // 3. Atualiza perfil do usuário
      await updateProfile(newUser, { displayName: employeeData.name });

      // 4. Vincula UID e Email ao documento do Firestore
      await updateDoc(doc(firestore, 'employees', employeeDoc.id), {
        uid: newUser.uid,
        email: email,
        status: 'ATIVO' // Ativa automaticamente no primeiro acesso
      });

      toast({
        title: 'CADASTRO CONCLUÍDO!',
        description: 'BEM-VINDO AO SISTEMA NRH.',
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error(error);
      let message = 'NÃO FOI POSSÍVEL REALIZAR O CADASTRO.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'ESTE E-MAIL JÁ ESTÁ SENDO UTILIZADO.';
      } else if (error.code === 'auth/weak-password') {
        message = 'A SENHA DEVE TER PELO MENOS 6 CARACTERES.';
      }
      toast({
        variant: 'destructive',
        title: 'ERRO NO PRIMEIRO ACESSO',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-700">
      <div className="w-full max-w-[450px] space-y-8">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="bg-primary h-16 w-16 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">NRH - GMVV</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">SISTEMA DE GESTÃO OPERACIONAL</p>
          </div>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl bg-slate-200/50 p-1">
            <TabsTrigger value="login" className="rounded-lg uppercase text-[10px] font-bold tracking-widest">LOGIN</TabsTrigger>
            <TabsTrigger value="first" className="rounded-lg uppercase text-[10px] font-bold tracking-widest">PRIMEIRO ACESSO</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="mt-6">
            <Card className="border-none shadow-2xl shadow-slate-200 rounded-3xl overflow-hidden">
              <form onSubmit={handleLogin}>
                <CardHeader className="space-y-1 pb-4">
                  <CardTitle className="text-xl font-bold uppercase tracking-tight">Acesso ao Sistema</CardTitle>
                  <CardDescription className="uppercase text-[9px] font-bold text-muted-foreground tracking-widest">INFORME SUAS CREDENCIAIS OPERACIONAIS.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="qra-login" className="uppercase text-[10px] font-bold text-slate-500">QRA</Label>
                    <div className="relative">
                      <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input id="qra-login" name="qra" placeholder="EX: SANTOS" required className="pl-10 h-12 uppercase font-bold text-xs bg-slate-50 border-slate-200 focus:bg-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pass-login" className="uppercase text-[10px] font-bold text-slate-500">SENHA</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input id="pass-login" name="password" type="password" placeholder="••••••••" required className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 pb-6">
                  <Button type="submit" className="w-full h-12 rounded-xl uppercase font-black text-xs tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-[0.98]" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "ENTRAR NO SISTEMA"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="first" className="mt-6">
            <Card className="border-none shadow-2xl shadow-slate-200 rounded-3xl overflow-hidden">
              <form onSubmit={handleRegister}>
                <CardHeader className="space-y-1 pb-4">
                  <CardTitle className="text-xl font-bold uppercase tracking-tight">Ativar Registro</CardTitle>
                  <CardDescription className="uppercase text-[9px] font-bold text-muted-foreground tracking-widest">VINCULE SEU E-MAIL E CRIE UMA SENHA.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="qra-reg" className="uppercase text-[10px] font-bold text-slate-500">QRA</Label>
                      <Input id="qra-reg" name="qra" placeholder="QRA" required className="h-12 uppercase font-bold text-xs bg-slate-50" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="code-reg" className="uppercase text-[10px] font-bold text-slate-500">CÓD. ATIVAÇÃO</Label>
                      <Input id="code-reg" name="valCode" placeholder="ABC123" required className="h-12 uppercase font-mono font-bold text-xs bg-slate-50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-reg" className="uppercase text-[10px] font-bold text-slate-500">E-MAIL</Label>
                    <Input id="email-reg" name="email" type="email" placeholder="EX@GMAIL.COM" required className="h-12 uppercase font-bold text-xs bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pass-reg" className="uppercase text-[10px] font-bold text-slate-500">CRIAR SENHA</Label>
                    <Input id="pass-reg" name="password" type="password" placeholder="MIN 6 CARACTERES" required className="h-12 bg-slate-50" />
                  </div>
                </CardContent>
                <CardFooter className="pt-2 pb-6">
                  <Button type="submit" className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 uppercase font-black text-xs tracking-widest shadow-lg shadow-green-200 transition-all active:scale-[0.98]" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "CONCLUIR ATIVAÇÃO"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest">
          © 2024 GUARDA MUNICIPAL DE VILA VELHA • NÚCLEO DE RH
        </p>
      </div>
    </div>
  );
}
