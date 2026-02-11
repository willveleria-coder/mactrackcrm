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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [clientOrders, setClientOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const serviceTypes = [
    { key: "standard", label: "⏰ Standard (3-5 Hours)", defaultMultiplier: 1.0 },
    { key: "same_day", label: "⚡ Same Day (12 Hours)", defaultMultiplier: 1.0 },
    { key: "next_day", label: "📅 Next Day", defaultMultiplier: 0.8 },
    { key: "local_overnight", label: "🌙 Local/Overnight", defaultMultiplier: 0.8 },
    { key: "emergency", label: "🚨 Emergency (1-2 Hours)", defaultMultiplier: 1.45 },
    { key: "vip", label: "⭐ VIP (2-3 Hours)", defaultMultiplier: 1.25 },
    { key: "priority", label: "🔥 Priority (1-1.5 Hours)", defaultMultiplier: 1.7 },
    { key: "scheduled", label: "📆 Scheduled", defaultMultiplier: 0.8 },
    { key: "after_hours", label: "🌃 After Hours/Weekend", defaultMultiplier: 1.0 },
  ];

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
      const { data: { session } } = await supabase.auth.getSession();
      
      const user = session?.user;
      if (!session) {
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
    
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });
    
    setClientOrders(ordersData || []);
    setShowDetailsModal(true);
  }

  function handleEditClient(client) {
    setSelectedClient(client);
    
    // Initialize service rates from existing data or defaults
    const existingRates = client.custom_service_rates || {};
    const serviceRates = {};
    serviceTypes.forEach(service => {
      serviceRates[service.key] = {
        enabled: existingRates[service.key]?.enabled !== false,
        customPrice: existingRates[service.key]?.customPrice || '',
        discountPercent: existingRates[service.key]?.discountPercent || '',
      };
    });

    setEditFormData({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      company: client.company || '',
      discount_percent: client.discount_percent || 0,
      custom_fuel_levy_percent: client.custom_fuel_levy_percent || '',
      pricing_notes: client.pricing_notes || '',
      is_contract_client: client.is_contract_client || false,
      bypass_payment: client.bypass_payment || false,
      custom_service_rates: serviceRates,
    });
    setShowEditModal(true);
  }

  function handleServiceRateChange(serviceKey, field, value) {
    setEditFormData(prev => ({
      ...prev,
      custom_service_rates: {
        ...prev.custom_service_rates,
        [serviceKey]: {
          ...prev.custom_service_rates[serviceKey],
          [field]: field === 'enabled' ? value : value,
        }
      }
    }));
  }

  async function handleSaveEdit() {
    if (!selectedClient) return;
    setSaving(true);

    try {
      // Clean up service rates - only save non-default values
      const cleanedServiceRates = {};
      let hasCustomRates = false;
      
      Object.entries(editFormData.custom_service_rates).forEach(([key, rate]) => {
        if (!rate.enabled || rate.customPrice || rate.discountPercent) {
          cleanedServiceRates[key] = {
            enabled: rate.enabled,
            customPrice: rate.customPrice ? parseFloat(rate.customPrice) : null,
            discountPercent: rate.discountPercent ? parseFloat(rate.discountPercent) : null,
          };
          hasCustomRates = true;
        }
      });

      const updateData = {
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone || null,
        company: editFormData.company || null,
        discount_percent: parseFloat(editFormData.discount_percent) || 0,
        custom_fuel_levy_percent: editFormData.custom_fuel_levy_percent ? parseFloat(editFormData.custom_fuel_levy_percent) : null,
        pricing_notes: editFormData.pricing_notes || null,
        is_contract_client: editFormData.is_contract_client,
        bypass_payment: editFormData.bypass_payment,
        custom_service_rates: hasCustomRates ? cleanedServiceRates : null,
      };

      const { error } = await supabase
        .from("clients")
        .update(updateData)
        .eq("id", selectedClient.id);

      if (error) throw error;

      alert("✅ Client updated successfully!");
      setShowEditModal(false);
      setSelectedClient(null);
      await loadClients();
    } catch (error) {
      alert("Failed to update client: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivateClient(clientId) {
    try {
      const { error } = await supabase
        .from("clients")
        .update({ is_active: false })
        .eq("id", clientId);

      if (error) throw error;

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

      loadClients();
      alert("✅ Client reactivated successfully!");
    } catch (error) {
      alert("Failed to reactivate client: " + error.message);
    }
  }

  async function handleDeleteClient() {
    if (!selectedClient) return;

    try {
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .eq("client_id", selectedClient.id);

      if (orders && orders.length > 0) {
        alert(`⚠️ Cannot delete client with ${orders.length} existing orders. Please deactivate instead.`);
        setShowDeleteModal(false);
        return;
      }

      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", selectedClient.id);

      if (error) throw error;

      setClients(prev => prev.filter(c => c.id !== selectedClient.id));
      setFilteredClients(prev => prev.filter(c => c.id !== selectedClient.id));

      alert("✅ Client deleted successfully!");
      setShowDeleteModal(false);
      setSelectedClient(null);
    } catch (error) {
      alert("Failed to delete client: " + error.message);
    }
  }

  async function toggleBypassPayment(clientId, currentValue) {
    try {
      const { error } = await supabase
        .from("clients")
        .update({ bypass_payment: !currentValue })
        .eq("id", clientId);
      if (error) throw error;
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, bypass_payment: !currentValue } : c));
      setFilteredClients(prev => prev.map(c => c.id === clientId ? { ...c, bypass_payment: !currentValue } : c));
    } catch (error) {
      alert("Failed to update: " + error.message);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  function getCustomServiceCount(client) {
    if (!client.custom_service_rates) return 0;
    return Object.values(client.custom_service_rates).filter(r => 
      !r.enabled || r.customPrice || r.discountPercent
    ).length;
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
          <p className="text-sm sm:text-base text-gray-600">View, manage, and set custom pricing for customers</p>
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleViewClient(client)}
                            className="text-sm font-bold text-gray-900 hover:text-red-600"
                          >
                            {client.name}
                          </button>
                          {client.is_contract_client && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-bold">⭐ Contract</span>
                          )}
                          {client.discount_percent > 0 && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-bold">{client.discount_percent}% OFF</span>
                          )}
                          {getCustomServiceCount(client) > 0 && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-bold">🎯 {getCustomServiceCount(client)} custom</span>
                          )}
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
                    
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleViewClient(client)}
                        className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600"
                      >
                        👁️ View
                      </button>
                      <button
                        onClick={() => handleEditClient(client)}
                        className="flex-1 py-2 bg-yellow-500 text-white rounded-lg text-xs font-bold hover:bg-yellow-600"
                      >
                        ✏️ Edit
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
                          className="flex-1 py-2 bg-gray-500 text-white rounded-lg text-xs font-bold hover:bg-gray-600"
                        >
                          ⏸️ Deactivate
                        </button>
                      )}
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
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Company</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Pricing</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Status</th>
                      <th className="text-center py-4 px-6 text-xs font-bold text-gray-600 uppercase">Invoice Only</th>
                      <th className="text-center py-4 px-6 text-xs font-bold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredClients.map((client) => (
                      <tr key={client.id} className={`hover:bg-gray-50 transition ${client.is_active === false ? 'bg-gray-50 opacity-75' : ''}`}>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewClient(client)}
                              className="text-sm font-bold text-gray-900 hover:text-red-600"
                            >
                              {client.name}
                            </button>
                            {client.is_contract_client && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-bold">⭐</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600">{client.email}</td>
                        <td className="py-4 px-6 text-sm text-gray-600">{client.company || "—"}</td>
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1">
                            {client.discount_percent > 0 && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold">
                                {client.discount_percent}% OFF
                              </span>
                            )}
                            {client.custom_fuel_levy_percent && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-bold">
                                Fuel: {client.custom_fuel_levy_percent}%
                              </span>
                            )}
                            {getCustomServiceCount(client) > 0 && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-bold">
                                🎯 {getCustomServiceCount(client)} services
                              </span>
                            )}
                            {!client.discount_percent && !client.custom_fuel_levy_percent && getCustomServiceCount(client) === 0 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                                Standard
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {client.is_active === false ? (
                            <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs font-bold rounded-full">Inactive</span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Active</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => toggleBypassPayment(client.id, client.bypass_payment)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition ${client.bypass_payment ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}
                          >
                            {client.bypass_payment ? "✓ Yes" : "No"}
                          </button>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleViewClient(client)}
                              className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600"
                            >
                              👁️
                            </button>
                            <button
                              onClick={() => handleEditClient(client)}
                              className="px-3 py-1 bg-yellow-500 text-white rounded-lg text-xs font-bold hover:bg-yellow-600"
                            >
                              ✏️
                            </button>
                            {client.is_active === false ? (
                              <button
                                onClick={() => handleReactivateClient(client.id)}
                                className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600"
                              >
                                ✅
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeactivateClient(client.id)}
                                className="px-3 py-1 bg-gray-500 text-white rounded-lg text-xs font-bold hover:bg-gray-600"
                              >
                                ⏸️
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedClient(client);
                                setShowDeleteModal(true);
                              }}
                              className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600"
                            >
                              🗑️
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
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
              <span>
                Total: <span className="font-bold text-gray-900">{filteredClients.length}</span> clients
              </span>
              <span>
                Contract: <span className="font-bold text-purple-600">{filteredClients.filter(c => c.is_contract_client).length}</span>
              </span>
              <span>
                With Discount: <span className="font-bold text-green-600">{filteredClients.filter(c => c.discount_percent > 0).length}</span>
              </span>
              <span>
                Custom Services: <span className="font-bold text-orange-600">{filteredClients.filter(c => getCustomServiceCount(c) > 0).length}</span>
              </span>
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-2xl font-bold text-gray-900">{selectedClient.name}</h3>
                    {selectedClient.is_contract_client && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full font-bold">⭐ Contract Client</span>
                    )}
                  </div>
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

              {/* Pricing Info */}
              <div className="bg-green-50 rounded-xl p-4">
                <h4 className="text-lg font-bold text-green-900 mb-3">💰 Custom Pricing</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Global Discount</p>
                    <p className="font-bold text-green-700">
                      {selectedClient.discount_percent > 0 ? `${selectedClient.discount_percent}% OFF` : 'None'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Custom Fuel Levy</p>
                    <p className="font-bold text-blue-700">
                      {selectedClient.custom_fuel_levy_percent ? `${selectedClient.custom_fuel_levy_percent}%` : 'Standard (10%)'}
                    </p>
                  </div>
                </div>
                
                {/* Custom Service Rates */}
                {selectedClient.custom_service_rates && Object.keys(selectedClient.custom_service_rates).length > 0 && (
                  <div className="mt-4 p-3 bg-white rounded-lg">
                    <p className="text-xs text-gray-500 mb-2 font-bold">Custom Service Rates</p>
                    <div className="space-y-2">
                      {Object.entries(selectedClient.custom_service_rates).map(([key, rate]) => {
                        const service = serviceTypes.find(s => s.key === key);
                        if (!service) return null;
                        return (
                          <div key={key} className="flex justify-between items-center text-sm">
                            <span className={!rate.enabled ? 'text-gray-400 line-through' : ''}>
                              {service.label}
                            </span>
                            <div className="flex gap-2">
                              {!rate.enabled && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">Disabled</span>
                              )}
                              {rate.customPrice && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">${rate.customPrice} flat</span>
                              )}
                              {rate.discountPercent && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{rate.discountPercent}% off</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedClient.pricing_notes && (
                  <div className="mt-3 p-3 bg-white rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Pricing Notes</p>
                    <p className="text-sm text-gray-700">{selectedClient.pricing_notes}</p>
                  </div>
                )}
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
                          <p className="text-sm font-bold">#{order.order_number || order.id.slice(0, 8)}</p>
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
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  handleEditClient(selectedClient);
                }}
                className="flex-1 py-3 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 transition"
              >
                ✏️ Edit Client
              </button>
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

      {/* Edit Client Modal */}
      {showEditModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-6 flex justify-between items-start sticky top-0 z-10">
              <div>
                <h3 className="text-2xl font-black">Edit Client</h3>
                <p className="text-sm opacity-90">{selectedClient.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedClient(null);
                }}
                className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-bold text-gray-900 mb-3">👤 Basic Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Company</label>
                    <input
                      type="text"
                      value={editFormData.company}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, company: e.target.value }))}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Global Pricing Section */}
              <div className="bg-green-50 rounded-xl p-4">
                <h4 className="font-bold text-green-900 mb-3">💰 Global Pricing</h4>
                
                <div className="mb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.is_contract_client}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, is_contract_client: e.target.checked }))}
                      className="w-5 h-5 rounded"
                    />
                    <span className="font-bold text-gray-900">⭐ Contract Client</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-8">Mark as contract client with special pricing</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Global Discount %</label>
                    <input
                      type="number"
                      value={editFormData.discount_percent}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, discount_percent: e.target.value }))}
                      min="0"
                      max="100"
                      step="0.5"
                      placeholder="0"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl"
                    />
                    <p className="text-xs text-gray-500 mt-1">Applied to all services</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Custom Fuel Levy %</label>
                    <input
                      type="number"
                      value={editFormData.custom_fuel_levy_percent}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, custom_fuel_levy_percent: e.target.value }))}
                      min="0"
                      max="50"
                      step="0.5"
                      placeholder="10 (default)"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty for standard 10%</p>
                  </div>
                </div>
              </div>

              {/* Per-Service Pricing */}
              <div className="bg-orange-50 rounded-xl p-4">
                <h4 className="font-bold text-orange-900 mb-3">🎯 Per-Service Pricing</h4>
                <p className="text-xs text-gray-600 mb-4">Set custom pricing for specific services. Leave empty to use standard rates.</p>
                
                <div className="space-y-3">
                  {serviceTypes.map(service => (
                    <div key={service.key} className={`p-3 rounded-lg border-2 ${editFormData.custom_service_rates?.[service.key]?.enabled === false ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="checkbox"
                            checked={editFormData.custom_service_rates?.[service.key]?.enabled !== false}
                            onChange={(e) => handleServiceRateChange(service.key, 'enabled', e.target.checked)}
                            className="w-4 h-4"
                          />
                          <span className={`text-sm font-semibold ${editFormData.custom_service_rates?.[service.key]?.enabled === false ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {service.label}
                          </span>
                        </div>
                        
                        {editFormData.custom_service_rates?.[service.key]?.enabled !== false && (
                          <div className="flex gap-2">
                            <div>
                              <input
                                type="number"
                                value={editFormData.custom_service_rates?.[service.key]?.customPrice || ''}
                                onChange={(e) => handleServiceRateChange(service.key, 'customPrice', e.target.value)}
                                placeholder="Flat $"
                                min="0"
                                step="0.01"
                                className="w-24 px-2 py-1 border-2 border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <span className="text-gray-400 self-center">or</span>
                            <div>
                              <input
                                type="number"
                                value={editFormData.custom_service_rates?.[service.key]?.discountPercent || ''}
                                onChange={(e) => handleServiceRateChange(service.key, 'discountPercent', e.target.value)}
                                placeholder="% off"
                                min="0"
                                max="100"
                                step="0.5"
                                className="w-20 px-2 py-1 border-2 border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                          </div>
                        )}
                        
                        {editFormData.custom_service_rates?.[service.key]?.enabled === false && (
                          <span className="text-xs text-red-600 font-bold">DISABLED</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Notes */}
              <div className="bg-gray-50 rounded-xl p-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">Pricing Notes</label>
                <textarea
                  value={editFormData.pricing_notes}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, pricing_notes: e.target.value }))}
                  placeholder="Special pricing agreements, contract details, etc."
                  rows={2}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl resize-none"
                />
              </div>

              {/* Payment Settings */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 mb-3">💳 Payment Settings</h4>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.bypass_payment}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, bypass_payment: e.target.checked }))}
                    className="w-5 h-5 rounded"
                  />
                  <span className="font-bold text-gray-900">Invoice Only (Skip Online Payment)</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-8">Client will be invoiced instead of paying online</p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 sticky bottom-0 bg-white">
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "💾 Save Changes"}
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedClient(null);
                }}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}