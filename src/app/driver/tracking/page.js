"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

export default function DriverTrackingPage() {
  const [driver, setDriver] = useState(null);
  const [settings, setSettings] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [stats, setStats] = useState({
    locationsToday: 0,
    lastUpdate: null,
    accuracy: 0
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const watchIdRef = useRef(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadDriverData();
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDriverData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/driver/login");
        return;
      }

      const { data: driverData } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!driverData) {
        router.push("/driver/login");
        return;
      }

      setDriver(driverData);

      const { data: settingsData } = await supabase
        .from("location_settings")
        .select("*")
        .eq("driver_id", driverData.id)
        .single();

      setSettings(settingsData);

      const { data: orderData } = await supabase
        .from("orders")
        .select("*")
        .eq("driver_id", driverData.id)
        .eq("status", "active")
        .single();

      setActiveOrder(orderData);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: historyData } = await supabase
        .from("driver_locations")
        .select("*")
        .eq("driver_id", driverData.id)
        .gte("timestamp", yesterday.toISOString())
        .order("timestamp", { ascending: false })
        .limit(100);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayLocations = historyData?.filter(loc =>
        new Date(loc.timestamp) >= today
      ).length || 0;

      setStats({
        locationsToday: todayLocations,
        lastUpdate: historyData?.[0]?.timestamp || null,
        accuracy: historyData?.[0]?.accuracy || 0
      });

      if (settingsData?.tracking_enabled) {
        startTracking(driverData, orderData);
      }

    } catch (error) {
      console.error("Error loading driver data:", error);
    } finally {
      setLoading(false);
    }
  }

  function startTracking(driverData = driver, orderData = activeOrder) {
    if (!navigator.geolocation) {
      setMessage("❌ Geolocation not supported");
      return;
    }

    if (tracking) return;

    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => handleLocationUpdate(position, driverData, orderData),
      handleLocationError,
      options
    );

    setTracking(true);
    setMessage("✅ Location tracking started");
    setTimeout(() => setMessage(''), 3000);
  }

  function stopTracking() {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    setMessage("⏸️ Location tracking stopped");
    setTimeout(() => setMessage(''), 3000);
  }

  async function handleLocationUpdate(position, driverData, orderData) {
    const locationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      speed: position.coords.speed ? position.coords.speed * 3.6 : null,
      heading: position.coords.heading,
      timestamp: new Date().toISOString()
    };

    setCurrentLocation(locationData);

    try {
      await supabase
        .from("driver_locations")
        .insert([{
          driver_id: driverData.id,
          order_id: orderData?.id || null,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          speed: locationData.speed,
          heading: locationData.heading,
          is_active: true
        }]);

      setStats(prev => ({
        ...prev,
        locationsToday: prev.locationsToday + 1,
        lastUpdate: locationData.timestamp,
        accuracy: locationData.accuracy
      }));

      await supabase
        .from("driver_locations")
        .update({ is_active: false })
        .eq("driver_id", driverData.id)
        .lt("timestamp", new Date(Date.now() - 5 * 60 * 1000).toISOString());

    } catch (error) {
      console.error("Error saving location:", error);
    }
  }

  function handleLocationError(error) {
    let errorMsg = "❌ Location error: ";
    if (error.code === 1) {
      errorMsg += "Please enable location permissions";
    } else if (error.code === 2) {
      errorMsg += "Location information unavailable";
    } else if (error.code === 3) {
      errorMsg += "Location request timed out";
    } else {
      errorMsg += "Unknown error";
    }
    setMessage(errorMsg);
  }

  async function handleToggleSetting(field, value) {
    if (!driver) return;

    try {
      await supabase
        .from("location_settings")
        .update({
          [field]: value,
          updated_at: new Date().toISOString()
        })
        .eq("driver_id", driver.id);

      setSettings(prev => ({ ...prev, [field]: value }));
      setMessage("✅ Settings updated");
      setTimeout(() => setMessage(''), 2000);

      if (field === 'tracking_enabled') {
        if (value) {
          startTracking();
        } else {
          stopTracking();
        }
      }

    } catch (error) {
      console.error("Error updating settings:", error);
      setMessage("❌ Failed to update settings");
    }
  }

  async function handleLogout() {
    stopTracking();
    await supabase.auth.signOut();
    router.push("/driver/login");
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
                <p className="text-xs text-gray-500">Driver Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              <span className="text-sm text-gray-600">👋 {driver?.name}</span>
              <Link href="/driver/dashboard" className="text-sm font-semibold text-gray-700 hover:text-red-600">
                Dashboard
              </Link>
              <Link href="/driver/tracking" className="text-sm font-semibold text-red-600 border-b-2 border-red-600">
                Tracking
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
          <h2 className="text-3xl font-bold text-gray-900 mb-2">📍 Location Tracking</h2>
          <p className="text-gray-600">Manage your GPS tracking settings</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <p className="font-semibold">{message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className={`rounded-2xl p-6 text-white shadow-lg ${tracking ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-gray-500 to-gray-600'}`}>
            <p className="text-sm font-medium opacity-90 mb-1">Tracking Status</p>
            <p className="text-4xl font-black">{tracking ? '🟢 Active' : '🔴 Inactive'}</p>
            <p className="text-xs opacity-75 mt-2">{tracking ? 'Sending location' : 'Not tracking'}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Updates Today</p>
            <p className="text-4xl font-black">{stats.locationsToday}</p>
            <p className="text-xs opacity-75 mt-2">Location points</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Accuracy</p>
            <p className="text-4xl font-black">{stats.accuracy.toFixed(0)}m</p>
            <p className="text-xs opacity-75 mt-2">GPS precision</p>
          </div>
        </div>

        {currentLocation && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📌 Current Location</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1">Latitude</p>
                <p className="font-mono font-bold text-gray-900">{currentLocation.latitude.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Longitude</p>
                <p className="font-mono font-bold text-gray-900">{currentLocation.longitude.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Speed</p>
                <p className="font-bold text-gray-900">{currentLocation.speed ? `${currentLocation.speed.toFixed(1)} km/h` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Last Update</p>
                <p className="font-bold text-gray-900">{new Date(currentLocation.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>

            <div className="mt-4">
              <a
                href={`https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition"
              >
                🗺️ View on Google Maps
              </a>
            </div>
          </div>
        )}

        {activeOrder && (
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl border-2 border-orange-200 p-6 mb-6">
            <h3 className="text-xl font-bold text-orange-900 mb-3">🚚 Active Delivery</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-orange-700 mb-1">Order ID</p>
                <p className="font-bold text-orange-900">#{activeOrder.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div>
                <p className="text-orange-700 mb-1">Pickup</p>
                <p className="font-semibold text-orange-900">{activeOrder.pickup_address}</p>
              </div>
              <div className="col-span-2">
                <p className="text-orange-700 mb-1">Delivery</p>
                <p className="font-semibold text-orange-900">{activeOrder.dropoff_address}</p>
              </div>
            </div>
            <p className="text-xs text-orange-600 mt-3">📍 Your location is being shared with the customer</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">⚙️ Tracking Settings</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-bold text-gray-900">Enable Location Tracking</p>
                <p className="text-sm text-gray-600">Allow the app to track your location</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSetting('tracking_enabled', !settings?.tracking_enabled)}
                className={`w-16 h-8 rounded-full flex items-center transition-colors ${
                  settings?.tracking_enabled ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'
                }`}
              >
                <span className="w-6 h-6 bg-white rounded-full shadow-md mx-1"></span>
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-bold text-gray-900">Share with Clients</p>
                <p className="text-sm text-gray-600">Let customers track your location during deliveries</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSetting('share_with_clients', !settings?.share_with_clients)}
                className={`w-16 h-8 rounded-full flex items-center transition-colors ${
                  settings?.share_with_clients ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'
                }`}
              >
                <span className="w-6 h-6 bg-white rounded-full shadow-md mx-1"></span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {!tracking ? (
            <button
              type="button"
              onClick={() => startTracking()}
              disabled={!settings?.tracking_enabled}
              className="py-4 bg-green-500 text-white rounded-xl font-bold text-lg hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ▶️ Start Tracking
            </button>
          ) : (
            <button
              type="button"
              onClick={stopTracking}
              className="py-4 bg-orange-500 text-white rounded-xl font-bold text-lg hover:bg-orange-600 transition"
            >
              ⏸️ Stop Tracking
            </button>
          )}

          <button
            type="button"
            onClick={loadDriverData}
            className="py-4 bg-blue-500 text-white rounded-xl font-bold text-lg hover:bg-blue-600 transition"
          >
            🔄 Refresh
          </button>
        </div>
      </main>
    </div>
  );
}