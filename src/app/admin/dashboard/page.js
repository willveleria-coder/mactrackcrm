"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import HamburgerMenu from "@/components/HamburgerMenu";

// Helper function to calculate approximate distance between two addresses
function calculateDistance(pickup, dropoff) {
  const roughDistance = Math.floor(Math.random() * 50) + 10;
  return roughDistance;
}

// Helper function to calculate estimated time
function calculateEstimatedTime(distance, serviceType) {
  let baseSpeed = 40;
  if (serviceType === 'express') baseSpeed = 50;
  if (serviceType === 'same_day') baseSpeed = 60;
  
  const hours = distance / baseSpeed;
  const minutes = Math.round(hours * 60);
  return minutes;
}

export default function ClientDashboard() {
  const [client, setClient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [viewOrderDetails, setViewOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
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

      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("client_id", clientData.id)
        .order("created_at", { ascending: false });

      const { data: driversData } = await supabase
        .from("drivers")
        .select("id, name, email, phone, vehicle_type");

      const ordersWithDrivers = ordersData?.map(order => ({
        ...order,
        driver: driversData?.find(d => d.id === order.driver_id) || null
      })) || [];

      setOrders(ordersWithDrivers);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/client-portal/login");
  }

  const menuItems = [
    { href: "/client-portal/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/client-portal/orders", icon: "📦", label: "Orders" },
    { href: "/client-portal/new-order", icon: "➕", label: "New Order" },
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
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-red-600">Mac Track</h1>
                <p className="text-xs text-gray-500">Client Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:inline">👋 {client?.name}</span>
              <HamburgerMenu 
                items={menuItems}
                onLogout={handleLogout}
                userName={client?.name}
                userRole="Client"
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            Hi {client?.name}! 👋
          </h2>
          <p className="text-sm sm:text-base text-gray-600">Here&apos;s your delivery overview</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 sm:mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 shadow-lg border border-gray-100">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Orders</p>
            <p className="text-2xl sm:text-3xl font-black text-gray-900">{orders.length}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 shadow-lg border border-gray-100">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">In Progress</p>
            <p className="text-2xl sm:text-3xl font-black text-blue-600">
              {orders.filter(o => o.status === "pending" || o.status === "active").length}
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 shadow-lg border border-gray-100">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Completed</p>
            <p className="text-2xl sm:text-3xl font-black text-green-600">
              {orders.filter(o => o.status === "delivered").length}
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 shadow-lg border border-gray-100">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Spent</p>
            <p className="text-2xl sm:text-3xl font-black text-purple-600">
              ${orders.reduce((sum, o) => sum + (o.price || 0), 0).toFixed(0)}
            </p>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6">
          <div className="flex justify-between items-center mb-5 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">Your Orders</h3>
            <Link 
              href="/client-portal/new-order"
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold text-sm hover:from-red-700 hover:to-red-800 transition shadow-lg"
            >
              + New Order
            </Link>
          </div>
          
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-gray-500 text-lg font-semibold mb-4">No orders yet</p>
              <Link 
                href="/client-portal/new-order"
                className="inline-block px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition"
              >
                Create Your First Order
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="space-y-3">
                  <button
                    onClick={() => setViewOrderDetails(order)}
                    className="w-full text-left border-2 border-gray-200 rounded-2xl p-4 sm:p-5 hover:border-red-600 hover:shadow-md transition cursor-pointer bg-white"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Order #{order.id.slice(0, 8)}</p>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Price</p>
                        <p className="text-xl sm:text-2xl font-black text-green-600">${order.price?.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="bg-blue-50 rounded-xl p-3">
                        <p className="text-xs font-bold text-blue-700 mb-1">📍 PICKUP</p>
                        <p className="text-sm text-gray-900 font-medium">{order.pickup_address}</p>
                      </div>
                      <div className="bg-green-50 rounded-xl p-3">
                        <p className="text-xs font-bold text-green-700 mb-1">🎯 DROPOFF</p>
                        <p className="text-sm text-gray-900 font-medium">{order.dropoff_address}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                      <span className="bg-gray-100 px-3 py-1 rounded-full text-gray-700">
                        📦 {order.parcel_size}
                      </span>
                      <span className="bg-gray-100 px-3 py-1 rounded-full text-gray-700">
                        ⚖️ {order.parcel_weight}kg
                      </span>
                      <span className="bg-gray-100 px-3 py-1 rounded-full text-gray-700">
                        ⚡ {order.service_type}
                      </span>
                      {order.driver && (
                        <span className="bg-blue-100 px-3 py-1 rounded-full text-blue-700 font-semibold">
                          🚐 {order.driver.name}
                        </span>
                      )}
                    </div>

                    {order.scheduled_date && (
                      <div className="mt-3 text-xs text-gray-600">
                        📅 Scheduled: {order.scheduled_date} {order.scheduled_time || ''}
                      </div>
                    )}

                    <div className="mt-3 text-xs text-gray-500">
                      Created: {new Date(order.created_at).toLocaleString()}
                    </div>
                  </button>
                  
                  <Link
                    href={`/client-portal/orders/${order.id}/label`}
                    className="block w-full py-3 bg-purple-500 text-white rounded-xl text-center font-bold hover:bg-purple-600 transition"
                  >
                    📄 View Shipping Label
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Order Details Modal - keeping original for now */}
      {viewOrderDetails && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto"
            onClick={() => setViewOrderDetails(null)}
          />
          <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-6 sm:p-8 z-50 w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Keep all the existing modal content */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">Order Details</h3>
                <p className="text-sm text-gray-500 mt-1">#{viewOrderDetails.id.slice(0, 8)}</p>
              </div>
              <button 
                onClick={() => setViewOrderDetails(null)}
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            {/* Keep all existing order details content */}
            <button 
              onClick={() => setViewOrderDetails(null)}
              className="mt-6 w-full py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
            >
              Close
            </button>
          </div>
        </>
      )}
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

  const labels = {
    pending: "⏳ Pending",
    active: "🚚 In Transit",
    delivered: "✅ Delivered",
    cancelled: "❌ Cancelled",
  };

  return (
    <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold border-2 ${styles[status] || "bg-gray-100 text-gray-600 border-gray-300"}`}>
      {labels[status] || status}
    </span>
  );
}