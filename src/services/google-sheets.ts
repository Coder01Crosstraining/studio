
'use server';
import { google } from 'googleapis';
import type { Site } from '@/lib/types';

// The range K2:P3 will be fetched, but we'll assume the relevant
// NPS value is always in the first cell of the second row of the range (K3).
const SPREADSHEET_DATA_RANGE = 'K2:P3';

export async function getMonthlyNpsForSite(site: Site): Promise<number> {
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

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: site.spreadsheetId,
      range: SPREADSHEET_DATA_RANGE,
    });

    const rows = response.data.values;
    // Check if we got at least two rows and the second row has at least one cell.
    if (!rows || rows.length < 2 || !rows[1] || rows[1].length < 1) {
      throw new Error('No se encontraron suficientes datos en el rango esperado de la hoja de cálculo.');
    }

    // The first cell of the second row (K3) is assumed to hold the current month's NPS.
    const npsValueString = rows[1][0]?.replace(',', '.').trim() || '0';
    const npsValue = parseFloat(npsValueString);
    
    if (isNaN(npsValue)) {
      throw new Error(`El valor de NPS obtenido ("${rows[1][0]}") no es un número válido.`);
    }

    return npsValue;
  } catch (error) {
    console.error('Error fetching NPS from Google Sheets:', error);
    if (error instanceof Error) {
        if (error.message.includes('permission') || error.message.includes('denied')) {
             throw new Error(`Error de permisos. Verifica que la hoja de cálculo sea compartida con '${clientEmail}' con rol de 'Lector'.`);
        }
        if (error.message.includes('Unable to parse range')) {
             throw new Error(`El rango '${SPREADSHEET_DATA_RANGE}' no es válido o no existe en la hoja.`);
        }
        if (error.message.includes('Requested entity was not found')) {
            throw new Error(`No se encontró la hoja de cálculo con ID: ${site.spreadsheetId}. Verifica el ID.`);
        }
        // Propagate my custom errors
        if (error.message.startsWith('No se encontraron suficientes datos') || error.message.startsWith('El valor de NPS obtenido')) {
            throw error;
        }
    }
    // Generic fallback error
    throw new Error('No se pudo obtener el valor de NPS desde Google Sheets.');
  }
}
