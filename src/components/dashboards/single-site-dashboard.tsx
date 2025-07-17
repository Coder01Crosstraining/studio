"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Line, LineChart, Tooltip as RechartsTooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { Site, SiteId, DailyReport, UserRole, TaskTemplate, TaskInstance } from '@/lib/types';
import { generateSalesForecast, type GenerateSalesForecastOutput } from '@/ai/flows/generate-sales-forecast-flow';
import { Info, Loader2, Pencil, RefreshCw, ClipboardCheck, AlertCircle, CheckCircle2, Calculator, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { format, getDay, getDate, getDaysInMonth, startOfDay, startOfMonth, startOfWeek, endOfDay, endOfWeek, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, doc, getDocs, limit, orderBy, updateDoc, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TaskChecklistDialog } from '@/app/(main)/tasks/components/task-checklist-dialog';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { recalculateSiteRevenue } from '@/app/(main)/actions';

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

type DailyChartData = { date: string; revenue: number; goal: number };

export type PendingTasksSummary = {
    daily: TaskTemplate[];
    weekly: TaskTemplate[];
    monthly: TaskTemplate[];
    total: number;
};

function PendingTasksCard({ summary, onOpenTasks }: { summary: PendingTasksSummary | null, onOpenTasks: () => void }) {
    if (!summary) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tareas Pendientes</CardTitle>
                    <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center pt-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    const pendingTextParts = [];
    if (summary.daily.length > 0) pendingTextParts.push(`${summary.daily.length} diaria(s)`);
    if (summary.weekly.length > 0) pendingTextParts.push(`${summary.weekly.length} semanal(es)`);
    if (summary.monthly.length > 0) pendingTextParts.push(`${summary.monthly.length} mensual(es)`);
    
    const isCompleted = summary.total === 0;
    const isUrgent = summary.daily.length > 0 && summary.weekly.length > 0 && summary.monthly.length > 0;

    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tareas Pendientes</CardTitle>
                 {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                    <AlertCircle className={cn(
                        "h-4 w-4",
                        isUrgent ? "text-red-500" : "text-yellow-500"
                    )} />
                )}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
                <div>
                     <div className="text-2xl font-bold">{summary.total}</div>
                     {isCompleted ? (
                        <p className="text-xs text-green-500 font-medium">¡Todas las tareas al día!</p>
                     ) : (
                        <p className={cn(
                          "text-xs",
                          isUrgent ? "text-red-500 font-medium" : "text-muted-foreground"
                        )}>
                            {pendingTextParts.join(', ')} pendiente(s).
                        </p>
                     )}
                </div>
                 <Button onClick={onOpenTasks} className="mt-4 w-full">Ver Agenda</Button>
            </CardContent>
        </Card>
    );
}

