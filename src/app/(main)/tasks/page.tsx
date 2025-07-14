// src/app/(main)/tasks/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import type { TaskTemplate, TaskInstance } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, where, Timestamp } from 'firebase/firestore';
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type PendingTasks = {
  daily: TaskTemplate[];
  weekly: TaskTemplate[];
  monthly: TaskTemplate[];
};

function TaskList({ title, tasks }: { title: string, tasks: TaskTemplate[] }) {
    const { toast } = useToast();
    
    if (tasks.length === 0) {
        return (
            <div className="py-8 text-center text-muted-foreground">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
                <p className="mt-4">¡Excelente! No tienes tareas {title.toLowerCase()} pendientes.</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {tasks.map(task => (
                <Card key={task.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="font-semibold">{task.title}</p>
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                        </div>
                        <Button size="sm" onClick={() => toast({ title: "Próximamente", description: "La función para completar tareas estará disponible pronto." })}>
                            Completar
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}


export default function TasksPage() {
    const { user, role } = useAuth();
    const [pendingTasks, setPendingTasks] = useState<PendingTasks | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.siteId) {
            setLoading(false);
            return;
        }

        async function fetchTasks() {
            try {
                const now = new Date();
                
                // 1. Fetch all active task templates
                const templatesRef = collection(db, 'task-templates');
                const templatesQuery = query(templatesRef, where('isActive', '==', true));
                const templatesSnapshot = await getDocs(templatesQuery);
                const allTemplates = templatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskTemplate));

                // 2. Fetch completed task instances for the current site for all relevant periods
                const instancesRef = collection(db, 'sites', user.siteId!, 'task-instances');
                const dailyQuery = query(instancesRef, where('completedAt', '>=', startOfDay(now)), where('completedAt', '<=', endOfDay(now)));
                const weeklyQuery = query(instancesRef, where('completedAt', '>=', startOfWeek(now)), where('completedAt', '<=', endOfWeek(now)));
                const monthlyQuery = query(instancesRef, where('completedAt', '>=', startOfMonth(now)), where('completedAt', '<=', endOfMonth(now)));

                const [dailySnapshot, weeklySnapshot, monthlySnapshot] = await Promise.all([
                    getDocs(dailyQuery),
                    getDocs(weeklyQuery),
                    getDocs(monthlyQuery)
                ]);

                const completedDailyIds = new Set(dailySnapshot.docs.map(doc => (doc.data() as TaskInstance).templateId));
                const completedWeeklyIds = new Set(weeklySnapshot.docs.map(doc => (doc.data() as TaskInstance).templateId));
                const completedMonthlyIds = new Set(monthlySnapshot.docs.map(doc => (doc.data() as TaskInstance).templateId));
                
                // 3. Determine pending tasks
                const pending: PendingTasks = { daily: [], weekly: [], monthly: [] };
                for (const template of allTemplates) {
                    if (template.frequency === 'daily' && !completedDailyIds.has(template.id)) {
                        pending.daily.push(template);
                    } else if (template.frequency === 'weekly' && !completedWeeklyIds.has(template.id)) {
                        pending.weekly.push(template);
                    } else if (template.frequency === 'monthly' && !completedMonthlyIds.has(template.id)) {
                        pending.monthly.push(template);
                    }
                }
                setPendingTasks(pending);

            } catch (error) {
                console.error("Error fetching tasks:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchTasks();
    }, [user]);

  if (loading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (role !== 'SiteLeader') {
      return (
        <div className="w-full space-y-4">
           <h2 className="text-3xl font-bold tracking-tight">Acceso Denegado</h2>
            <p className="text-muted-foreground">
              Esta sección solo está disponible para Líderes de Sede.
            </p>
        </div>
      );
  }

  return (
    <div className="w-full space-y-4">
      <div>
          <h2 className="text-3xl font-bold tracking-tight">Tareas Pendientes</h2>
          <p className="text-muted-foreground">
            Revisa y completa las tareas asignadas para tu sede.
          </p>
      </div>

       <Tabs defaultValue="daily" className="w-full">
        <TabsList>
          <TabsTrigger value="daily">Diarias ({pendingTasks?.daily.length || 0})</TabsTrigger>
          <TabsTrigger value="weekly">Semanales ({pendingTasks?.weekly.length || 0})</TabsTrigger>
          <TabsTrigger value="monthly">Mensuales ({pendingTasks?.monthly.length || 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="daily" className="mt-4">
            <TaskList title="Diarias" tasks={pendingTasks?.daily || []} />
        </TabsContent>
        <TabsContent value="weekly" className="mt-4">
            <TaskList title="Semanales" tasks={pendingTasks?.weekly || []} />
        </TabsContent>
        <TabsContent value="monthly" className="mt-4">
            <TaskList title="Mensuales" tasks={pendingTasks?.monthly || []} />
        </TabsContent>
      </Tabs>

    </div>
  );
}
