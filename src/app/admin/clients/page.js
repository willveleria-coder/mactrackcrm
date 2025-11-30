"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function AdminClientsPage() {
  const [admin, setAdmin] = useState(null);
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [searchQuery, clients]);

  async function loadClients() {
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

      const { data: clientsData } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      setClients(clientsData || []);
      setFilteredClients(clientsData || []);
    } catch (error) {
      console.error("Error loading clients:", error);
    } finally {
      setLoading(false);
    }
  }

  function filterClients() {
    if (!searchQuery) {
      setFilteredClients(clients);
      return;
    }

    const filtered = clients.filter(client =>
      client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setFilteredClients(filtered);
  }

  async function handleToggleActive(clientId, currentStatus) {
    try {
      const { error } = await supabase
        .from("clients")
        .update({ is_active: !currentStatus })
        .eq("id", clientId);

      if (error) throw error;

      loadClients();
      alert(`✅ Client ${!currentStatus ? "activated" : "deactivated"} successfully!`);
    } catch (error) {
      alert("Failed to update client: " + error.message);
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
            <p className="text-xs text-gray-500">Admin Portal</p>
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
            <Link href="/admin/clients" className="text-sm font-semibold text-[#ba0606] border-b-2 border-[#ba0606]">
              Clients
            </Link>
            <Link href="/admin/drivers" className="text-sm font-semibold text-gray-700 hover:text-[#ba0606]">
              Drivers
            </Link>
            <Link href="/admin/tracking" className="text-sm font-semibold text-gray-700 hover:text-[#ba0606]">
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
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Manage Clients</h2>
          <p className="text-gray-600">View and manage customer accounts</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="🔍 Search by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ba0606] focus:border-transparent"
            />
            <button 
              onClick={loadClients}
              className="px-6 py-3 bg-[#ba0606] text-white rounded-lg font-semibold hover:bg-[#8f0404] transition"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {filteredClients.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">👥 No clients found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Name</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Email</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Phone</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Company</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Joined</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Status</th>
                    <th className="text-center py-4 px-6 text-xs font-bold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 transition">
                      <td className="py-4 px-6 text-sm font-semibold text-gray-900">{client.name}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{client.email}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{client.phone || "—"}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{client.company_name || "—"}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {new Date(client.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          client.is_active 
                            ? "bg-green-100 text-green-700" 
                            : "bg-red-100 text-red-700"
                        }`}>
                          {client.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleToggleActive(client.id, client.is_active)}
                            className={`px-3 py-1 rounded text-xs font-semibold ${
                              client.is_active
                                ? "bg-red-500 text-white hover:bg-red-600"
                                : "bg-green-500 text-white hover:bg-green-600"
                            }`}
                          >
                            {client.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {clients.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">
                Showing <span className="font-bold text-gray-900">{filteredClients.length}</span> of{" "}
                <span className="font-bold text-gray-900">{clients.length}</span> clients
              </span>
              <span className="text-gray-600">
                Active: <span className="font-bold text-green-600">{clients.filter(c => c.is_active).length}</span>
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}