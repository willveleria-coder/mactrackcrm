import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { orderId, amount, orderDetails } = await request.json();

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: 'Mac Track Delivery',
              description: `${orderDetails.pickup} → ${orderDetails.dropoff}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/client-portal/orders?payment=success&order_id=${orderId}`,
      cancel_url: `${request.headers.get('origin')}/client-portal/orders?payment=cancelled`,
      metadata: {
        orderId: orderId,
      },
    });

    // Update order with payment session
    await supabase
      .from('orders')
      .update({ 
        stripe_session_id: session.id,
        payment_status: 'pending' 
      })
      .eq('id', orderId);

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}