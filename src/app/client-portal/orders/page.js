"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function OrdersHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadOrders();
    
    // Check for payment success
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
      alert('✅ Payment successful! Your order has been confirmed.');
      // Clear URL parameters
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

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading orders...</div>
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
            <Link href="/client-portal/dashboard" className="text-sm font-semibold text-gray-700 hover:text-[#0072ab]">
              Dashboard
            </Link>
            <Link href="/client-portal/new-order" className="text-sm font-semibold text-gray-700 hover:text-[#0072ab]">
              New Order
            </Link>
            <Link href="/client-portal/orders" className="text-sm font-semibold text-[#0072ab] border-b-2 border-[#0072ab]">
              My Orders
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Order History</h2>
          <p className="text-gray-600">View and track all your deliveries</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Search by pickup, drop-off, or service type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0072ab] focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0072ab] focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button 
                onClick={loadOrders}
                className="px-6 py-3 bg-[#0072ab] text-white rounded-lg font-semibold hover:bg-[#005d8c] transition"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg mb-4">
                {orders.length === 0 ? "📦 No orders yet" : "No orders match your search"}
              </p>
              {orders.length === 0 && (
                <Link
                  href="/client-portal/new-order"
                  className="inline-block px-6 py-3 bg-[#0072ab] text-white rounded-lg font-semibold hover:bg-[#005d8c] transition"
                >
                  Create Your First Order
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="text-right py-4 px-6 text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="text-center py-4 px-6 text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition">
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
                        {order.distance_km && (
                          <div className="text-xs text-gray-400">{order.distance_km}km</div>
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
                      <td className="py-4 px-6">
                        <PaymentBadge status={order.payment_status} />
                      </td>
                      <td className="py-4 px-6 text-sm font-bold text-gray-900 text-right">
                        ${Number(order.price).toFixed(2)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex gap-2 justify-center">
                          <Link
                            href={`/client-portal/orders/${order.id}/track`}
                            className="text-[#0072ab] hover:text-[#005d8c] font-semibold text-sm"
                          >
                            📍 Track
                          </Link>
                          <Link
                            href={`/client-portal/orders/${order.id}/label`}
                            className="text-[#0072ab] hover:text-[#005d8c] font-semibold text-sm"
                          >
                            🏷️ Label
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {orders.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">
                Showing <span className="font-bold text-gray-900">{filteredOrders.length}</span> of{" "}
                <span className="font-bold text-gray-900">{orders.length}</span> orders
              </span>
              <span className="text-gray-600">
                Total Spent: <span className="font-bold text-gray-900">${orders.reduce((sum, o) => sum + Number(o.price), 0).toFixed(2)}</span>
              </span>
            </div>
          </div>
        )}
      </main>
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

function PaymentBadge({ status }) {
  const styles = {
    paid: "bg-green-100 text-green-700",
    unpaid: "bg-red-100 text-red-700",
    pending: "bg-yellow-100 text-yellow-700",
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${styles[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}