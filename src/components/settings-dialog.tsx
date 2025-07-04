"use client";

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/auth';
import { db, storage } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

const settingsSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
});

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { user, updateUserContext } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { name: user?.name || '' },
  });

  React.useEffect(() => {
    if (user && open) {
      form.reset({ name: user.name });
    }
  }, [user, open, form]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ variant: 'destructive', title: 'Error', description: 'La imagen no debe pesar más de 2MB.' });
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSettingsSubmit = async (values: z.infer<typeof settingsSchema>) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      const userRef = doc(db, 'users', user.uid);
      const dataToUpdate: { name: string; photoURL?: string } = {
        name: values.name,
      };

      if (avatarFile) {
        const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${avatarFile.name}`);
        const snapshot = await uploadBytes(storageRef, avatarFile);
        dataToUpdate.photoURL = await getDownloadURL(snapshot.ref);
      }
      
      await updateDoc(userRef, dataToUpdate);

      updateUserContext(dataToUpdate);

      toast({ title: 'Éxito', description: 'Tu perfil ha sido actualizado.' });
      onOpenChange(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar tu perfil." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
            setAvatarPreview(null);
            setAvatarFile(null);
        }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configuración de Perfil</DialogTitle>
          <DialogDescription>
            Personaliza tu información y las preferencias de la aplicación.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <AvatarImage src={avatarPreview || user?.photoURL || ''} />
              <AvatarFallback>{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/png, image/jpeg"
              onChange={handleAvatarChange}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Cambiar Foto</Button>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSettingsSubmit)} id="settings-form" className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <div className="space-y-2">
             <Label>Apariencia</Label>
             <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                    <p className="text-sm font-medium">Modo Oscuro</p>
                    <p className="text-xs text-muted-foreground">Activa el tema oscuro para la aplicación.</p>
                </div>
                 <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    aria-label="Toggle dark mode"
                />
             </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="settings-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
