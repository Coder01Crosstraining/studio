"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Eye } from 'lucide-react';
import type { OneOnOneSession, EmployeeRole } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const sessionSchema = z.object({
  employeeName: z.string().min(2, "El nombre es muy corto."),
  employeeRole: z.enum(["Coach", "SalesAdvisor"], { required_error: "El rol es obligatorio." }),
  sessionDate: z.string().min(1, "La fecha es obligatoria."),
  energyCheckIn: z.coerce.number().min(1).max(10),
  mainWin: z.string().min(10, "El logro principal debe tener al menos 10 caracteres.").max(500),
  opportunityForImprovement: z.string().min(10, "La oportunidad de mejora debe tener al menos 10 caracteres.").max(500),
  actionPlan: z.string().min(10, "El plan de acción debe tener al menos 10 caracteres.").max(500),
});

const mockSessions: OneOnOneSession[] = [
  { id: '1', siteId: 'ciudadela', leaderId: 'leader-1', employeeName: 'Carlos Entrenador', employeeRole: 'Coach', sessionDate: '2023-10-15', energyCheckIn: 8, mainWin: 'Excelente energía en la clase', opportunityForImprovement: 'Empezar la clase a tiempo', actionPlan: 'Llegar 15 minutos antes', createdAt: new Date() },
  { id: '2', siteId: 'ciudadela', leaderId: 'leader-1', employeeName: 'Ana Asesora', employeeRole: 'SalesAdvisor', sessionDate: '2023-10-12', energyCheckIn: 9, mainWin: 'Cerró 3 planes anuales nuevos', opportunityForImprovement: 'Hacer seguimiento a prospectos fríos', actionPlan: 'Dedicar 1 hora diaria a seguimientos', createdAt: new Date() },
];

const employeeRoleText: Record<EmployeeRole, string> = {
  Coach: 'Entrenador',
  SalesAdvisor: 'Asesor de Ventas',
};

export default function OneOnOnePage() {
  const [sessions, setSessions] = useState<OneOnOneSession[]>(mockSessions);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<OneOnOneSession | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      sessionDate: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  async function onSubmit(values: z.infer<typeof sessionSchema>) {
    setIsLoading(true);
    await new Promise(res => setTimeout(res, 1000));
    const newSession = { ...values, id: Date.now().toString(), siteId: 'ciudadela', leaderId: 'leader-1', createdAt: new Date() };
    setSessions(prev => [newSession, ...prev]);
    toast({ title: 'Éxito', description: 'La nueva sesión 1-a-1 ha sido registrada.' });
    setIsLoading(false);
    setIsFormOpen(false);
    form.reset({ sessionDate: format(new Date(), 'yyyy-MM-dd') });
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Registro de Sesiones 1-a-1</h2>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Nueva Sesión</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Registrar Nueva Sesión 1-a-1</DialogTitle>
              <DialogDescription>Registra los detalles de tu sesión con un miembro del equipo.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="employeeName" render={({ field }) => (
                    <FormItem><FormLabel>Nombre del Empleado</FormLabel><FormControl><Input placeholder="ej. Juan Pérez" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="employeeRole" render={({ field }) => (
                    <FormItem><FormLabel>Rol</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un rol" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Coach">Entrenador</SelectItem>
                          <SelectItem value="SalesAdvisor">Asesor de Ventas</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="sessionDate" render={({ field }) => (
                    <FormItem><FormLabel>Fecha de la Sesión</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="energyCheckIn" render={({ field }) => (
                    <FormItem><FormLabel>Nivel de Energía (1-10)</FormLabel><FormControl><Input type="number" min="1" max="10" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                 <FormField control={form.control} name="mainWin" render={({ field }) => (
                  <FormItem><FormLabel>Logro Principal</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="opportunityForImprovement" render={({ field }) => (
                  <FormItem><FormLabel>Oportunidad de Mejora</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="actionPlan" render={({ field }) => (
                  <FormItem><FormLabel>Plan de Acción</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Sesión
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Sesiones</CardTitle>
          <CardDescription>Un registro de todas las sesiones 1-a-1 pasadas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>{format(new Date(session.sessionDate), 'PPP', { locale: es })}</TableCell>
                  <TableCell className="font-medium">{session.employeeName}</TableCell>
                  <TableCell>{employeeRoleText[session.employeeRole]}</TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedSession(session)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[625px]">
                        <DialogHeader>
                          <DialogTitle>Sesión con {selectedSession?.employeeName}</DialogTitle>
                          <DialogDescription>Detalles de la sesión del {selectedSession && format(new Date(selectedSession.sessionDate), 'PPP', { locale: es })}</DialogDescription>
                        </DialogHeader>
                        {selectedSession && <div className="space-y-4 py-4">
                          <p><strong>Nivel de Energía:</strong> {selectedSession.energyCheckIn}/10</p>
                          <p><strong>Logro Principal:</strong> {selectedSession.mainWin}</p>
                          <p><strong>Oportunidad de Mejora:</strong> {selectedSession.opportunityForImprovement}</p>
                          <p><strong>Plan de Acción:</strong> {selectedSession.actionPlan}</p>
                        </div>}
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
        </CardContent>
      </Card>
    </div>
  );
}
