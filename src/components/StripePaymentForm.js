"use client";
import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Payment Form Inner Component
function PaymentFormInner({ amount, orderId, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { error: submitError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/client-portal/orders?payment=success`,
        },
        redirect: "if_required",
      });

      if (submitError) {
        setError(submitError.message);
        if (onError) onError(submitError);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        if (onSuccess) onSuccess(paymentIntent);
      }
    } catch (err) {
      setError(err.message || "Payment failed");
      if (onError) onError(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
        <PaymentElement 
          options={{
            layout: "tabs",
          }}
        />
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <p className="text-red-600 text-sm font-semibold">❌ {error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold text-lg hover:from-green-600 hover:to-green-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Processing...
          </span>
        ) : (
          `💳 Pay $${(amount / 100).toFixed(2)} AUD`
        )}
      </button>

      <p className="text-center text-xs text-gray-500">
        🔒 Secured by Stripe. Your payment info is encrypted.
      </p>
    </form>
  );
}

// Main Payment Form Component with Elements Provider
export default function StripePaymentForm({ 
  amount, // Amount in cents
  orderId,
  customerEmail,
  onSuccess,
  onError,
  onCancel 
}) {
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Create payment intent when component mounts
    async function createPaymentIntent() {
      try {
        const response = await fetch("/api/stripe/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            orderId,
            customerEmail,
            description: `Mac Track Order #${orderId?.slice(0, 8) || "N/A"}`,
          }),
        });

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error("Payment intent error:", err);
        setError(err.message || "Failed to initialize payment");
        if (onError) onError(err);
      } finally {
        setLoading(false);
      }
    }

    if (amount && amount >= 50) {
      createPaymentIntent();
    } else {
      setError("Invalid payment amount");
      setLoading(false);
    }
  }, [amount, orderId, customerEmail]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-semibold">Initializing secure payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Error</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black">Secure Payment</h2>
            <p className="text-sm opacity-90">Mac Track Courier Service</p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-75">Amount Due</p>
            <p className="text-3xl font-black">${(amount / 100).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <div className="p-6">
        {clientSecret && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "#dc2626",
                  colorBackground: "#ffffff",
                  colorText: "#1f2937",
                  colorDanger: "#ef4444",
                  fontFamily: "system-ui, sans-serif",
                  borderRadius: "12px",
                  spacingUnit: "4px",
                },
                rules: {
                  ".Input": {
                    border: "2px solid #e5e7eb",
                    boxShadow: "none",
                  },
                  ".Input:focus": {
                    border: "2px solid #dc2626",
                    boxShadow: "0 0 0 2px rgba(220, 38, 38, 0.2)",
                  },
                },
              },
            }}
          >
            <PaymentFormInner
              amount={amount}
              orderId={orderId}
              onSuccess={onSuccess}
              onError={onError}
            />
          </Elements>
        )}

        {/* Cancel Button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full mt-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
          >
            Cancel Payment
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-center gap-4 text-gray-400">
          <span className="text-xs">Powered by</span>
          <svg width="50" height="20" viewBox="0 0 60 25" fill="currentColor">
            <path d="M5 10.5c0-2.5 1.2-3.7 3.5-3.7 1.5 0 2.5.5 3 1l-.8 1.7c-.4-.3-1-.6-1.8-.6-1 0-1.5.6-1.5 1.6v6h-2.4v-6zm8.5-3.5h2.4v1.3c.6-1 1.6-1.5 2.8-1.5 2.2 0 3.5 1.5 3.5 4v5.2h-2.4v-4.8c0-1.4-.6-2.2-1.8-2.2-1.1 0-2 .8-2 2.2v4.8h-2.5V7zm13 9.3c-2.8 0-4.5-2-4.5-4.8s1.7-4.7 4.5-4.7c2.7 0 4.5 2 4.5 4.7s-1.8 4.8-4.5 4.8zm0-7.5c-1.3 0-2 1-2 2.7s.7 2.8 2 2.8 2-1 2-2.8-.7-2.7-2-2.7z"/>
          </svg>
          <span className="text-xs">|</span>
          <span className="text-xs">256-bit SSL Encryption</span>
        </div>
      </div>
    </div>
  );
}

// Simple payment button that opens modal
export function PayNowButton({ amount, orderId, customerEmail, onSuccess, className = "" }) {
  const [showPayment, setShowPayment] = useState(false);

  if (showPayment) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <StripePaymentForm
            amount={amount}
            orderId={orderId}
            customerEmail={customerEmail}
            onSuccess={(intent) => {
              setShowPayment(false);
              if (onSuccess) onSuccess(intent);
            }}
            onCancel={() => setShowPayment(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowPayment(true)}
      className={`px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-green-700 transition shadow-lg ${className}`}
    >
      💳 Pay ${(amount / 100).toFixed(2)}
    </button>
  );
}