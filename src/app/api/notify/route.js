import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, emailTemplates } from '@/lib/email';
import { sendSMS, smsTemplates } from '@/lib/sms';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  console.log("Notify API called");
  try {
    const { type, orderId } = await request.json();

    const { data: order } = await supabase
      .from('orders')
      .select('*, client:clients(*), driver:drivers(*)')
      .eq('id', orderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const results = { email: null, sms: null };

    switch (type) {
      case 'order_created':
        if (order.client?.email) {
          const template = emailTemplates.orderCreated(order);
          results.email = await sendEmail({ to: order.client.email, ...template });
        }
        if (order.client?.phone) {
          results.sms = await sendSMS({ to: order.client.phone, message: smsTemplates.orderCreated(order) });
        }
        break;

      case 'order_picked_up':
        if (order.client?.email) {
          const template = emailTemplates.orderPickedUp(order);
          results.email = await sendEmail({ to: order.client.email, ...template });
        }
        if (order.client?.phone) {
          results.sms = await sendSMS({ to: order.client.phone, message: smsTemplates.orderPickedUp(order) });
        }
        break;

      case 'order_delivered':
        if (order.client?.email) {
          const template = emailTemplates.orderDelivered(order);
          results.email = await sendEmail({ to: order.client.email, ...template });
        }
        if (order.client?.phone) {
          results.sms = await sendSMS({ to: order.client.phone, message: smsTemplates.orderDelivered(order) });
        }
        break;

      case 'driver_assigned':
        if (order.driver?.email) {
          const template = emailTemplates.driverAssigned(order, order.driver);
          results.email = await sendEmail({ to: order.driver.email, ...template });
        }
        if (order.driver?.phone) {
          results.sms = await sendSMS({ to: order.driver.phone, message: smsTemplates.driverAssigned(order) });
        }
        break;
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Notification error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
