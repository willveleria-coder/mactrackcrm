import { NextResponse } from 'next/server';

export async function GET(request) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  
  try {
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
          To: '+61414926698',
          From: fromNumber,
          Body: 'Test SMS from Mac Track!'
        })
      }
    );
    
    const data = await response.json();
    return NextResponse.json({ success: response.ok, data });
  } catch (error) {
    return NextResponse.json({ error: error.message });
  }
}
