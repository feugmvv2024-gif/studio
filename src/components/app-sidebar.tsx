
"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  UserCircle,
  LogOut,
  Settings,
  FilePlus,
  BarChart3,
  History,
  ShieldCheck,
  FileText,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth, useCollection } from "@/firebase"
import { collection, query, where } from "firebase/firestore"

const navigation = [
  { name: "Painel", href: "/dashboard", icon: LayoutDashboard },
  { name: "Lançamentos", href: "/lancamentos", icon: FilePlus },
  { name: "Efetivo", href: "/efetivo", icon: Users },
  { name: "Relatórios", href: "/relatorios", icon: BarChart3 },
  { name: "Meus Lançamentos", href: "/meus-lancamentos", icon: History },
  { name: "Minhas Solicitações", href: "/requests", icon: ClipboardList },
  { name: "Meu Perfil", href: "/profile", icon: UserCircle },
  { name: "Dados Perfil", href: "/dados-perfil", icon: FileText },
  { name: "Configuração", href: "/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { logout, loading, employeeData, user, firestore } = useAuth()
  const { state } = useSidebar()
  
  const [connectionStatus, setConnectionStatus] = React.useState<'connected' | 'stable' | 'disconnected'>('stable')

  // Lógica de monitoramento de requerimentos pendentes (Fluxo Multi-Etapas)
  const managementRequestsQuery = React.useMemo(() => {
    if (!firestore || !user || !employeeData) return null;
    return query(collection(firestore, 'requests'), where('status', 'in', ['Pendente', 'Aguardando Parceiro', 'Aprovado pela Chefia']));
  }, [firestore, user, employeeData]);

  const { data: managementRequests } = useCollection(managementRequestsQuery);

  const pendingActionCount = React.useMemo(() => {
    if (!managementRequests || !user || !employeeData) return 0;
    const role = (employeeData.role || "").toUpperCase();
    const isRH = role.includes("GESTOR DE RH");
    
    return managementRequests.filter(req => {
      // 1. Sou o parceiro aguardando aceite?
      if (req.status === "Aguardando Parceiro") return req.partnerId === user.uid;
      // 2. Sou a chefia aguardando parecer?
      if (req.status === "Pendente") return req.chefiaIds?.includes(user.uid);
      // 3. Sou o RH aguardando homologação?
      if (req.status === "Aprovado pela Chefia") return isRH;
      return false;
    }).length;
  }, [managementRequests, user, employeeData]);

  React.useEffect(() => {
    if (!loading) setConnectionStatus('connected')
  }, [loading])

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500'
      case 'stable': return 'bg-orange-500'
      case 'disconnected': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusLabel = () => {
    switch (connectionStatus) {
      case 'connected': return 'Conectado'
      case 'stable': return 'Estável'
      case 'disconnected': return 'Desconectado'
      default: return 'Status Desconhecido'
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b p-2">
        <div className="flex items-center justify-between w-full group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-2 font-headline font-bold text-primary group-data-[collapsible=icon]:hidden px-4">
            <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg text-white">
              N
            </div>
            <span className="truncate text-lg">
              NRH - GMVV
            </span>
            <div 
              className={`ml-2 h-2.5 w-2.5 rounded-full ${getStatusColor()} animate-pulse shadow-[0_0_8px_rgba(0,0,0,0.2)]`} 
              title={getStatusLabel()}
            />
          </div>
          <SidebarTrigger className="transition-transform duration-200" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
            Navegação Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.name}
                      className="transition-all duration-200"
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.href === "/requests" && pendingActionCount > 0 && (
                      <SidebarMenuBadge className="bg-primary text-primary-foreground font-black text-[10px] rounded-full h-5 min-w-5 flex items-center justify-center border-2 border-background shadow-sm">
                        {pendingActionCount}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4 space-y-2">
        <SidebarMenu>
          {employeeData && (
            <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
              <div className="flex items-center gap-2 px-2 py-1.5 text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary/70" />
                <span className="text-[10px] font-black uppercase tracking-wider truncate">
                  {employeeData.role} : {employeeData.qra}
                </span>
              </div>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={() => logout()}
              className="w-full justify-start text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Sair do Sistema</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
