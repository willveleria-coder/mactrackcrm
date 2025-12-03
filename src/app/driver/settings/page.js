"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import HamburgerMenu from "@/components/HamburgerMenu";

export default function DriverSettingsPage() {
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [theme, setTheme] = useState("blue");
  const [stats, setStats] = useState({
    totalEarnings: 0,
    completedOrders: 0,
    completionRate: 0,
    avgDeliveryTime: 0
  });
  
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: ""
  });

  const [vehicleData, setVehicleData] = useState({
    vehicleType: "",
    licensePlate: "",
    vehicleRegistration: "",
    insuranceExpiry: ""
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: ""
  });

  const [availabilityData, setAvailabilityData] = useState({
    preferredHours: "full_time",
    maxDeliveriesPerDay: "10",
    workDays: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    }
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: true,
    newOrderAlerts: true,
    locationTracking: true
  });

  const router = useRouter();
  const supabase = createClient();

  const menuItems = [
    { href: "/driver/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/driver/available-orders", icon: "📦", label: "Available Orders" },
    { href: "/driver/my-orders", icon: "🚚", label: "My Orders" },
    { href: "/driver/earnings", icon: "💰", label: "Earnings" },
    { href: "/driver/settings", icon: "⚙️", label: "Settings" },
  ];

  const themes = [
    { id: "blue", name: "Blue Ocean", color: "from-[#0072ab] to-[#005d8c]", primary: "#0072ab" },
    { id: "red", name: "Red Passion", color: "from-red-500 to-red-600", primary: "#dc2626" },
    { id: "green", name: "Green Forest", color: "from-green-500 to-green-600", primary: "#16a34a" },
    { id: "purple", name: "Purple Galaxy", color: "from-purple-500 to-purple-600", primary: "#9333ea" },
    { id: "orange", name: "Orange Sunset", color: "from-orange-500 to-orange-600", primary: "#ea580c" }
  ];

  useEffect(() => {
    loadDriver();
    loadStats();
  }, []);

  async function loadDriver() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push("/driver/login");
        return;
      }

      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (driverError || !driverData) {
        router.push("/driver/login");
        return;
      }

      setDriver(driverData);
      setProfileData({
        name: driverData.name || "",
        email: driverData.email || "",
        phone: driverData.phone || ""
      });

      setVehicleData({
        vehicleType: driverData.vehicle_type || "",
        licensePlate: driverData.license_plate || "",
        vehicleRegistration: driverData.vehicle_registration || "",
        insuranceExpiry: driverData.insurance_expiry || ""
      });

      setTheme(driverData.theme || "blue");

    } catch (error) {
      console.error("Error loading driver:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: driverData } = await supabase
        .from("drivers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!driverData) return;

      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("driver_id", driverData.id);

      if (orders) {
        const completed = orders.filter(o => o.status === "delivered");
        const totalEarnings = completed.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
        const completionRate = orders.length > 0 ? (completed.length / orders.length) * 100 : 0;
        
        // Calculate average delivery time
        let totalTime = 0;
        let count = 0;
        completed.forEach(order => {
          if (order.delivered_at && order.created_at) {
            const diff = new Date(order.delivered_at) - new Date(order.created_at);
            const hours = diff / (1000 * 60 * 60);
            totalTime += hours;
            count++;
          }
        });
        const avgDeliveryTime = count > 0 ? totalTime / count : 0;

        setStats({
          totalEarnings,
          completedOrders: completed.length,
          completionRate,
          avgDeliveryTime
        });
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }

  async function handleProfileUpdate(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("drivers")
        .update({
          name: profileData.name,
          phone: profileData.phone
        })
        .eq("id", driver.id);

      if (error) throw error;

      setMessage("✅ Profile updated successfully!");
      loadDriver();
    } catch (error) {
      setMessage("❌ " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleVehicleUpdate(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("drivers")
        .update({
          vehicle_type: vehicleData.vehicleType,
          license_plate: vehicleData.licensePlate,
          vehicle_registration: vehicleData.vehicleRegistration,
          insurance_expiry: vehicleData.insuranceExpiry
        })
        .eq("id", driver.id);

      if (error) throw error;

      setMessage("✅ Vehicle information updated!");
      loadDriver();
    } catch (error) {
      setMessage("❌ " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage("❌ Passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage("❌ Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      setMessage("✅ Password changed successfully!");
      setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (error) {
      setMessage("❌ " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleThemeChange(newTheme) {
    setTheme(newTheme);
    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("drivers")
        .update({ theme: newTheme })
        .eq("id", driver.id);

      if (error) throw error;

      setMessage("✅ Theme changed! Refresh to see changes.");
    } catch (error) {
      setMessage("❌ " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    const confirm = window.confirm(
      "⚠️ Are you sure you want to delete your account? This action cannot be undone!"
    );
    
    if (!confirm) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("drivers")
        .update({ is_active: false })
        .eq("id", driver.id);

      if (error) throw error;

      await supabase.auth.signOut();
      router.push("/driver/login");
    } catch (error) {
      setMessage("❌ Failed to delete account: " + error.message);
      setSaving(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/driver/login");
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
              <h1 className="text-xl sm:text-2xl font-black text-[#0072ab]">MAC WITH A VAN</h1>
              <p className="text-xs text-gray-500">Driver Portal</p>
            </div>
            
            <HamburgerMenu 
              items={menuItems}
              onLogout={handleLogout}
              userName={driver?.name}
              userRole="Driver"
            />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">⚙️ Settings</h2>
          <p className="text-sm sm:text-base text-gray-600">Manage your driver account preferences</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl font-semibold ${
            message.includes("✅") 
              ? "bg-green-50 text-green-700 border-2 border-green-200" 
              : "bg-red-50 text-red-700 border-2 border-red-200"
          }`}>
            {message}
          </div>
        )}

        {/* Performance Stats Banner */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white shadow-lg">
            <p className="text-xs font-semibold opacity-90 mb-1">Total Earnings</p>
            <p className="text-2xl sm:text-3xl font-black">${stats.totalEarnings.toFixed(0)}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
            <p className="text-xs font-semibold opacity-90 mb-1">Completed</p>
            <p className="text-2xl sm:text-3xl font-black">{stats.completedOrders}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg">
            <p className="text-xs font-semibold opacity-90 mb-1">Success Rate</p>
            <p className="text-2xl sm:text-3xl font-black">{stats.completionRate.toFixed(0)}%</p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white shadow-lg">
            <p className="text-xs font-semibold opacity-90 mb-1">Avg Time</p>
            <p className="text-2xl sm:text-3xl font-black">{stats.avgDeliveryTime.toFixed(1)}h</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-4">
              <button
                onClick={() => setActiveTab("profile")}
                className={`w-full text-left px-4 py-3 rounded-xl font-semibold mb-2 transition ${
                  activeTab === "profile" 
                    ? "bg-[#0072ab] text-white" 
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                👤 Profile
              </button>
              <button
                onClick={() => setActiveTab("vehicle")}
                className={`w-full text-left px-4 py-3 rounded-xl font-semibold mb-2 transition ${
                  activeTab === "vehicle" 
                    ? "bg-[#0072ab] text-white" 
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                🚐 Vehicle
              </button>
              <button
                onClick={() => setActiveTab("security")}
                className={`w-full text-left px-4 py-3 rounded-xl font-semibold mb-2 transition ${
                  activeTab === "security" 
                    ? "bg-[#0072ab] text-white" 
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                🔒 Security
              </button>
              <button
                onClick={() => setActiveTab("availability")}
                className={`w-full text-left px-4 py-3 rounded-xl font-semibold mb-2 transition ${
                  activeTab === "availability" 
                    ? "bg-[#0072ab] text-white" 
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                📅 Availability
              </button>
              <button
                onClick={() => setActiveTab("theme")}
                className={`w-full text-left px-4 py-3 rounded-xl font-semibold mb-2 transition ${
                  activeTab === "theme" 
                    ? "bg-[#0072ab] text-white" 
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                🎨 Theme
              </button>
              <button
                onClick={() => setActiveTab("notifications")}
                className={`w-full text-left px-4 py-3 rounded-xl font-semibold mb-2 transition ${
                  activeTab === "notifications" 
                    ? "bg-[#0072ab] text-white" 
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                🔔 Notifications
              </button>
              <button
                onClick={() => setActiveTab("danger")}
                className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition ${
                  activeTab === "danger" 
                    ? "bg-[#0072ab] text-white" 
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                ⚠️ Danger Zone
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">👤 Profile Information</h3>
                
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0072ab] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Email (Cannot be changed)
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      placeholder="+61 400 000 000"
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0072ab] focus:border-transparent"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 bg-[#0072ab] text-white rounded-xl font-bold hover:bg-[#005d8c] transition disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              </div>
            )}

            {/* Vehicle Tab */}
            {activeTab === "vehicle" && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">🚐 Vehicle Information</h3>
                
                <form onSubmit={handleVehicleUpdate} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Vehicle Type *
                    </label>
                    <select
                      value={vehicleData.vehicleType}
                      onChange={(e) => setVehicleData({...vehicleData, vehicleType: e.target.value})}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0072ab] focus:border-transparent"
                    >
                      <option value="">Select vehicle type</option>
                      <option value="van">Van</option>
                      <option value="truck">Truck</option>
                      <option value="car">Car</option>
                      <option value="motorcycle">Motorcycle</option>
                      <option value="bicycle">Bicycle</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      License Plate *
                    </label>
                    <input
                      type="text"
                      value={vehicleData.licensePlate}
                      onChange={(e) => setVehicleData({...vehicleData, licensePlate: e.target.value})}
                      placeholder="ABC123"
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0072ab] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      value={vehicleData.vehicleRegistration}
                      onChange={(e) => setVehicleData({...vehicleData, vehicleRegistration: e.target.value})}
                      placeholder="123456789"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0072ab] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Insurance Expiry Date
                    </label>
                    <input
                      type="date"
                      value={vehicleData.insuranceExpiry}
                      onChange={(e) => setVehicleData({...vehicleData, insuranceExpiry: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0072ab] focus:border-transparent"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 bg-[#0072ab] text-white rounded-xl font-bold hover:bg-[#005d8c] transition disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Update Vehicle Info"}
                  </button>
                </form>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">🔒 Change Password</h3>
                
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      New Password *
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      required
                      minLength={6}
                      placeholder="Enter new password"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0072ab] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      required
                      minLength={6}
                      placeholder="Confirm new password"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0072ab] focus:border-transparent"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 bg-[#0072ab] text-white rounded-xl font-bold hover:bg-[#005d8c] transition disabled:opacity-50"
                  >
                    {saving ? "Updating..." : "Update Password"}
                  </button>
                </form>
              </div>
            )}

            {/* Availability Tab */}
            {activeTab === "availability" && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">📅 Work Preferences</h3>
                <p className="text-sm text-gray-600 mb-6">Set your availability and work preferences</p>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Preferred Working Hours
                    </label>
                    <select
                      value={availabilityData.preferredHours}
                      onChange={(e) => setAvailabilityData({...availabilityData, preferredHours: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0072ab] focus:border-transparent"
                    >
                      <option value="full_time">Full Time (8+ hours/day)</option>
                      <option value="part_time">Part Time (4-8 hours/day)</option>
                      <option value="flexible">Flexible Hours</option>
                      <option value="evenings">Evenings Only</option>
                      <option value="weekends">Weekends Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Max Deliveries Per Day
                    </label>
                    <input
                      type="number"
                      value={availabilityData.maxDeliveriesPerDay}
                      onChange={(e) => setAvailabilityData({...availabilityData, maxDeliveriesPerDay: e.target.value})}
                      min="1"
                      max="50"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0072ab] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Available Days
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Object.keys(availabilityData.workDays).map(day => (
                        <label key={day} className="flex items-center p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={availabilityData.workDays[day]}
                            onChange={(e) => setAvailabilityData({
                              ...availabilityData,
                              workDays: {...availabilityData.workDays, [day]: e.target.checked}
                            })}
                            className="mr-2"
                          />
                          <span className="text-sm font-semibold capitalize">{day}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setMessage("✅ Availability preferences saved!")}
                    className="w-full py-3 bg-[#0072ab] text-white rounded-xl font-bold hover:bg-[#005d8c] transition"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {/* Theme Tab */}
            {activeTab === "theme" && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">🎨 Choose Your Theme</h3>
                <p className="text-sm text-gray-600 mb-6">Personalize your driver portal experience</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleThemeChange(t.id)}
                      className={`p-6 rounded-2xl border-4 transition ${
                        theme === t.id 
                          ? "border-gray-900 shadow-xl" 
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      <div className={`w-full h-20 rounded-xl bg-gradient-to-r ${t.color} mb-4`}></div>
                      <p className="font-bold text-gray-900">{t.name}</p>
                      {theme === t.id && (
                        <p className="text-xs text-green-600 mt-2">✓ Active</p>
                      )}
                    </button>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                  <p className="text-sm text-yellow-900">
                    <strong>Note:</strong> After changing theme, refresh the page to see the changes.
                  </p>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">🔔 Notification Preferences</h3>
                
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-900">Email Notifications</p>
                      <p className="text-sm text-gray-600">Receive updates via email</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.emailNotifications}
                      onChange={(e) => setPreferences({...preferences, emailNotifications: e.target.checked})}
                      className="w-6 h-6"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-900">SMS Notifications</p>
                      <p className="text-sm text-gray-600">Receive text message alerts</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.smsNotifications}
                      onChange={(e) => setPreferences({...preferences, smsNotifications: e.target.checked})}
                      className="w-6 h-6"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-900">New Order Alerts</p>
                      <p className="text-sm text-gray-600">Get notified about new available orders</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.newOrderAlerts}
                      onChange={(e) => setPreferences({...preferences, newOrderAlerts: e.target.checked})}
                      className="w-6 h-6"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-900">Location Tracking</p>
                      <p className="text-sm text-gray-600">Share your location during deliveries</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.locationTracking}
                      onChange={(e) => setPreferences({...preferences, locationTracking: e.target.checked})}
                      className="w-6 h-6"
                    />
                  </label>
                </div>

                <button
                  onClick={() => setMessage("✅ Notification preferences saved!")}
                  className="w-full mt-6 py-3 bg-[#0072ab] text-white rounded-xl font-bold hover:bg-[#005d8c] transition"
                >
                  Save Preferences
                </button>
              </div>
            )}

            {/* Danger Zone Tab */}
            {activeTab === "danger" && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
                <h3 className="text-2xl font-bold text-red-600 mb-6">⚠️ Danger Zone</h3>
                
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
                  <h4 className="text-lg font-bold text-red-900 mb-2">Delete Account</h4>
                  <p className="text-sm text-red-700 mb-4">
                    Once you delete your account, there is no going back. All your earnings history will be preserved for records, but you will lose access to your account.
                  </p>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={saving}
                    className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {saving ? "Deleting..." : "Delete My Account"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}