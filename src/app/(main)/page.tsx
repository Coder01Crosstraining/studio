"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Site, SiteId } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { GlobalDashboard } from '@/components/dashboards/global-dashboard';
import { SingleSiteDashboard } from '@/components/dashboards/single-site-dashboard';
import { FullPageLoader } from '@/components/loader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DashboardPage() {
  const { user, role, loading } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<SiteId | 'global'>(role === 'CEO' ? 'global' : user?.siteId!);
  
  // Fetch sites for CEO's dropdown
  useEffect(() => {
    if (role === 'CEO') {
      const q = query(collection(db, 'sites'));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const sitesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Site));
        setSites(sitesData);
      });
      return () => unsubscribe();
    }
  }, [role]);

  useEffect(() => {
    if (role === 'SiteLeader' && user?.siteId) {
      setSelectedSite(user.siteId);
    } else if (role === 'CEO') {
      setSelectedSite('global');
    }
  }, [role, user]);

  const dashboardTitle = useMemo(() => {
    if (role === 'SiteLeader') return `Panel de Sede`;
    if (selectedSite === 'global') return "Panel Global";
    const siteName = sites.find(s => s.id === selectedSite)?.name;
    return `Panel de Sede: ${siteName || selectedSite}`;
  }, [selectedSite, sites, role]);

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  if (loading || (role === 'SiteLeader' && !user?.siteId)) {
    return <FullPageLoader />;
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0">
        <h2 className="text-3xl font-bold tracking-tight">{dashboardTitle}</h2>
        <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground hidden md:block">
                {capitalize(format(new Date(), "eeee, d 'de' MMMM", { locale: es }))}
            </p>
            {role === 'CEO' && (
            <Select onValueChange={(value: SiteId | 'global') => setSelectedSite(value)} defaultValue="global">
                <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="Selecciona una sede" /></SelectTrigger>
                <SelectContent>
                <SelectItem value="global">Resumen Global</SelectItem>
                {sites.map(site => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}
                </SelectContent>
            </Select>
            )}
        </div>
      </div>

      {role === 'CEO' ? (
        selectedSite === 'global' ? (
          <GlobalDashboard />
        ) : (
          <SingleSiteDashboard siteId={selectedSite} />
        )
      ) : (
        user?.siteId && <SingleSiteDashboard siteId={user.siteId} />
      )}
    </div>
  );
}
