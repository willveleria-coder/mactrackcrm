import { NextResponse } from 'next/server';

export async function GET(request) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  
  return NextResponse.json({ 
    hasSid: !!accountSid,
    hasToken: !!authToken,
    hasFrom: !!fromNumber,
    sidStart: accountSid?.slice(0, 5) || 'none',
    fromNumber: fromNumber || 'none'
  });
}
