"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function HamburgerMenu({ items = [], onLogout, userName, userRole, onMenuToggle }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Notify parent when menu state changes
  const toggleMenu = (newState) => {
    setIsOpen(newState);
    if (onMenuToggle) {
      onMenuToggle(newState);
    }
  };

  // Close menu when route changes
  useEffect(() => {
    toggleMenu(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      // Get scrollbar width before hiding it
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      // Add padding to prevent layout shift when scrollbar disappears
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0px';
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0px';
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block">
      {/* Hamburger Button - Fixed position when open to prevent shift */}
      <button
        onClick={() => toggleMenu(!isOpen)}
        className={`w-10 h-10 rounded-lg bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center shadow-lg ${
          isOpen ? 'fixed top-4 right-4 sm:right-6 z-[100000] sm:relative sm:top-auto sm:right-auto' : 'relative z-[10000]'
        } ${isOpen ? 'sm:block hidden' : ''}`}
        aria-label="Menu"
      >
        {!isOpen ? (
          // Hamburger Icon - centered at 10,10
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <line x1="4" y1="6" x2="16" y2="6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="4" y1="10" x2="16" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="4" y1="14" x2="16" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          // X Icon - centered at 10,10
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <line x1="6" y1="6" x2="14" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="14" y1="6" x2="6" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {/* Full Screen Overlay Menu - Mobile Only */}
      {isOpen && (
        <>
          {/* Invisible backdrop for desktop click-outside - doesn't dim page */}
          <div 
            className="hidden sm:block fixed inset-0 z-[90]"
            onClick={() => toggleMenu(false)}
          />

          {/* Mobile Full Screen */}
          <div className="sm:hidden fixed inset-0 z-[99999]">
            {/* Backdrop - Blocks all interaction */}
            <div 
              className="absolute inset-0 bg-black bg-opacity-50"
              onClick={() => toggleMenu(false)}
            />

            {/* Menu Panel - Mobile - With safe top margin */}
            <div className="fixed right-0 top-16 w-full max-w-sm max-h-[calc(100vh-8rem)] bg-white shadow-2xl z-10 animate-slideIn flex flex-col rounded-l-2xl overflow-hidden">
              {/* Mobile Header */}
              <div className="bg-red-600 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center font-bold border-2 border-white border-opacity-30 text-white">
                    {userName?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{userName || "User"}</p>
                    <p className="text-xs text-white text-opacity-80">{userRole || "User"}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleMenu(false)}
                  className="w-10 h-10 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 flex items-center justify-center text-white font-bold text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 bg-white p-3 overflow-y-auto">
                {items.map((item, index) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={index}
                      href={item.href}
                      onClick={() => toggleMenu(false)}
                      className={`flex items-center gap-3 px-4 py-4 rounded-xl mb-1 ${
                        isActive
                          ? "bg-red-50 text-red-600 font-bold"
                          : "text-gray-700 active:bg-gray-100"
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span>{item.label}</span>
                      {isActive && <span className="ml-auto w-2 h-2 bg-red-600 rounded-full" />}
                    </Link>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 mx-3 bg-white" />

              {/* Logout */}
              <div className="p-3 bg-white">
                <button
                  onClick={() => {
                    toggleMenu(false);
                    onLogout?.();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-4 rounded-xl text-red-600 active:bg-red-100 font-bold"
                >
                  <span className="text-xl">🚪</span>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Dropdown - No Backdrop */}
          <div className="hidden sm:block absolute right-0 top-full mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-[100]">
            {/* User Header */}
            <div className="bg-red-600 p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-xl font-bold border-2 border-white border-opacity-30">
                  {userName?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div>
                  <p className="font-bold">{userName || "User"}</p>
                  <p className="text-xs text-white text-opacity-80">{userRole || "User"}</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-3 bg-white">
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
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm">{item.label}</span>
                    {isActive && <span className="ml-auto w-2 h-2 bg-red-600 rounded-full" />}
                  </Link>
                );
              })}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 mx-3 bg-white" />

            {/* Logout */}
            <div className="p-3 bg-white">
              <button
                onClick={() => {
                  toggleMenu(false);
                  onLogout?.();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 font-bold"
              >
                <span className="text-lg">🚪</span>
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Animation CSS */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}