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
  Archive,
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
  useSidebar,
} from "@/components/ui/sidebar";
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
import { cn } from "@/lib/utils";

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
    href: "/history",
    icon: Archive,
    label: "Historial KPIs",
    roles: ["CEO"],
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
  const { toggleSidebar, isMobile, setOpenMobile, state, setOpen } = useSidebar();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  const filteredNavItems = navItems.filter(item => !item.roles || item.roles.includes(role || ''));

  return (
    <Sidebar>
      <SidebarHeader>
        <Button 
            variant="ghost" 
            onClick={toggleSidebar}
            className={cn(
                "h-auto w-full justify-start p-2 text-xl font-semibold", 
                "group-data-[state=collapsed]/sidebar:w-auto group-data-[state=collapsed]/sidebar:justify-center"
            )}
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-8 w-8 shrink-0 text-primary">
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
            <span className="ml-2 group-data-[state=collapsed]/sidebar:hidden">VIBRA OS</span>
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu className="group-data-[state=collapsed]/sidebar:pointer-events-none">
          {filteredNavItems.map((item) => (
             <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <Link href={item.href} onClick={handleLinkClick}>
                  <item.icon />
                  <span className="group-data-[state=collapsed]/sidebar:hidden">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
         <div className={cn("flex w-full items-center gap-3 overflow-hidden p-2 text-left text-sm", "group-data-[state=collapsed]/sidebar:w-auto group-data-[state=collapsed]/sidebar:justify-center")}>
            <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={`https://i.pravatar.cc/150?u=${user?.email}`} />
                <AvatarFallback>{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden group-data-[state=collapsed]/sidebar:hidden">
                <p className="truncate font-medium">{user?.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.role}</p>
            </div>
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <Button variant="ghost" size="icon" className="h-8 w-8 group-data-[state=collapsed]/sidebar:hidden">
                    <LogOut className="h-4 w-4" />
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
         </div>
      </SidebarFooter>
    </Sidebar>
  );
}
