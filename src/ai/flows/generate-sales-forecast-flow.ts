'use server';
/**
 * @fileOverview An AI agent for generating sales forecasts.
 *
 * - generateSalesForecast - A function that handles the sales forecast generation.
 * - GenerateSalesForecastInput - The input type for the function.
 * - GenerateSalesForecastOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateSalesForecastInputSchema = z.object({
  historicalRevenue: z.array(z.number()).describe('An array of the last few weeks of revenue, in COP.'),
  historicalNewMembers: z.array(z.number()).describe('An array of the last few weeks of new member counts.'),
  currentMonthRevenue: z.number().describe('The revenue accumulated so far in the current month, in COP.'),
  totalDaysInMonth: z.number().describe('The total number of days in the current month.'),
  elapsedDaysInMonth: z.number().describe('The number of days that have already passed in the current month.'),
  effectiveBusinessDaysPast: z.number().describe('The number of effective business days that have passed (L-V=1, Sáb/Festivo=0.5, Dom=0).'),
  effectiveBusinessDaysRemaining: z.number().describe('The number of effective business days remaining in the month (L-V=1, Sáb/Festivo=0.5, Dom=0).'),
});
export type GenerateSalesForecastInput = z.infer<typeof GenerateSalesForecastInputSchema>;

const GenerateSalesForecastOutputSchema = z.object({
  forecast: z.number().describe('The projected total sales revenue for the current month, as a single number in COP.'),
  reasoning: z.string().describe('A brief, one-sentence explanation of how the forecast was calculated, mentioning trends or key factors.'),
});
export type GenerateSalesForecastOutput = z.infer<typeof GenerateSalesForecastOutputSchema>;

export async function generateSalesForecast(input: GenerateSalesForecastInput): Promise<GenerateSalesForecastOutput> {
  return generateSalesForecastFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSalesForecastPrompt',
  input: {schema: GenerateSalesForecastInputSchema},
  output: {schema: GenerateSalesForecastOutputSchema},
  prompt: `Eres un analista financiero experto para una cadena de gimnasios en Colombia. Tu tarea es proporcionar un pronóstico de ventas para el mes actual, utilizando un enfoque comercial realista basado en los días hábiles.

Analiza los datos históricos y el progreso actual para proyectar las ventas totales del mes.

Reglas comerciales para el pronóstico:
- Los domingos no se generan ventas (0 días comerciales).
- Los sábados y días festivos se genera la mitad de las ventas de un día normal (0.5 días comerciales).
- Los lunes a viernes (no festivos) son días comerciales completos (1 día comercial).

Contexto del mes actual:
- Días totales del mes: {{totalDaysInMonth}}
- Días transcurridos: {{elapsedDaysInMonth}}
- Días comerciales efectivos transcurridos: {{effectiveBusinessDaysPast}}
- Días comerciales efectivos restantes: {{effectiveBusinessDaysRemaining}}
- Ingresos acumulados hasta la fecha: COP {{currentMonthRevenue}}

Datos históricos de semanas anteriores:
- Ingresos semanales: {{#each historicalRevenue}}COP {{this}}, {{/each}}
- Nuevos miembros semanales: {{#each historicalNewMembers}}{{this}}, {{/each}}

Pasos para tu cálculo:
1. Calcula los ingresos promedio por DÍA COMERCIAL EFECTIVO hasta ahora en el mes (Ingresos acumulados / Días comerciales efectivos transcurridos).
2. Proyecta los ingresos para el resto del mes multiplicando el ingreso promedio por día comercial efectivo por los días comerciales efectivos restantes.
3. Suma los ingresos acumulados más los ingresos proyectados para obtener el pronóstico total del mes.

Basado en este análisis, calcula un pronóstico de ventas y responde únicamente con el número final y una breve frase explicando tu razonamiento.
`,
});

const generateSalesForecastFlow = ai.defineFlow(
  {
    name: 'generateSalesForecastFlow',
    inputSchema: GenerateSalesForecastInputSchema,
    outputSchema: GenerateSalesForecastOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
