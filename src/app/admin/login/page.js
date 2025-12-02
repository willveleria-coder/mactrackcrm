"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Verify user is an admin
      const { data: { user } } = await supabase.auth.getUser();
      const { data: admin } = await supabase
        .from("admins")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!admin) {
        await supabase.auth.signOut();
        throw new Error("This account is not registered as an admin");
      }

      router.push("/admin/dashboard");
      router.refresh();
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff]" />
      
      <div className="absolute w-[500px] h-[500px] bg-[#0072ab]/10 rounded-full blur-3xl top-[-150px] left-[-100px] animate-pulse" />
      <div className="absolute w-[500px] h-[500px] bg-[#ba0606]/12 rounded-full blur-3xl bottom-[-150px] right-[-100px] animate-pulse" />
      
      <div className="relative bg-white/90 backdrop-blur-md shadow-2xl rounded-2xl border border-gray-100/50 w-[460px] max-w-[90vw] px-12 py-12 z-10">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-[#ba0606] tracking-tight mb-2">
            Admin Login
          </h1>
          <p className="text-sm text-gray-600">Access the admin dashboard</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 text-center font-medium">⚠️ {error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@mactrack.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ba0606] focus:border-transparent transition"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ba0606] focus:border-transparent transition"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-white font-bold bg-gradient-to-r from-[#ba0606] to-[#8f0404] hover:shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          <span className="text-xs text-gray-400 font-medium">ADMIN PORTAL</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
        </div>

        <Link 
          href="/" 
          className="block text-center text-sm text-gray-500 hover:text-gray-700 transition"
        >
          ← Back to Home
        </Link>
      </div>

      <div className="absolute top-8 left-8 w-20 h-20 bg-[#0072ab]/5 rounded-full blur-xl"></div>
      <div className="absolute bottom-8 right-8 w-16 h-16 bg-[#ba0606]/5 rounded-full blur-xl"></div>
    </main>
  );
}