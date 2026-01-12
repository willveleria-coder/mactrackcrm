// Generates a beautiful, compact shipping label HTML that fits on one page
// Use this for popup print windows in admin and driver portals

export function generateLabelHTML(order, options = {}) {
  const { autoPrint = false } = options;
  const trackingUrl = `https://mactrackcrm-xatn.vercel.app/track/${order.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(trackingUrl)}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Label #${order.id?.slice(0, 8).toUpperCase()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f3f4f6;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
    }
    
    .label-wrapper {
      width: 100%;
      max-width: 420px;
    }
    
    .print-btn {
      display: block;
      width: 100%;
      padding: 14px 24px;
      background: linear-gradient(135deg, #dc2626, #b91c1c);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      margin-bottom: 16px;
      box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .print-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(220, 38, 38, 0.5);
    }
    
    .label {
      background: white;
      border: 3px solid #000;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    }
    
    .header {
      background: #dc2626;
      color: white;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .logo-circle {
      width: 32px;
      height: 32px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }
    
    .brand-name {
      font-size: 18px;
      font-weight: 900;
      letter-spacing: -0.5px;
    }
    
    .brand-sub {
      font-size: 9px;
      opacity: 0.85;
      margin-top: -2px;
    }
    
    .order-id-label {
      font-size: 9px;
      opacity: 0.75;
      text-align: right;
    }
    
    .order-id-value {
      font-size: 14px;
      font-weight: 900;
      font-family: monospace;
    }
    
    .qr-service-row {
      display: flex;
      border-bottom: 2px solid #000;
    }
    
    .qr-section {
      padding: 12px;
      border-right: 2px solid #000;
      background: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    
    .qr-section img {
      width: 70px;
      height: 70px;
    }
    
    .qr-text {
      font-size: 8px;
      color: #6b7280;
      margin-top: 4px;
      font-weight: 600;
    }
    
    .service-section {
      flex: 1;
      padding: 12px;
      background: #f9fafb;
    }
    
    .service-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    
    .service-label {
      font-size: 9px;
      color: #6b7280;
      font-weight: 600;
    }
    
    .service-value {
      font-size: 13px;
      font-weight: 900;
      color: #111;
      text-transform: uppercase;
    }
    
    .fragile-badge {
      background: #fee2e2;
      border: 2px solid #f87171;
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 10px;
      font-weight: 900;
      color: #dc2626;
    }
    
    .scheduled-info {
      margin-top: 10px;
    }
    
    .scheduled-value {
      font-size: 12px;
      font-weight: 700;
      color: #111;
    }
    
    .addresses {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-bottom: 2px solid #000;
    }
    
    .address-box {
      padding: 12px;
    }
    
    .pickup {
      background: #eff6ff;
      border-right: 2px solid #000;
    }
    
    .delivery {
      background: #f0fdf4;
    }
    
    .address-header {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 6px;
    }
    
    .address-icon {
      font-size: 14px;
    }
    
    .address-title {
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
    }
    
    .pickup .address-title { color: #1e40af; }
    .delivery .address-title { color: #166534; }
    
    .address-text {
      font-size: 11px;
      font-weight: 600;
      color: #111;
      line-height: 1.3;
    }
    
    .contact-info {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(0,0,0,0.1);
    }
    
    .contact-name {
      font-size: 10px;
      font-weight: 700;
      color: #374151;
    }
    
    .contact-phone {
      font-size: 9px;
      color: #6b7280;
    }
    
    .parcel-row {
      padding: 10px 12px;
      background: #f3f4f6;
      border-bottom: 2px solid #000;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .parcel-details {
      display: flex;
      gap: 16px;
      align-items: center;
    }
    
    .parcel-item {
      text-align: left;
    }
    
    .parcel-label {
      font-size: 8px;
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .parcel-value {
      font-size: 11px;
      font-weight: 700;
      color: #111;
    }
    
    .parcel-divider {
      width: 1px;
      height: 24px;
      background: #d1d5db;
    }
    
    .parcel-icon {
      font-size: 20px;
    }
    
    .notes-section {
      padding: 10px 12px;
      background: #fefce8;
      border-bottom: 2px solid #000;
    }
    
    .notes-title {
      font-size: 9px;
      font-weight: 900;
      color: #a16207;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    
    .notes-text {
      font-size: 11px;
      color: #111;
      line-height: 1.4;
    }
    
    .customer-row {
      padding: 8px 12px;
      background: white;
      border-bottom: 2px solid #000;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .customer-label, .date-label {
      font-size: 8px;
      color: #6b7280;
      font-weight: 600;
    }
    
    .customer-value, .date-value {
      font-size: 11px;
      font-weight: 700;
      color: #111;
    }
    
    .footer {
      background: #111827;
      color: white;
      padding: 10px 12px;
      text-align: center;
    }
    
    .footer-contact {
      font-size: 10px;
      font-weight: 600;
    }
    
    .footer-note {
      font-size: 8px;
      opacity: 0.7;
      margin-top: 2px;
    }
    
    @media print {
      @page {
        size: A4 portrait;
        margin: 15mm;
      }
      
      body {
        background: white !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .print-btn {
        display: none !important;
      }
      
      .label-wrapper {
        max-width: 100% !important;
      }
      
      .label {
        box-shadow: none !important;
        border-width: 2px !important;
      }
      
      .header { background: #dc2626 !important; color: white !important; }
      .pickup { background: #eff6ff !important; }
      .delivery { background: #f0fdf4 !important; }
      .parcel-row { background: #f3f4f6 !important; }
      .notes-section { background: #fefce8 !important; }
      .footer { background: #111827 !important; color: white !important; }
      .fragile-badge { background: #fee2e2 !important; }
    }
  </style>
</head>
<body>
  <div class="label-wrapper">
    <button class="print-btn" onclick="window.print()">🖨️ Print Label</button>
    
    <div class="label">
      <!-- Header -->
      <div class="header">
        <div class="header-left">
          <div class="logo-circle">🚐</div>
          <div>
            <div class="brand-name">MAC TRACK</div>
            <div class="brand-sub">Courier Service</div>
          </div>
        </div>
        <div>
          <div class="order-id-label">ORDER</div>
          <div class="order-id-value">#${order.id?.slice(0, 8).toUpperCase()}</div>
        </div>
      </div>
      
      <!-- QR + Service -->
      <div class="qr-service-row">
        <div class="qr-section">
          <img src="${qrUrl}" alt="QR Code" />
          <div class="qr-text">SCAN TO TRACK</div>
        </div>
        <div class="service-section">
          <div class="service-header">
            <div>
              <div class="service-label">SERVICE TYPE</div>
              <div class="service-value">${order.service_type?.replace(/_/g, ' ') || 'Standard'}</div>
            </div>
            ${order.fragile ? '<div class="fragile-badge">⚠️ FRAGILE</div>' : ''}
          </div>
          ${order.scheduled_date ? `
          <div class="scheduled-info">
            <div class="service-label">SCHEDULED</div>
            <div class="scheduled-value">${order.scheduled_date} ${order.scheduled_time || ''}</div>
          </div>
          ` : ''}
        </div>
      </div>
      
      <!-- Addresses -->
      <div class="addresses">
        <div class="address-box pickup">
          <div class="address-header">
            <span class="address-icon">📍</span>
            <span class="address-title">Pickup From</span>
          </div>
          <div class="address-text">${order.pickup_address || 'N/A'}</div>
          ${order.pickup_contact_name ? `
          <div class="contact-info">
            <div class="contact-name">${order.pickup_contact_name}</div>
            ${order.pickup_contact_phone ? `<div class="contact-phone">📞 ${order.pickup_contact_phone}</div>` : ''}
          </div>
          ` : ''}
        </div>
        <div class="address-box delivery">
          <div class="address-header">
            <span class="address-icon">🎯</span>
            <span class="address-title">Deliver To</span>
          </div>
          <div class="address-text">${order.dropoff_address || 'N/A'}</div>
          ${order.dropoff_contact_name ? `
          <div class="contact-info">
            <div class="contact-name">${order.dropoff_contact_name}</div>
            ${order.dropoff_contact_phone ? `<div class="contact-phone">📞 ${order.dropoff_contact_phone}</div>` : ''}
          </div>
          ` : ''}
        </div>
      </div>
      
      <!-- Parcel Details -->
      <div class="parcel-row">
        <div class="parcel-details">
          <div class="parcel-item">
            <div class="parcel-label">Size</div>
            <div class="parcel-value">${order.parcel_size?.replace(/_/g, ' ') || 'N/A'}</div>
          </div>
          <div class="parcel-divider"></div>
          <div class="parcel-item">
            <div class="parcel-label">Weight</div>
            <div class="parcel-value">${order.parcel_weight || 0} kg</div>
          </div>
          <div class="parcel-divider"></div>
          <div class="parcel-item">
            <div class="parcel-label">Qty</div>
            <div class="parcel-value">${order.quantity || 1}</div>
          </div>
          ${(order.length || order.width || order.height) ? `
          <div class="parcel-divider"></div>
          <div class="parcel-item">
            <div class="parcel-label">Dims</div>
            <div class="parcel-value">${order.length || 0}×${order.width || 0}×${order.height || 0}cm</div>
          </div>
          ` : ''}
        </div>
        <div class="parcel-icon">📦</div>
      </div>
      
      <!-- Notes -->
      ${order.notes ? `
      <div class="notes-section">
        <div class="notes-title">📝 Delivery Instructions</div>
        <div class="notes-text">${order.notes}</div>
      </div>
      ` : ''}
      
      <!-- Customer & Date -->
      <div class="customer-row">
        <div>
          <div class="customer-label">CUSTOMER</div>
          <div class="customer-value">${order.client?.name || 'N/A'}</div>
        </div>
        <div style="text-align: right;">
          <div class="date-label">DATE</div>
          <div class="date-value">${order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}</div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <div class="footer-contact">📞 1300 170 718 &nbsp;|&nbsp; ✉️ macwithavan@mail.com</div>
        <div class="footer-note">Keep this label visible during transit</div>
      </div>
    </div>
  </div>
  
  ${autoPrint ? '<script>window.onload = function() { window.print(); }</script>' : ''}
</body>
</html>`;
}

// Helper function to open label in new window
export function openLabelWindow(order, autoPrint = false) {
  const html = generateLabelHTML(order, { autoPrint });
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  return win;
}

// Helper function to print label directly
export function printLabel(order) {
  openLabelWindow(order, true);
}