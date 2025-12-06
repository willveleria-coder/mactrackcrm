"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import HamburgerMenu from "@/components/HamburgerMenu";

export default function OrdersHistoryPage() {
  const [client, setClient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const menuItems = [
    { href: "/client-portal/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/client-portal/orders", icon: "📦", label: "My Orders" },
    { href: "/client-portal/new-order", icon: "➕", label: "New Order" },
  ];

  useEffect(() => {
    loadOrders();
    
    // Check for payment success
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
      alert('✅ Payment successful! Your order has been confirmed.');
      window.history.replaceState({}, '', '/client-portal/orders');
    } else if (paymentStatus === 'cancelled') {
      alert('❌ Payment cancelled. Your order is saved but unpaid.');
      window.history.replaceState({}, '', '/client-portal/orders');
    }
  }, []);

  useEffect(() => {
    filterOrders();
  }, [searchQuery, statusFilter, orders]);

  async function loadOrders() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push("/client-portal/login");
        return;
      }

      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (clientError || !clientData) {
        router.push("/client-portal/login");
        return;
      }

      setClient(clientData);

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("client_id", clientData.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setOrders(data);
        setFilteredOrders(data);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  }

  function filterOrders() {
    let filtered = orders;

    if (searchQuery) {
      filtered = filtered.filter(order => 
        order.pickup_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.dropoff_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.service_type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/client-portal/login");
  }

  function openOrderDetails(order) {
    setSelectedOrder(order);
    setShowOrderModal(true);
  }

  function closeOrderModal() {
    setShowOrderModal(false);
    setSelectedOrder(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading orders...</div>
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
                <p className="text-xs text-gray-500">Client Portal</p>
              </div>
            </div>
            
            <HamburgerMenu 
              items={menuItems}
              onLogout={handleLogout}
              userName={client?.name}
              userRole="Client"
            />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Order History 📦</h2>
          <p className="text-sm sm:text-base text-gray-600">View and track all your deliveries</p>
        </div>

        {/* Search & Filter */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Search by pickup, drop-off, or service type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button 
                onClick={loadOrders}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-gray-500 text-lg font-semibold mb-4">
                {orders.length === 0 ? "No orders yet" : "No orders match your search"}
              </p>
              {orders.length === 0 && (
                <Link
                  href="/client-portal/new-order"
                  className="inline-block px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
                >
                  Create Your First Order
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="block lg:hidden">
                <div className="divide-y divide-gray-100">
                  {filteredOrders.map((order) => (
                    <div 
                      key={order.id} 
                      onClick={() => openOrderDetails(order)}
                      className="p-4 hover:bg-gray-50 transition cursor-pointer active:bg-gray-100"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="text-lg font-bold text-gray-900">
                          ${Number(order.price).toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        <div className="text-sm">
                          <p className="font-semibold text-gray-900">📍 {order.pickup_address}</p>
                          <p className="text-gray-500">🎯 {order.dropoff_address}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-1 bg-gray-100 rounded-full">
                            {order.parcel_size}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 rounded-full">
                            {order.parcel_weight}kg
                          </span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                            {order.service_type}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-center text-xs text-gray-500">
                        Tap to view full details
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Route
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Details
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-right py-4 px-6 text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="text-center py-4 px-6 text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredOrders.map((order) => (
                      <tr 
                        key={order.id} 
                        onClick={() => openOrderDetails(order)}
                        className="hover:bg-gray-50 transition cursor-pointer"
                      >
                        <td className="py-4 px-6 text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleDateString()}
                          <div className="text-xs text-gray-400">
                            {new Date(order.created_at).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm font-semibold text-gray-900">📍 {order.pickup_address}</div>
                          <div className="text-sm text-gray-500">🎯 {order.dropoff_address}</div>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600">
                          <div>{order.parcel_size} / {order.parcel_weight}kg</div>
                          {order.quantity > 1 && (
                            <div className="text-xs text-gray-400">Qty: {order.quantity}</div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                            {order.service_type}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="py-4 px-6 text-sm font-bold text-gray-900 text-right">
                          ${Number(order.price).toFixed(2)}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="text-xs text-gray-500">Click for details</span>
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
        {orders.length > 0 && (
          <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm">
              <span className="text-gray-600">
                Showing <span className="font-bold text-gray-900">{filteredOrders.length}</span> of{" "}
                <span className="font-bold text-gray-900">{orders.length}</span> orders
              </span>
              <span className="text-gray-600">
                Total Spent: <span className="font-bold text-red-600 text-lg">${orders.reduce((sum, o) => sum + Number(o.price), 0).toFixed(2)}</span>
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={closeOrderModal}
          />
          <div className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-2xl bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black mb-1">Order Details</h3>
                <p className="text-sm opacity-90">Order #{selectedOrder.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <button
                onClick={closeOrderModal}
                className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center text-2xl font-bold transition"
              >
                ×
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status & Price */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-gray-600 mb-2">Status</p>
                  <StatusBadge status={selectedOrder.status} />
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
                  <p className="text-xs font-bold opacity-90 mb-1">Total Price</p>
                  <p className="text-3xl font-black">${Number(selectedOrder.price).toFixed(2)}</p>
                </div>
              </div>

              {/* Date & Time */}
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-900 mb-2">📅 Order Placed</p>
                <p className="text-sm font-semibold text-gray-900">
                  {new Date(selectedOrder.created_at).toLocaleDateString('en-AU', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(selectedOrder.created_at).toLocaleTimeString()}
                </p>
              </div>

              {/* Pickup Details */}
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm font-bold text-blue-900 mb-3">📍 Pickup Location</p>
                <p className="text-sm font-semibold text-gray-900 mb-2">{selectedOrder.pickup_address}</p>
                {selectedOrder.pickup_contact_name && (
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>👤 {selectedOrder.pickup_contact_name}</p>
                    <p>📞 {selectedOrder.pickup_contact_phone}</p>
                  </div>
                )}
              </div>

              {/* Delivery Details */}
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-sm font-bold text-green-900 mb-3">🎯 Delivery Location</p>
                <p className="text-sm font-semibold text-gray-900 mb-2">{selectedOrder.dropoff_address}</p>
                {selectedOrder.dropoff_contact_name && (
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>👤 {selectedOrder.dropoff_contact_name}</p>
                    <p>📞 {selectedOrder.dropoff_contact_phone}</p>
                  </div>
                )}
              </div>

              {/* Parcel Information */}
              <div className="bg-purple-50 rounded-xl p-4">
                <p className="text-sm font-bold text-purple-900 mb-3">📦 Parcel Details</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Size</p>
                    <p className="font-semibold text-gray-900 capitalize">{selectedOrder.parcel_size}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Weight</p>
                    <p className="font-semibold text-gray-900">{selectedOrder.parcel_weight}kg</p>
                  </div>
                  {selectedOrder.quantity > 1 && (
                    <div>
                      <p className="text-gray-600 mb-1">Quantity</p>
                      <p className="font-semibold text-gray-900">{selectedOrder.quantity} parcels</p>
                    </div>
                  )}
                  {selectedOrder.length && (
                    <div className="col-span-2">
                      <p className="text-gray-600 mb-1">Dimensions</p>
                      <p className="font-semibold text-gray-900">
                        {selectedOrder.length} × {selectedOrder.width} × {selectedOrder.height} cm
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Service Type */}
              <div className="bg-yellow-50 rounded-xl p-4">
                <p className="text-sm font-bold text-yellow-900 mb-2">🚚 Service Type</p>
                <p className="text-sm font-semibold text-gray-900 capitalize">{selectedOrder.service_type}</p>
                {selectedOrder.scheduled_date && (
                  <div className="mt-2 text-sm text-gray-700">
                    <p className="font-semibold">Scheduled for:</p>
                    <p>{new Date(selectedOrder.scheduled_date).toLocaleDateString()} {selectedOrder.scheduled_time}</p>
                  </div>
                )}
              </div>

              {/* Special Options */}
              {(selectedOrder.fragile || selectedOrder.insurance_required) && (
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-sm font-bold text-red-900 mb-2">⚠️ Special Handling</p>
                  <div className="space-y-1 text-sm">
                    {selectedOrder.fragile && (
                      <p className="text-gray-700">• Fragile - Handle with care</p>
                    )}
                    {selectedOrder.insurance_required && (
                      <p className="text-gray-700">• Insured up to $1000</p>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-bold text-gray-900 mb-2">📝 Delivery Instructions</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Driver Information */}
              {selectedOrder.driver_id && (
                <div className="bg-indigo-50 rounded-xl p-4">
                  <p className="text-sm font-bold text-indigo-900 mb-2">🚗 Driver Assigned</p>
                  <p className="text-sm text-gray-700">Driver ID: {selectedOrder.driver_id}</p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-3">
                <Link
                  href={`/client-portal/orders/${selectedOrder.id}/track`}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-center hover:bg-red-700 transition"
                  onClick={closeOrderModal}
                >
                  📍 Track Order
                </Link>
                <Link
                  href={`/client-portal/orders/${selectedOrder.id}/label`}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold text-center hover:bg-gray-300 transition"
                  onClick={closeOrderModal}
                >
                  🏷️ View Label
                </Link>
              </div>
              <button
                onClick={closeOrderModal}
                className="w-full mt-3 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
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

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-yellow-100 text-yellow-700",
    active: "bg-blue-100 text-blue-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${styles[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}