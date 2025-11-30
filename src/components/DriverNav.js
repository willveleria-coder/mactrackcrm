"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function DriverNav({ driver, onLogout, currentPage = "dashboard" }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/driver/dashboard" className="flex items-center gap-3">
            <Image 
              src="/bus-icon.png" 
              alt="Mac With A Van" 
              width={40} 
              height={40}
              className="object-contain"
            />
            <div>
              <h1 className="text-xl font-black text-[#0072ab]">MAC WITH A VAN</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Driver Portal</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <span className="text-sm text-gray-600">👋 {driver?.name}</span>
            <Link 
              href="/driver/dashboard" 
              className={`text-sm font-semibold ${currentPage === 'dashboard' ? 'text-[#0072ab] border-b-2 border-[#0072ab]' : 'text-gray-700 hover:text-[#0072ab]'}`}
            >
              Dashboard
            </Link>
            <Link 
              href="/driver/orders" 
              className={`text-sm font-semibold ${currentPage === 'orders' ? 'text-[#0072ab] border-b-2 border-[#0072ab]' : 'text-gray-700 hover:text-[#0072ab]'}`}
            >
              My Deliveries
            </Link>
            <Link 
              href="/driver/earnings" 
              className={`text-sm font-semibold ${currentPage === 'earnings' ? 'text-[#0072ab] border-b-2 border-[#0072ab]' : 'text-gray-700 hover:text-[#0072ab]'}`}
            >
              Earnings
            </Link>
            <button 
              onClick={onLogout}
              className="text-sm font-semibold text-red-600 hover:text-red-700"
            >
              Logout
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-3">
              <span className="text-sm text-gray-600 px-4">👋 {driver?.name}</span>
              <Link 
                href="/driver/dashboard" 
                className={`px-4 py-2 text-sm font-semibold ${currentPage === 'dashboard' ? 'text-[#0072ab] bg-blue-50' : 'text-gray-700'}`}
                onClick={() => setMenuOpen(false)}
              >
                🏠 Dashboard
              </Link>
              <Link 
                href="/driver/orders" 
                className={`px-4 py-2 text-sm font-semibold ${currentPage === 'orders' ? 'text-[#0072ab] bg-blue-50' : 'text-gray-700'}`}
                onClick={() => setMenuOpen(false)}
              >
                📦 My Deliveries
              </Link>
              <Link 
                href="/driver/earnings" 
                className={`px-4 py-2 text-sm font-semibold ${currentPage === 'earnings' ? 'text-[#0072ab] bg-blue-50' : 'text-gray-700'}`}
                onClick={() => setMenuOpen(false)}
              >
                💰 Earnings
              </Link>
              <button 
                onClick={() => { onLogout(); setMenuOpen(false); }}
                className="text-left px-4 py-2 text-sm font-semibold text-red-600"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}