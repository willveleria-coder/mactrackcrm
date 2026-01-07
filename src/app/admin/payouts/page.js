"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import HamburgerMenu from "@/components/HamburgerMenu";

export default function AdminPayoutsPage() {
  const [admin, setAdmin] = useState(null);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [viewRequest, setViewRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const menuItems = [
    { href: "/admin/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/admin/orders", icon: "📦", label: "Orders" },
    { href: "/admin/orders/create", icon: "➕", label: "Create Order" },
    { href: "/admin/clients", icon: "👥", label: "Clients" },
    { href: "/admin/drivers", icon: "🚐", label: "Drivers" },
    { href: "/admin/approvals", icon: "✅", label: "Approvals" },
    { href: "/admin/tracking", icon: "🗺️", label: "Live Tracking" },
    { href: "/admin/analytics", icon: "📊", label: "Analytics" },
    { href: "/admin/invoices", icon: "💰", label: "Invoices" },
    { href: "/admin/payouts", icon: "💸", label: "Payouts" },
    { href: "/admin/pricing", icon: "💲", label: "Pricing" },
    { href: "/admin/feedback", icon: "💬", label: "Feedback" },
    { href: "/admin/settings", icon: "⚙️", label: "Settings" },
  ];
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/admin/login");
      return;
    }

    const { data: adminData } = await supabase
      .from("admins")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!adminData) {
      router.push("/admin/login");
      return;
    }

    setAdmin(adminData);
    loadPayoutData();
  }

  async function loadPayoutData() {
    try {
      // Load payout requests
      const { data: requestsData } = await supabase
        .from("payout_requests")
        .select("*")
        .order("requested_at", { ascending: false });

      setPayoutRequests(requestsData || []);

      // Load drivers
      const { data: driversData } = await supabase
        .from("drivers")
        .select("*");

      setDrivers(driversData || []);

      // Load wallets
      const { data: walletsData } = await supabase
        .from("driver_wallets")
        .select("*");

      setWallets(walletsData || []);

    } catch (error) {
      console.error("Error loading payout data:", error);
      setMessage("❌ Failed to load payout data");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(requestId, amount, driverId) {
  if (!confirm("Approve this payout request?")) return;

  setProcessing(true);
  setMessage('');

  try {
    // Get current wallet
    const { data: walletData, error: walletFetchError } = await supabase
      .from("driver_wallets")
      .select("balance, total_paid_out")
      .eq("driver_id", driverId)
      .single();

    if (walletFetchError) throw walletFetchError;

    // Update request status
    const { error: requestError } = await supabase
      .from("payout_requests")
      .update({
        status: 'approved',
        processed_at: new Date().toISOString(),
        processed_by: admin.id
      })
      .eq("id", requestId);

    if (requestError) throw requestError;

    // Update wallet balance
    const newBalance = parseFloat(walletData.balance) - parseFloat(amount);
    const newTotalPaidOut = parseFloat(walletData.total_paid_out) + parseFloat(amount);

    const { error: walletError } = await supabase
      .from("driver_wallets")
      .update({
        balance: newBalance,
        total_paid_out: newTotalPaidOut,
        updated_at: new Date().toISOString()
      })
      .eq("driver_id", driverId);

    if (walletError) throw walletError;

    // Create payout history record
    const { error: historyError } = await supabase
      .from("payout_history")
      .insert([{
        driver_id: driverId,
        amount: amount,
        payout_request_id: requestId,
        payment_method: 'admin_approved',
        paid_by: admin.id
      }]);

    if (historyError) throw historyError;

    setMessage("✅ Payout approved successfully!");
    await loadPayoutData();
    setViewRequest(null);
    setTimeout(() => setMessage(''), 3000);

  } catch (error) {
    console.error("Error approving payout:", error);
    setMessage("❌ Failed to approve payout: " + error.message);
  } finally {
    setProcessing(false);
  }
}

  async function handleReject(requestId) {
    if (!rejectionReason.trim()) {
      setMessage("❌ Please provide a rejection reason");
      return;
    }

    if (!confirm("Reject this payout request?")) return;

    setProcessing(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from("payout_requests")
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
          processed_by: admin.id,
          rejection_reason: rejectionReason
        })
        .eq("id", requestId);

      if (error) throw error;

      setMessage("✅ Payout rejected");
      await loadPayoutData();
      setViewRequest(null);
      setRejectionReason('');
      setTimeout(() => setMessage(''), 3000);

    } catch (error) {
      console.error("Error rejecting payout:", error);
      setMessage("❌ Failed to reject payout");
    } finally {
      setProcessing(false);
    }
  }

  async function handleResetWallet(driverId) {
  if (!confirm("Reset this driver's wallet? This will set balance to $0.00 and create a payout history record.")) return;

  setProcessing(true);
  setMessage('');

  try {
    const wallet = wallets.find(w => w.driver_id === driverId);
    if (!wallet || wallet.balance <= 0) {
      setMessage("❌ No balance to reset");
      setProcessing(false);
      return;
    }

    const currentBalance = parseFloat(wallet.balance);
    const currentTotalPaidOut = parseFloat(wallet.total_paid_out);

    // Create payout history
    const { error: historyError } = await supabase
      .from("payout_history")
      .insert([{
        driver_id: driverId,
        amount: currentBalance,
        payment_method: 'manual_reset',
        notes: 'Wallet reset by admin',
        paid_by: admin.id
      }]);

    if (historyError) throw historyError;

    // Reset wallet
    const { error: walletError } = await supabase
      .from("driver_wallets")
      .update({
        balance: 0,
        total_paid_out: currentTotalPaidOut + currentBalance,
        updated_at: new Date().toISOString()
      })
      .eq("driver_id", driverId);

    if (walletError) throw walletError;

    setMessage("✅ Wallet reset successfully!");
    await loadPayoutData();
    setTimeout(() => setMessage(''), 3000);

  } catch (error) {
    console.error("Error resetting wallet:", error);
    setMessage("❌ Failed to reset wallet");
  } finally {
    setProcessing(false);
  }
}

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  const filteredRequests = filterStatus === 'all' 
    ? payoutRequests 
    : payoutRequests.filter(r => r.status === filterStatus);

  const requestsWithDrivers = filteredRequests.map(request => ({
    ...request,
    driver: drivers.find(d => d.id === request.driver_id),
    wallet: wallets.find(w => w.driver_id === request.driver_id)
  }));

  const walletsWithDrivers = wallets.map(wallet => ({
    ...wallet,
    driver: drivers.find(d => d.id === wallet.driver_id)
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/bus-icon.png" alt="Mac Track" width={40} height={40} className="object-contain" />
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-red-600">Mac Track</h1>
                <p className="text-xs text-gray-500">Admin Portal</p>
              </div>
            </div>
            <HamburgerMenu items={menuItems} onLogout={handleLogout} userName={admin?.name} userRole="Admin" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">💳 Payout Management</h2>
          <p className="text-gray-600">Approve requests and manage driver wallets</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <p className="font-semibold">{message}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Pending Requests</p>
            <p className="text-4xl font-black">{payoutRequests.filter(r => r.status === 'pending').length}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Approved</p>
            <p className="text-4xl font-black">{payoutRequests.filter(r => r.status === 'approved').length}</p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Rejected</p>
            <p className="text-4xl font-black">{payoutRequests.filter(r => r.status === 'rejected').length}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-90 mb-1">Total Pending $</p>
            <p className="text-4xl font-black">
              ${payoutRequests.filter(r => r.status === 'pending').reduce((sum, r) => sum + parseFloat(r.amount), 0).toFixed(0)}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {['pending', 'approved', 'rejected', 'all'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition ${
                  filterStatus === status
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {status !== 'all' && ` (${payoutRequests.filter(r => r.status === status).length})`}
                {status === 'all' && ` (${payoutRequests.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Payout Requests */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Payout Requests</h3>
          <div className="space-y-4">
            {requestsWithDrivers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💳</div>
                <p className="text-gray-500 text-lg font-semibold">No {filterStatus !== 'all' ? filterStatus : ''} requests</p>
              </div>
            ) : (
              requestsWithDrivers.map((request) => (
                <div key={request.id} className="border-2 border-gray-200 rounded-xl p-5 hover:border-red-600 transition">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-bold text-gray-900">{request.driver?.name}</h4>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          request.status === 'approved' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {request.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <p className="text-gray-600">Amount:</p>
                          <p className="font-bold text-2xl text-green-600">${parseFloat(request.amount).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Requested:</p>
                          <p className="font-semibold">{new Date(request.requested_at).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Payment Method:</p>
                          <p className="font-semibold capitalize">{request.payment_method?.replace('_', ' ')}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Wallet Balance:</p>
                          <p className="font-semibold">${request.wallet?.balance.toFixed(2) || '0.00'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setViewRequest(request)}
                        className="text-sm text-red-600 hover:underline font-semibold"
                      >
                        View Details →
                      </button>
                    </div>

                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(request.id, request.amount, request.driver_id)}
                          disabled={processing}
                          className="px-6 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition disabled:opacity-50"
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => setViewRequest(request)}
                          disabled={processing}
                          className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition disabled:opacity-50"
                        >
                          ❌ Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Driver Wallets */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Driver Wallets</h3>
          <div className="space-y-4">
            {walletsWithDrivers.map((wallet) => (
              <div key={wallet.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-lg">{wallet.driver?.name}</p>
                  <div className="flex gap-6 mt-2 text-sm">
                    <div>
                      <p className="text-gray-600">Balance:</p>
                      <p className="font-bold text-green-600">${wallet.balance.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Earned:</p>
                      <p className="font-semibold">${wallet.total_earned.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Paid:</p>
                      <p className="font-semibold">${wallet.total_paid_out.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleResetWallet(wallet.driver_id)}
                  disabled={processing || wallet.balance <= 0}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset Wallet
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* View Request Modal */}
      {viewRequest && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setViewRequest(null)}
          />
          <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-6 sm:p-8 z-50 w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Payout Request Details</h3>
              <button 
                onClick={() => setViewRequest(null)}
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Driver</p>
                  <p className="font-bold text-gray-900">{viewRequest.driver?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Amount</p>
                  <p className="font-bold text-2xl text-green-600">${parseFloat(viewRequest.amount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                    viewRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    viewRequest.status === 'approved' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {viewRequest.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Requested</p>
                  <p className="font-semibold text-gray-900">{new Date(viewRequest.requested_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                  <p className="font-semibold text-gray-900 capitalize">{viewRequest.payment_method?.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Wallet Balance</p>
                  <p className="font-semibold text-gray-900">${viewRequest.wallet?.balance.toFixed(2) || '0.00'}</p>
                </div>
              </div>

              {viewRequest.bank_account_details && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment Details</p>
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <p className="text-sm font-mono text-gray-900 whitespace-pre-wrap">{viewRequest.bank_account_details}</p>
                  </div>
                </div>
              )}

              {viewRequest.notes && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Notes</p>
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <p className="text-sm text-gray-900">{viewRequest.notes}</p>
                  </div>
                </div>
              )}

              {viewRequest.status === 'rejected' && viewRequest.rejection_reason && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Rejection Reason</p>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700">{viewRequest.rejection_reason}</p>
                  </div>
                </div>
              )}
            </div>

            {viewRequest.status === 'pending' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Rejection Reason (if rejecting)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    placeholder="Enter reason for rejection..."
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(viewRequest.id, viewRequest.amount, viewRequest.driver_id)}
                    disabled={processing}
                    className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition disabled:opacity-50"
                  >
                    {processing ? "Processing..." : "✅ Approve Payout"}
                  </button>
                  <button
                    onClick={() => handleReject(viewRequest.id)}
                    disabled={processing}
                    className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition disabled:opacity-50"
                  >
                    {processing ? "Processing..." : "❌ Reject"}
                  </button>
                </div>
              </div>
            )}

            {viewRequest.status !== 'pending' && (
              <button
                onClick={() => setViewRequest(null)}
                className="w-full py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
              >
                Close
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}