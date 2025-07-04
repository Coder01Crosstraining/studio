"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { getMonthlyNpsForSite } from '@/services/google-sheets';
import type { Site } from '@/lib/types';

const reportSchema = z.object({
  date: z.date({ required_error: "Se requiere una fecha para el reporte." }),
  newRevenue: z.coerce.number().min(0, "Los ingresos no pueden ser negativos."),
  renewalRate: z.coerce.number().min(0).max(100, "La tasa de renovación debe estar entre 0 y 100."),
  avgNPS: z.coerce.number().min(0).max(10, "El NPS debe estar entre 0 y 10."),
  dailyWin: z.string().min(10, "El logro del día debe tener al menos 10 caracteres.").max(500),
  dailyChallenge: z.string().min(10, "El desafío del día debe tener al menos 10 caracteres.").max(500),
  lessonLearned: z.string().min(10, "La lección aprendida debe tener al menos 10 caracteres.").max(500),
});

export default function DailyReportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isNpsLoading, setIsNpsLoading] = React.useState(true);

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      date: new Date(),
      newRevenue: 0,
      renewalRate: 0,
      avgNPS: 0,
      dailyWin: '',
      dailyChallenge: '',
      lessonLearned: '',
    },
  });

  useEffect(() => {
    async function fetchSiteAndNpsData() {
        if (!user || !user.siteId) return;

        setIsNpsLoading(true);
        try {
            const siteRef = doc(db, 'sites', user.siteId);
            const siteDoc = await getDoc(siteRef);

            if (siteDoc.exists()) {
                const site = { id: siteDoc.id, ...siteDoc.data() } as Site;
                const nps = await getMonthlyNpsForSite(site);
                form.setValue('avgNPS', nps);
            } else {
                throw new Error("No se encontraron los datos de la sede.");
            }
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error al cargar NPS', description: (error as Error).message });
            form.setValue('avgNPS', 0); // Set a default/error value
        } finally {
            setIsNpsLoading(false);
        }
    }
    fetchSiteAndNpsData();
  }, [user, form, toast]);
  
  async function onSubmit(values: z.infer<typeof reportSchema>) {
    if (!user || !user.siteId) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo identificar al usuario o la sede." });
        return;
    }
    setIsLoading(true);

    try {
        // 1. Add new daily report to subcollection within the site
        const reportCollectionRef = collection(db, "sites", user.siteId, "daily-reports");
        await addDoc(reportCollectionRef, {
            ...values,
            date: format(values.date, 'yyyy-MM-dd'),
            siteId: user.siteId,
            leaderId: user.uid,
            leaderName: user.name,
            submittedAt: serverTimestamp(),
        });

        // 2. Update the site's total revenue
        const siteRef = doc(db, "sites", user.siteId);
        await updateDoc(siteRef, {
            revenue: increment(values.newRevenue)
        });

        toast({
            title: "¡Éxito!",
            description: "Tu reporte diario ha sido enviado.",
        });
        router.push('/');
    } catch (error) {
        console.error("Error submitting report: ", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo enviar el reporte. Inténtalo de nuevo.",
        });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <div className="w-full space-y-4">
       <h2 className="text-3xl font-bold tracking-tight">Enviar Reporte Diario</h2>
      <Card>
        <CardHeader>
          <CardTitle>Nuevo Reporte</CardTitle>
          <CardDescription>Completa los detalles del reporte de rendimiento de hoy.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha del Reporte</FormLabel>
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
                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={es}
                          disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <FormField control={form.control} name="newRevenue" render={({ field }) => (
                  <FormItem><FormLabel>Ventas del Día (COP)</FormLabel><FormControl><Input type="number" placeholder="1500000" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="renewalRate" render={({ field }) => (
                  <FormItem><FormLabel>Tasa de Renovación (%)</FormLabel><FormControl><Input type="number" placeholder="85" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="avgNPS" render={({ field }) => (
                  <FormItem>
                    <FormLabel>NPS Promedio (Mensual)</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <Input 
                                type="number" 
                                readOnly 
                                {...field}
                                className="bg-muted pr-10"
                            />
                            {isNpsLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                        </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="dailyWin" render={({ field }) => (
                <FormItem><FormLabel>Logro del Día</FormLabel><FormControl><Textarea placeholder="Alcanzamos la meta de referidos diarios." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="dailyChallenge" render={({ field }) => (
                <FormItem><FormLabel>Desafío del Día</FormLabel><FormControl><Textarea placeholder="Una de las máquinas de cardio requiere mantenimiento." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="lessonLearned" render={({ field }) => (
                <FormItem><FormLabel>Lección Aprendida del Día</FormLabel><FormControl><Textarea placeholder="La campaña de 'trae un amigo' está funcionando muy bien en la tarde." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <Button type="submit" disabled={isLoading || isNpsLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Reporte
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
