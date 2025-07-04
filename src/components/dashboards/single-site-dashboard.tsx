"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Line, LineChart, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { Site, SiteId, DailyReport, UserRole } from '@/lib/types';
import { generateSalesForecast, type GenerateSalesForecastOutput } from '@/ai/flows/generate-sales-forecast-flow';
import { updateNpsForSiteIfStale } from '@/services/google-sheets';
import { Info, Loader2, Pencil, RefreshCw } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent as UITooltipContent, TooltipTrigger as UITooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { format, getDay, getDate, getDaysInMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, doc, getDocs, limit, orderBy, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const chartConfig = {
  revenue: { label: 'Ingresos', color: 'hsl(var(--chart-1))' },
  goal: { label: 'Meta', color: 'hsl(var(--chart-2))' },
};

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


type DailyChartData = { date: string; revenue: number; goal: number };

export function SingleSiteDashboard({ siteId, role }: { siteId: SiteId, role: UserRole }) {
    const [kpiData, setKpiData] = useState<Site | null>(null);
    const [dailyData, setDailyData] = useState<DailyChartData[]| null>(null);
    const [isKpiLoading, setIsKpiLoading] = useState(true);
    const [forecast, setForecast] = useState<GenerateSalesForecastOutput | null>(null);
    const [isForecastLoading, setIsForecastLoading] = useState(true);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const { toast } = useToast();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const kpiForm = useForm<z.infer<typeof kpiSchema>>({
        resolver: zodResolver(kpiSchema),
    });

    const fetchAndCacheForecast = React.useCallback(async () => {
        if (!kpiData) return;
        setIsForecastLoading(true);
        setIsRecalculating(true);
        try {
            const monthProgress = calculateMonthProgress(new Date());
            const reportsRef = collection(db, 'sites', siteId, 'daily-reports');
            const q = query(reportsRef, orderBy('date', 'desc'), limit(7));
            const querySnapshot = await getDocs(q);
            const historicalRevenue = querySnapshot.docs.map(doc => (doc.data() as DailyReport).newRevenue);

            const result = await generateSalesForecast({
                historicalRevenue: historicalRevenue,
                currentMonthRevenue: kpiData.revenue,
                ...monthProgress,
            });

            const cachedForecastsRaw = sessionStorage.getItem('vibra-forecasts');
            const allForecasts = cachedForecastsRaw ? JSON.parse(cachedForecastsRaw) : {};
            allForecasts[siteId] = result;
            sessionStorage.setItem('vibra-forecasts', JSON.stringify(allForecasts));
            
            setForecast(result);
        } catch (error) {
            console.error("Failed to generate forecast:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el pronóstico.' });
        } finally {
            setIsForecastLoading(false);
            setIsRecalculating(false);
        }
    }, [kpiData, siteId, toast]);

    // Fetch KPI data in real-time
    useEffect(() => {
        if(!siteId) return;
        setIsKpiLoading(true);
        const siteRef = doc(db, 'sites', siteId);
        const unsubscribe = onSnapshot(siteRef, (doc) => {
            if (doc.exists()) {
                const siteData = { id: doc.id, ...doc.data() } as Site;
                setKpiData(siteData);
                kpiForm.reset({ revenue: siteData.revenue, monthlyGoal: siteData.monthlyGoal });
            }
            setIsKpiLoading(false);
        });
        return () => unsubscribe();
    }, [siteId, kpiForm]);

    // Fetch daily data for charts
    useEffect(() => {
        if (!siteId || !kpiData) return;
        
        const fetchDailyData = async () => {
            const reportsRef = collection(db, 'sites', siteId, 'daily-reports');
            const q = query(reportsRef, orderBy('date', 'desc'), limit(14));
            const querySnapshot = await getDocs(q);
            const reports = querySnapshot.docs.map(doc => doc.data() as DailyReport).reverse();
            
            const monthProgress = calculateMonthProgress(new Date());
            const totalEffectiveDays = monthProgress.effectiveBusinessDaysPast + monthProgress.effectiveBusinessDaysRemaining;
            const dailyGoal = totalEffectiveDays > 0 ? kpiData.monthlyGoal / totalEffectiveDays : 0;

            const revenueChartData: DailyChartData[] = reports.map(r => ({
                date: format(new Date(r.date.replace(/-/g, '/')), 'MMM d', { locale: es }),
                revenue: r.newRevenue,
                goal: Math.floor(dailyGoal)
            }));

            setDailyData(revenueChartData);
        };
        fetchDailyData();
    }, [siteId, kpiData]);

    // Generate Forecast, checking cache first
    useEffect(() => {
        if (!kpiData) return;
        
        const cachedForecastsRaw = sessionStorage.getItem('vibra-forecasts');
        if (cachedForecastsRaw) {
            const allForecasts = JSON.parse(cachedForecastsRaw);
            if (allForecasts[siteId]) {
                setForecast(allForecasts[siteId]);
                setIsForecastLoading(false);
                return;
            }
        }
        
        fetchAndCacheForecast();

    }, [kpiData, siteId, fetchAndCacheForecast]);

    // Trigger daily NPS update check
    useEffect(() => {
        if (siteId) {
            updateNpsForSiteIfStale(siteId);
        }
    }, [siteId]);


    const handleKpiSubmit = async (values: z.infer<typeof kpiSchema>) => {
        if (!siteId || !kpiData) return;
        
        const siteRef = doc(db, "sites", siteId);
        try {
          await updateDoc(siteRef, {
            revenue: values.revenue,
            monthlyGoal: values.monthlyGoal,
          });
          toast({
            title: 'Éxito',
            description: `Los KPIs para ${kpiData.name} han sido actualizados.`,
          });
          setIsEditModalOpen(false);
        } catch (error) {
          console.error("Error updating KPIs:", error);
          toast({
            variant: "destructive",
            title: 'Error',
            description: `No se pudo actualizar los KPIs.`,
          });
        }
      };


    const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

    if (isKpiLoading || !kpiData) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <TooltipProvider>
        <div className="space-y-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ventas a la Fecha</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{formatCurrency(kpiData.revenue)}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Meta del Mes</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{formatCurrency(kpiData.monthlyGoal)}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pronóstico Ventas (Mes)</CardTitle>
                    <div className="flex items-center gap-1">
                        {forecast && (
                            <UITooltip><UITooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground cursor-pointer" /></UITooltipTrigger><UITooltipContent><p className="max-w-xs">{forecast.reasoning}</p></UITooltipContent></UITooltip>
                        )}
                         <Button variant="ghost" size="icon" onClick={() => fetchAndCacheForecast()} disabled={isRecalculating}>
                            {isRecalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            <span className="sr-only">Recalcular Pronóstico</span>
                        </Button>
                        {role === 'CEO' && (
                            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader><DialogTitle>Editar KPIs para {kpiData.name}</DialogTitle><DialogDescription>Ajusta las ventas a la fecha y la meta mensual para esta sede.</DialogDescription></DialogHeader>
                                    <Form {...kpiForm}>
                                    <form onSubmit={kpiForm.handleSubmit(handleKpiSubmit)} className="space-y-4 py-4">
                                        <FormField control={kpiForm.control} name="revenue" render={({ field }) => ( <FormItem><FormLabel>Ventas a la Fecha (COP)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                        <FormField control={kpiForm.control} name="monthlyGoal" render={({ field }) => ( <FormItem><FormLabel>Nueva Meta Mensual (COP)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                        <DialogFooter><Button type="submit">Guardar Cambios</Button></DialogFooter>
                                    </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isForecastLoading && !forecast ? (
                        <div className="flex items-center gap-2 pt-1"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /><span className="text-sm text-muted-foreground">Calculando...</span></div>
                    ) : (
                        <div className="text-2xl font-bold">{formatCurrency(forecast?.forecast || 0)}</div>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{formatCurrency(kpiData.averageTicket)}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tasa de Retención (Mes)</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{kpiData.retention.toFixed(1)}%</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">NPS (Mes Actual)</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{kpiData.nps.toFixed(1)}</div></CardContent>
            </Card>
            </div>
            <div className="grid grid-cols-1 gap-4">
            <Card>
                <CardHeader><CardTitle>Ventas Diarias vs. Meta (Últimos 14 Días)</CardTitle></CardHeader>
                <CardContent className="pl-2">
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <LineChart data={dailyData || []}>
                    <CartesianGrid vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} /><YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                    <Tooltip content={<ChartTooltipContent formatter={(value, name) => [formatCurrency(value as number), name === 'revenue' ? 'Ingresos' : 'Meta']} />} />
                    <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={true} /><Line type="monotone" dataKey="goal" stroke="var(--color-goal)" strokeDasharray="5 5" />
                    </LineChart>
                </ChartContainer>
                </CardContent>
            </Card>
            </div>
        </div>
        </TooltipProvider>
    );
}
