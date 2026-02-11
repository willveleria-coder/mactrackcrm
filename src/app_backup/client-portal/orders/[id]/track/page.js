"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import LiveOrderMap from "@/components/LiveOrderMap";

export default function TrackOrderPage() {
  const [order, setOrder] = useState(null);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canTrackLive, setCanTrackLive] = useState(false);
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();

  useEffect(() => {
    loadOrderDetails();
  }, []);

  async function loadOrderDetails() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push("/client-portal/login");
        return;
      }

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", params.id)
        .eq("user_id", user.id)
        .single();

      if (orderError || !orderData) {
        alert("Order not found");
        router.push("/client-portal/orders");
        return;
      }

      setOrder(orderData);

      // Check if live tracking is allowed for this service type
      const liveTrackingServices = ["Priority", "VIP", "Emergency"];
      const hasLiveTracking = liveTrackingServices.includes(orderData.service_type);
      setCanTrackLive(hasLiveTracking);

      if (orderData.driver_id) {
        const { data: driverData } = await supabase
          .from("drivers")
          .select("*")
          .eq("id", orderData.driver_id)
          .single();

        if (driverData) {
          setDriver(driverData);
        }
      }
    } catch (error) {
      console.error("Error loading order:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff]">
      
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-[#ba0606]">MAC TRACK</h1>
            <p className="text-xs text-gray-500">Client Portal</p>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/client-portal/dashboard" className="text-sm font-semibold text-gray-700 hover:text-[#0072ab]">
              Dashboard
            </Link>
            <Link href="/client-portal/orders" className="text-sm font-semibold text-[#0072ab]">
              My Orders
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-6">
          <Link href="/client-portal/orders" className="text-[#0072ab] hover:underline text-sm font-semibold">
            ← Back to Orders
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Track Order #{order?.id.slice(0, 8)}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-1">📍 PICKUP</p>
              <p className="text-sm text-gray-900 font-medium">{order?.pickup_address}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-1">🎯 DROPOFF</p>
              <p className="text-sm text-gray-900 font-medium">{order?.dropoff_address}</p>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <StatusBadge status={order?.status} />
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              {order?.service_type}
            </span>
          </div>

          {driver && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-gray-900 mb-2">Assigned Driver</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {driver.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{driver.name}</p>
                  <p className="text-xs text-gray-500">{driver.vehicle_type} - {driver.vehicle_plate}</p>
                  <p className="text-xs text-gray-500">📞 {driver.phone}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* LIVE TRACKING - ONLY FOR PRIORITY/VIP/EMERGENCY */}
        {canTrackLive ? (
          order?.driver_id ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Live Location Tracking</h3>
              <p className="text-sm text-gray-600 mb-6">
                Real-time driver location (Available for {order.service_type} service)
              </p>
              <LiveOrderMap 
                orderId={order.id}
                pickupAddress={order.pickup_address}
                dropoffAddress={order.dropoff_address}
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <p className="text-gray-500">⏳ Waiting for driver assignment...</p>
            </div>
          )
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">🔒</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Live Tracking Not Available</h3>
              <p className="text-gray-600 mb-4">
                Live driver tracking is only available for Priority, VIP, and Emergency services.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Your order tracking number: <span className="font-mono font-bold">#{order?.id.slice(0, 8).toUpperCase()}</span>
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> Upgrade to Priority service for real-time tracking on your next order!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ORDER TIMELINE */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mt-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Order Timeline</h3>
          <div className="space-y-4">
            <TimelineItem 
              title="Order Created"
              time={new Date(order?.created_at).toLocaleString()}
              completed={true}
            />
            <TimelineItem 
              title="Driver Assigned"
              time={order?.driver_id ? "Assigned" : "Pending"}
              completed={!!order?.driver_id}
            />
            <TimelineItem 
              title="In Transit"
              time={order?.status === "active" ? "In progress" : "Pending"}
              completed={order?.status === "active" || order?.status === "delivered"}
            />
            <TimelineItem 
              title="Delivered"
              time={order?.status === "delivered" ? "Completed" : "Pending"}
              completed={order?.status === "delivered"}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-yellow-100 text-yellow-700",
    active: "bg-blue-100 text-blue-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${styles[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function TimelineItem({ title, time, completed }) {
  return (
    <div className="flex items-center gap-4">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        completed ? "bg-green-500" : "bg-gray-300"
      }`}>
        {completed && <span className="text-white text-lg">✓</span>}
      </div>
      <div className="flex-1">
        <p className={`font-semibold ${completed ? "text-gray-900" : "text-gray-500"}`}>
          {title}
        </p>
        <p className="text-xs text-gray-500">{time}</p>
      </div>
    </div>
  );
}