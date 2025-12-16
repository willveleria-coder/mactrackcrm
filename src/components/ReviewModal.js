"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ReviewModal({ order, onClose, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return alert("Please select a rating");
    setLoading(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        order_id: order.id,
        client_id: order.client_id,
        driver_id: order.driver_id,
        rating,
        comment
      });
      if (error) throw error;

      const { data: reviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("driver_id", order.driver_id);

      if (reviews && reviews.length > 0) {
        const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        await supabase
          .from("drivers")
          .update({ average_rating: avg.toFixed(2), total_reviews: reviews.length })
          .eq("id", order.driver_id);
      }

      await supabase.from("orders").update({ reviewed: true }).eq("id", order.id);

      onSubmit && onSubmit();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <h2 className="text-2xl font-black text-center mb-2">Rate Your Delivery</h2>
        <p className="text-gray-500 text-center mb-6">How was your experience with {order.driver?.name || "the driver"}?</p>

        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="text-5xl transition-transform hover:scale-110"
            >
              {star <= (hoverRating || rating) ? "⭐" : "☆"}
            </button>
          ))}
        </div>

        <p className="text-center text-lg font-bold mb-4">
          {rating === 1 && "😞 Poor"}
          {rating === 2 && "😐 Fair"}
          {rating === 3 && "🙂 Good"}
          {rating === 4 && "😊 Great"}
          {rating === 5 && "🤩 Excellent!"}
        </p>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us more about your experience (optional)"
          rows={3}
          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none resize-none mb-6"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border-2 border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-50"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || rating === 0}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  );
}