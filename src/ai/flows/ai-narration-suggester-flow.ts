/**
 * @fileOverview An AI tool that suggests concise and relevant narrations for financial transactions.
 *
 * - suggestNarration - A function that handles the narration suggestion process.
 * - AiNarrationSuggesterInput - The input type for the suggestNarration function.
 * - AiNarrationSuggesterOutput - The return type for the suggestNarration function.
 */

import { ai } from '../../ai/genkit';
import { z } from 'genkit';

const AiNarrationSuggesterInputSchema = z.object({
  transactionType: z.enum(['Credit', 'Debit']).describe('The type of transaction (Credit or Debit).'),
  amount: z.number().positive().describe('The amount of the transaction in Indian Rupees (INR).'),
  accountName: z.string().describe('The name of the account involved in the transaction (e.g., Cash, Bank, Savings).'),
  descriptionHint: z.string().optional().describe('An optional hint or additional detail for the transaction to guide narration.'),
});
export type AiNarrationSuggesterInput = z.infer<typeof AiNarrationSuggesterInputSchema>;

const AiNarrationSuggesterOutputSchema = z.string().describe('A concise and relevant suggested narration for the transaction.');
export type AiNarrationSuggesterOutput = z.infer<typeof AiNarrationSuggesterOutputSchema>;

export async function suggestNarration(input: AiNarrationSuggesterInput): Promise<AiNarrationSuggesterOutput> {
  return aiNarrationSuggesterFlow(input);
}

const aiNarrationSuggesterPrompt = ai.definePrompt({
  name: 'aiNarrationSuggesterPrompt',
  input: { schema: AiNarrationSuggesterInputSchema },
  output: { schema: AiNarrationSuggesterOutputSchema },
  prompt: `You are an accounting assistant. Your task is to suggest a concise and relevant narration or particular for a financial transaction.

Transaction Details:
- Type: {{{transactionType}}}
- Account: {{{accountName}}}
- Amount: INR {{{amount}}}
{{#if descriptionHint}}- Hint: {{{descriptionHint}}}{{/if}}

Based on these details, provide a short, professional narration. Focus on the core nature of the transaction.

Example Output: Payment for office supplies.

Narration:`,
});

const aiNarrationSuggesterFlow = ai.defineFlow(
  {
    name: 'aiNarrationSuggesterFlow',
    inputSchema: AiNarrationSuggesterInputSchema,
    outputSchema: AiNarrationSuggesterOutputSchema,
  },
  async (input) => {
    const { output } = await aiNarrationSuggesterPrompt(input);
    if (!output) {
      throw new Error('Failed to generate narration.');
    }
    return output;
  }
);
