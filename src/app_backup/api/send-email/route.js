import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { to, subject, html } = await request.json();

    // Using Resend API (free tier: 100 emails/day)
    // Sign up at resend.com and add RESEND_API_KEY to Vercel env vars
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Mac Track <onboarding@resend.dev>',
        to: [to],
        subject,
        html
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Email error:', error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}