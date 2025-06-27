
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SiteId } from '@/lib/types';
import { generateSalesForecast, type GenerateSalesForecastOutput } from '@/ai/flows/generate-sales-forecast-flow';
import { Info, Loader2 } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent as UITooltipContent, TooltipTrigger as UITooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { subDays, format } from 'date-fns';
import { es } from 'date-fns/locale';

// Mock Data
const kpiData = {
  ciudadela: { revenue: 7500000, retention: 92, nps: 8.8, averageTicket: 155000, monthlyGoal: 25000000 },
  floridablanca: { revenue: 9800000, retention: 88, nps: 8.2, averageTicket: 162000, monthlyGoal: 30000000 },
  piedecuesta: { revenue: 6200000, retention: 95, nps: 9.1, averageTicket: 148000, monthlyGoal: 20000000 },
};

const generateDailyRevenueData = (baseRevenue: number, baseGoal: number) => {
    return Array.from({ length: 14 }, (_, i) => {
        const date = subDays(new Date(), 13 - i);
        return {
            date: format(date, 'MMM d', { locale: es }),
            revenue: Math.floor(baseRevenue + (Math.random() - 0.5) * baseRevenue * 0.4),
            goal: Math.floor(baseGoal),
        };
    });
};

const dailyRevenueData = {
  ciudadela: generateDailyRevenueData(350000, 833000),
  floridablanca: generateDailyRevenueData(480000, 1000000),
  piedecuesta: generateDailyRevenueData(290000, 667000),
};


const generateDailyMembersData = (baseNew: number, baseLost: number) => {
    return Array.from({ length: 14 }, (_, i) => {
        const date = subDays(new Date(), 13 - i);
        return {
            date: format(date, 'MMM d', { locale: es }),
            new: Math.max(0, Math.floor(baseNew + (Math.random() - 0.4) * baseNew * 0.8)),
            lost: Math.max(0, Math.floor(baseLost + (Math.random() - 0.5) * baseLost * 0.9)),
        };
    });
};

const dailyMembersData = {
  ciudadela: generateDailyMembersData(3, 1),
  floridablanca: generateDailyMembersData(4, 2),
  piedecuesta: generateDailyMembersData(2, 1),
};

const siteNames: Record<SiteId, string> = {
  ciudadela: "VIBRA Ciudadela",
  floridablanca: "VIBRA Floridablanca",
  piedecuesta: "VIBRA Piedecuesta",
};

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
  
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const elapsedDaysInMonth = today.getDate();

  let effectiveBusinessDaysPast = 0;
  for (let day = 1; day <= elapsedDaysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    const dayOfWeek = currentDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
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
    const dayOfWeek = currentDate.getDay();
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
    effectiveBusinessDaysPast: Math.max(0.5, effectiveBusinessDaysPast),
    effectiveBusinessDaysRemaining
  };
}


