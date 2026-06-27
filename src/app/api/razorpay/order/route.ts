import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const amount = body.amount || 199; // default ₹199
    
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // If keys are missing, return a simulated order for local testing
    if (!keyId || !keySecret) {
      console.log('Razorpay keys not found in environment. Generating simulated order...');
      return NextResponse.json({
        id: 'order_mock_' + Math.random().toString(36).substring(2, 12),
        entity: 'order',
        amount: amount * 100,
        amount_paid: 0,
        amount_due: amount * 100,
        currency: 'INR',
        receipt: 'receipt_mock_' + Date.now(),
        status: 'created',
        attempts: 0,
        notes: [],
        created_at: Math.floor(Date.now() / 1000),
        isMock: true
      });
    }

    // Connect to Razorpay API
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(keyId + ':' + keySecret).toString('base64')
      },
      body: JSON.stringify({
        amount: amount * 100, // Razorpay expects paise (₹1 = 100 paise)
        currency: 'INR',
        receipt: 'receipt_' + Date.now(),
        notes: {
          userId: body.userId || '',
          duration: body.duration || 'annual'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Razorpay API responded with ${response.status}: ${errorText}`);
    }

    const order = await response.json();
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error in razorpay/order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create order.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
