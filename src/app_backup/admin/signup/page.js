"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";

export default function AdminSignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role: 'admin' }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: adminError } = await supabase
          .from("admins")
          .insert({
            user_id: authData.user.id,
            name,
            email
          });

        if (adminError) throw adminError;

        router.push("/admin/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff]" />
      
      <div className="absolute w-[500px] h-[500px] bg-[#0072ab]/10 rounded-full blur-3xl top-[-150px] left-[-100px] animate-pulse" />
      <div className="absolute w-[500px] h-[500px] bg-[#ba0606]/12 rounded-full blur-3xl bottom-[-150px] right-[-100px] animate-pulse" />
      
      <div className="relative bg-white/90 backdrop-blur-md shadow-2xl rounded-2xl border border-gray-100/50 w-[500px] max-w-[90vw] px-12 py-10 z-10">
        
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-[#ba0606] tracking-tight mb-2">
            Admin Sign Up
          </h1>
          <p className="text-sm text-gray-600">Create an admin account</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 text-center font-medium">⚠️ {error}</p>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Admin Name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ba0606] focus:border-transparent transition"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@macwithavan.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ba0606] focus:border-transparent transition"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ba0606] focus:border-transparent transition"
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-white font-bold bg-gradient-to-r from-[#ba0606] to-[#8f0404] hover:shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? "Creating account..." : "Create Admin Account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{" "}
          <Link href="/admin/login" className="text-[#0072ab] hover:underline font-semibold">
            Login
          </Link>
        </p>

        <Link href="/" className="block text-center text-xs text-gray-500 hover:text-gray-700 mt-4 transition">
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}