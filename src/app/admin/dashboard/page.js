"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

export default function AdminDashboard() {
  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    activeDrivers: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [viewOrderDetails, setViewOrderDetails] = useState(null);
  const [viewDriverDetails, setViewDriverDetails] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push("/admin/login");
        return;
      }

      const { data: adminData, error: adminError } = await supabase
        .from("admins")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (adminError || !adminData) {
        router.push("/admin/login");
        return;
      }

      setAdmin(adminData);

      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: driversData } = await supabase
        .from("drivers")
        .select("*");

      const { data: clientsData } = await supabase
        .from("clients")
        .select("id, name, email, phone");

      // Manually join data
      const ordersWithDetails = ordersData?.map(order => ({
        ...order,
        client: clientsData?.find(c => c.id === order.client_id) || null,
        driver: driversData?.find(d => d.id === order.driver_id) || null
      })) || [];

      const totalOrders = ordersData?.length || 0;
      const activeOrders = ordersData?.filter(o => o.status === "pending" || o.status === "active").length || 0;
      const completedOrders = ordersData?.filter(o => o.status === "delivered").length || 0;
      const totalRevenue = ordersData?.reduce((sum, o) => sum + (o.price || 0), 0) || 0;
      const activeDrivers = driversData?.filter(d => d.is_on_duty).length || 0;

      setStats({
        totalOrders,
        activeOrders,
        completedOrders,
        totalRevenue,
        activeDrivers,
      });

      setAllOrders(ordersWithDetails);
      setRecentOrders(ordersWithDetails.slice(0, 10));
      setDrivers(driversData || []);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  async function handleViewDriver(driverId) {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;

    const driverOrders = allOrders.filter(o => o.driver_id === driverId);
    const completedOrders = driverOrders.filter(o => o.status === "delivered").length;
    const activeOrders = driverOrders.filter(o => o.status === "pending" || o.status === "active").length;

    setViewDriverDetails({
      ...driver,
      completedOrders,
      activeOrders
    });
  }

  function handleEditOrder(order) {
    setViewOrderDetails(null);
    setEditingOrder(order);
    setEditFormData({
      pickup_address: order.pickup_address,
      dropoff_address: order.dropoff_address,
      parcel_size: order.parcel_size,
      parcel_weight: order.parcel_weight,
      length: order.length || '',
      width: order.width || '',
      height: order.height || '',
      service_type: order.service_type,
      scheduled_date: order.scheduled_date || '',
      scheduled_time: order.scheduled_time || '',
      notes: order.notes || '',
      price: order.price,
      status: order.status,
      driver_id: order.driver_id || '',
    });
    setSaveMessage("");
  }

  function handleEditInputChange(e) {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  }

  async function handleSaveOrder(e) {
    e.preventDefault();
    setSaving(true);
    setSaveMessage("");

    try {
      const updateData = {
        pickup_address: editFormData.pickup_address,
        dropoff_address: editFormData.dropoff_address,
        parcel_size: editFormData.parcel_size,
        parcel_weight: parseFloat(editFormData.parcel_weight),
        length: parseFloat(editFormData.length) || null,
        width: parseFloat(editFormData.width) || null,
        height: parseFloat(editFormData.height) || null,
        service_type: editFormData.service_type,
        scheduled_date: editFormData.scheduled_date || null,
        scheduled_time: editFormData.scheduled_time || null,
        notes: editFormData.notes || null,
        price: parseFloat(editFormData.price),
        status: editFormData.status,
        driver_id: editFormData.driver_id || null,
      };

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", editingOrder.id);

      if (error) throw error;

      setSaveMessage("✅ Order updated successfully!");
      
      await loadDashboard();
      
      setTimeout(() => {
        setEditingOrder(null);
        setSaveMessage("");
      }, 1500);
    } catch (error) {
      console.error("Error updating order:", error);
      setSaveMessage("❌ Failed to update order");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
            <div className="flex flex-wrap items-center gap-3 sm:gap-6">
              <span className="text-sm text-gray-600">👋 {admin?.name}</span>
              <Link href="/admin/dashboard" className="text-sm font-semibold text-red-600 border-b-2 border-red-600">
                Dashboard
              </Link>
              <Link href="/admin/analytics" className="text-sm font-semibold text-gray-700 hover:text-red-600">
                Analytics
              </Link>
              <Link href="/admin/orders" className="text-sm font-semibold text-gray-700 hover:text-red-600">
                Orders
              </Link>
              <Link href="/admin/drivers" className="text-sm font-semibold text-gray-700 hover:text-red-600">
                Drivers
              </Link>
              <Link href="/admin/payouts" className="text-sm font-semibold text-gray-700 hover:text-red-600">
                Payouts
              </Link>
              <Link href="/admin/feedback" className="text-sm font-semibold text-gray-700 hover:text-red-600">
                Feedback
              </Link>
              <Link href="/admin/live-tracking" className="text-sm font-semibold text-gray-700 hover:text-red-600">
                Live Tracking
              </Link>
              <button 
                onClick={handleLogout}
                className="text-sm font-semibold text-gray-700 hover:text-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h2>
          <p className="text-gray-600">Overview of your delivery operations</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Total Orders</p>
            <p className="text-4xl font-black">{stats.totalOrders}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Active Orders</p>
            <p className="text-4xl font-black">{stats.activeOrders}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Completed</p>
            <p className="text-4xl font-black">{stats.completedOrders}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Total Revenue</p>
            <p className="text-4xl font-black">${stats.totalRevenue.toFixed(0)}</p>
          </div>
          <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl p-5 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Active Drivers</p>
            <p className="text-4xl font-black">{stats.activeDrivers}</p>
          </div>
        </div>

        {/* QUICK ACTIONS - MOVED HERE ABOVE RECENT ORDERS */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link
              href="/admin/orders"
              className="p-6 bg-blue-50 rounded-xl text-center hover:bg-blue-100 transition"
            >
              <div className="text-4xl mb-2">📦</div>
              <p className="text-sm font-semibold text-gray-900">Manage Orders</p>
            </Link>
            <Link
              href="/admin/drivers"
              className="p-6 bg-green-50 rounded-xl text-center hover:bg-green-100 transition"
            >
              <div className="text-4xl mb-2">🚐</div>
              <p className="text-sm font-semibold text-gray-900">Manage Drivers</p>
            </Link>
            <Link
              href="/admin/analytics"
              className="p-6 bg-purple-50 rounded-xl text-center hover:bg-purple-100 transition"
            >
              <div className="text-4xl mb-2">📊</div>
              <p className="text-sm font-semibold text-gray-900">Analytics</p>
            </Link>
            <Link
              href="/admin/payouts"
              className="p-6 bg-orange-50 rounded-xl text-center hover:bg-orange-100 transition"
            >
              <div className="text-4xl mb-2">💰</div>
              <p className="text-sm font-semibold text-gray-900">Payouts</p>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Recent Orders</h3>
              <Link 
                href="/admin/orders"
                className="text-sm font-semibold text-red-600 hover:underline"
              >
                View All →
              </Link>
            </div>
            <div className="space-y-3">
              {recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-3">📦</div>
                  <p className="text-gray-500 font-semibold">No orders yet</p>
                </div>
              ) : (
                recentOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => setViewOrderDetails(order)}
                    className="w-full text-left border-2 border-gray-200 rounded-xl p-4 hover:border-red-600 hover:shadow-md transition cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono text-gray-500">#{order.id.slice(0, 8)}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">{order.client?.name || 'N/A'}</p>
                    <p className="text-xs text-gray-600 truncate">{order.pickup_address}</p>
                    <p className="text-xs text-gray-600 truncate mb-2">{order.dropoff_address}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-sm font-bold text-green-600">${order.price?.toFixed(2)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Live Tracking</h3>
            <div className="bg-gray-100 rounded-xl h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-3">🗺️</div>
                <p className="text-gray-600 font-semibold">Live Tracking Map</p>
                <Link href="/admin/live-tracking" className="text-sm text-red-600 hover:underline mt-2 inline-block">
                  View Tracking →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* All your existing modals remain unchanged... */}
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
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-2">Status</h4>
                  <StatusBadge status={viewOrderDetails.status} />
                </div>

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

                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-blue-700 mb-2">📍 Pickup Address</h4>
                  <p className="text-sm text-gray-900">{viewOrderDetails.pickup_address}</p>
                </div>

                <div className="bg-green-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-green-700 mb-2">🎯 Dropoff Address</h4>
                  <p className="text-sm text-gray-900">{viewOrderDetails.dropoff_address}</p>
                </div>

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

                {viewOrderDetails.notes && (
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-gray-700 mb-2">📝 Notes</h4>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{viewOrderDetails.notes}</p>
                  </div>
                )}

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

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setViewOrderDetails(null)}
                className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
              >
                Close
              </button>
              <button 
                onClick={() => handleEditOrder(viewOrderDetails)}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition"
              >
                ✏️ Edit Order
              </button>
            </div>
          </div>
        </>
      )}

      {/* Keep all other modals (Edit Order Modal, Driver Info Modal) exactly as they were */}
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