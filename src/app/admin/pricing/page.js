"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Image from "next/image";
import Link from "next/link";

export default function AdminPricingPage() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Password protection states
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [savedPassword, setSavedPassword] = useState("pricing"); // Default password

  const [pricing, setPricing] = useState({
    distanceRate: 1.90,
    weightRate: 2.70,
    fuelLevy: 10,
    gst: 10,
    afterHoursText: "",
    services: {
      priority: { baseFee: 20, multiplier: 1.70, minimum: 120 },
      after_hours: { baseFee: 20, multiplier: 1.00, minimum: 150 },
      emergency: { baseFee: 10, multiplier: 1.45, minimum: 100 },
      vip: { baseFee: 10, multiplier: 1.25, minimum: 85 },
      standard: { baseFee: 10, multiplier: 1.00, minimum: 65 },
      local_overnight: { baseFee: 10, multiplier: 0.80, minimum: 50 },
      scheduled: { baseFee: 10, multiplier: 0.80, minimum: 50 },
    }
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!session) { router.push("/admin/login"); return; }

      const { data: adminData } = await supabase
        .from("admins").select("*").eq("user_id", user.id).single();
      if (!adminData) { router.push("/admin/login"); return; }
      setAdmin(adminData);

      // Load saved pricing from settings
      const { data: settingsData } = await supabase
        .from("settings")
        .select("*")
        .eq("key", "pricing")
        .single();
      
      if (settingsData?.value) {
        setPricing(prev => ({ ...prev, ...settingsData.value }));
      }

      // Load saved password from settings (synced across pages)
      const { data: passwordData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "lock_password")
        .single();
      
      if (passwordData?.value) {
        setSavedPassword(passwordData.value);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleUnlock() {
    if (passwordInput === savedPassword) {
      setIsUnlocked(true);
      setShowPasswordModal(false);
      setPasswordInput("");
    } else {
      alert("❌ Incorrect password");
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("settings")
        .upsert({ 
          key: "pricing", 
          value: pricing,
          updated_at: new Date().toISOString()
        }, { onConflict: "key" });

      if (error) throw error;
      alert("✅ Pricing saved successfully!");
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  function updateService(service, field, value) {
    setPricing(prev => ({
      ...prev,
      services: {
        ...prev.services,
        [service]: {
          ...prev.services[service],
          [field]: parseFloat(value) || 0
        }
      }
    }));
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
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/bus-icon.png" alt="Mac Track" width={40} height={40} className="object-contain" />
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-red-600">Pricing Settings</h1>
                <p className="text-xs text-gray-500">Manage all pricing rules</p>
              </div>
            </div>
            <Link href="/admin/dashboard" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition">
              ← Back
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        {/* Locked State - Show password prompt */}
        {!isUnlocked ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pricing Settings Locked</h2>
            <p className="text-gray-600 mb-6">Enter password to access and modify pricing settings</p>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition shadow-lg"
            >
              🔑 Unlock Pricing Settings
            </button>
          </div>
        ) : (
          <>
            {/* Lock Button - Show when unlocked */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setIsUnlocked(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition flex items-center gap-2"
              >
                🔒 Lock Page
              </button>
            </div>

            {/* Base Rates */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Base Rates</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Distance (per km)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.10"
                      value={pricing.distanceRate}
                      onChange={(e) => setPricing(prev => ({ ...prev, distanceRate: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-8 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Weight (per kg)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.10"
                      value={pricing.weightRate}
                      onChange={(e) => setPricing(prev => ({ ...prev, weightRate: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-8 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Fuel Levy</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={pricing.fuelLevy}
                      onChange={(e) => setPricing(prev => ({ ...prev, fuelLevy: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-3 pr-8 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">GST</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={pricing.gst}
                      onChange={(e) => setPricing(prev => ({ ...prev, gst: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-3 pr-8 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Service Pricing */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🚚 Service Pricing</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-2 font-bold text-gray-700">Service</th>
                      <th className="text-center py-3 px-2 font-bold text-gray-700">Base Fee</th>
                      <th className="text-center py-3 px-2 font-bold text-gray-700">Multiplier</th>
                      <th className="text-center py-3 px-2 font-bold text-gray-700">Minimum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(pricing.services).map(([key, service]) => (
                      <tr key={key} className="border-b border-gray-100">
                        <td className="py-3 px-2 font-semibold text-gray-900 capitalize">
                          {key.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 px-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                            <input
                              type="number"
                              step="1"
                              value={service.baseFee}
                              onChange={(e) => updateService(key, 'baseFee', e.target.value)}
                              className="w-20 pl-6 pr-2 py-2 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none text-center"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="relative">
                            <input
                              type="number"
                              step="0.05"
                              value={service.multiplier}
                              onChange={(e) => updateService(key, 'multiplier', e.target.value)}
                              className="w-20 px-2 py-2 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none text-center"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">×</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                            <input
                              type="number"
                              step="5"
                              value={service.minimum}
                              onChange={(e) => updateService(key, 'minimum', e.target.value)}
                              className="w-20 pl-6 pr-2 py-2 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none text-center"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-black text-lg hover:from-red-600 hover:to-red-700 transition shadow-xl disabled:opacity-50"
            >
              {saving ? "Saving..." : "💾 Save Pricing Settings"}
            </button>
          </>
        )}

      </main>

      {/* Password Modal */}
      {showPasswordModal && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50" 
            onClick={() => { setShowPasswordModal(false); setPasswordInput(""); }} 
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 z-50 w-11/12 max-w-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🔒 Enter Password</h3>
            <p className="text-sm text-gray-600 mb-4">Enter password to access pricing settings</p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter password..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleUnlock();
                }
              }}
            />
            <div className="flex gap-3">
              <button 
                onClick={() => { setShowPasswordModal(false); setPasswordInput(""); }} 
                className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUnlock}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition"
              >
                Unlock
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}