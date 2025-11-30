import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-red-600 mb-2">Mac Track</h1>
          <p className="text-gray-500 text-sm mb-6">Courier Services</p>
          <h2 className="text-2xl font-bold text-gray-700 mb-8">Mac Track</h2>
        </div>

        {/* Client Buttons */}
        <div className="space-y-4 mb-6">
          <Link
            href="/client-portal/login"
            className="flex items-center justify-center gap-3 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-lg"
          >
            <span className="text-xl">💼</span>
            Client Login
          </Link>

          <Link
            href="/client-portal/register"
            className="flex items-center justify-center gap-3 w-full py-4 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl transition shadow-lg"
          >
            <span className="text-xl">🚚</span>
            Client Sign Up
          </Link>
        </div>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-4 text-gray-400 text-sm font-semibold">OR</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* Driver Buttons */}
        <div className="space-y-4 mb-6">
          <Link
            href="/driver/login"
            className="flex items-center justify-center gap-3 w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition shadow-lg"
          >
            <span className="text-xl">🚐</span>
            Driver Login
          </Link>

          <Link
            href="/driver/register"
            className="flex items-center justify-center gap-3 w-full py-4 bg-green-700 hover:bg-green-800 text-white font-bold rounded-xl transition shadow-lg"
          >
            <span className="text-xl">📝</span>
            Driver Sign Up
          </Link>
        </div>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-4 text-gray-400 text-sm font-semibold">OR</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* Admin Button */}
        <Link
          href="/admin/login"
          className="flex items-center justify-center gap-3 w-full py-4 bg-white border-2 border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition shadow"
        >
          <span className="text-xl">🛡️</span>
          Admin Login
        </Link>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-8">
          © 2025 Mac Track — Secure Courier CRM
        </p>
      </div>
    </div>
  );
}