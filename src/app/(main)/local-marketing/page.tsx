"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
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
  initiativeName: z.string().min(5, "Initiative name is too short."),
  objective: z.string().min(10, "Objective is too short."),
  proposedAction: z.string().min(20, "Proposed action is too short."),
  budget: z.coerce.number().min(0),
  successKPIs: z.string().min(5, "Success KPIs are required."),
});

const feedbackSchema = z.object({
  ceoFeedback: z.string().min(10, "Feedback must be at least 10 characters.")
});

const mockProposals: MarketingProposal[] = [
  { id: '1', siteId: 'ciudadela', leaderId: 'leader-ciudadela-456', initiativeName: 'Wellness Week at TechCo', objective: 'Generate 20 qualified leads.', proposedAction: 'Offer a wellness week at their offices.', budget: 200000, successKPIs: '# of Leads, Conversion Rate', status: 'pending', submittedAt: new Date('2023-10-20') },
  { id: '2', siteId: 'ciudadela', leaderId: 'leader-ciudadela-456', initiativeName: 'University Partnership', objective: 'Increase student memberships by 15%.', proposedAction: 'Offer exclusive student discounts during enrollment week.', budget: 500000, successKPIs: 'New student members', status: 'approved', ceoFeedback: 'Great initiative, proceed as planned.', submittedAt: new Date('2023-09-05') },
  { id: '3', siteId: 'floridablanca', leaderId: 'leader-2', initiativeName: 'Local Marathon Sponsorship', objective: 'Increase brand awareness in the running community.', proposedAction: 'Sponsor a local 5k marathon, set up a booth with free trials.', budget: 1000000, successKPIs: 'Social media mentions, booth visitors', status: 'rejected', ceoFeedback: 'Budget is too high for the expected return. Please revise.', submittedAt: new Date('2023-08-15') },
];

const statusColors: Record<ProposalStatus, string> = {
  pending: "bg-yellow-400/20 text-yellow-600 border-yellow-400/30 hover:bg-yellow-400/30",
  approved: "bg-green-400/20 text-green-600 border-green-400/30 hover:bg-green-400/30",
  rejected: "bg-red-400/20 text-red-600 border-red-400/30 hover:bg-red-400/30",
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
    toast({ title: 'Success', description: 'Your marketing proposal has been submitted for review.' });
    setIsLoading(false);
    setIsFormOpen(false);
    form.reset();
  }
  
  async function handleProposalUpdate(status: ProposalStatus, feedback?: string) {
    if (!selectedProposal) return;
    setIsLoading(true);
    await new Promise(res => setTimeout(res, 1000));
    setProposals(proposals.map(p => p.id === selectedProposal.id ? { ...p, status, ceoFeedback: feedback || p.ceoFeedback } : p));
    toast({ title: 'Success', description: `Proposal has been ${status}.` });
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
          <h2 className="text-3xl font-bold tracking-tight">Local Marketing Proposals</h2>
          {role === 'CEO' && (
            <p className="text-muted-foreground">Review and manage proposals from different sites.</p>
          )}
        </div>
        {role === 'SiteLeader' && (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" /> New Proposal</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader><DialogTitle>New Marketing Proposal</DialogTitle><DialogDescription>Describe your initiative for CEO approval.</DialogDescription></DialogHeader>
              <Form {...form}><form onSubmit={form.handleSubmit(onProposalSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="initiativeName" render={({ field }) => <FormItem><FormLabel>Initiative Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="objective" render={({ field }) => <FormItem><FormLabel>Objective</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="proposedAction" render={({ field }) => <FormItem><FormLabel>Proposed Action</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="budget" render={({ field }) => <FormItem><FormLabel>Budget (COP)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="successKPIs" render={({ field }) => <FormItem><FormLabel>Success KPIs</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                </div>
                <DialogFooter><Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit for Review</Button></DialogFooter>
              </form></Form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      {role === 'CEO' && (
        <div className="pb-4">
          <Select onValueChange={(value) => setSelectedSite(value)} defaultValue={selectedSite}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select a site to view proposals" />
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
            <TableHeader><TableRow><TableHead>Initiative</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredProposals.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.initiativeName}</TableCell>
                  <TableCell>{format(p.submittedAt, 'PPP')}</TableCell>
                  <TableCell><Badge className={cn("capitalize", statusColors[p.status])}>{p.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Dialog onOpenChange={(open) => !open && setSelectedProposal(null)}>
                      <DialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setSelectedProposal(p)}><Eye className="h-4 w-4" /></Button></DialogTrigger>
                      <DialogContent className="sm:max-w-[625px]">
                        <DialogHeader><DialogTitle>{selectedProposal?.initiativeName}</DialogTitle><DialogDescription>Submitted on {selectedProposal && format(selectedProposal.submittedAt, 'PPP')}</DialogDescription></DialogHeader>
                        {selectedProposal && <div className="space-y-4 py-4 text-sm">
                          <div><p className="font-semibold">Objective</p><p className="text-muted-foreground">{selectedProposal.objective}</p></div>
                          <div><p className="font-semibold">Proposed Action</p><p className="text-muted-foreground">{selectedProposal.proposedAction}</p></div>
                          <div><p className="font-semibold">Budget</p><p className="text-muted-foreground">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(selectedProposal.budget)}</p></div>
                          <div><p className="font-semibold">Success KPIs</p><p className="text-muted-foreground">{selectedProposal.successKPIs}</p></div>
                          {selectedProposal.ceoFeedback && <div><p className="font-semibold">CEO Feedback</p><p className="text-muted-foreground p-2 bg-muted rounded-md">{selectedProposal.ceoFeedback}</p></div>}
                        </div>}
                        {role === 'CEO' && selectedProposal?.status === 'pending' && <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
                           <Form {...feedbackForm}><form onSubmit={feedbackForm.handleSubmit((values) => handleProposalUpdate('rejected', values.ceoFeedback))} className="space-y-2">
                             <FormField control={feedbackForm.control} name="ceoFeedback" render={({ field }) => <FormItem><FormLabel>Feedback (Required for Rejection)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                             <div className="flex justify-end gap-2">
                               <Button type="button" variant="outline" onClick={() => handleProposalUpdate('approved')}>Approve</Button>
                               <Button type="submit" variant="destructive" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4" />}Reject</Button>
                             </div>
                           </form></Form>
                        </DialogFooter>}
                        {role !== 'CEO' && <DialogFooter><DialogClose asChild><Button>Close</Button></DialogClose></DialogFooter>}
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
