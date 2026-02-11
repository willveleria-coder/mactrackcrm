"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

export default function DriverRegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    vehicle_type: "van",
    license_plate: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      const { error: driverError } = await supabase
        .from("drivers")
        .insert([{
          user_id: authData.user.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          vehicle_type: formData.vehicle_type,
          license_plate: formData.license_plate,
          is_on_duty: false,
          status: "pending",
          is_approved: false,
        }]);

      if (driverError) throw driverError;

      alert("✅ Application submitted! Please check your email to verify.");
      router.push("/driver/login");
    } catch (err) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/bus-icon.png"
              alt="Mac Track"
              width={60}
              height={60}
              className="object-contain"
            />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-[#0072ab] mb-2">
            MAC WITH A VAN
          </h1>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Join Our Team 🚐</h2>
          <p className="text-gray-600 text-sm mb-6">Apply to become a driver</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl">
              <p className="text-red-700 text-sm font-semibold">❌ {error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-[#0072ab] transition"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-[#0072ab] transition"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-[#0072ab] transition"
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+61 400 000 000"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-[#0072ab] transition"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Vehicle Type
              </label>
              <select
                name="vehicle_type"
                value={formData.vehicle_type}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-[#0072ab] transition"
                disabled={loading}
              >
                <option value="van">Van</option>
                <option value="truck">Truck</option>
                <option value="car">Car</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="bicycle">Bicycle</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                License Plate
              </label>
              <input
                type="text"
                name="license_plate"
                value={formData.license_plate}
                onChange={handleChange}
                placeholder="ABC123"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-[#0072ab] transition"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-[#0072ab] to-[#005d8c] text-white rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:from-[#005d8c] hover:to-[#004d73] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? "Submitting..." : "Submit Application →"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link 
                href="/driver/login" 
                className="font-bold text-[#0072ab] hover:text-[#005d8c] underline"
              >
                Login here
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 underline">← Back to Home</Link>
          </div>
        <p className="text-center text-sm text-gray-500 mt-6">
          Powered by Mac Track
        </p>
      </div>
    </div>
  );
}