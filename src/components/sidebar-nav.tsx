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
import { SettingsDialog } from "@/components/settings-dialog";

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
  const { isMobile, setOpenMobile, setIsDropdownOpen } = useSidebar();
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

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
    <>
    <Sidebar>
      <SidebarHeader>
        <div 
            className={cn(
                "flex h-auto w-full items-center justify-start p-2 text-xl font-semibold", 
                "group-data-[state=collapsed]/sidebar:w-auto group-data-[state=collapsed]/sidebar:justify-center"
            )}
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-10 w-10 shrink-0 text-primary">
              <path fill="currentColor" d="M2,3.41L5.5,3.41L12,15.25L18.5,3.41L22,3.41L12,21.59L2,3.41Z M7.83,3.41L12,10.91L16.17,3.41L14,3.41L12,7.09L10,3.41L7.83,3.41Z" />
            </svg>
            <span className="ml-2 group-data-[state=collapsed]/sidebar:hidden">VIBRA OS</span>
        </div>
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
                <AvatarImage src={user?.photoURL || `https://i.pravatar.cc/150?u=${user?.email}`} />
                <AvatarFallback>{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden group-data-[state=collapsed]/sidebar:hidden">
                <p className="truncate font-medium">{user?.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.role}</p>
            </div>
             <DropdownMenu onOpenChange={setIsDropdownOpen}>
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
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsSettingsOpen(true); }}>
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
    <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  );
}
