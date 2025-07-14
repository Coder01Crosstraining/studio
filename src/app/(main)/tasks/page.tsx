"use client";

import React from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

// This page is now effectively deprecated in favor of the dialog.
// We redirect to the dashboard to prevent users from accessing it directly.
export default function TasksPage() {
    const { role } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        router.replace('/');
    }, [router]);
  
    if (role !== 'SiteLeader') {
      return (
        <div className="w-full space-y-4">
           <h2 className="text-3xl font-bold tracking-tight">Acceso Denegado</h2>
            <p className="text-muted-foreground">
              Esta sección solo está disponible para Líderes de Sede.
            </p>
        </div>
      );
    }

    // Render nothing or a loader while redirecting
    return null;
}
