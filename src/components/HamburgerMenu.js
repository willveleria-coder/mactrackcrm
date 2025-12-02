"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function HamburgerMenu({ items, onLogout, userName, userRole }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col gap-1.5 w-8 h-8 justify-center items-center z-50 relative"
        aria-label="Menu"
      >
        <span className={`w-7 h-0.5 bg-red-600 transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
        <span className={`w-7 h-0.5 bg-red-600 transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`}></span>
        <span className={`w-7 h-0.5 bg-red-600 transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Menu */}
      <div className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-2xl font-black text-red-600">Mac Track</h2>
              <p className="text-sm text-gray-600 mt-1">👋 {userName}</p>
              <p className="text-xs text-gray-500 capitalize">{userRole}</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 text-3xl font-bold leading-none"
            >
              ×
            </button>
          </div>

          {/* Menu Items */}
          <nav className="space-y-2">
            {items.map((item, idx) => (
              <Link
                key={idx}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-4 rounded-xl hover:bg-gray-100 transition group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">{item.icon}</span>
                <span className="font-semibold text-gray-700 group-hover:text-red-600">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Logout Button */}
          <button
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="w-full mt-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition shadow-lg"
          >
            🚪 Logout
          </button>
        </div>
      </div>
    </>
  );
}