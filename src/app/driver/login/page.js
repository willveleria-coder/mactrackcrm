"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";

export default function DriverLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", data.user.id)
        .single();

      if (driverError || !driverData) {
        await supabase.auth.signOut();
        throw new Error("Access denied. Driver account not found.");
      }

      router.push("/driver/dashboard");
    } catch (err) {
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-black text-[#0072ab] mb-2">
            MAC WITH A VAN
          </h1>
          <p className="text-base sm:text-lg text-gray-600">Driver Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-8 border border-gray-100">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 text-center">
            Welcome Back 🚐
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl">
              <p className="text-red-700 text-sm font-semibold">❌ {error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-base font-bold text-gray-700 mb-3">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-5 py-4 text-base border-2 border-gray-300 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-[#0072ab] transition"
                required
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-base font-bold text-gray-700 mb-3">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-5 py-4 text-base border-2 border-gray-300 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-[#0072ab] transition"
                required
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-[#0072ab] to-[#005d8c] text-white rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:from-[#005d8c] hover:to-[#004d73] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? "Logging in..." : "Login →"}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              New driver?{' '}
              <Link 
                href="/driver/register" 
                className="font-bold text-[#0072ab] hover:text-[#005d8c] underline"
              >
                Apply here
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Powered by Mac Track
        </p>
      </div>
    </div>
  );
}