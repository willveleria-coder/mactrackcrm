import webpush from 'web-push';

export function initWebPush() {
  webpush.setVapidDetails(
    'mailto:macwithavan@mail.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function sendPushNotification(subscription, payload) {
  try {
    initWebPush();
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true };
  } catch (error) {
    console.error('Push notification error:', error);
    return { success: false, error: error.message };
  }
}

export const pushTemplates = {
  newJob: (order) => ({
    title: '🚚 New Job Assigned!',
    body: `Pickup: ${order.pickup_address?.slice(0, 50)}...`,
    icon: '/bus-icon.png',
    badge: '/badge-icon.png',
    tag: `order-${order.id}`,
    data: {
      url: '/driver/dashboard',
      orderId: order.id
    },
    actions: [
      { action: 'accept', title: '✅ Accept' },
      { action: 'view', title: '👁️ View' }
    ],
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200]
  }),

  orderUpdate: (order, status) => ({
    title: status === 'picked_up' ? '📦 Order Picked Up!' : '✅ Order Delivered!',
    body: status === 'picked_up' 
      ? 'Your package is on its way!' 
      : 'Your package has been delivered!',
    icon: '/bus-icon.png',
    tag: `order-${order.id}`,
    data: {
      url: `/track/${order.id}`,
      orderId: order.id
    }
  })
};