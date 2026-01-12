"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import HamburgerMenu from "@/components/HamburgerMenu";

export default function AdminFeedbackPage() {
  const [admin, setAdmin] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [filterRating, setFilterRating] = useState('all');
  const [viewFeedback, setViewFeedback] = useState(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [responding, setResponding] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const menuItems = [
    { href: "/admin/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/admin/orders", icon: "📦", label: "Orders" },
    { href: "/admin/orders/create", icon: "➕", label: "Create Order" },
    { href: "/admin/clients", icon: "👥", label: "Clients" },
    { href: "/admin/drivers", icon: "🚐", label: "Drivers" },
    { href: "/admin/approvals", icon: "✅", label: "Approvals" },
    { href: "/admin/tracking", icon: "🗺️", label: "Live Tracking" },
    { href: "/admin/analytics", icon: "📊", label: "Analytics" },
    { href: "/admin/invoices", icon: "💰", label: "Invoices" },
    { href: "/admin/payouts", icon: "💸", label: "Payments" },
    { href: "/admin/pricing", icon: "💲", label: "Pricing" },
    { href: "/admin/feedback", icon: "💬", label: "Feedback" },
    { href: "/admin/settings", icon: "⚙️", label: "Settings" },
  ];
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/admin/login");
      return;
    }

    const { data: adminData } = await supabase
      .from("admins")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!adminData) {
      router.push("/admin/login");
      return;
    }

    setAdmin(adminData);
    loadFeedback();
  }

  async function loadFeedback() {
    try {
      const { data: feedbackData } = await supabase
        .from("customer_feedback")
        .select(`
          *,
          orders(id, pickup_address, dropoff_address),
          clients(name, email),
          drivers(name)
        `)
        .order("created_at", { ascending: false });

      setFeedbacks(feedbackData || []);

      const { data: driversData } = await supabase
        .from("drivers")
        .select("*");

      setDrivers(driversData || []);

    } catch (error) {
      console.error("Error loading feedback:", error);
      setMessage("❌ Failed to load feedback");
    } finally {
      setLoading(false);
    }
  }

  async function handleTogglePublic(id, currentStatus) {
    try {
      const { error } = await supabase
        .from("customer_feedback")
        .update({ is_public: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      await loadFeedback();
      setMessage("✅ Visibility updated");
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error("Error toggling visibility:", error);
      setMessage("❌ Failed to update visibility");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this feedback?")) return;

    try {
      const { error } = await supabase
        .from("customer_feedback")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setMessage("✅ Feedback deleted");
      await loadFeedback();
      setViewFeedback(null);
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error("Error deleting feedback:", error);
      setMessage("❌ Failed to delete feedback");
    }
  }

  async function handleRespond(feedbackId) {
    if (!adminResponse.trim()) {
      setMessage("❌ Please enter a response");
      return;
    }

    setResponding(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from("customer_feedback")
        .update({
          admin_response: adminResponse,
          responded_at: new Date().toISOString(),
          responded_by: admin.id
        })
        .eq("id", feedbackId);

      if (error) throw error;

      setMessage("✅ Response posted successfully");
      setAdminResponse('');
      await loadFeedback();
      
      const updatedFeedback = feedbacks.find(f => f.id === feedbackId);
      if (updatedFeedback) {
        setViewFeedback({
          ...updatedFeedback,
          admin_response: adminResponse,
          responded_at: new Date().toISOString()
        });
      }

      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error("Error posting response:", error);
      setMessage("❌ Failed to post response");
    } finally {
      setResponding(false);
    }
  }

  const filteredFeedbacks = filterRating === 'all' 
    ? feedbacks 
    : feedbacks.filter(f => {
        if (filterRating === '5') return f.rating === 5;
        if (filterRating === '4') return f.rating === 4;
        if (filterRating === '3') return f.rating === 3;
        if (filterRating === 'low') return f.rating <= 2;
        return true;
      });

  const renderStars = (rating) => {
    return '⭐'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  };

  const avgRating = feedbacks.length > 0 
    ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length 
    : 0;

  const recommendRate = feedbacks.length > 0
    ? (feedbacks.filter(f => f.would_recommend).length / feedbacks.length) * 100
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/bus-icon.png" alt="Mac Track" width={40} height={40} className="object-contain" />
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-red-600">Mac Track</h1>
                <p className="text-xs text-gray-500">Admin Portal</p>
              </div>
            </div>
            <HamburgerMenu items={menuItems} onLogout={handleLogout} userName={admin?.name} userRole="Admin" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">⭐ Customer Feedback</h2>
          <p className="text-gray-600">Manage reviews and respond to customers</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <p className="font-semibold">{message}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Total Reviews</p>
            <p className="text-4xl font-black">{feedbacks.length}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Average Rating</p>
            <p className="text-4xl font-black">{avgRating.toFixed(1)} ⭐</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Would Recommend</p>
            <p className="text-4xl font-black">{recommendRate.toFixed(0)}%</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Public Reviews</p>
            <p className="text-4xl font-black">{feedbacks.filter(f => f.is_public).length}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'All Reviews' },
              { value: '5', label: '5 Stars' },
              { value: '4', label: '4 Stars' },
              { value: '3', label: '3 Stars' },
              { value: 'low', label: 'Low (≤2)' }
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setFilterRating(filter.value)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition ${
                  filterRating === filter.value
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {filter.label}
                {filter.value !== 'all' && filter.value !== 'low' && ` (${feedbacks.filter(f => f.rating === parseInt(filter.value)).length})`}
                {filter.value === 'low' && ` (${feedbacks.filter(f => f.rating <= 2).length})`}
                {filter.value === 'all' && ` (${feedbacks.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback List */}
        <div className="space-y-4">
          {filteredFeedbacks.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-16 text-center">
              <div className="text-6xl mb-4">⭐</div>
              <p className="text-gray-500 text-lg font-semibold">No feedback yet</p>
            </div>
          ) : (
            filteredFeedbacks.map((feedback) => (
              <div key={feedback.id} className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-6 hover:border-red-600 transition">
                <div className="flex flex-col lg:flex-row lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h4 className="text-lg font-bold text-gray-900">{feedback.clients?.name || 'Customer'}</h4>
                      <span className="text-2xl">{renderStars(feedback.rating)}</span>
                      {!feedback.is_public && (
                        <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-bold rounded-full">
                          PRIVATE
                        </span>
                      )}
                      {feedback.would_recommend && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                          ✓ Recommended
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-gray-600">Order:</p>
                        <p className="font-semibold">#{(feedback.order_id?.slice(0, 8) || 'N/A').toUpperCase()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Driver:</p>
                        <p className="font-semibold">{feedback.drivers?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Date:</p>
                        <p className="font-semibold">{new Date(feedback.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Email:</p>
                        <p className="font-semibold text-xs">{feedback.clients?.email || 'N/A'}</p>
                      </div>
                    </div>

                    {feedback.review_text && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-700">{feedback.review_text}</p>
                      </div>
                    )}

                    <button
                      onClick={() => setViewFeedback(feedback)}
                      className="text-sm text-red-600 hover:underline font-semibold"
                    >
                      View Full Details →
                    </button>
                  </div>

                  <div className="flex lg:flex-col gap-2">
                    <button
                      onClick={() => handleTogglePublic(feedback.id, feedback.is_public)}
                      className={`px-4 py-2 rounded-lg font-semibold transition text-sm ${
                        feedback.is_public
                          ? 'bg-orange-500 text-white hover:bg-orange-600'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      {feedback.is_public ? '👁️ Hide' : '👁️ Show'}
                    </button>
                    <button
                      onClick={() => setViewFeedback(feedback)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition text-sm"
                    >
                      💬 Respond
                    </button>
                    <button
                      onClick={() => handleDelete(feedback.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* View/Respond Modal */}
      {viewFeedback && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setViewFeedback(null)}
          />
          <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-6 sm:p-8 z-50 w-11/12 max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Feedback Details</h3>
              <button 
                onClick={() => setViewFeedback(null)}
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            {message && (
              <div className={`mb-4 p-3 rounded-xl ${message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <p className="font-semibold text-sm">{message}</p>
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                <h4 className="text-xl font-bold text-gray-900">{viewFeedback.clients?.name}</h4>
                <span className="text-3xl">{renderStars(viewFeedback.rating)}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Order</p>
                  <p className="font-semibold">#{(viewFeedback.order_id?.slice(0, 8) || 'N/A').toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Driver</p>
                  <p className="font-semibold">{viewFeedback.drivers?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Date</p>
                  <p className="font-semibold">{new Date(viewFeedback.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Email</p>
                  <p className="font-semibold text-xs">{viewFeedback.clients?.email || 'N/A'}</p>
                </div>
              </div>

              {viewFeedback.review_text && (
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-2">Review</p>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-gray-900">{viewFeedback.review_text}</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-bold text-gray-700 mb-3">Detailed Ratings</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-xl">
                    <p className="text-xs text-gray-600 mb-1">Service Quality</p>
                    <p className="text-lg font-bold">{renderStars(viewFeedback.service_quality || 0)}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-xl">
                    <p className="text-xs text-gray-600 mb-1">Delivery Speed</p>
                    <p className="text-lg font-bold">{renderStars(viewFeedback.delivery_speed || 0)}</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-xl">
                    <p className="text-xs text-gray-600 mb-1">Professionalism</p>
                    <p className="text-lg font-bold">{renderStars(viewFeedback.driver_professionalism || 0)}</p>
                  </div>
                </div>
              </div>

              {viewFeedback.admin_response && (
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-2">Admin Response</p>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-xs text-blue-600 mb-2">
                      Posted {new Date(viewFeedback.responded_at).toLocaleString()}
                    </p>
                    <p className="text-blue-900">{viewFeedback.admin_response}</p>
                  </div>
                </div>
              )}

              {!viewFeedback.admin_response && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Post a Response
                  </label>
                  <textarea
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    rows={4}
                    placeholder="Write a response to this feedback..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none"
                  />
                  <button
                    onClick={() => handleRespond(viewFeedback.id)}
                    disabled={responding}
                    className="mt-3 w-full py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition disabled:opacity-50"
                  >
                    {responding ? "Posting..." : "Post Response"}
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setViewFeedback(null)}
              className="w-full py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
}