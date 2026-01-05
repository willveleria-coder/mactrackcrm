'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Loyalty Program Configuration
const LOYALTY_CONFIG = {
  pointsPerDollar: 10,        // 10 points per $1 spent
  pointsForOrder: 50,          // Bonus points per order
  rewardTiers: [
    { points: 500, reward: '$5 off', value: 5 },
    { points: 1000, reward: '$10 off', value: 10 },
    { points: 2000, reward: '$25 off', value: 25 },
    { points: 5000, reward: '$50 off + Free delivery', value: 50 }
  ]
};

// Award Points Function (call this after order completion)
export const awardLoyaltyPoints = async (customerEmail, customerName, orderTotal, orderId) => {
  try {
    // Calculate points
    const pointsFromSpending = Math.floor(orderTotal * LOYALTY_CONFIG.pointsPerDollar);
    const totalPoints = pointsFromSpending + LOYALTY_CONFIG.pointsForOrder;

    // Check if customer exists
    const { data: existing } = await supabase
      .from('loyalty_points')
      .select('*')
      .eq('customer_email', customerEmail)
      .single();

    if (existing) {
      // Update existing customer
      const { error: updateError } = await supabase
        .from('loyalty_points')
        .update({
          points: existing.points + totalPoints,
          total_orders: existing.total_orders + 1,
          updated_at: new Date().toISOString()
        })
        .eq('customer_email', customerEmail);

      if (updateError) throw updateError;
    } else {
      // Create new customer
      const { error: insertError } = await supabase
        .from('loyalty_points')
        .insert([{
          customer_email: customerEmail,
          customer_name: customerName,
          points: totalPoints,
          total_orders: 1
        }]);

      if (insertError) throw insertError;
    }

    // Log points history
    await supabase
      .from('points_history')
      .insert([{
        customer_email: customerEmail,
        order_id: orderId,
        points_earned: totalPoints,
        action: 'order_completed'
      }]);

    return { success: true, pointsEarned: totalPoints };
  } catch (error) {
    console.error('Error awarding points:', error);
    return { success: false, error };
  }
};

// Redeem Points Function
export const redeemPoints = async (customerEmail, pointsToRedeem, rewardValue) => {
  try {
    const { data: customer } = await supabase
      .from('loyalty_points')
      .select('points')
      .eq('customer_email', customerEmail)
      .single();

    if (!customer || customer.points < pointsToRedeem) {
      return { success: false, error: 'Insufficient points' };
    }

    // Deduct points
    const { error: updateError } = await supabase
      .from('loyalty_points')
      .update({
        points: customer.points - pointsToRedeem,
        updated_at: new Date().toISOString()
      })
      .eq('customer_email', customerEmail);

    if (updateError) throw updateError;

    // Log redemption
    await supabase
      .from('points_history')
      .insert([{
        customer_email: customerEmail,
        points_spent: pointsToRedeem,
        action: 'reward_redeemed'
      }]);

    return { success: true, discountAmount: rewardValue };
  } catch (error) {
    console.error('Error redeeming points:', error);
    return { success: false, error };
  }
};

// Loyalty Dashboard Component
export const LoyaltyDashboard = ({ customerEmail }) => {
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (customerEmail) {
      fetchLoyaltyData();
    }
  }, [customerEmail]);

  const fetchLoyaltyData = async () => {
    try {
      // Fetch points
      const { data: points } = await supabase
        .from('loyalty_points')
        .select('*')
        .eq('customer_email', customerEmail)
        .single();

      // Fetch history
      const { data: historyData } = await supabase
        .from('points_history')
        .select('*')
        .eq('customer_email', customerEmail)
        .order('created_at', { ascending: false })
        .limit(10);

      setLoyaltyData(points);
      setHistory(historyData || []);
    } catch (error) {
      console.error('Error fetching loyalty data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (tier) => {
    if (!loyaltyData || loyaltyData.points < tier.points) {
      alert('Not enough points!');
      return;
    }

    const result = await redeemPoints(customerEmail, tier.points, tier.value);
    
    if (result.success) {
      alert(`Redeemed ${tier.reward}! Use code: LOYALTY${tier.value}`);
      fetchLoyaltyData(); // Refresh
    } else {
      alert('Redemption failed. Please try again.');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading loyalty data...</div>;
  }
  if (!loyaltyData) {
    return null;
  }



  const nextTier = LOYALTY_CONFIG.rewardTiers.find(t => t.points > loyaltyData.points);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Points Balance Card */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-2">Your Loyalty Points</h2>
        <p className="text-5xl font-bold mb-2">{loyaltyData.points}</p>
        <p className="text-blue-100">Total Orders: {loyaltyData.total_orders}</p>
        {nextTier && (
          <p className="text-sm mt-4 text-blue-100">
            {nextTier.points - loyaltyData.points} points until {nextTier.reward}
          </p>
        )}
      </div>

      {/* Available Rewards */}
      <div>
        <h3 className="text-xl font-bold mb-4">Available Rewards</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LOYALTY_CONFIG.rewardTiers.map((tier) => {
            const canRedeem = loyaltyData.points >= tier.points;
            return (
              <div
                key={tier.points}
                className={`p-4 rounded-lg border-2 ${
                  canRedeem
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 bg-gray-50'
                }`}
              >
                <h4 className="font-bold text-lg">{tier.reward}</h4>
                <p className="text-sm text-gray-600 mb-3">{tier.points} points</p>
                <button
                  onClick={() => handleRedeem(tier)}
                  disabled={!canRedeem}
                  className={`w-full py-2 rounded-lg font-semibold ${
                    canRedeem
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {canRedeem ? 'Redeem Now' : 'Not Enough Points'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Points History */}
      <div>
        <h3 className="text-xl font-bold mb-4">Points History</h3>
        <div className="space-y-2">
          {history.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No history yet</p>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200"
              >
                <div>
                  <p className="font-medium">
                    {item.action === 'order_completed' ? 'Order Completed' : 'Reward Redeemed'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className={`font-bold ${item.points_earned > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {item.points_earned > 0 ? '+' : '-'}
                  {item.points_earned || item.points_spent} pts
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// USAGE EXAMPLES
// ============================================

/*
// 1. After order completion, award points
import { awardLoyaltyPoints } from '@/components/LoyaltyProgram';

const handleOrderComplete = async () => {
  const result = await awardLoyaltyPoints(
    'customer@email.com',
    'John Doe',
    50.00,  // order total
    orderId
  );
  
  if (result.success) {
    alert(`You earned ${result.pointsEarned} points!`);
  }
};

// 2. Show loyalty dashboard
import { LoyaltyDashboard } from '@/components/LoyaltyProgram';

<LoyaltyDashboard customerEmail="customer@email.com" />

// 3. Check points before checkout
const { data } = await supabase
  .from('loyalty_points')
  .select('points')
  .eq('customer_email', email)
  .single();

// User has {data.points} points available
*/