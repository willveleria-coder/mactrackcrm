"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import HamburgerMenu from "@/components/HamburgerMenu";
import Image from "next/image";

export default function DriverFeedbackPage() {
  const [driver, setDriver] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    wouldRecommend: 0,
    avgServiceQuality: 0,
    avgDeliverySpeed: 0,
    avgProfessionalism: 0
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadFeedback();
  }, []);

  async function loadFeedback() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/driver/login");
        return;
      }

      const { data: driverData } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!driverData) {
        router.push("/driver/login");
        return;
      }

      setDriver(driverData);

      // Load feedback
      const { data: feedbackData } = await supabase
        .from("customer_feedback")
        .select(`
          *,
          orders(id, pickup_address, dropoff_address, delivered_at),
          clients(name)
        `)
        .eq("driver_id", driverData.id)
        .order("created_at", { ascending: false });

      setFeedbacks(feedbackData || []);

      // Calculate stats
      if (feedbackData && feedbackData.length > 0) {
        const totalReviews = feedbackData.length;
        const avgRating = feedbackData.reduce((sum, f) => sum + f.rating, 0) / totalReviews;
        const recommendCount = feedbackData.filter(f => f.would_recommend).length;
        const avgServiceQuality = feedbackData.reduce((sum, f) => sum + (f.service_quality || 0), 0) / totalReviews;
        const avgDeliverySpeed = feedbackData.reduce((sum, f) => sum + (f.delivery_speed || 0), 0) / totalReviews;
        const avgProfessionalism = feedbackData.reduce((sum, f) => sum + (f.driver_professionalism || 0), 0) / totalReviews;

        setStats({
          totalReviews,
          averageRating: avgRating,
          wouldRecommend: (recommendCount / totalReviews) * 100,
          avgServiceQuality,
          avgDeliverySpeed,
          avgProfessionalism
        });
      }

    } catch (error) {
      console.error("Error loading feedback:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/driver/login");
  }

  const menuItems = [
    { href: "/driver/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/driver/orders", icon: "📦", label: "Deliveries" },
    { href: "/driver/hours", icon: "⏱️", label: "Hours" },
    { href: "/driver/wallet", icon: "💳", label: "Wallet" },
    { href: "/driver/feedback", icon: "⭐", label: "Feedback" },
    { href: "/driver/chat", icon: "💬", label: "Support Chat" },
    { href: "/driver/settings", icon: "⚙️", label: "Settings" },
  ];

  const renderStars = (rating) => {
    return '⭐'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff]">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-30">
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
                <h1 className="text-xl sm:text-2xl font-black text-[#0072ab]">MAC WITH A VAN</h1>
                <p className="text-xs text-gray-500">Driver Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:inline">👋 {driver?.name}</span>
              <HamburgerMenu 
                items={menuItems}
                onLogout={handleLogout}
                userName={driver?.name}
                userRole="Driver"
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">⭐ My Feedback</h2>
          <p className="text-gray-600">Customer reviews and ratings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Average Rating</p>
            <p className="text-4xl font-black">{stats.averageRating.toFixed(1)} ⭐</p>
            <p className="text-xs opacity-75 mt-2">{stats.totalReviews} reviews</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Would Recommend</p>
            <p className="text-4xl font-black">{stats.wouldRecommend.toFixed(0)}%</p>
            <p className="text-xs opacity-75 mt-2">Recommendation rate</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Service Quality</p>
            <p className="text-4xl font-black">{stats.avgServiceQuality.toFixed(1)} ⭐</p>
            <p className="text-xs opacity-75 mt-2">Average score</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Professionalism</p>
            <p className="text-4xl font-black">{stats.avgProfessionalism.toFixed(1)} ⭐</p>
            <p className="text-xs opacity-75 mt-2">Average score</p>
          </div>
        </div>

        {/* Feedback List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Customer Reviews</h3>

          {feedbacks.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">⭐</div>
              <p className="text-gray-500 text-lg font-semibold">No reviews yet</p>
              <p className="text-gray-400 text-sm mt-2">Keep delivering great service to earn reviews!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {feedbacks.map((feedback) => (
                <div key={feedback.id} className="border-2 border-gray-200 rounded-xl p-6 hover:border-[#0072ab] transition bg-white">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-bold text-gray-900">{feedback.clients?.name || 'Customer'}</h4>
                        <span className="text-2xl">{renderStars(feedback.rating)}</span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Order #{feedback.order_id.slice(0, 8).toUpperCase()} • {new Date(feedback.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {feedback.would_recommend && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                        ✓ Recommended
                      </span>
                    )}
                  </div>

                  {feedback.review_text && (
                    <div className="mb-4">
                      <p className="text-gray-700 leading-relaxed">{feedback.review_text}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Service Quality</p>
                      <p className="font-bold text-gray-900">{renderStars(feedback.service_quality || 0)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Delivery Speed</p>
                      <p className="font-bold text-gray-900">{renderStars(feedback.delivery_speed || 0)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Professionalism</p>
                      <p className="font-bold text-gray-900">{renderStars(feedback.driver_professionalism || 0)}</p>
                    </div>
                  </div>

                  {feedback.admin_response && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <p className="text-xs font-bold text-blue-900 mb-2">
                        Admin Response • {new Date(feedback.responded_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-blue-800">{feedback.admin_response}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contact Support */}
        <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">📞 Need Help?</h3>
          <p className="text-sm text-gray-600 mb-4">Our driver support team is available 6:00 AM - 8:00 PM</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="mailto:macwithavan@mail.com"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-xl font-bold text-center flex items-center justify-center gap-2 transition shadow-lg hover:shadow-xl"
            >
              <span className="text-xl">📧</span>
              <div className="text-left">
                <p className="text-sm font-bold">Email Support</p>
                <p className="text-xs opacity-90">macwithavan@mail.com</p>
              </div>
            </a>
            <a
              href="tel:1300170718"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-xl font-bold text-center flex items-center justify-center gap-2 transition shadow-lg hover:shadow-xl"
            >
              <span className="text-xl">📞</span>
              <div className="text-left">
                <p className="text-sm font-bold">Call Support</p>
                <p className="text-xs opacity-90">1300 170 718</p>
              </div>
            </a>
          </div>
          
          <p className="text-xs text-gray-600 text-center mt-4">
            📅 Driver Support: Mon-Fri 6AM-8PM AEST
          </p>
        </div>
      </main>
    </div>
  );
}