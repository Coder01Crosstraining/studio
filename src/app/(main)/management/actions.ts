'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export async function authorizeDocumentAction(documentId: string): Promise<{ success: boolean; error?: string }> {
  if (!documentId || documentId.length < 5) {
    return { success: false, error: 'El número de cédula es muy corto.' };
  }

  try {
    const docRef = doc(db, 'documentId', documentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { success: false, error: 'Esta cédula ya ha sido autorizada previamente.' };
    }

    await setDoc(docRef, {
      registeredBy: null,
    });

    return { success: true };
  } catch (error) {
    console.error("Error authorizing new user:", error);
    return { success: false, error: 'Ocurrió un error en el servidor. Inténtalo de nuevo.' };
  }
}
