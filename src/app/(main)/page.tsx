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
  ciudadela: { revenue: 7500000, retention: 92, nps: 8.8 },
  floridablanca: { revenue: 9800000, retention: 88, nps: 8.2 },
  piedecuesta: { revenue: 6200000, retention: 95, nps: 9.1 },
};

const weeklyRevenueData = {
  ciudadela: Array.from({ length: 8 }, (_, i) => ({ week: `W${i + 1}`, revenue: Math.floor(Math.random() * (2000000 - 1000000 + 1) + 1000000), goal: 1875000 })),
  floridablanca: Array.from({ length: 8 }, (_, i) => ({ week: `W${i + 1}`, revenue: Math.floor(Math.random() * (2800000 - 1500000 + 1) + 1500000), goal: 2450000 })),
  piedecuesta: Array.from({ length: 8 }, (_, i) => ({ week: `W${i + 1}`, revenue: Math.floor(Math.random() * (1800000 - 800000 + 1) + 800000), goal: 1550000 })),
};

const retentionChurnData = {
  ciudadela: Array.from({ length: 4 }, (_, i) => ({ week: `W${i + 1}`, retention: 92 + (Math.random() * 4 - 2), churn: 8 - (Math.random() * 4 - 2) })),
  floridablanca: Array.from({ length: 4 }, (_, i) => ({ week: `W${i + 1}`, retention: 88 + (Math.random() * 4 - 2), churn: 12 - (Math.random() * 4 - 2) })),
  piedecuesta: Array.from({ length: 4 }, (_, i) => ({ week: `W${i + 1}`, retention: 95 + (Math.random() * 4 - 2), churn: 5 - (Math.random() * 4 - 2) })),
};


const siteNames: Record<SiteId, string> = {
  ciudadela: "VIBRA Ciudadela",
  floridablanca: "VIBRA Floridablanca",
  piedecuesta: "VIBRA Piedecuesta",
};

export default function DashboardPage() {
  const { user, role } = useAuth();
  const [selectedSite, setSelectedSite] = useState<SiteId | 'global'>(role === 'CEO' ? 'global' : user?.siteId!);

  const dashboardTitle = useMemo(() => {
    if (selectedSite === 'global') return "Global Dashboard";
    return `Site Dashboard: ${siteNames[selectedSite]}`;
  }, [selectedSite]);

  const currentKpis = selectedSite !== 'global' ? kpiData[selectedSite] : null;

  const globalSummary = useMemo(() => {
    const totalRevenue = Object.values(kpiData).reduce((sum, site) => sum + site.revenue, 0);
    const avgRetention = Object.values(kpiData).reduce((sum, site) => sum + site.retention, 0) / 3;
    const avgNps = Object.values(kpiData).reduce((sum, site) => sum + site.nps, 0) / 3;
    return { revenue: totalRevenue, retention: avgRetention, nps: avgNps };
  }, []);

  const chartRevenueData = selectedSite !== 'global' ? weeklyRevenueData[selectedSite] : [];
  const chartRetentionData = selectedSite !== 'global' ? retentionChurnData[selectedSite] : [];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">{dashboardTitle}</h2>
        {role === 'CEO' && (
          <Select onValueChange={(value: SiteId | 'global') => setSelectedSite(value)} defaultValue="global">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Global Summary</SelectItem>
              <SelectItem value="ciudadela">VIBRA Ciudadela</SelectItem>
              <SelectItem value="floridablanca">VIBRA Floridablanca</SelectItem>
              <SelectItem value="piedecuesta">VIBRA Piedecuesta</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Revenue (Current Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(selectedSite === 'global' ? globalSummary.revenue : currentKpis!.revenue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retention Rate (Current Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(selectedSite === 'global' ? globalSummary.retention : currentKpis!.retention).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NPS (Latest Report Avg.)</CardTitle>
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
              <CardTitle>Weekly Revenue vs. Weekly Goal</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
               <ChartContainer config={{}} className="h-[350px] w-full">
                 <LineChart data={chartRevenueData}>
                   <CartesianGrid vertical={false} />
                   <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
                   <YAxis tickFormatter={(value) => `$${value / 1000000}M`} />
                   <Tooltip content={<ChartTooltipContent />} />
                   <Line type="monotone" dataKey="revenue" stroke="var(--color-chart-1)" strokeWidth={2} dot={true} />
                   <Line type="monotone" dataKey="goal" stroke="var(--color-chart-2)" strokeDasharray="5 5" />
                 </LineChart>
               </ChartContainer>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Retention vs. Churn (%)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[350px] w-full">
                <BarChart data={chartRetentionData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis unit="%" />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="retention" fill="var(--color-chart-1)" radius={4} />
                  <Bar dataKey="churn" fill="var(--color-destructive)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
         <Card>
            <CardHeader>
              <CardTitle>Cross-Site KPI Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Site</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Retention</TableHead>
                    <TableHead className="text-right">NPS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(kpiData).map(([siteId, data]) => (
                    <TableRow key={siteId}>
                      <TableCell className="font-medium">{siteNames[siteId as SiteId]}</TableCell>
                      <TableCell className="text-right">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(data.revenue)}</TableCell>
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
