"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

export default function SubmitFeedbackPage({ params }) {
  const [client, setClient] = useState(null);
  const [order, setOrder] = useState(null);
  const [driver, setDriver] = useState(null);
  const [existingFeedback, setExistingFeedback] = useState(null);
  const [formData, setFormData] = useState({
    rating: 5,
    review_text: '',
    service_quality: 5,
    delivery_speed: 5,
    driver_professionalism: 5,
    would_recommend: true,
    is_public: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const orderId = params.orderId;

  useEffect(() => {
    loadOrderAndFeedback();
  }, [orderId]);

  async function loadOrderAndFeedback() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/client-portal/login");
        return;
      }

      const { data: clientData } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!clientData) {
        router.push("/client-portal/login");
        return;
      }

      setClient(clientData);

      // Load order
      const { data: orderData } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .eq("client_id", clientData.id)
        .single();

      if (!orderData) {
        setMessage("❌ Order not found or access denied");
        setLoading(false);
        return;
      }

      setOrder(orderData);

      // Load driver if assigned
      if (orderData.driver_id) {
        const { data: driverData } = await supabase
          .from("drivers")
          .select("name")
          .eq("id", orderData.driver_id)
          .single();

        setDriver(driverData);
      }

      // Check for existing feedback
      const { data: feedbackData } = await supabase
        .from("customer_feedback")
        .select("*")
        .eq("order_id", orderId)
        .single();

      if (feedbackData) {
        setExistingFeedback(feedbackData);
        setFormData({
          rating: feedbackData.rating,
          review_text: feedbackData.review_text || '',
          service_quality: feedbackData.service_quality || 5,
          delivery_speed: feedbackData.delivery_speed || 5,
          driver_professionalism: feedbackData.driver_professionalism || 5,
          would_recommend: feedbackData.would_recommend,
          is_public: feedbackData.is_public
        });
      }

    } catch (error) {
      console.error("Error loading order:", error);
      setMessage("❌ Failed to load order details");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      const feedbackData = {
        order_id: orderId,
        client_id: client.id,
        driver_id: order.driver_id,
        rating: parseInt(formData.rating),
        review_text: formData.review_text || null,
        service_quality: parseInt(formData.service_quality),
        delivery_speed: parseInt(formData.delivery_speed),
        driver_professionalism: parseInt(formData.driver_professionalism),
        would_recommend: formData.would_recommend,
        is_public: formData.is_public
      };

      if (existingFeedback) {
        // Update existing
        const { error } = await supabase
          .from("customer_feedback")
          .update(feedbackData)
          .eq("id", existingFeedback.id);

        if (error) throw error;
        setMessage("✅ Feedback updated successfully!");
      } else {
        // Create new
        const { error } = await supabase
          .from("customer_feedback")
          .insert([feedbackData]);

        if (error) throw error;
        setMessage("✅ Thank you for your feedback!");
      }

      setTimeout(() => {
        router.push("/client-portal/dashboard");
      }, 2000);

    } catch (error) {
      console.error("Error submitting feedback:", error);
      setMessage("❌ Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/client-portal/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-gray-600 text-lg mb-4">Order not found</p>
          <Link href="/client-portal/dashboard" className="text-red-600 font-bold hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const StarRating = ({ value, onChange, name }) => {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange({ target: { name, value: star } })}
            className="text-4xl transition hover:scale-110"
          >
            {star <= value ? '⭐' : '☆'}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image 
                src="/bus-icon.png" 
                alt="Mac Track" 
                width={40} 
                height={40}
                className="object-contain"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-red-600">Mac Track</h1>
                <p className="text-xs text-gray-500">Client Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              <span className="text-sm text-gray-600">👋 {client?.name}</span>
              <Link href="/client-portal/dashboard" className="text-sm font-semibold text-gray-700 hover:text-red-600">
                Dashboard
              </Link>
              <button 
                onClick={handleLogout}
                className="text-sm font-semibold text-gray-700 hover:text-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            ⭐ {existingFeedback ? 'Update Your Feedback' : 'Rate Your Delivery'}
          </h2>
          <p className="text-gray-600">Order #{order.id.slice(0, 8).toUpperCase()}</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <p className="font-semibold">{message}</p>
          </div>
        )}

        {/* Order Info */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Delivery Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">From:</p>
              <p className="font-semibold">{order.pickup_address}</p>
            </div>
            <div>
              <p className="text-gray-600">To:</p>
              <p className="font-semibold">{order.dropoff_address}</p>
            </div>
            {driver && (
              <div>
                <p className="text-gray-600">Driver:</p>
                <p className="font-semibold">{driver.name}</p>
              </div>
            )}
            <div>
              <p className="text-gray-600">Delivered:</p>
              <p className="font-semibold">{order.delivered_at ? new Date(order.delivered_at).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Feedback Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
          <div className="space-y-6">
            {/* Overall Rating */}
            <div>
              <label className="block text-lg font-bold text-gray-900 mb-3">
                Overall Rating *
              </label>
              <StarRating 
                value={formData.rating}
                onChange={(e) => setFormData(prev => ({ ...prev, rating: e.target.value }))}
                name="rating"
              />
            </div>

            {/* Review Text */}
            <div>
              <label className="block text-lg font-bold text-gray-900 mb-3">
                Your Review
              </label>
              <textarea
                value={formData.review_text}
                onChange={(e) => setFormData(prev => ({ ...prev, review_text: e.target.value }))}
                rows={4}
                placeholder="Tell us about your experience..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none"
              />
            </div>

            {/* Detailed Ratings */}
            <div className="border-t-2 border-gray-200 pt-6">
              <h4 className="text-lg font-bold text-gray-900 mb-4">Detailed Ratings</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Service Quality
                  </label>
                  <StarRating 
                    value={formData.service_quality}
                    onChange={(e) => setFormData(prev => ({ ...prev, service_quality: e.target.value }))}
                    name="service_quality"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Delivery Speed
                  </label>
                  <StarRating 
                    value={formData.delivery_speed}
                    onChange={(e) => setFormData(prev => ({ ...prev, delivery_speed: e.target.value }))}
                    name="delivery_speed"
                  />
                </div>

                {driver && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Driver Professionalism
                    </label>
                    <StarRating 
                      value={formData.driver_professionalism}
                      onChange={(e) => setFormData(prev => ({ ...prev, driver_professionalism: e.target.value }))}
                      name="driver_professionalism"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Would Recommend */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.would_recommend}
                onChange={(e) => setFormData(prev => ({ ...prev, would_recommend: e.target.checked }))}
                className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-600"
              />
              <label className="text-sm font-bold text-gray-700">
                I would recommend this service to others
              </label>
            </div>

            {/* Make Public */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
                className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-600"
              />
              <label className="text-sm font-bold text-gray-700">
                Make this review public (visible to others)
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <Link
              href="/client-portal/dashboard"
              className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-50"
            >
              {submitting ? "Submitting..." : existingFeedback ? "Update Feedback" : "Submit Feedback"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}