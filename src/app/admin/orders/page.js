"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import HamburgerMenu from "@/components/HamburgerMenu";

export default function AdminOrdersPage() {
  const [admin, setAdmin] = useState(null);
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [filter, setFilter] = useState("all");
  
  // Advanced filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDriver, setFilterDriver] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [viewOrderDetails, setViewOrderDetails] = useState(null);
  const [viewDriverDetails, setViewDriverDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error("User error:", userError);
        router.push("/admin/login");
        return;
      }

      const { data: adminData, error: adminError } = await supabase
        .from("admins")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (adminError || !adminData) {
        console.error("Admin error:", adminError);
        router.push("/admin/login");
        return;
      }

      setAdmin(adminData);

      // Load orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (ordersError) {
        console.error("Failed to load orders:", ordersError);
        setOrders([]);
      } else {
        // Load clients
        const { data: clientsData } = await supabase
          .from("clients")
          .select("id, name, email, phone");

        setClients(clientsData || []);

        // Load drivers
        const { data: driversDataFull } = await supabase
          .from("drivers")
          .select("*");

        setDrivers(driversDataFull || []);

        // Manually join the data
        const ordersWithDetails = ordersData.map(order => ({
          ...order,
          client: clientsData?.find(c => c.id === order.client_id) || null,
          driver: driversDataFull?.find(d => d.id === order.driver_id) || null
        }));

        console.log("Orders loaded:", ordersWithDetails.length);
        setOrders(ordersWithDetails);
      }

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Advanced filtering logic
  const filteredOrders = orders.filter(order => {
    // Basic filter (all/in_progress/completed/cancelled)
    if (filter === "in_progress" && order.status !== "pending" && order.status !== "active") {
      return false;
    }
    if (filter === "completed" && order.status !== "delivered") {
      return false;
    }
    if (filter === "cancelled" && order.status !== "cancelled") {
      return false;
    }
    
    // Search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesId = order.id.toLowerCase().includes(search);
      const matchesPickup = order.pickup_address.toLowerCase().includes(search);
      const matchesDropoff = order.dropoff_address.toLowerCase().includes(search);
      const matchesClient = order.client?.name.toLowerCase().includes(search);
      
      if (!matchesId && !matchesPickup && !matchesDropoff && !matchesClient) {
        return false;
      }
    }
    
    // Status filter
    if (filterStatus !== 'all' && order.status !== filterStatus) {
      return false;
    }
    
    // Driver filter
    if (filterDriver !== 'all' && order.driver_id !== filterDriver) {
      return false;
    }
    
    // Date range
    if (dateFrom && new Date(order.created_at) < new Date(dateFrom)) {
      return false;
    }
    if (dateTo && new Date(order.created_at) > new Date(dateTo + 'T23:59:59')) {
      return false;
    }
    
    return true;
  }).sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    
    if (sortBy === 'created_at' || sortBy === 'delivered_at') {
      aVal = new Date(aVal || 0);
      bVal = new Date(bVal || 0);
    }
    
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  async function handleAssignDriver(orderId) {
    if (!selectedDriver) {
      alert("Please select a driver first");
      return;
    }

    try {
      const { error } = await supabase
        .from("orders")
        .update({ 
          driver_id: selectedDriver,
          status: "pending",
          driver_status: null
        })
        .eq("id", orderId);

      if (error) throw error;

      alert("✅ Driver assigned successfully!");
      setSelectedOrder(null);
      setSelectedDriver(null);
      loadData();
    } catch (error) {
      console.error("Error assigning driver:", error);
      alert("Failed to assign driver: " + error.message);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  async function handleViewDriver(driverId) {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;

    const driverOrders = orders.filter(o => o.driver_id === driverId);
    const completedOrders = driverOrders.filter(o => o.status === "delivered").length;
    const activeOrders = driverOrders.filter(o => o.status === "pending" || o.status === "active").length;

    setViewDriverDetails({
      ...driver,
      completedOrders,
      activeOrders
    });
  }

  const menuItems = [
    { href: "/admin/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/admin/orders", icon: "📦", label: "Orders" },
    { href: "/admin/clients", icon: "👥", label: "Clients" },
    { href: "/admin/drivers", icon: "🚐", label: "Drivers" },
    { href: "/admin/analytics", icon: "📊", label: "Analytics" },
    { href: "/admin/invoices", icon: "💰", label: "Invoices" },
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
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:inline">👋 {admin?.name || 'Admin'}</span>
              <HamburgerMenu
                items={menuItems}
                onLogout={handleLogout}
                userName={admin?.name || 'Admin'}
                userRole="Admin"
              />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Order Management</h2>
          <p className="text-gray-600">View and manage all delivery orders</p>
        </div>

        {/* Filter Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition ${
              filter === "all"
                ? "bg-red-600 text-white shadow-lg"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-red-600"
            }`}
          >
            📋 All ({orders.length})
          </button>
          <button
            onClick={() => setFilter("in_progress")}
            className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition ${
              filter === "in_progress"
                ? "bg-blue-500 text-white shadow-lg"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-500"
            }`}
          >
            🔄 In Progress ({orders.filter(o => o.status === "pending" || o.status === "active").length})
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition ${
              filter === "completed"
                ? "bg-green-500 text-white shadow-lg"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-green-500"
            }`}
          >
            ✅ Completed ({orders.filter(o => o.status === "delivered").length})
          </button>
          <button
            onClick={() => setFilter("cancelled")}
            className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition ${
              filter === "cancelled"
                ? "bg-red-500 text-white shadow-lg"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-red-500"
            }`}
          >
            ❌ Cancelled ({orders.filter(o => o.status === "cancelled").length})
          </button>
        </div>

        {/* Advanced Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">🔍 Search & Filters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search by ID, address, client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            <select
              value={filterDriver}
              onChange={(e) => setFilterDriver(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="all">All Drivers</option>
              {drivers.map(driver => (
                <option key={driver.id} value={driver.id}>{driver.name}</option>
              ))}
            </select>
            
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From Date"
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To Date"
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="created_at">Sort by Date</option>
              <option value="price">Sort by Price</option>
              <option value="status">Sort by Status</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600">
              Showing {filteredOrders.length} of {orders.length} orders
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
                setFilterDriver('all');
                setDateFrom('');
                setDateTo('');
                setSortBy('created_at');
                setSortOrder('desc');
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-400 transition text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-gray-500 text-lg font-semibold">No orders found</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Order ID</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Client</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase hidden lg:table-cell">Pickup</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase hidden lg:table-cell">Dropoff</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Driver</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase hidden sm:table-cell">Price</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 sm:px-6 py-4">
                        <button
                          onClick={() => setViewOrderDetails(order)}
                          className="text-sm font-mono text-red-600 hover:underline font-bold"
                        >
                          #{order.id.slice(0, 8)} 👁️
                        </button>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-sm">
                          <p className="font-semibold text-gray-900">{order.client?.name || 'N/A'}</p>
                          <p className="text-gray-500 text-xs">{order.client?.email}</p>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 max-w-xs truncate hidden lg:table-cell">
                        {order.pickup_address}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 max-w-xs truncate hidden lg:table-cell">
                        {order.dropoff_address}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        {order.driver ? (
                          <button
                            onClick={() => handleViewDriver(order.driver_id)}
                            className="text-sm font-semibold text-red-600 hover:underline"
                          >
                            {order.driver.name}
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm font-bold text-gray-900 hidden sm:table-cell">
                        ${order.price?.toFixed(2)}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <button
                          onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
                          className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-red-700 transition"
                        >
                          {selectedOrder === order.id ? "Close" : "Assign"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Assign Driver Modal */}
      {selectedOrder && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setSelectedOrder(null)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 sm:p-8 z-50 w-11/12 max-w-md">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Assign Driver</h3>
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-3">
                Select Driver
              </label>
              <select
                value={selectedDriver || ""}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">Choose a driver...</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name} - {driver.vehicle_type}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleAssignDriver(selectedOrder)}
                disabled={!selectedDriver}
                className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign Driver
              </button>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setSelectedDriver(null);
                }}
                className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* Order Details Modal */}
      {viewOrderDetails && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto"
            onClick={() => setViewOrderDetails(null)}
          />
          <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-6 sm:p-8 z-50 w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">Order Details</h3>
                <p className="text-sm text-gray-500 mt-1">#{viewOrderDetails.id.slice(0, 8)}</p>
              </div>
              <button 
                onClick={() => setViewOrderDetails(null)}
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Status */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-2">Status</h4>
                  <StatusBadge status={viewOrderDetails.status} />
                </div>

                {/* Dates */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-semibold">{new Date(viewOrderDetails.created_at).toLocaleString()}</span>
                    </div>
                    {viewOrderDetails.scheduled_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Scheduled:</span>
                        <span className="font-semibold">
                          {viewOrderDetails.scheduled_date} {viewOrderDetails.scheduled_time || ''}
                        </span>
                      </div>
                    )}
                    {viewOrderDetails.delivered_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Delivered:</span>
                        <span className="font-semibold">{new Date(viewOrderDetails.delivered_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Addresses */}
                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-blue-700 mb-2">📍 Pickup Address</h4>
                  <p className="text-sm text-gray-900">{viewOrderDetails.pickup_address}</p>
                </div>

                <div className="bg-green-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-green-700 mb-2">🎯 Dropoff Address</h4>
                  <p className="text-sm text-gray-900">{viewOrderDetails.dropoff_address}</p>
                </div>

                {/* Route Map */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">🗺️ Route Map</h4>
                  <div className="bg-gray-200 rounded-lg h-48 flex items-center justify-center mb-2">
                    <p className="text-gray-600 text-sm text-center px-4">
                      Map preview<br/>
                      <span className="text-xs">Click button below to view route</span>
                    </p>
                  </div>
                  <button 
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(viewOrderDetails.pickup_address)}&destination=${encodeURIComponent(viewOrderDetails.dropoff_address)}`, '_blank')}
                    className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition"
                  >
                    Open in Google Maps
                  </button>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Client & Driver Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">👥 People</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Client</p>
                      <p className="font-semibold text-gray-900">{viewOrderDetails.client?.name || 'N/A'}</p>
                      <p className="text-sm text-gray-600">{viewOrderDetails.client?.email}</p>
                      <p className="text-sm text-gray-600">{viewOrderDetails.client?.phone}</p>
                    </div>
                    <div className="border-t border-gray-200 pt-3">
                      <p className="text-xs text-gray-500 mb-1">Driver</p>
                      {viewOrderDetails.driver ? (
                        <>
                          <button
                            onClick={() => {
                              setViewOrderDetails(null);
                              handleViewDriver(viewOrderDetails.driver_id);
                            }}
                            className="font-semibold text-red-600 hover:underline"
                          >
                            {viewOrderDetails.driver.name}
                          </button>
                          <p className="text-sm text-gray-600">{viewOrderDetails.driver.email}</p>
                          <p className="text-sm text-gray-600">{viewOrderDetails.driver.phone}</p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400">Not assigned</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Parcel Details */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">📦 Parcel Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Size:</span>
                      <span className="font-semibold capitalize">{viewOrderDetails.parcel_size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Weight:</span>
                      <span className="font-semibold">{viewOrderDetails.parcel_weight} kg</span>
                    </div>
                    {(viewOrderDetails.length || viewOrderDetails.width || viewOrderDetails.height) && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Dimensions:</span>
                        <span className="font-semibold">
                          {viewOrderDetails.length || 0} × {viewOrderDetails.width || 0} × {viewOrderDetails.height || 0} cm
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service:</span>
                      <span className="font-semibold capitalize">{viewOrderDetails.service_type?.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-bold text-green-600 text-lg">${viewOrderDetails.price?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Parcel Image */}
                {viewOrderDetails.image_url && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-gray-700 mb-3">📸 Parcel Image</h4>
                    <img 
                      src={viewOrderDetails.image_url} 
                      alt="Parcel" 
                      className="w-full rounded-lg shadow"
                    />
                  </div>
                )}

                {/* Notes */}
                {viewOrderDetails.notes && (
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-gray-700 mb-2">📝 Notes</h4>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{viewOrderDetails.notes}</p>
                  </div>
                )}

                {/* Proof of Delivery */}
                {viewOrderDetails.status === 'delivered' && (
                  <div className="bg-green-50 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-green-700 mb-3">✅ Proof of Delivery</h4>
                    
                    {viewOrderDetails.anyone_home && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-600 mb-1">Anyone Home?</p>
                        <p className="text-sm font-semibold capitalize">{viewOrderDetails.anyone_home}</p>
                      </div>
                    )}

                    {viewOrderDetails.delivery_notes && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-600 mb-1">Delivery Notes</p>
                        <p className="text-sm">{viewOrderDetails.delivery_notes}</p>
                      </div>
                    )}

                    {viewOrderDetails.signature_url && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-600 mb-2">Signature</p>
                        <img 
                          src={viewOrderDetails.signature_url} 
                          alt="Signature" 
                          className="border-2 border-gray-300 rounded-lg bg-white"
                        />
                      </div>
                    )}

                    {viewOrderDetails.proof_images && viewOrderDetails.proof_images.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-600 mb-2">Proof Photos</p>
                        <div className="grid grid-cols-2 gap-2">
                          {viewOrderDetails.proof_images.map((img, idx) => (
                            <img 
                              key={idx}
                              src={img} 
                              alt={`Proof ${idx + 1}`} 
                              className="w-full rounded-lg shadow"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={() => setViewOrderDetails(null)}
              className="mt-6 w-full py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
            >
              Close
            </button>
          </div>
        </>
      )}

      {/* Driver Info Modal */}
      {viewDriverDetails && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto"
            onClick={() => setViewDriverDetails(null)}
          />
          <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-6 sm:p-8 z-50 w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">Driver Details</h3>
                <p className="text-sm text-gray-500 mt-1">{viewDriverDetails.name}</p>
              </div>
              <button 
                onClick={() => setViewDriverDetails(null)}
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
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
                    <span className="font-semibold">{viewDriverDetails.phone}</span>
                  </div>
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-blue-700 mb-3">🚐 Vehicle Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vehicle Type:</span>
                    <span className="font-semibold capitalize">{viewDriverDetails.vehicle_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Registration:</span>
                    <span className="font-semibold">{viewDriverDetails.vehicle_registration || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Insurance & License */}
              <div className="bg-green-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-green-700 mb-3">📋 Insurance & License</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Insurance Type:</span>
                    <span className="font-semibold">{viewDriverDetails.insurance_type || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">License Number:</span>
                    <span className="font-semibold">{viewDriverDetails.license_number || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="bg-purple-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-purple-700 mb-3">📊 Performance</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Completed Orders</p>
                    <p className="text-2xl font-black text-gray-900">{viewDriverDetails.completedOrders}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Active Orders</p>
                    <p className="text-2xl font-black text-gray-900">{viewDriverDetails.activeOrders}</p>
                  </div>
                </div>
              </div>

              {/* Duty Status */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-gray-700 mb-3">⏰ Current Status</h4>
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${viewDriverDetails.is_on_duty ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="font-semibold">{viewDriverDetails.is_on_duty ? 'On Duty' : 'Off Duty'}</span>
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

            <button 
              onClick={() => setViewDriverDetails(null)}
              className="mt-6 w-full py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
    active: "bg-blue-100 text-blue-700 border-blue-300",
    delivered: "bg-green-100 text-green-700 border-green-300",
    cancelled: "bg-red-100 text-red-700 border-red-300",
  };

  return (
    <span className={`inline-block px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold capitalize border-2 ${styles[status] || "bg-gray-100 text-gray-600 border-gray-300"}`}>
      {status}
    </span>
  );
}