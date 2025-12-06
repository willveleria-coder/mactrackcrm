"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import DriverLocationTracker from "@/components/DriverLocationTracker";
import HamburgerMenu from "@/components/HamburgerMenu";
import { ThemeProvider, useTheme } from "../../../context/ThemeContext";

function DriverDashboardContent() {
  const { theme } = useTheme();
  const [driver, setDriver] = useState(null);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ assigned: 0, completed: 0, earnings: 0, pending: 0, active: 0, thisWeek: 0 });
  const [loading, setLoading] = useState(true);
  const [showContactPopup, setShowContactPopup] = useState(false);
  const [adminContact, setAdminContact] = useState(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadDashboard();
    loadAdminContact();
  }, []);

  async function loadDashboard() {
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

      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("driver_id", driverData.id)
        .order("created_at", { ascending: false });

      if (!ordersError && ordersData) {
        setOrders(ordersData);
        
        const assigned = ordersData.filter(o => o.status === "pending" || o.status === "active").length;
        const pending = ordersData.filter(o => o.status === "pending").length;
        const active = ordersData.filter(o => o.status === "active").length;
        const completed = ordersData.filter(o => o.status === "delivered").length;
        const earnings = ordersData
          .filter(o => o.status === "delivered")
          .reduce((sum, o) => sum + Number(o.price), 0);
        
        // This week's deliveries
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const thisWeek = ordersData.filter(o => 
          o.status === "delivered" && new Date(o.created_at) > oneWeekAgo
        ).length;
        
        setStats({ assigned, completed, earnings, pending, active, thisWeek });
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAdminContact() {
    try {
      const { data, error } = await supabase
        .from("admins")
        .select("phone, email, whatsapp")
        .limit(1)
        .single();

      if (!error && data) {
        setAdminContact(data);
      }
    } catch (error) {
      console.error("Error loading admin contact:", error);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/driver/login");
  }

  async function handleAcceptOrder(orderId) {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ 
          status: "active",
          driver_status: "accepted" 
        })
        .eq("id", orderId);

      if (error) throw error;

      loadDashboard();
      alert("✅ Order accepted successfully!");
    } catch (error) {
      console.error("Accept error:", error);
      alert("Failed to accept order: " + error.message);
    }
  }

  async function handleRejectOrder(orderId) {
    const reason = prompt("Please provide a reason for rejecting this order:");
    
    if (!reason) return;

    try {
      const { data: currentOrder } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      const { error } = await supabase
        .from("orders")
        .update({ 
          driver_id: null,
          driver_status: "rejected",
          status: "pending",
          notes: currentOrder.notes 
            ? `${currentOrder.notes}\n\nRejected by ${driver.name}: ${reason}` 
            : `Rejected by ${driver.name}: ${reason}`
        })
        .eq("id", orderId);

      if (error) throw error;

      loadDashboard();
      alert("✅ Order rejected. It will be reassigned to another driver.");
    } catch (error) {
      console.error("Reject error:", error);
      alert("Failed to reject order: " + error.message);
    }
  }

  async function handleToggleDuty() {
    try {
      const newStatus = !driver.is_on_duty;
      const { error } = await supabase
        .from("drivers")
        .update({ is_on_duty: newStatus })
        .eq("id", driver.id);

      if (error) throw error;

      setDriver({ ...driver, is_on_duty: newStatus });
    } catch (error) {
      alert("Failed to update duty status: " + error.message);
    }
  }

  async function handleSendToAdmin(orderId) {
    try {
      const order = orders.find(o => o.id === orderId);
      
      const message = `Driver ${driver.name} has sent order details:
Order ID: ${orderId.slice(0, 8)}
Pickup: ${order.pickup_address}
Dropoff: ${order.dropoff_address}
Status: ${order.status}
Service: ${order.service_type}
Size: ${order.parcel_size} (${order.parcel_weight}kg)`;

      const { error } = await supabase
        .from("admin_notifications")
        .insert([{
          order_id: orderId,
          driver_id: driver.id,
          message: message,
          type: "order_details"
        }]);

      if (error) throw error;

      alert("✅ Order details sent to admin successfully!");
    } catch (error) {
      console.error("Send to admin error:", error);
      alert("Failed to send to admin: " + error.message);
    }
  }

  function handleCall() {
    // Hardcoded admin phone number
    window.location.href = `tel:+61399998877`;
  }

  function handleSMS() {
    // Hardcoded admin phone number
    window.location.href = `sms:+61399998877`;
  }

  function handleEmail() {
    // Hardcoded admin email
    window.location.href = `mailto:driversupport@mactrack.com.au`;
  }

  function handleWhatsApp() {
    // Hardcoded WhatsApp number (remove spaces/dashes)
    const phone = '61399998877';
    window.open(`https://wa.me/${phone}`, '_blank');
  }

  function handleNavigate(pickupAddress, dropoffAddress, orderStatus) {
    const destination = orderStatus === "pending" ? pickupAddress : dropoffAddress;
    const encodedDestination = encodeURIComponent(destination);
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}&travelmode=driving`;
    window.open(googleMapsUrl, '_blank');
  }

  const menuItems = [
    { href: "/driver/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/driver/orders", icon: "📦", label: "Deliveries" },
    { href: "/driver/earnings", icon: "💰", label: "Earnings" },
    { href: "/driver/wallet", icon: "💳", label: "Wallet" },
    { href: "/driver/feedback", icon: "⭐", label: "Feedback" },
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
                <h1 className={`text-xl sm:text-2xl font-black ${theme.text}`}>MAC WITH A VAN</h1>
                <p className="text-xs text-gray-500">Driver Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:inline">👋 {driver?.name}</span>
              <HamburgerMenu 
                items={menuItems}
                onLogout={handleLogout}
                userName={driver?.name}
                userRole="Driver"
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            Hi {driver?.name}! 👋
          </h2>
          <p className="text-sm sm:text-base text-gray-600">Here&apos;s your delivery overview</p>
        </div>

        {/* Enhanced Stats - 2 rows on mobile, 3 columns on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-4 sm:p-5 text-white shadow-lg">
            <p className="text-xs sm:text-sm font-medium opacity-90 mb-1">Pending</p>
            <p className="text-3xl sm:text-4xl font-black">{stats.pending}</p>
            <p className="text-xs opacity-75 mt-1">Awaiting response</p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg">
            <p className="text-xs sm:text-sm font-medium opacity-90 mb-1">Active</p>
            <p className="text-3xl sm:text-4xl font-black">{stats.active}</p>
            <p className="text-xs opacity-75 mt-1">In progress</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg">
            <p className="text-xs sm:text-sm font-medium opacity-90 mb-1">Completed</p>
            <p className="text-3xl sm:text-4xl font-black">{stats.completed}</p>
            <p className="text-xs opacity-75 mt-1">All time</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg">
            <p className="text-xs sm:text-sm font-medium opacity-90 mb-1">Total Earnings</p>
            <p className="text-2xl sm:text-4xl font-black">${stats.earnings.toFixed(2)}</p>
            <p className="text-xs opacity-75 mt-1">Lifetime</p>
          </div>
          
          <div className="bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl p-4 sm:p-5 text-white shadow-lg">
            <p className="text-xs sm:text-sm font-medium opacity-90 mb-1">This Week</p>
            <p className="text-3xl sm:text-4xl font-black">{stats.thisWeek}</p>
            <p className="text-xs opacity-75 mt-1">Deliveries</p>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg">
            <p className="text-xs sm:text-sm font-medium opacity-90 mb-1">Vehicle</p>
            <p className="text-2xl sm:text-3xl font-black capitalize">{driver?.vehicle_type}</p>
            <p className="text-xs opacity-75 mt-1">{driver?.license_plate}</p>
          </div>
        </div>

        {/* Duty Status */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Duty Status</h3>
              <p className="text-sm text-gray-600">
                {driver?.is_on_duty ? "You&apos;re on duty 🟢" : "You&apos;re off duty ⏸️"}
              </p>
            </div>
            <button
              onClick={handleToggleDuty}
              className={`w-full sm:w-auto px-6 py-4 rounded-2xl font-bold text-base shadow-lg transition-all ${
                driver?.is_on_duty
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "bg-gray-300 text-gray-700 hover:bg-gray-400"
              }`}
            >
              {driver?.is_on_duty ? "✅ ON DUTY" : "⏸️ OFF DUTY"}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Link
            href="/driver/orders"
            className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition text-center"
          >
            <div className="text-3xl mb-2">📦</div>
            <p className="text-sm font-bold text-gray-900">View All Orders</p>
          </Link>
          
          <Link
            href="/driver/earnings"
            className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition text-center"
          >
            <div className="text-3xl mb-2">💰</div>
            <p className="text-sm font-bold text-gray-900">My Earnings</p>
          </Link>
          
          <Link
            href="/driver/wallet"
            className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition text-center"
          >
            <div className="text-3xl mb-2">💳</div>
            <p className="text-sm font-bold text-gray-900">Wallet</p>
          </Link>
          
          <Link
            href="/driver/feedback"
            className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition text-center"
          >
            <div className="text-3xl mb-2">⭐</div>
            <p className="text-sm font-bold text-gray-900">Feedback</p>
          </Link>
        </div>

        {/* Your Orders */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-5">Your Orders</h3>
          
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-gray-500 text-lg font-semibold">No orders yet</p>
              <p className="text-gray-400 text-sm mt-2">Orders will appear here when assigned</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div 
                  key={order.id} 
                  className="border-2 border-gray-200 rounded-2xl p-4 sm:p-5 hover:shadow-md transition bg-white"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Order #{order.id.slice(0, 8)}</p>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-xs font-bold text-blue-700 mb-1">📍 PICKUP</p>
                      <p className="text-sm text-gray-900 font-medium leading-snug">{order.pickup_address}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3">
                      <p className="text-xs font-bold text-green-700 mb-1">🎯 DROPOFF</p>
                      <p className="text-sm text-gray-900 font-medium leading-snug">{order.dropoff_address}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-4">
                    <span className="bg-gray-100 px-3 py-1 rounded-full">📦 {order.parcel_size}</span>
                    <span className="bg-gray-100 px-3 py-1 rounded-full">⚖️ {order.parcel_weight}kg</span>
                    <span className="bg-gray-100 px-3 py-1 rounded-full">⚡ {order.service_type}</span>
                  </div>

                  {order.status === "pending" || order.driver_status === null ? (
                    <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-3">
                      <button 
                        onClick={() => handleAcceptOrder(order.id)}
                        className="w-full sm:flex-1 py-5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl font-black text-lg hover:from-green-600 hover:to-green-700 transition-all shadow-2xl hover:shadow-green-500/50 transform hover:scale-105"
                      >
                        ✅ ACCEPT JOB
                      </button>
                      <button 
                        onClick={() => handleRejectOrder(order.id)}
                        className="w-full sm:flex-1 py-5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-black text-lg hover:from-red-600 hover:to-red-700 transition-all shadow-2xl hover:shadow-red-500/50 transform hover:scale-105"
                      >
                        ❌ REJECT JOB
                      </button>
                      <button 
                        onClick={() => handleNavigate(order.pickup_address, order.dropoff_address, order.status)}
                        className="w-full sm:w-auto px-6 py-5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl font-bold text-base hover:from-blue-600 hover:to-blue-700 transition-all shadow-xl"
                      >
                        🗺️ Navigate
                      </button>
                    </div>
                  ) : order.status === "delivered" ? (
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
                      <p className="text-base font-bold text-green-700">
                        ✅ Delivered Successfully
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-0 sm:flex sm:gap-2">
                      <Link
                        href={`/driver/orders/${order.id}/proof`}
                        className="block w-full sm:flex-1 py-4 bg-purple-500 text-white rounded-xl font-bold text-base hover:bg-purple-600 transition text-center shadow-lg"
                      >
                        📸 Add Proof of Delivery
                      </Link>
                      <button 
                        onClick={() => handleNavigate(order.pickup_address, order.dropoff_address, order.status)}
                        className="w-full sm:w-auto px-6 py-4 bg-blue-500 text-white rounded-xl font-bold text-base hover:bg-blue-600 transition shadow-lg"
                      >
                        🗺️ Navigate
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={() => handleSendToAdmin(order.id)}
                    className="w-full mt-3 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-orange-700 transition shadow-lg"
                  >
                    📨 Send Order Details to Admin
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating Help Button */}
      <button
        onClick={() => setShowContactPopup(!showContactPopup)}
        className={`fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r ${theme.gradient} text-white rounded-full shadow-2xl hover:scale-110 transition-transform z-50 flex items-center justify-center text-2xl font-bold`}
      >
        ❓
      </button>

      {/* Contact Popup */}
      {showContactPopup && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowContactPopup(false)}
          />
          
          <div className="fixed bottom-24 right-8 bg-white rounded-2xl shadow-2xl border-2 border-gray-200 p-4 z-50 w-64">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Contact Admin</h3>
              <button 
                onClick={() => setShowContactPopup(false)}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-2">
              <button
                onClick={handleCall}
                className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 rounded-xl transition text-left"
              >
                <span className="text-2xl">📞</span>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Call Admin</p>
                  <p className="text-xs text-gray-600">+61 3 9999 8877</p>
                </div>
              </button>

              <button
                onClick={handleSMS}
                className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition text-left"
              >
                <span className="text-2xl">💬</span>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Send SMS</p>
                  <p className="text-xs text-gray-600">+61 3 9999 8877</p>
                </div>
              </button>

              <button
                onClick={handleEmail}
                className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-xl transition text-left"
              >
                <span className="text-2xl">📧</span>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Email Admin</p>
                  <p className="text-xs text-gray-600">driversupport@mactrack.com.au</p>
                </div>
              </button>

              <button
                onClick={handleWhatsApp}
                className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 rounded-xl transition text-left"
              >
                <span className="text-2xl">📱</span>
                <div>
                  <p className="font-bold text-gray-900 text-sm">WhatsApp</p>
                  <p className="text-xs text-gray-600">+61 3 9999 8877</p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {driver && driver.is_on_duty && (
        <DriverLocationTracker driverId={driver.id} />
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-red-500 text-white border-red-600",
    active: "bg-green-500 text-white border-green-600",
    delivered: "bg-blue-500 text-white border-blue-600",
    cancelled: "bg-gray-500 text-white border-gray-600",
  };

  const labels = {
    pending: "🔴 ASSIGNED - AWAITING RESPONSE",
    active: "🟢 ACCEPTED - IN PROGRESS",
    delivered: "✅ DELIVERED",
    cancelled: "⛔ CANCELLED",
  };

  return (
    <span className={`inline-block px-4 py-2 rounded-full text-xs font-black uppercase border-2 ${styles[status] || "bg-gray-100 text-gray-600 border-gray-300"}`}>
      {labels[status] || status}
    </span>
  );
}

export default function DriverDashboard() {
  return (
    <ThemeProvider userType="driver">
      <DriverDashboardContent />
    </ThemeProvider>
  );
}