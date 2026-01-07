"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Image from "next/image";
import HamburgerMenu from "@/components/HamburgerMenu";

export default function ClientFeedbackPage() {
  const [client, setClient] = useState(null);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [category, setCategory] = useState("general");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const menuItems = [
    { href: "/client-portal/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/client-portal/orders", icon: "📦", label: "Orders" },
    { href: "/client-portal/new-order", icon: "➕", label: "New Order" },
    { href: "/client-portal/feedback", icon: "⭐", label: "Feedback" },
    { href: "/client-portal/settings", icon: "⚙️", label: "Settings" },
  ];

  useEffect(() => {
    loadClient();
  }, []);

  async function loadClient() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push("/client-portal/login");
        return;
      }

      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (clientError || !clientData) {
        router.push("/client-portal/login");
        return;
      }

      setClient(clientData);
    } catch (error) {
      console.error("Error loading client:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("feedback")
        .insert([{
          client_id: client.id,
          rating,
          feedback,
          category,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      setMessage("✅ Thank you for your feedback!");
      setFeedback("");
      setRating(5);
      setCategory("general");
    } catch (error) {
      setMessage("❌ Failed to submit feedback: " + error.message);
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
                <h1 className="text-xl sm:text-2xl font-black text-red-600">Mac Track</h1>
                <p className="text-xs text-gray-500">Client Portal</p>
              </div>
            </div>
            
            <HamburgerMenu 
              items={menuItems}
              onLogout={handleLogout}
              userName={client?.name}
              userRole="Client"
            />
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Share Your Feedback ⭐</h2>
          <p className="text-gray-600">We'd love to hear about your experience with Mac Track</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
          {message && (
            <div className={`mb-6 p-4 rounded-xl ${message.includes('✅') ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
              <p className={`font-semibold ${message.includes('✅') ? 'text-green-700' : 'text-red-700'}`}>{message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rating */}
            <div>
              <label className="block text-lg font-bold text-gray-900 mb-3">
                How would you rate our service?
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="text-4xl transition transform hover:scale-110"
                  >
                    {star <= rating ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {rating === 5 && "Excellent! 🎉"}
                {rating === 4 && "Great! 👍"}
                {rating === 3 && "Good 👌"}
                {rating === 2 && "Fair 🤔"}
                {rating === 1 && "Needs Improvement 😔"}
              </p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-lg font-bold text-gray-900 mb-3">
                What is your feedback about?
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-600 transition"
              >
                <option value="general">General Service</option>
                <option value="delivery">Delivery Experience</option>
                <option value="driver">Driver Service</option>
                <option value="app">App/Website</option>
                <option value="pricing">Pricing</option>
                <option value="support">Customer Support</option>
              </select>
            </div>

            {/* Feedback */}
            <div>
              <label className="block text-lg font-bold text-gray-900 mb-3">
                Tell us more
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share your experience, suggestions, or any concerns..."
                rows={6}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-600 transition resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:from-red-700 hover:to-red-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit Feedback"}
            </button>
          </form>
        </div>

        {/* Contact Support */}
        <div className="mt-8 bg-red-50 border-2 border-red-200 rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">📞 Need Immediate Help?</h3>
          <p className="text-sm text-gray-600 mb-4">Our support team is ready to assist you</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="mailto:macwithavan@mail.com"
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-xl font-bold text-center flex items-center justify-center gap-2 transition shadow-lg hover:shadow-xl"
            >
              <span className="text-xl">📧</span>
              <div className="text-left">
                <p className="text-sm font-bold">Email Support</p>
                <p className="text-xs opacity-90">macwithavan@mail.com</p>
              </div>
            </a>
            <a
              href="tel:0430233811"
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-xl font-bold text-center flex items-center justify-center gap-2 transition shadow-lg hover:shadow-xl"
            >
              <span className="text-xl">📞</span>
              <div className="text-left">
                <p className="text-sm font-bold">Call Support</p>
                <p className="text-xs opacity-90">0430 233 811</p>
              </div>
            </a>
          </div>
          
          <p className="text-xs text-gray-600 text-center mt-4">
            📅 Support Hours: Mon-Fri 8AM-6PM AEST
          </p>
        </div>
      </main>
    </div>
  );
}