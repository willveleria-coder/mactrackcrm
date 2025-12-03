"use client";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Gradient Background - Same as dashboards */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff]" />
      
      {/* Animated Blobs */}
      <div className="absolute w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl top-[-200px] left-[-150px] animate-pulse" />
      <div className="absolute w-[600px] h-[600px] bg-red-500/10 rounded-full blur-3xl bottom-[-200px] right-[-150px] animate-pulse" />
      <div className="absolute w-[400px] h-[400px] bg-purple-500/8 rounded-full blur-3xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      
      {/* Main Card */}
      <div className="relative bg-white/80 backdrop-blur-md shadow-2xl rounded-3xl border border-gray-100 w-full max-w-md mx-4 px-8 sm:px-12 py-12 z-10">
        
        {/* Logo/Header */}
        <div className="text-center mb-10">
          <div className="inline-block mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-110 transition">
              <span className="text-4xl">🚚</span>
            </div>
          </div>
          <h1 className="text-5xl font-black bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent mb-2 tracking-tight">
            Mac Track
          </h1>
          <p className="text-gray-600 text-sm font-semibold">Professional Courier CRM</p>
        </div>

        {/* Client Section */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 text-center">For Clients</h2>
          <div className="space-y-3">
            <Link
              href="/client-portal/login"
              className="flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl transition shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="text-xl">👤</span>
              <span>Client Login</span>
            </Link>

            <Link
              href="/client-portal/register"
              className="flex items-center justify-center gap-3 w-full py-4 bg-white border-2 border-red-500 hover:bg-red-50 text-red-600 font-bold rounded-xl transition shadow hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="text-xl">📝</span>
              <span>New Client? Sign Up</span>
            </Link>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center my-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          <span className="px-4 text-gray-400 text-xs font-bold uppercase tracking-wider">Or</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
        </div>

        {/* Driver Section */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 text-center">For Drivers</h2>
          <div className="space-y-3">
            <Link
              href="/driver/login"
              className="flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl transition shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="text-xl">🚐</span>
              <span>Driver Login</span>
            </Link>

            <Link
              href="/driver/register"
              className="flex items-center justify-center gap-3 w-full py-4 bg-white border-2 border-blue-500 hover:bg-blue-50 text-blue-600 font-bold rounded-xl transition shadow hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="text-xl">✍️</span>
              <span>New Driver? Sign Up</span>
            </Link>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center my-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          <span className="px-4 text-gray-400 text-xs font-bold uppercase tracking-wider">Admin</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
        </div>

        {/* Admin Button */}
        <Link
          href="/admin/login"
          className="flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white font-bold rounded-xl transition shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="text-xl">🛡️</span>
          <span>Admin Portal</span>
        </Link>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
            <span>🔒</span>
            <p>Secure & Professional Courier Management</p>
          </div>
          <p className="text-center text-gray-400 text-xs mt-3">
            © 2025 Mac Track — All Rights Reserved
          </p>
        </div>
      </div>

      {/* Decorative Corner Elements */}
      <div className="absolute top-10 left-10 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl"></div>
      <div className="absolute bottom-10 right-10 w-20 h-20 bg-red-500/5 rounded-full blur-2xl"></div>
      
      {/* Mobile Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#e8f4ff]/50 to-transparent pointer-events-none"></div>
    </main>
  );
}