import { NextResponse } from 'next/server';
import { signAppToken } from '@/lib/auth-verify';
import nodemailer from 'nodemailer';

// In-memory OTP store: email -> { otp, expiresAt }
// Works fine for single-instance serverless; upgrade to Redis for scale.
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function cleanExpired() {
  const now = Date.now();
  for (const [key, val] of otpStore.entries()) {
    if (val.expiresAt < now) otpStore.delete(key);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, action, otp: submittedOtp } = body;

    if (!email || !action) {
      return NextResponse.json({ error: 'Missing email or action.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    cleanExpired();

    // --- SEND OTP ---
    if (action === 'send') {
      const otp = generateOtp();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
      otpStore.set(normalizedEmail, { otp, expiresAt });

      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpFrom = process.env.SMTP_FROM || 'noreply@rupeeledger.com';

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc;">
          <div style="text-align:center; margin-bottom: 20px;">
            <div style="display:inline-block; background:#1e3a5f; color:white; font-size:28px; font-weight:900; width:56px; height:56px; line-height:56px; border-radius:14px; text-align:center;">₹</div>
            <h2 style="color:#0f172a; margin-top:12px;">RupeeLedger Login OTP</h2>
          </div>
          <p style="color:#475569;">Use the code below to log into your RupeeLedger account. This code expires in <strong>10 minutes</strong>.</p>
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
          subject: `${otp} — Your RupeeLedger Login Code`,
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
      const record = otpStore.get(normalizedEmail);
      if (!record) {
        return NextResponse.json({ verified: false, error: 'OTP expired or not found. Please request a new one.' }, { status: 400 });
      }
      if (Date.now() > record.expiresAt) {
        otpStore.delete(normalizedEmail);
        return NextResponse.json({ verified: false, error: 'OTP has expired. Please request a new one.' }, { status: 400 });
      }
      if (submittedOtp.trim() !== record.otp) {
        return NextResponse.json({ verified: false, error: 'Incorrect OTP.' }, { status: 400 });
      }
      otpStore.delete(normalizedEmail);
      const appToken = signAppToken('e_' + normalizedEmail);
      return NextResponse.json({ verified: true, token: appToken });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('Error in /api/auth/email-otp:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
