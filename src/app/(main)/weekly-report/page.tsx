"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const reportSchema = z.object({
  date: z.date({ required_error: "A date for the report is required." }),
  newRevenue: z.coerce.number().min(0, "Revenue cannot be negative."),
  newMembers: z.coerce.number().int().min(0, "New members cannot be negative."),
  lostMembers: z.coerce.number().int().min(0, "Lost members cannot be negative."),
  renewalRate: z.coerce.number().min(0).max(100, "Renewal rate must be between 0 and 100."),
  avgNPS: z.coerce.number().min(0).max(10, "NPS must be between 0 and 10."),
  coachSatisfaction: z.coerce.number().min(0).max(5, "Coach satisfaction must be between 0 and 5."),
  weeklyWin: z.string().min(10, "Weekly win must be at least 10 characters.").max(500),
  weeklyChallenge: z.string().min(10, "Weekly challenge must be at least 10 characters.").max(500),
  lessonLearned: z.string().min(10, "Lesson learned must be at least 10 characters.").max(500),
});

export default function WeeklyReportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      weeklyWin: '',
      weeklyChallenge: '',
      lessonLearned: '',
    },
  });
  
  async function onSubmit(values: z.infer<typeof reportSchema>) {
    setIsLoading(true);
    console.log({
      ...values,
      siteId: user?.siteId,
      leaderId: user?.uid,
      leaderName: user?.name,
      submittedAt: new Date(),
    });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: "Success!",
      description: "Your weekly report has been submitted.",
    });
    router.push('/');
    setIsLoading(false);
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <h2 className="text-3xl font-bold tracking-tight">Submit Weekly Report</h2>
      <Card>
        <CardHeader>
          <CardTitle>New Report</CardTitle>
          <CardDescription>Fill out the details for this week's performance report.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Report Week Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-[240px] pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <FormField control={form.control} name="newRevenue" render={({ field }) => (
                  <FormItem><FormLabel>New Revenue (COP)</FormLabel><FormControl><Input type="number" placeholder="1500000" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="newMembers" render={({ field }) => (
                  <FormItem><FormLabel>New Members</FormLabel><FormControl><Input type="number" placeholder="10" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="lostMembers" render={({ field }) => (
                  <FormItem><FormLabel>Lost Members</FormLabel><FormControl><Input type="number" placeholder="3" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="renewalRate" render={({ field }) => (
                  <FormItem><FormLabel>Renewal Rate (%)</FormLabel><FormControl><Input type="number" placeholder="85" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="avgNPS" render={({ field }) => (
                  <FormItem><FormLabel>Average NPS (0-10)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="8.5" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="coachSatisfaction" render={({ field }) => (
                  <FormItem><FormLabel>Coach Satisfaction (0-5)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="4.8" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="weeklyWin" render={({ field }) => (
                <FormItem><FormLabel>Weekly Win</FormLabel><FormControl><Textarea placeholder="We hit our sales goal 2 days early." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="weeklyChallenge" render={({ field }) => (
                <FormItem><FormLabel>Weekly Challenge</FormLabel><FormControl><Textarea placeholder="Coach 'X' reported low energy levels." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="lessonLearned" render={({ field }) => (
                <FormItem><FormLabel>Lesson Learned</FormLabel><FormControl><Textarea placeholder="Leads from the 'Y' partnership have the highest closing rate." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Report
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
