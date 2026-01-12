export async function sendOrderEmail(to, order, type) {
  const templates = {
    created: {
      subject: `Order #${order.id?.slice(0, 8).toUpperCase()} Confirmed - Mac Track`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">🚐 Mac Track</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2>Order Confirmed!</h2>
            <p>Your delivery order has been received.</p>
            <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <p><strong>Order ID:</strong> #${order.id?.slice(0, 8).toUpperCase()}</p>
              <p><strong>Pickup:</strong> ${order.pickup_address}</p>
              <p><strong>Dropoff:</strong> ${order.dropoff_address}</p>
              <p><strong>Total:</strong> $${order.total_cost?.toFixed(2) || '0.00'}</p>
            </div>
            <a href="https://mactrackcrm-xatn.vercel.app/track/${order.id}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Track Your Order</a>
          </div>
          <div style="background: #111827; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p>Mac Track Courier Service | 1300 170 718</p>
          </div>
        </div>
      `
    },
    picked_up: {
      subject: `Your Order Has Been Picked Up - Mac Track`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">🚐 Mac Track</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2>📦 Order Picked Up!</h2>
            <p>Your package is on its way.</p>
            <p><strong>Order ID:</strong> #${order.id?.slice(0, 8).toUpperCase()}</p>
            <a href="https://mactrackcrm-xatn.vercel.app/track/${order.id}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Track Live</a>
          </div>
        </div>
      `
    },
    delivered: {
      subject: `Your Order Has Been Delivered - Mac Track`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #16a34a; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">✅ Delivered!</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2>🎉 Order Delivered!</h2>
            <p>Your package has been successfully delivered.</p>
            <p><strong>Order ID:</strong> #${order.id?.slice(0, 8).toUpperCase()}</p>
            <a href="https://mactrackcrm-xatn.vercel.app/client/orders" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Leave a Review</a>
          </div>
        </div>
      `
    }
  };

  const template = templates[type];
  if (!template) return;

  try {
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, ...template })
    });
  } catch (err) {
    console.error('Failed to send email:', err);
  }
}