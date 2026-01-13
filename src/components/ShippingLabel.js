"use client";

export default function ShippingLabel({ order, client, showPrintButton = true }) {
  if (!order) return null;

  const trackingUrl = `https://mactrackcrm.vercel.app/track/${order.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(trackingUrl)}`;

  // Calculate ETA based on service type
  const etaHours = { standard: 5, same_day: 12, next_day: 24, local_overnight: 24, emergency: 2, vip: 3, priority: 1.5, scheduled: 0, after_hours: 24 };
  const hours = etaHours[order.service_type] || 5;
  const etaDate = new Date(order.created_at || Date.now());
  etaDate.setHours(etaDate.getHours() + hours);
  const etaString = hours > 0 ? etaDate.toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "As Scheduled";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="label-container">
      {showPrintButton && (
        <button 
          onClick={handlePrint}
          className="print-btn no-print"
          style={{
            display: 'block',
            width: '100%',
            maxWidth: '420px',
            margin: '0 auto 16px',
            padding: '14px',
            background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)'
          }}
        >
          🖨️ Print Label
        </button>
      )}

      <div 
        className="shipping-label"
        style={{
          width: '100%',
          maxWidth: '420px',
          margin: '0 auto',
          backgroundColor: 'white',
          border: '3px solid #000',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact'
        }}
      >
        {/* Header */}
        <div className="label-header" style={{
          backgroundColor: '#dc2626',
          color: 'white',
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src="https://mactrackcrm.vercel.app/bus-icon.png" 
              alt="Logo"
              style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'contain' }}
            />
            <div>
              <div style={{ fontSize: '18px', fontWeight: '900' }}>MAC WITH A VAN</div>
              <div style={{ fontSize: '9px', opacity: 0.85, marginTop: '-2px' }}>Courier Service</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '9px', opacity: 0.75 }}>ORDER</div>
            <div style={{ fontSize: '14px', fontWeight: '900', fontFamily: 'monospace' }}>#{order.id?.slice(0, 8).toUpperCase()}</div>
          </div>
        </div>

        {/* QR + Service Row */}
        <div style={{ display: 'flex', borderBottom: '2px solid #000' }}>
          <div style={{
            padding: '12px',
            borderRight: '2px solid #000',
            backgroundColor: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <img src={qrUrl} alt="QR" style={{ width: '70px', height: '70px' }} />
            <div style={{ fontSize: '8px', color: '#6b7280', marginTop: '4px', fontWeight: '600' }}>SCAN TO TRACK</div>
          </div>
          <div className="service-section" style={{ flex: 1, padding: '12px', backgroundColor: '#f9fafb', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '9px', color: '#6b7280', fontWeight: '600' }}>SERVICE TYPE</div>
                <div style={{ fontSize: '13px', fontWeight: '900', color: '#111', textTransform: 'uppercase' }}>
                  {order.service_type?.replace(/_/g, ' ') || 'Standard'}
                </div>
              </div>
              {order.fragile && (
                <div style={{
                  background: '#fee2e2',
                  border: '2px solid #f87171',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '10px',
                  fontWeight: '900',
                  color: '#dc2626',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}>
                  ⚠️ FRAGILE
                </div>
              )}
            </div>
            {order.scheduled_date && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '9px', color: '#6b7280', fontWeight: '600' }}>SCHEDULED</div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#111' }}>
                  {order.scheduled_date} {order.scheduled_time || ''}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Addresses */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '2px solid #000' }}>
          {/* Pickup */}
          <div className="pickup-section" style={{ padding: '12px', backgroundColor: '#eff6ff', borderRight: '2px solid #000', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
              <span style={{ fontSize: '14px' }}>📍</span>
              <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#1e40af' }}>Pickup From</span>
            </div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#111', lineHeight: 1.3 }}>
              {order.pickup_address || 'N/A'}
            </div>
            {order.pickup_contact_name && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#374151' }}>{order.pickup_contact_name}</div>
                {order.pickup_contact_phone && (
                  <div style={{ fontSize: '9px', color: '#6b7280' }}>📞 {order.pickup_contact_phone}</div>
                )}
              </div>
            )}
          </div>

          {/* Delivery */}
          <div className="delivery-section" style={{ padding: '12px', backgroundColor: '#f0fdf4', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
              <span style={{ fontSize: '14px' }}>🎯</span>
              <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#166534' }}>Deliver To</span>
            </div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#111', lineHeight: 1.3 }}>
              {order.dropoff_address || 'N/A'}
            </div>
            {order.dropoff_contact_name && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#374151' }}>{order.dropoff_contact_name}</div>
                {order.dropoff_contact_phone && (
                  <div style={{ fontSize: '9px', color: '#6b7280' }}>📞 {order.dropoff_contact_phone}</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Parcel Details */}
        <div className="parcel-section" style={{
          padding: '10px 12px',
          backgroundColor: '#f3f4f6',
          borderBottom: '2px solid #000',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact'
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '8px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Size</div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#111' }}>{order.parcel_size?.replace(/_/g, ' ') || 'N/A'}</div>
            </div>
            <div style={{ width: '1px', height: '24px', backgroundColor: '#d1d5db' }}></div>
            <div>
              <div style={{ fontSize: '8px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Weight</div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#111' }}>{order.parcel_weight || 0} kg</div>
            </div>
            <div style={{ width: '1px', height: '24px', backgroundColor: '#d1d5db' }}></div>
            <div>
              <div style={{ fontSize: '8px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Qty</div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#111' }}>{order.quantity || 1}</div>
            </div>
          </div>
          <div style={{ fontSize: '20px' }}>📦</div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="notes-section" style={{ padding: '10px 12px', backgroundColor: '#fefce8', borderBottom: '2px solid #000', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <div style={{ fontSize: '9px', fontWeight: '900', color: '#a16207', textTransform: 'uppercase', marginBottom: '4px' }}>
              📋 Delivery Instructions
            </div>
            <div style={{ fontSize: '11px', color: '#111', lineHeight: 1.4 }}>{order.notes}</div>
          </div>
        )}

        {/* Customer & Date Row */}
        <div style={{ padding: '8px 12px', backgroundColor: 'white', borderBottom: '2px solid #000', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '8px', color: '#6b7280', fontWeight: '600' }}>CUSTOMER</div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#111' }}>{client?.name || order.client?.name || 'N/A'}</div>
          </div>
          <div>
            <div style={{ fontSize: '8px', color: '#6b7280', fontWeight: '600' }}>DATE</div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#111' }}>
              {order.created_at ? new Date(order.created_at).toLocaleDateString('en-AU') : 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '8px', color: '#6b7280', fontWeight: '600' }}>ETA</div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#111' }}>{etaString}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="label-footer" style={{
          backgroundColor: '#111827',
          color: 'white',
          padding: '10px 12px',
          textAlign: 'center',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact'
        }}>
          <div style={{ fontSize: '10px', fontWeight: '600' }}>
            📞 1300 170 718 | ✉️ macwithavan@mail.com
          </div>
          <div style={{ fontSize: '8px', opacity: 0.7, marginTop: '2px' }}>
            Keep this label visible during transit
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 15mm; 
          }
          body { 
            background: white !important; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print { 
            display: none !important; 
          }
          .label-container { 
            padding: 0 !important; 
          }
          .shipping-label {
            box-shadow: none !important;
            max-width: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .label-header {
            background-color: #dc2626 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .service-section {
            background-color: #f9fafb !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .pickup-section {
            background-color: #eff6ff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .delivery-section {
            background-color: #f0fdf4 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .parcel-section {
            background-color: #f3f4f6 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .notes-section {
            background-color: #fefce8 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .label-footer {
            background-color: #111827 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
