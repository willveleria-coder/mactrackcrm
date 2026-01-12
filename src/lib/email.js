export async function sendEmail({ to, subject, html }) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Mac Track <macwithavan@mail.com>',
        to: [to],
        subject,
        html
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Email error:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error: error.message };
  }
}

export const emailTemplates = {
  orderCreated: (order) => ({
    subject: `Order #${order.id?.slice(0, 8).toUpperCase()} Confirmed - Mac Track`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🚐 Mac Track</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">Courier Service</p>
        </div>
        <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb;">
          <h2 style="color: #111827; margin-top: 0;">✅ Order Confirmed!</h2>
          <p style="color: #6b7280;">Your delivery order has been received and is being processed.</p>
          
          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <p style="margin: 0 0 10px;"><strong>Order ID:</strong> #${order.id?.slice(0, 8).toUpperCase()}</p>
            <p style="margin: 0 0 10px;"><strong>Service:</strong> ${order.service_type}</p>
            <p style="margin: 0 0 10px;"><strong>Pickup:</strong> ${order.pickup_address}</p>
            <p style="margin: 0 0 10px;"><strong>Dropoff:</strong> ${order.dropoff_address}</p>
            <p style="margin: 0; font-size: 24px; color: #16a34a;"><strong>Total: $${order.total_cost?.toFixed(2) || order.price?.toFixed(2) || '0.00'}</strong></p>
          </div>
          
          <a href="https://mactrackcrm.vercel.app/track/${order.id}" style="display: inline-block; background: #dc2626; color: white; padding: 15px 30px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 10px;">
            📍 Track Your Order
          </a>
        </div>
        <div style="background: #111827; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
          <p style="margin: 0; font-size: 14px;">Mac Track Courier Service</p>
          <p style="margin: 5px 0 0; font-size: 12px; opacity: 0.7;">📞 1300 170 718 | macwithavan@mail.com</p>
        </div>
      </div>
    `
  }),

  orderPickedUp: (order) => ({
    subject: `Your Order is On Its Way! - Mac Track`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🚐 Mac Track</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb;">
          <h2 style="color: #111827; margin-top: 0;">📦 Order Picked Up!</h2>
          <p style="color: #6b7280;">Great news! Your package has been picked up and is on its way.</p>
          
          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <p style="margin: 0 0 10px;"><strong>Order ID:</strong> #${order.id?.slice(0, 8).toUpperCase()}</p>
            <p style="margin: 0;"><strong>Delivering to:</strong> ${order.dropoff_address}</p>
          </div>
          
          <a href="https://mactrackcrm.vercel.app/track/${order.id}" style="display: inline-block; background: #2563eb; color: white; padding: 15px 30px; border-radius: 10px; text-decoration: none; font-weight: bold;">
            📍 Track Live
          </a>
        </div>
        <div style="background: #111827; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
          <p style="margin: 0; font-size: 14px;">Mac Track Courier Service | 📞 1300 170 718</p>
        </div>
      </div>
    `
  }),

  orderDelivered: (order) => ({
    subject: `Your Order Has Been Delivered! - Mac Track`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #16a34a, #15803d); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">✅ Delivered!</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb;">
          <h2 style="color: #111827; margin-top: 0;">🎉 Order Complete!</h2>
          <p style="color: #6b7280;">Your package has been successfully delivered.</p>
          
          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <p style="margin: 0 0 10px;"><strong>Order ID:</strong> #${order.id?.slice(0, 8).toUpperCase()}</p>
            <p style="margin: 0;"><strong>Delivered to:</strong> ${order.dropoff_address}</p>
          </div>
          
          <p style="color: #6b7280;">How was your experience? We'd love to hear from you!</p>
          
          <a href="https://mactrackcrm.vercel.app/client-portal/orders" style="display: inline-block; background: #eab308; color: #111827; padding: 15px 30px; border-radius: 10px; text-decoration: none; font-weight: bold;">
            ⭐ Leave a Review
          </a>
        </div>
        <div style="background: #111827; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
          <p style="margin: 0; font-size: 14px;">Thank you for choosing Mac Track! 📞 1300 170 718</p>
        </div>
      </div>
    `
  }),

  driverAssigned: (order, driver) => ({
    subject: `New Job Assigned - Mac Track`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🚚 New Job!</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb;">
          <h2 style="color: #111827; margin-top: 0;">Hi ${driver.name}!</h2>
          <p style="color: #6b7280;">You have a new delivery assignment. Please accept or reject ASAP.</p>
          
          <div style="background: #dbeafe; padding: 20px; border-radius: 10px; margin: 20px 0; border: 2px solid #3b82f6;">
            <p style="margin: 0 0 5px; font-weight: bold; color: #1e40af;">📍 PICKUP</p>
            <p style="margin: 0 0 15px; color: #111827;">${order.pickup_address}</p>
            <p style="margin: 0 0 5px; font-weight: bold; color: #15803d;">🎯 DROPOFF</p>
            <p style="margin: 0; color: #111827;">${order.dropoff_address}</p>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 10px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <p style="margin: 0;"><strong>Service:</strong> ${order.service_type} | <strong>Size:</strong> ${order.parcel_size} | <strong>Weight:</strong> ${order.parcel_weight}kg</p>
          </div>
          
          <a href="https://mactrackcrm.vercel.app/driver/dashboard" style="display: inline-block; background: #16a34a; color: white; padding: 15px 30px; border-radius: 10px; text-decoration: none; font-weight: bold;">
            View & Accept Job
          </a>
        </div>
        <div style="background: #111827; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
          <p style="margin: 0; font-size: 14px;">Mac Track Driver Portal</p>
        </div>
      </div>
    `
  })
};