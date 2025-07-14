"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
import type { Site, User, UserRole, SiteId, TaskTemplate, TaskFrequency } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Loader2, AlertTriangle, UserCog, UserX, UserCheck, UserPlus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { authorizeDocumentAction } from './actions';
import { FullPageLoader } from '@/components/loader';
import { createTaskTemplateAction } from './task-actions';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const siteSchema = z.object({
  name: z.string().min(3, "El nombre de la sede debe tener al menos 3 caracteres."),
  spreadsheetId: z.string().optional(),
});

const userSchema = z.object({
  name: z.string().min(3, "El nombre es muy corto."),
  role: z.enum(["CEO", "SiteLeader"], { required_error: "El rol es obligatorio." }),
  siteId: z.string().optional().nullable(),
}).refine(data => {
    if (data.role === 'SiteLeader') {
        return !!data.siteId;
    }
    return true;
}, {
    message: "Se debe asignar una sede para el Líder de Sede.",
    path: ["siteId"],
});

const authorizeSchema = z.object({
  documentId: z.string().min(5, "El número de cédula debe tener al menos 5 caracteres."),
});

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


function TaskManagement({ loading, taskTemplates, refetchTaskTemplates }: { loading: boolean, taskTemplates: TaskTemplate[], refetchTaskTemplates: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);

  const form = useForm<z.infer<typeof taskTemplateSchema>>({ 
    resolver: zodResolver(taskTemplateSchema),
    defaultValues: {
      title: "",
      description: "",
      frequency: "daily",
    }
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
            // Update logic here
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


function SiteManagement({ sites, users, loading, refetchSites }: { sites: Site[], users: User[], loading: boolean, refetchSites: () => void }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  const form = useForm<z.infer<typeof siteSchema>>({ resolver: zodResolver(siteSchema) });

  const SPREADSHEET_INFO_MAP: Record<string, { id: string, gid: string }> = {
    'piedecuesta': { id: '1RR9WAJZncmnXYw7iCBlS4elELsaO9ZsotlvwWV3kybY', gid: '1843177115' },
    'floridablanca': { id: '1YKaEB2qiiurKdn8m3vpZusnLbgLVaQkXUl52HN7cExk', gid: '800954549' },
    'ciudadela': { id: '1NuEWKj5QPDvUVW6fNrv6gfDcIn1YPwDzV_o0s-FMztA', gid: '531962231' },
  };

  const siteLeadersMap = useMemo(() => {
    const map = new Map<SiteId, string>();
    const siteLeaders = users.filter(u => u.role === 'SiteLeader' && u.siteId && u.status !== 'inactive');
    for (const leader of siteLeaders) {
        if(leader.siteId) {
             map.set(leader.siteId, leader.name);
        }
    }
    return map;
  }, [users]);


  const handleOpenDialog = (site: Site | null = null) => {
    setEditingSite(site);
    form.reset(site ? { name: site.name, spreadsheetId: site.spreadsheetId } : { name: '', spreadsheetId: '' });
    setIsDialogOpen(true);
  };

  const handleSiteSubmit = async (values: z.infer<typeof siteSchema>) => {
    setIsSubmitting(true);
    try {
      const siteNameKey = Object.keys(SPREADSHEET_INFO_MAP).find(key => 
        values.name.toLowerCase().includes(key)
      );
      
      const spreadsheetInfo = siteNameKey ? SPREADSHEET_INFO_MAP[siteNameKey] : null;

      const dataToSave: {
        name: string;
        spreadsheetId?: string;
        spreadsheetGid?: string;
      } = {
        name: values.name
      };

      if (spreadsheetInfo) {
        dataToSave.spreadsheetId = spreadsheetInfo.id;
        dataToSave.spreadsheetGid = spreadsheetInfo.gid;
      } else {
        dataToSave.spreadsheetId = values.spreadsheetId || '';
      }
      
      if (editingSite) {
        // Update
        const siteRef = doc(db, "sites", editingSite.id);
        await updateDoc(siteRef, dataToSave);
        toast({ title: "Sede Actualizada", description: "Los datos de la sede han sido actualizados." });
      } else {
        // Create
        await addDoc(collection(db, "sites"), {
          ...dataToSave,
          revenue: 0,
          monthlyGoal: 0,
          retention: 0,
          nps: 0,
        });
        toast({ title: "Sede Creada", description: "La nueva sede ha sido creada exitosamente." });
      }
      refetchSites();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving site: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la sede." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Gestionar Sedes</CardTitle>
            <CardDescription className="pt-1">Añade o edita sedes de VIBRA.</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4" /> Nueva Sede</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSite ? 'Editar Sede' : 'Crear Nueva Sede'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSiteSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la Sede</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="spreadsheetId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID de Hoja de Cálculo (Opcional)</FormLabel>
                    <FormControl><Input placeholder="ID de la hoja de Google Sheets para NPS" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingSite ? 'Guardar Cambios' : 'Crear Sede'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
          <>
            {/* Mobile View */}
            <div className="space-y-4 md:hidden">
              {sites.map(site => (
                <Card key={site.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{site.name}</p>
                      <p className="text-sm text-muted-foreground">{siteLeadersMap.get(site.id) || 'Sin líder asignado'}</p>
                    </div>
                    <div className="flex items-center">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(site)}><Edit className="h-4 w-4" /></Button>
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
                    <TableHead>Nombre</TableHead>
                    <TableHead>Líder de Sede</TableHead>
                    <TableHead>ID Hoja de Cálculo</TableHead>
                    <TableHead className="text-right w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map(site => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">{site.name}</TableCell>
                      <TableCell>{siteLeadersMap.get(site.id) || 'Sin líder asignado'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{site.spreadsheetId || 'No asignado'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(site)}><Edit className="h-4 w-4" /></Button>
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
  );
}

function UserManagement({ sites, users, loading, refetchUsers }: { sites: Site[], users: User[], loading: boolean, refetchUsers: () => void }) {
    const { toast } = useToast();
    const { user: currentUser } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [togglingUser, setTogglingUser] = useState<User | null>(null);
    const [isAuthorizeDialogOpen, setIsAuthorizeDialogOpen] = useState(false);
    const [isAuthorizing, setIsAuthorizing] = useState(false);

    const form = useForm<z.infer<typeof userSchema>>({ resolver: zodResolver(userSchema) });
    const authorizeForm = useForm<z.infer<typeof authorizeSchema>>({
        resolver: zodResolver(authorizeSchema),
        defaultValues: { documentId: "" }
    });

    const handleOpenDialog = (user: User | null = null) => {
        setEditingUser(user);
        form.reset(user ? { name: user.name, role: user.role, siteId: user.siteId } : { name: '', role: 'SiteLeader', siteId: null });
        setIsDialogOpen(true);
    };

    const handleUserSubmit = async (values: z.infer<typeof userSchema>) => {
        if (!editingUser) return;
        setIsSubmitting(true);
        try {
            const userRef = doc(db, "users", editingUser.uid);
            await updateDoc(userRef, {
                name: values.name,
                role: values.role,
                siteId: values.role === 'CEO' ? null : (values.siteId || null),
            });
            toast({ title: "Usuario Actualizado", description: "Los datos del usuario han sido actualizados." });
            refetchUsers();
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Error updating user: ", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el usuario." });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleToggleUserStatus = async (userToToggle: User) => {
        if (!userToToggle) return;
        setIsSubmittingStatus(true);
        try {
            const newStatus = userToToggle.status === 'inactive' ? 'active' : 'inactive';
            const userRef = doc(db, "users", userToToggle.uid);
            await updateDoc(userRef, { status: newStatus });
            toast({ title: "Estado Actualizado", description: `El usuario ${userToToggle.name} ha sido ${newStatus === 'active' ? 'activado' : 'desactivado'}.` });
            refetchUsers();
        } catch (error) {
            console.error("Error toggling user status: ", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo cambiar el estado del usuario." });
        } finally {
            setIsSubmittingStatus(false);
            setTogglingUser(null);
        }
    };
    
    const onAuthorizeSubmit = async (values: z.infer<typeof authorizeSchema>) => {
        setIsAuthorizing(true);
        const result = await authorizeDocumentAction(values.documentId);
        if (result.success) {
            toast({ title: "Éxito", description: "La cédula ha sido autorizada y el nuevo usuario ya puede registrarse." });
            setIsAuthorizeDialogOpen(false);
            authorizeForm.reset();
        } else {
            toast({ variant: "destructive", title: "Error", description: result.error });
        }
        setIsAuthorizing(false);
    };
  
    const siteMap = useMemo(() => new Map(sites.map(s => [s.id, s.name])), [sites]);
    const { role: formRole } = form.watch();

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                  <CardTitle>Gestionar Usuarios</CardTitle>
                  <CardDescription>Edita los roles, asignaciones y estado de los usuarios.</CardDescription>
              </div>
              <Button onClick={() => setIsAuthorizeDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" /> Autorizar Cédula
              </Button>
          </div>
          <div className="!mt-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
              <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 mr-2 mt-0.5"/>
                  <div>
                      <p className="font-bold">Nota de Seguridad</p>
                      <p className="text-sm">La creación de usuarios se realiza desde la página de registro (validando cédulas autorizadas). Para eliminar permanentemente un usuario, debe hacerse desde la Consola de Firebase.</p>
                  </div>
              </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
            <>
              {/* Mobile View */}
              <div className="space-y-4 md:hidden">
                {users.map(user => (
                  <Card key={user.uid} className={cn(user.status === 'inactive' && 'opacity-60 bg-muted/50')}>
                    <CardHeader className="p-4 flex flex-row items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{user.name}</CardTitle>
                          <CardDescription>{user.email}</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(user)}><Edit className="h-4 w-4" /></Button>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-sm space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div><p className="text-muted-foreground">Rol</p><p className="font-medium">{user.role}</p></div>
                          <div><p className="text-muted-foreground">Sede</p><p className="font-medium">{user.siteId ? siteMap.get(user.siteId) || 'N/A' : 'N/A'}</p></div>
                        </div>
                         <div className="flex justify-between items-center border-t pt-4">
                              <div>
                                  <p className="text-muted-foreground">Estado</p>
                                  <Badge variant={user.status === 'inactive' ? 'destructive' : 'default'} className="mt-1">
                                      {user.status === 'inactive' ? 'Inactivo' : 'Activo'}
                                  </Badge>
                              </div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                      variant={user.status === 'inactive' ? 'default' : 'destructive'} 
                                      size="sm"
                                      disabled={currentUser?.uid === user.uid}
                                  >
                                      {user.status === 'inactive' ? 'Reactivar' : 'Desactivar'}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {`Estás a punto de ${user?.status === 'inactive' ? 'reactivar' : 'desactivar'} la cuenta de ${user?.name}. `}
                                            {user?.status !== 'inactive' ? 'El usuario no podrá iniciar sesión.' : 'El usuario podrá volver a acceder al sistema.'}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => handleToggleUserStatus(user)}
                                            disabled={isSubmittingStatus}
                                            className={user?.status === 'inactive' ? '' : 'bg-destructive hover:bg-destructive/90'}
                                        >
                                            {isSubmittingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {user?.status === 'inactive' ? 'Reactivar' : 'Desactivar'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                          </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Desktop View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Rol</TableHead><TableHead>Sede</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {users.map(user => (
                      <TableRow key={user.uid} className={cn(user.status === 'inactive' && 'text-muted-foreground opacity-60')}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role}</TableCell>
                        <TableCell>{user.siteId ? siteMap.get(user.siteId) || 'N/A' : 'N/A'}</TableCell>
                        <TableCell>
                            <Badge variant={user.status === 'inactive' ? 'outline' : 'secondary'} className={cn(
                                user.status === 'inactive' ? 'border-destructive/80 text-destructive' : 'border-green-400/30 bg-green-400/20 text-green-700'
                            )}>
                                {user.status === 'inactive' ? 'Inactivo' : 'Activo'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(user)}><Edit className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                  variant="ghost" 
                                  size="icon"
                                  disabled={currentUser?.uid === user.uid}
                                  title={user.status === 'inactive' ? 'Reactivar Usuario' : 'Desactivar Usuario'}
                              >
                                  {user.status === 'inactive' ? <UserCheck className="h-4 w-4 text-green-600"/> : <UserX className="h-4 w-4 text-destructive"/>}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      {`Estás a punto de ${user?.status === 'inactive' ? 'reactivar' : 'desactivar'} la cuenta de ${user?.name}. `}
                                      {user?.status !== 'inactive' ? 'El usuario no podrá iniciar sesión.' : 'El usuario podrá volver a acceder al sistema.'}
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                      onClick={() => handleToggleUserStatus(user)}
                                      disabled={isSubmittingStatus}
                                      className={user?.status === 'inactive' ? '' : 'bg-destructive hover:bg-destructive/90'}
                                  >
                                      {isSubmittingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                      {user?.status === 'inactive' ? 'Reactivar' : 'Desactivar'}
                                  </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
              <DialogHeader><DialogTitle>Editar Usuario</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleUserSubmit)} className="space-y-4 py-4">
                  <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem><FormLabel>Rol</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un rol" /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="SiteLeader">Líder de Sede</SelectItem><SelectItem value="CEO">CEO</SelectItem></SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  {formRole === 'SiteLeader' && (
                     <FormField control={form.control} name="siteId" render={({ field }) => (
                        <FormItem><FormLabel>Sede Asignada</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecciona una sede" /></SelectTrigger></FormControl>
                            <SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                  )}
                  <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Guardar Cambios
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
          </DialogContent>
      </Dialog>
      
      <Dialog open={isAuthorizeDialogOpen} onOpenChange={setIsAuthorizeDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Autorizar Nueva Cédula</DialogTitle>
                <DialogDescription>
                    Ingresa el número de cédula del nuevo usuario para permitirle registrarse en la plataforma.
                </DialogDescription>
            </DialogHeader>
            <Form {...authorizeForm}>
              <form onSubmit={authorizeForm.handleSubmit(onAuthorizeSubmit)} className="space-y-4 py-4">
                  <FormField control={authorizeForm.control} name="documentId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Cédula</FormLabel>
                      <FormControl><Input placeholder="123456789" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button type="submit" disabled={isAuthorizing}>
                      {isAuthorizing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Autorizar
                    </Button>
                  </DialogFooter>
              </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function ManagementPage() {
  const { role } = useAuth();
  
  const [sites, setSites] = useState<Site[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

  useEffect(() => {
    // This listener fetches data but doesn't handle unauthorized access.
    // The MainLayout component is now responsible for route protection.
    const unsubscribeSites = onSnapshot(query(collection(db, "sites")), (snapshot) => {
        const sitesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Site));
        setSites(sitesData);
        setLoadingSites(false);
    });

    const unsubscribeUsers = onSnapshot(query(collection(db, "users")), (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
        setUsers(usersData);
        setLoadingUsers(false);
    });
    
    const unsubscribeTasks = onSnapshot(query(collection(db, "task-templates"), orderBy("createdAt", "desc")), (snapshot) => {
        const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskTemplate));
        setTaskTemplates(tasksData);
        setLoadingTasks(false);
    });

    return () => {
        unsubscribeSites();
        unsubscribeUsers();
        unsubscribeTasks();
    }
  }, []);

  const refetchSites = async () => {
      setLoadingSites(true);
      const querySnapshot = await getDocs(collection(db, "sites"));
      setSites(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Site)));
      setLoadingSites(false);
  }

  const refetchUsers = async () => {
      setLoadingUsers(true);
      const querySnapshot = await getDocs(collection(db, "users"));
      setUsers(querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
      setLoadingUsers(false);
  }

  const refetchTaskTemplates = async () => {
      setLoadingTasks(true);
      const querySnapshot = await getDocs(query(collection(db, "task-templates"), orderBy("createdAt", "desc")));
      setTaskTemplates(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskTemplate)));
      setLoadingTasks(false);
  }
  
  if (role !== 'CEO') {
    return <FullPageLoader />;
  }

  return (
    <div className="w-full space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">Gestión y Configuración</h2>
      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="sites">Sedes</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="tasks">Plantillas de Tareas</TabsTrigger>
        </TabsList>
        <TabsContent value="sites" className="mt-4">
          <SiteManagement sites={sites} users={users} loading={loadingSites || loadingUsers} refetchSites={refetchSites} />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UserManagement sites={sites} users={users} loading={loadingUsers || loadingSites} refetchUsers={refetchUsers} />
        </TabsContent>
        <TabsContent value="tasks" className="mt-4">
          <TaskManagement loading={loadingTasks} taskTemplates={taskTemplates} refetchTaskTemplates={refetchTaskTemplates} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
