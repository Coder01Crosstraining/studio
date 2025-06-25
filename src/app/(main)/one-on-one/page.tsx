"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
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
  employeeName: z.string().min(2, "Name is too short."),
  employeeRole: z.enum(["Coach", "SalesAdvisor"], { required_error: "Role is required." }),
  sessionDate: z.string().min(1, "Date is required."),
  energyCheckIn: z.coerce.number().min(1).max(10),
  mainWin: z.string().min(10).max(500),
  opportunityForImprovement: z.string().min(10).max(500),
  actionPlan: z.string().min(10).max(500),
});

const mockSessions: OneOnOneSession[] = [
  { id: '1', siteId: 'ciudadela', leaderId: 'leader-1', employeeName: 'Carlos Coach', employeeRole: 'Coach', sessionDate: '2023-10-15', energyCheckIn: 8, mainWin: 'Great class energy', opportunityForImprovement: 'Start class on time', actionPlan: 'Arrive 15 mins early', createdAt: new Date() },
  { id: '2', siteId: 'ciudadela', leaderId: 'leader-1', employeeName: 'Ana Advisor', employeeRole: 'SalesAdvisor', sessionDate: '2023-10-12', energyCheckIn: 9, mainWin: 'Closed 3 new yearly plans', opportunityForImprovement: 'Follow up with cold leads', actionPlan: 'Dedicate 1 hour daily to follow-ups', createdAt: new Date() },
];

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
    toast({ title: 'Success', description: 'New 1-on-1 session has been logged.' });
    setIsLoading(false);
    setIsFormOpen(false);
    form.reset({ sessionDate: format(new Date(), 'yyyy-MM-dd') });
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">1-on-1 Session Log</h2>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> New Session</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Log New 1-on-1 Session</DialogTitle>
              <DialogDescription>Record the details of your session with a team member.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="employeeName" render={({ field }) => (
                    <FormItem><FormLabel>Employee Name</FormLabel><FormControl><Input placeholder="e.g. John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="employeeRole" render={({ field }) => (
                    <FormItem><FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Coach">Coach</SelectItem>
                          <SelectItem value="SalesAdvisor">Sales Advisor</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="sessionDate" render={({ field }) => (
                    <FormItem><FormLabel>Session Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="energyCheckIn" render={({ field }) => (
                    <FormItem><FormLabel>Energy Check-In (1-10)</FormLabel><FormControl><Input type="number" min="1" max="10" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                 <FormField control={form.control} name="mainWin" render={({ field }) => (
                  <FormItem><FormLabel>Main Win</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="opportunityForImprovement" render={({ field }) => (
                  <FormItem><FormLabel>Opportunity for Improvement</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="actionPlan" render={({ field }) => (
                  <FormItem><FormLabel>Action Plan</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Session
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
          <CardDescription>A log of all past 1-on-1 sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>{format(new Date(session.sessionDate), 'PPP')}</TableCell>
                  <TableCell className="font-medium">{session.employeeName}</TableCell>
                  <TableCell>{session.employeeRole}</TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedSession(session)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[625px]">
                        <DialogHeader>
                          <DialogTitle>Session with {selectedSession?.employeeName}</DialogTitle>
                          <DialogDescription>Details from the session on {selectedSession && format(new Date(selectedSession.sessionDate), 'PPP')}</DialogDescription>
                        </DialogHeader>
                        {selectedSession && <div className="space-y-4 py-4">
                          <p><strong>Energy Check-In:</strong> {selectedSession.energyCheckIn}/10</p>
                          <p><strong>Main Win:</strong> {selectedSession.mainWin}</p>
                          <p><strong>Opportunity for Improvement:</strong> {selectedSession.opportunityForImprovement}</p>
                          <p><strong>Action Plan:</strong> {selectedSession.actionPlan}</p>
                        </div>}
                         <DialogFooter>
                            <DialogClose asChild><Button>Close</Button></DialogClose>
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
