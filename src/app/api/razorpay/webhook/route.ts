import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAndSaveKey, dispatchKeyToContact } from '@/lib/license';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing Razorpay signature' }, { status: 400 });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET is missing in environment variables.');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Webhook signature mismatch.');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const paymentEntity = event.event === 'payment.captured' 
        ? event.payload.payment.entity 
        : event.payload.order.entity; // wait, for order.paid the payment is still in payload.payment.entity in most cases, but payment.captured is safer.

      // Prefer to use payment entity data
      const payment = event.payload.payment?.entity;
      if (!payment) {
        return NextResponse.json({ status: 'ignored', reason: 'No payment entity found' });
      }

      const paymentId = payment.id;
      const orderId = payment.order_id;
      const contactVal = payment.email || payment.contact || '';
      
      // We read custom notes that we attached during order creation
      const notes = payment.notes || {};
      const duration = notes.duration || 'annual';
      const userId = notes.userId || 'anonymous_buyer';

      console.log(`Webhook verified for payment ${paymentId}. Generating key...`);

      // Idempotent key creation
      const newKey = await createAndSaveKey(paymentId, duration, userId);
      
      // Dispatch via email or SMS
      await dispatchKeyToContact(contactVal, newKey, duration, orderId, paymentId);

      return NextResponse.json({ status: 'success', key: newKey });
    }

    return NextResponse.json({ status: 'ignored' });
  } catch (error) {
    console.error('Error processing Razorpay webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
