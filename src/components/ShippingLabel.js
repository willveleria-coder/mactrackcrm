"use client";
import { QRCodeSVG } from "qrcode.react";

export default function ShippingLabel({ order, client, showPrintButton = true, onPrint }) {
  const baseUrl = 'https://mactrackcrm-xatn.vercel.app';
  const trackingUrl = `${baseUrl}/track/${order?.id}`;

  function handlePrint() {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  }

  if (!order) return null;

  return (
    <div className="label-container">
      {/* Print Button - Hidden when printing */}
      {showPrintButton && (
        <div className="print:hidden flex justify-center mb-4">
          <button
            onClick={handlePrint}
            className="px-8 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition shadow-lg flex items-center gap-2"
          >
            🖨️ Print Label
          </button>
        </div>
      )}

      {/* The Label */}
      <div className="label bg-white border-[3px] border-black rounded-lg overflow-hidden max-w-[500px] mx-auto shadow-xl print:shadow-none print:border-2">
        
        {/* Header Band */}
        <div className="bg-red-600 text-white px-4 py-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-red-600 text-lg">🚐</span>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">MAC TRACK</h1>
              <p className="text-[10px] opacity-90 -mt-1">Courier Service</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] opacity-75">ORDER</p>
            <p className="text-sm font-black font-mono">#{order.id?.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        {/* QR + Service Row */}
        <div className="flex border-b-2 border-black">
          {/* QR Code */}
          <div className="p-3 border-r-2 border-black bg-white flex flex-col items-center justify-center">
            <QRCodeSVG 
              value={trackingUrl} 
              size={70}
              level="M"
              includeMargin={false}
            />
            <p className="text-[8px] text-gray-500 mt-1 font-medium">SCAN TO TRACK</p>
          </div>
          
          {/* Service Info */}
          <div className="flex-1 p-3 bg-gray-50">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-gray-500 font-medium">SERVICE TYPE</p>
                <p className="text-sm font-black text-gray-900 uppercase">
                  {order.service_type?.replace(/_/g, ' ') || 'Standard'}
                </p>
              </div>
              {order.fragile && (
                <div className="bg-red-100 border-2 border-red-400 rounded px-2 py-1">
                  <p className="text-xs font-black text-red-600">⚠️ FRAGILE</p>
                </div>
              )}
            </div>
            {order.scheduled_date && (
              <div className="mt-2">
                <p className="text-[10px] text-gray-500 font-medium">SCHEDULED</p>
                <p className="text-sm font-bold text-gray-900">
                  {order.scheduled_date} {order.scheduled_time || ''}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Addresses Grid */}
        <div className="grid grid-cols-2 border-b-2 border-black">
          {/* Pickup */}
          <div className="p-3 border-r-2 border-black bg-blue-50">
            <div className="flex items-center gap-1 mb-2">
              <span className="text-blue-600 text-lg">📍</span>
              <p className="text-xs font-black text-blue-800 uppercase">Pickup From</p>
            </div>
            <p className="text-xs font-semibold text-gray-900 leading-tight">
              {order.pickup_address}
            </p>
            {order.pickup_contact_name && (
              <div className="mt-2 pt-2 border-t border-blue-200">
                <p className="text-[10px] text-gray-700">
                  <span className="font-bold">{order.pickup_contact_name}</span>
                </p>
                {order.pickup_contact_phone && (
                  <p className="text-[10px] text-gray-600">📞 {order.pickup_contact_phone}</p>
                )}
              </div>
            )}
          </div>

          {/* Delivery */}
          <div className="p-3 bg-green-50">
            <div className="flex items-center gap-1 mb-2">
              <span className="text-green-600 text-lg">🎯</span>
              <p className="text-xs font-black text-green-800 uppercase">Deliver To</p>
            </div>
            <p className="text-xs font-semibold text-gray-900 leading-tight">
              {order.dropoff_address}
            </p>
            {order.dropoff_contact_name && (
              <div className="mt-2 pt-2 border-t border-green-200">
                <p className="text-[10px] text-gray-700">
                  <span className="font-bold">{order.dropoff_contact_name}</span>
                </p>
                {order.dropoff_contact_phone && (
                  <p className="text-[10px] text-gray-600">📞 {order.dropoff_contact_phone}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Parcel Details Row */}
        <div className="px-3 py-2 border-b-2 border-black bg-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[9px] text-gray-500 font-medium">SIZE</p>
                <p className="text-xs font-bold text-gray-900 capitalize">
                  {order.parcel_size?.replace(/_/g, ' ') || 'N/A'}
                </p>
              </div>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <p className="text-[9px] text-gray-500 font-medium">WEIGHT</p>
                <p className="text-xs font-bold text-gray-900">
                  {order.parcel_weight || 0} kg
                </p>
              </div>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <p className="text-[9px] text-gray-500 font-medium">QTY</p>
                <p className="text-xs font-bold text-gray-900">
                  {order.quantity || 1}
                </p>
              </div>
              {(order.length || order.width || order.height) && (
                <>
                  <div className="h-6 w-px bg-gray-300"></div>
                  <div>
                    <p className="text-[9px] text-gray-500 font-medium">DIMS (cm)</p>
                    <p className="text-xs font-bold text-gray-900">
                      {order.length || 0}×{order.width || 0}×{order.height || 0}
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="text-right">
              <p className="text-[9px] text-gray-500 font-medium">PARCEL</p>
              <p className="text-xs font-black text-gray-900">📦</p>
            </div>
          </div>
        </div>

        {/* Notes Section - Only if notes exist */}
        {order.notes && (
          <div className="px-3 py-2 border-b-2 border-black bg-yellow-50">
            <p className="text-[9px] font-bold text-yellow-800 uppercase mb-1">📝 Delivery Instructions</p>
            <p className="text-xs text-gray-900 leading-snug line-clamp-3">
              {order.notes}
            </p>
          </div>
        )}

        {/* Customer Info */}
        {client && (
          <div className="px-3 py-2 border-b-2 border-black bg-white">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[9px] text-gray-500 font-medium">CUSTOMER</p>
                <p className="text-xs font-bold text-gray-900">{client.name}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-gray-500 font-medium">DATE</p>
                <p className="text-xs font-bold text-gray-900">
                  {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-gray-900 text-white px-3 py-2 text-center">
          <p className="text-[10px] font-semibold">
            📞 0430 233 811 &nbsp;|&nbsp; ✉️ macwithavan@mail.com
          </p>
          <p className="text-[8px] opacity-75 mt-0.5">
            Keep this label visible during transit • mactrackcrm-xatn.vercel.app
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          
          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .label-container {
            padding: 0 !important;
          }
          
          .label {
            max-width: 100% !important;
            box-shadow: none !important;
            border-width: 2px !important;
            page-break-inside: avoid;
          }
          
          /* Ensure colors print */
          .bg-red-600 { background-color: #dc2626 !important; }
          .bg-blue-50 { background-color: #eff6ff !important; }
          .bg-green-50 { background-color: #f0fdf4 !important; }
          .bg-yellow-50 { background-color: #fefce8 !important; }
          .bg-gray-50 { background-color: #f9fafb !important; }
          .bg-gray-100 { background-color: #f3f4f6 !important; }
          .bg-gray-900 { background-color: #111827 !important; }
          .text-white { color: white !important; }
        }
        
        /* Truncate long notes */
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}