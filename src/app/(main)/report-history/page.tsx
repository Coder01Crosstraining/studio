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
import type { DailyReport, SiteId } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const siteNames: Record<SiteId, string> = {
  ciudadela: "VIBRA Ciudadela",
  floridablanca: "VIBRA Floridablanca",
  piedecuesta: "VIBRA Piedecuesta",
};

export default function ReportHistoryPage() {
  const { role, user } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<SiteId | 'global'>(role === 'CEO' ? 'global' : user!.siteId!);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      if (!user) return;
      setIsLoading(true);

      const reportsRef = collection(db, 'daily-reports');
      let q;

      if (role === 'CEO') {
        q = query(reportsRef, orderBy('date', 'desc'));
      } else {
        q = query(reportsRef, where('siteId', '==', user.siteId), orderBy('date', 'desc'));
      }
      
      const querySnapshot = await getDocs(q);
      const fetchedReports = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyReport));
      setReports(fetchedReports);
      setIsLoading(false);
    };

    fetchReports();
  }, [user, role]);

  const filteredReports = reports.filter(r => {
    if (role === 'CEO') {
        if (selectedSite === 'global') return true;
        return r.siteId === selectedSite;
    }
    return r.siteId === user?.siteId;
  });

  const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Historial de Reportes Diarios</h2>
          <p className="text-muted-foreground">Consulta los reportes de rendimiento enviados por los líderes de sede.</p>
        </div>
      </div>

      {role === 'CEO' && (
        <div className="pb-4">
          <Select onValueChange={(value: SiteId | 'global') => setSelectedSite(value)} defaultValue={selectedSite}>
            <SelectTrigger className="w-[280px]"><SelectValue placeholder="Selecciona una sede" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Todas las Sedes</SelectItem>
              <SelectItem value="ciudadela">VIBRA Ciudadela</SelectItem>
              <SelectItem value="floridablanca">VIBRA Floridablanca</SelectItem>
              <SelectItem value="piedecuesta">VIBRA Piedecuesta</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
             <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                {role === 'CEO' && <TableHead>Sede</TableHead>}
                <TableHead>Líder</TableHead>
                <TableHead className="text-right">Ventas</TableHead>
                <TableHead className="text-right">Nuevos Miembros</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>{format(new Date(report.date), 'PPP', { locale: es })}</TableCell>
                  {role === 'CEO' && <TableCell>{siteNames[report.siteId]}</TableCell>}
                  <TableCell className="font-medium">{report.leaderName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(report.newRevenue)}</TableCell>
                  <TableCell className="text-right">{report.newMembers}</TableCell>
                  <TableCell className="text-right">
                    <Dialog onOpenChange={(open) => !open && setSelectedReport(null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedReport(report)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[625px]">
                        <DialogHeader>
                          <DialogTitle>Reporte de {report.siteId} - {format(new Date(report.date), 'PPP', { locale: es })}</DialogTitle>
                          <DialogDescription>Enviado por {report.leaderName}</DialogDescription>
                        </DialogHeader>
                        {selectedReport && (
                        <div className="space-y-4 py-4 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div><p className="font-semibold">Ventas del Día</p><p className="text-muted-foreground">{formatCurrency(selectedReport.newRevenue)}</p></div>
                                <div><p className="font-semibold">Tasa de Renovación</p><p className="text-muted-foreground">{selectedReport.renewalRate}%</p></div>
                                <div><p className="font-semibold">Nuevos Miembros</p><p className="text-muted-foreground">{selectedReport.newMembers}</p></div>
                                <div><p className="font-semibold">Miembros Perdidos</p><p className="text-muted-foreground">{selectedReport.lostMembers}</p></div>
                                <div><p className="font-semibold">NPS Promedio</p><p className="text-muted-foreground">{selectedReport.avgNPS}/10</p></div>
                                <div><p className="font-semibold">Satisfacción Coach</p><p className="text-muted-foreground">{selectedReport.coachSatisfaction}/5</p></div>
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
                {filteredReports.length === 0 && !isLoading && (
                    <TableRow><TableCell colSpan={role === 'CEO' ? 6 : 5} className="h-24 text-center">No hay reportes para mostrar.</TableCell></TableRow>
                )}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
