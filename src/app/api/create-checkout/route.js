import Stripe from 'stripe';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const { orderId, amount, customerEmail, customerName } = await request.json();

    console.log('Creating Stripe checkout session:', { orderId, amount, customerEmail });

    // Validate inputs
    if (!orderId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId and amount' },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: 'Mac Track Delivery Service',
              description: `Order #${orderId.toString().slice(0, 8).toUpperCase()}`,
              images: ['https://your-domain.com/bus-icon.png'], // Optional: add your logo
            },
            unit_amount: Math.round(amount * 100), // Convert dollars to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/client-portal/payment-success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/client-portal/payment-cancelled?order_id=${orderId}`,
      customer_email: customerEmail,
      client_reference_id: orderId.toString(),
      metadata: {
        orderId: orderId.toString(),
        customerName: customerName || 'N/A',
      },
    });

    console.log('Stripe session created successfully:', session.id);

    return NextResponse.json({ 
      url: session.url,
      sessionId: session.id 
    });

  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}