"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import HamburgerMenu from "@/components/HamburgerMenu";

export default function AdminDriversPage() {
  const [admin, setAdmin] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [filteredDrivers, setFilteredDrivers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewDriverDetails, setViewDriverDetails] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverOrders, setDriverOrders] = useState([]);
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
  ];

  useEffect(() => {
    loadDrivers();
  }, []);

  useEffect(() => {
    filterDrivers();
  }, [searchQuery, drivers]);

  async function loadDrivers() {
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

      // Only load active drivers
      const { data: driversData } = await supabase
        .from("drivers")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      setDrivers(driversData || []);
      setFilteredDrivers(driversData || []);
    } catch (error) {
      console.error("Error loading drivers:", error);
    } finally {
      setLoading(false);
    }
  }

  function filterDrivers() {
    if (!searchQuery) {
      setFilteredDrivers(drivers);
      return;
    }

    const filtered = drivers.filter(driver =>
      driver.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.vehicle_plate?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setFilteredDrivers(filtered);
  }

  async function handleViewDriver(driver) {
    setSelectedDriver(driver);
    
    // Load driver's orders
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .eq("driver_id", driver.id)
      .order("created_at", { ascending: false });
    
    setDriverOrders(ordersData || []);
    setViewDriverDetails(driver);
  }

  async function handleDeactivateDriver(driverId) {
    try {
      const { error } = await supabase
        .from("drivers")
        .update({ is_active: false })
        .eq("id", driverId);

      if (error) throw error;

      // Remove from list (make disappear)
      setDrivers(prev => prev.filter(d => d.id !== driverId));
      setFilteredDrivers(prev => prev.filter(d => d.id !== driverId));

      if (viewDriverDetails) {
        setViewDriverDetails(null);
      }

      alert("✅ Driver deactivated successfully!");
    } catch (error) {
      alert("Failed to deactivate driver: " + error.message);
    }
  }

  async function handleDeleteDriver() {
    if (!selectedDriver) return;

    try {
      // First, check if driver has any orders
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .eq("driver_id", selectedDriver.id);

      if (orders && orders.length > 0) {
        alert(`⚠️ Cannot delete driver with ${orders.length} existing orders. Please deactivate instead.`);
        setShowDeleteModal(false);
        return;
      }

      // Delete the driver
      const { error } = await supabase
        .from("drivers")
        .delete()
        .eq("id", selectedDriver.id);

      if (error) throw error;

      // Remove from list
      setDrivers(prev => prev.filter(d => d.id !== selectedDriver.id));
      setFilteredDrivers(prev => prev.filter(d => d.id !== selectedDriver.id));

      alert("✅ Driver deleted successfully!");
      setShowDeleteModal(false);
      setSelectedDriver(null);
      setViewDriverDetails(null);
    } catch (error) {
      alert("Failed to delete driver: " + error.message);
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
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Manage Drivers 🚐</h2>
          <p className="text-sm sm:text-base text-gray-600">View, manage, and deactivate driver accounts</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="🔍 Search by name, email, or license plate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
            />
            <button 
              onClick={loadDrivers}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Drivers List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          {filteredDrivers.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🚐</div>
              <p className="text-gray-500 text-lg font-semibold">No drivers found</p>
              <p className="text-gray-400 text-sm mt-2">
                {drivers.length === 0 ? "No active drivers" : "Try adjusting your search"}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="block lg:hidden divide-y divide-gray-100">
                {filteredDrivers.map((driver) => (
                  <div key={driver.id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <button
                          onClick={() => handleViewDriver(driver)}
                          className="text-sm font-bold text-gray-900 hover:text-red-600"
                        >
                          {driver.name}
                        </button>
                        <p className="text-xs text-gray-500">{driver.email}</p>
                        <p className="text-xs text-gray-600 mt-1">🚗 {driver.vehicle_type || 'N/A'}</p>
                        {driver.vehicle_plate && (
                          <p className="text-xs font-mono text-gray-600">{driver.vehicle_plate}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          driver.is_on_duty 
                            ? "bg-green-100 text-green-700" 
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {driver.is_on_duty ? "On Duty" : "Off Duty"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDriver(driver)}
                        className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600"
                      >
                        👁️ View
                      </button>
                      <button
                        onClick={() => handleDeactivateDriver(driver.id)}
                        className="flex-1 py-2 bg-yellow-500 text-white rounded-lg text-xs font-bold hover:bg-yellow-600"
                      >
                        ⏸️ Deactivate
                      </button>
                      <button
                        onClick={() => {
                          setSelectedDriver(driver);
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
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Vehicle</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Plate</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Duty</th>
                      <th className="text-center py-4 px-6 text-xs font-bold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredDrivers.map((driver) => (
                      <tr key={driver.id} className="hover:bg-gray-50 transition">
                        <td className="py-4 px-6">
                          <button
                            onClick={() => handleViewDriver(driver)}
                            className="text-sm font-bold text-gray-900 hover:text-red-600"
                          >
                            {driver.name}
                          </button>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600">{driver.email}</td>
                        <td className="py-4 px-6 text-sm text-gray-600">{driver.phone || "—"}</td>
                        <td className="py-4 px-6 text-sm text-gray-600 capitalize">{driver.vehicle_type || "—"}</td>
                        <td className="py-4 px-6 text-sm font-mono text-gray-600">{driver.vehicle_plate || "—"}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                            driver.is_on_duty 
                              ? "bg-green-100 text-green-700" 
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {driver.is_on_duty ? "On Duty" : "Off Duty"}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleViewDriver(driver)}
                              className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600"
                            >
                              👁️ View
                            </button>
                            <button
                              onClick={() => handleDeactivateDriver(driver.id)}
                              className="px-3 py-1 bg-yellow-500 text-white rounded-lg text-xs font-bold hover:bg-yellow-600"
                            >
                              ⏸️ Deactivate
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDriver(driver);
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
        {drivers.length > 0 && (
          <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm">
              <span className="text-gray-600">
                Showing <span className="font-bold text-gray-900">{filteredDrivers.length}</span> active driver{filteredDrivers.length !== 1 ? 's' : ''}
              </span>
              <div className="flex gap-4">
                <span className="text-gray-600">
                  On Duty: <span className="font-bold text-green-600">{drivers.filter(d => d.is_on_duty).length}</span>
                </span>
                <span className="text-gray-600">
                  Off Duty: <span className="font-bold text-gray-600">{drivers.filter(d => !d.is_on_duty).length}</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedDriver && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 sm:p-8 z-50 w-11/12 max-w-md">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Delete Driver?</h3>
              <p className="text-gray-600">
                Are you sure you want to permanently delete <span className="font-bold">{selectedDriver.name}</span>?
              </p>
              <p className="text-sm text-red-600 mt-2">
                This action cannot be undone!
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDriver}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* Driver Details Modal */}
      {viewDriverDetails && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto"
            onClick={() => setViewDriverDetails(null)}
          />
          <div className="fixed inset-4 sm:top-8 sm:left-1/2 sm:-translate-x-1/2 sm:inset-auto bg-white rounded-2xl shadow-2xl z-50 sm:w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black mb-1">Driver Details</h3>
                <p className="text-sm opacity-90">{viewDriverDetails.name}</p>
              </div>
              <button
                onClick={() => setViewDriverDetails(null)}
                className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-gray-700 mb-3">📞 Contact Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-semibold">{viewDriverDetails.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-semibold">{viewDriverDetails.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-blue-700 mb-3">🚐 Vehicle Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vehicle Type:</span>
                    <span className="font-semibold capitalize">{viewDriverDetails.vehicle_type || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Plate:</span>
                    <span className="font-semibold">{viewDriverDetails.vehicle_plate || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Registration:</span>
                    <span className="font-semibold">{viewDriverDetails.vehicle_registration || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* License & Insurance */}
              <div className="bg-green-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-green-700 mb-3">📋 License & Insurance</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">License Number:</span>
                    <span className="font-semibold">{viewDriverDetails.license_number || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Insurance Type:</span>
                    <span className="font-semibold">{viewDriverDetails.insurance_type || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-gray-700 mb-3">⏰ Current Status</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${viewDriverDetails.is_on_duty ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className="font-semibold">{viewDriverDetails.is_on_duty ? 'On Duty' : 'Off Duty'}</span>
                  </div>
                </div>
              </div>

              {/* Order Stats */}
              {driverOrders.length > 0 && (
                <div className="bg-purple-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-purple-900 mb-3">📦 Order Statistics</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Total Orders</p>
                      <p className="text-2xl font-black text-gray-900">{driverOrders.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Completed</p>
                      <p className="text-2xl font-black text-gray-900">
                        {driverOrders.filter(o => o.status === 'delivered').length}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Details */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-gray-700 mb-3">📊 Account Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-semibold">{new Date(viewDriverDetails.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Driver ID:</span>
                    <span className="font-mono text-xs">{viewDriverDetails.id.slice(0, 8)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {viewDriverDetails.notes && (
                <div className="bg-yellow-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-2">📝 Notes</h4>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{viewDriverDetails.notes}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-3">
                <button
                  onClick={() => handleDeactivateDriver(viewDriverDetails.id)}
                  className="flex-1 py-3 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 transition"
                >
                  ⏸️ Deactivate
                </button>
                <button
                  onClick={() => {
                    setSelectedDriver(viewDriverDetails);
                    setShowDeleteModal(true);
                  }}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
                >
                  🗑️ Delete
                </button>
              </div>
              <button
                onClick={() => setViewDriverDetails(null)}
                className="w-full mt-3 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}