
'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/firebase';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredLevel?: number;
}

export function ProtectedRoute({ children, requiredLevel }: ProtectedRouteProps) {
  const { user, employeeData, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
          Validando Credenciais Operacionais...
        </p>
      </div>
    );
  }

  if (!user && pathname !== '/login') {
    return null;
  }

  // Se o usuário está logado mas não tem registro no RH
  if (user && !employeeData && pathname !== '/login' && !loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-6 text-center gap-6">
        <div className="bg-destructive/10 p-4 rounded-full">
          <ShieldAlert className="h-12 w-12 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black uppercase text-destructive">ACESSO NÃO AUTORIZADO</h2>
          <p className="text-muted-foreground text-sm uppercase max-w-md">
            Seu usuário não possui um registro vinculado no sistema de RH. 
            Entre em contato com a administração para validar seu cadastro.
          </p>
        </div>
        <Button onClick={() => logout()} variant="outline" className="uppercase font-bold text-xs h-11 px-8 rounded-xl">
          VOLTAR PARA O LOGIN
        </Button>
      </div>
    );
  }

  // Verificação de Nível de Acesso
  if (requiredLevel !== undefined && employeeData && Number(employeeData.accessLevel) > requiredLevel) {
     return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center gap-6 min-h-[400px]">
        <div className="bg-amber-100 p-4 rounded-full">
          <ShieldAlert className="h-10 w-10 text-amber-600" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold uppercase text-amber-800">RESTRITO</h2>
          <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest">
            SEU NÍVEL DE ACESSO NÃO PERMITE VISUALIZAR ESTE MÓDULO.
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard')} variant="secondary" className="uppercase font-bold text-[10px] h-9">
          VOLTAR AO PAINEL
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
