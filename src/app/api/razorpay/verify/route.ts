import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getMongoDb, isMongoConfigured } from '@/lib/mongodb';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, duration, email, purchaserContact } = body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return NextResponse.json({ verified: false, error: 'Missing parameters.' }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    const generateKeyString = () => {
      const prefix = duration === 'annual' ? 'YEAR' : 'MONTH';
      const seg = () => Math.random().toString(36).substring(2, 6).toUpperCase();
      return `RL-${prefix}-${seg()}-${seg()}-${seg()}`;
    };

    const durationDays = duration === 'annual' ? 365 : 30;

    // Helper to generate and save key in MongoDB
    const createAndSaveKey = async (payId: string) => {
      const newKeyStr = generateKeyString();
      if (isMongoConfigured()) {
        const db = await getMongoDb();
        await db.collection('keys').updateOne(
          { _id: newKeyStr as any },
          {
            $set: {
              createdAt: Date.now(),
              durationDays,
              createdBy: userId || 'anonymous_buyer',
              status: 'unused',
              paymentId: payId
            }
          },
          { upsert: true }
        );
      } else {
        console.warn('MongoDB not configured. Mocking activation key save.');
      }
      return newKeyStr;
    };

    // Helper to send email to customer
    const sendEmailToCustomer = async (recipientEmail: string, licenseKey: string) => {
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpFrom = process.env.SMTP_FROM || "noreply@rupeeledger.com";

      const subject = `Your RupeeLedger Pro Activation Key (${duration === 'annual' ? 'Annual' : 'Monthly'})`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #13315e; text-align: center;">Welcome to RupeeLedger Pro!</h2>
          <p>Thank you for buying a subscription. Your payment has been verified successfully.</p>
          <p>Below is your unique Pro activation license key:</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; text-align: center; border: 1px dashed #cbd5e1; margin: 20px 0;">
            <code style="font-size: 20px; font-weight: bold; color: #0f172a; font-family: monospace; letter-spacing: 1px;">${licenseKey}</code>
          </div>
          <p><strong>Instructions:</strong></p>
          <ol>
            <li>Copy the code above.</li>
            <li>Go to the settings section of the RupeeLedger application.</li>
            <li>Paste it in the <strong>"Activate Activation Key"</strong> field and click <strong>"Activate"</strong>.</li>
          </ol>
          <p style="margin-top: 30px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px;">
            This email was sent automatically following a successful payment verification. Please do not reply directly to this mail.
          </p>
        </div>
      `;

      if (smtpHost && smtpPort && smtpUser && smtpPass) {
        try {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(smtpPort),
            secure: Number(smtpPort) === 465,
            auth: {
              user: smtpUser,
              pass: smtpPass
            }
          });

          await transporter.sendMail({
            from: smtpFrom,
            to: recipientEmail,
            subject,
            html: htmlContent
          });
          console.log(`Email sent successfully to ${recipientEmail} for payment ${razorpay_payment_id}`);
        } catch (err) {
          console.error(`Failed to send email to ${recipientEmail} using SMTP:`, err);
        }
      } else {
        console.warn(`[SMTP NOT CONFIGURED] Simulated email delivery:
To: ${recipientEmail}
Subject: ${subject}
License Key: ${licenseKey}
Order ID: ${razorpay_order_id}
Payment ID: ${razorpay_payment_id}
        `);
      }
    };

    // Helper to send SMS key delivery notification to mobile
    const sendSmsToCustomer = async (recipientMobile: string, licenseKey: string) => {
      // Simulate SMS dispatch to the customer's phone number
      console.log(`[SMS KEY DISPATCH] Delivering ${duration === 'annual' ? 'Annual' : 'Monthly'} Key: ${licenseKey} to mobile +91${recipientMobile}`);
    };

    // Helper to dispatch key based on the purchaser contact field
    const dispatchKeyToContact = async (licenseKey: string) => {
      const contactVal = (purchaserContact || email || '').trim();
      if (!contactVal) return;

      if (contactVal.includes('@')) {
        await sendEmailToCustomer(contactVal, licenseKey);
      } else {
        // Strip out non-digits to isolate the 10 digit mobile
        const normalizedMobile = contactVal.replace(/\D/g, '').slice(-10);
        if (normalizedMobile.length === 10) {
          await sendSmsToCustomer(normalizedMobile, licenseKey);
        }
      }
    };

    // Fallback for local sandbox/testing if credentials are not configured
    if (!keyId || !keySecret) {
      if (razorpay_order_id.startsWith('order_mock_')) {
        console.log('Using mock verification because keys are missing in environment.');
        const newKey = await createAndSaveKey(razorpay_payment_id);
        await dispatchKeyToContact(newKey);
        return NextResponse.json({ verified: true, isMock: true, licenseKey: newKey });
      }
      return NextResponse.json({ verified: false, error: 'Verification credentials missing.' }, { status: 500 });
    }

    // Block mock checkout bypass attempts in environments where API keys are configured
    if (razorpay_order_id.startsWith('order_mock_')) {
      return NextResponse.json({ verified: false, error: 'Mock payments are forbidden when API keys are configured.' }, { status: 400 });
    }

    if (!razorpay_signature) {
      return NextResponse.json({ verified: false, error: 'Missing payment signature.' }, { status: 400 });
    }

    // 1. Cryptographic Signature Verification (HMAC-SHA256)
    const text = razorpay_order_id + '|' + razorpay_payment_id;
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json({ verified: false, error: 'Invalid payment signature.' }, { status: 400 });
    }

    // 2. Direct API Status Verification (Double-Check captured state)
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(keyId + ':' + keySecret).toString('base64')
      }
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error(`Razorpay API responded with status ${paymentResponse.status}: ${errorText}`);
      return NextResponse.json({ verified: false, error: 'Failed to retrieve payment confirmation from Razorpay.' }, { status: 400 });
    }

    const payment = await paymentResponse.json();

    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      return NextResponse.json({ verified: false, error: `Payment status is ${payment.status}, expected captured or authorized.` }, { status: 400 });
    }

    if (payment.order_id !== razorpay_order_id) {
      return NextResponse.json({ verified: false, error: 'Payment order ID mismatch.' }, { status: 400 });
    }

    // Generate and save key on successful payment
    const newKey = await createAndSaveKey(razorpay_payment_id);
    await dispatchKeyToContact(newKey);
    return NextResponse.json({ verified: true, licenseKey: newKey });
  } catch (error) {
    console.error('Error in razorpay/verify:', error);
    const errorMessage = error instanceof Error ? error.message : 'Verification failed.';
    return NextResponse.json({ verified: false, error: errorMessage }, { status: 500 });
  }
}
