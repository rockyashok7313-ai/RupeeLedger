import { NextResponse } from '../../../next-response.ts';
import crypto from 'crypto';
import { createAndSaveKey, dispatchKeyToContact } from '../../../../src/lib/license.ts';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, duration, email, purchaserContact } = body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return NextResponse.json({ verified: false, error: 'Missing parameters.' }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    const contactVal = (purchaserContact || email || '').trim();

    // Fallback for local sandbox/testing if credentials are not configured
    if (!keyId || !keySecret) {
      if (razorpay_order_id.startsWith('order_mock_')) {
        console.log('Using mock verification because keys are missing in environment.');
        const newKey = await createAndSaveKey(razorpay_payment_id, duration || 'annual', userId);
        await dispatchKeyToContact(contactVal, newKey, duration || 'annual', razorpay_order_id, razorpay_payment_id);
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
    const newKey = await createAndSaveKey(razorpay_payment_id, duration || 'annual', userId);
    await dispatchKeyToContact(contactVal, newKey, duration || 'annual', razorpay_order_id, razorpay_payment_id);
    return NextResponse.json({ verified: true, licenseKey: newKey });
  } catch (error) {
    console.error('Error in razorpay/verify:', error);
    const errorMessage = error instanceof Error ? error.message : 'Verification failed.';
    return NextResponse.json({ verified: false, error: errorMessage }, { status: 500 });
  }
}