export function SingleSiteDashboard({ siteId, role }: { siteId: SiteId, role: UserRole }) {
    const { user } = useAuth();
    const [kpiData, setKpiData] = useState<Site | null>(null);
    const [dailyData, setDailyData] = useState<DailyChartData[]| null>(null);
    const [isKpiLoading, setIsKpiLoading] = useState(true);
    const [forecast, setForecast] = useState<GenerateSalesForecastOutput | null>(null);
    const [isForecastLoading, setIsForecastLoading] = useState(true);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [isRecalculatingRevenue, setIsRecalculatingRevenue] = useState(false);
    const [pendingTasks, setPendingTasks] = useState<PendingTasksSummary | null>(null);
    const [isTasksLoading, setIsTasksLoading] = useState(true);
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

    const { toast } = useToast();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const kpiForm = useForm<z.infer<typeof kpiSchema>>({
        resolver: zodResolver(kpiSchema),
    });

    const fetchTasks = React.useCallback(async () => {
        if (role !== 'SiteLeader' || !siteId) {
            setIsTasksLoading(false);
            return;
        };
        setIsTasksLoading(true);

        try {
            const now = new Date();
            const templatesRef = collection(db, 'task-templates');
            const templatesQuery = query(templatesRef, where('isActive', '==', true));
            const templatesSnapshot = await getDocs(templatesQuery);
            const allTemplates = templatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskTemplate));

            const instancesRef = collection(db, 'sites', siteId, 'task-instances');
            const dailyQuery = query(instancesRef, where('completedAt', '>=', startOfDay(now)), where('completedAt', '<=', endOfDay(now)));
            const weeklyQuery = query(instancesRef, where('completedAt', '>=', startOfWeek(now, { weekStartsOn: 1 })), where('completedAt', '<=', endOfWeek(now, { weekStartsOn: 1 })));
            const monthlyQuery = query(instancesRef, where('completedAt', '>=', startOfMonth(now)), where('completedAt', '<=', endOfMonth(now)));
            
            const [dailySnapshot, weeklySnapshot, monthlySnapshot] = await Promise.all([getDocs(dailyQuery), getDocs(weeklyQuery), getDocs(monthlyQuery)]);

            const completedDailyIds = new Set(dailySnapshot.docs.map(doc => (doc.data() as TaskInstance).templateId));
            const completedWeeklyIds = new Set(weeklySnapshot.docs.map(doc => (doc.data() as TaskInstance).templateId));
            const completedMonthlyIds = new Set(monthlySnapshot.docs.map(doc => (doc.data() as TaskInstance).templateId));

            const summary: PendingTasksSummary = { daily: [], weekly: [], monthly: [], total: 0 };
            allTemplates.forEach(template => {
                if (template.frequency === 'daily' && !completedDailyIds.has(template.id)) summary.daily.push(template);
                else if (template.frequency === 'weekly' && !completedWeeklyIds.has(template.id)) summary.weekly.push(template);
                else if (template.frequency === 'monthly' && !completedMonthlyIds.has(template.id)) summary.monthly.push(template);
            });
            summary.total = summary.daily.length + summary.weekly.length + summary.monthly.length;
            setPendingTasks(summary);
        } catch (error) {
            console.error("Error fetching tasks summary:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las tareas pendientes.' });
        } finally {
            setIsTasksLoading(false);
        }
    }, [siteId, role, toast]);
    
    // Fetch pending tasks summary for Site Leader
    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);


    const fetchForecast = React.useCallback(async (forceRefresh = false) => {
        if (!kpiData) return;
        
        const cachedForecastRaw = sessionStorage.getItem(`vibra-forecast-${siteId}`);
        const cachedRevenue = sessionStorage.getItem(`vibra-forecast-revenue-${siteId}`);

        if (cachedForecastRaw && !forceRefresh && cachedRevenue === kpiData.revenue.toString()) {
            setForecast(JSON.parse(cachedForecastRaw));
            setIsForecastLoading(false);
            return;
        }

        setIsForecastLoading(true);
        if(forceRefresh) setIsRecalculating(true);
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
            
            sessionStorage.setItem(`vibra-forecast-${siteId}`, JSON.stringify(result));
            sessionStorage.setItem(`vibra-forecast-revenue-${siteId}`, kpiData.revenue.toString());
            setForecast(result);
        } catch (error) {
            console.error("Failed to generate forecast:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el pronóstico.' });
        } finally {
            setIsForecastLoading(false);
            if(forceRefresh) setIsRecalculating(false);
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
        if (kpiData) {
            fetchForecast(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kpiData]); // We only want to run this when kpiData itself changes.

    const handleKpiSubmit = async (values: z.infer<typeof kpiSchema>) => {
        if (!siteId || !kpiData) return;
        setIsSubmitting(true);
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
        } finally {
          setIsSubmitting(false);
        }
      };

    const handleRecalculateRevenue = async () => {
        if (!siteId) return;
        setIsRecalculatingRevenue(true);
        const result = await recalculateSiteRevenue(siteId);
        if (result.success) {
            toast({
                title: "Ventas Recalculadas",
                description: `El nuevo total es ${formatCurrency(result.total || 0)}. El panel se ha actualizado.`,
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Error al Recalcular',
                description: result.error,
            });
        }
        setIsRecalculatingRevenue(false);
    }

    const compliance = useMemo(() => {
        if (!kpiData) return { expected: 0, difference: 0, status: 'on_track' as const };

        const monthProgress = calculateMonthProgress(new Date());
        const totalEffectiveDays = monthProgress.effectiveBusinessDaysPast + monthProgress.effectiveBusinessDaysRemaining;
        
        if (kpiData.monthlyGoal === 0 || totalEffectiveDays === 0) {
            return { expected: 0, difference: kpiData.revenue, status: 'on_track' as const };
        }

        const dailyGoal = kpiData.monthlyGoal / totalEffectiveDays;
        const expected = dailyGoal * monthProgress.effectiveBusinessDaysPast;
        const difference = kpiData.revenue - expected;
        
        let status: 'above' | 'below' | 'on_track';
        if (difference > 0) status = 'above';
        else if (difference < 0) status = 'below';
        else status = 'on_track';
        
        return { expected, difference, status };

    }, [kpiData]);

    const forecastStatus = useMemo(() => {
        if (!forecast || !kpiData || kpiData.monthlyGoal === 0) return 'on_track';
        if (forecast.forecast > kpiData.monthlyGoal) return 'above';
        if (forecast.forecast < kpiData.monthlyGoal) return 'below';
        return 'on_track';
    }, [forecast, kpiData]);


    const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

    if (isKpiLoading || !kpiData) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <TooltipProvider>
            <div className="space-y-4">
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                           <CardTitle className="text-sm font-medium">Ventas a la Fecha</CardTitle>
                           {role === 'CEO' && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                     <Button variant="ghost" size="icon" onClick={handleRecalculateRevenue} disabled={isRecalculatingRevenue}>
                                        {isRecalculatingRevenue ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Recalcular total desde reportes</p></TooltipContent>
                            </Tooltip>
                           )}
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{formatCurrency(kpiData.revenue)}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Meta del Mes</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold">{formatCurrency(kpiData.monthlyGoal)}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                           <CardTitle className="text-sm font-medium">Desvío vs. Proyectado</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <div className={cn("text-2xl font-bold flex items-center gap-2", { 'text-green-600': compliance.status === 'above', 'text-red-600': compliance.status === 'below' })}>
                                {compliance.status === 'above' && <TrendingUp />}
                                {compliance.status === 'below' && <TrendingDown />}
                                {compliance.status === 'on_track' && <Minus />}
                                {formatCurrency(compliance.difference)}
                           </div>
                           <p className="text-xs text-muted-foreground">Proyectado: {formatCurrency(compliance.expected)} / Real: {formatCurrency(kpiData.revenue)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pronóstico Ventas (Mes)</CardTitle>
                            <div className="flex items-center gap-1">
                                {forecast && (
                                    <Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground cursor-pointer" /></TooltipTrigger><TooltipContent><p className="max-w-xs">{forecast.reasoning}</p></TooltipContent></Tooltip>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => fetchForecast(true)} disabled={isRecalculating}>
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
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isForecastLoading ? (
                                <div className="flex items-center gap-2 pt-1"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /><span className="text-sm text-muted-foreground">Calculando...</span></div>
                            ) : (
                                <div className={cn("text-2xl font-bold flex items-center gap-2", {
                                    'text-green-600': forecastStatus === 'above',
                                    'text-red-600': forecastStatus === 'below',
                                })}>
                                    {forecastStatus === 'above' && <TrendingUp />}
                                    {forecastStatus === 'below' && <TrendingDown />}
                                    {formatCurrency(forecast?.forecast || 0)}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">NPS (Mes Actual)</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold">{kpiData.nps.toFixed(2)}</div></CardContent>
                    </Card>
                    {role === 'SiteLeader' ? <PendingTasksCard summary={isTasksLoading ? null : pendingTasks} onOpenTasks={() => setIsTaskDialogOpen(true)} /> : <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tasa de Retención (Mes)</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold">{kpiData.retention.toFixed(1)}%</div></CardContent>
                    </Card>}
                </div>
                <div className="grid grid-cols-1 gap-4">
                <Card>
                    <CardHeader><CardTitle>Ventas Diarias vs. Meta (Últimos 14 Días)</CardTitle></CardHeader>
                    <CardContent className="pl-2">
                    <ChartContainer config={chartConfig} className="h-[350px] w-full">
                        <LineChart data={dailyData || []}>
                        <CartesianGrid vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} /><YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                        <RechartsTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} />
                        <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={true} /><Line type="monotone" dataKey="goal" stroke="var(--color-goal)" strokeDasharray="5 5" />
                        </LineChart>
                    </ChartContainer>
                    </CardContent>
                </Card>
                </div>
            </div>
            {user && pendingTasks && <TaskChecklistDialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen} tasks={pendingTasks} siteId={user.siteId!} userId={user.uid} onTaskCompleted={fetchTasks} />}
        </TooltipProvider>
    );
}
