import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS, smsTemplates } from '@/lib/sms';
import { sendEmail, emailTemplates } from '@/lib/email';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("Notify called with:", body);
    
    const { type, orderId } = body;
    
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, client:clients(*), driver:drivers(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.log("Order error:", orderError);
      return NextResponse.json({ error: 'Order not found', details: orderError }, { status: 404 });
    }

    console.log("Order found:", order.id);
    console.log("Driver:", order.driver?.name, order.driver?.phone);
    console.log("Client:", order.client?.name, order.client?.phone);

    const results = { email: null, sms: null };

    if (type === 'driver_assigned' && order.driver) {
      console.log("Sending to driver:", order.driver.phone);
      
      if (order.driver.phone) {
        results.sms = await sendSMS({ 
          to: order.driver.phone, 
          message: smsTemplates.driverAssigned(order) 
        });
        console.log("SMS result:", results.sms);
      }
      
      if (order.driver.email) {
        const template = emailTemplates.driverAssigned(order, order.driver);
        results.email = await sendEmail({ 
          to: order.driver.email, 
          ...template 
        });
        console.log("Email result:", results.email);
      }
    }

    if (type === 'order_created' && order.client) {
      if (order.client.phone) {
        results.sms = await sendSMS({ 
          to: order.client.phone, 
          message: smsTemplates.orderCreated(order) 
        });
      }
      if (order.client.email) {
        const template = emailTemplates.orderCreated(order);
        results.email = await sendEmail({ to: order.client.email, ...template });
      }
    }

    if (type === 'order_picked_up' && order.client) {
      if (order.client.phone) {
        results.sms = await sendSMS({ 
          to: order.client.phone, 
          message: smsTemplates.orderPickedUp(order) 
        });
      }
      if (order.client.email) {
        const template = emailTemplates.orderPickedUp(order);
        results.email = await sendEmail({ to: order.client.email, ...template });
      }
    }

    if (type === 'order_delivered' && order.client) {
      if (order.client.phone) {
        results.sms = await sendSMS({ 
          to: order.client.phone, 
          message: smsTemplates.orderDelivered(order) 
        });
      }
      if (order.client.email) {
        const template = emailTemplates.orderDelivered(order);
        results.email = await sendEmail({ to: order.client.email, ...template });
      }
    }

    return NextResponse.json({ success: true, results, type, orderId });
  } catch (error) {
    console.error('Notification error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Use POST method', status: 'ok' });
}
