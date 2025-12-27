"use client";
import Link from "next/link";
import Image from "next/image";

export default function OrdersClosedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 max-w-lg w-full text-center border border-gray-100">
        <div className="mb-6">
          <Image src="/bus-icon.png" alt="Mac With A Van" width={80} height={80} className="mx-auto" />
        </div>
        
        <div className="text-6xl mb-6">🕐</div>
        
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">
          Online Booking Closed
        </h1>
        
        <p className="text-gray-600 mb-6">
          Sorry, our online booking portal is only available between <span className="font-bold text-red-600">7:00 AM - 5:00 PM</span>.
        </p>

        {/* Schedule for Tomorrow */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
          <p className="text-blue-800 font-bold mb-2">📅 Want to schedule ahead?</p>
          <p className="text-blue-700 mb-4">Book now for delivery tomorrow or later</p>
          <Link
            href="/client-portal/new-order?bypass=mac123&scheduled=true"
            className="inline-block bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-4 rounded-xl font-black text-lg hover:from-blue-600 hover:to-blue-700 transition shadow-lg"
          >
            📅 Schedule a Booking
          </Link>
        </div>

        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
          <p className="text-red-800 font-bold mb-2">🚨 Need an urgent delivery?</p>
          <p className="text-red-700 mb-4">Call us for after-hours bookings:</p>
          
            href="tel:0430233811"
            className="inline-block bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-4 rounded-xl font-black text-xl hover:from-red-600 hover:to-red-700 transition shadow-lg"
          >
            📞 0430 233 811
          </a>
        </div>
        
        <p className="text-sm text-gray-500 mb-6">
          Or email us at <a href="mailto:macwithavan@mail.com" className="text-red-600 font-bold hover:underline">macwithavan@mail.com</a>
        </p>
        
        <Link
          href="/client-portal/dashboard"
          className="inline-block px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
