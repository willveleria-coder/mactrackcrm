import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { orderId, customerEmail, customerName, amount, orderNumber } = await request.json();

    if (!orderId || !customerEmail || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create Stripe Payment Link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: "aud",
            product_data: {
              name: `Delivery Order ${orderNumber || orderId.slice(0, 8).toUpperCase()}`,
              description: "Mac With A Van - Courier Service",
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        order_id: orderId,
      },
      after_completion: {
        type: "redirect",
        redirect: {
          url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://mactrackcrm.vercel.app'}/payment-success?order_id=${orderId}`,
        },
      },
    });

    // Update order with payment link
    await supabase
      .from("orders")
      .update({ 
        payment_link: paymentLink.url,
        payment_status: "pending",
        payment_link_sent_at: new Date().toISOString()
      })
      .eq("id", orderId);

    // Send email with payment link
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
          .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
          .content { padding: 32px 24px; }
          .amount { background: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
          .amount-label { font-size: 14px; color: #166534; font-weight: 600; }
          .amount-value { font-size: 36px; font-weight: 800; color: #166534; margin-top: 4px; }
          .order-info { background: #f9fafb; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
          .order-info p { margin: 8px 0; font-size: 14px; color: #374151; }
          .order-info strong { color: #111827; }
          .pay-button { display: block; width: 100%; padding: 16px; background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; text-decoration: none; text-align: center; border-radius: 12px; font-size: 18px; font-weight: 700; }
          .pay-button:hover { background: linear-gradient(135deg, #b91c1c, #991b1b); }
          .footer { padding: 20px 24px; background: #f9fafb; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚚 MAC WITH A VAN</h1>
            <p>Payment Request</p>
          </div>
          <div class="content">
            <p style="margin-bottom: 20px;">Hi ${customerName || 'there'},</p>
            <p style="margin-bottom: 24px;">Please complete payment for your delivery order:</p>
            
            <div class="amount">
              <div class="amount-label">Amount Due</div>
              <div class="amount-value">$${amount.toFixed(2)} AUD</div>
            </div>
            
            <div class="order-info">
              <p><strong>Order:</strong> #${orderNumber || orderId.slice(0, 8).toUpperCase()}</p>
            </div>
            
            <a href="${paymentLink.url}" class="pay-button">💳 Pay Now</a>
            
            <p style="margin-top: 24px; font-size: 13px; color: #6b7280; text-align: center;">
              This link will expire in 24 hours. If you have any questions, please contact us.
            </p>
          </div>
          <div class="footer">
            <p>📞 1300 170 718 | ✉️ macwithavan@mail.com</p>
            <p>Mac With A Van - Courier Service</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via your email service (using Resend as example)
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      await resend.emails.send({
        from: "Mac With A Van <onboarding@resend.dev>",
        to: customerEmail,
        subject: `Payment Request - Order #${orderNumber || orderId.slice(0, 8).toUpperCase()}`,
        html: emailHtml,
      });
    }

    return NextResponse.json({ 
      success: true, 
      paymentLink: paymentLink.url,
      message: "Payment link sent successfully"
    });

  } catch (error) {
    console.error("Error creating payment link:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}