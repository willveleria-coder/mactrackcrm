import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { to, message } = await request.json();

    // Using Twilio API
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: to,
          From: fromNumber,
          Body: message
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send SMS');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SMS error:', error);
    return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 });
  }
}