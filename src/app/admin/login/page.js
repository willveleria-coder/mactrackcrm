"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Image from "next/image";

export default function AdminLoginPage() {
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

      const { data: adminData, error: adminError } = await supabase
        .from("admins")
        .select("*")
        .eq("user_id", data.user.id)
        .single();

      if (adminError || !adminData) {
        await supabase.auth.signOut();
        throw new Error("Access denied. Admin account not found.");
      }

      router.push("/admin/dashboard");
    } catch (err) {
      setError(err.message || "Failed to login");
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
          <h1 className="text-4xl sm:text-5xl font-black text-red-600 mb-2">Mac Track</h1>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-8 border border-gray-100">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 text-center">
            Admin Login 🛡️
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl">
              <p className="text-red-700 text-sm font-semibold">❌ {error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-base font-bold text-gray-700 mb-3">
                Admin Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@mactrack.com"
                className="w-full px-5 py-4 text-base border-2 border-gray-300 rounded-2xl focus:ring-4 focus:ring-red-100 focus:border-red-600 transition"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-base font-bold text-gray-700 mb-3">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-5 py-4 text-base border-2 border-gray-300 rounded-2xl focus:ring-4 focus:ring-red-100 focus:border-red-600 transition"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? "Logging in..." : "Login →"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Powered by Mac Track
        </p>
      </div>
    </div>
  );
}