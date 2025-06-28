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
  prompt: `Eres un analista financiero experto para una cadena de gimnasios en Colombia. Tu tarea es proporcionar un pronóstico de ventas para el mes actual basado en la fórmula que te proporciono.

Analiza los datos de ventas y el progreso actual para proyectar las ventas totales del mes. Basa tu pronóstico EXCLUSIVAMENTE en los ingresos por ventas.

Contexto del mes actual:
- Días transcurridos en el mes: {{elapsedDaysInMonth}}
- Días comerciales efectivos restantes en el mes: {{effectiveBusinessDaysRemaining}}
- Ventas acumuladas hasta la fecha: COP {{currentMonthRevenue}}
- Datos históricos de días anteriores (solo para referencia si aún no han pasado días): {{#each historicalRevenue}}COP {{this}}, {{/each}}

Sigue estos pasos EXACTOS para tu cálculo:

1.  Determina el "Promedio de Ventas Diario" a utilizar para la proyección.
    *   **CASO A:** Si los "Días transcurridos en el mes" ({{elapsedDaysInMonth}}) es mayor que 0, calcula el promedio así: (Ventas acumuladas hasta la fecha / Días transcurridos en el mes).
    *   **CASO B:** Si los "Días transcurridos en el mes" es 0 Y existen "Datos históricos", calcula el promedio de los "Datos históricos".
    *   **CASO C:** Si los "Días transcurridos en el mes" es 0 Y NO existen "Datos históricos", el "Promedio de Ventas Diario" es 0. No es posible hacer una proyección.

2.  Calcula las "Ventas Proyectadas" para el resto del mes. La fórmula es: ("Promedio de Ventas Diario" * Días comerciales efectivos restantes). Si el promedio es 0, las ventas proyectadas son 0.

3.  Calcula el "Pronóstico Total del Mes". La fórmula es: (Ventas acumuladas hasta la fecha + Ventas Proyectadas).

Basado en este cálculo, responde con el número final del pronóstico.
Para el razonamiento, sigue estas reglas:
*   Si usaste el **CASO A**, el razonamiento debe ser: "Calculado en base al promedio de ventas de los {{elapsedDaysInMonth}} días transcurridos y los días comerciales restantes."
*   Si usaste el **CASO B**, el razonamiento debe ser: "Proyección basada en el rendimiento histórico y los días comerciales restantes, ya que el mes acaba de comenzar."
*   Si usaste el **CASO C**, el razonamiento debe ser: "El pronóstico corresponde a las ventas actuales. No hay suficientes datos históricos o del mes en curso para realizar una proyección."
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
