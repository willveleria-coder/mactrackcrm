import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { to, subject, html } = await request.json();

    // Using Resend API (sign up at resend.com for free)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Mac Track <noreply@mactrack.com.au>',
        to: [to],
        subject,
        html
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}