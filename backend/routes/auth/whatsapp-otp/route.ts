import { NextResponse } from '../../../next-response.ts';
import { signAppToken } from '../../../../src/lib/auth-verify.ts';
import { sendWhatsappMessage } from '../../../utils/wasender.ts';
import { saveOtp, verifyOtp } from '../../../utils/otp-mongo.ts';
import { checkRateLimit } from '../../../utils/rate-limit.ts';
import { z } from 'zod';

const whatsappOtpSchema = z.object({
  phone: z.string().trim(),
  action: z.enum(['send', 'verify']),
  otp: z.string().trim().optional()
});

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    
    // Schema Validation
    const parsed = whatsappOtpSchema.safeParse(rawBody);
    if (!parsed.success) {
      const errorMsg = parsed.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }
    
    const { phone, action, otp: submittedOtp } = parsed.data;
    
    // Normalize: digits only
    const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
    if (normalizedPhone.length < 10) {
      return NextResponse.json({ error: 'Invalid phone number. Must be 10 digits.' }, { status: 400 });
    }
    
    // IP Rate Limiting (60 requests per 15 minutes window per IP)
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || '127.0.0.1';
    const rateLimitResult = await checkRateLimit(clientIp, 'whatsapp-otp', 60, 900);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ 
        error: 'Too many requests from this IP. Please try again in 15 minutes.' 
      }, { status: 429 });
    }

    // --- SEND OTP ---
    if (action === 'send') {
      const otp = generateOtp();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
      
      // Save and check identifier cooldown (60s minimum wait between WhatsApp texts)
      const saveResult = await saveOtp(normalizedPhone, otp, expiresAt);
      if (!saveResult.success) {
        return NextResponse.json({ error: saveResult.error }, { status: 429 });
      }

      const text = `Your RupeeLedger verification code is: *${otp}*.\nIt is valid for 10 minutes.`;
      
      const sendResult = await sendWhatsappMessage({
        to: normalizedPhone,
        text: text
      });

      return NextResponse.json({ 
        sent: true, 
        devOtp: process.env.NODE_ENV === 'development' || !process.env.WASENDER_API_KEY ? otp : undefined,
        mock: sendResult.mock
      });
    }

    // --- VERIFY OTP ---
    if (action === 'verify') {
      if (!submittedOtp) {
        return NextResponse.json({ verified: false, error: 'OTP is required.' }, { status: 400 });
      }
      
      const verifyResult = await verifyOtp(normalizedPhone, submittedOtp);
      if (!verifyResult.success) {
        return NextResponse.json({ verified: false, error: verifyResult.error }, { status: 400 });
      }
      
      const appToken = signAppToken('p_' + normalizedPhone);
      return NextResponse.json({ verified: true, token: appToken });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('Error in /api/auth/whatsapp-otp:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
