"use client";
import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-gray-900">🚐 Mac Track</h1>
            <p className="text-xl text-gray-500 mt-2">System Documentation & Training Guide</p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-black text-red-600 mb-4">📱 Client Portal</h2>
              <div className="bg-gray-50 rounded-xl p-6 space-y-3">
                <p><strong>Login:</strong> /client/login</p>
                <p><strong>Features:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Create new delivery orders with dynamic pricing</li>
                  <li>Track orders in real-time on map</li>
                  <li>View order history and print labels</li>
                  <li>Leave reviews after delivery</li>
                  <li>Earn and redeem loyalty points</li>
                  <li>Chat with admin support</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-black text-blue-600 mb-4">🚗 Driver Portal</h2>
              <div className="bg-gray-50 rounded-xl p-6 space-y-3">
                <p><strong>Login:</strong> /driver/login</p>
                <p><strong>Features:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>View assigned orders</li>
                  <li>Accept or reject orders with reason</li>
                  <li>Toggle on-duty/off-duty status</li>
                  <li>Navigate to pickup/dropoff via Google Maps</li>
                  <li>Upload proof of delivery (photos + signature)</li>
                  <li>View earnings and request payouts</li>
                  <li>Chat with admin support</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-black text-red-600 mb-4">👨‍💼 Admin Portal</h2>
              <div className="bg-gray-50 rounded-xl p-6 space-y-3">
                <p><strong>Login:</strong> /admin/login</p>
                <p><strong>Features:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Dashboard with analytics overview</li>
                  <li>Manage all orders (assign, update status)</li>
                  <li>Manage clients (view, activate/deactivate)</li>
                  <li>Manage drivers (view, approve payouts)</li>
                  <li>Live map showing all driver locations</li>
                  <li>Configure service types and pricing</li>
                  <li>View customer reviews</li>
                  <li>Manage loyalty program</li>
                  <li>Live chat with clients and drivers</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-black text-gray-700 mb-4">🔗 Quick Links</h2>
              <div className="grid grid-cols-3 gap-4">
                <Link href="/client/login" className="bg-red-600 text-white p-4 rounded-xl text-center font-bold hover:bg-red-700">Client Login</Link>
                <Link href="/driver/login" className="bg-blue-600 text-white p-4 rounded-xl text-center font-bold hover:bg-blue-700">Driver Login</Link>
                <Link href="/admin/login" className="bg-gray-800 text-white p-4 rounded-xl text-center font-bold hover:bg-gray-900">Admin Login</Link>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-black text-gray-700 mb-4">📞 Support</h2>
              <div className="bg-gray-50 rounded-xl p-6">
                <p><strong>Phone:</strong> 0430 233 811</p>
                <p><strong>Email:</strong> macwithavan@mail.com</p>
                <p><strong>ABN:</strong> 18 616 164 875</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}