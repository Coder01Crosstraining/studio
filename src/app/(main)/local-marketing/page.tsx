"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Eye } from 'lucide-react';
import type { MarketingProposal, ProposalStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const proposalSchema = z.object({
  initiativeName: z.string().min(5, "El nombre de la iniciativa es muy corto."),
  objective: z.string().min(10, "El objetivo es muy corto."),
  proposedAction: z.string().min(20, "La acción propuesta es muy corta."),
  budget: z.coerce.number().min(0),
  successKPIs: z.string().min(5, "Los KPIs de éxito son requeridos."),
});

const feedbackSchema = z.object({
  ceoFeedback: z.string().min(10, "El feedback debe tener al menos 10 caracteres.")
});

const mockProposals: MarketingProposal[] = [
  { id: '1', siteId: 'ciudadela', leaderId: 'leader-ciudadela-456', initiativeName: 'Semana de Bienestar en TechCo', objective: 'Generar 20 prospectos calificados.', proposedAction: 'Ofrecer una semana de bienestar en sus oficinas.', budget: 200000, successKPIs: '# de Prospectos, Tasa de Conversión', status: 'pending', submittedAt: new Date('2023-10-20') },
  { id: '2', siteId: 'ciudadela', leaderId: 'leader-ciudadela-456', initiativeName: 'Alianza Universitaria', objective: 'Aumentar membresías de estudiantes en 15%.', proposedAction: 'Ofrecer descuentos exclusivos para estudiantes durante la semana de inscripción.', budget: 500000, successKPIs: 'Nuevos miembros estudiantes', status: 'approved', ceoFeedback: 'Gran iniciativa, proceder según lo planeado.', submittedAt: new Date('2023-09-05') },
  { id: '3', siteId: 'floridablanca', leaderId: 'leader-2', initiativeName: 'Patrocinio Maratón Local', objective: 'Aumentar el reconocimiento de marca en la comunidad de corredores.', proposedAction: 'Patrocinar una maratón local de 5k, instalar un stand con pruebas gratuitas.', budget: 1000000, successKPIs: 'Menciones en redes sociales, visitantes del stand', status: 'rejected', ceoFeedback: 'El presupuesto es demasiado alto para el retorno esperado. Por favor, revisar.', submittedAt: new Date('2023-08-15') },
];

const statusColors: Record<ProposalStatus, string> = {
  pending: "bg-yellow-400/20 text-yellow-600 border-yellow-400/30 hover:bg-yellow-400/30",
  approved: "bg-green-400/20 text-green-600 border-green-400/30 hover:bg-green-400/30",
  rejected: "bg-red-400/20 text-red-600 border-red-400/30 hover:bg-red-400/30",
};

const statusText: Record<ProposalStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
};

