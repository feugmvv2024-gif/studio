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
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/firebase"

const navigation = [
  { name: "Painel", href: "/dashboard", icon: LayoutDashboard },
  { name: "Lançamentos", href: "/lancamentos", icon: FilePlus },
  { name: "Efetivo", href: "/efetivo", icon: Users },
  { name: "Relatórios", href: "/relatorios", icon: BarChart3 },
  { name: "Meus Lançamentos", href: "/meus-lancamentos", icon: History },
  { name: "Minhas Solicitações", href: "/requests", icon: ClipboardList },
  { name: "Meu Perfil", href: "/profile", icon: UserCircle },
  { name: "Configuração", href: "/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { logout, loading, employeeData } = useAuth()
  
  const [connectionStatus, setConnectionStatus] = React.useState<'connected' | 'stable' | 'disconnected'>('stable')

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
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 font-headline font-bold text-primary">
            <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg text-white">
              N
            </div>
            <span className="truncate text-lg group-data-[collapsible=icon]:hidden">
              NRH - GMVV
            </span>
          </div>
          <div className="flex items-center group-data-[collapsible=icon]:hidden">
            <div 
              className={`h-2.5 w-2.5 rounded-full ${getStatusColor()} animate-pulse shadow-[0_0_8px_rgba(0,0,0,0.2)]`} 
              title={getStatusLabel()}
            />
          </div>
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
