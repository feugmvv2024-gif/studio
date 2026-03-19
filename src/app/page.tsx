
'use client';

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/firebase"
import { Loader2 } from "lucide-react"

export default function Home() {
  const { user, loading, employeeData } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else {
        // Redireciona com base no nível de acesso
        const level = Number(employeeData?.accessLevel || 4);
        if (level >= 4) {
          router.push("/requests");
        } else {
          router.push("/dashboard");
        }
      }
    }
  }, [user, loading, employeeData, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
