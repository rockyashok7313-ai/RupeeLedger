import { NextResponse } from 'next/server';

// In-memory WhatsApp OTP store: phone -> { otp, expiresAt }
const whatsappOtpStore = new Map<string, { otp: string; expiresAt: number }>();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function cleanExpired() {
  const now = Date.now();
  for (const [key, val] of whatsappOtpStore.entries()) {
    if (val.expiresAt < now) whatsappOtpStore.delete(key);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, action, otp: submittedOtp } = body;

    if (!phone || !action) {
      return NextResponse.json({ error: 'Missing phone or action.' }, { status: 400 });
    }

    // Normalize: digits only
    const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
    if (normalizedPhone.length < 10) {
      return NextResponse.json({ error: 'Invalid phone number. Must be 10 digits.' }, { status: 400 });
    }

    cleanExpired();

    // --- SEND OTP ---
    if (action === 'send') {
      const otp = generateOtp();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
      whatsappOtpStore.set(normalizedPhone, { otp, expiresAt });

      // Simulate sending WhatsApp message
      console.log(`[WHATSAPP OTP] Sent to +91${normalizedPhone}: ${otp}`);
      return NextResponse.json({ sent: true, devOtp: otp });
    }

    // --- VERIFY OTP ---
    if (action === 'verify') {
      if (!submittedOtp) {
        return NextResponse.json({ verified: false, error: 'OTP is required.' }, { status: 400 });
      }
      const record = whatsappOtpStore.get(normalizedPhone);
      if (!record) {
        return NextResponse.json({ verified: false, error: 'OTP expired or not found. Please request a new one.' }, { status: 400 });
      }
      if (Date.now() > record.expiresAt) {
        whatsappOtpStore.delete(normalizedPhone);
        return NextResponse.json({ verified: false, error: 'OTP has expired. Please request a new one.' }, { status: 400 });
      }
      if (submittedOtp.trim() !== record.otp) {
        return NextResponse.json({ verified: false, error: 'Incorrect OTP. Please try again.' }, { status: 400 });
      }
      whatsappOtpStore.delete(normalizedPhone); // Single-use
      return NextResponse.json({ verified: true });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('Error in /api/auth/whatsapp-otp:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
