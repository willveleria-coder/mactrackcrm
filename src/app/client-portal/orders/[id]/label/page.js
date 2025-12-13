"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";

export default function LabelPage() {
  const params = useParams();
  const orderId = params.id;
  
  const [order, setOrder] = useState(null);
  const [client, setClient] = useState(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  async function loadOrder() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push("/client-portal/login");
        return;
      }

      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (clientError || !clientData) {
        router.push("/client-portal/login");
        return;
      }

      setClient(clientData);

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .eq("client_id", clientData.id)
        .single();

      if (orderError || !orderData) {
        router.push("/client-portal/orders");
        return;
      }

      setOrder(orderData);
      setNotes(orderData.notes || "");
    } catch (error) {
      console.error("Error loading order:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveNotes() {
    setSaving(true);
    setSaveMessage("");

    try {
      const { error } = await supabase
        .from("orders")
        .update({ notes: notes })
        .eq("id", orderId);

      if (error) throw error;

      setSaveMessage("✅ Notes saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      console.error("Error saving notes:", error);
      setSaveMessage("❌ Failed to save notes");
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading label...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📦</div>
          <div className="text-gray-600 text-lg mb-4">Order not found</div>
          <button
            onClick={() => router.push("/client-portal/orders")}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
          >
            ← Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation - Hidden when printing */}
      <nav className="bg-white border-b border-gray-200 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image 
                src="/bus-icon.png" 
                alt="Mac Track" 
                width={40} 
                height={40}
                className="object-contain"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-red-600">Mac Track</h1>
                <p className="text-xs text-gray-500">Shipping Label</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/client-portal/orders")}
                className="text-sm font-semibold text-gray-700 hover:text-red-600"
              >
                ← Back to Orders
              </button>
              <button
                onClick={handlePrint}
                className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
              >
                🖨️ Print Label
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Notes Section - Only show when NOT printing */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8 print:hidden">
          <h3 className="text-xl font-bold text-gray-900 mb-4">📝 Delivery Notes & Instructions</h3>
          <p className="text-sm text-gray-600 mb-4">
            Add any special instructions for the driver (e.g., gate code, parking instructions, delivery preferences)
          </p>
          
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            placeholder="Enter delivery notes here... (e.g., 'Leave at front door', 'Ring doorbell', 'Gate code: 1234')"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none"
            rows={4}
          />
          
          <div className="flex justify-between items-center mt-3">
            <span className="text-sm text-gray-500">
              {notes.length}/500 characters
            </span>
            <button
              onClick={handleSaveNotes}
              disabled={saving}
              className="px-6 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Notes"}
            </button>
          </div>

          {saveMessage && (
            <div className={`mt-3 text-sm font-semibold ${saveMessage.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
              {saveMessage}
            </div>
          )}
        </div>

        {/* Shipping Label */}
        <div className="bg-white rounded-2xl shadow-2xl border-4 border-red-600 p-8 print:border-2 print:shadow-none">
          {/* Header */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b-4 border-gray-200">
            <div className="flex items-center gap-4">
              <Image 
                src="/bus-icon.png" 
                alt="Mac Track" 
                width={60} 
                height={60}
                className="object-contain"
              />
              <div>
                <h1 className="text-3xl font-black text-red-600">Mac Track</h1>
                <p className="text-sm text-gray-600">Professional Courier Service</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">ORDER ID</p>
              <p className="text-lg font-black font-mono text-gray-900">#{order.id.slice(0, 8)}</p>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <QRCodeSVG 
                value={`https://mactrack.com/track/${order.id}`} 
                size={120}
                level="H"
              />
              <p className="text-xs text-gray-500 text-center mt-2">Scan to Track</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-2">Service Type</p>
              <div className="inline-block px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-lg uppercase">
                {order.service_type?.replace(/_/g, " ")}
              </div>
              {order.scheduled_date && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600">Scheduled Date</p>
                  <p className="text-lg font-bold text-gray-900">
                    {order.scheduled_date} {order.scheduled_time || ""}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-3xl">📍</span>
                <h3 className="text-lg font-black text-blue-900">PICKUP FROM</h3>
              </div>
              <p className="text-base font-semibold text-gray-900 leading-relaxed">
                {order.pickup_address}
              </p>
              {order.pickup_contact_name && (
                <div className="mt-3 text-sm text-gray-700">
                  <p>👤 {order.pickup_contact_name}</p>
                  <p>📞 {order.pickup_contact_phone}</p>
                </div>
              )}
            </div>

            <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-3xl">🎯</span>
                <h3 className="text-lg font-black text-green-900">DELIVER TO</h3>
              </div>
              <p className="text-base font-semibold text-gray-900 leading-relaxed">
                {order.dropoff_address}
              </p>
              {order.dropoff_contact_name && (
                <div className="mt-3 text-sm text-gray-700">
                  <p>👤 {order.dropoff_contact_name}</p>
                  <p>📞 {order.dropoff_contact_phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Parcel Details */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-black text-gray-900 mb-4">📦 PARCEL DETAILS</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Size</p>
                <p className="text-base font-bold text-gray-900 capitalize">
                  {order.parcel_size?.replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Weight</p>
                <p className="text-base font-bold text-gray-900">
                  {order.parcel_weight} kg
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Quantity</p>
                <p className="text-base font-bold text-gray-900">
                  {order.quantity || 1}
                </p>
              </div>
            </div>

            {(order.length || order.width || order.height) && (
              <div className="mt-4">
                <p className="text-xs text-gray-600 mb-1">
                  Dimensions (L × W × H)
                </p>
                <p className="text-base font-bold text-gray-900">
                  {order.length || 0} cm × {order.width || 0} cm ×{" "}
                  {order.height || 0} cm
                </p>
              </div>
            )}

            {order.fragile && (
              <div className="mt-4 inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold">
                ⚠️ FRAGILE - Handle with care
              </div>
            )}
          </div>

          {/* Delivery Notes */}
          {notes && (
            <div className="bg-yellow-50 rounded-xl p-6 mb-8 border-2 border-yellow-200">
              <h3 className="text-lg font-black text-gray-900 mb-3">
                📝 DELIVERY INSTRUCTIONS
              </h3>
              <p className="text-base text-gray-900 whitespace-pre-wrap leading-relaxed">
                {notes}
              </p>
            </div>
          )}

          {/* Client Info */}
          <div className="border-t-4 border-gray-200 pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-600 mb-1">Customer</p>
                <p className="text-base font-bold text-gray-900">
                  {client?.name}
                </p>
                <p className="text-sm text-gray-600">{client?.email}</p>
                {client?.phone && (
                  <p className="text-sm text-gray-600">{client?.phone}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600 mb-1">Created</p>
                <p className="text-sm font-semibold text-gray-900">
                  {new Date(order.created_at).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(order.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t-2 border-gray-200 text-center">
            <p className="text-sm font-semibold text-gray-900 mb-1">
              📞 Questions? Contact us: macwithavan@mail.com | 0430 233 811
            </p>
            <p className="text-xs text-gray-500">
              Please keep this label visible during transit
            </p>
          </div>
        </div>

        {/* Print Instructions */}
        <div className="mt-6 bg-blue-50 rounded-xl p-6 print:hidden">
          <h4 className="text-lg font-bold text-blue-900 mb-3">
            📋 Printing Instructions
          </h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Click the &quot;Print Label&quot; button above</li>
            <li>• Make sure your printer is set to portrait orientation</li>
            <li>• Use A4 or Letter size paper</li>
            <li>• Attach this label securely to your parcel</li>
            <li>• Keep the QR code visible and undamaged</li>
          </ul>
        </div>
      </main>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:border-2 {
            border-width: 2px !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}