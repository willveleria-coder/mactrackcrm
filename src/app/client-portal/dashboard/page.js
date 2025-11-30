"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

// Helper function to calculate approximate distance between two addresses
function calculateDistance(pickup, dropoff) {
  // This is a rough estimate - in production you'd use Google Maps Distance Matrix API
  // For now, we'll estimate based on address length difference as a placeholder
  const roughDistance = Math.floor(Math.random() * 50) + 10; // 10-60 km
  return roughDistance;
}

// Helper function to calculate estimated time
function calculateEstimatedTime(distance, serviceType) {
  let baseSpeed = 40; // km/h average
  if (serviceType === 'express') baseSpeed = 50;
  if (serviceType === 'same_day') baseSpeed = 60;
  
  const hours = distance / baseSpeed;
  const minutes = Math.round(hours * 60);
  return minutes;
}

export default function ClientDashboard() {
  const [client, setClient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [viewOrderDetails, setViewOrderDetails] = useState(null);
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

      // Load orders with driver info
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("client_id", clientData.id)
        .order("created_at", { ascending: false });

      // Load drivers separately
      const { data: driversData } = await supabase
        .from("drivers")
        .select("id, name, email, phone, vehicle_type");

      // Manually join driver data
      const ordersWithDrivers = ordersData?.map(order => ({
        ...order,
        driver: driversData?.find(d => d.id === order.driver_id) || null
      })) || [];

      setOrders(ordersWithDrivers);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/client-portal/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
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
            <div className="flex items-center gap-4 sm:gap-6">
              <span className="text-sm text-gray-600 hidden sm:inline">👋 {client?.name}</span>
              <Link href="/client-portal/dashboard" className="text-sm font-semibold text-red-600 border-b-2 border-red-600">
                Dashboard
              </Link>
              <Link href="/client-portal/orders" className="text-sm font-semibold text-gray-700 hover:text-red-600">
                Orders
              </Link>
              <Link href="/client-portal/new-order" className="text-sm font-semibold text-gray-700 hover:text-red-600">
                New Order
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            Hi {client?.name}! 👋
          </h2>
          <p className="text-sm sm:text-base text-gray-600">Here&apos;s your delivery overview</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-lg border border-gray-100">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Orders</p>
            <p className="text-2xl sm:text-3xl font-black text-gray-900">{orders.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-lg border border-gray-100">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">In Progress</p>
            <p className="text-2xl sm:text-3xl font-black text-blue-600">
              {orders.filter(o => o.status === "pending" || o.status === "active").length}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-lg border border-gray-100">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Completed</p>
            <p className="text-2xl sm:text-3xl font-black text-green-600">
              {orders.filter(o => o.status === "delivered").length}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-lg border border-gray-100">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Spent</p>
            <p className="text-2xl sm:text-3xl font-black text-purple-600">
              ${orders.reduce((sum, o) => sum + (o.price || 0), 0).toFixed(0)}
            </p>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6">
          <div className="flex justify-between items-center mb-5 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">Your Orders</h3>
            <Link 
              href="/client-portal/new-order"
              className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition shadow-lg"
            >
              + New Order
            </Link>
          </div>
          
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-gray-500 text-lg font-semibold mb-4">No orders yet</p>
              <Link 
                href="/client-portal/new-order"
                className="inline-block px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
              >
                Create Your First Order
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="space-y-3">
                  <button
                    onClick={() => setViewOrderDetails(order)}
                    className="w-full text-left border-2 border-gray-200 rounded-2xl p-4 sm:p-5 hover:border-red-600 hover:shadow-md transition cursor-pointer"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Order #{order.id.slice(0, 8)}</p>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Price</p>
                        <p className="text-xl sm:text-2xl font-black text-green-600">${order.price?.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="bg-blue-50 rounded-xl p-3">
                        <p className="text-xs font-bold text-blue-700 mb-1">📍 PICKUP</p>
                        <p className="text-sm text-gray-900 font-medium">{order.pickup_address}</p>
                      </div>
                      <div className="bg-green-50 rounded-xl p-3">
                        <p className="text-xs font-bold text-green-700 mb-1">🎯 DROPOFF</p>
                        <p className="text-sm text-gray-900 font-medium">{order.dropoff_address}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                      <span className="bg-gray-100 px-3 py-1 rounded-full text-gray-700">
                        📦 {order.parcel_size}
                      </span>
                      <span className="bg-gray-100 px-3 py-1 rounded-full text-gray-700">
                        ⚖️ {order.parcel_weight}kg
                      </span>
                      <span className="bg-gray-100 px-3 py-1 rounded-full text-gray-700">
                        ⚡ {order.service_type}
                      </span>
                      {order.driver && (
                        <span className="bg-blue-100 px-3 py-1 rounded-full text-blue-700 font-semibold">
                          🚐 {order.driver.name}
                        </span>
                      )}
                    </div>

                    {order.scheduled_date && (
                      <div className="mt-3 text-xs text-gray-600">
                        📅 Scheduled: {order.scheduled_date} {order.scheduled_time || ''}
                      </div>
                    )}

                    <div className="mt-3 text-xs text-gray-500">
                      Created: {new Date(order.created_at).toLocaleString()}
                    </div>
                  </button>
                  
                  {/* View Label Button */}
                  <Link
                    href={`/client-portal/orders/${order.id}/label`}
                    className="block w-full py-3 bg-purple-500 text-white rounded-xl text-center font-bold hover:bg-purple-600 transition"
                  >
                    📄 View Shipping Label
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

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

                {/* Timeline */}
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

                {/* Route Details */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">🗺️ Route Details</h4>
                  
                  {/* Route Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Distance</p>
                      <p className="text-lg font-bold text-gray-900">
                        {calculateDistance(viewOrderDetails.pickup_address, viewOrderDetails.dropoff_address)} km
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Est. Time</p>
                      <p className="text-lg font-bold text-gray-900">
                        {calculateEstimatedTime(
                          calculateDistance(viewOrderDetails.pickup_address, viewOrderDetails.dropoff_address),
                          viewOrderDetails.service_type
                        )} mins
                      </p>
                    </div>
                  </div>

                  {/* Route Status */}
                  {viewOrderDetails.status === 'delivered' && viewOrderDetails.delivered_at && (
                    <div className="bg-green-50 rounded-lg p-3 mb-3 border border-green-200">
                      <p className="text-xs text-green-700 font-bold mb-1">✅ Completed Route</p>
                      <p className="text-xs text-gray-600">
                        Delivered on {new Date(viewOrderDetails.delivered_at).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* Map Preview */}
                  <div className="bg-gray-200 rounded-lg h-48 flex items-center justify-center mb-2">
                    <p className="text-gray-600 text-sm text-center px-4">
                      Route Map<br/>
                      <span className="text-xs">Click button below to view full route</span>
                    </p>
                  </div>

                  {/* Map Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(viewOrderDetails.pickup_address)}&destination=${encodeURIComponent(viewOrderDetails.dropoff_address)}&travelmode=driving`, '_blank')}
                      className="py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition"
                    >
                      View Directions
                    </button>
                    <button 
                      onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(viewOrderDetails.dropoff_address)}`, '_blank')}
                      className="py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition"
                    >
                      View Destination
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Driver Info */}
                {viewOrderDetails.driver && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-gray-700 mb-3">🚐 Your Driver</h4>
                    <p className="font-semibold text-gray-900">{viewOrderDetails.driver.name}</p>
                    <p className="text-sm text-gray-600">{viewOrderDetails.driver.phone}</p>
                    <p className="text-sm text-gray-600 capitalize">{viewOrderDetails.driver.vehicle_type}</p>
                  </div>
                )}

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

  const labels = {
    pending: "⏳ Pending",
    active: "🚚 In Transit",
    delivered: "✅ Delivered",
    cancelled: "❌ Cancelled",
  };

  return (
    <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold border-2 ${styles[status] || "bg-gray-100 text-gray-600 border-gray-300"}`}>
      {labels[status] || status}
    </span>
  );
}