"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Site, SiteId, DailyReport } from '@/lib/types';
import { generateSalesForecast, type GenerateSalesForecastOutput } from '@/ai/flows/generate-sales-forecast-flow';
import { Info, Loader2, Pencil } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent as UITooltipContent, TooltipTrigger as UITooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { subDays, format, getDay, getDate, getDaysInMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs, limit, orderBy } from 'firebase/firestore';

const chartConfig = {
  revenue: { label: 'Ingresos', color: 'hsl(var(--chart-1))' },
  goal: { label: 'Meta', color: 'hsl(var(--chart-2))' },
  new: { label: 'Nuevos Miembros', color: 'hsl(var(--chart-1))' },
  lost: { label: 'Miembros Perdidos', color: 'hsl(var(--destructive))' },
};

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
    } else {
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

const kpiSchema = z.object({
  revenue: z.coerce.number().min(0, "Las ventas deben ser un número positivo."),
  monthlyGoal: z.coerce.number().min(0, "La meta debe ser un número positivo."),
});

type DailyChartData = { date: string; revenue: number; goal: number };
type MembersChartData = { date: string; new: number; lost: number };

export default function DashboardPage() {
  const { user, role } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<SiteId | 'global'>(role === 'CEO' ? 'global' : user!.siteId!);
  const [kpiData, setKpiData] = useState<Record<SiteId, Site>>({} as Record<SiteId, Site>);
  const [dailyData, setDailyData] = useState<Record<SiteId, {revenue: DailyChartData[], members: MembersChartData[]}>>({} as Record<SiteId, any>);
  const [isKpiLoading, setIsKpiLoading] = useState(true);

  const [forecasts, setForecasts] = useState<Record<SiteId, GenerateSalesForecastOutput | null>>({});
  const [isForecastLoading, setIsForecastLoading] = useState(true);

  const { toast } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<SiteId | null>(null);

  const kpiForm = useForm<z.infer<typeof kpiSchema>>({
    resolver: zodResolver(kpiSchema),
  });

  // Fetch sites for CEO
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
  
  const siteMap = useMemo(() => new Map(sites.map(s => [s.id, s.name])), [sites]);

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

  // Fetch daily data for charts
  useEffect(() => {
    if (isKpiLoading || selectedSite === 'global') return;
    
    const fetchDailyData = async (siteId: SiteId) => {
      const reportsRef = collection(db, 'daily-reports');
      const q = query(reportsRef, where('siteId', '==', siteId), orderBy('date', 'desc'), limit(14));
      const querySnapshot = await getDocs(q);
      const reports = querySnapshot.docs.map(doc => doc.data() as DailyReport).reverse();

      const siteKpi = kpiData[siteId];
      if (!siteKpi) return;

      const revenueChartData: DailyChartData[] = reports.map(r => ({
        date: format(new Date(r.date), 'MMM d', { locale: es }),
        revenue: r.newRevenue,
        goal: Math.floor(siteKpi.monthlyGoal / 30) // Simplified daily goal
      }));

      const membersChartData: MembersChartData[] = reports.map(r => ({
        date: format(new Date(r.date), 'MMM d', { locale: es }),
        new: r.newMembers,
        lost: r.lostMembers
      }));

      setDailyData(prev => ({ ...prev, [siteId]: { revenue: revenueChartData, members: membersChartData } }));
    };

    if (selectedSite !== 'global') {
      fetchDailyData(selectedSite);
    }

  }, [selectedSite, isKpiLoading, kpiData]);

  // Generate Forecasts
  useEffect(() => {
    if (Object.keys(kpiData).length === 0) return;

    async function fetchForecasts() {
      setIsForecastLoading(true);
      try {
        const sitesToFetch = Object.keys(kpiData) as SiteId[];
        const monthProgress = calculateMonthProgress(new Date());

        const forecastPromises = sitesToFetch.map(async (siteId) => {
           const reportsRef = collection(db, 'daily-reports');
           const q = query(reportsRef, where('siteId', '==', siteId), orderBy('date', 'desc'), limit(7));
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
        setForecasts(newForecasts);

      } catch (error) {
        console.error("Failed to generate forecasts:", error);
      } finally {
        setIsForecastLoading(false);
      }
    }
    fetchForecasts();
  }, [kpiData]);


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

  const dashboardTitle = useMemo(() => {
    if (selectedSite === 'global') return "Panel Global";
    return `Panel de Sede: ${siteMap.get(selectedSite) || selectedSite}`;
  }, [selectedSite, siteMap]);
  
  const currentKpis = selectedSite !== 'global' ? kpiData[selectedSite] : null;
  const currentForecast = selectedSite !== 'global' ? forecasts[selectedSite] : null;

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

  const chartRevenueData = selectedSite !== 'global' ? dailyData[selectedSite]?.revenue || [] : [];
  const chartMembersData = selectedSite !== 'global' ? dailyData[selectedSite]?.members || [] : [];

  const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

  if (isKpiLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  return (
    <TooltipProvider>
    <div className="w-full max-w-screen-2xl mx-auto space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">{dashboardTitle}</h2>
        {role === 'CEO' && (
          <Select onValueChange={(value: SiteId | 'global') => setSelectedSite(value)} defaultValue="global">
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Selecciona una sede" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Resumen Global</SelectItem>
              {sites.map(site => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ventas a la Fecha</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(selectedSite === 'global' ? globalSummary.revenue : currentKpis?.revenue || 0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Meta del Mes</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(selectedSite === 'global' ? globalSummary.monthlyGoal : currentKpis?.monthlyGoal || 0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pronóstico Ventas (Mes)</CardTitle>
             {selectedSite !== 'global' && currentForecast && (
                <UITooltip><UITooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground cursor-pointer" /></UITooltipTrigger><UITooltipContent><p className="max-w-xs">{currentForecast.reasoning}</p></UITooltipContent></UITooltip>
            )}
          </CardHeader>
          <CardContent>
             {isForecastLoading ? (
                <div className="flex items-center gap-2 pt-1"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /><span className="text-sm text-muted-foreground">Calculando...</span></div>
            ) : (
                <div className="text-2xl font-bold">{formatCurrency(selectedSite === 'global' ? globalSummary.salesForecast : currentForecast?.forecast || 0)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(selectedSite === 'global' ? globalSummary.averageTicket : currentKpis?.averageTicket || 0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tasa de Retención (Mes)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{(selectedSite === 'global' ? globalSummary.retention : currentKpis?.retention || 0).toFixed(1)}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">NPS (Promedio)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{(selectedSite === 'global' ? globalSummary.nps : currentKpis?.nps || 0).toFixed(1)}</div></CardContent>
        </Card>
      </div>

      {selectedSite !== 'global' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-full lg:col-span-4">
            <CardHeader><CardTitle>Ventas Diarias vs. Meta (Últimos 14 Días)</CardTitle></CardHeader>
            <CardContent className="pl-2">
               <ChartContainer config={chartConfig} className="h-[350px] w-full">
                 <LineChart data={chartRevenueData}>
                   <CartesianGrid vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} /><YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                   <Tooltip content={<ChartTooltipContent formatter={(value, name) => [formatCurrency(value as number), name === 'revenue' ? 'Ingresos' : 'Meta']} />} />
                   <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={true} /><Line type="monotone" dataKey="goal" stroke="var(--color-goal)" strokeDasharray="5 5" />
                 </LineChart>
               </ChartContainer>
            </CardContent>
          </Card>
          <Card className="col-span-full lg:col-span-3">
            <CardHeader><CardTitle>Nuevos Miembros vs. Miembros Perdidos (Últimos 14 Días)</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[350px] w-full">
                <BarChart data={chartMembersData}>
                  <CartesianGrid vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} /><YAxis />
                  <Tooltip content={<ChartTooltipContent />} /><Bar dataKey="new" fill="var(--color-new)" radius={4} /><Bar dataKey="lost" fill="var(--color-lost)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
         <Card>
            <CardHeader>
                <CardTitle>Comparación de KPIs entre Sedes</CardTitle>
                <CardDescription>Un resumen de los indicadores clave de todas las sedes.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                    <TableHead>Sede</TableHead><TableHead className="text-right">Ventas a la Fecha</TableHead><TableHead className="text-right">Meta del Mes</TableHead><TableHead className="text-right">Pronóstico Ventas</TableHead>
                    <TableHead className="text-right">Ticket Promedio</TableHead><TableHead className="text-right">Retención</TableHead><TableHead className="text-right">NPS</TableHead><TableHead className="text-right">Acciones</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {Object.entries(kpiData).map(([siteId, data]) => (
                    <TableRow key={siteId}>
                      <TableCell className="font-medium">{siteMap.get(siteId as SiteId) || siteId}</TableCell><TableCell className="text-right">{formatCurrency(data.revenue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.monthlyGoal)}</TableCell>
                      <TableCell className="text-right">
                        {isForecastLoading && !forecasts[siteId as SiteId] ? ( <div className="flex justify-end"><Loader2 className="h-4 w-4 animate-spin" /></div> ) : (
                           <div className="flex items-center justify-end gap-1">
                            {formatCurrency(forecasts[siteId as SiteId]?.forecast || 0)}
                            <UITooltip><UITooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground cursor-pointer" /></UITooltipTrigger>
                              <UITooltipContent align="end"><p className="max-w-xs">{forecasts[siteId as SiteId]?.reasoning}</p></UITooltipContent>
                            </UITooltip>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(data.averageTicket)}</TableCell><TableCell className="text-right">{data.retention.toFixed(1)}%</TableCell><TableCell className="text-right">{data.nps.toFixed(1)}</TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(siteId as SiteId)}><Pencil className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
         </Card>
      )}
    </div>
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
    </TooltipProvider>
  );
}
