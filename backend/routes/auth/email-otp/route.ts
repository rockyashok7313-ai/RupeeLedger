import { NextResponse } from '../../../next-response.ts';
import { signAppToken } from '../../../../src/lib/auth-verify.ts';
import { saveOtp, verifyOtp } from '../../../utils/otp-mongo.ts';
import { checkRateLimit } from '../../../utils/rate-limit.ts';
import nodemailer from 'nodemailer';
import { z } from 'zod';

const emailOtpSchema = z.object({
  email: z.string().trim().email('Invalid email format.'),
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
    const parsed = emailOtpSchema.safeParse(rawBody);
    if (!parsed.success) {
      const errorMsg = parsed.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }
    
    const { email, action, otp: submittedOtp } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    
    // IP Rate Limiting (60 requests per 15 minutes window per IP)
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || '127.0.0.1';
    const rateLimitResult = await checkRateLimit(clientIp, 'email-otp', 60, 900);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ 
        error: 'Too many requests from this IP. Please try again in 15 minutes.' 
      }, { status: 429 });
    }

    // --- SEND OTP ---
    if (action === 'send') {
      const otp = generateOtp();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
      
      // Save and check identifier cooldown (60s minimum wait between emails)
      const saveResult = await saveOtp(normalizedEmail, otp, expiresAt);
      if (!saveResult.success) {
        return NextResponse.json({ error: saveResult.error }, { status: 429 });
      }

      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpFrom = process.env.SMTP_FROM || 'noreply@rupeeledgerpro.com';

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc;">
          <div style="text-align:center; margin-bottom: 20px;">
            <div style="display:inline-block; background:#1e3a5f; color:white; font-size:28px; font-weight:900; width:56px; height:56px; line-height:56px; border-radius:14px; text-align:center;">₹</div>
            <h2 style="color:#0f172a; margin-top:12px;">RupeeLedger Pro Login OTP</h2>
          </div>
          <p style="color:#475569;">Use the code below to log into your RupeeLedger Pro account. This code expires in <strong>10 minutes</strong>.</p>
          <div style="background:#fff; border: 2px dashed #cbd5e1; border-radius:8px; text-align:center; padding:20px; margin:20px 0;">
            <span style="font-size:36px; font-weight:900; letter-spacing:8px; font-family:monospace; color:#1e3a5f;">${otp}</span>
          </div>
          <p style="color:#94a3b8; font-size:12px; text-align:center;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `;

      if (smtpHost && smtpPort && smtpUser && smtpPass) {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(smtpPort),
          secure: Number(smtpPort) === 465,
          auth: { user: smtpUser, pass: smtpPass },
        });
        await transporter.sendMail({
          from: smtpFrom,
          to: normalizedEmail,
          subject: `${otp} — Your RupeeLedger Pro Login Code`,
          html: htmlContent,
        });
        return NextResponse.json({ sent: true });
      } else {
        // SMTP not configured — return OTP in response for dev/demo mode
        console.warn(`[EMAIL OTP - SMTP not configured] OTP for ${normalizedEmail}: ${otp}`);
        return NextResponse.json({ sent: true, devOtp: otp });
      }
    }

    // --- VERIFY OTP ---
    if (action === 'verify') {
      if (!submittedOtp) {
        return NextResponse.json({ verified: false, error: 'OTP is required.' }, { status: 400 });
      }
      
      const verifyResult = await verifyOtp(normalizedEmail, submittedOtp);
      if (!verifyResult.success) {
        return NextResponse.json({ verified: false, error: verifyResult.error }, { status: 400 });
      }
      
      const appToken = signAppToken('e_' + normalizedEmail);
      return NextResponse.json({ verified: true, token: appToken });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('Error in /api/auth/email-otp:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
