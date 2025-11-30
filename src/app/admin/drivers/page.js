"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

export default function AdminDriversPage() {
  const [admin, setAdmin] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [filteredDrivers, setFilteredDrivers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewDriverDetails, setViewDriverDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadDrivers();
  }, []);

  useEffect(() => {
    filterDrivers();
  }, [searchQuery, drivers]);

  async function loadDrivers() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
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

      const { data: driversData } = await supabase
        .from("drivers")
        .select("*")
        .order("created_at", { ascending: false });

      setDrivers(driversData || []);
      setFilteredDrivers(driversData || []);
    } catch (error) {
      console.error("Error loading drivers:", error);
    } finally {
      setLoading(false);
    }
  }

  function filterDrivers() {
    if (!searchQuery) {
      setFilteredDrivers(drivers);
      return;
    }

    const filtered = drivers.filter(driver =>
      driver.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.vehicle_plate?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setFilteredDrivers(filtered);
  }

  async function handleToggleActive(driverId, currentStatus) {
    try {
      const { error } = await supabase
        .from("drivers")
        .update({ is_active: !currentStatus })
        .eq("id", driverId);

      if (error) throw error;

      loadDrivers();
      alert(`✅ Driver ${!currentStatus ? "activated" : "deactivated"} successfully!`);
    } catch (error) {
      alert("Failed to update driver: " + error.message);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                <p className="text-xs text-gray-500">Admin Portal</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-6">
              <span className="text-sm text-gray-600">👨‍💼 {admin?.name}</span>
              <Link href="/admin/dashboard" className="text-sm font-semibold text-gray-700 hover:text-red-600">
                Dashboard
              </Link>
              <Link href="/admin/analytics" className="text-sm font-semibold text-gray-700 hover:text-red-600">
                Analytics
              </Link>
              <Link href="/admin/orders" className="text-sm font-semibold text-gray-700 hover:text-red-600">
                Orders
              </Link>
              <Link href="/admin/drivers" className="text-sm font-semibold text-red-600 border-b-2 border-red-600">
                Drivers
              </Link>
              <Link href="/admin/payouts" className="text-sm font-semibold text-gray-700 hover:text-red-600">
                Payouts
              </Link>
              <Link href="/admin/feedback" className="text-sm font-semibold text-gray-700 hover:text-red-600">
                Feedback
              </Link>
              <Link href="/admin/live-tracking" className="text-sm font-semibold text-gray-700 hover:text-red-600">
                Live Tracking
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
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Manage Drivers</h2>
          <p className="text-gray-600">View and manage driver accounts</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="🔍 Search by name, email, or license plate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
            />
            <button 
              onClick={loadDrivers}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {filteredDrivers.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">🚗 No drivers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Name</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Email</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Phone</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Vehicle</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Plate</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Duty</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Status</th>
                    <th className="text-center py-4 px-6 text-xs font-bold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDrivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-gray-50 transition">
                      <td className="py-4 px-6">
                        <button
                          onClick={() => setViewDriverDetails(driver)}
                          className="text-sm font-semibold text-red-600 hover:underline"
                        >
                          {driver.name}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">{driver.email}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{driver.phone || "—"}</td>
                      <td className="py-4 px-6 text-sm text-gray-600 capitalize">{driver.vehicle_type || "—"}</td>
                      <td className="py-4 px-6 text-sm font-mono text-gray-600">{driver.vehicle_plate || "—"}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          driver.is_on_duty 
                            ? "bg-green-100 text-green-700" 
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {driver.is_on_duty ? "On Duty" : "Off Duty"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          driver.is_active 
                            ? "bg-green-100 text-green-700" 
                            : "bg-red-100 text-red-700"
                        }`}>
                          {driver.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleToggleActive(driver.id, driver.is_active)}
                            className={`px-3 py-1 rounded text-xs font-semibold ${
                              driver.is_active
                                ? "bg-red-500 text-white hover:bg-red-600"
                                : "bg-green-500 text-white hover:bg-green-600"
                            }`}
                          >
                            {driver.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {drivers.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">
                Showing <span className="font-bold text-gray-900">{filteredDrivers.length}</span> of{" "}
                <span className="font-bold text-gray-900">{drivers.length}</span> drivers
              </span>
              <div className="flex gap-4">
                <span className="text-gray-600">
                  On Duty: <span className="font-bold text-green-600">{drivers.filter(d => d.is_on_duty).length}</span>
                </span>
                <span className="text-gray-600">
                  Active: <span className="font-bold text-green-600">{drivers.filter(d => d.is_active).length}</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Driver Details Modal */}
      {viewDriverDetails && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setViewDriverDetails(null)}
          />
          <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-6 sm:p-8 z-50 w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Driver Details</h3>
                <p className="text-sm text-gray-500 mt-1">{viewDriverDetails.name}</p>
              </div>
              <button 
                onClick={() => setViewDriverDetails(null)}
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Contact Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-gray-700 mb-3">📞 Contact Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-semibold">{viewDriverDetails.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-semibold">{viewDriverDetails.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-blue-700 mb-3">🚐 Vehicle Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vehicle Type:</span>
                    <span className="font-semibold capitalize">{viewDriverDetails.vehicle_type || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Plate:</span>
                    <span className="font-semibold">{viewDriverDetails.vehicle_plate || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Registration:</span>
                    <span className="font-semibold">{viewDriverDetails.vehicle_registration || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* License & Insurance */}
              <div className="bg-green-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-green-700 mb-3">📋 License & Insurance</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">License Number:</span>
                    <span className="font-semibold">{viewDriverDetails.license_number || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Insurance Type:</span>
                    <span className="font-semibold">{viewDriverDetails.insurance_type || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-gray-700 mb-3">⏰ Current Status</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${viewDriverDetails.is_on_duty ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className="font-semibold">{viewDriverDetails.is_on_duty ? 'On Duty' : 'Off Duty'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${viewDriverDetails.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="font-semibold">{viewDriverDetails.is_active ? 'Active Account' : 'Inactive Account'}</span>
                  </div>
                </div>
              </div>

              {/* Account Details */}
              <div className="bg-purple-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-purple-700 mb-3">📊 Account Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-semibold">{new Date(viewDriverDetails.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Driver ID:</span>
                    <span className="font-mono text-xs">{viewDriverDetails.id.slice(0, 8)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {viewDriverDetails.notes && (
                <div className="bg-yellow-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-2">📝 Notes</h4>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{viewDriverDetails.notes}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setViewDriverDetails(null)}
                className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
              >
                Close
              </button>
              <button 
                onClick={() => handleToggleActive(viewDriverDetails.id, viewDriverDetails.is_active)}
                className={`flex-1 py-3 rounded-xl font-bold transition ${
                  viewDriverDetails.is_active
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-green-500 text-white hover:bg-green-600"
                }`}
              >
                {viewDriverDetails.is_active ? "Deactivate Driver" : "Activate Driver"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}