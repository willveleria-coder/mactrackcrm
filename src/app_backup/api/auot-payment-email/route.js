import { NextResponse } from "next/server";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const transporter = nodemailer.createTransport({
  host: "mail.spacemail.com",
  port: 465,
  secure: true,
  auth: {
    user: "noreply@paymentmactrack.com",
    pass: process.env.MAIL_PASSWORD,
  },
});

export async function POST(request) {
  try {
    const { orderId, customerEmail, customerName, amount, orderNumber, pickupAddress, dropoffAddress, serviceType } = await request.json();

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
              name: `Delivery Order #${orderNumber || orderId.slice(0, 8).toUpperCase()}`,
              description: "Mac With A Van - Courier Service",
            },
            unit_amount: Math.round(amount * 100),
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
        payment_link_sent_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    // Send email via Nodemailer
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; padding: 20px; margin: 0;">
        <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          
          <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Mac With A Van</h1>
            <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">Payment Required for Your Delivery</p>
          </div>

          <div style="padding: 32px 24px;">
            <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">
              Hi${customerName ? ' ' + customerName : ''},
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">
              Your delivery order has been created. Please complete payment to confirm your booking.
            </p>

            <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <p style="font-size: 14px; color: #166534; font-weight: 600; margin: 0;">Amount Due</p>
              <p style="font-size: 36px; font-weight: 800; color: #166534; margin: 4px 0 0;">$${amount.toFixed(2)}</p>
            </div>

            <div style="background: #f9fafb; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0 0 8px; text-transform: uppercase; font-weight: 600;">Order Details</p>
              <table style="width: 100%; font-size: 14px;">
                <tr>
                  <td style="color: #6b7280; padding: 4px 0;">Order</td>
                  <td style="color: #111827; font-weight: 600; text-align: right;">#${orderNumber || orderId.slice(0, 8).toUpperCase()}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; padding: 4px 0;">Service</td>
                  <td style="color: #111827; font-weight: 600; text-align: right;">${(serviceType || 'standard').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</td>
                </tr>
                ${pickupAddress ? `<tr>
                  <td style="color: #6b7280; padding: 4px 0;">Pickup</td>
                  <td style="color: #111827; font-weight: 600; text-align: right; font-size: 12px;">${pickupAddress.length > 35 ? pickupAddress.slice(0, 35) + '...' : pickupAddress}</td>
                </tr>` : ''}
                ${dropoffAddress ? `<tr>
                  <td style="color: #6b7280; padding: 4px 0;">Delivery</td>
                  <td style="color: #111827; font-weight: 600; text-align: right; font-size: 12px;">${dropoffAddress.length > 35 ? dropoffAddress.slice(0, 35) + '...' : dropoffAddress}</td>
                </tr>` : ''}
              </table>
            </div>

            <a href="${paymentLink.url}" style="display: block; background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; text-align: center; padding: 16px; border-radius: 12px; font-size: 18px; font-weight: 800; text-decoration: none;">
              Pay Now — $${amount.toFixed(2)}
            </a>

            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 16px 0 0;">
              Secure payment powered by Stripe
            </p>
          </div>

          <div style="background: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">Mac With A Van | ABN: 18 616 164 875</p>
            <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0;">1300 170 718 | macwithavan@mail.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: '"Mac With A Van" <noreply@paymentmactrack.com>',
      to: customerEmail,
      subject: `Payment Required — Delivery Order #${orderNumber || orderId.slice(0, 8).toUpperCase()}`,
      html: emailHtml,
    });

    return NextResponse.json({
      success: true,
      paymentLink: paymentLink.url,
      emailSent: true,
    });

  } catch (error) {
    console.error("Auto payment email error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}