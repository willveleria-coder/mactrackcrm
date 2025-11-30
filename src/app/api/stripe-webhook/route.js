import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event;

  try {
    // For development, we'll skip signature verification
    // In production, add: const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    event = JSON.parse(body);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata.orderId;

    // Update order payment status
    await supabase
      .from('orders')
      .update({ 
        payment_status: 'paid',
        stripe_session_id: session.id 
      })
      .eq('id', orderId);

    console.log(`✅ Payment confirmed for order: ${orderId}`);
  }

  return NextResponse.json({ received: true });
}