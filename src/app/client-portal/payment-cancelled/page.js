"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Image from "next/image";
import Link from "next/link";

function PaymentCancelledContent() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const orderId = searchParams.get('order_id');

  useEffect(() => {
    deleteUnpaidOrder();
  }, []);

  async function deleteUnpaidOrder() {
    try {
      if (orderId) {
        // Delete the order since payment was cancelled
        await supabase
          .from('orders')
          .delete()
          .eq('id', orderId)
          .eq('status', 'pending_payment'); // Only delete if still pending payment
      }
    } catch (err) {
      console.error("Error deleting order:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
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
          {/* Cancelled Icon */}
          <div className="mb-6">
            <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-5xl">⚠️</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Cancelled</h1>
            <p className="text-gray-600">Your order was not completed</p>
          </div>

          {/* Info Message */}
          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6 mb-6 text-left">
            <h3 className="font-bold text-orange-900 mb-3">What happened?</h3>
            <p className="text-sm text-orange-800 mb-4">
              You cancelled the payment process. No charges have been made to your card, and your order has been cancelled.
            </p>
            <p className="text-sm text-orange-800">
              If you experienced any issues during checkout, please contact our support team.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/client-portal/new-order"
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition text-center"
            >
              Try Again
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
            <p className="text-sm text-gray-600 mb-3">Need assistance with payment?</p>
            <div className="flex gap-3 justify-center">
              <a
                href="mailto:support@mactrack.com.au"
                className="text-red-600 hover:underline font-bold text-sm flex items-center gap-1"
              >
                <span>📧</span>
                <span>Email Support</span>
              </a>
              <span className="text-gray-300">|</span>
              <a
                href="tel:+61399998888"
                className="text-red-600 hover:underline font-bold text-sm flex items-center gap-1"
              >
                <span>📞</span>
                <span>Call Support</span>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PaymentCancelledPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    }>
      <PaymentCancelledContent />
    </Suspense>
  );
}