import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Create Supabase admin client for webhook
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  // If you have a webhook secret, verify the signature
  // const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // For now, parse without signature verification
    // In production, use: stripe.webhooks.constructEvent(body, signature, webhookSecret)
    event = JSON.parse(body);
  } catch (err) {
    console.error("Webhook parsing error:", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      console.log("✅ Payment succeeded:", paymentIntent.id);

      // Update order status if orderId is in metadata
      if (paymentIntent.metadata?.orderId) {
        try {
          await supabase
            .from("orders")
            .update({
              payment_status: "paid",
              payment_id: paymentIntent.id,
              payment_method: "stripe",
              paid_at: new Date().toISOString(),
            })
            .eq("id", paymentIntent.metadata.orderId);

          console.log("✅ Order updated:", paymentIntent.metadata.orderId);
        } catch (dbError) {
          console.error("Database update error:", dbError);
        }
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;
      console.log("❌ Payment failed:", paymentIntent.id);

      // Update order status
      if (paymentIntent.metadata?.orderId) {
        try {
          await supabase
            .from("orders")
            .update({
              payment_status: "failed",
              payment_error: paymentIntent.last_payment_error?.message,
            })
            .eq("id", paymentIntent.metadata.orderId);
        } catch (dbError) {
          console.error("Database update error:", dbError);
        }
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object;
      console.log("💸 Refund processed:", charge.id);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}