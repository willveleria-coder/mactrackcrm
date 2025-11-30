"use client";
import { useState, useEffect } from "react";
import { createClient } from "../../../lib/supabase/client";
import Image from "next/image";
import Link from "next/link";

export default function TrackOrderPage({ params }) {
  const [order, setOrder] = useState(null);
  const [client, setClient] = useState(null);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const orderId = params.id;
  const supabase = createClient();

  useEffect(() => {
    loadOrder();
    const interval = setInterval(loadOrder, 30000);
    return () => clearInterval(interval);
  }, [orderId]);

  async function loadOrder() {
    try {
      setError("");

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError || !orderData) {
        setError("Order not found. Please check your order ID.");
        setLoading(false);
        return;
      }

      setOrder(orderData);

      if (orderData.client_id) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("name, phone, email")
          .eq("id", orderData.client_id)
          .single();
        setClient(clientData);
      }

      if (orderData.driver_id) {
        const { data: driverData } = await supabase
          .from("drivers")
          .select("name, phone, vehicle_type, vehicle_registration")
          .eq("id", orderData.driver_id)
          .single();
        setDriver(driverData);
      }
    } catch (err) {
      console.error("Error loading order:", err);
      setError("Failed to load order details.");
    } finally {
      setLoading(false);
    }
  }

  function getStatusInfo(status) {
    const statusMap = {
      pending: {
        label: "Order Received",
        icon: "📋",
        color: "bg-yellow-500",
        description:
          "Your order has been received and is being prepared for pickup.",
      },
      active: {
        label: "Out for Delivery",
        icon: "🚚",
        color: "bg-blue-500",
        description: "Your parcel is on its way!",
      },
      delivered: {
        label: "Delivered",
        icon: "✅",
        color: "bg-green-500",
        description: "Your parcel has been delivered successfully.",
      },
      cancelled: {
        label: "Cancelled",
        icon: "❌",
        color: "bg-red-500",
        description: "This order has been cancelled.",
      },
    };
    return statusMap[status] || statusMap.pending;
  }

  function getProgress(status) {
    const progressMap = {
      pending: 25,
      active: 75,
      delivered: 100,
      cancelled: 0,
    };
    return progressMap[status] || 0;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📦</div>
          <div className="text-gray-600 text-lg font-semibold">
            Loading order details...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>

          {/* FIXED: Use Link instead of <a> */}
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(order.status);
  const progress = getProgress(order.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-center gap-3">
            <Image
              src="/bus-icon.png"
              alt="Mac Track"
              width={50}
              height={50}
              className="object-contain"
            />
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-black text-red-600">
                Mac Track
              </h1>
              <p className="text-sm text-gray-500">Order Tracking</p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-8">
          <p className="text-sm text-gray-600 mb-2">Tracking Order</p>
          <p className="text-2xl font-black font-mono text-gray-900">
            #{order.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-100 p-6 sm:p-8 mb-6">
          <div className="text-center mb-8">
            <div className="text-7xl mb-4">{statusInfo.icon}</div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">
              {statusInfo.label}
            </h2>
            <p className="text-gray-600">{statusInfo.description}</p>
          </div>

          {order.status !== "cancelled" && (
            <div className="mb-8">
              <div className="flex justify-between text-xs font-semibold text-gray-600 mb-2">
                <span>Received</span>
                <span>Out for Delivery</span>
                <span>Delivered</span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className={`${statusInfo.color} h-4 rounded-full transition-all duration-1000 ease-out`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div
              className={`flex items-start gap-4 p-4 rounded-xl ${
                order.status === "pending" ||
                order.status === "active" ||
                order.status === "delivered"
                  ? "bg-green-50 border-2 border-green-200"
                  : "bg-gray-50"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  order.status === "pending" ||
                  order.status === "active" ||
                  order.status === "delivered"
                    ? "bg-green-500 text-white"
                    : "bg-gray-300"
                }`}
              >
                ✓
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">Order Received</p>
                <p className="text-sm text-gray-600">
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            {driver &&
              (order.status === "active" || order.status === "delivered") && (
                <div
                  className={`flex items-start gap-4 p-4 rounded-xl ${
                    order.status === "active" || order.status === "delivered"
                      ? "bg-blue-50 border-2 border-blue-200"
                      : "bg-gray-50"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      order.status === "active" ||
                      order.status === "delivered"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-300"
                    }`}
                  >
                    ✓
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">
                      Out for Delivery
                    </p>
                    <p className="text-sm text-gray-600">
                      Driver: {driver.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Vehicle: {driver.vehicle_type} -{" "}
                      {driver.vehicle_registration}
                    </p>
                  </div>
                </div>
              )}

            {order.status === "delivered" && (
              <div className="flex items-start gap-4 p-4 rounded-xl bg-green-50 border-2 border-green-200">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500 text-white">
                  ✓
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">Delivered</p>
                  <p className="text-sm text-gray-600">
                    {order.delivered_at
                      ? new Date(order.delivered_at).toLocaleString()
                      : "Completed"}
                  </p>
                </div>
              </div>
            )}

            {order.status === "cancelled" && (
              <div className="flex items-start gap-4 p-4 rounded-xl bg-red-50 border-2 border-red-200">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500 text-white">
                  ✕
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">Order Cancelled</p>
                  <p className="text-sm text-gray-600">
                    This order has been cancelled
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pickup & Dropoff */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl">📍</span>
              <h3 className="text-lg font-bold text-gray-900">
                Pickup Location
              </h3>
            </div>
            <p className="text-gray-700 leading-relaxed">
              {order.pickup_address}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl">🎯</span>
              <h3 className="text-lg font-bold text-gray-900">
                Delivery Location
              </h3>
            </div>
            <p className="text-gray-700 leading-relaxed">
              {order.dropoff_address}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            📦 Parcel Information
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Size</p>
              <p className="text-sm font-bold text-gray-900 capitalize">
                {order.parcel_size}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Weight</p>
              <p className="text-sm font-bold text-gray-900">
                {order.parcel_weight} kg
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Service</p>
              <p className="text-sm font-bold text-gray-900 capitalize">
                {order.service_type.replace("_", " ")}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <p
                className={`text-sm font-bold capitalize ${
                  order.status === "delivered"
                    ? "text-green-600"
                    : order.status === "active"
                    ? "text-blue-600"
                    : order.status === "cancelled"
                    ? "text-red-600"
                    : "text-yellow-600"
                }`}
              >
                {order.status}
              </p>
            </div>
          </div>
        </div>

        {driver && (order.status === "active" || order.status === "delivered") && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              🚐 Your Driver
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900 text-lg">{driver.name}</p>
                <p className="text-sm text-gray-600 capitalize">
                  {driver.vehicle_type}
                </p>
                <p className="text-sm text-gray-600">
                  {driver.vehicle_registration}
                </p>
              </div>
              {order.status === "active" && (
                <a
                  href={`tel:${driver.phone}`}
                  className="px-6 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition"
                >
                  📞 Call Driver
                </a>
              )}
            </div>
          </div>
        )}

        {order.notes && (
          <div className="bg-yellow-50 rounded-2xl border-2 border-yellow-200 p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              📝 Delivery Instructions
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <button
            onClick={() =>
              window.open(
                `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                  order.pickup_address
                )}&destination=${encodeURIComponent(order.dropoff_address)}`,
                "_blank"
              )
            }
            className="w-full py-4 bg-blue-500 text-white rounded-xl font-bold text-lg hover:bg-blue-600 transition"
          >
            🗺️ View Route on Google Maps
          </button>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            ℹ️ This page automatically updates every 30 seconds
          </p>
        </div>
      </main>
    </div>
  );
}