export default function DashboardPage() {
  const { user, role } = useAuth();
  const [selectedSite, setSelectedSite] = useState<SiteId | 'global'>(role === 'CEO' ? 'global' : user?.siteId!);
  const [forecasts, setForecasts] = useState<Record<SiteId, GenerateSalesForecastOutput | null>>({
    ciudadela: null,
    floridablanca: null,
    piedecuesta: null,
  });
  const [isForecastLoading, setIsForecastLoading] = useState(true);

  useEffect(() => {
    async function fetchForecasts() {
      setIsForecastLoading(true);
      try {
        const sitesToFetch: SiteId[] = selectedSite === 'global'
          ? Object.keys(kpiData) as SiteId[]
          : [selectedSite];

        const monthProgress = calculateMonthProgress(new Date());

        const forecastPromises = sitesToFetch.map(siteId =>
          generateSalesForecast({
            historicalRevenue: dailyRevenueData[siteId].slice(-7).map(d => d.revenue),
            historicalNewMembers: dailyMembersData[siteId].slice(-7).map(d => d.new),
            currentMonthRevenue: kpiData[siteId].revenue,
            ...monthProgress,
          }).catch(err => {
            console.error(`Error fetching forecast for ${siteId}:`, err);
            return null;
          })
        );
        const results = await Promise.all(forecastPromises);
        
        setForecasts(prev => {
          const newForecasts = { ...prev };
          sitesToFetch.forEach((siteId, index) => {
            if (results[index]) {
              newForecasts[siteId] = results[index] as GenerateSalesForecastOutput;
            }
          });
          return newForecasts;
        });

      } catch (error) {
        console.error("Failed to generate forecasts:", error);
      } finally {
        setIsForecastLoading(false);
      }
    }
    fetchForecasts();
  }, [selectedSite]);

  const dashboardTitle = useMemo(() => {
    if (selectedSite === 'global') return "Panel Global";
    return `Panel de Sede: ${siteNames[selectedSite]}`;
  }, [selectedSite]);

  const currentKpis = selectedSite !== 'global' ? kpiData[selectedSite] : null;
  const currentForecast = selectedSite !== 'global' ? forecasts[selectedSite] : null;

  const globalSummary = useMemo(() => {
    const totalRevenue = Object.values(kpiData).reduce((sum, site) => sum + site.revenue, 0);
    const avgRetention = Object.values(kpiData).reduce((sum, site) => sum + site.retention, 0) / 3;
    const avgNps = Object.values(kpiData).reduce((sum, site) => sum + site.nps, 0) / 3;
    const avgTicket = Object.values(kpiData).reduce((sum, site) => sum + site.averageTicket, 0) / 3;
    const totalForecast = Object.values(forecasts).reduce((sum, site) => sum + (site?.forecast || 0), 0);
    const totalMonthlyGoal = Object.values(kpiData).reduce((sum, site) => sum + site.monthlyGoal, 0);
    return { revenue: totalRevenue, retention: avgRetention, nps: avgNps, averageTicket: avgTicket, salesForecast: totalForecast, monthlyGoal: totalMonthlyGoal };
  }, [forecasts]);

  const chartRevenueData = selectedSite !== 'global' ? dailyRevenueData[selectedSite] : [];
  const chartMembersData = selectedSite !== 'global' ? dailyMembersData[selectedSite] : [];

  const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

  const shouldShowGlobalLoader = isForecastLoading && selectedSite === 'global';
  const shouldShowSiteLoader = isForecastLoading && selectedSite !== 'global' && !forecasts[selectedSite];


  return (
    <TooltipProvider>
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">{dashboardTitle}</h2>
        {role === 'CEO' && (
          <Select onValueChange={(value: SiteId | 'global') => setSelectedSite(value)} defaultValue="global">
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecciona una sede" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Resumen Global</SelectItem>
              <SelectItem value="ciudadela">VIBRA Ciudadela</SelectItem>
              <SelectItem value="floridablanca">VIBRA Floridablanca</SelectItem>
              <SelectItem value="piedecuesta">VIBRA Piedecuesta</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas a la Fecha</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(selectedSite === 'global' ? globalSummary.revenue : currentKpis!.revenue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meta del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(selectedSite === 'global' ? globalSummary.monthlyGoal : (currentKpis ? currentKpis.monthlyGoal : 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pronóstico Ventas (Mes)</CardTitle>
             {selectedSite !== 'global' && currentForecast && (
                <UITooltip>
                  <UITooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                  </UITooltipTrigger>
                  <UITooltipContent><p className="max-w-xs">{currentForecast.reasoning}</p></UITooltipContent>
                </UITooltip>
            )}
          </CardHeader>
          <CardContent>
             {shouldShowSiteLoader || (shouldShowGlobalLoader && globalSummary.salesForecast === 0) ? (
                <div className="flex items-center gap-2 pt-1">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Calculando...</span>
                </div>
            ) : (
                <div className="text-2xl font-bold">
                    {formatCurrency(selectedSite === 'global' ? globalSummary.salesForecast : currentForecast?.forecast || 0)}
                </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(selectedSite === 'global' ? globalSummary.averageTicket : currentKpis!.averageTicket)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Retención (Mes)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(selectedSite === 'global' ? globalSummary.retention : currentKpis!.retention).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NPS (Promedio)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(selectedSite === 'global' ? globalSummary.nps : currentKpis!.nps).toFixed(1)}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedSite !== 'global' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Ventas Diarias vs. Meta (Últimos 14 Días)</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
               <ChartContainer config={chartConfig} className="h-[350px] w-full">
                 <LineChart data={chartRevenueData}>
                   <CartesianGrid vertical={false} />
                   <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                   <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                   <Tooltip content={<ChartTooltipContent formatter={(value, name) => {
                        return [formatCurrency(value as number), name === 'revenue' ? 'Ingresos' : 'Meta'];
                   }} />} />
                   <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={true} />
                   <Line type="monotone" dataKey="goal" stroke="var(--color-goal)" strokeDasharray="5 5" />
                 </LineChart>
               </ChartContainer>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Nuevos Miembros vs. Miembros Perdidos (Últimos 14 Días)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[350px] w-full">
                <BarChart data={chartMembersData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="new" fill="var(--color-new)" radius={4} />
                  <Bar dataKey="lost" fill="var(--color-lost)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
         <Card>
            <CardHeader>
              <CardTitle>Comparación de KPIs entre Sedes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sede</TableHead>
                    <TableHead className="text-right">Ventas a la Fecha</TableHead>
                    <TableHead className="text-right">Meta del Mes</TableHead>
                    <TableHead className="text-right">Pronóstico Ventas</TableHead>
                    <TableHead className="text-right">Ticket Promedio</TableHead>
                    <TableHead className="text-right">Retención</TableHead>
                    <TableHead className="text-right">NPS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(kpiData).map(([siteId, data]) => (
                    <TableRow key={siteId}>
                      <TableCell className="font-medium">{siteNames[siteId as SiteId]}</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.revenue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.monthlyGoal)}</TableCell>
                      <TableCell className="text-right">
                        {isForecastLoading && !forecasts[siteId as SiteId] ? (
                            <div className="flex justify-end"><Loader2 className="h-4 w-4 animate-spin" /></div>
                        ) : (
                           <div className="flex items-center justify-end gap-1">
                            {formatCurrency(forecasts[siteId as SiteId]?.forecast || 0)}
                            <UITooltip>
                              <UITooltipTrigger asChild>
                                 <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
                              </UITooltipTrigger>
                              <UITooltipContent align="end">
                                <p className="max-w-xs">{forecasts[siteId as SiteId]?.reasoning}</p>
                              </UITooltipContent>
                            </UITooltip>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(data.averageTicket)}</TableCell>
                      <TableCell className="text-right">{data.retention.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{data.nps.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
         </Card>
      )}
    </div>
    </TooltipProvider>
  );
}
