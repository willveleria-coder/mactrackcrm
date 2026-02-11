"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";
import Image from "next/image";
import ShippingLabel from "@/components/ShippingLabel";

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

      // Update local order state
      setOrder(prev => ({ ...prev, notes: notes }));
      setSaveMessage("✅ Notes saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      console.error("Error saving notes:", error);
      setSaveMessage("❌ Failed to save notes");
    } finally {
      setSaving(false);
    }
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
    <div className="min-h-screen bg-gray-100">
      {/* Navigation - Hidden when printing */}
      <nav className="bg-white border-b border-gray-200 shadow-sm print:hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
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
            <button
              onClick={() => router.push("/client-portal/orders")}
              className="text-sm font-semibold text-gray-700 hover:text-red-600"
            >
              ← Back to Orders
            </button>
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
            maxLength={200}
            placeholder="Enter delivery notes here... (e.g., 'Leave at front door', 'Ring doorbell', 'Gate code: 1234')"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none"
            rows={3}
          />
          
          <div className="flex justify-between items-center mt-3">
            <span className="text-sm text-gray-500">
              {notes.length}/200 characters (keep brief for label)
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

        {/* Shipping Label Component */}
        <ShippingLabel order={order} client={client} showPrintButton={true} />

        {/* Print Instructions */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6 print:hidden">
          <h4 className="text-lg font-bold text-blue-900 mb-3">
            📋 Printing Tips
          </h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Click the <strong>"Print Label"</strong> button above</li>
            <li>• Select <strong>Portrait</strong> orientation</li>
            <li>• Use <strong>A4 or Letter</strong> size paper</li>
            <li>• Keep <strong>"Background graphics"</strong> enabled for colors</li>
            <li>• Attach label securely to your parcel</li>
          </ul>
        </div>
      </main>
    </div>
  );
}