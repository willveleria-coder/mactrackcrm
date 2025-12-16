cat > components/ShippingLabel.jsx << 'EOF'
"use client";
import { QRCodeSVG } from "qrcode.react";

export default function ShippingLabel({ order, client, showPrintButton = true }) {
  const baseUrl = 'https://mactrackcrm-xatn.vercel.app';
  const trackingUrl = `${baseUrl}/track/${order?.id}`;

  if (!order) return null;

  return (
    <div className="label-page min-h-screen bg-gray-200 p-4 print:p-0 print:bg-white">
      {showPrintButton && (
        <div className="print:hidden flex justify-center mb-6">
          <button onClick={() => window.print()} className="px-10 py-4 bg-red-600 text-white rounded-2xl font-bold text-lg hover:bg-red-700 transition shadow-xl flex items-center gap-3">
            <span className="text-2xl">🖨️</span> Print Label
          </button>
        </div>
      )}

      <div className="label-container bg-white border-4 border-black overflow-hidden mx-auto shadow-2xl print:shadow-none print:border-[3px] print:min-h-[100vh]" style={{ maxWidth: '210mm', minHeight: '290mm' }}>
        
        {/* Header - Red Banner - BIGGER */}
        <div className="bg-red-600 text-white px-10 py-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-5xl">🚐</span>
              </div>
              <div>
                <h1 className="text-5xl font-black tracking-tight">MAC TRACK</h1>
                <p className="text-xl opacity-90 font-medium mt-1">Courier Service</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg opacity-75 uppercase tracking-wide">Order ID</p>
              <p className="text-4xl font-black font-mono mt-1">#{order.id?.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* QR Code & Service Section - BIGGER */}
        <div className="flex border-b-4 border-black" style={{ minHeight: '180px' }}>
          <div className="p-8 border-r-4 border-black bg-gray-50 flex flex-col items-center justify-center" style={{ minWidth: '220px' }}>
            <QRCodeSVG value={trackingUrl} size={150} level="H" includeMargin={false} />
            <p className="text-base text-gray-600 mt-4 font-bold uppercase tracking-wide">Scan to Track</p>
            <p className="text-sm text-gray-400 font-mono mt-1">{order.id?.slice(0, 8).toUpperCase()}</p>
          </div>
          
          <div className="flex-1 p-8 bg-white flex flex-col justify-center">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-base text-gray-500 font-bold uppercase tracking-wide mb-3">Service Type</p>
                <div className="inline-block bg-red-600 text-white px-8 py-4 rounded-xl">
                  <p className="text-3xl font-black uppercase">{order.service_type?.replace(/_/g, ' ') || 'Standard'}</p>
                </div>
              </div>
              {order.fragile && (
                <div className="bg-red-100 border-4 border-red-500 rounded-xl px-8 py-5">
                  <p className="text-3xl font-black text-red-600">⚠️ FRAGILE</p>
                  <p className="text-base text-red-500 font-bold mt-1">Handle with Care</p>
                </div>
              )}
            </div>
            {order.scheduled_date && (
              <div className="mt-6 bg-blue-50 rounded-xl p-5 border-2 border-blue-200">
                <p className="text-base text-blue-600 font-bold uppercase">📅 Scheduled Delivery</p>
                <p className="text-2xl font-black text-gray-900 mt-2">{order.scheduled_date} {order.scheduled_time && `at ${order.scheduled_time}`}</p>
              </div>
            )}
          </div>
        </div>

        {/* Addresses - MUCH BIGGER */}
        <div className="grid grid-cols-2 border-b-4 border-black" style={{ minHeight: '240px' }}>
          <div className="p-8 border-r-4 border-black bg-blue-50 flex flex-col">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center"><span className="text-3xl">📍</span></div>
              <div>
                <p className="text-lg text-blue-600 font-black uppercase tracking-wide">Pickup From</p>
                <p className="text-sm text-blue-400">Collection Point</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 leading-relaxed mb-5 flex-grow">{order.pickup_address}</p>
            {order.pickup_contact_name && (
              <div className="bg-white rounded-xl p-5 border-2 border-blue-200">
                <p className="text-xl font-bold text-gray-900">👤 {order.pickup_contact_name}</p>
                {order.pickup_contact_phone && <p className="text-xl text-gray-600 mt-2">📞 {order.pickup_contact_phone}</p>}
              </div>
            )}
          </div>

          <div className="p-8 bg-green-50 flex flex-col">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center"><span className="text-3xl">🎯</span></div>
              <div>
                <p className="text-lg text-green-600 font-black uppercase tracking-wide">Deliver To</p>
                <p className="text-sm text-green-400">Destination</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 leading-relaxed mb-5 flex-grow">{order.dropoff_address}</p>
            {order.dropoff_contact_name && (
              <div className="bg-white rounded-xl p-5 border-2 border-green-200">
                <p className="text-xl font-bold text-gray-900">👤 {order.dropoff_contact_name}</p>
                {order.dropoff_contact_phone && <p className="text-xl text-gray-600 mt-2">📞 {order.dropoff_contact_phone}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Parcel Details - BIGGER */}
        <div className="p-8 border-b-4 border-black bg-gray-100" style={{ minHeight: '160px' }}>
          <div className="flex items-center gap-4 mb-6">
            <span className="text-4xl">📦</span>
            <p className="text-2xl font-black text-gray-900 uppercase">Parcel Details</p>
          </div>
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 text-center border-2 border-gray-200">
              <p className="text-base text-gray-500 font-bold uppercase mb-3">Size</p>
              <p className="text-2xl font-black text-gray-900 capitalize">{order.parcel_size?.replace(/_/g, ' ') || 'N/A'}</p>
            </div>
            <div className="bg-white rounded-xl p-6 text-center border-2 border-gray-200">
              <p className="text-base text-gray-500 font-bold uppercase mb-3">Weight</p>
              <p className="text-2xl font-black text-gray-900">{order.parcel_weight || 0} kg</p>
            </div>
            <div className="bg-white rounded-xl p-6 text-center border-2 border-gray-200">
              <p className="text-base text-gray-500 font-bold uppercase mb-3">Quantity</p>
              <p className="text-2xl font-black text-gray-900">{order.quantity || 1}</p>
            </div>
            <div className="bg-white rounded-xl p-6 text-center border-2 border-gray-200">
              <p className="text-base text-gray-500 font-bold uppercase mb-3">Dimensions</p>
              <p className="text-2xl font-black text-gray-900">{order.length && order.width && order.height ? `${order.length}×${order.width}×${order.height}` : 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Notes - BIGGER */}
        {order.notes ? (
          <div className="p-8 border-b-4 border-black bg-yellow-50" style={{ minHeight: '140px' }}>
            <div className="flex items-center gap-4 mb-5">
              <span className="text-4xl">📝</span>
              <p className="text-2xl font-black text-yellow-800 uppercase">Delivery Instructions</p>
            </div>
            <div className="bg-white rounded-xl p-6 border-2 border-yellow-300">
              <p className="text-xl text-gray-900 leading-relaxed whitespace-pre-wrap">{order.notes}</p>
            </div>
          </div>
        ) : (
          <div className="p-8 border-b-4 border-black bg-gray-50" style={{ minHeight: '100px' }}>
            <div className="flex items-center gap-4">
              <span className="text-4xl">📝</span>
              <p className="text-2xl font-black text-gray-400 uppercase">No Special Instructions</p>
            </div>
          </div>
        )}

        {/* Customer & Date - BIGGER */}
        <div className="grid grid-cols-2 border-b-4 border-black" style={{ minHeight: '120px' }}>
          <div className="p-8 border-r-4 border-black bg-white flex flex-col justify-center">
            <p className="text-base text-gray-500 font-bold uppercase mb-2">Customer</p>
            <p className="text-2xl font-black text-gray-900">{client?.name || order.client?.name || 'N/A'}</p>
            {(client?.email || order.client?.email) && <p className="text-lg text-gray-500 mt-2">{client?.email || order.client?.email}</p>}
            {(client?.phone || order.client?.phone) && <p className="text-lg text-gray-500 mt-1">📞 {client?.phone || order.client?.phone}</p>}
          </div>
          <div className="p-8 bg-white flex flex-col justify-center">
            <p className="text-base text-gray-500 font-bold uppercase mb-2">Order Date</p>
            <p className="text-2xl font-black text-gray-900">{order.created_at ? new Date(order.created_at).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</p>
            <p className="text-lg text-gray-500 mt-2">{order.created_at ? new Date(order.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : ''}</p>
          </div>
        </div>

        {/* Footer - BIGGER */}
        <div className="bg-gray-900 text-white px-10 py-8">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-2xl font-bold">📞 0430 233 811</p>
              <p className="text-lg opacity-75 mt-1">macwithavan@mail.com</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">ABN: 18 616 164 875</p>
              <p className="text-base opacity-75 mt-2">⚠️ Keep this label visible during transit</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">Mac Track</p>
              <p className="text-lg opacity-75 mt-1">Sydney, Australia</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print\\:hidden { display: none !important; }
          .label-page { padding: 0 !important; min-height: 100vh !important; background: white !important; }
          .label-container { max-width: 100% !important; min-height: 100vh !important; box-shadow: none !important; border-radius: 0 !important; display: flex; flex-direction: column; }
          .bg-red-600 { background-color: #dc2626 !important; }
          .bg-blue-50 { background-color: #eff6ff !important; }
          .bg-blue-600 { background-color: #2563eb !important; }
          .bg-green-50 { background-color: #f0fdf4 !important; }
          .bg-green-600 { background-color: #16a34a !important; }
          .bg-yellow-50 { background-color: #fefce8 !important; }
          .bg-gray-50 { background-color: #f9fafb !important; }
          .bg-gray-100 { background-color: #f3f4f6 !important; }
          .bg-gray-900 { background-color: #111827 !important; }
          .text-white { color: white !important; }
        }
      `}</style>
    </div>
  );
}