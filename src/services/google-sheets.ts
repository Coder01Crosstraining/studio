
'use server';
import { google } from 'googleapis';
import type { Site, SiteId } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { isSameDay, format } from 'date-fns';
import { es } from 'date-fns/locale';


// The range K2:P3 will be fetched. The logic will dynamically find the column
// for the current month within this range.
const SPREADSHEET_DATA_RANGE = 'K2:P3';

async function getMonthlyNpsForSite(site: Site): Promise<number> {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error('Las credenciales de Google Sheets no están configuradas en el servidor. Contacta a soporte.');
  }

  if (!site.spreadsheetId) {
    throw new Error(`La sede ${site.name} no tiene un ID de hoja de cálculo configurado.`);
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    let dataRange = SPREADSHEET_DATA_RANGE;

    // If a GID is provided, find the sheet name and prepend it to the range.
    if (site.spreadsheetGid) {
        try {
            const spreadsheetMeta = await sheets.spreadsheets.get({
                spreadsheetId: site.spreadsheetId,
            });

            const targetSheet = spreadsheetMeta.data.sheets?.find(
                (s) => s.properties?.sheetId?.toString() === site.spreadsheetGid
            );

            if (targetSheet?.properties?.title) {
                dataRange = `'${targetSheet.properties.title}'!${SPREADSHEET_DATA_RANGE}`;
            } else {
                console.warn(`GID ${site.spreadsheetGid} for site ${site.name} not found in spreadsheet. Falling back to first sheet.`);
            }
        } catch (e) {
            console.error(`Error getting sheet metadata for ${site.name}`, e);
            // Fallback to default range if metadata fails, but log the error
        }
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: site.spreadsheetId,
      range: dataRange,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2 || !rows[0] || !rows[1]) {
      throw new Error('No se encontraron suficientes datos en el rango esperado de la hoja de cálculo.');
    }

    const headers = rows[0].map(h => typeof h === 'string' ? h.toLowerCase() : '');
    const values = rows[1];

    const now = new Date();
    // format 'MMMM' gives full month name, e.g., "julio", "agosto"
    const currentMonthName = format(now, 'MMMM', { locale: es }); 

    const columnIndex = headers.findIndex(header => header.includes(currentMonthName));

    if (columnIndex === -1) {
      throw new Error(`No se pudo encontrar la columna de NPS para el mes actual (${currentMonthName}) en la hoja de cálculo. Verifique que el encabezado de la columna (ej. "nps promedio ${currentMonthName}") sea correcto.`);
    }
    
    const npsValueString = values[columnIndex]?.replace(',', '.').trim() || '0';
    const npsValue = parseFloat(npsValueString);
    
    if (isNaN(npsValue)) {
      throw new Error(`El valor de NPS obtenido ("${values[columnIndex]}") para '${currentMonthName}' no es un número válido.`);
    }

    // Round to one decimal place before returning
    return parseFloat(npsValue.toFixed(1));
    
  } catch (error) {
    console.error(`Error fetching NPS from Google Sheets for site '${site.name}' (ID: ${site.spreadsheetId}):`, error);
    if (error instanceof Error) {
        if (error.message.includes('permission') || error.message.includes('denied')) {
             throw new Error(`Error de permisos. Verifica que la hoja de cálculo sea compartida con '${clientEmail}' con rol de 'Lector'.`);
        }
        if (error.message.includes('Unable to parse range')) {
             throw new Error(`El rango '${dataRange}' no es válido o no existe en la hoja.`);
        }
        if (error.message.includes('Requested entity was not found')) {
            throw new Error(`No se encontró la hoja de cálculo con ID: ${site.spreadsheetId}. Verifica el ID.`);
        }
        // Propagate my custom errors
        if (error.message.startsWith('No se encontraron suficientes datos') || error.message.startsWith('El valor de NPS obtenido') || error.message.startsWith('No se pudo encontrar la columna')) {
            throw error;
        }
    }
    // Generic fallback error
    throw new Error('No se pudo obtener el valor de NPS desde Google Sheets.');
  }
}

export async function updateNpsForSiteIfStale(siteId: SiteId): Promise<void> {
  const siteRef = doc(db, 'sites', siteId);
  const siteDoc = await getDoc(siteRef);

  if (!siteDoc.exists()) {
    throw new Error('Site document not found.');
  }

  const site = { id: siteDoc.id, ...siteDoc.data() } as Site;

  if (!site.spreadsheetId) {
    console.log(`Skipping NPS update for ${site.name}: No spreadsheet ID configured.`);
    return;
  }

  const lastUpdate = site.npsLastUpdatedAt?.toDate();
  const now = new Date();

  // If NPS was already updated today, do nothing.
  if (lastUpdate && isSameDay(lastUpdate, now)) {
    console.log(`NPS for ${site.name} is already up-to-date for today.`);
    return;
  }

  console.log(`NPS for ${site.name} is stale or has never been updated. Fetching new value...`);
  try {
    const newNps = await getMonthlyNpsForSite(site);
    
    await updateDoc(siteRef, {
      nps: newNps,
      npsLastUpdatedAt: serverTimestamp(),
    });
    
    console.log(`Successfully updated NPS for ${site.name} to ${newNps}.`);
  } catch (error) {
    console.error(`Failed to update NPS for site ${site.id}:`, error);
    // We don't re-throw the error here to avoid breaking the UI if the update fails.
    // The error is already logged to the server console.
  }
}
