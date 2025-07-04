
'use server';
import { google } from 'googleapis';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Site } from '@/lib/types';

const SPREADSHEET_DATA_RANGE = 'K2:P3';

export async function getMonthlyNpsForSite(site: Site): Promise<number> {
  if (!site.spreadsheetId) {
    throw new Error(`La sede ${site.name} no tiene un ID de hoja de cálculo configurado.`);
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: site.spreadsheetId,
      range: SPREADSHEET_DATA_RANGE,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      throw new Error('No se encontraron suficientes datos en la hoja de cálculo.');
    }

    const [headerRow, valueRow] = rows;
    const currentMonthName = format(new Date(), 'MMMM', { locale: es });
    
    // Find the column index for the current month (case-insensitive)
    const monthIndex = headerRow.findIndex(
      (month: string) => month.trim().toLowerCase() === currentMonthName.toLowerCase()
    );

    if (monthIndex === -1) {
      throw new Error(`No se encontró la columna para el mes de ${currentMonthName} en la hoja de cálculo.`);
    }

    const npsValueString = valueRow[monthIndex]?.replace(',', '.').trim() || '0';
    const npsValue = parseFloat(npsValueString);
    
    if (isNaN(npsValue)) {
      throw new Error(`El valor de NPS para ${currentMonthName} ("${valueRow[monthIndex]}") no es un número válido.`);
    }

    return npsValue;
  } catch (error) {
    console.error('Error fetching NPS from Google Sheets:', error);
    if (error instanceof Error && error.message.includes('permission')) {
         throw new Error('Error de permisos. Verifica que la cuenta de servicio tenga acceso a la hoja de cálculo.');
    }
    throw new Error('No se pudo obtener el valor de NPS desde Google Sheets.');
  }
}
