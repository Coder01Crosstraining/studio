"use client";

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Loader2 } from 'lucide-react';
import type { DailyReport, Site, SiteId } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, QuerySnapshot, DocumentData } from 'firebase/firestore';

export default function ReportHistoryPage() {
  const { role, user } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<SiteId | 'global'>(role === 'CEO' ? 'global' : user!.siteId!);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);

  useEffect(() => {
    async function fetchInitialData() {
        if (!user) return;
        setIsLoading(true);

        try {
            const reportPromises: Promise<QuerySnapshot<DocumentData>>[] = [];
            
            if (role === 'CEO') {
                const sitesSnapshot = await getDocs(collection(db, 'sites'));
                const sitesData = sitesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Site));
                setSites(sitesData);
                
                sitesData.forEach(site => {
                    const reportsRef = collection(db, 'sites', site.id, 'daily-reports');
                    reportPromises.push(getDocs(query(reportsRef, orderBy('date', 'desc'))));
                });
            } else { 
                if (user.siteId) {
                    const reportsRef = collection(db, 'sites', user.siteId, 'daily-reports');
                    reportPromises.push(getDocs(query(reportsRef, orderBy('date', 'desc'))));
                }
            }

            const reportSnapshots = await Promise.all(reportPromises);
            const allReports: DailyReport[] = [];
            reportSnapshots.forEach(snapshot => {
                snapshot.forEach(doc => {
                    allReports.push({ id: doc.id, ...doc.data() } as DailyReport);
                });
            });

            allReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setReports(allReports);

        } catch (error) {
            console.error("Error fetching reports", error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchInitialData();
  }, [user, role]);
  
  const siteMap = React.useMemo(() => new Map(sites.map(s => [s.id, s.name])), [sites]);

  const filteredReports = React.useMemo(() => {
    if (role === 'CEO') {
        if (selectedSite === 'global') return reports;
        return reports.filter(r => r.siteId === selectedSite);
    }
    return reports;
  }, [reports, role, selectedSite]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);


  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Historial de Reportes Diarios</h2>
          <p className="text-muted-foreground">Consulta los reportes de rendimiento enviados.</p>
        </div>
         {role === 'CEO' && (
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground hidden md:block">
                {capitalize(format(new Date(), "eeee, d 'de' MMMM", { locale: es }))}
            </p>
            <Select onValueChange={(value: SiteId | 'global') => setSelectedSite(value)} defaultValue={selectedSite}>
              <SelectTrigger className="w-full sm:w-[280px]"><SelectValue placeholder="Selecciona una sede" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Todas las Sedes</SelectItem>
                {sites.map(site => (
                  <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Todos los Reportes</CardTitle>
            <CardDescription>
                Un registro completo de todos los informes diarios enviados.
            </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
          <>
            {/* Mobile View */}
            <div className="space-y-4 md:hidden">
              {filteredReports.length === 0 && <p className="text-center text-muted-foreground pt-8">No hay reportes para mostrar.</p>}
              {filteredReports.map((report) => (
                <Card key={report.id}>
                  <CardHeader className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{format(new Date(report.date), 'PPP', { locale: es })}</CardTitle>
                        <CardDescription>
                          {role === 'CEO' ? `${siteMap.get(report.siteId) || report.siteId} - ` : ''}
                          {report.leaderName}
                        </CardDescription>
                      </div>
                      <Dialog onOpenChange={(open) => !open && setSelectedReport(null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedReport(report)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[625px]">
                          <DialogHeader>
                            <DialogTitle>Reporte de {siteMap.get(report.siteId)} - {format(new Date(report.date), 'PPP', { locale: es })}</DialogTitle>
                            <DialogDescription>Enviado por {report.leaderName}</DialogDescription>
                          </DialogHeader>
                          {selectedReport && (
                          <div className="space-y-4 py-4 text-sm">
                              <div className="grid grid-cols-2 gap-4">
                                  <div><p className="font-semibold">Ventas del Día</p><p className="text-muted-foreground">{formatCurrency(selectedReport.newRevenue)}</p></div>
                                  <div><p className="font-semibold">Tasa de Renovación</p><p className="text-muted-foreground">{selectedReport.renewalRate}%</p></div>
                                  <div><p className="font-semibold">NPS Promedio</p><p className="text-muted-foreground">{selectedReport.avgNPS}/10</p></div>
                              </div>
                            <div><p className="font-semibold">Logro del Día</p><p className="text-muted-foreground p-2 bg-muted rounded-md">{selectedReport.dailyWin}</p></div>
                            <div><p className="font-semibold">Desafío del Día</p><p className="text-muted-foreground p-2 bg-muted rounded-md">{selectedReport.dailyChallenge}</p></div>
                            <div><p className="font-semibold">Lección Aprendida</p><p className="text-muted-foreground p-2 bg-muted rounded-md">{selectedReport.lessonLearned}</p></div>
                          </div>
                          )}
                          <DialogFooter>
                              <DialogClose asChild><Button>Cerrar</Button></DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-sm">
                    <div>
                      <p className="text-muted-foreground">Ventas</p>
                      <p className="font-medium">{formatCurrency(report.newRevenue)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    {role === 'CEO' && <TableHead>Sede</TableHead>}
                    <TableHead>Líder</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.length === 0 && !isLoading && (
                      <TableRow><TableCell colSpan={role === 'CEO' ? 5 : 4} className="h-24 text-center">No hay reportes para mostrar.</TableCell></TableRow>
                  )}
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>{format(new Date(report.date), 'PPP', { locale: es })}</TableCell>
                      {role === 'CEO' && <TableCell>{siteMap.get(report.siteId) || report.siteId}</TableCell>}
                      <TableCell className="font-medium">{report.leaderName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(report.newRevenue)}</TableCell>
                      <TableCell className="text-right">
                        <Dialog onOpenChange={(open) => !open && setSelectedReport(null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedReport(report)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[625px]">
                            <DialogHeader>
                              <DialogTitle>Reporte de {siteMap.get(report.siteId)} - {format(new Date(report.date), 'PPP', { locale: es })}</DialogTitle>
                              <DialogDescription>Enviado por {report.leaderName}</DialogDescription>
                            </DialogHeader>
                            {selectedReport && (
                            <div className="space-y-4 py-4 text-sm">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><p className="font-semibold">Ventas del Día</p><p className="text-muted-foreground">{formatCurrency(selectedReport.newRevenue)}</p></div>
                                    <div><p className="font-semibold">Tasa de Renovación</p><p className="text-muted-foreground">{selectedReport.renewalRate}%</p></div>
                                    <div><p className="font-semibold">NPS Promedio</p><p className="text-muted-foreground">{selectedReport.avgNPS}/10</p></div>
                                </div>
                              <div><p className="font-semibold">Logro del Día</p><p className="text-muted-foreground p-2 bg-muted rounded-md">{selectedReport.dailyWin}</p></div>
                              <div><p className="font-semibold">Desafío del Día</p><p className="text-muted-foreground p-2 bg-muted rounded-md">{selectedReport.dailyChallenge}</p></div>
                              <div><p className="font-semibold">Lección Aprendida</p><p className="text-muted-foreground p-2 bg-muted rounded-md">{selectedReport.lessonLearned}</p></div>
                            </div>
                            )}
                            <DialogFooter>
                                <DialogClose asChild><Button>Cerrar</Button></DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
