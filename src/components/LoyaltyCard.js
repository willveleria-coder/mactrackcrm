"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function LoyaltyCard({ clientId }) {
  const [points, setPoints] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (clientId) fetchLoyalty();
  }, [clientId]);

  const fetchLoyalty = async () => {
    let { data } = await supabase
      .from("loyalty_points")
      .select("*")
      .eq("client_id", clientId)
      .single();

    if (!data) {
      const { data: newData } = await supabase
        .from("loyalty_points")
        .insert({ client_id: clientId, points: 0, lifetime_points: 0 })
        .select()
        .single();
      data = newData;
    }

    setPoints(data);

    const { data: txns } = await supabase
      .from("loyalty_transactions")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(10);

    setTransactions(txns || []);
  };

  const getRewardTier = (pts) => {
    if (pts >= 1000) return { name: "Gold", color: "text-yellow-600", bg: "bg-yellow-100", next: null };
    if (pts >= 500) return { name: "Silver", color: "text-gray-500", bg: "bg-gray-100", next: 1000 - pts };
    return { name: "Bronze", color: "text-orange-600", bg: "bg-orange-100", next: 500 - pts };
  };

  if (!points) return null;

  const tier = getRewardTier(points.lifetime_points);

  return (
    <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-6 text-white shadow-xl">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-red-200 text-sm font-medium">Loyalty Points</p>
          <p className="text-4xl font-black">{points.points?.toLocaleString() || 0}</p>
        </div>
        <div className={`${tier.bg} ${tier.color} px-3 py-1 rounded-full text-sm font-bold`}>
          {tier.name} Member
        </div>
      </div>

      <div className="bg-white/20 rounded-xl p-3 mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span>Progress to next tier</span>
          <span>{tier.next ? `${tier.next} pts to go` : "Max tier!"}</span>
        </div>
        <div className="h-2 bg-white/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white rounded-full transition-all"
            style={{ width: tier.next ? `${((500 - tier.next) / 500) * 100}%` : "100%" }}
          />
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-red-200 text-sm">Earn 1 point per $1 spent</p>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-sm underline hover:no-underline"
        >
          {showHistory ? "Hide" : "View"} History
        </button>
      </div>

      {showHistory && transactions.length > 0 && (
        <div className="mt-4 bg-white/10 rounded-xl p-3 max-h-40 overflow-y-auto">
          {transactions.map((txn) => (
            <div key={txn.id} className="flex justify-between py-2 border-b border-white/10 last:border-0">
              <span className="text-sm">{txn.description}</span>
              <span className={`font-bold ${txn.type === "earned" ? "text-green-300" : "text-red-300"}`}>
                {txn.type === "earned" ? "+" : "-"}{txn.points}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-white/20">
        <p className="text-sm text-red-200">💡 Redeem 500 points for $10 off your next order!</p>
      </div>
    </div>
  );
}