"use client";
import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ShippingLabel from "@/components/ShippingLabel";

export default function ClientLabelPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const supabase = createClient();

  // Get label count from URL params (default to 1)
  const labelCount = parseInt(searchParams.get('count')) || 1;

  useEffect(() => {
    loadOrder();
  }, []);

  async function loadOrder() {
    try {
      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/client-portal/login");
        return;
      }

      // Get client data
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (clientError || !clientData) {
        setError("Client not found");
        setLoading(false);
        return;
      }

      setClient(clientData);

      // Fetch the order
      const { data, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", params.id)
        .single();

      if (orderError || !data) {
        console.error("Order fetch error:", orderError);
        setError("Order not found");
        setLoading(false);
        return;
      }

      setOrder(data);
    } catch (err) {
      console.error("Error loading order:", err);
      setError("Failed to load order");
    } finally {
      setLoading(false);
    }
  }

  function formatOrderNumber(order) {
    return order?.order_number ? `#${order.order_number}` : `#${order?.id?.slice(0, 8).toUpperCase()}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-4xl mb-4">🏷️</div>
          <p className="text-gray-600">Loading labels...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center bg-white rounded-2xl shadow-lg p-8 max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-6">{error || "This order doesn't exist or you don't have access to it."}</p>
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

  // Generate array of label numbers
  const labels = Array.from({ length: labelCount }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Print Controls - Hidden when printing */}
      <div className="no-print bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Shipping Labels</h1>
            <p className="text-sm text-gray-600">
              Order {formatOrderNumber(order)} • {labelCount} label{labelCount > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/client-portal/orders")}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              ← Back
            </button>
            <button
              onClick={() => window.print()}
              className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition"
            >
              🖨️ Print All Labels
            </button>
          </div>
        </div>
      </div>

      {/* Labels Container */}
      <div className="max-w-4xl mx-auto p-4 print:p-0 print:max-w-none">
        {labels.map((labelNum) => (
          <div 
            key={labelNum} 
            className="mb-8 print:mb-0"
            style={{ pageBreakAfter: labelNum < labelCount ? 'always' : 'auto' }}
          >
            {/* Pagination Badge - Only show if multiple labels */}
            {labelCount > 1 && (
              <div className="no-print bg-red-100 border-2 border-red-300 rounded-lg p-3 mb-4 text-center max-w-[420px] mx-auto">
                <p className="text-xl font-black text-red-700">
                  📦 PARCEL {labelNum} OF {labelCount}
                </p>
              </div>
            )}

            {/* The actual shipping label */}
            <ShippingLabel 
              order={{
                ...order,
                // Add pagination info to notes if multiple labels
                notes: labelCount > 1 
                  ? `${order.notes ? order.notes + '\n\n' : ''}📦 PARCEL ${labelNum} OF ${labelCount}`
                  : order.notes
              }} 
              client={client}
              showPrintButton={false}
            />

            {/* Print-only pagination footer */}
            {labelCount > 1 && (
              <div className="hidden print:block text-center mt-2">
                <p className="text-lg font-bold text-red-600">
                  Label {labelNum} of {labelCount}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}