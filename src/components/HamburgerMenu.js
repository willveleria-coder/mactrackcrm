"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function HamburgerMenu({ items = [], onLogout, userName, userRole, onMenuToggle }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = (newState) => {
    setIsOpen(newState);
    if (onMenuToggle) {
      onMenuToggle(newState);
    }
  };

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
    if (onMenuToggle) onMenuToggle(false);
  }, [pathname]);

  return (
    <div className="relative inline-block">
      {/* Hamburger Button */}
      <button
        onClick={() => toggleMenu(!isOpen)}
        className="w-10 h-10 rounded-lg bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center shadow-lg relative z-50"
        aria-label="Menu"
      >
        {!isOpen ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <line x1="4" y1="6" x2="16" y2="6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="4" y1="10" x2="16" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="4" y1="14" x2="16" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <line x1="6" y1="6" x2="14" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="14" y1="6" x2="6" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Invisible backdrop to close menu */}
<div 
  className="fixed inset-0 z-40"
  onClick={() => toggleMenu(false)}
/>

          {/* Menu - Dropdown style for both mobile and desktop */}
          <div className="absolute right-0 top-full mt-2 w-screen max-w-xs sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 max-h-[80vh] overflow-y-auto">
            {/* User Header */}
            <div className="bg-red-600 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold border-2 border-white/30">
                  {userName?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div>
                  <p className="font-bold text-sm">{userName || "User"}</p>
                  <p className="text-xs text-white/80">{userRole || "User"}</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2 bg-white">
              {items.map((item, index) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={index}
                    href={item.href}
                    onClick={() => toggleMenu(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 ${
                      isActive
                        ? "bg-red-50 text-red-600 font-bold"
                        : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm">{item.label}</span>
                    {isActive && <span className="ml-auto w-2 h-2 bg-red-600 rounded-full" />}
                  </Link>
                );
              })}
            </div>

            {/* Logout */}
            <div className="border-t border-gray-200 p-2 bg-white">
              <button
                onClick={() => {
                  toggleMenu(false);
                  onLogout?.();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 active:bg-red-100 font-bold"
              >
                <span className="text-lg">🚪</span>
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}