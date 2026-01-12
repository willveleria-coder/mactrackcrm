"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Image from "next/image";
import Link from "next/link";

export default function PublicTrackingPage() {
  const params = useParams();
  const orderId = params.id;
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  async function loadOrder() {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("id, status, pickup_address, dropoff_address, service_type, parcel_size, parcel_weight, created_at, delivered_at, scheduled_date, scheduled_time, driver_status")
        .eq("id", orderId)
        .single();

      if (orderError || !orderData) {
        setError("Order not found");
        return;
      }

      setOrder(orderData);
    } catch (err) {
      console.error("Error loading order:", err);
      setError("Failed to load order");
    } finally {
      setLoading(false);
    }
  }

  function getStatusInfo(status) {
    const statuses = {
      pending: {
        label: "Pending",
        description: "Order received and awaiting pickup",
        color: "bg-yellow-100 text-yellow-800 border-yellow-300",
        icon: "⏳",
        step: 1
      },
      active: {
        label: "In Transit",
        description: "Your parcel is on its way",
        color: "bg-blue-100 text-blue-800 border-blue-300",
        icon: "🚚",
        step: 2
      },
      delivered: {
        label: "Delivered",
        description: "Your parcel has been delivered",
        color: "bg-green-100 text-green-800 border-green-300",
        icon: "✅",
        step: 3
      },
      cancelled: {
        label: "Cancelled",
        description: "This order has been cancelled",
        color: "bg-red-100 text-red-800 border-red-300",
        icon: "❌",
        step: 0
      }
    };
    return statuses[status] || statuses.pending;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tracking info...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-6xl mb-4">📦</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h1>
          <p className="text-gray-600 mb-6">
            We couldn't find an order with this tracking ID. Please check the QR code or tracking number.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(order.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff]">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-3">
            <Image
              src="/bus-icon.png"
              alt="Mac Track"
              width={40}
              height={40}
              className="object-contain"
            />
            <div className="text-center">
              <h1 className="text-xl sm:text-2xl font-black text-red-600">Mac Track</h1>
              <p className="text-xs text-gray-500">Order Tracking</p>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Order ID */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-500 mb-1">Tracking Order</p>
          <p className="text-2xl font-black font-mono text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</p>
        </div>

        {/* Status Card */}
        <div className={`rounded-2xl p-6 mb-6 border-2 ${statusInfo.color}`}>
          <div className="flex items-center gap-4">
            <span className="text-5xl">{statusInfo.icon}</span>
            <div>
              <h2 className="text-2xl font-black">{statusInfo.label}</h2>
              <p className="text-sm opacity-80">{statusInfo.description}</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        {order.status !== 'cancelled' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Delivery Progress</h3>
            <div className="flex items-center justify-between">
              {/* Step 1: Pending */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${statusInfo.step >= 1 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {statusInfo.step >= 1 ? '✓' : '1'}
                </div>
                <p className="text-xs mt-2 text-center font-semibold">Order<br/>Received</p>
              </div>
              
              {/* Line */}
              <div className={`flex-1 h-1 mx-2 ${statusInfo.step >= 2 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
              
              {/* Step 2: In Transit */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${statusInfo.step >= 2 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {statusInfo.step >= 2 ? '✓' : '2'}
                </div>
                <p className="text-xs mt-2 text-center font-semibold">In<br/>Transit</p>
              </div>
              
              {/* Line */}
              <div className={`flex-1 h-1 mx-2 ${statusInfo.step >= 3 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
              
              {/* Step 3: Delivered */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${statusInfo.step >= 3 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {statusInfo.step >= 3 ? '✓' : '3'}
                </div>
                <p className="text-xs mt-2 text-center font-semibold">Delivered</p>
              </div>
            </div>
          </div>
        )}

        {/* Route Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Route Details</h3>
          
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs font-bold text-blue-700 mb-1">📍 PICKUP</p>
              <p className="text-sm font-semibold text-gray-900">{order.pickup_address}</p>
            </div>
            
            <div className="flex justify-center">
              <div className="text-2xl">↓</div>
            </div>
            
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-xs font-bold text-green-700 mb-1">🎯 DELIVERY</p>
              <p className="text-sm font-semibold text-gray-900">{order.dropoff_address}</p>
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Order Details</h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Service Type</p>
              <p className="font-semibold capitalize">{order.service_type?.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-gray-500">Parcel Size</p>
              <p className="font-semibold capitalize">{order.parcel_size?.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-gray-500">Weight</p>
              <p className="font-semibold">{order.parcel_weight} kg</p>
            </div>
            <div>
              <p className="text-gray-500">Order Date</p>
              <p className="font-semibold">{new Date(order.created_at).toLocaleDateString()}</p>
            </div>
            {order.scheduled_date && (
              <div className="col-span-2">
                <p className="text-gray-500">Scheduled Delivery</p>
                <p className="font-semibold">{order.scheduled_date} {order.scheduled_time || ''}</p>
              </div>
            )}
            {order.delivered_at && (
              <div className="col-span-2">
                <p className="text-gray-500">Delivered At</p>
                <p className="font-semibold text-green-600">{new Date(order.delivered_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Need Help?</h3>
          <p className="text-sm text-gray-600 mb-4">Contact Mac With A Van for any questions</p>
          <div className="space-y-2">
            <a href="tel:1300170718" className="block px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition">
              📞 Call 1300 170 718
            </a>
            <a href="mailto:macwithavan@mail.com" className="block px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition">
              ✉️ macwithavan@mail.com
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Mac With A Van | ABN: 18 616 164 875</p>
          <p className="mt-1">Courier Service</p>
        </div>
      </main>
    </div>
  );
}