"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import HamburgerMenu from "@/components/HamburgerMenu";
import Image from "next/image";

export default function DriverWalletPage() {
  const [driver, setDriver] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [bankDetails, setBankDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadWalletData();
  }, []);

  async function loadWalletData() {
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

      const { data: walletData } = await supabase
        .from("driver_wallets")
        .select("*")
        .eq("driver_id", driverData.id)
        .single();

      setWallet(walletData);

      const { data: requestsData } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("driver_id", driverData.id)
        .order("requested_at", { ascending: false });

      setPayoutRequests(requestsData || []);

      const { data: historyData } = await supabase
        .from("payout_history")
        .select("*")
        .eq("driver_id", driverData.id)
        .order("paid_at", { ascending: false });

      setPayoutHistory(historyData || []);

    } catch (error) {
      console.error("Error loading wallet:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestPayout(e) {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      const amount = parseFloat(requestAmount);

      if (amount <= 0) {
        setMessage("❌ Amount must be greater than 0");
        setSubmitting(false);
        return;
      }

      if (amount > wallet.balance) {
        setMessage("❌ Insufficient balance");
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("payout_requests")
        .insert([{
          driver_id: driver.id,
          amount: amount,
          payment_method: paymentMethod,
          bank_account_details: bankDetails,
          notes: notes || null,
          status: 'pending'
        }]);

      if (error) throw error;

      setMessage("✅ Payout request submitted successfully!");

      setRequestAmount('');
      setBankDetails('');
      setNotes('');

      await loadWalletData();

      setTimeout(() => {
        setShowRequestModal(false);
        setMessage('');
      }, 2000);

    } catch (error) {
      console.error("Error requesting payout:", error);
      setMessage("❌ Failed to submit payout request");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/driver/login");
  }

  const menuItems = [
    { href: "/driver/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/driver/orders", icon: "📦", label: "Deliveries" },
    { href: "/driver/earnings", icon: "💰", label: "Earnings" },
    { href: "/driver/wallet", icon: "💳", label: "Wallet" },
    { href: "/driver/feedback", icon: "⭐", label: "Feedback" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  const pendingAmount = payoutRequests
    .filter(r => r.status === 'pending')
    .reduce((sum, r) => sum + parseFloat(r.amount), 0);

  const availableBalance = wallet ? wallet.balance - pendingAmount : 0;

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
          <h2 className="text-3xl font-bold text-gray-900 mb-2">💳 My Wallet</h2>
          <p className="text-gray-600">Manage your earnings and payouts</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <p className="font-semibold">{message}</p>
          </div>
        )}

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Available Balance</p>
            <p className="text-4xl font-black">${availableBalance.toFixed(2)}</p>
            <p className="text-xs opacity-75 mt-2">Ready to withdraw</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Total Earned</p>
            <p className="text-4xl font-black">${wallet?.total_earned.toFixed(2) || '0.00'}</p>
            <p className="text-xs opacity-75 mt-2">All time</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Total Paid Out</p>
            <p className="text-4xl font-black">${wallet?.total_paid_out.toFixed(2) || '0.00'}</p>
            <p className="text-xs opacity-75 mt-2">Withdrawn</p>
          </div>
        </div>

        {/* Request Payout Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowRequestModal(true)}
            disabled={availableBalance <= 0}
            className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-[#0072ab] to-[#005d8c] text-white rounded-xl font-bold text-lg hover:from-[#005d8c] hover:to-[#004d73] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            💰 Request Payout
          </button>
          {availableBalance <= 0 && (
            <p className="text-sm text-gray-500 mt-2">No available balance to withdraw</p>
          )}
        </div>

        {/* Pending Requests */}
        {payoutRequests.filter(r => r.status === 'pending').length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">⏳ Pending Requests</h3>
            <div className="space-y-3">
              {payoutRequests.filter(r => r.status === 'pending').map((request) => (
                <div key={request.id} className="flex justify-between items-center p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                  <div>
                    <p className="font-bold text-gray-900">${parseFloat(request.amount).toFixed(2)}</p>
                    <p className="text-sm text-gray-600">
                      Requested: {new Date(request.requested_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-500 text-white rounded-full text-sm font-bold">
                    Pending Approval
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payout History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Requests */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📋 Request History</h3>
            <div className="space-y-3">
              {payoutRequests.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No payout requests yet</p>
              ) : (
                payoutRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-bold text-gray-900">${parseFloat(request.amount).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(request.requested_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      request.status === 'approved' ? 'bg-green-100 text-green-700' :
                      request.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      request.status === 'paid' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">💸 Payment History</h3>
            <div className="space-y-3">
              {payoutHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No payments received yet</p>
              ) : (
                payoutHistory.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center p-3 bg-green-50 rounded-xl border border-green-200">
                    <div>
                      <p className="font-bold text-gray-900">${parseFloat(payment.amount).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(payment.paid_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-green-600 font-bold">✅ Paid</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Request Payout Modal */}
      {showRequestModal && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setShowRequestModal(false)}
          />
          <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-6 sm:p-8 z-50 w-11/12 max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Request Payout</h3>
              <button
                onClick={() => setShowRequestModal(false)}
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

            <form onSubmit={handleRequestPayout}>
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-xl p-4 mb-4">
                  <p className="text-sm text-gray-600 mb-1">Available Balance</p>
                  <p className="text-3xl font-black text-blue-600">${availableBalance.toFixed(2)}</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Amount to Withdraw *
                  </label>
                  <input
                    type="number"
                    value={requestAmount}
                    onChange={(e) => setRequestAmount(e.target.value)}
                    required
                    min="0.01"
                    max={availableBalance}
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setRequestAmount(availableBalance.toString())}
                    className="text-sm text-[#0072ab] hover:underline mt-1"
                  >
                    Withdraw all
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="paypal">PayPal</option>
                    <option value="check">Check</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Bank Account / Payment Details *
                  </label>
                  <textarea
                    value={bankDetails}
                    onChange={(e) => setBankDetails(e.target.value)}
                    required
                    rows={3}
                    placeholder="Enter your bank account number, PayPal email, or mailing address"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Any additional information"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-[#0072ab] text-white rounded-xl font-bold hover:bg-[#005d8c] transition disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}