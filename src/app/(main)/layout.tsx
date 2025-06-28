"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { FullPageLoader } from "@/components/loader";
import { SidebarNav } from "@/components/sidebar-nav";

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
        <SidebarInset>
            <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 md:hidden">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold text-primary">VIBRA OS</h1>
            </header>
            <main className="flex flex-1 flex-col">
              {children}
            </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
