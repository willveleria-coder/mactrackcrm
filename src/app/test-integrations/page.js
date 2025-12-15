"use client";
import { useState } from "react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import StripePaymentForm from "@/components/StripePaymentForm";

export default function IntegrationTestPage() {
  // Google Maps Test State
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [addressData, setAddressData] = useState(null);

  // Stripe Test State
  const [showPayment, setShowPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [testAmount, setTestAmount] = useState(100); // $1.00 in cents

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black text-gray-900 mb-2 text-center">
          🧪 Integration Test Page
        </h1>
        <p className="text-gray-600 text-center mb-10">
          Test Google Maps & Stripe integrations
        </p>

        {/* Google Maps Test */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl">🗺️</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Google Maps Autocomplete</h2>
              <p className="text-sm text-gray-500">Test address autocomplete</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📍 Pickup Address
              </label>
              <AddressAutocomplete
                value={pickupAddress}
                onChange={setPickupAddress}
                onSelect={(data) => setAddressData(data)}
                placeholder="Start typing an Australian address..."
                restrictToAustralia={true}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                🎯 Delivery Address
              </label>
              <AddressAutocomplete
                value={deliveryAddress}
                onChange={setDeliveryAddress}
                placeholder="Start typing an Australian address..."
                restrictToAustralia={true}
              />
            </div>

            {/* Show selected address data */}
            {addressData && (
              <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                <p className="text-sm font-bold text-green-800 mb-2">✅ Address Selected:</p>
                <p className="text-sm text-gray-900 font-semibold">{addressData.fullAddress}</p>
                {addressData.lat && addressData.lng && (
                  <p className="text-xs text-gray-500 mt-1">
                    Coordinates: {addressData.lat.toFixed(6)}, {addressData.lng.toFixed(6)}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500">
              <strong>Status:</strong> {typeof window !== 'undefined' && window.google ? '✅ Google Maps Loaded' : '⏳ Loading...'}
            </p>
          </div>
        </div>

        {/* Stripe Test */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-xl">💳</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Stripe Payments</h2>
              <p className="text-sm text-gray-500">Test payment processing</p>
            </div>
          </div>

          {!showPayment && !paymentSuccess && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Warning:</strong> These are LIVE Stripe keys. Any payment will be a real charge!
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Test Amount (cents)
                </label>
                <input
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(parseInt(e.target.value) || 100)}
                  min="50"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 50 cents ($0.50). Current: ${(testAmount / 100).toFixed(2)} AUD
                </p>
              </div>

              <button
                onClick={() => setShowPayment(true)}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-purple-600 hover:to-purple-700 transition"
              >
                💳 Test Payment (${(testAmount / 100).toFixed(2)})
              </button>

              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-blue-800 font-semibold mb-2">Test Card Numbers:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>✅ Success: <code className="bg-white px-2 py-0.5 rounded">4242 4242 4242 4242</code></li>
                  <li>❌ Decline: <code className="bg-white px-2 py-0.5 rounded">4000 0000 0000 0002</code></li>
                  <li>📅 Any future expiry, any 3-digit CVC, any postal code</li>
                </ul>
              </div>
            </div>
          )}

          {showPayment && !paymentSuccess && (
            <StripePaymentForm
              amount={testAmount}
              orderId="test-order-123"
              customerEmail="test@example.com"
              onSuccess={(intent) => {
                console.log("Payment successful:", intent);
                setPaymentSuccess(true);
                setShowPayment(false);
              }}
              onError={(error) => {
                console.error("Payment error:", error);
              }}
              onCancel={() => setShowPayment(false)}
            />
          )}

          {paymentSuccess && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h3>
              <p className="text-gray-600 mb-6">
                The test payment of ${(testAmount / 100).toFixed(2)} was processed.
              </p>
              <button
                onClick={() => {
                  setPaymentSuccess(false);
                  setShowPayment(false);
                }}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
              >
                Test Another Payment
              </button>
            </div>
          )}
        </div>

        {/* API Keys Status */}
        <div className="mt-8 bg-gray-900 text-white rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4">🔑 API Keys Status</h3>
          <div className="space-y-2 text-sm font-mono">
            <p>
              Google Maps: {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 
                <span className="text-green-400">✅ Configured</span> : 
                <span className="text-red-400">❌ Missing</span>}
            </p>
            <p>
              Stripe PK: {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 
                <span className="text-green-400">✅ Configured (Live)</span> : 
                <span className="text-red-400">❌ Missing</span>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}