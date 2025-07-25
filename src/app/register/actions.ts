'use server';

import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import type { RegisterFormValues } from "./schema";

export async function verifyDocument(documentId: string): Promise<{ success: boolean, error?: string }> {
    if (!documentId || documentId.length < 5) {
        return { success: false, error: 'El número de cédula es muy corto.' };
    }
    
    try {
        const docRef = doc(db, 'documentId', documentId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return { success: false, error: 'Cédula no autorizada para el registro.' };
        }

        const docData = docSnap.data();
        if (docData.registeredBy) {
            return { success: false, error: 'Esta cédula ya ha sido registrada por otro usuario.' };
        }

        return { success: true };
    } catch (error) {
        console.error("Error verifying document:", error);
        return { success: false, error: 'Ocurrió un error al verificar la cédula.' };
    }
}

export async function handleRegistration(values: RegisterFormValues) {
    try {
        // 1. Re-validate document ID on the server as a security measure
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
            status: 'active',  // Default status for new users
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