export default function LocalMarketingPage() {
  const { role, user } = useAuth();
  const [proposals, setProposals] = useState<MarketingProposal[]>(mockProposals);
  const [selectedSite, setSelectedSite] = useState<string>(role === 'CEO' ? 'ciudadela' : user?.siteId!);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<MarketingProposal | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof proposalSchema>>({ resolver: zodResolver(proposalSchema) });
  const feedbackForm = useForm<z.infer<typeof feedbackSchema>>({ resolver: zodResolver(feedbackSchema) });

  async function onProposalSubmit(values: z.infer<typeof proposalSchema>) {
    setIsLoading(true);
    await new Promise(res => setTimeout(res, 1000));
    const newProposal: MarketingProposal = { ...values, id: Date.now().toString(), siteId: user!.siteId!, leaderId: user!.uid, status: 'pending', submittedAt: new Date() };
    setProposals(prev => [newProposal, ...prev]);
    toast({ title: 'Éxito', description: 'Tu propuesta de marketing ha sido enviada para su revisión.' });
    setIsLoading(false);
    setIsFormOpen(false);
    form.reset();
  }
  
  async function handleProposalUpdate(status: ProposalStatus, feedback?: string) {
    if (!selectedProposal) return;
    setIsLoading(true);
    await new Promise(res => setTimeout(res, 1000));
    setProposals(proposals.map(p => p.id === selectedProposal.id ? { ...p, status, ceoFeedback: feedback || p.ceoFeedback } : p));
    toast({ title: 'Éxito', description: `La propuesta ha sido ${statusText[status].toLowerCase()}.` });
    setIsLoading(false);
    setSelectedProposal(null);
  }

  const filteredProposals = proposals.filter(p => {
    if (role === 'CEO') return p.siteId === selectedSite;
    return p.siteId === user?.siteId;
  });

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Propuestas de Marketing Local</h2>
          {role === 'CEO' && (
            <p className="text-muted-foreground">Revisa y gestiona las propuestas de las diferentes sedes.</p>
          )}
        </div>
        {role === 'SiteLeader' && (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" /> Nueva Propuesta</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader><DialogTitle>Nueva Propuesta de Marketing</DialogTitle><DialogDescription>Describe tu iniciativa para la aprobación del CEO.</DialogDescription></DialogHeader>
              <Form {...form}><form onSubmit={form.handleSubmit(onProposalSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="initiativeName" render={({ field }) => <FormItem><FormLabel>Nombre de la Iniciativa</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="objective" render={({ field }) => <FormItem><FormLabel>Objetivo</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="proposedAction" render={({ field }) => <FormItem><FormLabel>Acción Propuesta</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="budget" render={({ field }) => <FormItem><FormLabel>Presupuesto (COP)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="successKPIs" render={({ field }) => <FormItem><FormLabel>KPIs de Éxito</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                </div>
                <DialogFooter><Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enviar para Revisión</Button></DialogFooter>
              </form></Form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      {role === 'CEO' && (
        <div className="pb-4">
          <Select onValueChange={(value) => setSelectedSite(value)} defaultValue={selectedSite}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Selecciona una sede para ver propuestas" />
            </SelectTrigger>
            <SelectContent>
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
            <TableHeader><TableRow><TableHead>Iniciativa</TableHead><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredProposals.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.initiativeName}</TableCell>
                  <TableCell>{format(p.submittedAt, 'PPP', { locale: es })}</TableCell>
                  <TableCell><Badge className={cn("capitalize", statusColors[p.status])}>{statusText[p.status]}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Dialog onOpenChange={(open) => !open && setSelectedProposal(null)}>
                      <DialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setSelectedProposal(p)}><Eye className="h-4 w-4" /></Button></DialogTrigger>
                      <DialogContent className="sm:max-w-[625px]">
                        <DialogHeader><DialogTitle>{selectedProposal?.initiativeName}</DialogTitle><DialogDescription>Enviada el {selectedProposal && format(selectedProposal.submittedAt, 'PPP', { locale: es })}</DialogDescription></DialogHeader>
                        {selectedProposal && <div className="space-y-4 py-4 text-sm">
                          <div><p className="font-semibold">Objetivo</p><p className="text-muted-foreground">{selectedProposal.objective}</p></div>
                          <div><p className="font-semibold">Acción Propuesta</p><p className="text-muted-foreground">{selectedProposal.proposedAction}</p></div>
                          <div><p className="font-semibold">Presupuesto</p><p className="text-muted-foreground">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(selectedProposal.budget)}</p></div>
                          <div><p className="font-semibold">KPIs de Éxito</p><p className="text-muted-foreground">{selectedProposal.successKPIs}</p></div>
                          {selectedProposal.ceoFeedback && <div><p className="font-semibold">Feedback del CEO</p><p className="text-muted-foreground p-2 bg-muted rounded-md">{selectedProposal.ceoFeedback}</p></div>}
                        </div>}
                        {role === 'CEO' && selectedProposal?.status === 'pending' && <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
                           <Form {...feedbackForm}><form onSubmit={feedbackForm.handleSubmit((values) => handleProposalUpdate('rejected', values.ceoFeedback))} className="space-y-2">
                             <FormField control={feedbackForm.control} name="ceoFeedback" render={({ field }) => <FormItem><FormLabel>Feedback (Requerido para Rechazar)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                             <div className="flex justify-end gap-2">
                               <Button type="button" variant="outline" onClick={() => handleProposalUpdate('approved')}>Aprobar</Button>
                               <Button type="submit" variant="destructive" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4" />}Rechazar</Button>
                             </div>
                           </form></Form>
                        </DialogFooter>}
                        {role !== 'CEO' && <DialogFooter><DialogClose asChild><Button>Cerrar</Button></DialogClose></DialogFooter>}
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
