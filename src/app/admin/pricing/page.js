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

  const [pricing, setPricing] = useState({
    distanceRate: 1.90,
    weightRate: 2.70,
    fuelLevy: 10,
    gst: 10,
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { router.push("/admin/login"); return; }

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
        setPricing(settingsData.value);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
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

        {/* After Hours Special */}
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-yellow-800 mb-2">🌙 After Hours Pricing</h2>
          <p className="text-sm text-yellow-700 mb-4">
            After Hours uses special flat-rate pricing: <strong>$150</strong> for first 10km, then <strong>$1.70</strong> per km after.
          </p>
          <p className="text-xs text-yellow-600">
            This is configured separately in the system code.
          </p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-black text-lg hover:from-red-600 hover:to-red-700 transition shadow-xl disabled:opacity-50"
        >
          {saving ? "Saving..." : "💾 Save Pricing Settings"}
        </button>

      </main>
    </div>
  );
}
