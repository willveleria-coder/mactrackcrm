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
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/driver/login");
  }

  function handleNavigate(pickupAddress, dropoffAddress, orderStatus) {
    const destination = orderStatus === "pending" ? pickupAddress : dropoffAddress;
    const encodedDestination = encodeURIComponent(destination);
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}&travelmode=driving`;
    window.open(googleMapsUrl, '_blank');
  }

  const menuItems = [
    { icon: "🏠", label: "Dashboard", href: "/driver/dashboard" },
    { icon: "📦", label: "My Deliveries", href: "/driver/orders" },
    { icon: "💰", label: "Earnings", href: "/driver/earnings" },
    { icon: "💬", label: "Feedback", href: "/driver/feedback" },
    { icon: "👛", label: "Wallet", href: "/driver/wallet" },
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

        {/* Orders List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-8">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-gray-500 text-lg font-semibold">No deliveries yet</p>
              <p className="text-gray-400 text-sm mt-2">Your assigned orders will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.filter(o => o.status !== 'delivered').map((order) => (
                <div 
                  key={order.id} 
                  className="border-2 border-gray-200 rounded-2xl p-4 sm:p-6 hover:shadow-md transition bg-white"
                >
                  {/* Order Header */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-0 mb-4">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500 mb-1">
                        Order #{order.id.slice(0, 8)}
                      </p>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Addresses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4">
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-xs font-bold text-blue-700 mb-1">📍 PICKUP</p>
                      <p className="text-sm text-gray-900 font-medium leading-snug">
                        {order.pickup_address}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3">
                      <p className="text-xs font-bold text-green-700 mb-1">🎯 DROPOFF</p>
                      <p className="text-sm text-gray-900 font-medium leading-snug">
                        {order.dropoff_address}
                      </p>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-gray-600 mb-4">
                    <span className="bg-gray-100 px-3 py-1.5 rounded-full font-medium">
                      📦 {order.parcel_size}
                    </span>
                    <span className="bg-gray-100 px-3 py-1.5 rounded-full font-medium">
                      ⚖️ {order.parcel_weight}kg
                    </span>
                    <span className="bg-gray-100 px-3 py-1.5 rounded-full font-medium">
                      ⚡ {order.service_type}
                    </span>
                  </div>

                  {/* Navigate Button */}
                  <button 
                    onClick={() => handleNavigate(order.pickup_address, order.dropoff_address, order.status)}
                    className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-[#0072ab] text-white rounded-xl font-bold text-base sm:text-sm hover:bg-[#005d8c] transition shadow-lg"
                  >
                    🗺️ Navigate
                  </button>
                </div>
              ))}
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