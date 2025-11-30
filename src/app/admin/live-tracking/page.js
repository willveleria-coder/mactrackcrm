"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

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

  useEffect(() => {
    checkAuth();
    const interval = setInterval(loadTrackingData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function checkAuth() {
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
      const { data: driversData } = await supabase
        .from("drivers")
        .select(`
          *,
          location_settings(*)
        `);

      setDrivers(driversData || []);

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
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to load tracking data");
    } finally {
      setLoading(false);
    }
  }

  function getDriverLocation(driverId) {
    return driverLocations.find((loc) => loc.driver_id === driverId);
  }

  function getDriverOrder(driverId) {
    return activeOrders.find((o) => o.driver_id === driverId);
  }

  function isDriverActive(driver) {
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
    (d) => d.location_settings?.[0]?.tracking_enabled
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* NAV */}
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
                <h1 className="text-xl sm:text-2xl font-black text-red-600">
                  Mac Track
                </h1>
                <p className="text-xs text-gray-500">Admin Portal</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard" className="text-sm font-semibold">
                Dashboard
              </Link>
              <Link href="/admin/analytics" className="text-sm font-semibold">
                Analytics
              </Link>
              <Link
                href="/admin/live-tracking"
                className="text-sm font-semibold text-red-600 border-b-2 border-red-600"
              >
                Live Tracking
              </Link>
              <Link href="/admin/orders" className="text-sm font-semibold">
                Orders
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

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold">🗺️ Live Driver Tracking</h2>
            <p className="text-gray-600">Monitor all drivers in real-time</p>
          </div>
          <button
            onClick={loadTrackingData}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition"
          >
            🔄 Refresh
          </button>
        </div>

        {/* MESSAGE */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl ${
              message.includes("❌")
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {message}
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
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

        {/* LAST REFRESH */}
        <div className="text-center mb-6 text-sm text-gray-600">
          🔄 Last updated: {lastRefresh?.toLocaleTimeString() || "Never"} •
          Auto-refresh every 30s
        </div>

        {/* FILTER TABS */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
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
                className={`px-4 py-2 rounded-xl font-bold text-sm ${
                  filterStatus === tab.v
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* DRIVER LIST */}
        <div className="space-y-4">
          {filteredDrivers.length === 0 ? (
            <EmptyDrivers filter={filterStatus} />
          ) : (
            filteredDrivers.map((driver) => {
              const loc = getDriverLocation(driver.id);
              const order = getDriverOrder(driver.id);
              const active = isDriverActive(driver);
              const settings = driver.location_settings?.[0];

              return (
                <div
                  key={driver.id}
                  className={`bg-white rounded-2xl shadow-lg border-2 p-6 ${
                    active ? "border-green-200" : "border-gray-200"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    {/* LEFT */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold">{driver.name}</h3>

                        <StatusBadge active={active} />

                        {!settings?.tracking_enabled && (
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

                    {/* RIGHT BUTTONS */}
                    <div className="flex flex-col gap-2 w-full lg:w-48">
                      {loc && (
                        <a
                          href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 text-center"
                        >
                          📍 View on Map
                        </a>
                      )}

                      <a
                        href={`tel:${driver.phone}`}
                        className="w-full px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 text-center"
                      >
                        📞 Call
                      </a>

                      <button
                        onClick={() => setSelectedDriver(driver)}
                        className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 text-center"
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

      {/* MODAL */}
      {selectedDriver && (
        <DriverModal
          driver={selectedDriver}
          onClose={() => setSelectedDriver(null)}
        />
      )}
    </div>
  );
}

/* COMPONENTS */
function StatCard({ color, label, value, sub }) {
  return (
    <div
      className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white shadow-lg`}
    >
      <p className="text-sm opacity-90">{label}</p>
      <p className="text-4xl font-black">{value}</p>
      <p className="text-xs opacity-75 mt-2">{sub}</p>
    </div>
  );
}

function EmptyDrivers({ filter }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-16 text-center">
      <div className="text-6xl mb-4">🚗</div>
      <p className="text-gray-500 text-lg font-semibold">
        No {filter !== "all" ? filter : ""} drivers found
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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-3">
      <Info label="Vehicle" value={driver.vehicle_type} />
      <Info label="Reg Number" value={driver.vehicle_registration} />

      <Info
        label="Last Update"
        value={getTimeSinceUpdate(loc?.timestamp)}
      />

      <Info label="Status" value={order ? "On Delivery" : "Available"} />
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-gray-600 mb-1">{label}</p>
      <p className="font-semibold text-gray-900 capitalize">{value}</p>
    </div>
  );
}

function LocationBox({ loc }) {
  return (
    <div className="p-3 bg-blue-50 rounded-xl mb-3">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-blue-600 font-semibold">
          Lat:{" "}
          <span className="font-mono text-blue-900 ml-1">
            {loc.latitude.toFixed(6)}
          </span>
        </span>

        <span className="text-blue-600 font-semibold">
          Lng:{" "}
          <span className="font-mono text-blue-900 ml-1">
            {loc.longitude.toFixed(6)}
          </span>
        </span>

        {loc.speed && (
          <span className="text-blue-600 font-semibold">
            Speed:
            <span className="text-blue-900 ml-1">
              {loc.speed.toFixed(0)} km/h
            </span>
          </span>
        )}

        <span className="text-blue-600 font-semibold">
          Accuracy:
          <span className="text-blue-900 ml-1">
            {loc.accuracy?.toFixed(0) || "N/A"} m
          </span>
        </span>
      </div>
    </div>
  );
}

function OrderBox({ order }) {
  return (
    <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
      <p className="text-xs font-bold text-orange-900">
        Active Delivery: #{order.id.slice(0, 8).toUpperCase()}
      </p>
      <p className="text-sm text-orange-700">
        {order.pickup_address} → {order.dropoff_address}
      </p>
    </div>
  );
}

function DriverModal({ driver, onClose }) {
  const settings = driver.location_settings?.[0];

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-8 z-50 w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-2xl font-bold">Driver Details</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <Info label="Name" value={driver.name} />
          <Info label="Phone" value={driver.phone} />
          <Info label="Email" value={driver.email} />
          <Info label="Vehicle Type" value={driver.vehicle_type} />
          <Info label="Registration" value={driver.vehicle_registration} />
          <Info label="License Number" value={driver.license_number} />
        </div>

        {settings && (
          <div className="p-4 bg-blue-50 rounded-xl mt-6">
            <p className="font-bold text-blue-900 mb-2">Location Settings</p>

            <div className="flex justify-between text-sm">
              <span className="text-blue-700">Tracking Enabled:</span>
              <span className="font-semibold text-blue-900">
                {settings.tracking_enabled ? "Yes" : "No"}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-blue-700">Share with Clients:</span>
              <span className="font-semibold text-blue-900">
                {settings.share_with_clients ? "Yes" : "No"}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-blue-700">Update Interval:</span>
              <span className="font-semibold text-blue-900">
                {settings.location_update_interval}s
              </span>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 bg-gray-300 rounded-xl font-bold hover:bg-gray-400 transition"
        >
          Close
        </button>
      </div>
    </>
  );
}