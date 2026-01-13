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
    const { type, orderId } = body;
    
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found', details: orderError }, { status: 404 });
    }

    // Get client if exists
    let client = null;
    if (order.client_id) {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('id', order.client_id)
        .single();
      client = data;
    }

    // Get driver if exists
    let driver = null;
    if (order.driver_id) {
      const { data } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', order.driver_id)
        .single();
      driver = data;
    }

    const results = { email: null, sms: null };

    if (type === 'driver_assigned' && driver) {
      if (driver.phone) {
        results.sms = await sendSMS({ 
          to: driver.phone, 
          message: smsTemplates.driverAssigned(order) 
        });
      }
      if (driver.email) {
        const template = emailTemplates.driverAssigned(order, driver);
        results.email = await sendEmail({ to: driver.email, ...template });
      }
    }

    if (type === 'order_created' && client) {
      if (client.phone) {
        results.sms = await sendSMS({ 
          to: client.phone, 
          message: smsTemplates.orderCreated(order) 
        });
      }
      if (client.email) {
        const template = emailTemplates.orderCreated(order);
        results.email = await sendEmail({ to: client.email, ...template });
      }
    }

    if (type === 'order_picked_up' && client) {
      if (client.phone) {
        results.sms = await sendSMS({ 
          to: client.phone, 
          message: smsTemplates.orderPickedUp(order) 
        });
      }
      if (client.email) {
        const template = emailTemplates.orderPickedUp(order);
        results.email = await sendEmail({ to: client.email, ...template });
      }
    }

    if (type === 'order_delivered' && client) {
      if (client.phone) {
        results.sms = await sendSMS({ 
          to: client.phone, 
          message: smsTemplates.orderDelivered(order) 
        });
      }
      if (client.email) {
        const template = emailTemplates.orderDelivered(order);
        results.email = await sendEmail({ to: client.email, ...template });
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
