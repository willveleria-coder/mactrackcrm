"use client";
import { QRCodeSVG } from "qrcode.react";

export default function ShippingLabel({ order, client, showPrintButton = true }) {
  const baseUrl = 'https://mactrackcrm.vercel.app';
  const trackingUrl = `${baseUrl}/track/${order?.id}`;

  if (!order) return null;

  // Calculate ETA based on service type
  const etaHours = { standard: 5, same_day: 12, next_day: 24, local_overnight: 24, emergency: 2, vip: 3, priority: 1.5, scheduled: 0, after_hours: 24 };
  const hours = etaHours[order.service_type] || 5;
  const etaDate = new Date(order.created_at || Date.now());
  etaDate.setHours(etaDate.getHours() + hours);
  const etaString = hours > 0 ? etaDate.toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "As Scheduled";

  return (
    <div className="label-page">
      {showPrintButton && (
        <div className="no-print flex justify-center mb-6">
          <button onClick={() => window.print()} className="px-10 py-4 bg-red-600 text-white rounded-2xl font-bold text-lg hover:bg-red-700 transition shadow-xl">
            🖨️ Print Label
          </button>
        </div>
      )}

      <div id="printable-label" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', backgroundColor: 'white', border: '3px solid black', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        
        <div style={{ backgroundColor: '#dc2626', color: 'white', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img src="/bus-icon.png" alt="Mac Track" style={{ width: '70px', height: '70px', borderRadius: '16px', objectFit: 'contain', backgroundColor: 'white' }} />
            <div>
              <h1 style={{ fontSize: '42px', fontWeight: '900', margin: 0 }}>MAC TRACK</h1>
              <p style={{ fontSize: '18px', margin: 0, opacity: 0.9 }}>Courier Service</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '14px', margin: 0, opacity: 0.8 }}>ORDER ID</p>
            <p style={{ fontSize: '32px', fontWeight: '900', margin: 0, fontFamily: 'monospace' }}>#{order.id?.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '3px solid black' }}>
          <div style={{ padding: '24px', borderRight: '3px solid black', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '180px' }}>
            <QRCodeSVG value={trackingUrl} size={130} level="H" />
            <p style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '12px', color: '#666' }}>SCAN TO TRACK</p>
          </div>
          <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: '14px', color: '#666', fontWeight: 'bold', marginBottom: '8px' }}>SERVICE TYPE</p>
            <div style={{ display: 'inline-block', backgroundColor: '#dc2626', color: 'white', padding: '12px 24px', borderRadius: '12px', width: 'fit-content' }}>
              <p style={{ fontSize: '28px', fontWeight: '900', margin: 0 }}>{order.service_type?.replace(/_/g, ' ').toUpperCase() || 'STANDARD'}</p>
            </div>
            <div style={{ marginTop: '12px' }}>
              <p style={{ fontSize: '14px', color: '#666', fontWeight: 'bold' }}>ETA</p>
              <p style={{ fontSize: '20px', fontWeight: '900', margin: 0 }}>{etaString}</p>
            </div>
            {order.fragile && (
              <div style={{ marginTop: '16px', backgroundColor: '#fee2e2', border: '3px solid #dc2626', borderRadius: '12px', padding: '12px 20px', display: 'inline-block', width: 'fit-content' }}>
                <p style={{ fontSize: '24px', fontWeight: '900', color: '#dc2626', margin: 0 }}>⚠️ FRAGILE</p>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '3px solid black' }}>
          <div style={{ flex: 1, padding: '24px', borderRight: '3px solid black', backgroundColor: '#eff6ff', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: '#2563eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📍</div>
              <p style={{ fontSize: '18px', fontWeight: '900', color: '#2563eb', margin: 0 }}>PICKUP FROM</p>
            </div>
            <p style={{ fontSize: '22px', fontWeight: 'bold', lineHeight: 1.4 }}>{order.pickup_address}</p>
            {order.pickup_contact_name && (
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', border: '2px solid #bfdbfe', marginTop: '12px' }}>
                <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>👤 {order.pickup_contact_name}</p>
                {order.pickup_contact_phone && <p style={{ fontSize: '18px', margin: '8px 0 0 0', color: '#666' }}>📞 {order.pickup_contact_phone}</p>}
              </div>
            )}
          </div>
          <div style={{ flex: 1, padding: '24px', backgroundColor: '#f0fdf4', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🎯</div>
              <p style={{ fontSize: '18px', fontWeight: '900', color: '#16a34a', margin: 0 }}>DELIVER TO</p>
            </div>
            <p style={{ fontSize: '22px', fontWeight: 'bold', lineHeight: 1.4 }}>{order.dropoff_address}</p>
            {order.dropoff_contact_name && (
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', border: '2px solid #bbf7d0', marginTop: '12px' }}>
                <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>👤 {order.dropoff_contact_name}</p>
                {order.dropoff_contact_phone && <p style={{ fontSize: '18px', margin: '8px 0 0 0', color: '#666' }}>📞 {order.dropoff_contact_phone}</p>}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '24px', borderBottom: '3px solid black', backgroundColor: '#f3f4f6' }}>
          <p style={{ fontSize: '20px', fontWeight: '900', marginBottom: '16px' }}>📦 PARCEL DETAILS</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '2px solid #e5e7eb' }}>
              <p style={{ fontSize: '14px', color: '#666', fontWeight: 'bold', marginBottom: '8px' }}>SIZE</p>
              <p style={{ fontSize: '24px', fontWeight: '900', margin: 0 }}>{order.parcel_size?.replace(/_/g, ' ') || 'N/A'}</p>
            </div>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '2px solid #e5e7eb' }}>
              <p style={{ fontSize: '14px', color: '#666', fontWeight: 'bold', marginBottom: '8px' }}>WEIGHT</p>
              <p style={{ fontSize: '24px', fontWeight: '900', margin: 0 }}>{order.parcel_weight || 0} kg</p>
            </div>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '2px solid #e5e7eb' }}>
              <p style={{ fontSize: '14px', color: '#666', fontWeight: 'bold', marginBottom: '8px' }}>QTY</p>
              <p style={{ fontSize: '24px', fontWeight: '900', margin: 0 }}>{order.quantity || 1}</p>
            </div>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '2px solid #e5e7eb' }}>
              <p style={{ fontSize: '14px', color: '#666', fontWeight: 'bold', marginBottom: '8px' }}>DIMENSIONS</p>
              <p style={{ fontSize: '24px', fontWeight: '900', margin: 0 }}>{order.length && order.width && order.height ? `${order.length}x${order.width}x${order.height}` : 'N/A'}</p>
            </div>
          </div>
        </div>

        {order.notes && (
          <div style={{ padding: '24px', borderBottom: '3px solid black', backgroundColor: '#fefce8' }}>
            <p style={{ fontSize: '20px', fontWeight: '900', marginBottom: '12px', color: '#854d0e' }}>📝 DELIVERY INSTRUCTIONS</p>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', border: '2px solid #fde047' }}>
              <p style={{ fontSize: '20px', lineHeight: 1.5, margin: 0 }}>{order.notes}</p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', borderBottom: '3px solid black' }}>
          <div style={{ flex: 1, padding: '20px 24px', borderRight: '3px solid black', backgroundColor: 'white' }}>
            <p style={{ fontSize: '14px', color: '#666', fontWeight: 'bold', marginBottom: '8px' }}>CUSTOMER</p>
            <p style={{ fontSize: '22px', fontWeight: '900', margin: 0 }}>{client?.name || order.client?.name || 'N/A'}</p>
            {(client?.email || order.client?.email) && <p style={{ fontSize: '16px', color: '#666', margin: '8px 0 0 0' }}>{client?.email || order.client?.email}</p>}
          </div>
          <div style={{ flex: 1, padding: '20px 24px', backgroundColor: 'white' }}>
            <p style={{ fontSize: '14px', color: '#666', fontWeight: 'bold', marginBottom: '8px' }}>ORDER DATE</p>
            <p style={{ fontSize: '22px', fontWeight: '900', margin: 0 }}>{order.created_at ? new Date(order.created_at).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</p>
          </div>
        </div>

        <div style={{ backgroundColor: '#111827', color: 'white', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          <div>
            <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>📞 0430 233 811</p>
            <p style={{ fontSize: '14px', opacity: 0.75, margin: '4px 0 0 0' }}>macwithavan@mail.com</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>ABN: 18 616 164 875</p>
            <p style={{ fontSize: '12px', opacity: 0.75, margin: '4px 0 0 0' }}>Keep label visible during transit</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Mac Track</p>
            <p style={{ fontSize: '14px', opacity: 0.75, margin: '4px 0 0 0' }}>Melbourne, Australia</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .label-page { padding: 0 !important; }
          #printable-label { 
            width: 210mm !important; 
            min-height: 297mm !important; 
            margin: 0 !important;
            border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}