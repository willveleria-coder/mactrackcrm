"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import HamburgerMenu from "../../../components/HamburgerMenu";
import Image from "next/image";

export default function DriverEarningsPage() {
  const [driver, setDriver] = useState(null);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [payoutRequests, setPaymentRequests] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadEarnings();
  }, []);

  async function loadEarnings() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push("/driver/login");
        return;
      }

      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (driverError || !driverData) {
        router.push("/driver/login");
        return;
      }

      setDriver(driverData);

      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("driver_id", driverData.id)
        .eq("status", "delivered")
        .order("created_at", { ascending: false });

      if (ordersData) {
        setCompletedOrders(ordersData);
        const total = ordersData.reduce((sum, order) => sum + Number(order.price), 0);
        setTotalEarnings(total);
      }

      const { data: payoutsData } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("driver_id", driverData.id)
        .order("created_at", { ascending: false });

      if (payoutsData) {
        setPaymentRequests(payoutsData);
        const paidOut = payoutsData
          .filter(p => p.status === "paid")
          .reduce((sum, p) => sum + Number(p.amount), 0);
        setAvailableBalance(total - paidOut);
      } else {
        setAvailableBalance(total);
      }
    } catch (error) {
      console.error("Error loading earnings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestPayment() {
    if (availableBalance <= 0) {
      alert("No available balance to request payout");
      return;
    }

    const confirm = window.confirm(
      `Request payout of $${availableBalance.toFixed(2)}?\n\nThis will be processed within 2 weeks.`
    );

    if (!confirm) return;

    try {
      const { error } = await supabase
        .from("payout_requests")
        .insert([{
          driver_id: driver.id,
          amount: availableBalance,
          status: "pending",
          request_date: new Date().toISOString(),
        }]);

      if (error) throw error;

      alert("✅ Payment request submitted successfully!");
      loadEarnings();
    } catch (error) {
      alert("Failed to request payout: " + error.message);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
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
            
            <HamburgerMenu 
              items={menuItems}
              onLogout={handleLogout}
              userName={driver?.name}
              userRole="Driver"
            />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Earnings & Payments 💰</h2>
          <p className="text-sm sm:text-base text-gray-600">Track your earnings and request bi-weekly payouts</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-10">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-2">Total Earnings</p>
            <p className="text-3xl sm:text-4xl font-black">${totalEarnings.toFixed(2)}</p>
            <p className="text-xs opacity-75 mt-2">All time</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-2">Available Balance</p>
            <p className="text-3xl sm:text-4xl font-black">${availableBalance.toFixed(2)}</p>
            <p className="text-xs opacity-75 mt-2">Ready for payout</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-2">Completed Deliveries</p>
            <p className="text-3xl sm:text-4xl font-black">{completedOrders.length}</p>
            <p className="text-xs opacity-75 mt-2">Total jobs</p>
          </div>
        </div>

        {/* Request Payment */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 p-4 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Request Bi-Weekly Payment</h3>
              <p className="text-sm text-gray-600">
                Submit a payment request for your available balance. Processed within 2 weeks.
              </p>
            </div>
            <button
              onClick={handleRequestPayment}
              disabled={availableBalance <= 0}
              className="px-6 sm:px-8 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              💰 Request ${availableBalance.toFixed(2)}
            </button>
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 p-4 sm:p-8 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Payment History</h3>
          
          {payoutRequests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No payment requests yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Amount</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Paid Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payoutRequests.map((payout) => (
                    <tr key={payout.id}>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {new Date(payout.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm font-bold text-gray-900">
                        ${Number(payout.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <PaymentStatusBadge status={payout.status} />
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {payout.paid_at ? new Date(payout.paid_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Completed Deliveries */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 p-4 sm:p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Completed Deliveries</h3>
          
          {completedOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No completed deliveries yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedOrders.slice(0, 10).map((order) => (
                <div key={order.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 bg-white">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {order.pickup_address} → {order.dropoff_address}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()} • {order.service_type}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-bold text-green-600">+${Number(order.price).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function PaymentStatusBadge({ status }) {
  const styles = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${styles[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}