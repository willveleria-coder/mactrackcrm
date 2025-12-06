"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import HamburgerMenu from "@/components/HamburgerMenu";

export default function ClientSettingsPage() {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    company: ""
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [addressData, setAddressData] = useState({
    defaultPickup: "",
    defaultDropoff: ""
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    orderUpdates: true,
    promotionalEmails: false
  });

  const router = useRouter();
  const supabase = createClient();

  const menuItems = [
    { href: "/client-portal/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/client-portal/orders", icon: "📦", label: "Orders" },
    { href: "/client-portal/new-order", icon: "➕", label: "New Order" },
    { href: "/client-portal/settings", icon: "⚙️", label: "Settings" },
  ];

  useEffect(() => {
    loadClient();
  }, []);

  async function loadClient() {
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
      setProfileData({
        name: clientData.name || "",
        email: clientData.email || "",
        phone: clientData.phone || "",
        company: clientData.company || ""
      });

      // Load saved preferences
      setAddressData({
        defaultPickup: clientData.default_pickup || "",
        defaultDropoff: clientData.default_dropoff || ""
      });

    } catch (error) {
      console.error("Error loading client:", error);
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
        .from("clients")
        .update({
          name: profileData.name,
          phone: profileData.phone,
          company: profileData.company
        })
        .eq("id", client.id);

      if (error) throw error;

      setMessage("✅ Profile updated successfully!");
      loadClient();
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
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      setMessage("❌ " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddressUpdate(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("clients")
        .update({
          default_pickup: addressData.defaultPickup,
          default_dropoff: addressData.defaultDropoff
        })
        .eq("id", client.id);

      if (error) throw error;

      setMessage("✅ Default addresses saved!");
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

    const confirmAgain = window.confirm(
      "⚠️ FINAL WARNING: All your order history will be lost. Type DELETE to confirm."
    );

    if (!confirmAgain) return;

    setSaving(true);

    try {
      // Delete client record (orders will remain for admin records)
      const { error } = await supabase
        .from("clients")
        .update({ is_active: false })
        .eq("id", client.id);

      if (error) throw error;

      await supabase.auth.signOut();
      router.push("/client-portal/login");
    } catch (error) {
      setMessage("❌ Failed to delete account: " + error.message);
      setSaving(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/client-portal/login");
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
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">⚙️ Settings</h2>
          <p className="text-sm sm:text-base text-gray-600">Manage your account preferences</p>
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
                onClick={() => setActiveTab("addresses")}
                className={`w-full text-left px-4 py-3 rounded-xl font-semibold mb-2 transition ${
                  activeTab === "addresses" 
                    ? "bg-red-600 text-white" 
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                📍 Addresses
              </button>
              <button
                onClick={() => setActiveTab("notifications")}
                className={`w-full text-left px-4 py-3 rounded-xl font-semibold mb-2 transition ${
                  activeTab === "notifications" 
                    ? "bg-red-600 text-white" 
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                🔔 Notifications
              </button>
              <button
                onClick={() => setActiveTab("danger")}
                className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition ${
                  activeTab === "danger" 
                    ? "bg-red-600 text-white" 
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
                      Company (Optional)
                    </label>
                    <input
                      type="text"
                      value={profileData.company}
                      onChange={(e) => setProfileData({...profileData, company: e.target.value})}
                      placeholder="Your Company Pty Ltd"
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
                      <strong>Password requirements:</strong>
                      <br/>• Minimum 6 characters
                      <br/>• Consider using a mix of letters, numbers, and symbols
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

            {/* Addresses Tab */}
            {activeTab === "addresses" && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">📍 Default Addresses</h3>
                <p className="text-sm text-gray-600 mb-6">Save time by setting default pickup and delivery addresses</p>
                
                <form onSubmit={handleAddressUpdate} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Default Pickup Address
                    </label>
                    <input
                      type="text"
                      value={addressData.defaultPickup}
                      onChange={(e) => setAddressData({...addressData, defaultPickup: e.target.value})}
                      placeholder="123 Main St, Melbourne VIC 3000"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Default Delivery Address
                    </label>
                    <input
                      type="text"
                      value={addressData.defaultDropoff}
                      onChange={(e) => setAddressData({...addressData, defaultDropoff: e.target.value})}
                      placeholder="456 Business Ave, Sydney NSW 2000"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Addresses"}
                  </button>
                </form>
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
                      <p className="text-sm text-gray-600">Receive text message updates</p>
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
                      <p className="font-bold text-gray-900">Order Updates</p>
                      <p className="text-sm text-gray-600">Get notified about order status changes</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.orderUpdates}
                      onChange={(e) => setPreferences({...preferences, orderUpdates: e.target.checked})}
                      className="w-6 h-6"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-900">Promotional Emails</p>
                      <p className="text-sm text-gray-600">Receive offers and promotions</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.promotionalEmails}
                      onChange={(e) => setPreferences({...preferences, promotionalEmails: e.target.checked})}
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

            {/* Danger Zone Tab */}
            {activeTab === "danger" && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
                <h3 className="text-2xl font-bold text-red-600 mb-6">⚠️ Danger Zone</h3>
                
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
                  <h4 className="text-lg font-bold text-red-900 mb-2">Delete Account</h4>
                  <p className="text-sm text-red-700 mb-4">
                    Once you delete your account, there is no going back. Please be certain.
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