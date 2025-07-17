"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Site, SiteId, DailyReport, MonthlyHistory } from '@/lib/types';
import { generateSalesForecast, type GenerateSalesForecastOutput } from '@/ai/flows/generate-sales-forecast-flow';
import { Info, Loader2, Pencil, RefreshCw, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { getDay, getDate, getDaysInMonth, format, parse } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, getDocs, limit, orderBy, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const kpiSchema = z.object({
  revenue: z.coerce.number().min(0, "Las ventas deben ser un número positivo."),
  monthlyGoal: z.coerce.number().min(0, "La meta debe ser un número positivo."),
});

const colombianHolidays2024 = [
  '2024-01-01', '2024-01-08', '2024-03-25', '2024-03-28', '2024-03-29',
  '2024-05-01', '2024-05-13', '2024-06-03', '2024-06-10', '2024-07-01',
  '2024-07-20', '2024-08-07', '2024-08-19', '2024-10-14', '2024-11-04',
  '2024-11-11', '2024-12-08', '2024-12-25',
];

function calculateMonthProgress(today: Date) {
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-11
  
  const totalDaysInMonth = getDaysInMonth(today);
  const elapsedDaysInMonth = getDate(today);

  let effectiveBusinessDaysPast = 0;
  for (let day = 1; day <= elapsedDaysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    const dayOfWeek = getDay(currentDate); // 0=Sun, 1=Mon, ..., 6=Sat
    const dateString = currentDate.toISOString().split('T')[0];

    if (colombianHolidays2024.includes(dateString)) { // Holiday
      effectiveBusinessDaysPast += 0.5;
    } else { // Weekday or Weekend
      effectiveBusinessDaysPast += 1;
    }
  }

  let effectiveBusinessDaysRemaining = 0;
  for (let day = elapsedDaysInMonth + 1; day <= totalDaysInMonth; day++) {
     const currentDate = new Date(year, month, day);
    const dateString = currentDate.toISOString().split('T')[0];
    
    if (colombianHolidays2024.includes(dateString)) {
      effectiveBusinessDaysRemaining += 0.5;
    } else { // Weekday or Weekend
      effectiveBusinessDaysRemaining += 1;
    }
  }

  return {
    totalDaysInMonth,
    elapsedDaysInMonth,
    effectiveBusinessDaysPast,
    effectiveBusinessDaysRemaining
  };
}


export function GlobalDashboard() {
  const { role } = useAuth();
  const [kpiData, setKpiData] = useState<Record<SiteId, Site>>({} as Record<SiteId, Site>);
  const [isKpiLoading, setIsKpiLoading] = useState(true);
  const [forecasts, setForecasts] = useState<Record<SiteId, GenerateSalesForecastOutput | null>>({});
  const [isForecastLoading, setIsForecastLoading] = useState<Record<SiteId, boolean>>({});
  const [isRecalculating, setIsRecalculating] = useState(false);
  const { toast } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<SiteId | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const kpiForm = useForm<z.infer<typeof kpiSchema>>({
    resolver: zodResolver(kpiSchema),
  });

  const siteMap = useMemo(() => new Map(Object.values(kpiData).map(s => [s.id, s.name])), [kpiData]);

  // Monthly Reset and Archive Logic for CEO
  useEffect(() => {
    if (role !== 'CEO') return;

    const runMonthlyResetCheck = async () => {
      const statusRef = doc(db, 'settings', 'app-status');
      const now = new Date();
      const currentMonthStr = format(now, 'yyyy-MM');

      try {
        const statusDoc = await getDoc(statusRef);

        if (!statusDoc.exists()) {
          await setDoc(statusRef, { lastResetMonth: currentMonthStr });
          console.log('Initialized monthly reset status.');
          return;
        }

        const { lastResetMonth } = statusDoc.data();

        if (lastResetMonth < currentMonthStr) {
          toast({
            title: "Procesando cierre de mes...",
            description: "Archivando reportes y reiniciando contadores. Esto puede tardar un momento.",
          });

          const sitesSnapshot = await getDocs(collection(db, 'sites'));
          if (sitesSnapshot.empty) {
            await setDoc(statusRef, { lastResetMonth: currentMonthStr });
            return;
          }
          
          const batch = writeBatch(db);
          const previousMonthDate = parse(lastResetMonth, 'yyyy-MM', new Date());

          sitesSnapshot.forEach(siteDoc => {
            const siteData = siteDoc.data() as Site;

            const historyDocRef = doc(db, 'monthly-history', `${siteDoc.id}_${lastResetMonth}`);
            const historyData: MonthlyHistory = {
              siteId: siteDoc.id,
              siteName: siteData.name,
              year: previousMonthDate.getFullYear(),
              month: previousMonthDate.getMonth() + 1,
              finalRevenue: siteData.revenue,
              finalRetention: siteData.retention,
              finalNps: siteData.nps,
              monthlyGoal: siteData.monthlyGoal,
            };
            batch.set(historyDocRef, historyData);

            const siteRef = doc(db, 'sites', siteDoc.id);
            batch.update(siteRef, {
              revenue: 0,
              retention: 0,
              nps: 0,
            });
          });
          
          batch.set(statusRef, { lastResetMonth: currentMonthStr });
          await batch.commit();

          toast({
            title: "¡Cierre de mes completado!",
            description: "Los contadores de las sedes se han reiniciado para el nuevo mes.",
            duration: 8000
          });
        }
      } catch (error) {
        console.error("Error during monthly reset check:", error);
        toast({
          variant: 'destructive',
          title: "Error en el reinicio mensual",
          description: "No se pudieron reiniciar los contadores. Por favor contacta a soporte."
        });
      }
    };

    runMonthlyResetCheck();
  }, [role, toast]);


  const fetchForecastForSite = React.useCallback(async (siteId: SiteId, siteData: Site) => {
    setIsForecastLoading(prev => ({...prev, [siteId]: true}));
    try {
      const monthProgress = calculateMonthProgress(new Date());
      const reportsRef = collection(db, 'sites', siteId, 'daily-reports');
      const q = query(reportsRef, orderBy('date', 'desc'), limit(7));
      const querySnapshot = await getDocs(q);
      const historicalRevenue = querySnapshot.docs.map(doc => (doc.data() as DailyReport).newRevenue);

      const result = await generateSalesForecast({
        historicalRevenue: historicalRevenue,
        currentMonthRevenue: siteData.revenue,
        ...monthProgress,
      });

      sessionStorage.setItem(`vibra-forecast-${siteId}`, JSON.stringify(result));
      sessionStorage.setItem(`vibra-forecast-revenue-${siteId}`, siteData.revenue.toString());
      setForecasts(prev => ({ ...prev, [siteId]: result }));

    } catch (error) {
      console.error(`Failed to generate forecast for ${siteId}:`, error);
      toast({ variant: 'destructive', title: 'Error de Pronóstico', description: `No se pudo generar el pronóstico para ${siteData.name}.` });
      setForecasts(prev => ({ ...prev, [siteId]: null }));
    } finally {
      setIsForecastLoading(prev => ({...prev, [siteId]: false}));
    }
  }, [toast]);
  
  const fetchAllForecasts = React.useCallback(async (forceRefresh = false) => {
    if (Object.keys(kpiData).length === 0) return;
    setIsRecalculating(true);
    const sitesToFetch = Object.values(kpiData);
    
    const forecastPromises = sitesToFetch.map(site => {
        const cachedForecastRaw = sessionStorage.getItem(`vibra-forecast-${site.id}`);
        const cachedRevenue = sessionStorage.getItem(`vibra-forecast-revenue-${site.id}`);

        if (cachedForecastRaw && !forceRefresh && cachedRevenue === site.revenue.toString()) {
            setForecasts(prev => ({ ...prev, [site.id]: JSON.parse(cachedForecastRaw) }));
            return Promise.resolve();
        }
        return fetchForecastForSite(site.id, site);
    });

    await Promise.all(forecastPromises);
    setIsRecalculating(false);
  }, [kpiData, fetchForecastForSite]);

  // Fetch KPI data in real-time
  useEffect(() => {
    const q = query(collection(db, 'sites'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const sitesData: Record<SiteId, Site> = {} as Record<SiteId, Site>;
      querySnapshot.forEach((doc) => {
        sitesData[doc.id as SiteId] = { id: doc.id as SiteId, ...doc.data() } as Site;
      });
      setKpiData(sitesData);
      setIsKpiLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch forecasts when KPI data is loaded or changed
  useEffect(() => {
    if (Object.keys(kpiData).length > 0) {
      fetchAllForecasts(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kpiData]); // We only want to run this when kpiData itself changes.

  const handleOpenEditModal = (siteId: SiteId) => {
    setEditingSite(siteId);
    kpiForm.setValue('revenue', kpiData[siteId].revenue);
    kpiForm.setValue('monthlyGoal', kpiData[siteId].monthlyGoal);
    setIsEditModalOpen(true);
  };

  const handleKpiSubmit = async (values: z.infer<typeof kpiSchema>) => {
    if (!editingSite) return;
    setIsSubmitting(true);
    const siteRef = doc(db, "sites", editingSite);
    try {
      await updateDoc(siteRef, {
        revenue: values.revenue,
        monthlyGoal: values.monthlyGoal,
      });
      toast({
        title: 'Éxito',
        description: `Los KPIs para ${siteMap.get(editingSite) || editingSite} han sido actualizados.`,
      });
      setIsEditModalOpen(false);
      setEditingSite(null);
    } catch (error) {
      console.error("Error updating KPIs:", error);
      toast({
        variant: "destructive",
        title: 'Error',
        description: `No se pudo actualizar los KPIs.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

  const globalSummary = useMemo(() => {
    const siteValues = Object.values(kpiData);
    const siteCount = siteValues.length;
    if (siteCount === 0) return { revenue: 0, retention: 0, nps: 0, salesForecast: 0, monthlyGoal: 0 };
    
    const totalRevenue = siteValues.reduce((sum, site) => sum + (site.revenue || 0), 0);
    const avgRetention = siteValues.reduce((sum, site) => sum + (site.retention || 0), 0) / siteCount;
    const avgNps = siteValues.reduce((sum, site) => sum + (site.nps || 0), 0) / siteCount;
    const totalForecast = Object.values(forecasts).reduce((sum, site) => sum + (site?.forecast || 0), 0);
    const totalMonthlyGoal = siteValues.reduce((sum, site) => sum + (site.monthlyGoal || 0), 0);
    return { revenue: totalRevenue, retention: avgRetention, nps: avgNps, salesForecast: totalForecast, monthlyGoal: totalMonthlyGoal };
  }, [kpiData, forecasts]);
  
  const compliance = useMemo(() => {
    const monthProgress = calculateMonthProgress(new Date());
    const totalEffectiveDays = monthProgress.effectiveBusinessDaysPast + monthProgress.effectiveBusinessDaysRemaining;
    if (globalSummary.monthlyGoal === 0 || totalEffectiveDays === 0) {
      return { expected: 0, difference: globalSummary.revenue, status: 'on_track' as const };
    }
    
    const dailyGoal = globalSummary.monthlyGoal / totalEffectiveDays;
    const expected = dailyGoal * monthProgress.effectiveBusinessDaysPast;
    const difference = globalSummary.revenue - expected;

    let status: 'above' | 'below' | 'on_track';
    if (difference > 0) status = 'above';
    else if (difference < 0) status = 'below';
    else status = 'on_track';
    
    return { expected, difference, status };
  }, [globalSummary]);

  const getComplianceForSite = (site: Site) => {
    const monthProgress = calculateMonthProgress(new Date());
    const totalEffectiveDays = monthProgress.effectiveBusinessDaysPast + monthProgress.effectiveBusinessDaysRemaining;
    if (site.monthlyGoal === 0 || totalEffectiveDays === 0) {
      return { expected: 0, difference: site.revenue, status: 'on_track' as const };
    }

    const dailyGoal = site.monthlyGoal / totalEffectiveDays;
    const expected = dailyGoal * monthProgress.effectiveBusinessDaysPast;
    const difference = site.revenue - expected;
    
    let status: 'above' | 'below' | 'on_track';
    if (difference > 0) status = 'above';
    else if (difference < 0) status = 'below';
    else status = 'on_track';
    
    return { expected, difference, status };
  };

  const getForecastStatus = (forecastValue: number, goal: number) => {
    if (goal === 0) return 'on_track';
    if (forecastValue > goal) return 'above';
    if (forecastValue < goal) return 'below';
    return 'on_track';
  }

  const isGlobalForecastLoading = useMemo(() => {
    return Object.values(isForecastLoading).some(loading => loading);
  }, [isForecastLoading]);

  if (isKpiLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-5">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ventas a la Fecha (Global)</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{formatCurrency(globalSummary.revenue)}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Meta del Mes (Global)</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{formatCurrency(globalSummary.monthlyGoal)}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Desvío vs. Proyectado (Global)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className={cn("text-2xl font-bold flex items-center gap-2", { 'text-green-600': compliance.status === 'above', 'text-red-600': compliance.status === 'below' })}>
                         {compliance.status === 'above' && <TrendingUp />}
                         {compliance.status === 'below' && <TrendingDown />}
                         {compliance.status === 'on_track' && <Minus />}
                         {formatCurrency(compliance.difference)}
                    </div>
                    <p className="text-xs text-muted-foreground">Proyectado: {formatCurrency(compliance.expected)}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pronóstico Ventas (Global)</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => fetchAllForecasts(true)} disabled={isRecalculating}>
                      {isRecalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      <span className="sr-only">Recalcular Pronóstico</span>
                    </Button>
                </CardHeader>
                <CardContent>
                    {isGlobalForecastLoading && Object.keys(forecasts).length === 0 ? (
                        <div className="flex items-center gap-2 pt-1"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /><span className="text-sm text-muted-foreground">Calculando...</span></div>
                    ) : (
                        <div className={cn("text-2xl font-bold flex items-center gap-2", {
                            'text-green-600': getForecastStatus(globalSummary.salesForecast, globalSummary.monthlyGoal) === 'above',
                            'text-red-600': getForecastStatus(globalSummary.salesForecast, globalSummary.monthlyGoal) === 'below',
                        })}>
                            {getForecastStatus(globalSummary.salesForecast, globalSummary.monthlyGoal) === 'above' && <TrendingUp />}
                            {getForecastStatus(globalSummary.salesForecast, globalSummary.monthlyGoal) === 'below' && <TrendingDown />}
                            {formatCurrency(globalSummary.salesForecast)}
                        </div>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">NPS Promedio (Global)</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{(Math.trunc(globalSummary.nps * 100) / 100).toFixed(2)}</div></CardContent>
            </Card>
        </div>

        {/* Mobile View: List of Cards */}
        <div className="space-y-4 md:hidden">
            <h3 className="text-xl font-bold tracking-tight px-1">Comparación de Sedes</h3>
            {Object.entries(kpiData).map(([siteId, data]) => {
                const goalCompletion = data.monthlyGoal > 0 ? (data.revenue / data.monthlyGoal) * 100 : 0;
                const forecast = forecasts[siteId as SiteId];
                return (
                    <Card key={siteId}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">{siteMap.get(siteId as SiteId) || siteId}</CardTitle>
                                    <CardDescription>
                                        Meta: {formatCurrency(data.monthlyGoal)}
                                    </CardDescription>
                                </div>
                                {role === 'CEO' &&
                                  <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(siteId as SiteId)}>
                                      <Pencil className="h-4 w-4" />
                                  </Button>
                                }
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-primary">{formatCurrency(data.revenue)}</span>
                                    <span className="text-muted-foreground">{goalCompletion.toFixed(1)}%</span>
                                </div>
                                <Progress value={goalCompletion} className="h-2" />
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm pt-2">
                                <div className="space-y-1">
                                    <p className="text-muted-foreground">Pronóstico</p>
                                    {isForecastLoading[siteId] ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <p className="font-semibold">{formatCurrency(forecast?.forecast || 0)}</p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground">Retención</p>
                                    <p className="font-semibold">{data.retention.toFixed(1)}%</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground">NPS</p>
                                    <p className="font-semibold">{data.nps.toFixed(2)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    
        {/* Desktop View: Table */}
        <Card className="hidden md:block">
            <CardHeader>
                <CardTitle>Comparación de KPIs entre Sedes</CardTitle>
                <CardDescription>Un resumen de los indicadores clave de todas las sedes.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader><TableRow>
                        <TableHead className="w-[150px]">Sede</TableHead>
                        <TableHead className="text-right">Ventas a la Fecha</TableHead>
                        <TableHead className="text-right">Meta del Mes</TableHead>
                        <TableHead className="text-right">Cumplimiento (%)</TableHead>
                        <TableHead className="text-right">Desvío vs. Proyectado</TableHead>
                        <TableHead className="text-right">Pronóstico Ventas</TableHead>
                        <TableHead className="text-right hidden lg:table-cell">NPS</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                    {Object.entries(kpiData).map(([siteId, data]) => {
                        const goalCompletion = data.monthlyGoal > 0 ? (data.revenue / data.monthlyGoal) * 100 : 0;
                        const forecast = forecasts[siteId as SiteId];
                        const compliance = getComplianceForSite(data);
                        const forecastStatus = getForecastStatus(forecast?.forecast || 0, data.monthlyGoal);
                        return (
                        <TableRow key={siteId}>
                        <TableCell className="font-medium whitespace-nowrap">{siteMap.get(siteId as SiteId) || siteId}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.revenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.monthlyGoal)}</TableCell>
                        <TableCell className="text-right font-medium">{goalCompletion.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">
                            <Tooltip>
                               <TooltipTrigger asChild>
                                    <div className={cn("flex items-center justify-end gap-1 font-medium", 
                                        compliance.status === 'above' && 'text-green-600',
                                        compliance.status === 'below' && 'text-red-600',
                                    )}>
                                        {compliance.status === 'above' ? <TrendingUp className="h-4 w-4"/> : compliance.status === 'below' ? <TrendingDown className="h-4 w-4"/> : <Minus className="h-4 w-4"/>}
                                         {formatCurrency(compliance.difference)}
                                    </div>
                               </TooltipTrigger>
                                <TooltipContent>
                                    <p>Proyectado a la fecha: {formatCurrency(compliance.expected)}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TableCell>
                        <TableCell className="text-right">
                            {isForecastLoading[siteId] ? ( <div className="flex justify-end"><Loader2 className="h-4 w-4 animate-spin" /></div> ) : (
                            <div className="flex items-center justify-end gap-1">
                                <div className={cn("flex items-center justify-end gap-1 font-medium", 
                                    forecastStatus === 'above' && 'text-green-600',
                                    forecastStatus === 'below' && 'text-red-600',
                                )}>
                                    {forecastStatus === 'above' && <TrendingUp className="h-4 w-4"/>}
                                    {forecastStatus === 'below' && <TrendingDown className="h-4 w-4"/>}
                                    {formatCurrency(forecasts[siteId as SiteId]?.forecast || 0)}
                                </div>
                                <Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground cursor-pointer" /></TooltipTrigger>
                                <TooltipContent align="end"><p className="max-w-xs">{forecasts[siteId as SiteId]?.reasoning}</p></TooltipContent>
                                </Tooltip>
                            </div>
                            )}
                        </TableCell>
                        <TableCell className="text-right hidden lg:table-cell">{data.nps.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {role === 'CEO' &&
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(siteId as SiteId)}><Pencil className="h-4 w-4" /></Button>
                          }
                        </TableCell>
                        </TableRow>
                    );
                    })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader><DialogTitle>Editar KPIs para {editingSite && (siteMap.get(editingSite) || editingSite)}</DialogTitle><DialogDescription>Ajusta las ventas a la fecha y la meta mensual para esta sede.</DialogDescription></DialogHeader>
            <Form {...kpiForm}>
              <form onSubmit={kpiForm.handleSubmit(handleKpiSubmit)} className="space-y-4 py-4">
                <FormField control={kpiForm.control} name="revenue" render={({ field }) => ( <FormItem><FormLabel>Ventas a la Fecha (COP)</FormLabel><FormControl><Input type="number" placeholder="7500000" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={kpiForm.control} name="monthlyGoal" render={({ field }) => ( <FormItem><FormLabel>Nueva Meta Mensual (COP)</FormLabel><FormControl><Input type="number" placeholder="30000000" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Cambios
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
