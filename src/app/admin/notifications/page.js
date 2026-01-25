"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import HamburgerMenu from "@/components/HamburgerMenu";

export default function AdminNotificationsPage() {
  const [admin, setAdmin] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all"); // all, unread, read
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const menuItems = [
    { href: "/admin/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/admin/orders", icon: "📦", label: "Orders" },
    { href: "/admin/clients", icon: "👥", label: "Clients" },
    { href: "/admin/drivers", icon: "🚐", label: "Drivers" },
    { href: "/admin/analytics", icon: "📊", label: "Analytics" },
    { href: "/admin/invoices", icon: "💰", label: "Invoices" },
    { href: "/admin/notifications", icon: "🔔", label: "Notifications" },
    { href: "/admin/settings", icon: "⚙️", label: "Settings" },
  ];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push("/admin/login");
        return;
      }

      const { data: adminData } = await supabase
        .from("admins")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!adminData) {
        router.push("/admin/login");
        return;
      }

      setAdmin(adminData);

      // Load notifications
      const { data: notificationsData, error: notifError } = await supabase
        .from("driver_notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (!notifError && notificationsData) {
        setNotifications(notificationsData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  async function markAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from("driver_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  }

  async function markAllAsRead() {
    try {
      const { error } = await supabase
        .from("driver_notifications")
        .update({ is_read: true })
        .eq("is_read", false);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error("Error:", error);
    }
  }

  async function deleteNotification(notificationId) {
  if (!confirm("Delete this notification?")) return;
  
  try {
    // Delete from database
    const { error } = await supabase
      .from("driver_notifications")
      .delete()
      .eq("id", notificationId);

    if (error) {
      console.error("Supabase delete error:", error);
      alert("❌ Failed to delete: " + error.message);
      return;
    }

    // Remove from local state immediately
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    console.log("✅ Notification deleted successfully");
  } catch (error) {
    console.error("Error deleting:", error);
    alert("❌ Failed to delete: " + error.message);
  }
}

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === "unread") return !n.is_read;
    if (filter === "read") return n.is_read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

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
                <h1 className="text-xl sm:text-2xl font-black text-red-600">Mac Track</h1>
                <p className="text-xs text-gray-500">Admin Portal</p>
              </div>
            </div>
            
            <HamburgerMenu 
              items={menuItems}
              onLogout={handleLogout}
              userName={admin?.name || 'Admin'}
              userRole="Admin"
            />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">🔔 Driver Notifications</h2>
            <p className="text-sm sm:text-base text-gray-600">Messages from your drivers</p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg"
            >
              ✅ Mark All as Read ({unreadCount})
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 shadow-lg">
            <p className="text-sm text-gray-600 mb-1">Total</p>
            <p className="text-3xl font-black text-gray-900">{notifications.length}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 shadow-lg">
            <p className="text-sm text-gray-600 mb-1">Unread</p>
            <p className="text-3xl font-black text-red-600">{unreadCount}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 shadow-lg">
            <p className="text-sm text-gray-600 mb-1">Read</p>
            <p className="text-3xl font-black text-green-600">{notifications.length - unreadCount}</p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`px-6 py-3 rounded-xl font-bold transition ${
              filter === "all"
                ? "bg-red-600 text-white shadow-lg"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-red-600"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-6 py-3 rounded-xl font-bold transition ${
              filter === "unread"
                ? "bg-red-600 text-white shadow-lg"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-red-600"
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter("read")}
            className={`px-6 py-3 rounded-xl font-bold transition ${
              filter === "read"
                ? "bg-red-600 text-white shadow-lg"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-red-600"
            }`}
          >
            Read ({notifications.length - unreadCount})
          </button>
        </div>

        {/* Notifications List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-500 text-lg font-semibold">No notifications</p>
              <p className="text-gray-400 text-sm mt-2">
                {filter === "unread" ? "All caught up!" : "No messages yet"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredNotifications.map((notification) => (
  <div
    key={notification.id}
    onClick={() => setSelectedOrder(notification)}
    className={`p-6 hover:bg-gray-50 transition ${
      !notification.is_read ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
    }`}
  >
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">
            {notification.type === 'payment_request' ? '💳' : '🚐'}
          </span>
          <div>
            <p className="font-bold text-gray-900">{notification.driver_name}</p>
            <p className="text-xs text-gray-500">{formatTime(notification.created_at)}</p>
          </div>
          {!notification.is_read && (
            <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              NEW
            </span>
          )}
          {notification.type === 'payment_request' && notification.amount && (
            <span className="bg-green-500 text-white text-sm font-bold px-3 py-1 rounded-full">
              ${parseFloat(notification.amount).toFixed(2)}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-700 mt-3 leading-relaxed">
          {notification.message}
        </p>
        <Link
          href={notification.type === 'payment_request' ? `/admin/payouts` : `/admin/orders`}
          className="inline-block mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
        >
          {notification.type === 'payment_request' ? 'View Payment Request →' : 'View Order →'}
        </Link>
      </div>
      <div className="flex sm:flex-col gap-2">
        {!notification.is_read && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              markAsRead(notification.id);
            }}
            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-bold hover:bg-green-600 transition whitespace-nowrap"
          >
            ✅ Mark Read
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteNotification(notification.id);
          }}
          className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition"
        >
          🗑️
        </button>
      </div>
    </div>
  </div>
))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}