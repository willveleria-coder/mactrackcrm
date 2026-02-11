"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Image from "next/image";
import Link from "next/link";

function PaymentSuccessContent() {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    updateOrderStatus();
  }, []);

  async function updateOrderStatus() {
    try {
      if (!orderId) {
        setError("No order ID provided");
        setLoading(false);
        return;
      }

      // Update order status to 'pending' (payment confirmed)
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'pending',
          stripe_session_id: sessionId,
          payment_confirmed_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating order:", updateError);
        setError("Failed to update order status");
      } else {
        setOrder(updatedOrder);
      }
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-gray-600 text-lg">Confirming your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Oops!</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/client-portal/dashboard"
            className="inline-block px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff]">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
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
              <p className="text-xs text-gray-500">Client Portal</p>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-5xl">✅</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-600">Your delivery order has been confirmed</p>
          </div>

          {/* Order Details */}
          {order && (
            <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left">
              <h3 className="font-bold text-gray-900 mb-4">Order Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-bold text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-bold text-green-600">${order.price.toFixed(2)} AUD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                    Pending Pickup
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6 text-left">
            <h3 className="font-bold text-blue-900 mb-3">📋 What happens next?</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex gap-2">
                <span>1️⃣</span>
                <span>We'll assign a driver to your order</span>
              </li>
              <li className="flex gap-2">
                <span>2️⃣</span>
                <span>You'll receive notifications about pickup time</span>
              </li>
              <li className="flex gap-2">
                <span>3️⃣</span>
                <span>Track your delivery in real-time</span>
              </li>
              <li className="flex gap-2">
                <span>4️⃣</span>
                <span>Delivery confirmation upon completion</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/client-portal/orders"
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition text-center"
            >
              View My Orders
            </Link>
            <Link
              href="/client-portal/dashboard"
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition text-center"
            >
              Back to Dashboard
            </Link>
          </div>

          {/* Support */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Need help? Contact us at{' '}
              <a href="mailto:macwithavan@mail.com" className="text-red-600 hover:underline font-bold">
                macwithavan@mail.com
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-gray-600 text-lg">Loading payment confirmation...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}