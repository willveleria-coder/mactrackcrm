"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function AdminNotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadNotifications();

    // Realtime subscription for new notifications
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'driver_notifications'
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadNotifications() {
  try {
    const { data, error } = await supabase
      .from("driver_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    setNotifications(data || []);
    setUnreadCount(data?.filter(n => !n.is_read).length || 0);
  } catch (error) {
    console.error("Error loading notifications:", error);
  } finally {
    setLoading(false);
  }
}

  async function markAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from("driver_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
      loadNotifications();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  }

  async function deleteNotification(notificationId, event) {
  event.stopPropagation(); // Prevent click from bubbling
  
  if (!confirm("Delete this notification?")) return;
  
  try {
    const { error } = await supabase
      .from("driver_notifications")
      .delete()
      .eq("id", notificationId);

    if (error) throw error;
    
    // Refresh the list
    loadNotifications();
  } catch (error) {
    console.error("Error deleting:", error);
  }
}

  async function markAllAsRead() {
    try {
      const { error } = await supabase
        .from("driver_notifications")
        .update({ is_read: true })
        .eq("is_read", false);

      if (error) throw error;
      loadNotifications();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition"
      >
        <span className="text-2xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setShowDropdown(false)} 
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border-2 border-gray-200 z-40 max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg">📬 Driver Messages</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full font-semibold transition"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-5xl mb-3">📭</div>
                  <p className="text-gray-500 font-semibold">No messages yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition cursor-pointer ${
                        !notification.is_read ? "bg-blue-50" : ""
                      }`}
                      onClick={() => {
  markAsRead(notification.id);
  setShowDropdown(false);
  // Different routing based on type
  if (notification.type === 'payment_request') {
    window.location.href = `/admin/payouts`;
  } else {
    window.location.href = `/admin/orders`;
  }
}}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🚐</span>
                          <span className="font-bold text-gray-900 text-sm">
                            {notification.driver_name}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatTime(notification.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {notification.message}
                      </p>
                      {!notification.is_read && (
                        <span className="inline-block mt-2 text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-bold">
                          NEW
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 bg-gray-50 border-t border-gray-200">
                <Link
                  href="/admin/notifications"
                  onClick={() => setShowDropdown(false)}
                  className="block text-center text-sm font-semibold text-red-600 hover:text-red-700"
                >
                  View All Messages →
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}