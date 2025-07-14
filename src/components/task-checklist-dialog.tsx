// src/components/task-checklist-dialog.tsx
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2 } from 'lucide-react';
import type { PendingTasksSummary } from './dashboards/single-site-dashboard';
import type { TaskTemplate } from '@/lib/types';


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

interface TaskChecklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: PendingTasksSummary | null;
}

export function TaskChecklistDialog({ open, onOpenChange, tasks }: TaskChecklistDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agenda de Tareas Pendientes</DialogTitle>
          <DialogDescription>
            Revisa y completa las tareas asignadas para tu sede.
          </DialogDescription>
        </DialogHeader>
        
        {!tasks ? (
          <div className="flex h-64 w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="daily" className="w-full pt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily">Diarias ({tasks.daily.length || 0})</TabsTrigger>
              <TabsTrigger value="weekly">Semanales ({tasks.weekly.length || 0})</TabsTrigger>
              <TabsTrigger value="monthly">Mensuales ({tasks.monthly.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="daily" className="mt-4">
              <TaskList title="Diarias" tasks={tasks.daily || []} />
            </TabsContent>
            <TabsContent value="weekly" className="mt-4">
              <TaskList title="Semanales" tasks={tasks.weekly || []} />
            </TabsContent>
            <TabsContent value="monthly" className="mt-4">
              <TaskList title="Mensuales" tasks={tasks.monthly || []} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
