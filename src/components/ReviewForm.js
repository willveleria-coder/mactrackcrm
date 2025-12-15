'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Star Rating Component
const StarRating = ({ rating, onRatingChange, readOnly = false }) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readOnly && onRatingChange(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
          disabled={readOnly}
          className={`text-3xl transition-colors ${
            readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          }`}
        >
          {star <= (hover || rating) ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  );
};

// Review Form Component
export const ReviewForm = ({ orderId, customerName, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Insert review
      const { error: reviewError } = await supabase
        .from('reviews')
        .insert([
          {
            order_id: orderId,
            customer_name: customerName,
            rating: rating,
            comment: comment.trim()
          }
        ]);

      if (reviewError) throw reviewError;

      // Mark order as reviewed
      const { error: orderError } = await supabase
        .from('orders')
        .update({ review_submitted: true })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Success!
      if (onSuccess) onSuccess();
      
      // Reset form
      setRating(0);
      setComment('');
      alert('Thank you for your review!');

    } catch (err) {
      console.error('Error submitting review:', err);
      setError('Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Rate Your Experience</h2>
      
      <div onSubmit={handleSubmit} className="space-y-4">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How was your delivery?
          </label>
          <StarRating rating={rating} onRatingChange={setRating} />
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comments (optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us about your experience..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">
            {comment.length}/500 characters
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </div>
  );
};

// Display Reviews Component
export const ReviewsList = ({ orderId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useState(() => {
    fetchReviews();
  }, [orderId]);

  const fetchReviews = async () => {
    try {
      let query = supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (orderId) {
        query = query.eq('order_id', orderId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReviews(data || []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading reviews...</div>;
  }

  if (reviews.length === 0) {
    return <div className="text-center py-8 text-gray-500">No reviews yet</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Customer Reviews</h3>
      {reviews.map((review) => (
        <div key={review.id} className="p-4 bg-white rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-800">{review.customer_name}</span>
            <StarRating rating={review.rating} readOnly />
          </div>
          {review.comment && (
            <p className="text-gray-600 text-sm">{review.comment}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            {new Date(review.created_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
};

// ============================================
// USAGE EXAMPLES
// ============================================

/*
// 1. Show review form after order completion
import { ReviewForm } from '@/components/ReviewForm';

<ReviewForm 
  orderId="uuid-here"
  customerName="John Doe"
  onSuccess={() => {
    console.log('Review submitted!');
    // Redirect or show thank you message
  }}
/>

// 2. Display all reviews for an order
import { ReviewsList } from '@/components/ReviewForm';

<ReviewsList orderId="uuid-here" />

// 3. Display all reviews (no orderId filter)
<ReviewsList />
*/