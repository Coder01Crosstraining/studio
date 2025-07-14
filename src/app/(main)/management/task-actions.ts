'use server';

import { db } from '@/lib/firebase';
import type { TaskFrequency } from '@/lib/types';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

interface CreateTaskTemplateValues {
    title: string;
    description: string;
    frequency: TaskFrequency;
    creatorId: string;
}

export async function createTaskTemplateAction(
  values: CreateTaskTemplateValues
): Promise<{ success: boolean; error?: string; }> {
    try {
        await addDoc(collection(db, 'task-templates'), {
            title: values.title,
            description: values.description,
            frequency: values.frequency,
            createdBy: values.creatorId,
            createdAt: serverTimestamp(),
            isActive: true,
        });
        return { success: true };
    } catch (error) {
        console.error("Error creating task template:", error);
        return { success: false, error: 'Ocurrió un error en el servidor. Inténtalo de nuevo.' };
    }
}
