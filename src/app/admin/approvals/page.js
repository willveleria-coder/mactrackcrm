"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Image from "next/image";
import HamburgerMenu from "@/components/HamburgerMenu";

export default function AdminApprovalsPage() {
  const [admin, setAdmin] = useState(null);
  const [pendingDrivers, setPendingDrivers] = useState([]);
  const [pendingClients, setPendingClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("drivers");
  const router = useRouter();
  const supabase = createClient();

  const menuItems = [
    { href: "/admin/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/admin/orders", icon: "📦", label: "Orders" },
    { href: "/admin/clients", icon: "👥", label: "Clients" },
    { href: "/admin/drivers", icon: "🚐", label: "Drivers" },
    { href: "/admin/approvals", icon: "✅", label: "Approvals" },
    { href: "/admin/invoices", icon: "💰", label: "Invoices" },
  ];

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { router.push("/admin/login"); return; }

      const { data: adminData, error: adminError } = await supabase
        .from("admins").select("*").eq("user_id", user.id).single();
      if (adminError || !adminData) { router.push("/admin/login"); return; }
      setAdmin(adminData);

      // Load pending drivers
      const { data: drivers } = await supabase
        .from("drivers")
        .select("*")
        .eq("is_approved", false)
        .order("created_at", { ascending: false });
      setPendingDrivers(drivers || []);

      // Load pending clients
      const { data: clients } = await supabase
        .from("clients")
        .select("*")
        .eq("is_approved", false)
        .order("created_at", { ascending: false });
      setPendingClients(clients || []);

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveDriver(driverId) {
    try {
      const { error } = await supabase
        .from("drivers")
        .update({ 
          is_approved: true, 
          approved_at: new Date().toISOString(),
          approved_by: admin.id 
        })
        .eq("id", driverId);
      
      if (error) throw error;
      alert("✅ Driver approved successfully!");
      loadData();
    } catch (error) {
      alert("Failed to approve driver: " + error.message);
    }
  }

  async function handleRejectDriver(driverId) {
    if (!confirm("Are you sure you want to reject this driver?")) return;
    try {
      const { error } = await supabase
        .from("drivers")
        .delete()
        .eq("id", driverId);
      
      if (error) throw error;
      alert("Driver rejected and removed.");
      loadData();
    } catch (error) {
      alert("Failed to reject driver: " + error.message);
    }
  }

  async function handleApproveClient(clientId) {
    try {
      const { error } = await supabase
        .from("clients")
        .update({ 
          is_approved: true, 
          approved_at: new Date().toISOString(),
          approved_by: admin.id 
        })
        .eq("id", clientId);
      
      if (error) throw error;
      alert("✅ Client approved successfully!");
      loadData();
    } catch (error) {
      alert("Failed to approve client: " + error.message);
    }
  }

  async function handleRejectClient(clientId) {
    if (!confirm("Are you sure you want to reject this client?")) return;
    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientId);
      
      if (error) throw error;
      alert("Client rejected and removed.");
      loadData();
    } catch (error) {
      alert("Failed to reject client: " + error.message);
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
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/bus-icon.png" alt="Mac Track" width={40} height={40} className="object-contain" />
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-red-600">Mac Track</h1>
                <p className="text-xs text-gray-500">Admin Portal</p>
              </div>
            </div>
            <HamburgerMenu items={menuItems} onLogout={handleLogout} userName={admin?.name} userRole="Admin" />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Account Approvals ✅</h2>
          <p className="text-gray-600">Approve or reject new driver and client registrations</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm opacity-90">Pending Drivers</p>
            <p className="text-4xl font-black">{pendingDrivers.length}</p>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm opacity-90">Pending Clients</p>
            <p className="text-4xl font-black">{pendingClients.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("drivers")}
            className={`px-6 py-3 rounded-xl font-bold transition ${
              activeTab === "drivers"
                ? "bg-red-600 text-white shadow-lg"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-red-600"
            }`}
          >
            🚐 Drivers ({pendingDrivers.length})
          </button>
          <button
            onClick={() => setActiveTab("clients")}
            className={`px-6 py-3 rounded-xl font-bold transition ${
              activeTab === "clients"
                ? "bg-red-600 text-white shadow-lg"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-red-600"
            }`}
          >
            👥 Clients ({pendingClients.length})
          </button>
        </div>

        {/* Pending Drivers */}
        {activeTab === "drivers" && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {pendingDrivers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">✅</div>
                <p className="text-gray-500 text-lg font-semibold">No pending driver approvals</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {pendingDrivers.map((driver) => (
                  <div key={driver.id} className="p-6 hover:bg-gray-50 transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">{driver.name}</h3>
                        <p className="text-sm text-gray-600">{driver.email}</p>
                        <p className="text-sm text-gray-600">{driver.phone}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                            {driver.vehicle_type || "No vehicle"}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">
                            {driver.vehicle_registration || "No rego"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Registered: {new Date(driver.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveDriver(driver.id)}
                          className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-green-700 transition shadow-lg"
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => handleRejectDriver(driver.id)}
                          className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition shadow-lg"
                        >
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Clients */}
        {activeTab === "clients" && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {pendingClients.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">✅</div>
                <p className="text-gray-500 text-lg font-semibold">No pending client approvals</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {pendingClients.map((client) => (
                  <div key={client.id} className="p-6 hover:bg-gray-50 transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">{client.name}</h3>
                        <p className="text-sm text-gray-600">{client.email}</p>
                        <p className="text-sm text-gray-600">{client.phone}</p>
                        {client.company && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold mt-2 inline-block">
                            {client.company}
                          </span>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          Registered: {new Date(client.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveClient(client.id)}
                          className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-green-700 transition shadow-lg"
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => handleRejectClient(client.id)}
                          className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition shadow-lg"
                        >
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
