'use server';

import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

interface CompleteTaskParams {
    templateId: string;
    siteId: string;
    userId: string;
}

export async function completeTaskAction(params: CompleteTaskParams): Promise<{ success: boolean; error?: string; }> {
    try {
        const { templateId, siteId, userId } = params;

        if (!templateId || !siteId || !userId) {
            return { success: false, error: 'Faltan datos para completar la tarea.' };
        }

        const instanceCollectionRef = collection(db, 'sites', siteId, 'task-instances');
        
        await addDoc(instanceCollectionRef, {
            templateId: templateId,
            siteId: siteId,
            completedBy: userId,
            completedAt: serverTimestamp(),
            status: 'completed',
        });

        return { success: true };
    } catch (error) {
        console.error("Error completing task:", error);
        return { success: false, error: 'Ocurrió un error en el servidor. Inténtalo de nuevo.' };
    }
}
