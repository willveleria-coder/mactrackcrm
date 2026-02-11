import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { to, message } = await request.json();
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 });
    }
    
    const credentials = Buffer.from(accountSid + ':' + authToken).toString('base64');
    
    const response = await fetch(
      'https://api.twilio.com/2010-04-01/Accounts/' + accountSid + '/Messages.json',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + credentials,
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
      const error = await response.json();
      console.error('Twilio error:', error);
      return NextResponse.json({ error: error.message || 'Failed to send SMS' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SMS error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
