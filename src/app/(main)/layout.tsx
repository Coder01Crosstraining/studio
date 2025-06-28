"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { FullPageLoader } from "@/components/loader";
import { SidebarNav } from "@/components/sidebar-nav";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

function MobileHeader() {
  const { toggleSidebar } = useSidebar();
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
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
      <div className="flex min-h-screen">
        <SidebarNav />
        <div className="flex flex-1 flex-col">
          <MobileHeader />
          <SidebarInset>
              <main className="flex flex-1 flex-col p-4 md:p-6 lg:p-8">
                {children}
              </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}