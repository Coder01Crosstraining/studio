"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { db } from '@/lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import type { MonthlyHistory, Site, SiteId } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { FullPageLoader } from '@/components/loader';

export default function HistoryPage() {
  const { role } = useAuth();
  const router = useRouter();

  const [historyData, setHistoryData] = useState<MonthlyHistory[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<SiteId | 'global'>('global');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  
  useEffect(() => {
    if (role && role !== 'CEO') {
      router.push('/');
    }
  }, [role, router]);

  useEffect(() => {
    async function fetchData() {
      if (role !== 'CEO') return;
      setIsLoading(true);

      try {
        const historyQuery = query(collection(db, 'monthly-history'));
        const historySnapshot = await getDocs(historyQuery);
        const fetchedHistory = historySnapshot.docs.map(doc => doc.data() as MonthlyHistory);
        
        // Sort data on the client-side to avoid needing a composite index
        fetchedHistory.sort((a, b) => {
            if (a.year !== b.year) {
                return b.year - a.year; // Descending year
            }
            return b.month - a.month; // Descending month
        });

        setHistoryData(fetchedHistory);

        const sitesSnapshot = await getDocs(collection(db, 'sites'));
        setSites(sitesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Site)));

        if (fetchedHistory.length > 0) {
          const mostRecent = fetchedHistory[0];
          setSelectedMonth(`${mostRecent.year}-${String(mostRecent.month).padStart(2, '0')}`);
        }
      } catch (error) {
        console.error("Error fetching history data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [role]);

  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    historyData.forEach(item => {
      monthSet.add(`${item.year}-${String(item.month).padStart(2, '0')}`);
    });
    return Array.from(monthSet);
  }, [historyData]);

  const filteredData = useMemo(() => {
    if (!selectedMonth) return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    
    let data = historyData.filter(item => item.year === year && item.month === month);

    if (selectedSite !== 'global') {
      data = data.filter(item => item.siteId === selectedSite);
    }
    
    return data;
  }, [historyData, selectedMonth, selectedSite]);
  
  const globalSummary = useMemo(() => {
    const dataCount = filteredData.length;
    if (dataCount === 0) return { revenue: 0, retention: 0, nps: 0, averageTicket: 0, monthlyGoal: 0 };
    
    const totalRevenue = filteredData.reduce((sum, item) => sum + item.finalRevenue, 0);
    const avgRetention = filteredData.reduce((sum, item) => sum + item.finalRetention, 0) / dataCount;
    const avgNps = filteredData.reduce((sum, item) => sum + item.finalNps, 0) / dataCount;
    const avgTicket = filteredData.reduce((sum, item) => sum + item.finalAverageTicket, 0) / dataCount;
    const totalMonthlyGoal = filteredData.reduce((sum, item) => sum + item.monthlyGoal, 0);
    
    return { revenue: totalRevenue, retention: avgRetention, nps: avgNps, averageTicket: avgTicket, monthlyGoal: totalMonthlyGoal };
  }, [filteredData]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);


  if (role !== 'CEO') {
    return <FullPageLoader />;
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-3xl font-bold tracking-tight">Historial de Rendimiento</h2>
            <p className="text-muted-foreground">Analiza los KPIs históricos de todas las sedes.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
            <p className="text-sm text-muted-foreground hidden md:flex items-center">
              {capitalize(format(new Date(), "eeee, d 'de' MMMM", { locale: es }))}
            </p>
            <Select onValueChange={(value: any) => setSelectedSite(value)} defaultValue="global">
                <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Selecciona Sede" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    {sites.map(site => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select onValueChange={setSelectedMonth} value={selectedMonth}>
                <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Selecciona Mes" /></SelectTrigger>
                <SelectContent>
                {availableMonths.map(month => (
                    <SelectItem key={month} value={month}>
                        {capitalize(format(parse(month, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: es }))}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
      <>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{formatCurrency(globalSummary.revenue)}</div></CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Meta Consolidada</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{formatCurrency(globalSummary.monthlyGoal)}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Retención Promedio</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{globalSummary.retention.toFixed(1)}%</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">NPS Promedio</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{globalSummary.nps.toFixed(2)}</div></CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Detalle de KPIs por Sede</CardTitle>
                <CardDescription>
                    {selectedMonth ? `Mostrando datos para ${format(parse(selectedMonth, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: es })}` : 'Selecciona un mes para ver los datos.'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow>
                        <TableHead>Sede</TableHead>
                        <TableHead className="text-right">Ingresos</TableHead>
                        <TableHead className="text-right">Meta</TableHead>
                        <TableHead className="text-right">Cumplimiento</TableHead>
                        <TableHead className="text-right">Retención</TableHead>
                        <TableHead className="text-right">NPS</TableHead>
                        <TableHead className="text-right">Ticket Promedio</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="h-24 text-center">No hay datos históricos para la selección actual.</TableCell></TableRow>
                        ) : (
                            filteredData.map(item => {
                                const goalCompletion = item.monthlyGoal > 0 ? (item.finalRevenue / item.monthlyGoal) * 100 : 0;
                                return (
                                <TableRow key={item.siteId}>
                                    <TableCell className="font-medium">{item.siteName}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.finalRevenue)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.monthlyGoal)}</TableCell>
                                    <TableCell className="text-right font-medium">{goalCompletion.toFixed(1)}%</TableCell>
                                    <TableCell className="text-right">{item.finalRetention.toFixed(1)}%</TableCell>
                                    <TableCell className="text-right">{item.finalNps.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.finalAverageTicket)}</TableCell>
                                </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </>
      )}
    </div>
  );
}
