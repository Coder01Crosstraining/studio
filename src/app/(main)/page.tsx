
"use client";

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SiteId } from '@/lib/types';

// Mock Data
const kpiData = {
  ciudadela: { revenue: 7500000, retention: 92, nps: 8.8, averageTicket: 155000, salesForecast: 8500000 },
  floridablanca: { revenue: 9800000, retention: 88, nps: 8.2, averageTicket: 162000, salesForecast: 11000000 },
  piedecuesta: { revenue: 6200000, retention: 95, nps: 9.1, averageTicket: 148000, salesForecast: 7000000 },
};

const weeklyRevenueData = {
  ciudadela: Array.from({ length: 8 }, (_, i) => ({ week: `S${i + 1}`, revenue: Math.floor(Math.random() * (2000000 - 1000000 + 1) + 1000000), goal: 1875000 })),
  floridablanca: Array.from({ length: 8 }, (_, i) => ({ week: `S${i + 1}`, revenue: Math.floor(Math.random() * (2800000 - 1500000 + 1) + 1500000), goal: 2450000 })),
  piedecuesta: Array.from({ length: 8 }, (_, i) => ({ week: `S${i + 1}`, revenue: Math.floor(Math.random() * (1800000 - 800000 + 1) + 800000), goal: 1550000 })),
};

const retentionChurnData = {
  ciudadela: Array.from({ length: 4 }, (_, i) => ({ week: `S${i + 1}`, retention: 92 + (Math.random() * 4 - 2), churn: 8 - (Math.random() * 4 - 2) })),
  floridablanca: Array.from({ length: 4 }, (_, i) => ({ week: `S${i + 1}`, retention: 88 + (Math.random() * 4 - 2), churn: 12 - (Math.random() * 4 - 2) })),
  piedecuesta: Array.from({ length: 4 }, (_, i) => ({ week: `S${i + 1}`, retention: 95 + (Math.random() * 4 - 2), churn: 5 - (Math.random() * 4 - 2) })),
};


const siteNames: Record<SiteId, string> = {
  ciudadela: "VIBRA Ciudadela",
  floridablanca: "VIBRA Floridablanca",
  piedecuesta: "VIBRA Piedecuesta",
};

const chartConfig = {
  revenue: { label: 'Ingresos', color: 'hsl(var(--chart-1))' },
  goal: { label: 'Meta', color: 'hsl(var(--chart-2))' },
  retention: { label: 'Retención', color: 'hsl(var(--chart-1))' },
  churn: { label: 'Abandono', color: 'hsl(var(--destructive))' },
};


export default function DashboardPage() {
  const { user, role } = useAuth();
  const [selectedSite, setSelectedSite] = useState<SiteId | 'global'>(role === 'CEO' ? 'global' : user?.siteId!);

  const dashboardTitle = useMemo(() => {
    if (selectedSite === 'global') return "Panel Global";
    return `Panel de Sede: ${siteNames[selectedSite]}`;
  }, [selectedSite]);

  const currentKpis = selectedSite !== 'global' ? kpiData[selectedSite] : null;

  const globalSummary = useMemo(() => {
    const totalRevenue = Object.values(kpiData).reduce((sum, site) => sum + site.revenue, 0);
    const avgRetention = Object.values(kpiData).reduce((sum, site) => sum + site.retention, 0) / 3;
    const avgNps = Object.values(kpiData).reduce((sum, site) => sum + site.nps, 0) / 3;
    const avgTicket = Object.values(kpiData).reduce((sum, site) => sum + site.averageTicket, 0) / 3;
    const totalForecast = Object.values(kpiData).reduce((sum, site) => sum + site.salesForecast, 0);
    return { revenue: totalRevenue, retention: avgRetention, nps: avgNps, averageTicket: avgTicket, salesForecast: totalForecast };
  }, []);

  const chartRevenueData = selectedSite !== 'global' ? weeklyRevenueData[selectedSite] : [];
  const chartRetentionData = selectedSite !== 'global' ? retentionChurnData[selectedSite] : [];

  const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

  return (
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

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Nuevos (Mes)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(selectedSite === 'global' ? globalSummary.revenue : currentKpis!.revenue)}
            </div>
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
            <CardTitle className="text-sm font-medium">Pronóstico Ventas (Mes)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(selectedSite === 'global' ? globalSummary.salesForecast : currentKpis!.salesForecast)}
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
              <CardTitle>Ingresos Semanales vs. Meta Semanal</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
               <ChartContainer config={chartConfig} className="h-[350px] w-full">
                 <LineChart data={chartRevenueData}>
                   <CartesianGrid vertical={false} />
                   <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
                   <YAxis tickFormatter={(value) => `$${value / 1000000}M`} />
                   <Tooltip content={<ChartTooltipContent />} />
                   <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={true} />
                   <Line type="monotone" dataKey="goal" stroke="var(--color-goal)" strokeDasharray="5 5" />
                 </LineChart>
               </ChartContainer>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Retención vs. Abandono (%)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[350px] w-full">
                <BarChart data={chartRetentionData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis unit="%" />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="retention" fill="var(--color-retention)" radius={4} />
                  <Bar dataKey="churn" fill="var(--color-churn)" radius={4} />
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
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Ticket Promedio</TableHead>
                    <TableHead className="text-right">Pronóstico Ventas</TableHead>
                    <TableHead className="text-right">Retención</TableHead>
                    <TableHead className="text-right">NPS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(kpiData).map(([siteId, data]) => (
                    <TableRow key={siteId}>
                      <TableCell className="font-medium">{siteNames[siteId as SiteId]}</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.revenue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.averageTicket)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.salesForecast)}</TableCell>
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
  );
}

    