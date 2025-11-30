"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-20 md:pb-0">
      
      {/* Navigation - Responsive */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Image 
                src="/bus-icon.png" 
                alt="Mac With A Van" 
                width={32} 
                height={32}
                className="object-contain sm:w-10 sm:h-10"
              />
              <div>
                <h1 className="text-lg sm:text-2xl font-black text-[#0072ab]">MAC WITH A VAN</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Driver Portal</p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <span className="text-sm text-gray-600">👋 {driver?.name}</span>
              <Link href="/driver/dashboard" className="text-sm font-semibold text-gray-700 hover:text-[#0072ab]">
                Dashboard
              </Link>
              <Link href="/driver/orders" className="text-sm font-semibold text-[#0072ab] border-b-2 border-[#0072ab]">
                My Deliveries
              </Link>
              <Link href="/driver/earnings" className="text-sm font-semibold text-gray-700 hover:text-[#0072ab]">
                Earnings
              </Link>
              <button 
                onClick={handleLogout}
                className="text-sm font-semibold text-red-600 hover:text-red-700"
              >
                Logout
              </button>
            </div>

            {/* Mobile Logout Button */}
            <button 
              onClick={handleLogout}
              className="md:hidden text-sm font-bold text-red-600 px-3 py-2 rounded-lg"
            >
              Logout
            </button>
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
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">My Deliveries</h2>
          <p className="text-sm sm:text-base text-gray-600">All your assigned orders</p>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-8">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-gray-500 text-lg font-semibold">No deliveries yet</p>
              <p className="text-gray-400 text-sm mt-2">Your assigned orders will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div 
                  key={order.id} 
                  className="border-2 border-gray-200 rounded-2xl p-4 sm:p-6 hover:shadow-md transition"
                >
                  {/* Order Header - Responsive */}
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

                  {/* Addresses - Stack on mobile, side-by-side on desktop */}
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

                  {/* Order Details - Responsive tags */}
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

                  {/* Navigate Button - Full width on mobile, auto on desktop */}
                  <button 
                    onClick={() => handleNavigate(order.pickup_address, order.dropoff_address, order.status)}
                    className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-blue-500 text-white rounded-xl font-bold text-base sm:text-sm hover:bg-blue-600 transition shadow-lg"
                  >
                    🗺️ Navigate
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl md:hidden z-50">
        <div className="flex justify-around items-center py-2">
          <Link 
            href="/driver/dashboard"
            className="flex flex-col items-center py-2 px-4 text-gray-600"
          >
            <span className="text-2xl mb-1">🏠</span>
            <span className="text-xs">Dashboard</span>
          </Link>
          <Link 
            href="/driver/orders"
            className="flex flex-col items-center py-2 px-4 text-[#0072ab] font-bold"
          >
            <span className="text-2xl mb-1">📦</span>
            <span className="text-xs">Deliveries</span>
          </Link>
          <Link 
            href="/driver/earnings"
            className="flex flex-col items-center py-2 px-4 text-gray-600"
          >
            <span className="text-2xl mb-1">💰</span>
            <span className="text-xs">Earnings</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
    active: "bg-blue-100 text-blue-700 border-blue-300",
    delivered: "bg-green-100 text-green-700 border-green-300",
    cancelled: "bg-red-100 text-red-700 border-red-300",
  };

  return (
    <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold capitalize border-2 ${styles[status] || "bg-gray-100 text-gray-600 border-gray-300"}`}>
      {status}
    </span>
  );
}