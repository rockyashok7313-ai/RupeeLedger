import { NextResponse } from '../../next-response.ts';
import { suggestNarration } from '../../../src/ai/flows/ai-narration-suggester-flow.ts';
import { verifyIdToken, extractToken } from '../../../src/lib/auth-verify.ts';
import { z } from 'zod';

const suggestNarrationSchema = z.object({
  amount: z.union([z.number(), z.string()]),
  type: z.enum(['Credit', 'Debit']),
  descriptionHint: z.string().optional()
});

export async function POST(request: Request) {
  try {
    // 1. Authenticate Request
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }
    const decodedToken = await verifyIdToken(token);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
    }

    // 2. Validate Request Body
    const rawBody = await request.json();
    const parsed = suggestNarrationSchema.safeParse(rawBody);
    if (!parsed.success) {
      const errorMsg = parsed.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { amount, type, descriptionHint } = parsed.data;
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number.' }, { status: 400 });
    }

    const genkitInput = {
      transactionType: type,
      amount: numAmount,
      accountName: 'Cash/Bank',
      descriptionHint: descriptionHint || ''
    };

    // 3. Execute Suggestion
    const result = await suggestNarration(genkitInput);
    return NextResponse.json({ suggestion: result });
  } catch (error) {
    console.error('API Error in suggest-narration:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate narration suggestion.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
