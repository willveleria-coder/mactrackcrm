"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

export default function LiveTrackingPage({ params }) {
  const [client, setClient] = useState(null);
  const [order, setOrder] = useState(null);
  const [driver, setDriver] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [locationSettings, setLocationSettings] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const orderId = params.orderId;

  useEffect(() => {
    loadTrackingData();
    const interval = setInterval(loadDriverLocation, 15000);
    return () => clearInterval(interval);
  }, [orderId]);

  async function loadTrackingData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/client-portal/login");
        return;
      }

      const { data: clientData } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!clientData) {
        router.push("/client-portal/login");
        return;
      }

      setClient(clientData);

      const { data: orderData } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .eq("client_id", clientData.id)
        .single();

      if (!orderData) {
        setMessage("❌ Order not found or access denied");
        setLoading(false);
        return;
      }

      if (orderData.status !== 'active') {
        setMessage("❌ Tracking only available for active deliveries");
        setLoading(false);
        return;
      }

      setOrder(orderData);

      if (orderData.driver_id) {
        const { data: driverData } = await supabase
          .from("drivers")
          .select("*")
          .eq("id", orderData.driver_id)
          .single();

        setDriver(driverData);

        const { data: settingsData } = await supabase
          .from("location_settings")
          .select("*")
          .eq("driver_id", orderData.driver_id)
          .single();

        setLocationSettings(settingsData);

        await loadDriverLocation(orderData.driver_id);
      }

    } catch (error) {
      console.error("Error loading tracking data:", error);
      setMessage("❌ Failed to load tracking data");
    } finally {
      setLoading(false);
    }
  }

  async function loadDriverLocation(driverId = order?.driver_id) {
    if (!driverId) return;

    try {
      const { data: locationData } = await supabase
        .from("driver_locations")
        .select("*")
        .eq("driver_id", driverId)
        .eq("is_active", true)
        .order("timestamp", { ascending: false })
        .limit(1)
        .single();

      if (locationData) {
        setDriverLocation(locationData);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.log("No active location found");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/client-portal/login");
  }

  function getTimeSinceUpdate() {
    if (!driverLocation) return 'Never';
    const seconds = Math.floor((new Date() - new Date(driverLocation.timestamp)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading tracking data...</div>
      </div>
    );
  }

  if (!order || message) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📍</div>
          <p className="text-gray-600 text-lg mb-4">{message || 'Order not found'}</p>
          <Link href="/client-portal/dashboard" className="text-red-600 font-bold hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const trackingEnabled = locationSettings?.tracking_enabled && locationSettings?.share_with_clients;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/bus-icon.png" alt="Mac Track" width={40} height={40} className="object-contain" />
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-red-600">Mac Track</h1>
                <p className="text-xs text-gray-500">Client Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              <span className="text-sm text-gray-600">👋 {client?.name}</span>
              <Link href="/client-portal/dashboard" className="text-sm font-semibold text-gray-700 hover:text-red-600">
                Dashboard
              </Link>
              <button onClick={handleLogout} className="text-sm font-semibold text-gray-700 hover:text-red-600">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">📍 Live Tracking</h2>
          <p className="text-gray-600">Order #{order.id.slice(0, 8).toUpperCase()}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Your Driver</h3>
              {driver && <p className="text-gray-600">{driver.name} • {driver.vehicle_type}</p>}
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold ${
                trackingEnabled && driverLocation ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  trackingEnabled && driverLocation ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`}></div>
                {trackingEnabled && driverLocation ? 'Live' : 'Offline'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-blue-50 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="text-3xl">📍</div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-blue-900 mb-1">Pickup Location</p>
                  <p className="text-sm text-blue-700">{order.pickup_address}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="text-3xl">🎯</div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-green-900 mb-1">Delivery Location</p>
                  <p className="text-sm text-green-700">{order.dropoff_address}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!trackingEnabled ? (
          <div className="bg-yellow-50 rounded-2xl border-2 border-yellow-200 p-6 mb-6 text-center">
            <div className="text-5xl mb-3">📍</div>
            <h3 className="text-lg font-bold text-yellow-900 mb-2">Live Tracking Unavailable</h3>
            <p className="text-yellow-700">
              The driver has not enabled location sharing for this delivery.
            </p>
          </div>
        ) : !driverLocation ? (
          <div className="bg-blue-50 rounded-2xl border-2 border-blue-200 p-6 mb-6 text-center">
            <div className="text-5xl mb-3">🔍</div>
            <h3 className="text-lg font-bold text-blue-900 mb-2">Waiting for Driver Location</h3>
            <p className="text-blue-700">
              The driver is preparing for pickup.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg mb-6">
              <h3 className="text-xl font-bold mb-4">🚚 Driver's Current Location</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="opacity-90 mb-1">Latitude</p>
                  <p className="font-mono font-bold text-lg">{driverLocation.latitude.toFixed(4)}</p>
                </div>
                <div>
                  <p className="opacity-90 mb-1">Longitude</p>
                  <p className="font-mono font-bold text-lg">{driverLocation.longitude.toFixed(4)}</p>
                </div>
                <div>
                  <p className="opacity-90 mb-1">Speed</p>
                  <p className="font-bold text-lg">{driverLocation.speed ? `${driverLocation.speed.toFixed(0)} km/h` : 'Stationary'}</p>
                </div>
                <div>
                  <p className="opacity-90 mb-1">Last Update</p>
                  <p className="font-bold text-lg">{getTimeSinceUpdate()}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <a
                  href={`https://www.google.com/maps?q=${driverLocation.latitude},${driverLocation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 bg-white text-green-600 rounded-xl font-bold text-center hover:bg-gray-100 transition"
                >
                  📍 View Driver Location
                </a>

                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${driverLocation.latitude},${driverLocation.longitude}&destination=${encodeURIComponent(order.dropoff_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 bg-white text-green-600 rounded-xl font-bold text-center hover:bg-gray-100 transition"
                >
                  🗺️ View Route to You
                </a>
              </div>
            </div>

            <div className="text-center mb-6">
              <p className="text-sm text-gray-600">
                ℹ️ Last refreshed: {lastUpdate?.toLocaleTimeString() || 'Never'}
              </p>
            </div>
          </>
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📦 Delivery Details</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600 mb-1">Parcel Size</p>
              <p className="font-bold text-gray-900 capitalize">{order.parcel_size}</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Weight</p>
              <p className="font-bold text-gray-900">{order.parcel_weight} kg</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Service</p>
              <p className="font-bold text-gray-900 capitalize">{order.service_type.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Price</p>
              <p className="font-bold text-gray-900">${order.price}</p>
            </div>
          </div>

          {order.notes && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
              <p className="text-xs font-bold text-yellow-900 mb-1">Delivery Instructions</p>
              <p className="text-sm text-yellow-800">{order.notes}</p>
            </div>
          )}
        </div>

        {driver && (
          <div className="mt-6">
            <a
              href={`tel:${driver.phone}`}
              className="block w-full py-4 bg-blue-500 text-white rounded-xl font-bold text-lg text-center hover:bg-blue-600 transition"
            >
              📞 Call Driver
            </a>
          </div>
        )}
      </main>
    </div>
  );
}