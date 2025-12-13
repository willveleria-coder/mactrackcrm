"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import HamburgerMenu from "@/components/HamburgerMenu";

export default function AdminClientsPage() {
  const [admin, setAdmin] = useState(null);
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [clientOrders, setClientOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const menuItems = [
    { href: "/admin/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/admin/orders", icon: "📦", label: "Orders" },
    { href: "/admin/orders/create", icon: "➕", label: "Create Order" },
    { href: "/admin/clients", icon: "👥", label: "Clients" },
    { href: "/admin/drivers", icon: "🚐", label: "Drivers" },
    { href: "/admin/analytics", icon: "📊", label: "Analytics" },
    { href: "/admin/invoices", icon: "💰", label: "Invoices" },
  ];

  useEffect(() => {
    loadClients();
  }, [showInactive]);

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

      let query = supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      // If showing inactive, get all clients
      // Otherwise, get active clients (is_active = true OR is_active is null for legacy)
      if (!showInactive) {
        query = query.or("is_active.eq.true,is_active.is.null");
      }

      const { data: clientsData, error: clientsError } = await query;

      if (clientsError) {
        console.error("Error loading clients:", clientsError);
      }

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
      client.company?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setFilteredClients(filtered);
  }

  async function handleViewClient(client) {
    setSelectedClient(client);
    
    // Load client's orders
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });
    
    setClientOrders(ordersData || []);
    setShowDetailsModal(true);
  }

  async function handleDeactivateClient(clientId) {
    try {
      const { error } = await supabase
        .from("clients")
        .update({ is_active: false })
        .eq("id", clientId);

      if (error) throw error;

      // Refresh list
      loadClients();
      alert("✅ Client deactivated successfully!");
    } catch (error) {
      alert("Failed to deactivate client: " + error.message);
    }
  }

  async function handleReactivateClient(clientId) {
    try {
      const { error } = await supabase
        .from("clients")
        .update({ is_active: true })
        .eq("id", clientId);

      if (error) throw error;

      // Refresh list
      loadClients();
      alert("✅ Client reactivated successfully!");
    } catch (error) {
      alert("Failed to reactivate client: " + error.message);
    }
  }

  async function handleDeleteClient() {
    if (!selectedClient) return;

    try {
      // First, check if client has any orders
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .eq("client_id", selectedClient.id);

      if (orders && orders.length > 0) {
        alert(`⚠️ Cannot delete client with ${orders.length} existing orders. Please deactivate instead.`);
        setShowDeleteModal(false);
        return;
      }

      // Delete the client
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", selectedClient.id);

      if (error) throw error;

      // Remove from list
      setClients(prev => prev.filter(c => c.id !== selectedClient.id));
      setFilteredClients(prev => prev.filter(c => c.id !== selectedClient.id));

      alert("✅ Client deleted successfully!");
      setShowDeleteModal(false);
      setSelectedClient(null);
    } catch (error) {
      alert("Failed to delete client: " + error.message);
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Manage Clients 👥</h2>
          <p className="text-sm sm:text-base text-gray-600">View, manage, and deactivate customer accounts</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="🔍 Search by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
            />
            <label className="flex items-center gap-2 px-4 py-3 bg-gray-100 rounded-xl cursor-pointer hover:bg-gray-200 transition">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-semibold text-gray-700">Show Inactive</span>
            </label>
            <button 
              onClick={loadClients}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Clients List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          {filteredClients.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-gray-500 text-lg font-semibold">No clients found</p>
              <p className="text-gray-400 text-sm mt-2">
                {clients.length === 0 ? "No clients in database" : "Try adjusting your search"}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="block lg:hidden divide-y divide-gray-100">
                {filteredClients.map((client) => (
                  <div key={client.id} className={`p-4 ${client.is_active === false ? 'bg-gray-50 opacity-75' : ''}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewClient(client)}
                            className="text-sm font-bold text-gray-900 hover:text-red-600"
                          >
                            {client.name}
                          </button>
                          {client.is_active === false && (
                            <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">Inactive</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{client.email}</p>
                        {client.company && (
                          <p className="text-xs text-gray-600 mt-1">🏢 {client.company}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewClient(client)}
                        className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600"
                      >
                        👁️ View
                      </button>
                      {client.is_active === false ? (
                        <button
                          onClick={() => handleReactivateClient(client.id)}
                          className="flex-1 py-2 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600"
                        >
                          ✅ Reactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeactivateClient(client.id)}
                          className="flex-1 py-2 bg-yellow-500 text-white rounded-lg text-xs font-bold hover:bg-yellow-600"
                        >
                          ⏸️ Deactivate
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedClient(client);
                          setShowDeleteModal(true);
                        }}
                        className="flex-1 py-2 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Name</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Email</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Phone</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Company</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Status</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Joined</th>
                      <th className="text-center py-4 px-6 text-xs font-bold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredClients.map((client) => (
                      <tr key={client.id} className={`hover:bg-gray-50 transition ${client.is_active === false ? 'bg-gray-50 opacity-75' : ''}`}>
                        <td className="py-4 px-6">
                          <button
                            onClick={() => handleViewClient(client)}
                            className="text-sm font-bold text-gray-900 hover:text-red-600"
                          >
                            {client.name}
                          </button>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600">{client.email}</td>
                        <td className="py-4 px-6 text-sm text-gray-600">{client.phone || "—"}</td>
                        <td className="py-4 px-6 text-sm text-gray-600">{client.company || "—"}</td>
                        <td className="py-4 px-6">
                          {client.is_active === false ? (
                            <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs font-bold rounded-full">Inactive</span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Active</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600">
                          {new Date(client.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleViewClient(client)}
                              className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600"
                            >
                              👁️ View
                            </button>
                            {client.is_active === false ? (
                              <button
                                onClick={() => handleReactivateClient(client.id)}
                                className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600"
                              >
                                ✅ Reactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeactivateClient(client.id)}
                                className="px-3 py-1 bg-yellow-500 text-white rounded-lg text-xs font-bold hover:bg-yellow-600"
                              >
                                ⏸️ Deactivate
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedClient(client);
                                setShowDeleteModal(true);
                              }}
                              className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Summary */}
        {clients.length > 0 && (
          <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="text-center text-sm text-gray-600">
              Showing <span className="font-bold text-gray-900">{filteredClients.length}</span> client{filteredClients.length !== 1 ? 's' : ''}
              {showInactive && ' (including inactive)'}
            </div>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">⚠️ Delete Client?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to permanently delete <span className="font-bold">{selectedClient.name}</span>? 
              This action cannot be undone.
            </p>
            <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg mb-6">
              💡 Tip: Consider deactivating instead to preserve order history.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedClient(null);
                }}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteClient}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Details Modal */}
      {showDetailsModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedClient.name}</h3>
                  <p className="text-gray-500">{selectedClient.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedClient(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Client Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Phone</p>
                  <p className="font-bold">{selectedClient.phone || "—"}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Company</p>
                  <p className="font-bold">{selectedClient.company || "—"}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <p className="font-bold">
                    {selectedClient.is_active === false ? (
                      <span className="text-gray-500">Inactive</span>
                    ) : (
                      <span className="text-green-600">Active</span>
                    )}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Joined</p>
                  <p className="font-bold">{new Date(selectedClient.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Orders Summary */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-3">Order History ({clientOrders.length})</h4>
                {clientOrders.length === 0 ? (
                  <p className="text-gray-500 text-sm">No orders yet</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {clientOrders.slice(0, 10).map(order => (
                      <div key={order.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <div>
                          <p className="text-sm font-bold">#{order.id.slice(0, 8)}</p>
                          <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-600">${order.price?.toFixed(2) || '0.00'}</p>
                          <p className="text-xs text-gray-500 capitalize">{order.status}</p>
                        </div>
                      </div>
                    ))}
                    {clientOrders.length > 10 && (
                      <p className="text-sm text-gray-500 text-center pt-2">
                        + {clientOrders.length - 10} more orders
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              {selectedClient.is_active === false ? (
                <button
                  onClick={() => {
                    handleReactivateClient(selectedClient.id);
                    setShowDetailsModal(false);
                  }}
                  className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition"
                >
                  ✅ Reactivate Client
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleDeactivateClient(selectedClient.id);
                    setShowDetailsModal(false);
                  }}
                  className="flex-1 py-3 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 transition"
                >
                  ⏸️ Deactivate Client
                </button>
              )}
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedClient(null);
                }}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}