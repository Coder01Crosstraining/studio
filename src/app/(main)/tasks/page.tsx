"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { FullPageLoader } from '@/components/loader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Loader2, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, getDocs, where, Timestamp } from 'firebase/firestore';
import { createTaskTemplateAction } from '../management/task-actions';
import type { Site, TaskTemplate, TaskFrequency, TaskInstance } from '@/lib/types';
import { format, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

const taskTemplateSchema = z.object({
  title: z.string().min(5, "El título debe tener al menos 5 caracteres."),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres."),
  frequency: z.enum(['daily', 'weekly', 'monthly'], { required_error: "La frecuencia es obligatoria." }),
});

const frequencyText: Record<TaskFrequency, string> = {
  daily: 'Diaria',
  weekly: 'Semanal',
  monthly: 'Mensual',
};

function TaskTemplateManagement({ loading, taskTemplates, refetchTaskTemplates }: { loading: boolean, taskTemplates: TaskTemplate[], refetchTaskTemplates: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);

  const form = useForm<z.infer<typeof taskTemplateSchema>>({ 
    resolver: zodResolver(taskTemplateSchema),
    defaultValues: { title: "", description: "", frequency: "daily" }
  });

  const handleOpenDialog = (template: TaskTemplate | null = null) => {
    setEditingTemplate(template);
    form.reset(template ? { ...template } : { title: '', description: '', frequency: 'daily' });
    setIsDialogOpen(true);
  };

  const handleTemplateSubmit = async (values: z.infer<typeof taskTemplateSchema>) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      if (editingTemplate) {
        // Update logic in the future
      } else {
        const result = await createTaskTemplateAction({ ...values, creatorId: user.uid });
        if (result.success) {
          toast({ title: "Plantilla Creada", description: "La nueva plantilla de tarea ha sido creada." });
          refetchTaskTemplates();
          setIsDialogOpen(false);
        } else {
          throw new Error(result.error);
        }
      }
    } catch (error: any) {
      console.error("Error saving task template: ", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo guardar la plantilla." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Plantillas de Tareas</CardTitle>
          <CardDescription className="pt-1">Crea y gestiona las tareas recurrentes para las sedes.</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4" /> Nueva Plantilla</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla de Tarea'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleTemplateSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Título de la Tarea</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="frequency" render={({ field }) => (
                  <FormItem><FormLabel>Frecuencia</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Elige una frecuencia" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="daily">Diaria</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensual</SelectItem>
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingTemplate ? 'Guardar Cambios' : 'Crear Plantilla'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Frecuencia</TableHead>
                <TableHead>Fecha Creación</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskTemplates.length === 0 && (
                <TableRow><TableCell colSpan={4} className="h-24 text-center">No hay plantillas de tareas creadas.</TableCell></TableRow>
              )}
              {taskTemplates.map(template => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.title}</TableCell>
                  <TableCell><Badge variant="secondary">{frequencyText[template.frequency]}</Badge></TableCell>
                  <TableCell>{format(template.createdAt.toDate(), 'PPP', { locale: es })}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(template)} disabled><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" disabled><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}


interface SiteTaskStatus {
    siteId: string;
    siteName: string;
    pendingDaily: number;
    pendingWeekly: number;
    pendingMonthly: number;
    totalPending: number;
}

function TaskDashboard({ sites, allTemplates, loading }: { sites: Site[], allTemplates: TaskTemplate[], loading: boolean }) {
    const [siteStatus, setSiteStatus] = useState<SiteTaskStatus[]>([]);
    const [isCalculating, setIsCalculating] = useState(true);

    useEffect(() => {
        if (loading || sites.length === 0 || allTemplates.length === 0) {
            setIsCalculating(!loading);
            return;
        }

        const calculateStatus = async () => {
            setIsCalculating(true);
            const now = new Date();
            const dailyTemplates = allTemplates.filter(t => t.frequency === 'daily');
            const weeklyTemplates = allTemplates.filter(t => t.frequency === 'weekly');
            const monthlyTemplates = allTemplates.filter(t => t.frequency === 'monthly');

            const statusPromises = sites.map(async (site) => {
                const instancesRef = collection(db, 'sites', site.id, 'task-instances');
                const dailyQuery = query(instancesRef, where('completedAt', '>=', startOfDay(now)), where('templateId', 'in', dailyTemplates.map(t => t.id).length > 0 ? dailyTemplates.map(t => t.id) : ['dummy']));
                const weeklyQuery = query(instancesRef, where('completedAt', '>=', startOfWeek(now, { weekStartsOn: 1 })), where('templateId', 'in', weeklyTemplates.map(t => t.id).length > 0 ? weeklyTemplates.map(t => t.id) : ['dummy']));
                const monthlyQuery = query(instancesRef, where('completedAt', '>=', startOfMonth(now)), where('templateId', 'in', monthlyTemplates.map(t => t.id).length > 0 ? monthlyTemplates.map(t => t.id) : ['dummy']));

                const [dailySnapshot, weeklySnapshot, monthlySnapshot] = await Promise.all([getDocs(dailyQuery), getDocs(weeklyQuery), getDocs(monthlyQuery)]);

                const completedDaily = dailySnapshot.size;
                const completedWeekly = weeklySnapshot.size;
                const completedMonthly = monthlySnapshot.size;

                const pendingDaily = dailyTemplates.length - completedDaily;
                const pendingWeekly = weeklyTemplates.length - completedWeekly;
                const pendingMonthly = monthlyTemplates.length - completedMonthly;

                return {
                    siteId: site.id,
                    siteName: site.name,
                    pendingDaily,
                    pendingWeekly,
                    pendingMonthly,
                    totalPending: pendingDaily + pendingWeekly + pendingMonthly,
                }
            });

            const results = await Promise.all(statusPromises);
            setSiteStatus(results);
            setIsCalculating(false);
        };

        calculateStatus();
    }, [sites, allTemplates, loading]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Dashboard de Cumplimiento</CardTitle>
                <CardDescription>Supervisa las tareas pendientes en todas las sedes.</CardDescription>
            </CardHeader>
            <CardContent>
                {isCalculating ? <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Sede</TableHead>
                                <TableHead className="text-center">Diarias Pendientes</TableHead>
                                <TableHead className="text-center">Semanales Pendientes</TableHead>
                                <TableHead className="text-center">Mensuales Pendientes</TableHead>
                                <TableHead className="text-center">Estado General</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {siteStatus.length === 0 && (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay sedes para mostrar.</TableCell></TableRow>
                            )}
                            {siteStatus.map(status => (
                                <TableRow key={status.siteId}>
                                    <TableCell className="font-medium">{status.siteName}</TableCell>
                                    <TableCell className="text-center">{status.pendingDaily}</TableCell>
                                    <TableCell className="text-center">{status.pendingWeekly}</TableCell>
                                    <TableCell className="text-center">{status.pendingMonthly}</TableCell>
                                    <TableCell className="text-center">
                                        {status.totalPending === 0 ? (
                                            <Badge variant="secondary" className="border-green-400/30 bg-green-400/20 text-green-700">
                                                <CheckCircle2 className="mr-1 h-3 w-3"/> Al día
                                            </Badge>
                                        ) : (
                                            <Badge variant="destructive" className="bg-yellow-400/20 text-yellow-700 hover:bg-yellow-400/30 border border-yellow-400/30">
                                                <AlertCircle className="mr-1 h-3 w-3" /> {status.totalPending} Pendiente(s)
                                            </Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

export default function TasksPage() {
    const { user, role } = useAuth();
    const router = useRouter();

    const [sites, setSites] = useState<Site[]>([]);
    const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
    const [loadingSites, setLoadingSites] = useState(true);
    const [loadingTasks, setLoadingTasks] = useState(true);

    useEffect(() => {
        if (!role) return;

        if (role === 'SiteLeader') {
            router.replace('/');
            return;
        }

        if (role === 'CEO') {
            const unsubscribeSites = onSnapshot(query(collection(db, "sites")), (snapshot) => {
                const sitesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Site));
                setSites(sitesData);
                setLoadingSites(false);
            });

            const unsubscribeTasks = onSnapshot(query(collection(db, "task-templates"), orderBy("createdAt", "desc")), (snapshot) => {
                const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as TaskTemplate, createdAt: (doc.data().createdAt as Timestamp) }));
                setTaskTemplates(tasksData);
                setLoadingTasks(false);
            });

            return () => {
                unsubscribeSites();
                unsubscribeTasks();
            }
        }
    }, [role, router]);

    const refetchTaskTemplates = async () => {
        setLoadingTasks(true);
        const querySnapshot = await getDocs(query(collection(db, "task-templates"), orderBy("createdAt", "desc")));
        setTaskTemplates(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskTemplate)));
        setLoadingTasks(false);
    }

    if (!role || role === 'SiteLeader') {
        return <FullPageLoader />;
    }

    return (
        <div className="w-full space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">Gestión de Tareas</h2>
            <Tabs defaultValue="dashboard" className="w-full">
                <TabsList>
                    <TabsTrigger value="dashboard">Dashboard de Cumplimiento</TabsTrigger>
                    <TabsTrigger value="templates">Gestión de Plantillas</TabsTrigger>
                </TabsList>
                <TabsContent value="dashboard" className="mt-4">
                    <TaskDashboard sites={sites} allTemplates={taskTemplates} loading={loadingSites || loadingTasks} />
                </TabsContent>
                <TabsContent value="templates" className="mt-4">
                    <TaskTemplateManagement loading={loadingTasks} taskTemplates={taskTemplates} refetchTaskTemplates={refetchTaskTemplates} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
