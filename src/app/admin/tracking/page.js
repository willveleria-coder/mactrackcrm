"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import HamburgerMenu from "@/components/HamburgerMenu";
import AdminDriverMap from "@/components/AdminDriverMap";

export default function AdminTrackingPage() {
  const [admin, setAdmin] = useState(null);
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
    { href: "/admin/tracking", icon: "🗺️", label: "Live Tracking" },
  ];

  useEffect(() => {
    loadAdmin();
  }, []);

  async function loadAdmin() {
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
    } catch (error) {
      console.error("Error loading admin:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

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
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-red-600">Mac Track</h1>
              <p className="text-xs text-gray-500">Admin Portal</p>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">🗺️ Live Driver Tracking</h2>
          <p className="text-sm sm:text-base text-gray-600">Monitor all active drivers in real-time</p>
        </div>

        {/* Map Container */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6">
          <AdminDriverMap />
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="text-3xl">🔵</div>
              <div>
                <p className="font-bold text-blue-900 mb-1">On Duty Drivers</p>
                <p className="text-sm text-blue-700">Blue markers indicate drivers currently on duty and available for deliveries</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="text-3xl">⚫</div>
              <div>
                <p className="font-bold text-gray-900 mb-1">Off Duty Drivers</p>
                <p className="text-sm text-gray-700">Gray markers indicate drivers who are currently off duty or unavailable</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="text-3xl">📍</div>
              <div>
                <p className="font-bold text-green-900 mb-1">Driver Details</p>
                <p className="text-sm text-green-700">Click on any marker to view driver information and current speed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info Banner */}
        <div className="mt-6 bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-5 sm:p-6 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="text-4xl sm:text-5xl">💡</div>
            <div className="flex-1">
              <p className="font-bold text-lg mb-2">Real-Time Tracking Active</p>
              <p className="text-sm opacity-90">
                Driver locations update automatically every 30 seconds. Refresh the page to see the latest positions.
              </p>
            </div>
            <Link
              href="/admin/drivers"
              className="px-6 py-3 bg-white text-red-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition shadow-lg whitespace-nowrap"
            >
              Manage Drivers →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}