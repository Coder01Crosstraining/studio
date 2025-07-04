"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Site, SiteId, DailyReport, MonthlyHistory } from '@/lib/types';
import { generateSalesForecast, type GenerateSalesForecastOutput } from '@/ai/flows/generate-sales-forecast-flow';
import { Info, Loader2, Pencil, RefreshCw } from 'lucide-react';
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

    if (dayOfWeek === 0) { // Sunday
      effectiveBusinessDaysPast += 0;
    } else if (colombianHolidays2024.includes(dateString) || dayOfWeek === 6) { // Holiday or Saturday
      effectiveBusinessDaysPast += 0.5;
    } else { // Weekday
      effectiveBusinessDaysPast += 1;
    }
  }

  let effectiveBusinessDaysRemaining = 0;
  for (let day = elapsedDaysInMonth + 1; day <= totalDaysInMonth; day++) {
     const currentDate = new Date(year, month, day);
    const dayOfWeek = getDay(currentDate);
    const dateString = currentDate.toISOString().split('T')[0];
    
    if (dayOfWeek === 0) {
      effectiveBusinessDaysRemaining += 0;
    } else if (colombianHolidays2024.includes(dateString) || dayOfWeek === 6) {
      effectiveBusinessDaysRemaining += 0.5;
    } else { // Weekday
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
  const [isForecastLoading, setIsForecastLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const { toast } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<SiteId | null>(null);

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
              finalAverageTicket: siteData.averageTicket,
              monthlyGoal: siteData.monthlyGoal,
            };
            batch.set(historyDocRef, historyData);

            const siteRef = doc(db, 'sites', siteDoc.id);
            batch.update(siteRef, {
              revenue: 0,
              retention: 0,
              nps: 0,
              averageTicket: 0,
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


  const fetchAndCacheForecasts = React.useCallback(async () => {
    if (Object.keys(kpiData).length === 0) return;
    
    setIsForecastLoading(true);
    setIsRecalculating(true);
    
    try {
      const sitesToFetch = Object.keys(kpiData) as SiteId[];
      const monthProgress = calculateMonthProgress(new Date());

      const forecastPromises = sitesToFetch.map(async (siteId) => {
         const reportsRef = collection(db, 'sites', siteId, 'daily-reports');
         const q = query(reportsRef, orderBy('date', 'desc'), limit(7));
         const querySnapshot = await getDocs(q);
         const historicalRevenue = querySnapshot.docs.map(doc => (doc.data() as DailyReport).newRevenue);

        return generateSalesForecast({
          historicalRevenue: historicalRevenue,
          currentMonthRevenue: kpiData[siteId].revenue,
          ...monthProgress,
        }).catch(err => {
          console.error(`Error fetching forecast for ${siteId}:`, err);
          return null;
        })
      });
      const results = await Promise.all(forecastPromises);
      
      const newForecasts: Record<SiteId, GenerateSalesForecastOutput | null> = {};
      sitesToFetch.forEach((siteId, index) => {
          newForecasts[siteId] = results[index] as GenerateSalesForecastOutput;
      });

      sessionStorage.setItem('vibra-forecasts', JSON.stringify(newForecasts));
      setForecasts(newForecasts);

    } catch (error) {
      console.error("Failed to generate forecasts:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el pronóstico.' });
    } finally {
      setIsForecastLoading(false);
      setIsRecalculating(false);
    }
  }, [kpiData, toast]);

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

  // Check for cached forecasts on mount, or fetch new ones
  useEffect(() => {
    if (Object.keys(kpiData).length === 0) return;
    const cachedForecasts = sessionStorage.getItem('vibra-forecasts');
    if (cachedForecasts) {
        setForecasts(JSON.parse(cachedForecasts));
        setIsForecastLoading(false);
    } else {
        fetchAndCacheForecasts();
    }
  }, [kpiData, fetchAndCacheForecasts]);


  const handleOpenEditModal = (siteId: SiteId) => {
    setEditingSite(siteId);
    kpiForm.setValue('revenue', kpiData[siteId].revenue);
    kpiForm.setValue('monthlyGoal', kpiData[siteId].monthlyGoal);
    setIsEditModalOpen(true);
  };

  const handleKpiSubmit = async (values: z.infer<typeof kpiSchema>) => {
    if (!editingSite) return;
    
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
    }
  };

  const globalSummary = useMemo(() => {
    const siteCount = Object.keys(kpiData).length;
    if (siteCount === 0) return { revenue: 0, retention: 0, nps: 0, averageTicket: 0, salesForecast: 0, monthlyGoal: 0 };
    
    const totalRevenue = Object.values(kpiData).reduce((sum, site) => sum + site.revenue, 0);
    const avgRetention = Object.values(kpiData).reduce((sum, site) => sum + site.retention, 0) / siteCount;
    const avgNps = Object.values(kpiData).reduce((sum, site) => sum + site.nps, 0) / siteCount;
    const avgTicket = Object.values(kpiData).reduce((sum, site) => sum + site.averageTicket, 0) / siteCount;
    const totalForecast = Object.values(forecasts).reduce((sum, site) => sum + (site?.forecast || 0), 0);
    const totalMonthlyGoal = Object.values(kpiData).reduce((sum, site) => sum + site.monthlyGoal, 0);
    return { revenue: totalRevenue, retention: avgRetention, nps: avgNps, averageTicket: avgTicket, salesForecast: totalForecast, monthlyGoal: totalMonthlyGoal };
  }, [kpiData, forecasts]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

  if (isKpiLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
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
                    <CardTitle className="text-sm font-medium">Pronóstico Ventas (Global)</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => fetchAndCacheForecasts()} disabled={isRecalculating}>
                      {isRecalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      <span className="sr-only">Recalcular Pronóstico</span>
                    </Button>
                </CardHeader>
                <CardContent>
                    {isForecastLoading && Object.keys(forecasts).length === 0 ? (
                        <div className="flex items-center gap-2 pt-1"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /><span className="text-sm text-muted-foreground">Calculando...</span></div>
                    ) : (
                        <div className="text-2xl font-bold">{formatCurrency(globalSummary.salesForecast)}</div>
                    )}
                </CardContent>
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
                                <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(siteId as SiteId)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
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
                                    {isForecastLoading && !forecast ? (
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
                                    <p className="font-semibold">{data.nps.toFixed(1)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground">Ticket Promedio</p>
                                    <p className="font-semibold">{formatCurrency(data.averageTicket)}</p>
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
                        <TableHead className="min-w-[150px]">Sede</TableHead>
                        <TableHead className="text-right min-w-[150px]">Ventas a la Fecha</TableHead>
                        <TableHead className="text-right min-w-[150px]">Meta del Mes</TableHead>
                        <TableHead className="text-right min-w-[150px]">Cumplimiento (%)</TableHead>
                        <TableHead className="text-right min-w-[150px]">Pronóstico Ventas</TableHead>
                        <TableHead className="text-right min-w-[150px] hidden lg:table-cell">Ticket Promedio</TableHead>
                        <TableHead className="text-right min-w-[120px] hidden lg:table-cell">Retención</TableHead>
                        <TableHead className="text-right min-w-[120px] hidden lg:table-cell">NPS</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                    {Object.entries(kpiData).map(([siteId, data]) => {
                        const goalCompletion = data.monthlyGoal > 0 ? (data.revenue / data.monthlyGoal) * 100 : 0;
                        const forecast = forecasts[siteId as SiteId];
                        return (
                        <TableRow key={siteId}>
                        <TableCell className="font-medium">{siteMap.get(siteId as SiteId) || siteId}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.revenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.monthlyGoal)}</TableCell>
                        <TableCell className="text-right font-medium">{goalCompletion.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">
                            {isForecastLoading && !forecasts[siteId as SiteId] ? ( <div className="flex justify-end"><Loader2 className="h-4 w-4 animate-spin" /></div> ) : (
                            <div className="flex items-center justify-end gap-1">
                                {formatCurrency(forecasts[siteId as SiteId]?.forecast || 0)}
                                <Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground cursor-pointer" /></TooltipTrigger>
                                <TooltipContent align="end"><p className="max-w-xs">{forecasts[siteId as SiteId]?.reasoning}</p></TooltipContent>
                                </Tooltip>
                            </div>
                            )}
                        </TableCell>
                        <TableCell className="text-right hidden lg:table-cell">{formatCurrency(data.averageTicket)}</TableCell>
                        <TableCell className="text-right hidden lg:table-cell">{data.retention.toFixed(1)}%</TableCell>
                        <TableCell className="text-right hidden lg:table-cell">{data.nps.toFixed(1)}</TableCell>
                        <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(siteId as SiteId)}><Pencil className="h-4 w-4" /></Button></TableCell>
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
                <DialogFooter><Button type="submit">Guardar Cambios</Button></DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
