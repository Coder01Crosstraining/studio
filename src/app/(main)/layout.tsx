"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { FullPageLoader } from "@/components/loader";
import { SidebarNav } from "@/components/sidebar-nav";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

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
            "flex flex-1 flex-col md:ml-[var(--sidebar-width-icon)] transition-all",
            shouldBlur && "blur-sm pointer-events-none"
        )}>
            <MobileHeader />
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                {children}
            </main>
        </div>
    )
}


export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <FullPageLoader />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-muted/20">
        <SidebarNav />
        <MainContent>{children}</MainContent>
      </div>
    </SidebarProvider>
  );
}
