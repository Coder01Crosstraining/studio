"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AreaChart,
  FileText,
  Users,
  LogOut,
  Settings,
  History,
  FolderKanban,
  UserCog,
  Search,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const navItems = [
  {
    href: "/",
    icon: AreaChart,
    label: "Panel Principal",
  },
  {
    href: "/weekly-report",
    icon: FileText,
    label: "Reporte Diario",
    roles: ["SiteLeader"],
  },
  {
    href: "/report-history",
    icon: History,
    label: "Historial de Reportes",
    roles: ["SiteLeader", "CEO"],
  },
  {
    href: "/one-on-one",
    icon: Users,
    label: "Sesiones 1-a-1",
    roles: ["SiteLeader", "CEO"],
  },
  {
    href: "/evidence",
    icon: FolderKanban,
    label: "Gestión Documental",
    roles: ["SiteLeader", "CEO"],
  },
  {
    href: "/management",
    icon: UserCog,
    label: "Gestión Usuarios",
    roles: ["CEO"],
  }
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const filteredNavItems = navItems.filter(item => !item.roles || item.roles.includes(role || ''));

  return (
    <Sidebar>
      <SidebarHeader className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-8 w-8 text-primary">
            <rect width="256" height="256" fill="none" />
            <path d="M48,88H208V48a8,8,0,0,0-8-8H56a8,8,0,0,0-8,8Z" opacity="0.2" />
            <path d="M48,88H208v40a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8Z" opacity="0.2" />
            <path d="M48,168H208v40a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8Z" opacity="0.2" />
            <line x1="16" y1="88" x2="240" y2="88" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
            <line x1="16" y1="168" x2="240" y2="168" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
            <path d="M208,40H48a8,8,0,0,0-8,8V208a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V48A8,8,0,0,0,208,40Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
            <line x1="88" y1="40" x2="88" y2="216" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
            <line x1="168" y1="40" x2="168" y2="216" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
          </svg>
          <span className="text-xl font-semibold group-data-[state=collapsed]:hidden">VIBRA OS</span>
        </Link>
        <SidebarTrigger />
      </SidebarHeader>

      <SidebarContent>
        <div className="p-2 group-data-[state=collapsed]:hidden">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Buscar..." className="pl-8 w-full" />
            </div>
        </div>
        <SidebarMenu>
          {filteredNavItems.map((item) => (
             <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-auto w-full justify-start p-2">
              <div className="flex w-full items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://i.pravatar.cc/150?u=${user?.email}`} />
                  <AvatarFallback>{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left group-data-[state=collapsed]:hidden">
                  <p className="truncate text-sm font-medium">{user?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.role}</p>
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
