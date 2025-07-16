
"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { FullPageLoader } from "@/components/loader";
import { SidebarNav } from "@/components/sidebar-nav";
import { Button } from "@/components/ui/button";
import { Menu, Building } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToolsToolbar } from "@/components/ui/tools-toolbar";

const CEO_ONLY_ROUTES = ['/management', '/history'];

function MobileHeader() {
  const { toggleSidebar } = useSidebar();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 md:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSidebar}
          className="shrink-0"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Alternar menú de navegación</span>
        </Button>
    </header>
  );
}

function MainContent({ children }: { children: React.ReactNode }) {
    const { state, isMobile } = useSidebar();
    const shouldBlur = state === 'expanded' && !isMobile;

    return (
        <div className={cn(
            "flex flex-1 flex-col transition-all md:ml-[var(--sidebar-width-icon)]",
            {
                "blur-sm": shouldBlur
            }
        )}>
            <MobileHeader />
            <main className="flex flex-1 p-4 sm:p-6 lg:p-8">
                {children}
            </main>
        </div>
    )
}

function LayoutContainer({ children }: { children: React.ReactNode }) {
  const { state, isMobile, setOpen } = useSidebar();
  const showOverlay = state === 'expanded' && !isMobile;

  return (
      <div className="flex min-h-screen bg-muted/20">
        <SidebarNav />
        <MainContent>{children}</MainContent>
        {showOverlay && (
            <div 
                className="fixed inset-0 z-30 bg-transparent"
                onClick={() => setOpen(false)}
            />
        )}
        <ToolsToolbar />
      </div>
  );
}

function UnassignedSiteMessage() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="max-w-md space-y-2 rounded-lg border bg-card p-8 text-center shadow-sm">
        <Building className="mx-auto h-12 w-12 text-primary" />
        <h2 className="text-2xl font-bold tracking-tight">Aún no tienes una sede asignada</h2>
        <p className="text-muted-foreground">
          Un administrador (CEO) debe asignarte a una sede desde el panel de gestión para que puedas empezar a utilizar la plataforma.
        </p>
         <p className="pt-2 text-sm text-muted-foreground">
          Mientras tanto, puedes configurar tu nombre y foto de perfil desde el menú de usuario.
        </p>
      </div>
    </div>
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (loading) return;
    
    if (!user) {
      router.push("/login");
      return;
    }
    
    if (role === 'SiteLeader' && CEO_ONLY_ROUTES.includes(pathname)) {
        router.push("/");
    }

  }, [user, role, loading, router, pathname]);

  if (loading || !user) {
    return <FullPageLoader />;
  }
  
  if (role === 'SiteLeader' && CEO_ONLY_ROUTES.includes(pathname)) {
    return <FullPageLoader />;
  }

  const contentToRender = (user.role === 'SiteLeader' && !user.siteId) 
    ? <UnassignedSiteMessage /> 
    : children;

  return (
    <SidebarProvider>
      <LayoutContainer>{contentToRender}</LayoutContainer>
    </SidebarProvider>
  );
}
