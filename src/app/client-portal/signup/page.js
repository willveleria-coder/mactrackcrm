"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";

export default function ClientSignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });

      if (authError) throw authError;

      // Create client record
      if (authData.user) {
        const { error: clientError } = await supabase
          .from("clients")
          .insert({
            user_id: authData.user.id,
            name,
            email,
            phone,
            company
          });

        if (clientError) throw clientError;

        router.push("/client-portal/dashboard");
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
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff]" />
      
      {/* Subtle animated orbs */}
      <div className="absolute w-[500px] h-[500px] bg-[#0072ab]/10 rounded-full blur-3xl top-[-150px] left-[-100px] animate-pulse" />
      <div className="absolute w-[500px] h-[500px] bg-[#ba0606]/12 rounded-full blur-3xl bottom-[-150px] right-[-100px] animate-pulse" />
      
      {/* Signup form */}
      <div className="relative bg-white/90 backdrop-blur-md shadow-2xl rounded-2xl border border-gray-100/50 w-[520px] max-w-[90vw] px-12 py-10">
        
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-[#ba0606] tracking-tight mb-2">
            Client Sign Up
          </h1>
          <p className="text-sm text-gray-600">Create your courier account</p>
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
              placeholder="John Smith"
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
              placeholder="john@example.com"
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
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0400 000 000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ba0606] focus:border-transparent transition"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Company
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="ABC Pty Ltd"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ba0606] focus:border-transparent transition"
                disabled={loading}
              />
            </div>
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
                Creating account...
              </span>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          <span className="text-xs text-gray-400 font-medium">OR</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
        </div>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link 
            href="/client-portal/login" 
            className="text-[#0072ab] hover:underline font-bold"
          >
            Login
          </Link>
        </p>

        <Link 
          href="/" 
          className="block text-center text-xs text-gray-500 hover:text-gray-700 mt-6 transition"
        >
          ← Back to Home
        </Link>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-8 left-8 w-20 h-20 bg-[#0072ab]/5 rounded-full blur-xl"></div>
      <div className="absolute bottom-8 right-8 w-16 h-16 bg-[#ba0606]/5 rounded-full blur-xl"></div>
    </main>
  );
}