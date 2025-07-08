"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { FirebaseError } from "firebase/app";

const registerSchema = z.object({
  name: z.string().min(3, "El nombre completo es requerido."),
  documentId: z.string().min(5, "El número de cédula es requerido."),
  email: z.string().email("Por favor, introduce un correo válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

async function handleRegistration(values: RegisterFormValues) {
    'use server';
    try {
        // 1. Validate document ID
        const docRef = doc(db, 'documentId', values.documentId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error('Cédula no autorizada para el registro.');
        }

        const docData = docSnap.data();
        if (docData.registeredBy) {
            throw new Error('Esta cédula ya ha sido registrada por otro usuario.');
        }
        
        // 2. Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const user = userCredential.user;

        // 3. Create user document in Firestore
        await setDoc(doc(db, 'users', user.uid), {
            name: values.name,
            email: values.email,
            documentId: values.documentId,
            role: 'SiteLeader', // Default role for new sign-ups
            siteId: null,      // To be assigned by a CEO
            photoURL: '',      // Default empty photo
        });

        // 4. Mark the document ID as used
        await updateDoc(docRef, {
            registeredBy: user.uid,
        });

        return { success: true, error: null };
    } catch (error: any) {
        if (error instanceof FirebaseError) {
             if (error.code === 'auth/email-already-in-use') {
                return { success: false, error: 'Este correo electrónico ya está en uso.' };
            }
        }
        return { success: false, error: error.message || 'Ocurrió un error desconocido durante el registro.' };
    }
}

export default function RegisterPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user, loading } = useAuth();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: "",
            documentId: "",
            email: "",
            password: "",
        },
    });

    React.useEffect(() => {
        if (!loading && user) {
            router.push("/");
        }
    }, [user, loading, router]);


    async function onSubmit(values: RegisterFormValues) {
        setIsSubmitting(true);
        const result = await handleRegistration(values);

        if (result.success) {
            toast({
                title: "¡Registro Exitoso!",
                description: "Ahora serás redirigido al panel principal.",
            });
            // The onAuthStateChanged listener in useAuth will handle the redirect automatically after sign-in
        } else {
            toast({
                variant: "destructive",
                title: "Error en el Registro",
                description: result.error,
            });
        }
        setIsSubmitting(false);
    }
    
    if (loading || user) {
        return null; // Or a loader, to prevent flicker while redirecting
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold text-primary">VIBRA OS</h1>
                <p className="text-muted-foreground">Gestión de Operaciones y Rendimiento</p>
            </div>
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl">Crear una Cuenta</CardTitle>
                    <CardDescription>
                        Ingresa tus datos para registrarte. Tu cédula debe estar pre-autorizada.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre Completo</FormLabel>
                                    <FormControl><Input placeholder="ej. Ana Pérez" {...field} disabled={isSubmitting} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="documentId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Número de Cédula</FormLabel>
                                    <FormControl><Input placeholder="Tu número de documento" {...field} disabled={isSubmitting} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Correo Electrónico</FormLabel>
                                    <FormControl><Input placeholder="usuario@vibra.fit" {...field} disabled={isSubmitting} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="password" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contraseña</FormLabel>
                                    <FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Registrarse
                            </Button>
                        </form>
                    </Form>
                    <p className="mt-4 text-center text-sm">
                        ¿Ya tienes una cuenta?{" "}
                        <Link href="/login" className="font-semibold text-primary hover:text-primary/90">
                            Inicia sesión
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
