
'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/firebase';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
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

  // A verificação de nível de acesso (RBAC) foi removida.
  // Todos os usuários vinculados têm acesso aos filhos.

  return <>{children}</>;
}
