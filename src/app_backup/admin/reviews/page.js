"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    const { data } = await supabase.from("reviews").select("*, client:clients(name, email), driver:drivers(name)").order("created_at", { ascending: false });
    setReviews(data || []);
    setLoading(false);
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-2xl">←</Link>
          <div>
            <h1 className="text-2xl font-black">⭐ Reviews</h1>
            <p className="text-red-200">Customer feedback</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow">
            <p className="text-gray-500 text-sm">Total Reviews</p>
            <p className="text-3xl font-black">{reviews.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow">
            <p className="text-gray-500 text-sm">Average Rating</p>
            <p className="text-3xl font-black">⭐ {avgRating}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow">
            <p className="text-gray-500 text-sm">5 Star Reviews</p>
            <p className="text-3xl font-black text-green-600">{reviews.filter(r => r.rating === 5).length}</p>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading...</div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No reviews yet</div>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="bg-white rounded-xl p-6 shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-lg">{review.client?.name}</p>
                    <p className="text-gray-500 text-sm">{review.client?.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl">{"⭐".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
                    <p className="text-gray-400 text-sm">{new Date(review.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                {review.comment && <p className="text-gray-700 bg-gray-50 rounded-lg p-3 mb-3">"{review.comment}"</p>}
                <p className="text-sm text-gray-500">Driver: <span className="font-bold text-gray-700">{review.driver?.name}</span></p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}