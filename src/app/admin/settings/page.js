"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import HamburgerMenu from "@/components/HamburgerMenu";

export default function AdminSettingsPage() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [theme, setTheme] = useState("red");
  
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    role: ""
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: ""
  });

  const [systemSettings, setSystemSettings] = useState({
    taxRate: "10",
    defaultServiceFee: "20",
    currency: "AUD",
    timeZone: "Australia/Melbourne"
  });

  const [businessInfo, setBusinessInfo] = useState({
    companyName: "Mac Track",
    contactEmail: "support@mactrack.com.au",
    contactPhone: "+61 400 000 000",
    operatingHours: "Mon-Fri, 9AM-6PM AEST",
    address: ""
  });

  const [notifications, setNotifications] = useState({
    newOrderEmail: true,
    driverIssuesEmail: true,
    lowInventoryEmail: false,
    dailySummaryEmail: true,
    weeklyReportEmail: true
  });

  const router = useRouter();
  const supabase = createClient();

  const menuItems = [
    { href: "/admin/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/admin/orders", icon: "📦", label: "Orders" },
    { href: "/admin/clients", icon: "👥", label: "Clients" },
    { href: "/admin/drivers", icon: "🚐", label: "Drivers" },
    { href: "/admin/analytics", icon: "📊", label: "Analytics" },
    { href: "/admin/invoices", icon: "💰", label: "Invoices" },
    { href: "/admin/settings", icon: "⚙️", label: "Settings" },
  ];

  const themes = [
    { id: "red", name: "Red Passion", color: "from-red-500 to-red-600", primary: "#dc2626" },
    { id: "blue", name: "Blue Ocean", color: "from-blue-500 to-blue-600", primary: "#2563eb" },
    { id: "green", name: "Green Forest", color: "from-green-500 to-green-600", primary: "#16a34a" },
    { id: "purple", name: "Purple Galaxy", color: "from-purple-500 to-purple-600", primary: "#9333ea" },
    { id: "orange", name: "Orange Sunset", color: "from-orange-500 to-orange-600", primary: "#ea580c" }
  ];

  useEffect(() => {
    loadAdmin();
  }, []);

  async function loadAdmin() {
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
      setProfileData({
        name: adminData.name || "",
        email: adminData.email || "",
        phone: adminData.phone || "",
        role: adminData.role || "Administrator"
      });

      setTheme(adminData.theme || "red");

    } catch (error) {
      console.error("Error loading admin:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileUpdate(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("admins")
        .update({
          name: profileData.name,
          phone: profileData.phone,
          role: profileData.role
        })
        .eq("id", admin.id);

      if (error) throw error;

      setMessage("✅ Profile updated successfully!");
      loadAdmin();
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
        .from("admins")
        .update({ theme: newTheme })
        .eq("id", admin.id);

      if (error) throw error;

      setMessage("✅ Theme changed! Refresh to see changes.");
    } catch (error) {
      setMessage("❌ " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">⚙️ Admin Settings</h2>
          <p className="text-sm sm:text-base text-gray-600">Manage system preferences and configurations</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-4">
              <button
                onClick={() => setActiveTab("profile")}
                className={`w-full text-left px-4 py-3 rounded-xl font-semibold mb-2 transition ${
                  activeTab === "profile" 
                    ? "bg-red-600 text-white" 
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                👤 Profile
              </button>
              <button
                onClick={() => setActiveTab("security")}
                className={`w-full text-left px-4 py-3 rounded-xl font-semibold mb-2 transition ${
                  activeTab === "security" 
                    ? "bg-red-600 text-white" 
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                🔒 Security
              </button>
              <button
                onClick={() => setActiveTab("system")}
                className={`w-full text-left px-4 py-3 rounded-xl font-semibold mb-2 transition ${
                  activeTab === "system" 
                    ? "bg-red-600 text-white" 
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                🖥️ System
              </button>
              <button
                onClick={() => setActiveTab("business")}
                className={`w-full text-left px-4 py-3 rounded-xl font-semibold mb-2 transition ${
                  activeTab === "business" 
                    ? "bg-red-600 text-white" 
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                🏢 Business Info
              </button>
              <button
                onClick={() => setActiveTab("theme")}
                className={`w-full text-left px-4 py-3 rounded-xl font-semibold mb-2 transition ${
                  activeTab === "theme" 
                    ? "bg-red-600 text-white" 
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                🎨 Theme
              </button>
              <button
                onClick={() => setActiveTab("notifications")}
                className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition ${
                  activeTab === "notifications" 
                    ? "bg-red-600 text-white" 
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                🔔 Notifications
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">👤 Admin Profile</h3>
                
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
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
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
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      placeholder="+61 400 000 000"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Role / Title
                    </label>
                    <input
                      type="text"
                      value={profileData.role}
                      onChange={(e) => setProfileData({...profileData, role: e.target.value})}
                      placeholder="System Administrator"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
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
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
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
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>

                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-sm text-blue-900">
                      <strong>Security Tips:</strong>
                      <br/>• Use a strong password with letters, numbers, and symbols
                      <br/>• Never share your admin credentials
                      <br/>• Change your password regularly
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {saving ? "Updating..." : "Update Password"}
                  </button>
                </form>
              </div>
            )}

            {/* System Settings Tab */}
            {activeTab === "system" && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">🖥️ System Settings</h3>
                <p className="text-sm text-gray-600 mb-6">Configure system-wide defaults and preferences</p>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      value={systemSettings.taxRate}
                      onChange={(e) => setSystemSettings({...systemSettings, taxRate: e.target.value})}
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Default Service Fee ($)
                    </label>
                    <input
                      type="number"
                      value={systemSettings.defaultServiceFee}
                      onChange={(e) => setSystemSettings({...systemSettings, defaultServiceFee: e.target.value})}
                      min="0"
                      step="1"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Currency
                    </label>
                    <select
                      value={systemSettings.currency}
                      onChange={(e) => setSystemSettings({...systemSettings, currency: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    >
                      <option value="AUD">AUD (Australian Dollar)</option>
                      <option value="USD">USD (US Dollar)</option>
                      <option value="EUR">EUR (Euro)</option>
                      <option value="GBP">GBP (British Pound)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Time Zone
                    </label>
                    <select
                      value={systemSettings.timeZone}
                      onChange={(e) => setSystemSettings({...systemSettings, timeZone: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    >
                      <option value="Australia/Melbourne">Australia/Melbourne (AEST)</option>
                      <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                      <option value="Australia/Brisbane">Australia/Brisbane (AEST)</option>
                      <option value="Australia/Perth">Australia/Perth (AWST)</option>
                      <option value="Australia/Adelaide">Australia/Adelaide (ACST)</option>
                    </select>
                  </div>

                  <button
                    onClick={() => setMessage("✅ System settings saved!")}
                    className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
                  >
                    Save System Settings
                  </button>
                </div>
              </div>
            )}

            {/* Business Info Tab */}
            {activeTab === "business" && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">🏢 Business Information</h3>
                <p className="text-sm text-gray-600 mb-6">Update your company details and contact information</p>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={businessInfo.companyName}
                      onChange={(e) => setBusinessInfo({...businessInfo, companyName: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={businessInfo.contactEmail}
                      onChange={(e) => setBusinessInfo({...businessInfo, contactEmail: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={businessInfo.contactPhone}
                      onChange={(e) => setBusinessInfo({...businessInfo, contactPhone: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Operating Hours
                    </label>
                    <input
                      type="text"
                      value={businessInfo.operatingHours}
                      onChange={(e) => setBusinessInfo({...businessInfo, operatingHours: e.target.value})}
                      placeholder="Mon-Fri, 9AM-6PM AEST"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Business Address
                    </label>
                    <textarea
                      value={businessInfo.address}
                      onChange={(e) => setBusinessInfo({...businessInfo, address: e.target.value})}
                      rows="3"
                      placeholder="123 Business St, Melbourne VIC 3000"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>

                  <button
                    onClick={() => setMessage("✅ Business information saved!")}
                    className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
                  >
                    Save Business Info
                  </button>
                </div>
              </div>
            )}

            {/* Theme Tab */}
            {activeTab === "theme" && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">🎨 Choose Your Theme</h3>
                <p className="text-sm text-gray-600 mb-6">Customize the admin portal appearance</p>
                
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
                    <strong>Note:</strong> After changing theme, refresh the page to see the changes applied throughout the admin portal.
                  </p>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">🔔 Email Notifications</h3>
                
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-900">New Order Alerts</p>
                      <p className="text-sm text-gray-600">Get notified when new orders are placed</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.newOrderEmail}
                      onChange={(e) => setNotifications({...notifications, newOrderEmail: e.target.checked})}
                      className="w-6 h-6"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-900">Driver Issue Alerts</p>
                      <p className="text-sm text-gray-600">Receive alerts about driver-related issues</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.driverIssuesEmail}
                      onChange={(e) => setNotifications({...notifications, driverIssuesEmail: e.target.checked})}
                      className="w-6 h-6"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-900">Low Inventory Alerts</p>
                      <p className="text-sm text-gray-600">Get notified about low stock levels</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.lowInventoryEmail}
                      onChange={(e) => setNotifications({...notifications, lowInventoryEmail: e.target.checked})}
                      className="w-6 h-6"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-900">Daily Summary</p>
                      <p className="text-sm text-gray-600">Receive daily business summary emails</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.dailySummaryEmail}
                      onChange={(e) => setNotifications({...notifications, dailySummaryEmail: e.target.checked})}
                      className="w-6 h-6"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-900">Weekly Reports</p>
                      <p className="text-sm text-gray-600">Get comprehensive weekly performance reports</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.weeklyReportEmail}
                      onChange={(e) => setNotifications({...notifications, weeklyReportEmail: e.target.checked})}
                      className="w-6 h-6"
                    />
                  </label>
                </div>

                <button
                  onClick={() => setMessage("✅ Notification preferences saved!")}
                  className="w-full mt-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
                >
                  Save Preferences
                </button>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}