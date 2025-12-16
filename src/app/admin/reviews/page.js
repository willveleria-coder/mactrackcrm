'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Star, TrendingUp, MessageSquare, Award } from 'lucide-react';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    avgRating: 0,
    totalReviews: 0,
    fiveStarCount: 0,
    oneStarCount: 0,
  });
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // If no reviews exist, use demo data
      if (!data || data.length === 0) {
        setReviews([
          {
            id: 'demo_1',
            order_id: 'ORD-001',
            customer_name: 'John Doe',
            customer_email: 'john@example.com',
            rating: 5,
            comment: 'Excellent service! Food arrived hot and on time.',
            created_at: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: 'demo_2',
            order_id: 'ORD-002',
            customer_name: 'Jane Smith',
            customer_email: 'jane@example.com',
            rating: 4,
            comment: 'Good delivery, but could be faster.',
            created_at: new Date(Date.now() - 172800000).toISOString(),
          },
          {
            id: 'demo_3',
            order_id: 'ORD-003',
            customer_name: 'Bob Johnson',
            customer_email: 'bob@example.com',
            rating: 2,
            comment: 'Food was cold when it arrived.',
            created_at: new Date(Date.now() - 259200000).toISOString(),
          },
        ]);
      } else {
        setReviews(data);
      }

      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (reviewsData) => {
    if (reviewsData.length === 0) {
      setStats({ avgRating: 0, totalReviews: 0, fiveStarCount: 0, oneStarCount: 0 });
      return;
    }

    const totalRating = reviewsData.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = (totalRating / reviewsData.length).toFixed(1);
    const fiveStarCount = reviewsData.filter((r) => r.rating === 5).length;
    const oneStarCount = reviewsData.filter((r) => r.rating === 1).length;

    setStats({
      avgRating,
      totalReviews: reviewsData.length,
      fiveStarCount,
      oneStarCount,
    });
  };

  const filteredReviews = filter === 'all'
    ? reviews
    : reviews.filter((r) => r.rating === parseInt(filter));

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Customer Reviews</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Star className="text-yellow-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold">{stats.avgRating}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-100 p-3 rounded-lg">
                <MessageSquare className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Reviews</p>
                <p className="text-2xl font-bold">{stats.totalReviews}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-100 p-3 rounded-lg">
                <Award className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">5-Star Reviews</p>
                <p className="text-2xl font-bold">{stats.fiveStarCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-red-100 p-3 rounded-lg">
                <TrendingUp className="text-red-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Needs Attention</p>
                <p className="text-2xl font-bold">{stats.oneStarCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex gap-2 overflow-x-auto">
              {['all', '5', '4', '3', '2', '1'].map((filterValue) => (
                <button
                  key={filterValue}
                  onClick={() => setFilter(filterValue)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
                    filter === filterValue
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filterValue === 'all' ? 'All Reviews' : `${filterValue} Stars`}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredReviews.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No reviews found</p>
              </div>
            ) : (
              filteredReviews.map((review) => (
                <div key={review.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-gray-800">{review.customer_name}</p>
                      <p className="text-sm text-gray-500">Order #{review.order_id}</p>
                    </div>
                    <div className="text-right">
                      {renderStars(review.rating)}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-gray-700 mb-3">{review.comment}</p>
                  )}
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      review.rating >= 4
                        ? 'bg-green-100 text-green-800'
                        : review.rating === 3
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {review.rating >= 4 ? 'Positive' : review.rating === 3 ? 'Neutral' : 'Needs Follow-up'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}