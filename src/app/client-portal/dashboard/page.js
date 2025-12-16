"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import HamburgerMenu from "@/components/HamburgerMenu";
import LiveChat from "@/components/LiveChat";
import LoyaltyCard from "@/components/LoyaltyCard";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";

function ClientDashboardContent() {
  const { theme } = useTheme();
  const [client, setClient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    inProgress: 0,
    completed: 0,
    totalSpent: 0,
    thisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const router = useRouter();
  const supabase = createClient();

  const menuItems = [
    { href: "/client-portal/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/client-portal/orders", icon: "📦", label: "Orders" },
    { href: "/client-portal/new-order", icon: "➕", label: "New Order" },
    { href: "/client-portal/feedback", icon: "⭐", label: "Feedback" },
    { href: "/client-portal/settings", icon: "⚙️", label: "Settings" },
  ];

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

      setOrders(ordersData || []);

      if (ordersData) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const totalOrders = ordersData.length;
        const inProgress = ordersData.filter(o => o.status === "pending" || o.status === "active").length;
        const completed = ordersData.filter(o => o.status === "delivered").length;
        const totalSpent = ordersData
          .filter(o => o.status === "delivered")
          .reduce((sum, o) => sum + (Number(o.price) || 0), 0);
        const thisMonth = ordersData.filter(o => new Date(o.created_at) >= monthStart).length;

        setStats({ totalOrders, inProgress, completed, totalSpent, thisMonth });
      }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  const activeDeliveries = orders.filter(o => o.status === 'pending' || o.status === 'active');
  const recentOrders = orders.slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff]">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/bus-icon.png" alt="Mac Track" width={40} height={40} className="object-contain" />
              <div>
                <h1 className={`text-xl sm:text-2xl font-black ${theme.text}`}>Mac Track</h1>
                <p className="text-xs text-gray-500">Client Portal</p>
              </div>
            </div>
            <HamburgerMenu items={menuItems} onLogout={handleLogout} userName={client?.name} userRole="Client" />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Welcome back, {client?.name}! 👋</h2>
          <p className="text-sm sm:text-base text-gray-600">Here's your delivery overview</p>
        </div>

        {/* Loyalty Card */}
        <div className="mb-6">
          <LoyaltyCard clientId={client?.id} />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className={`bg-gradient-to-br ${theme.gradient} rounded-2xl p-4 sm:p-5 text-white shadow-lg hover:shadow-xl transition transform hover:scale-105`}>
            <p className="text-xs sm:text-sm font-semibold opacity-90 mb-1">Total Orders</p>
            <p className="text-3xl sm:text-4xl font-black mb-1">{stats.totalOrders}</p>
            <p className="text-xs opacity-75">All time</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg hover:shadow-xl transition transform hover:scale-105">
            <p className="text-xs sm:text-sm font-semibold opacity-90 mb-1">In Progress</p>
            <p className="text-3xl sm:text-4xl font-black mb-1">{stats.inProgress}</p>
            <p className="text-xs opacity-75">Active</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg hover:shadow-xl transition transform hover:scale-105">
            <p className="text-xs sm:text-sm font-semibold opacity-90 mb-1">Completed</p>
            <p className="text-3xl sm:text-4xl font-black mb-1">{stats.completed}</p>
            <p className="text-xs opacity-75">Delivered</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg hover:shadow-xl transition transform hover:scale-105">
            <p className="text-xs sm:text-sm font-semibold opacity-90 mb-1">Total Spent</p>
            <p className="text-2xl sm:text-3xl font-black mb-1">${stats.totalSpent.toFixed(0)}</p>
            <p className="text-xs opacity-75">Lifetime</p>
          </div>

          <div className="bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl p-4 sm:p-5 text-white shadow-lg hover:shadow-xl transition transform hover:scale-105">
            <p className="text-xs sm:text-sm font-semibold opacity-90 mb-1">This Month</p>
            <p className="text-3xl sm:text-4xl font-black mb-1">{stats.thisMonth}</p>
            <p className="text-xs opacity-75">Orders</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Link href="/client-portal/new-order" className={`p-5 bg-gradient-to-br ${theme.gradient} text-white rounded-2xl shadow-lg hover:shadow-xl transition transform hover:scale-105 text-center`}>
            <div className="text-4xl mb-2">📦</div>
            <p className="font-bold text-sm sm:text-base">New Order</p>
          </Link>

          <Link href="/client-portal/orders" className="p-5 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition transform hover:scale-105 text-center">
            <div className="text-4xl mb-2">📋</div>
            <p className="font-bold text-sm sm:text-base">All Orders</p>
          </Link>

          <Link href="/client-portal/loyalty" className="p-5 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition transform hover:scale-105 text-center">
            <div className="text-4xl mb-2">🎁</div>
            <p className="font-bold text-sm sm:text-base">Rewards</p>
          </Link>

          <a href="tel:0430233811" className="p-5 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition transform hover:scale-105 text-center">
            <div className="text-4xl mb-2">📞</div>
            <p className="font-bold text-sm sm:text-base">Call Us</p>
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-8">
          {/* Active Deliveries */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">🚚 Active Deliveries</h3>
              
              {activeDeliveries.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📦</div>
                  <p className="text-gray-500 text-lg font-semibold mb-4">No Active Deliveries</p>
                  <Link href="/client-portal/new-order" className={`inline-block px-6 py-3 ${theme.bg} text-white rounded-xl font-bold transition shadow-lg`}>
                    Create New Order
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeDeliveries.map((order) => (
                    <div key={order.id} onClick={() => setSelectedOrder(order)} className="p-4 border-2 border-gray-200 rounded-xl hover:border-red-500 transition cursor-pointer bg-white">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold text-gray-900">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>
                      
                      <div className="space-y-2 text-sm mb-3">
                        <div className="flex items-start gap-2">
                          <span className="text-blue-600">📍</span>
                          <span className="text-gray-700 line-clamp-1">{order.pickup_address}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600">🎯</span>
                          <span className="text-gray-700 line-clamp-1">{order.dropoff_address}</span>
                        </div>
                      </div>

                      <Link href={`/client-portal/orders/${order.id}/track`} className={`block w-full text-center py-2 ${theme.bg} text-white rounded-lg font-semibold text-sm transition`} onClick={(e) => e.stopPropagation()}>
                        Track Live 📍
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Account Summary */}
          <div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6 mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">👤 Account Summary</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Name</p>
                  <p className="font-semibold text-gray-900">{client?.name}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Email</p>
                  <p className="font-semibold text-gray-900">{client?.email}</p>
                </div>
                {client?.phone && (
                  <div>
                    <p className="text-gray-600 mb-1">Phone</p>
                    <p className="font-semibold text-gray-900">{client?.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-600 mb-1">Member Since</p>
                  <p className="font-semibold text-gray-900">{new Date(client?.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <Link href="/client-portal/settings" className={`block w-full text-center mt-4 py-3 ${theme.bg} text-white rounded-xl font-bold transition shadow-lg`}>
                Settings ⚙️
              </Link>
            </div>

            {/* Help & Support */}
            <div className={`bg-gradient-to-br ${theme.gradient} rounded-2xl shadow-lg p-5 sm:p-6 text-white`}>
              <h3 className="text-lg font-bold mb-4">💬 Help & Support</h3>
              
              <div className="space-y-3">
                <a href="mailto:macwithavan@mail.com" className="block w-full text-center py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold text-sm transition backdrop-blur-sm">
                  📧 Email Support
                </a>
                <a href="tel:0430233811" className="block w-full text-center py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold text-sm transition backdrop-blur-sm">
                  📞 Call Us
                </a>
              </div>

              <p className="text-xs opacity-75 mt-4 text-center">Mon-Fri, 9AM-6PM AEST</p>
            </div>
          </div>
        </div>

        {/* Recent Orders Preview */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">📦 Recent Orders</h3>
            <Link href="/client-portal/orders" className={`text-sm font-semibold ${theme.text} hover:underline`}>
              View All →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-gray-500 font-semibold">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} onClick={() => setSelectedOrder(order)} className="p-4 border-2 border-gray-200 rounded-xl hover:border-gray-400 transition cursor-pointer bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-gray-900">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={order.status} />
                      <p className="text-sm font-bold text-green-600 mt-1">${Number(order.price).toFixed(2)}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{order.pickup_address} → {order.dropoff_address}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} theme={theme} />
      )}

      {/* Live Chat Button */}
      {client && <LiveChat userType="client" userId={client.id} />}
    </div>
  );
}

export default function ClientDashboard() {
  return (
    <ThemeProvider userType="client">
      <ClientDashboardContent />
    </ThemeProvider>
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
    active: "🚚 Active",
    delivered: "✅ Delivered",
    cancelled: "❌ Cancelled",
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || "bg-gray-100 text-gray-600 border-gray-300"}`}>
      {labels[status] || status}
    </span>
  );
}

function OrderModal({ order, onClose, theme }) {
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      <div className="fixed inset-4 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:inset-auto bg-white rounded-2xl shadow-2xl z-50 sm:w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className={`bg-gradient-to-r ${theme.gradient} text-white p-6 flex justify-between items-start`}>
          <div>
            <h3 className="text-2xl font-black mb-1">Order Details</h3>
            <p className="text-sm opacity-90">#{order.id.slice(0, 8)}</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center text-2xl font-bold">×</button>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <StatusBadge status={order.status} />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Price</p>
              <p className="text-2xl font-bold text-green-600">${Number(order.price).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 mb-2">📍 Pickup Address</p>
              <p className="text-gray-700">{order.pickup_address}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 mb-2">🎯 Delivery Address</p>
              <p className="text-gray-700">{order.dropoff_address}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 mb-2">📦 Parcel Details</p>
              <p className="text-gray-700">Size: {order.parcel_size}</p>
              {order.parcel_weight && <p className="text-gray-700">Weight: {order.parcel_weight}kg</p>}
              <p className="text-gray-700">Quantity: {order.quantity}</p>
            </div>
            {order.notes && (
              <div>
                <p className="text-sm font-bold text-gray-900 mb-2">📝 Notes</p>
                <p className="text-gray-700">{order.notes}</p>
              </div>
            )}
          </div>
          <button onClick={onClose} className="w-full mt-6 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition">Close</button>
        </div>
      </div>
    </>
  );
}