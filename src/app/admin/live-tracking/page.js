"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import HamburgerMenu from "@/components/HamburgerMenu";

export default function AdminLiveTrackingPage() {
  const [admin, setAdmin] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [driverLocations, setDriverLocations] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [lastRefresh, setLastRefresh] = useState(null);
  const [message, setMessage] = useState("");
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
    checkAuth();
    const interval = setInterval(loadTrackingData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function checkAuth() {
    console.log("checkAuth called");
    console.log("checkAuth called");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
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
    loadTrackingData();
  }

  async function loadTrackingData() {
    try {
      const { data: driversData, error: driversError } = await supabase.from("drivers").select("*");
      console.log("Drivers query result:", driversData, driversError);
      setDrivers(driversData || []);
      console.log("Drivers loaded:", driversData);

      const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data: locationsData } = await supabase
        .from("driver_locations")
        .select("*")
        .eq("is_active", true)
        .gte("timestamp", cutoff)
        .order("timestamp", { ascending: false });

      setDriverLocations(locationsData || []);

      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("status", "active");

      setActiveOrders(ordersData || []);

      setLastRefresh(new Date());
      setMessage("");
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to load tracking data");
    } finally {
      setLoading(false);
    }
  }

  function getDriverLocation(driverId) {
    // First check drivers table for current location
    const driver = drivers.find(d => d.id === driverId);
    if (driver?.current_lat && driver?.current_lng) {
      return {
        latitude: driver.current_lat,
        longitude: driver.current_lng,
        timestamp: driver.last_location_update
      };
    }
    // Fallback to driver_locations table
    return driverLocations.find((loc) => loc.driver_id === driverId);
  }

  function getDriverOrder(driverId) {
    return activeOrders.find((o) => o.driver_id === driverId);
  }

  function isDriverActive(driver) {
    // Check drivers table directly first
    if (driver.current_lat && driver.last_location_update) {
      const age = Date.now() - new Date(driver.last_location_update).getTime();
      if (age < 5 * 60 * 1000) return true;
    }
    const loc = getDriverLocation(driver.id);
    if (!loc) return false;
    const age = Date.now() - new Date(loc.timestamp).getTime();
    return age < 5 * 60 * 1000;
  }

  function getTimeSinceUpdate(timestamp) {
    if (!timestamp) return "Never";
    const seconds = Math.floor((Date.now() - new Date(timestamp)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  const filteredDrivers = drivers.filter((d) => {
    if (filterStatus === "active") return isDriverActive(d);
    if (filterStatus === "offline") return !isDriverActive(d);
    return true;
  });

  const activeDriversCount = drivers.filter(isDriverActive).length;
  const trackingEnabledCount = drivers.filter(
    (d) => d.is_on_duty
  ).length;

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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">🗺️ Live Driver Tracking</h2>
            <p className="text-sm sm:text-base text-gray-600">Monitor all drivers in real-time</p>
          </div>
          <button
            onClick={loadTrackingData}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition shadow-lg"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl font-semibold ${
              message.includes("❌")
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-green-50 text-green-700 border border-green-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <StatCard
            color="from-green-500 to-green-600"
            label="Active Drivers"
            value={activeDriversCount}
            sub="Currently online"
          />
          <StatCard
            color="from-blue-500 to-blue-600"
            label="Total Drivers"
            value={drivers.length}
            sub="In fleet"
          />
          <StatCard
            color="from-orange-500 to-orange-600"
            label="Active Deliveries"
            value={activeOrders.length}
            sub="In progress"
          />
          <StatCard
            color="from-purple-500 to-purple-600"
            label="Tracking Enabled"
            value={trackingEnabledCount}
            sub="GPS Active"
          />
        </div>

        {/* Last Refresh */}
        <div className="text-center mb-6 text-sm text-gray-600 bg-white/60 backdrop-blur-sm rounded-xl py-3 border border-gray-100">
          🔄 Last updated: {lastRefresh?.toLocaleTimeString() || "Never"} • Auto-refresh every 30s
        </div>

        {/* Filter Tabs */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {[
              { v: "all", label: "All Drivers", count: drivers.length },
              { v: "active", label: "Active", count: activeDriversCount },
              {
                v: "offline",
                label: "Offline",
                count: drivers.length - activeDriversCount,
              },
            ].map((tab) => (
              <button
                key={tab.v}
                onClick={() => setFilterStatus(tab.v)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition ${
                  filterStatus === tab.v
                    ? "bg-red-600 text-white shadow-lg"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Driver List */}
        <div className="space-y-4">
          {filteredDrivers.length === 0 ? (
            <EmptyDrivers filter={filterStatus} />
          ) : (
            filteredDrivers.map((driver) => {
              const loc = getDriverLocation(driver.id);
              const order = getDriverOrder(driver.id);
              const active = isDriverActive(driver);
              

              return (
                <div
                  key={driver.id}
                  className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-2 p-5 sm:p-6 transition hover:shadow-xl ${
                    active ? "border-green-200" : "border-gray-200"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    {/* Left Side */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900">{driver.name}</h3>
                        <StatusBadge active={active} />
                        {!driver.is_on_duty && (
                          <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                            Tracking Disabled
                          </span>
                        )}
                      </div>

                      <DriverInfo
                        driver={driver}
                        loc={loc}
                        order={order}
                        getTimeSinceUpdate={getTimeSinceUpdate}
                      />

                      {loc && <LocationBox loc={loc} />}
                      {order && <OrderBox order={order} />}
                    </div>

                    {/* Right Side Buttons */}
                    <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-48">
                      {loc && (
                        <a
                          href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 lg:w-full px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 text-center text-sm transition"
                        >
                          📍 View on Map
                        </a>
                      )}

                      <a
                        href={`tel:${driver.phone}`}
                        className="flex-1 lg:w-full px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 text-center text-sm transition"
                      >
                        📞 Call
                      </a>

                      <button
                        onClick={() => setSelectedDriver(driver)}
                        className="flex-1 lg:w-full px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 text-center text-sm transition"
                      >
                        ℹ️ Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Driver Details Modal */}
      {selectedDriver && (
        <DriverModal
          driver={selectedDriver}
          onClose={() => setSelectedDriver(null)}
        />
      )}
    </div>
  );
}

/* Components */
function StatCard({ color, label, value, sub }) {
  return (
    <div
      className={`bg-gradient-to-br ${color} rounded-2xl p-4 sm:p-6 text-white shadow-lg hover:shadow-xl transition transform hover:scale-105`}
    >
      <p className="text-xs sm:text-sm font-semibold opacity-90 mb-1">{label}</p>
      <p className="text-3xl sm:text-4xl font-black mb-1">{value}</p>
      <p className="text-xs opacity-75">{sub}</p>
    </div>
  );
}

function EmptyDrivers({ filter }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-16 text-center">
      <div className="text-6xl mb-4">🚗</div>
      <p className="text-gray-500 text-lg font-semibold">
        No {filter !== "all" ? filter : ""} drivers found
      </p>
      <p className="text-gray-400 text-sm mt-2">
        {filter === "active" ? "No drivers are currently online" : "Try adjusting your filter"}
      </p>
    </div>
  );
}

function StatusBadge({ active }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1 rounded-full font-bold text-xs ${
        active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
      }`}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          active ? "bg-green-500 animate-pulse" : "bg-gray-400"
        }`}
      ></div>
      {active ? "Online" : "Offline"}
    </div>
  );
}

function DriverInfo({ driver, loc, order, getTimeSinceUpdate }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
      <Info label="Vehicle" value={driver.vehicle_type || "N/A"} />
      <Info label="Reg Number" value={driver.vehicle_registration || "N/A"} />
      <Info label="Last Update" value={getTimeSinceUpdate(loc?.timestamp)} />
      <Info label="Status" value={order ? "On Delivery" : "Available"} />
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-gray-600 mb-1 text-xs">{label}</p>
      <p className="font-semibold text-gray-900 capitalize truncate">{value}</p>
    </div>
  );
}

function LocationBox({ loc }) {
  return (
    <div className="p-3 sm:p-4 bg-blue-50 rounded-xl mb-3 border border-blue-200">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs sm:text-sm">
        <div>
          <span className="text-blue-600 font-semibold block mb-1">Latitude</span>
          <span className="font-mono text-blue-900">{loc.latitude.toFixed(6)}</span>
        </div>

        <div>
          <span className="text-blue-600 font-semibold block mb-1">Longitude</span>
          <span className="font-mono text-blue-900">{loc.longitude.toFixed(6)}</span>
        </div>

        {loc.speed !== null && loc.speed !== undefined && (
          <div>
            <span className="text-blue-600 font-semibold block mb-1">Speed</span>
            <span className="text-blue-900">{loc.speed.toFixed(0)} km/h</span>
          </div>
        )}

        <div>
          <span className="text-blue-600 font-semibold block mb-1">Accuracy</span>
          <span className="text-blue-900">{loc.accuracy?.toFixed(0) || "N/A"} m</span>
        </div>
      </div>
    </div>
  );
}

function OrderBox({ order }) {
  return (
    <div className="p-3 sm:p-4 bg-orange-50 rounded-xl border border-orange-200">
      <p className="text-xs font-bold text-orange-900 mb-2">
        🚚 Active Delivery: #{order.id.slice(0, 8).toUpperCase()}
      </p>
      <div className="space-y-1 text-sm">
        <div className="flex items-start gap-2">
          <span className="text-orange-600">📍</span>
          <span className="text-orange-700">{order.pickup_address}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-orange-600">🎯</span>
          <span className="text-orange-700">{order.dropoff_address}</span>
        </div>
      </div>
    </div>
  );
}

function DriverModal({ driver, onClose }) {
  

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      <div className="fixed inset-4 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:inset-auto bg-white rounded-2xl shadow-2xl z-50 sm:w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-black mb-1">Driver Details</h3>
            <p className="text-sm opacity-90">{driver.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Info label="Name" value={driver.name} />
            <Info label="Phone" value={driver.phone || "N/A"} />
            <Info label="Email" value={driver.email} />
            <Info label="Vehicle Type" value={driver.vehicle_type || "N/A"} />
            <Info label="Registration" value={driver.vehicle_registration || "N/A"} />
            <Info label="License Number" value={driver.license_number || "N/A"} />
          </div>

          {settings && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="font-bold text-blue-900 mb-3">📍 Location Settings</p>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Tracking Enabled:</span>
                  <span className="font-semibold text-blue-900">
                    {driver.is_on_duty ? "✅ Yes" : "❌ No"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-blue-700">Share with Clients:</span>
                  <span className="font-semibold text-blue-900">
                    {driver.is_on_duty ? "✅ Yes" : "❌ No"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-blue-700">Update Interval:</span>
                  <span className="font-semibold text-blue-900">
                    30s (default)
                  </span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full mt-6 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}