
"use client";

import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye } from 'lucide-react';
import type { DailyReport, SiteId } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Mock Data for daily reports
const mockReports: DailyReport[] = [
  { id: 'rep1', siteId: 'ciudadela', leaderId: 'leader-ciudadela-456', leaderName: 'Maria Leader', date: '2024-07-22', newRevenue: 450000, newMembers: 4, lostMembers: 1, renewalRate: 95, avgNPS: 9.1, coachSatisfaction: 4.8, dailyWin: 'Se logró una venta corporativa con una empresa vecina.', dailyChallenge: 'El aire acondicionado de la zona de pesas falló por la tarde.', lessonLearned: 'Debemos revisar el mantenimiento preventivo de los equipos de climatización.', submittedAt: new Date('2024-07-22T18:00:00Z') },
  { id: 'rep2', siteId: 'floridablanca', leaderId: 'leader-floridablanca-123', leaderName: 'Juan Leader', date: '2024-07-22', newRevenue: 600000, newMembers: 6, lostMembers: 0, renewalRate: 98, avgNPS: 9.5, coachSatisfaction: 4.9, dailyWin: 'Se superó la meta diaria de ventas en un 20%.', dailyChallenge: 'Hubo una queja por falta de casilleros disponibles en hora pico.', lessonLearned: 'Analizar la posibilidad de instalar más casilleros o promover su uso eficiente.', submittedAt: new Date('2024-07-22T19:00:00Z') },
  { id: 'rep3', siteId: 'piedecuesta', leaderId: 'leader-piedecuesta-789', leaderName: 'Sofia Leader', date: '2024-07-22', newRevenue: 300000, newMembers: 3, lostMembers: 2, renewalRate: 90, avgNPS: 8.5, coachSatisfaction: 4.5, dailyWin: 'Un miembro antiguo renovó su plan anual gracias a un buen seguimiento.', dailyChallenge: 'Baja asistencia a la clase de yoga de la mañana.', lessonLearned: 'Promocionar más la clase de yoga en redes sociales y en el gimnasio.', submittedAt: new Date('2024-07-22T17:30:00Z') },
  { id: 'rep4', siteId: 'ciudadela', leaderId: 'leader-ciudadela-456', leaderName: 'Maria Leader', date: '2024-07-21', newRevenue: 400000, newMembers: 3, lostMembers: 0, renewalRate: 96, avgNPS: 9.0, coachSatisfaction: 4.7, dailyWin: 'Se recibió feedback muy positivo sobre la nueva clase de spinning.', dailyChallenge: 'Poca venta de productos de nutrición.', lessonLearned: 'Realizar degustaciones para impulsar la venta de suplementos.', submittedAt: new Date('2024-07-21T18:30:00Z') },
];

const siteNames: Record<SiteId, string> = {
  ciudadela: "VIBRA Ciudadela",
  floridablanca: "VIBRA Floridablanca",
  piedecuesta: "VIBRA Piedecuesta",
};

export default function ReportHistoryPage() {
  const { role, user } = useAuth();
  const [reports] = useState<DailyReport[]>(mockReports);
  const [selectedSite, setSelectedSite] = useState<SiteId | 'global'>(role === 'CEO' ? 'global' : user!.siteId!);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);

  const filteredReports = reports.filter(r => {
    if (role === 'CEO') {
        if (selectedSite === 'global') return true;
        return r.siteId === selectedSite;
    }
    return r.siteId === user?.siteId;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Selecciona una sede" />
            </SelectTrigger>
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
                          <DialogTitle>Reporte de {siteNames[report.siteId]} - {format(new Date(report.date), 'PPP', { locale: es })}</DialogTitle>
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
            </TableBody>
          </Table>
           {filteredReports.length === 0 && (
            <div className="text-center p-8 text-muted-foreground">
              No hay reportes para mostrar.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
