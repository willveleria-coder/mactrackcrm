// Email & SMS Notification Helper
// Uses Resend for email and Twilio for SMS

export async function sendEmail({ to, subject, html }) {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html })
    });
    return response.ok;
  } catch (err) {
    console.error('Email error:', err);
    return false;
  }
}

export async function sendSMS({ to, message }) {
  try {
    const response = await fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message })
    });
    return response.ok;
  } catch (err) {
    console.error('SMS error:', err);
    return false;
  }
}

// Pre-built notification templates
export const notifications = {
  orderCreated: (order) => ({
    subject: `Order #${order.id.slice(0, 8).toUpperCase()} Confirmed - Mac Track`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">🚐 Mac Track</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2>Order Confirmed!</h2>
          <p>Your delivery order has been received.</p>
          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p><strong>Order ID:</strong> #${order.id.slice(0, 8).toUpperCase()}</p>
            <p><strong>Pickup:</strong> ${order.pickup_address}</p>
            <p><strong>Dropoff:</strong> ${order.dropoff_address}</p>
            <p><strong>Total:</strong> $${order.total_cost?.toFixed(2)}</p>
          </div>
          <p>Track your order: <a href="https://mactrackcrm-xatn.vercel.app/track/${order.id}">Click here</a></p>
        </div>
        <div style="background: #111827; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>Mac Track Courier Service | 0430 233 811</p>
        </div>
      </div>
    `,
    sms: `Mac Track: Order #${order.id.slice(0, 8).toUpperCase()} confirmed! Track at: mactrackcrm-xatn.vercel.app/track/${order.id}`
  }),

  orderPickedUp: (order) => ({
    subject: `Your Order Has Been Picked Up - Mac Track`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">🚐 Mac Track</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2>📦 Order Picked Up!</h2>
          <p>Your package is on its way to the destination.</p>
          <p><strong>Order ID:</strong> #${order.id.slice(0, 8).toUpperCase()}</p>
          <p>Track live: <a href="https://mactrackcrm-xatn.vercel.app/track/${order.id}">Click here</a></p>
        </div>
      </div>
    `,
    sms: `Mac Track: Your order #${order.id.slice(0, 8).toUpperCase()} has been picked up and is on the way!`
  }),

  orderDelivered: (order) => ({
    subject: `Your Order Has Been Delivered - Mac Track`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #16a34a; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">✅ Delivered!</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2>🎉 Order Delivered!</h2>
          <p>Your package has been successfully delivered.</p>
          <p><strong>Order ID:</strong> #${order.id.slice(0, 8).toUpperCase()}</p>
          <p style="margin-top: 20px;">How was your experience? <a href="https://mactrackcrm-xatn.vercel.app/client/orders">Leave a review</a></p>
        </div>
      </div>
    `,
    sms: `Mac Track: Order #${order.id.slice(0, 8).toUpperCase()} delivered! Thank you for using Mac Track 🚐`
  }),

  driverAssigned: (order, driver) => ({
    subject: `Driver Assigned to Your Order - Mac Track`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">🚐 Mac Track</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2>🚗 Driver Assigned!</h2>
          <p>A driver has been assigned to your order.</p>
          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p><strong>Driver:</strong> ${driver.name}</p>
            <p><strong>Order ID:</strong> #${order.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <p>Track live: <a href="https://mactrackcrm-xatn.vercel.app/track/${order.id}">Click here</a></p>
        </div>
      </div>
    `,
    sms: `Mac Track: Driver ${driver.name} assigned to your order #${order.id.slice(0, 8).toUpperCase()}. Track live now!`
  })
};