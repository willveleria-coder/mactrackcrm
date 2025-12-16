import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, emailTemplates } from '@/lib/email';
import { sendSMS, smsTemplates } from '@/lib/sms';
import { sendPushNotification, pushTemplates } from '@/lib/push';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { type, orderId, userId, userType } = await request.json();

    // Get order details
    const { data: order } = await supabase
      .from('orders')
      .select('*, client:clients(*), driver:drivers(*)')
      .eq('id', orderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const results = {
      email: null,
      sms: null,
      push: null
    };

    // Send notifications based on type
    switch (type) {
      case 'order_created':
        // Email to client
        if (order.client?.email) {
          const template = emailTemplates.orderCreated(order);
          results.email = await sendEmail({
            to: order.client.email,
            ...template
          });
        }
        // SMS to client
        if (order.client?.phone) {
          results.sms = await sendSMS({
            to: order.client.phone,
            message: smsTemplates.orderCreated(order)
          });
        }
        break;

      case 'order_picked_up':
        if (order.client?.email) {
          const template = emailTemplates.orderPickedUp(order);
          results.email = await sendEmail({
            to: order.client.email,
            ...template
          });
        }
        if (order.client?.phone) {
          results.sms = await sendSMS({
            to: order.client.phone,
            message: smsTemplates.orderPickedUp(order)
          });
        }
        // Push to client
        const clientSub = await getSubscription(order.client_id, 'client');
        if (clientSub) {
          results.push = await sendPushNotification(
            clientSub,
            pushTemplates.orderUpdate(order, 'picked_up')
          );
        }
        break;

      case 'order_delivered':
        if (order.client?.email) {
          const template = emailTemplates.orderDelivered(order);
          results.email = await sendEmail({
            to: order.client.email,
            ...template
          });
        }
        if (order.client?.phone) {
          results.sms = await sendSMS({
            to: order.client.phone,
            message: smsTemplates.orderDelivered(order)
          });
        }
        break;

      case 'driver_assigned':
        // Email to driver
        if (order.driver?.email) {
          const template = emailTemplates.driverAssigned(order, order.driver);
          results.email = await sendEmail({
            to: order.driver.email,
            ...template
          });
        }
        // SMS to driver
        if (order.driver?.phone) {
          results.sms = await sendSMS({
            to: order.driver.phone,
            message: smsTemplates.driverAssigned(order)
          });
        }
        // Push to driver
        const driverSub = await getSubscription(order.driver_id, 'driver');
        if (driverSub) {
          results.push = await sendPushNotification(
            driverSub,
            pushTemplates.newJob(order)
          );
        }
        break;
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Notification error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function getSubscription(userId, userType) {
  const { data } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId)
    .eq('user_type', userType)
    .single();

  if (data?.subscription) {
    return JSON.parse(data.subscription);
  }
  return null;
}