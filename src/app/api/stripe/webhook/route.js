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

  let event;

  try {
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

      if (paymentIntent.metadata?.order_id) {
        try {
          await supabase
            .from("orders")
            .update({
              payment_status: "paid",
              payment_id: paymentIntent.id,
              payment_method: "stripe",
              paid_at: new Date().toISOString(),
            })
            .eq("id", paymentIntent.metadata.order_id);

          console.log("✅ Order updated:", paymentIntent.metadata.order_id);
        } catch (dbError) {
          console.error("Database update error:", dbError);
        }
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;
      console.log("❌ Payment failed:", paymentIntent.id);

      if (paymentIntent.metadata?.order_id) {
        try {
          await supabase
            .from("orders")
            .update({
              payment_status: "failed",
              payment_error: paymentIntent.last_payment_error?.message,
            })
            .eq("id", paymentIntent.metadata.order_id);
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

    case "checkout.session.completed": {
      const session = event.data.object;
      console.log("✅ Checkout completed:", session.id);
      console.log("Session metadata:", session.metadata);
      console.log("Payment Link ID:", session.payment_link);

      let orderId = session.metadata?.order_id;

      if (!orderId && session.success_url) {
        const url = new URL(session.success_url);
        orderId = url.searchParams.get("order_id");
      }

      if (orderId) {
        try {
          const { error } = await supabase
            .from("orders")
            .update({
              payment_status: "paid",
              payment_id: session.payment_intent,
              payment_method: "stripe",
              paid_at: new Date().toISOString(),
            })
            .eq("id", orderId);

          if (error) {
            console.error("Supabase error:", error);
          } else {
            console.log("✅ Order updated:", orderId);
          }
        } catch (dbError) {
          console.error("Database update error:", dbError);
        }
      } else {
        console.log("⚠️ No order_id found in session");
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ status: "Webhook endpoint is working" });
}