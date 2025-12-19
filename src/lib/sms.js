export async function sendSMS({ to, message }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.error('Twilio credentials not configured');
    return { success: false, error: 'SMS not configured' };
  }

  // Format Australian number
  let formattedTo = to.replace(/\s/g, '');
  if (formattedTo.startsWith('0')) {
    formattedTo = '+61' + formattedTo.slice(1);
  } else if (!formattedTo.startsWith('+')) {
    formattedTo = '+61' + formattedTo;
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: formattedTo,
          From: fromNumber,
          Body: message
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Twilio error:', data);
      return { success: false, error: data.message };
    }

    return { success: true, sid: data.sid };
  } catch (error) {
    console.error('SMS error:', error);
    return { success: false, error: error.message };
  }
}

export const smsTemplates = {
  orderCreated: (order) =>
    `✅ Mac Track: Order #${order.id?.slice(0, 8).toUpperCase()} confirmed! Track: mactrackcrm.vercel.app/track/${order.id}`,

  orderPickedUp: (order) =>
    `📦 Mac Track: Your order has been picked up and is on its way! Track live: mactrackcrm.vercel.app/track/${order.id}`,

  orderDelivered: (order) =>
    `🎉 Mac Track: Your order has been delivered! Thank you for choosing us.`,

  driverAssigned: (order) =>
    `🚚 Mac Track: New job assigned! Pickup: ${order.pickup_address?.slice(0, 50)}... Open app to accept.`,

  driverReminder: (order) =>
    `⚠️ Mac Track: You have a pending job! Please accept or reject ASAP.`
};
