'use server';

import { db } from '@/lib/firebase';
import { collection, doc, getDocs, runTransaction, writeBatch } from 'firebase/firestore';
import type { DailyReport } from '@/lib/types';

export async function recalculateSiteRevenue(siteId: string): Promise<{ success: boolean; error?: string; total?: number }> {
    if (!siteId) {
        return { success: false, error: 'Se requiere el ID de la sede.' };
    }

    try {
        const reportsRef = collection(db, 'sites', siteId, 'daily-reports');
        const querySnapshot = await getDocs(reportsRef);

        if (querySnapshot.empty) {
            // If there are no reports, ensure the revenue is 0.
             const siteRef = doc(db, 'sites', siteId);
             await runTransaction(db, async (transaction) => {
                transaction.update(siteRef, { revenue: 0 });
             });
            return { success: true, total: 0 };
        }

        const totalRevenue = querySnapshot.docs.reduce((sum, doc) => {
            const report = doc.data() as DailyReport;
            // Ensure the value from the report is treated as a number
            return sum + Number(report.newRevenue || 0);
        }, 0);

        const siteRef = doc(db, 'sites', siteId);
        await runTransaction(db, async (transaction) => {
            transaction.update(siteRef, { revenue: totalRevenue });
        });

        return { success: true, total: totalRevenue };

    } catch (error) {
        console.error("Error recalculating site revenue:", error);
        const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
        return { success: false, error: `No se pudo recalcular los ingresos. Error: ${errorMessage}` };
    }
}
