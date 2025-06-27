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
  historicalRevenue: z.array(z.number()).describe('Un arreglo con los ingresos de los últimos días, en COP.'),
  currentMonthRevenue: z.number().describe('Los ingresos acumulados hasta ahora en el mes actual, en COP.'),
  totalDaysInMonth: z.number().describe('El número total de días en el mes actual.'),
  elapsedDaysInMonth: z.number().describe('El número de días que ya han pasado en el mes actual.'),
  effectiveBusinessDaysPast: z.number().describe('El número de días comerciales efectivos que han pasado (L-V=1, Sáb/Festivo=0.5, Dom=0).'),
  effectiveBusinessDaysRemaining: z.number().describe('El número de días comerciales efectivos restantes en el mes (L-V=1, Sáb/Festivo=0.5, Dom=0).'),
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

Analiza los datos históricos de ventas y el progreso actual para proyectar las ventas totales del mes. Basa tu pronóstico EXCLUSIVAMENTE en los ingresos por ventas y no en otras métricas como el ticket promedio o el número de miembros.

Reglas comerciales para el pronóstico:
- Los domingos no se generan ventas (0 días comerciales).
- Los sábados y días festivos se genera la mitad de las ventas de un día normal (0.5 días comerciales).
- Los lunes a viernes (no festivos) son días comerciales completos (1 día comercial).

Contexto del mes actual:
- Días totales del mes: {{totalDaysInMonth}}
- Días transcurridos: {{elapsedDaysInMonth}}
- Días comerciales efectivos transcurridos: {{effectiveBusinessDaysPast}}
- Días comerciales efectivos restantes: {{effectiveBusinessDaysRemaining}}
- Ventas acumuladas hasta la fecha: COP {{currentMonthRevenue}}

Datos históricos de días anteriores:
- Ventas diarias históricas: {{#each historicalRevenue}}COP {{this}}, {{/each}}

Pasos para tu cálculo:
1.  Calcula las ventas promedio por DÍA COMERCIAL EFECTIVO.
    *   Si los "Días comerciales efectivos transcurridos" es mayor que 0, el promedio es: (Ventas acumuladas hasta la fecha / Días comerciales efectivos transcurridos).
    *   Si los "Días comerciales efectivos transcurridos" es 0, usa el promedio de las ventas diarias históricas que tienes como la venta promedio por DÍA COMERCIAL EFECTIVO.
2.  Proyecta las ventas para el resto del mes: (venta promedio por DÍA COMERCIAL EFECTIVO * Días comerciales efectivos restantes).
3.  Calcula el pronóstico total: (Ventas acumuladas hasta la fecha + ventas proyectadas).

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
