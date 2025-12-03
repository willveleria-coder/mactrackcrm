"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import Link from "next/link";

export default function AddDriverPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    vehicle_type: "",
    vehicle_plate: "",
    license_number: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Create auth user for the driver
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      // Create driver record
      const { error: driverError } = await supabase
        .from("drivers")
        .insert([
          {
            user_id: authData.user.id,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            vehicle_type: formData.vehicle_type,
            vehicle_plate: formData.vehicle_plate,
            license_number: formData.license_number,
            is_on_duty: false,
          }
        ]);

      if (driverError) throw driverError;

      // Success - redirect to drivers list
      router.push("/admin/drivers");
    } catch (err) {
      console.error("Error creating driver:", err);
      setError(err.message || "Failed to create driver");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff]">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard">
                <h1 className="text-xl sm:text-2xl font-black text-red-600 cursor-pointer hover:text-red-700">
                  Mac Track
                </h1>
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-sm text-gray-600">Add Driver</span>
            </div>
            <Link
              href="/admin/drivers"
              className="text-sm text-gray-600 hover:text-gray-900 font-semibold"
            >
              ← Back to Drivers
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            Add New Driver 🚐
          </h2>
          <p className="text-sm sm:text-base text-gray-600">Create a new driver account</p>
        </div>

        {/* Form Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700">
              <p className="font-semibold">❌ Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-red-500 transition"
                placeholder="John Doe"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-red-500 transition"
                placeholder="driver@example.com"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-red-500 transition"
                placeholder="+61 400 000 000"
              />
            </div>

            {/* Vehicle Type */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Vehicle Type *
              </label>
              <select
                name="vehicle_type"
                value={formData.vehicle_type}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-red-500 transition"
              >
                <option value="">Select vehicle type</option>
                <option value="van">Van</option>
                <option value="truck">Truck</option>
                <option value="car">Car</option>
                <option value="bike">Motorcycle/Bike</option>
              </select>
            </div>

            {/* Vehicle Plate */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Vehicle Plate Number *
              </label>
              <input
                type="text"
                name="vehicle_plate"
                value={formData.vehicle_plate}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-red-500 transition"
                placeholder="ABC123"
              />
            </div>

            {/* License Number */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Driver's License Number *
              </label>
              <input
                type="text"
                name="license_number"
                value={formData.license_number}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-red-500 transition"
                placeholder="DL123456"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-red-500 transition"
                placeholder="Min. 6 characters"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be the driver's login password
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Create Driver"}
              </button>
              <Link
                href="/admin/drivers"
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}