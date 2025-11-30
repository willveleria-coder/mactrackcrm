"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import AdminDriverMap from "@/components/AdminDriverMap";

export default function AdminTrackingPage() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

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
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff]">
      
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-[#ba0606]">MAC TRACK</h1>
            <p className="text-xs text-gray-500">CRM Portal</p>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm text-gray-600">👨‍💼 {admin?.name}</span>
            <Link href="/admin/dashboard" className="text-sm font-semibold text-gray-700 hover:text-[#ba0606]">
              Dashboard
            </Link>
            <Link href="/admin/orders" className="text-sm font-semibold text-gray-700 hover:text-[#ba0606]">
              Orders
            </Link>
            <Link href="/admin/invoices" className="text-sm font-semibold text-gray-700 hover:text-[#ba0606]">
  Invoices
</Link>
            <Link href="/admin/clients" className="text-sm font-semibold text-gray-700 hover:text-[#ba0606]">
              Clients
            </Link>
            <Link href="/admin/drivers" className="text-sm font-semibold text-gray-700 hover:text-[#ba0606]">
              Drivers
            </Link>
            <Link href="/admin/tracking" className="text-sm font-semibold text-[#ba0606] border-b-2 border-[#ba0606]">
              Live Tracking
            </Link>
            <button 
              onClick={handleLogout}
              className="text-sm font-semibold text-red-600 hover:text-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Live Driver Tracking</h2>
          <p className="text-gray-600">Monitor all active drivers in real-time</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <AdminDriverMap />
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> Blue markers indicate drivers on duty. Gray markers are off duty. 
            Click on any marker to see driver details and current speed.
          </p>
        </div>
      </main>
    </div>
  );
}