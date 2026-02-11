"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Image from "next/image";

export default function ReschedulePage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadOrder();
  }, []);

  async function loadOrder() {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, client:clients(name, email, phone)")
        .eq("id", params.id)
        .single();

      if (error || !data) {
        setError("Order not found");
        return;
      }

      // Only allow rescheduling of failed orders
      if (data.status !== "failed") {
        setError("This order cannot be rescheduled");
        return;
      }

      setOrder(data);
      setContactPhone(data.dropoff_contact_phone || data.walkin_customer_phone || "");
      
      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().split('T')[0]);
      
    } catch (err) {
      console.error("Error loading order:", err);
      setError("Failed to load order details");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!scheduledDate || !scheduledTime) {
      alert("Please select a date and time");
      return;
    }

    setSubmitting(true);

    try {
      // Update the order with new schedule and reset status to pending
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "pending",
          driver_id: null,
          driver_status: null,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime,
          accepted_at: null,
          delivered_at: null,
          notes: order.notes 
            ? `${order.notes}\n\n📅 Rescheduled: ${scheduledDate} ${scheduledTime}${notes ? `\nCustomer notes: ${notes}` : ''}`
            : `📅 Rescheduled: ${scheduledDate} ${scheduledTime}${notes ? `\nCustomer notes: ${notes}` : ''}`,
          dropoff_contact_phone: contactPhone || order.dropoff_contact_phone,
        })
        .eq("id", params.id);

      if (updateError) throw updateError;

      // Send SMS confirmation if phone provided
      if (contactPhone) {
        try {
          const orderNumber = order.order_number || params.id.slice(0, 8).toUpperCase();
          await fetch("/api/send-sms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: contactPhone,
              message: `✅ Your delivery #${orderNumber} has been rescheduled!\n\n📅 New date: ${new Date(scheduledDate).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })}\n⏰ Time: ${scheduledTime}\n\nTrack your delivery:\nhttps://mactrackcrm.vercel.app/track/${params.id}\n\n- Mac With A Van 🚐`
            })
          });
        } catch (e) {
          console.log("SMS error:", e);
        }
      }

      setSuccess(true);
    } catch (err) {
      console.error("Error rescheduling:", err);
      setError("Failed to reschedule. Please try again or contact support.");
    } finally {
      setSubmitting(false);
    }
  }

  // Generate time slots
  const timeSlots = [];
  for (let h = 7; h <= 19; h++) {
    const hour = h > 12 ? h - 12 : h;
    const ampm = h >= 12 ? 'PM' : 'AM';
    timeSlots.push(`${hour}:00 ${ampm}`);
    timeSlots.push(`${hour}:30 ${ampm}`);
  }

  // Get minimum date (tomorrow)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">✅</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-4">Rescheduled!</h1>
          <p className="text-gray-600 mb-6">
            Your delivery has been rescheduled for<br />
            <span className="font-bold text-gray-900">
              {new Date(scheduledDate).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <br />
            <span className="font-bold text-gray-900">at {scheduledTime}</span>
          </p>
          
          {contactPhone && (
            <p className="text-sm text-gray-500 mb-6">
              A confirmation SMS has been sent to {contactPhone}
            </p>
          )}

          <a
            href={`/track/${params.id}`}
            className="block w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-bold text-lg hover:from-red-600 hover:to-red-700 transition shadow-xl"
          >
            Track Your Delivery
          </a>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff]">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/bus-icon.png"
              alt="Mac With A Van"
              width={40}
              height={40}
              className="object-contain"
            />
            <div>
              <h1 className="text-xl font-black text-red-600">MAC WITH A VAN</h1>
              <p className="text-xs text-gray-500">Reschedule Delivery</p>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        {/* Failed Order Notice */}
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-3xl">❌</span>
            <div>
              <h2 className="font-bold text-red-700 mb-1">Delivery Attempt Failed</h2>
              <p className="text-sm text-red-600">
                We were unable to complete your delivery. Please select a new date and time below.
              </p>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 mb-6">
          <h3 className="font-bold text-gray-900 mb-3">Order Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Order #</span>
              <span className="font-bold">{order?.order_number || order?.id?.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Delivery Address</span>
              <span className="font-medium text-right max-w-[60%]">{order?.dropoff_address}</span>
            </div>
            {order?.parcel_size && (
              <div className="flex justify-between">
                <span className="text-gray-500">Package</span>
                <span className="font-medium capitalize">{order.parcel_size?.replace(/_/g, ' ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Reschedule Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-5">📅 Choose New Date & Time</h3>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Date Selection */}
          <div className="mb-5">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Preferred Date *
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={minDateStr}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-lg font-semibold"
            />
          </div>

          {/* Time Selection */}
          <div className="mb-5">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Preferred Time *
            </label>
            <select
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-lg font-semibold"
            >
              <option value="">Select a time</option>
              {timeSlots.map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>

          {/* Contact Phone */}
          <div className="mb-5">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Contact Phone (for SMS updates)
            </label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="04XX XXX XXX"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Additional Notes */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Delivery Instructions (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g., Ring doorbell twice, leave at back door, call on arrival..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl font-black text-lg hover:from-green-600 hover:to-green-700 transition shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Rescheduling..." : "✅ Confirm Reschedule"}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            Need help? Call us at <a href="tel:1300170718" className="text-red-600 font-bold">1300 170 718</a>
          </p>
        </form>
      </main>
    </div>
  );
}