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
import { collection, doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import type { Site } from '@/lib/types';

const reportSchema = z.object({
  date: z.date({ required_error: "Se requiere una fecha para el reporte." }),
  newRevenue: z.coerce.number().min(0, "Los ingresos no pueden ser negativos."),
  renewalRate: z.coerce.number().min(0).max(100, "La tasa de renovación debe estar entre 0 y 100."),
  dailyWin: z.string().min(3, "El logro del día debe tener al menos 3 caracteres.").max(500),
  dailyChallenge: z.string().min(3, "El desafío del día debe tener al menos 3 caracteres.").max(500),
  lessonLearned: z.string().min(3, "La lección aprendida debe tener al menos 3 caracteres.").max(500),
});

export default function DailyReportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [npsValue, setNpsValue] = useState<number | null>(null);
  const [isNpsLoading, setIsNpsLoading] = useState(true);

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      date: new Date(),
      newRevenue: 0,
      renewalRate: 0,
      dailyWin: '',
      dailyChallenge: '',
      lessonLearned: '',
    },
  });

  useEffect(() => {
    async function fetchNps() {
      if (user && user.siteId) {
        setIsNpsLoading(true);
        try {
          const siteRef = doc(db, 'sites', user.siteId);
          const siteDoc = await getDoc(siteRef);
          if (siteDoc.exists()) {
            const siteData = siteDoc.data();
            setNpsValue(siteData.nps);
          } else {
            setNpsValue(0); // Default to 0 if not found
          }
        } catch (error) {
          console.error("Error fetching NPS value:", error);
          setNpsValue(0);
          toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo cargar el valor de NPS.",
          });
        } finally {
          setIsNpsLoading(false);
        }
      } else {
          setIsNpsLoading(false);
      }
    }
    fetchNps();
  }, [user, toast]);
  
  async function onSubmit(values: z.infer<typeof reportSchema>) {
    if (!user || !user.siteId) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo identificar al usuario o la sede." });
        return;
    }
    setIsLoading(true);

    try {
        const siteRef = doc(db, "sites", user.siteId);
        
        // The validated and coerced 'values' object from react-hook-form is used here.
        // `values.newRevenue` and `values.renewalRate` are guaranteed to be numbers
        // because of `z.coerce.number()` in the schema.
        
        await runTransaction(db, async (transaction) => {
            const siteDoc = await transaction.get(siteRef);
            if (!siteDoc.exists()) {
                throw new Error("El documento de la sede no existe.");
            }

            const currentData = siteDoc.data() as Site;
            
            // This calculation is now safe because `values.newRevenue` is a number.
            const newTotalRevenue = (currentData.revenue || 0) + values.newRevenue;
            
            transaction.update(siteRef, {
                revenue: newTotalRevenue,
            });

            const reportCollectionRef = collection(db, "sites", user.siteId, "daily-reports");
            const newReportRef = doc(reportCollectionRef);
            
            transaction.set(newReportRef, {
                ...values, // The entire validated 'values' object is used
                date: format(values.date, 'yyyy-MM-dd'),
                siteId: user.siteId,
                leaderId: user.uid,
                leaderName: user.name,
                submittedAt: serverTimestamp(),
            });
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
                 <FormItem>
                  <FormLabel>NPS Promedio (Mes)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      value={isNpsLoading ? "Cargando..." : (npsValue !== null ? npsValue.toFixed(2) : "N/A")}
                      disabled
                    />
                  </FormControl>
                </FormItem>
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
              
              <Button type="submit" disabled={isLoading}>
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
