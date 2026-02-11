"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import HamburgerMenu from "../../../components/HamburgerMenu";
import Image from "next/image";

export default function DriverOrdersPage() {
  const [driver, setDriver] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("today");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const user = session?.user;
      if (!session) {
        router.push("/driver/login");
        return;
      }

      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (driverError || !driverData) {
        router.push("/driver/login");
        return;
      }

      setDriver(driverData);

      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("driver_id", driverData.id)
        .order("created_at", { ascending: false });

      setOrders(ordersData || []);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  }

  // Filter orders based on selected filter
  const filteredOrders = orders.filter(order => {
    if (filter === "today") {
      const today = new Date();
      const orderDate = new Date(order.created_at);
      // Must be from today AND not delivered/cancelled
      if (orderDate.toDateString() !== today.toDateString()) return false;
      if (order.status === "delivered" || order.status === "cancelled") return false;
    }
    if (filter === "active") {
      if (order.status === "delivered" || order.status === "cancelled") return false;
    }
    return true;
  });

  // Counts for buttons
  const todayActiveCount = orders.filter(o => {
    const today = new Date();
    const orderDate = new Date(o.created_at);
    return orderDate.toDateString() === today.toDateString() && o.status !== "delivered" && o.status !== "cancelled";
  }).length;

  const allActiveCount = orders.filter(o => o.status !== "delivered" && o.status !== "cancelled").length;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/driver/login");
  }

  function handleNavigate(pickupAddress, dropoffAddress, orderStatus) {
    const destination = orderStatus === "pending" || orderStatus === "assigned" ? pickupAddress : dropoffAddress;
    const encodedDestination = encodeURIComponent(destination);
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}&travelmode=driving`;
    window.open(googleMapsUrl, '_blank');
  }

  function getEtaString(order) {
    if (order.custom_eta) {
      const customDate = new Date(order.custom_eta);
      return {
        text: customDate.toLocaleString("en-AU", { 
          day: "numeric", month: "short", hour: "numeric", minute: "2-digit" 
        }),
        isCustom: true
      };
    }
    
    const etaHours = {
      standard: 5, same_day: 12, next_day: 24, local_overnight: 24,
      emergency: 2, vip: 3, priority: 1.5, scheduled: 0, after_hours: 24
    };
    const hours = etaHours[order.service_type] || 5;

    if (hours === 0 && order.scheduled_date) {
      const scheduledDateTime = new Date(order.scheduled_date + (order.scheduled_time ? ' ' + order.scheduled_time : ''));
      return {
        text: scheduledDateTime.toLocaleString("en-AU", { 
          day: "numeric", month: "short", hour: "numeric", minute: "2-digit" 
        }),
        isCustom: false
      };
    }
    
    const etaDate = new Date(order.created_at || Date.now());
    etaDate.setHours(etaDate.getHours() + hours);
    return {
      text: etaDate.toLocaleString("en-AU", { 
        day: "numeric", month: "short", hour: "numeric", minute: "2-digit" 
      }),
      isCustom: false
    };
  }

  const menuItems = [
    { href: "/driver/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/driver/orders", icon: "📦", label: "Deliveries" },
    { href: "/driver/hours", icon: "⏱️", label: "Hours" },
    { href: "/driver/feedback", icon: "⭐", label: "Feedback" },
    { href: "/driver/chat", icon: "💬", label: "Support Chat" },
    { href: "/driver/settings", icon: "⚙️", label: "Settings" },
  ];

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
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-30">
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
                <h1 className="text-xl sm:text-2xl font-black text-[#0072ab]">MAC WITH A VAN</h1>
                <p className="text-xs text-gray-500">Driver Portal</p>
              </div>
            </div>
            
            <HamburgerMenu 
              items={menuItems}
              onLogout={handleLogout}
              userName={driver?.name}
              userRole="Driver"
            />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Link 
            href="/driver/dashboard"
            className="inline-flex items-center text-sm font-semibold text-[#0072ab] hover:underline mb-3 sm:mb-4"
          >
            ← Back to Dashboard
          </Link>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">My Deliveries 📦</h2>
          <p className="text-sm sm:text-base text-gray-600">All your assigned orders</p>
        </div>

        {/* Today / History Toggle */}
        <div className="flex gap-2 mb-6">
          <button 
            onClick={() => setFilter("today")} 
            className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-sm transition ${filter === "today" ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-200 hover:border-orange-500"}`}
          >
            📅 Today ({todayActiveCount})
          </button>
          <button 
            onClick={() => setFilter("active")} 
            className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-sm transition ${filter === "active" ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-500"}`}
          >
            🔄 Active ({allActiveCount})
          </button>
          <button 
            onClick={() => setFilter("all")} 
            className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-sm transition ${filter === "all" ? "bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-500"}`}
          >
            📚 History ({orders.length})
          </button>
        </div>

        {/* Orders List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-8">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-gray-500 text-lg font-semibold">
                {filter === "today" ? "No active deliveries for today" : filter === "active" ? "No active deliveries" : "No deliveries yet"}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                {filter === "today" && orders.length > 0 ? "Check History for completed orders" : "Your assigned orders will appear here"}
              </p>
              {filter === "today" && orders.filter(o => o.status === "delivered" || o.status === "cancelled").length > 0 && (
                <button
                  onClick={() => setFilter("all")}
                  className="mt-4 px-6 py-2 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
                >
                  View History →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const eta = getEtaString(order);
                const placedTime = new Date(order.created_at).toLocaleString("en-AU", {
                  day: "numeric", 
                  month: "short", 
                  year: "numeric",
                  hour: "numeric", 
                  minute: "2-digit"
                });
                const isCompleted = order.status === "delivered" || order.status === "cancelled";

                return (
                  <div 
                    key={order.id} 
                    className={`border-2 rounded-2xl p-4 sm:p-6 hover:shadow-md transition bg-white ${isCompleted ? 'border-gray-200 opacity-75' : 'border-gray-200'}`}
                  >
                    {/* Order Header */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-0 mb-4">
                      <div>
                        <p className="text-xs sm:text-sm text-gray-500 mb-1">
                          {order.order_number ? `Order #${order.order_number}` : `Order #${order.id.slice(0, 8)}`}
                        </p>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500">
                        <p>📅 Placed: {placedTime}</p>
                      </div>
                    </div>

                    {/* ETA Banner - Only show if not completed */}
                    {!isCompleted && (
                      <div className={`mb-4 p-3 rounded-xl ${eta.isCustom ? 'bg-orange-50 border-2 border-orange-200' : 'bg-blue-50 border-2 border-blue-200'}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-bold ${eta.isCustom ? 'text-orange-800' : 'text-blue-800'}`}>
                            🕐 ETA: {eta.text}
                          </span>
                          {eta.isCustom && (
                            <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full font-semibold">
                              Updated by Admin
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Completed Banner */}
                    {order.status === "delivered" && (
                      <div className="mb-4 p-3 rounded-xl bg-green-50 border-2 border-green-200">
                        <span className="text-sm font-bold text-green-800">
                          ✅ Delivered {order.delivered_at ? `on ${new Date(order.delivered_at).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : ''}
                        </span>
                      </div>
                    )}

                    {order.status === "cancelled" && (
                      <div className="mb-4 p-3 rounded-xl bg-red-50 border-2 border-red-200">
                        <span className="text-sm font-bold text-red-800">
                          ❌ Cancelled
                        </span>
                      </div>
                    )}

                    {/* Addresses */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4">
                      <div className="bg-blue-50 rounded-xl p-3">
                        <p className="text-xs font-bold text-blue-700 mb-1">📍 PICKUP</p>
                        <p className="text-sm text-gray-900 font-medium leading-snug">
                          {order.pickup_address}
                        </p>
                        {order.pickup_contact_name && (
                          <p className="text-xs text-gray-600 mt-2">
                            👤 {order.pickup_contact_name} {order.pickup_contact_phone && `• 📞 ${order.pickup_contact_phone}`}
                          </p>
                        )}
                      </div>
                      <div className="bg-green-50 rounded-xl p-3">
                        <p className="text-xs font-bold text-green-700 mb-1">🎯 DROPOFF</p>
                        <p className="text-sm text-gray-900 font-medium leading-snug">
                          {order.dropoff_address}
                        </p>
                        {order.dropoff_contact_name && (
                          <p className="text-xs text-gray-600 mt-2">
                            👤 {order.dropoff_contact_name} {order.dropoff_contact_phone && `• 📞 ${order.dropoff_contact_phone}`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-gray-600 mb-4">
                      <span className="bg-gray-100 px-3 py-1.5 rounded-full font-medium">
                        📦 {order.parcel_size?.replace(/_/g, ' ')}
                      </span>
                      <span className="bg-gray-100 px-3 py-1.5 rounded-full font-medium">
                        ⚖️ {order.parcel_weight}kg
                      </span>
                      <span className="bg-gray-100 px-3 py-1.5 rounded-full font-medium">
                        ⚡ {order.service_type?.replace(/_/g, ' ')}
                      </span>
                      {order.fragile && (
                        <span className="bg-red-100 px-3 py-1.5 rounded-full font-medium text-red-700">
                          ⚠️ Fragile
                        </span>
                      )}
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="bg-yellow-50 rounded-xl p-3 mb-4">
                        <p className="text-xs font-bold text-yellow-700 mb-1">📝 Notes</p>
                        <p className="text-sm text-gray-700">{order.notes}</p>
                      </div>
                    )}

                    {/* Navigate Button - Only show if not completed */}
                    {!isCompleted && (
                      <button 
                        onClick={() => handleNavigate(order.pickup_address, order.dropoff_address, order.status)}
                        className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-[#0072ab] text-white rounded-xl font-bold text-base sm:text-sm hover:bg-[#005d8c] transition shadow-lg"
                      >
                        🗺️ Navigate to {order.status === "pending" || order.status === "assigned" ? "Pickup" : "Dropoff"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
    pending_payment: "bg-orange-100 text-orange-700 border-orange-300",
    confirmed: "bg-blue-100 text-blue-700 border-blue-300",
    assigned: "bg-purple-100 text-purple-700 border-purple-300",
    active: "bg-blue-100 text-blue-700 border-blue-300",
    picked_up: "bg-indigo-100 text-indigo-700 border-indigo-300",
    in_transit: "bg-blue-100 text-blue-700 border-blue-300",
    delivered: "bg-green-100 text-green-700 border-green-300",
    cancelled: "bg-red-100 text-red-700 border-red-300",
    failed: "bg-red-100 text-red-700 border-red-300",
  };
  const labels = {
    pending: "⏳ Pending",
    pending_payment: "💳 Pending Payment",
    confirmed: "✅ Confirmed",
    assigned: "👤 Assigned",
    active: "🚚 Active",
    picked_up: "📦 Picked Up",
    in_transit: "🚚 In Transit",
    delivered: "✅ Delivered",
    cancelled: "❌ Cancelled",
    failed: "❌ Failed",
  };
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || "bg-gray-100 text-gray-600 border-gray-300"}`}>
      {labels[status] || status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || "Unknown"}
    </span>
  );
}