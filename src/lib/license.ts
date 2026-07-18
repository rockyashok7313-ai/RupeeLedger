import { getMongoDb, isMongoConfigured } from '../lib/mongodb';
import nodemailer from 'nodemailer';

export const generateKeyString = (duration: string) => {
  const prefix = duration === 'annual' ? 'YEAR' : 'MONTH';
  const seg = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RL-${prefix}-${seg()}-${seg()}-${seg()}`;
};

export const createAndSaveKey = async (payId: string, duration: string, userId: string = 'anonymous_buyer') => {
  const durationDays = duration === 'annual' ? 365 : 30;
  
  if (!isMongoConfigured()) {
    console.warn('MongoDB not configured. Mocking activation key save.');
    return generateKeyString(duration);
  }

  const db = await getMongoDb();
  
  // Idempotency: Check if a key was already generated for this payment ID
  const existingKey = await db.collection('keys').findOne({ paymentId: payId });
  if (existingKey) {
    console.log(`Key already exists for payment ${payId}: ${existingKey.key || existingKey._id}`);
    if ((existingKey.createdBy === 'anonymous_buyer' || existingKey.createdBy === 'guest_local') && userId && userId !== 'anonymous_buyer' && userId !== 'guest_local') {
      await db.collection('keys').updateOne(
        { _id: existingKey._id },
        { $set: { createdBy: userId } }
      );
    }
    return (existingKey.key || existingKey._id) as string;
  }

  const newKeyStr = generateKeyString(duration);
  
  await db.collection('keys').updateOne(
    { key: newKeyStr },
    {
      $set: {
        createdAt: Date.now(),
        durationDays,
        createdBy: userId,
        status: 'unused',
        paymentId: payId
      }
    },
    { upsert: true }
  );

  return newKeyStr;
};

export const sendEmailToCustomer = async (recipientEmail: string, licenseKey: string, duration: string, razorpay_order_id: string, razorpay_payment_id: string) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || "noreply@rupeeledgerpro.com";

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
        <li>Go to the settings section of the RupeeLedger Pro application.</li>
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

export const sendSmsToCustomer = async (recipientMobile: string, licenseKey: string, duration: string) => {
  // Simulate SMS dispatch to the customer's phone number
  console.log(`[SMS KEY DISPATCH] Delivering ${duration === 'annual' ? 'Annual' : 'Monthly'} Key: ${licenseKey} to mobile +91${recipientMobile}`);
};

export const dispatchKeyToContact = async (contactVal: string, licenseKey: string, duration: string, razorpay_order_id: string, razorpay_payment_id: string) => {
  const normalizedContact = (contactVal || '').trim();
  if (!normalizedContact) return;

  if (normalizedContact.includes('@')) {
    await sendEmailToCustomer(normalizedContact, licenseKey, duration, razorpay_order_id, razorpay_payment_id);
  } else {
    // Strip out non-digits to isolate the 10 digit mobile
    const normalizedMobile = normalizedContact.replace(/\D/g, '').slice(-10);
    if (normalizedMobile.length === 10) {
      await sendSmsToCustomer(normalizedMobile, licenseKey, duration);
    }
  }
};
