"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, onSnapshot } from 'firebase/firestore';
import type { Site, User, UserRole, SiteId } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, Loader2, AlertTriangle, UserCog } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

function SiteManagement({ sites, users, loading, refetchSites }: { sites: Site[], users: User[], loading: boolean, refetchSites: () => void }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  const form = useForm<z.infer<typeof siteSchema>>({ resolver: zodResolver(siteSchema) });

  const SPREADSHEET_ID_MAP: Record<string, string> = {
    'piedecuesta': '1RR9WAJZncmnXYw7iCBlS4elELsaO9ZsotlvwWV3kybY',
    'floridablanca': '1YKaEB2qiiurKdn8m3vpZusnLbgLVaQkXUl52HN7cExk',
    'ciudadela': '1NuEWKj5QPDvUVW6fNrv6gfDcIn1YPwDzV_o0s-FMztA',
  };

  const siteLeadersMap = useMemo(() => {
    const map = new Map<SiteId, string>();
    const siteLeaders = users.filter(u => u.role === 'SiteLeader' && u.siteId);
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
      const siteNameKey = Object.keys(SPREADSHEET_ID_MAP).find(key => 
        values.name.toLowerCase().includes(key)
      );
      const spreadsheetId = siteNameKey ? SPREADSHEET_ID_MAP[siteNameKey] : values.spreadsheetId || '';
      
      if (editingSite) {
        // Update
        const siteRef = doc(db, "sites", editingSite.id);
        await updateDoc(siteRef, { name: values.name, spreadsheetId: spreadsheetId });
        toast({ title: "Sede Actualizada", description: "Los datos de la sede han sido actualizados." });
      } else {
        // Create
        await addDoc(collection(db, "sites"), {
          name: values.name,
          spreadsheetId: spreadsheetId,
          revenue: 0,
          monthlyGoal: 0,
          retention: 0,
          nps: 0,
          averageTicket: 0,
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

  const handleSiteDelete = async (siteId: SiteId) => {
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "sites", siteId));
      toast({ title: "Sede Eliminada", description: "La sede ha sido eliminada permanentemente." });
      refetchSites();
    } catch (error) {
      console.error("Error deleting site: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar la sede." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Gestionar Sedes</CardTitle>
            <CardDescription className="pt-1">Añade, edita o elimina sedes de VIBRA.</CardDescription>
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Esto eliminará permanentemente la sede. Los usuarios asignados a esta sede deberán ser reasignados.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleSiteDelete(site.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
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
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Esto eliminará permanentemente la sede. Los usuarios asignados a esta sede deberán ser reasignados.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleSiteDelete(site.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
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
  );
}

function UserManagement({ sites, users, loading, refetchUsers }: { sites: Site[], users: User[], loading: boolean, refetchUsers: () => void }) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const form = useForm<z.infer<typeof userSchema>>({ resolver: zodResolver(userSchema) });

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
  
    const siteMap = useMemo(() => new Map(sites.map(s => [s.id, s.name])), [sites]);
    const { role: formRole } = form.watch();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestionar Usuarios</CardTitle>
        <CardDescription>Edita los roles y asignaciones de los usuarios.</CardDescription>
        <div className="!mt-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
            <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 mr-2 mt-0.5"/>
                <div>
                    <p className="font-bold">Acción Manual Requerida</p>
                    <p className="text-sm">La creación y eliminación de usuarios debe realizarse en la Consola de Firebase para garantizar la seguridad. Desde aquí solo puedes editar usuarios existentes.</p>
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
                <Card key={user.uid}>
                  <CardHeader className="p-4 flex flex-row items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{user.name}</CardTitle>
                        <CardDescription>{user.email}</CardDescription>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(user)}><Edit className="h-4 w-4" /></Button>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-sm space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div><p className="text-muted-foreground">Rol</p><p className="font-medium">{user.role}</p></div>
                        <div><p className="text-muted-foreground">Sede</p><p className="font-medium">{user.siteId ? siteMap.get(user.siteId) || 'N/A' : 'N/A'}</p></div>
                      </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Desktop View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Rol</TableHead><TableHead>Sede</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>{user.siteId ? siteMap.get(user.siteId) || 'N/A' : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(user)}><Edit className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
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
    </Card>
  );
}

export default function ManagementPage() {
  const { role } = useAuth();
  const router = useRouter();
  
  const [sites, setSites] = useState<Site[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (role && role !== 'CEO') {
      router.push('/');
    }
  }, [role, router]);

  useEffect(() => {
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

    return () => {
        unsubscribeSites();
        unsubscribeUsers();
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

  if (role !== 'CEO') {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="w-full space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">Gestión de Usuarios y Sedes</h2>
      <Tabs defaultValue="sites" className="w-full">
        <TabsList>
          <TabsTrigger value="sites">Sedes</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
        </TabsList>
        <TabsContent value="sites" className="mt-4">
          <SiteManagement sites={sites} users={users} loading={loadingSites || loadingUsers} refetchSites={refetchSites} />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UserManagement sites={sites} users={users} loading={loadingUsers || loadingSites} refetchUsers={refetchUsers} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
