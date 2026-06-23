import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as crypto from "crypto";
import * as nodemailer from "nodemailer";

// Initialize firebase admin
initializeApp();
const db = getFirestore();

setGlobalOptions({ maxInstances: 10 });

// Helper to generate a unique license key
const generateKeyString = (): string => {
  const seg = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RL-PRO-${seg()}-${seg()}-${seg()}`;
};

export const verifyPayment = onRequest({ cors: true }, async (req, res) => {
  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, duration, email } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      res.status(400).json({ verified: false, error: "Missing parameters." });
      return;
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    const durationDays = duration === 'annual' ? 365 : 30;

    // Helper to generate and save key in Firestore
    const createAndSaveKey = async (payId: string) => {
      const newKeyStr = generateKeyString();
      const keyDocRef = db.collection("keys").doc(newKeyStr);
      await keyDocRef.set({
        createdAt: Date.now(),
        durationDays,
        createdBy: userId || 'anonymous_buyer',
        status: 'unused',
        paymentId: payId
      });
      return newKeyStr;
    };

    // Helper to send email to customer
    const sendEmailToCustomer = async (recipientEmail: string, licenseKey: string) => {
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpFrom = process.env.SMTP_FROM || "noreply@rupeeledger.com";

      const subject = "Your RupeeLedger Pro Activation Key";
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
            <li>Paste it in the <strong>"Activate Annual License Key"</strong> field and click <strong>"Verify & Activate"</strong>.</li>
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
          logger.info(`Email sent successfully to ${recipientEmail} for payment ${razorpay_payment_id}`);
        } catch (err) {
          logger.error(`Failed to send email to ${recipientEmail} using SMTP:`, err);
        }
      } else {
        logger.warn(`[SMTP NOT CONFIGURED] Simulated email delivery:
To: ${recipientEmail}
Subject: ${subject}
License Key: ${licenseKey}
Order ID: ${razorpay_order_id}
Payment ID: ${razorpay_payment_id}
        `);
      }
    };

    // Fallback for local sandbox/testing if credentials are not configured
    if (!keyId || !keySecret) {
      if (razorpay_order_id.startsWith('order_mock_')) {
        logger.info('Using mock verification because keys are missing in environment.');
        const newKey = await createAndSaveKey(razorpay_payment_id);
        if (email) {
          await sendEmailToCustomer(email, newKey);
        }
        res.status(200).json({ verified: true, isMock: true, licenseKey: newKey });
        return;
      }
      res.status(500).json({ verified: false, error: 'Verification credentials missing.' });
      return;
    }

    // Block mock checkout bypass attempts in environments where API keys are configured
    if (razorpay_order_id.startsWith('order_mock_')) {
      res.status(400).json({ verified: false, error: 'Mock payments are forbidden when API keys are configured.' });
      return;
    }

    if (!razorpay_signature) {
      res.status(400).json({ verified: false, error: 'Missing payment signature.' });
      return;
    }

    // 1. Cryptographic Signature Verification (HMAC-SHA256)
    const text = razorpay_order_id + '|' + razorpay_payment_id;
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      res.status(400).json({ verified: false, error: 'Invalid payment signature.' });
      return;
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
      logger.error(`Razorpay API responded with status ${paymentResponse.status}: ${errorText}`);
      res.status(400).json({ verified: false, error: 'Failed to retrieve payment confirmation from Razorpay.' });
      return;
    }

    const payment = await paymentResponse.json();

    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      res.status(400).json({ verified: false, error: `Payment status is ${payment.status}, expected captured or authorized.` });
      return;
    }

    if (payment.order_id !== razorpay_order_id) {
      res.status(400).json({ verified: false, error: 'Payment order ID mismatch.' });
      return;
    }

    // Generate and save key on successful payment
    const newKey = await createAndSaveKey(razorpay_payment_id);
    if (email) {
      await sendEmailToCustomer(email, newKey);
    }
    res.status(200).json({ verified: true, licenseKey: newKey });
  } catch (error) {
    logger.error('Error in verifyPayment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Verification failed.';
    res.status(500).json({ verified: false, error: errorMessage });
  }
});
