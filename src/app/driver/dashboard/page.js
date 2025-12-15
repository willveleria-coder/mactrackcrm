"use client";
import { useState, useEffect, useRef } from "react";
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
  const [stats, setStats] = useState({ assigned: 0, completed: 0, pending: 0, active: 0, hoursWorked: 0 });
  const [loading, setLoading] = useState(true);
  const [showContactPopup, setShowContactPopup] = useState(false);
  const [adminContact, setAdminContact] = useState(null);
  
  // Notification states
  const [newJobAlert, setNewJobAlert] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const audioRef = useRef(null);
  const previousOrdersRef = useRef([]);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadDashboard();
    loadAdminContact();
  }, []);

  // Set up real-time subscription for new orders
  useEffect(() => {
    if (!driver?.id) return;

    const channel = supabase
      .channel('driver-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `driver_id=eq.${driver.id}`
        },
        (payload) => {
          console.log('Order change received:', payload);
          
          // Check if this is a new assignment
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newOrder = payload.new;
            
            // Check if this order wasn't in our previous list (new assignment)
            const wasAlreadyAssigned = previousOrdersRef.current.some(o => o.id === newOrder.id);
            
            if (!wasAlreadyAssigned && newOrder.status === 'pending') {
              // New job assigned!
              triggerNewJobAlert(newOrder);
            }
          }
          
          // Reload dashboard to get fresh data
          loadDashboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driver?.id]);

  function triggerNewJobAlert(order) {
    setNewJobAlert(order);
    setShowNotification(true);
    
    // Play notification sound
    try {
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }
    } catch (e) {
      console.log('Audio error:', e);
    }
    
    // Also try browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚚 New Job Assigned!', {
        body: `Pickup: ${order.pickup_address?.slice(0, 50)}...`,
        icon: '/bus-icon.png',
        requireInteraction: true
      });
    }
    
    // Vibrate on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  }

  // Request notification permission on load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
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
        // Check for new orders before updating state
        if (previousOrdersRef.current.length > 0) {
          const newOrders = ordersData.filter(
            newOrder => !previousOrdersRef.current.some(oldOrder => oldOrder.id === newOrder.id) && newOrder.status === 'pending'
          );
          
          if (newOrders.length > 0) {
            triggerNewJobAlert(newOrders[0]);
          }
        }
        
        previousOrdersRef.current = ordersData;
        setOrders(ordersData);
        
        const assigned = ordersData.filter(o => o.status === "pending" || o.status === "active").length;
        const pending = ordersData.filter(o => o.status === "pending").length;
        const active = ordersData.filter(o => o.status === "active").length;
        const completed = ordersData.filter(o => o.status === "delivered").length;
        
        const hoursWorked = driverData.hours_worked || 0;
        
        setStats({ assigned, completed, pending, active, hoursWorked });
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

      setShowNotification(false);
      setNewJobAlert(null);
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

      setShowNotification(false);
      setNewJobAlert(null);
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
    window.location.href = `tel:0430233811`;
  }

  function handleSMS() {
    window.location.href = `sms:0430233811`;
  }

  function handleEmail() {
    window.location.href = `mailto:macwithavan@mail.com`;
  }

  function handleWhatsApp() {
    const phone = '61430233811';
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
    { href: "/driver/hours", icon: "⏱️", label: "Hours" },
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
      
      {/* Hidden audio element for notification sound */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleymS5+7LgEocSJvLzIpLHS5zl7WteS8MMIF+lK+jdjkkLYGYo6STYzEiLXSLnpqKWy4jLWt/joJ0TyMlKlt7g3pqRSYnKFZ0eXRqRScpKlVxdXRqRykrLFhxc3NqSCorLFhxc3NqSCkrLFhxc3NqSSkrK1ZvcXJpRygqKlNtb3BoRScpKVFrbm9nRCYoKE9pbG1mQyUnJ01namtlQiQmJktmZ2ljQSQlJEljZWdgPyMkI0dhY2VePiIjIkRfYWNcPSEiIkJdX2FaPiAhIUBbXV9YPR8gID5ZW11WOx4fHzxXWVtUOh0eHjpVV1lSOBwdHTlTVVdQNxscHDhRU1VONRINDS5ERUlLMwcICS45PEFELgEBBSkxMzMtAP36/ywpJx0k/vXt7ygjGxgk/fHl5CQgGxok/e7h3yYfGxsm/uvd2ygeGxsn/und2CoeGxso/uXY1SseGhsp/uPT0i0fGhsq/uDP0C8gGhsr/t7LzjEhGhss/tzIyzMiGhsu/trFyTQjGRsv/tfBxjUkGRsx/tS+wjclGBsy/tK7vzkoGBs0/s+4vDopFxs1/sy0uTwqFxs2/sm0tz0rFhs3/saxsz4sFRs5/sSvrD8uFBs6/cKrqEAvExs7/cCnpUEwERs8/b2koEIyERs+/bunm0Q0DxtA/bidl0Y2DhtB/bWZk0g4DRtC/bKVj0o6DBtD/bCRjEw8CxtF/a6NiE4+CRtG/auJhVFACBtI/aiGgVNCBhtJ/aWCfVVEBRpK/aJ+elZGBBpM/aB6dlhIAhpN/Z12clpKARpP/Ztyb1xMABlQ/Zlva15O/xdS/ZZrZ2BQ/hZT/ZNnY2JS/RVV/ZFjX2RU/BRW/Y5fW2ZW+xJY/YtbV2hY+hFZ/YlXU2pa+RBb/YZTTmxc9w5c/YNPSm5e9Q1e/YFLRnBh8wtf/X5HQnNj8Qpg/Xs+O3Vm7gZi/XU1MHlo6gJk/3AAAAAA" type="audio/wav"/>
      </audio>

      {/* NEW JOB NOTIFICATION POPUP */}
      {showNotification && newJobAlert && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-70 z-[100]" />
          <div className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg bg-white rounded-3xl shadow-2xl z-[101] overflow-hidden animate-bounce-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white text-center">
              <div className="text-6xl mb-2 animate-pulse">🚚</div>
              <h2 className="text-3xl font-black">NEW JOB ASSIGNED!</h2>
              <p className="text-sm opacity-90 mt-1">You have a new delivery request</p>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                <p className="text-xs font-bold text-blue-700 mb-1">📍 PICKUP</p>
                <p className="text-sm font-semibold text-gray-900">{newJobAlert.pickup_address}</p>
                {newJobAlert.pickup_contact_name && (
                  <p className="text-xs text-gray-600 mt-1">👤 {newJobAlert.pickup_contact_name} - {newJobAlert.pickup_contact_phone}</p>
                )}
              </div>
              
              <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                <p className="text-xs font-bold text-green-700 mb-1">🎯 DROPOFF</p>
                <p className="text-sm font-semibold text-gray-900">{newJobAlert.dropoff_address}</p>
                {newJobAlert.dropoff_contact_name && (
                  <p className="text-xs text-gray-600 mt-1">👤 {newJobAlert.dropoff_contact_name} - {newJobAlert.dropoff_contact_phone}</p>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-semibold">📦 {newJobAlert.parcel_size}</span>
                <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-semibold">⚖️ {newJobAlert.parcel_weight}kg</span>
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold">⚡ {newJobAlert.service_type}</span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="p-6 bg-gray-50 space-y-3">
              <button
                onClick={() => handleAcceptOrder(newJobAlert.id)}
                className="w-full py-5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl font-black text-xl hover:from-green-600 hover:to-green-700 transition-all shadow-xl transform hover:scale-105"
              >
                ✅ ACCEPT JOB
              </button>
              <button
                onClick={() => handleRejectOrder(newJobAlert.id)}
                className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-bold text-lg hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
              >
                ❌ REJECT JOB
              </button>
              <button
                onClick={() => {
                  setShowNotification(false);
                  setNewJobAlert(null);
                }}
                className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
              >
                View Later
              </button>
            </div>
          </div>
        </>
      )}

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
              {/* Notification bell with count */}
              {stats.pending > 0 && (
                <div className="relative">
                  <span className="text-2xl">🔔</span>
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {stats.pending}
                  </span>
                </div>
              )}
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

        {/* Pending Jobs Alert Banner */}
        {stats.pending > 0 && (
          <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-2xl p-4 mb-6 shadow-lg animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⚠️</span>
                <div>
                  <p className="font-black text-lg">You have {stats.pending} pending job{stats.pending > 1 ? 's' : ''}!</p>
                  <p className="text-sm opacity-90">Please accept or reject to continue</p>
                </div>
              </div>
              <a href="#orders" className="bg-white text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-gray-100 transition">
                View Jobs
              </a>
            </div>
          </div>
        )}

        {/* Stats Grid - 4 cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
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
            <p className="text-xs sm:text-sm font-medium opacity-90 mb-1">Hours Worked</p>
            <p className="text-3xl sm:text-4xl font-black">{stats.hoursWorked.toFixed(1)}</p>
            <p className="text-xs opacity-75 mt-1">Total hours</p>
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
            href="/driver/hours"
            className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition text-center"
          >
            <div className="text-3xl mb-2">⏱️</div>
            <p className="text-sm font-bold text-gray-900">My Hours</p>
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
        <div id="orders" className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6">
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
                  className={`border-2 rounded-2xl p-4 sm:p-5 hover:shadow-md transition bg-white ${
                    order.status === 'pending' ? 'border-red-400 ring-2 ring-red-200' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Order #{order.id.slice(0, 8)}</p>
                      <StatusBadge status={order.status} />
                    </div>
                    {order.status === 'pending' && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                        ACTION REQUIRED
                      </span>
                    )}
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
                  <p className="text-xs text-gray-600">0430 233 811</p>
                </div>
              </button>

              <button
                onClick={handleSMS}
                className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition text-left"
              >
                <span className="text-2xl">💬</span>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Send SMS</p>
                  <p className="text-xs text-gray-600">0430 233 811</p>
                </div>
              </button>

              <button
                onClick={handleEmail}
                className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-xl transition text-left"
              >
                <span className="text-2xl">📧</span>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Email Admin</p>
                  <p className="text-xs text-gray-600">macwithavan@mail.com</p>
                </div>
              </button>

              <button
                onClick={handleWhatsApp}
                className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 rounded-xl transition text-left"
              >
                <span className="text-2xl">📱</span>
                <div>
                  <p className="font-bold text-gray-900 text-sm">WhatsApp</p>
                  <p className="text-xs text-gray-600">0430 233 811</p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {driver && driver.is_on_duty && (
        <DriverLocationTracker driverId={driver.id} />
      )}

      {/* CSS for bounce animation */}
      <style jsx global>{`
        @keyframes bounce-in {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.05); }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.4s ease-out forwards;
        }
      `}</style>
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