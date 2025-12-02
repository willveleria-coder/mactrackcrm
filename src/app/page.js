import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff]" />
      
      {/* Animated Blobs */}
      <div className="absolute w-[500px] h-[500px] bg-[#0072ab]/10 rounded-full blur-3xl top-[-150px] left-[-100px] animate-pulse" />
      <div className="absolute w-[500px] h-[500px] bg-[#ba0606]/12 rounded-full blur-3xl bottom-[-150px] right-[-100px] animate-pulse" />
      
      {/* Main Card */}
      <div className="relative bg-white/90 backdrop-blur-md shadow-2xl rounded-3xl border border-gray-100/50 w-full max-w-md mx-4 px-8 sm:px-12 py-12 z-10">
        
        {/* Logo/Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black text-red-600 mb-2 tracking-tight">
            Mac Track
          </h1>
          <p className="text-gray-500 text-sm">Courier Services</p>
        </div>

        {/* Client Buttons */}
        <div className="space-y-4 mb-6">
          <Link
            href="/client-portal/login"
            className="flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl transition shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
          >
            <span className="text-xl">💼</span>
            Client Login
          </Link>

          <Link
            href="/client-portal/register"
            className="flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl transition shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
          >
            <span className="text-xl">🚚</span>
            Client Sign Up
          </Link>
        </div>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          <span className="px-4 text-gray-400 text-sm font-semibold">OR</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
        </div>

        {/* Driver Buttons */}
        <div className="space-y-4 mb-6">
          <Link
            href="/driver/login"
            className="flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-xl transition shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
          >
            <span className="text-xl">🚐</span>
            Driver Login
          </Link>

          <Link
            href="/driver/register"
            className="flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-green-700 to-green-800 hover:from-green-800 hover:to-green-900 text-white font-bold rounded-xl transition shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
          >
            <span className="text-xl">📝</span>
            Driver Sign Up
          </Link>
        </div>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          <span className="px-4 text-gray-400 text-sm font-semibold">OR</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
        </div>

        {/* Admin Button */}
        <Link
          href="/admin/login"
          className="flex items-center justify-center gap-3 w-full py-4 bg-white border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 font-bold rounded-xl transition shadow hover:shadow-md"
        >
          <span className="text-xl">🛡️</span>
          Admin Login
        </Link>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-8">
          © 2025 Mac Track — Secure Courier CRM
        </p>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-8 left-8 w-20 h-20 bg-[#0072ab]/5 rounded-full blur-xl"></div>
      <div className="absolute bottom-8 right-8 w-16 h-16 bg-[#ba0606]/5 rounded-full blur-xl"></div>
    </main>
  );
}