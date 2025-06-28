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
  prompt: `Eres un analista financiero experto para una cadena de gimnasios en Colombia. Tu tarea es proporcionar un pronóstico de ventas para el mes actual basado en los datos proporcionados.

**Regla crítica: SOLO puedes hacer una proyección si existen reportes diarios históricos. Si el arreglo de ingresos históricos está vacío, el pronóstico DEBE ser igual a las ventas actuales y el razonamiento debe explicar que no hay datos para proyectar.**

**Datos de entrada:**
- Ventas acumuladas hasta la fecha: COP {{currentMonthRevenue}}
- Ingresos de reportes diarios recientes: {{#if historicalRevenue}} [{{#each historicalRevenue}}COP {{this}}{{#unless @last}}, {{/unless}}{{/each}}] {{else}} (No hay reportes) {{/if}}
- Días comerciales efectivos que han pasado: {{effectiveBusinessDaysPast}}
- Días comerciales efectivos restantes: {{effectiveBusinessDaysRemaining}}

**Instrucciones de cálculo:**

{{#if historicalRevenue}}
**CASO 1: Hay reportes históricos. Se puede proyectar.**

1.  **Calcular Promedio de Ventas Diario:**
    *   Si \`{{effectiveBusinessDaysPast}}\` es mayor que 0, el promedio es \`{{currentMonthRevenue}} / {{effectiveBusinessDaysPast}}\`.
    *   Si \`{{effectiveBusinessDaysPast}}\` es 0 (inicio del mes), calcula el promedio de \`historicalRevenue\`.
2.  **Calcular Ventas Proyectadas:** \`Promedio de Ventas Diario * {{effectiveBusinessDaysRemaining}}\`.
3.  **Calcular Pronóstico Total:** \`{{currentMonthRevenue}} + Ventas Proyectadas\`.
4.  **Generar Respuesta:**
    *   \`forecast\`: El valor del "Pronóstico Total".
    *   \`reasoning\`: "Proyección basada en el rendimiento promedio hasta la fecha y los días comerciales restantes."

{{else}}
**CASO 2: No hay reportes históricos. NO se puede proyectar.**

1.  **Calcular Pronóstico Total:** El pronóstico es simplemente \`{{currentMonthRevenue}}\`.
2.  **Generar Respuesta:**
    *   \`forecast\`: El valor de \`{{currentMonthRevenue}}\`.
    *   \`reasoning\`: "El pronóstico corresponde a las ventas actuales. No hay suficientes datos de reportes diarios para realizar una proyección precisa."
{{/if}}

Analiza los datos de entrada y sigue estrictamente las instrucciones para el caso que aplique. Proporciona tu respuesta en el formato JSON solicitado.
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
