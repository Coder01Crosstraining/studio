'use server';

import * as z from "zod";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { FirebaseError } from "firebase/app";

export const registerSchema = z.object({
  name: z.string().min(3, "El nombre completo es requerido."),
  documentId: z.string().min(5, "El número de cédula es requerido."),
  email: z.string().email("Por favor, introduce un correo válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

export async function handleRegistration(values: RegisterFormValues) {
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
