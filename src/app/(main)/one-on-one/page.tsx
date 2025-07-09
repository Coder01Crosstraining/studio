"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Eye } from 'lucide-react';
import type { OneOnOneSession, EmployeeRole, SiteId, Site } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

const sessionSchema = z.object({
  employeeName: z.string().min(2, "El nombre es muy corto."),
  employeeRole: z.enum(["Coach", "SalesAdvisor"], { required_error: "El rol es obligatorio." }),
  sessionDate: z.string().min(1, "La fecha es obligatoria."),
  energyCheckIn: z.coerce.number().min(1).max(10),
  mainWin: z.string().min(10, "El logro principal debe tener al menos 10 caracteres.").max(500),
  opportunityForImprovement: z.string().min(10, "La oportunidad de mejora debe tener al menos 10 caracteres.").max(500),
  actionPlan: z.string().min(10, "El plan de acción debe tener al menos 10 caracteres.").max(500),
});

const employeeRoleText: Record<EmployeeRole, string> = {
  Coach: 'Entrenador',
  SalesAdvisor: 'Asesor de Ventas',
};

export default function OneOnOnePage() {
  const { role, user } = useAuth();
  const [sessions, setSessions] = useState<OneOnOneSession[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [selectedSite, setSelectedSite] = useState<SiteId | ''>(role === 'CEO' ? '' : user!.siteId!);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<OneOnOneSession | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      sessionDate: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  useEffect(() => {
    if (role === 'CEO') {
      const fetchSites = async () => {
        const sitesSnapshot = await getDocs(collection(db, 'sites'));
        setSites(sitesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Site)));
      };
      fetchSites();
    }
  }, [role]);

  useEffect(() => {
    async function fetchSessions() {
        if (!selectedSite) {
            setSessions([]);
            return;
        }
        setIsFetching(true);
        try {
            const sessionsRef = collection(db, 'sites', selectedSite, 'one-on-one-sessions');
            const q = query(sessionsRef, orderBy('sessionDate', 'desc'));
            const querySnapshot = await getDocs(q);
            
            const fetchedSessions = querySnapshot.docs.map(doc => {
              const data = doc.data();
              // Perform a basic check for critical data fields
              if (!data.employeeName || !data.sessionDate || !data.employeeRole) {
                console.warn("Documento de sesión con datos incompletos, omitiendo:", doc.id);
                return null;
              }
              return { id: doc.id, ...data } as OneOnOneSession;
            }).filter(Boolean) as OneOnOneSession[]; // filter(Boolean) removes any nulls

            setSessions(fetchedSessions);
        } catch (error) {
            console.error("Error fetching sessions:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las sesiones.' });
        } finally {
            setIsFetching(false);
        }
    }
    fetchSessions();
  }, [selectedSite, toast]);

  async function onSubmit(values: z.infer<typeof sessionSchema>) {
    if (!user || !user.siteId) return;
    setIsLoading(true);
    try {
      const newSessionData = {
        ...values,
        siteId: user.siteId,
        leaderId: user.uid,
        createdAt: serverTimestamp()
      };

      const sessionCollectionRef = collection(db, 'sites', user.siteId, 'one-on-one-sessions');
      const docRef = await addDoc(sessionCollectionRef, newSessionData);
      
      const newSession = { 
        ...newSessionData,
        id: docRef.id, 
        createdAt: Timestamp.now(), 
      } as OneOnOneSession;

      setSessions(prev => [newSession, ...prev].sort((a,b) => b.sessionDate.localeCompare(a.sessionDate)));

      toast({ title: 'Éxito', description: 'La nueva sesión 1-a-1 ha sido registrada.' });
      setIsFormOpen(false);
      form.reset({ sessionDate: format(new Date(), 'yyyy-MM-dd') });
    } catch (error) {
        console.error("Error adding session:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo registrar la sesión." });
    } finally {
        setIsLoading(false);
    }
  }

  const getSafeSessionDate = (session: OneOnOneSession): Date => {
    const dateValue = session.sessionDate;
    if (dateValue && typeof (dateValue as any).toDate === 'function') {
      return (dateValue as any).toDate();
    }
    if (typeof dateValue === 'string') {
      return new Date(dateValue.replace(/-/g, '/'));
    }
    return new Date();
  };

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sesiones 1-a-1</h2>
          {role === 'CEO' 
            ? <p className="text-muted-foreground">Revisa las sesiones de una sede específica.</p>
            : <p className="text-muted-foreground">Registra y consulta tus sesiones 1-a-1.</p>
          }
        </div>
        <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground hidden md:block">
                {capitalize(format(new Date(), "eeee, d 'de' MMMM", { locale: es }))}
            </p>
            {role === 'SiteLeader' && (
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" /> Nueva Sesión</Button></DialogTrigger>
                <DialogContent className="sm:max-w-[625px]">
                  <DialogHeader><DialogTitle>Registrar Nueva Sesión 1-a-1</DialogTitle><DialogDescription>Registra los detalles de tu sesión con un miembro del equipo.</DialogDescription></DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="employeeName" render={({ field }) => ( <FormItem><FormLabel>Nombre del Empleado</FormLabel><FormControl><Input placeholder="ej. Juan Pérez" {...field} /></FormControl><FormMessage /></FormItem> )} />
                         <FormField control={form.control} name="employeeRole" render={({ field }) => (
                          <FormItem><FormLabel>Rol</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un rol" /></SelectTrigger></FormControl>
                              <SelectContent><SelectItem value="Coach">Entrenador</SelectItem><SelectItem value="SalesAdvisor">Asesor de Ventas</SelectItem></SelectContent>
                            </Select><FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="sessionDate" render={({ field }) => ( <FormItem><FormLabel>Fecha de la Sesión</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="energyCheckIn" render={({ field }) => ( <FormItem><FormLabel>Nivel de Energía (1-10)</FormLabel><FormControl><Input type="number" min="1" max="10" {...field} /></FormControl><FormMessage /></FormItem> )} />
                      </div>
                       <FormField control={form.control} name="mainWin" render={({ field }) => ( <FormItem><FormLabel>Logro Principal</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="opportunityForImprovement" render={({ field }) => ( <FormItem><FormLabel>Oportunidad de Mejora</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="actionPlan" render={({ field }) => ( <FormItem><FormLabel>Plan de Acción</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                      <DialogFooter><Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar Sesión</Button></DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
        </div>
      </div>

      {role === 'CEO' && (
        <div className="pb-4">
          <Select onValueChange={(value: SiteId) => setSelectedSite(value)} value={selectedSite}>
            <SelectTrigger className="w-full sm:w-[280px]"><SelectValue placeholder="Selecciona una sede para ver" /></SelectTrigger>
            <SelectContent>
              {sites.map(site => (
                  <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Historial de Sesiones</CardTitle><CardDescription>Un registro de todas las sesiones 1-a-1 pasadas.</CardDescription></CardHeader>
        <CardContent>
        {isFetching ? (
          <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <>
            {role === 'CEO' && !selectedSite && <div className="text-center text-muted-foreground p-8">Por favor, selecciona una sede para ver las sesiones.</div>}
            {((role === 'CEO' && selectedSite) || role === 'SiteLeader') && (
            <>
              {/* Mobile View */}
              <div className="space-y-4 md:hidden">
                {sessions.length === 0 && <p className="text-center text-muted-foreground pt-8">No hay sesiones registradas para esta sede.</p>}
                {sessions.map((session) => (
                  <Card key={session.id}>
                    <CardHeader className="p-4 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base">{session.employeeName}</CardTitle>
                            <CardDescription>{employeeRoleText[session.employeeRole]} - {format(getSafeSessionDate(session), 'PPP', { locale: es })}</CardDescription>
                        </div>
                        <Dialog onOpenChange={(open) => !open && setSelectedSession(null)}>
                          <DialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setSelectedSession(session)}><Eye className="h-4 w-4" /></Button></DialogTrigger>
                          <DialogContent className="sm:max-w-[625px]">
                            <DialogHeader>
                              <DialogTitle>Sesión con {selectedSession?.employeeName}</DialogTitle>
                              <DialogDescription>Detalles de la sesión del {selectedSession && format(getSafeSessionDate(selectedSession), 'PPP', { locale: es })}</DialogDescription>
                            </DialogHeader>
                            {selectedSession && <div className="space-y-4 py-4 text-sm">
                              <div><p className="font-semibold">Nivel de Energía</p><p className="text-muted-foreground">{selectedSession.energyCheckIn}/10</p></div>
                              <div><p className="font-semibold">Logro Principal</p><p className="text-muted-foreground">{selectedSession.mainWin}</p></div>
                              <div><p className="font-semibold">Oportunidad de Mejora</p><p className="text-muted-foreground">{selectedSession.opportunityForImprovement}</p></div>
                              <div><p className="font-semibold">Plan de Acción</p><p className="text-muted-foreground">{selectedSession.actionPlan}</p></div>
                            </div>}
                            <DialogFooter><DialogClose asChild><Button>Cerrar</Button></DialogClose></DialogFooter>
                          </DialogContent>
                        </Dialog>
                    </CardHeader>
                  </Card>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Empleado</TableHead><TableHead>Rol</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {sessions.length === 0 && <TableRow><TableCell colSpan={4} className="h-24 text-center">No hay sesiones registradas para esta sede.</TableCell></TableRow>}
                    {sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>{format(getSafeSessionDate(session), 'PPP', { locale: es })}</TableCell>
                        <TableCell className="font-medium">{session.employeeName}</TableCell>
                        <TableCell>{employeeRoleText[session.employeeRole]}</TableCell>
                        <TableCell className="text-right">
                          <Dialog onOpenChange={(open) => !open && setSelectedSession(null)}>
                            <DialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setSelectedSession(session)}><Eye className="h-4 w-4" /></Button></DialogTrigger>
                            <DialogContent className="sm:max-w-[625px]">
                              <DialogHeader>
                                <DialogTitle>Sesión con {selectedSession?.employeeName}</DialogTitle>
                                <DialogDescription>Detalles de la sesión del {selectedSession && format(getSafeSessionDate(selectedSession), 'PPP', { locale: es })}</DialogDescription>
                              </DialogHeader>
                              {selectedSession && <div className="space-y-4 py-4 text-sm">
                                <div><p className="font-semibold">Nivel de Energía</p><p className="text-muted-foreground">{selectedSession.energyCheckIn}/10</p></div>
                                <div><p className="font-semibold">Logro Principal</p><p className="text-muted-foreground">{selectedSession.mainWin}</p></div>
                                <div><p className="font-semibold">Oportunidad de Mejora</p><p className="text-muted-foreground">{selectedSession.opportunityForImprovement}</p></div>
                                <div><p className="font-semibold">Plan de Acción</p><p className="text-muted-foreground">{selectedSession.actionPlan}</p></div>
                              </div>}
                              <DialogFooter><DialogClose asChild><Button>Cerrar</Button></DialogClose></DialogFooter>
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
          </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
