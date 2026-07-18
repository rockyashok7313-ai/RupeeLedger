import { NextResponse } from '../../../next-response.ts';
import { verifyIdToken, extractToken } from '../../../../src/lib/auth-verify.ts';
import { sendWhatsappMessage } from '../../../utils/wasender.ts';
import { z } from 'zod';

const whatsappSendSchema = z.object({
  to: z.string().trim().min(1, 'Recipient phone "to" is required.'),
  text: z.string().trim().min(1, 'Text message is required.'),
  documentUrl: z.string().trim().optional(),
  wasenderApiKey: z.string().trim().optional()
});

export async function POST(request: Request) {
  try {
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    const decodedToken = await verifyIdToken(token);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const rawBody = await request.json();
    const parsed = whatsappSendSchema.safeParse(rawBody);
    if (!parsed.success) {
      const errorMsg = parsed.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }
    
    const { to, text, documentUrl, wasenderApiKey } = parsed.data;

    const result = await sendWhatsappMessage({
      to,
      text,
      documentUrl,
      customApiKey: wasenderApiKey
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send WhatsApp message.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      mock: result.mock,
      data: result.data
    });
  } catch (error: any) {
    console.error('Error in /api/whatsapp/send:', error);
    return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
  }
}
