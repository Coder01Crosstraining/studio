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
  prompt: `Eres un analista financiero para una cadena de gimnasios. Tu tarea es proporcionar un pronóstico de ventas para el mes actual.

Analiza los datos históricos y los ingresos actuales para proyectar las ventas totales del mes.

Datos históricos (últimas semanas):
- Ingresos semanales: {{#each historicalRevenue}}COP {{this}}, {{/each}}
- Nuevos miembros semanales: {{#each historicalNewMembers}}{{this}}, {{/each}}

Progreso del mes actual:
- Ingresos hasta la fecha este mes: COP {{currentMonthRevenue}}

Basado en estos datos, calcula un pronóstico de ventas realista para todo el mes. Responde únicamente con el número final del pronóstico y una breve frase explicando tu razonamiento. Considera las tendencias en ingresos y adquisición de nuevos miembros.
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
