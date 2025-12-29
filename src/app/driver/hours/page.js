"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Image from "next/image";
import HamburgerMenu from "@/components/HamburgerMenu";
import { ThemeProvider, useTheme } from "../../../context/ThemeContext";

function DriverHoursContent() {
  const { theme } = useTheme();
  const [driver, setDriver] = useState(null);
  const [hoursLog, setHoursLog] = useState([]);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [stats, setStats] = useState({
    totalHours: 0,
    thisWeekHours: 0,
    thisMonthHours: 0,
    pendingPayout: 0,
    approvedPayout: 0,
  });
  const [lastPayoutDate, setLastPayoutDate] = useState(null);
  const [canRequestPayout, setCanRequestPayout] = useState(true);
  const [daysUntilNextPayout, setDaysUntilNextPayout] = useState(0);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankDetails, setBankDetails] = useState({ bsb: "", account_number: "", account_name: "" });
  const router = useRouter();
  const supabase = createClient();

  const menuItems = [
    { href: "/driver/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/driver/orders", icon: "📦", label: "Deliveries" },
    { href: "/driver/hours", icon: "⏱️", label: "Hours" },
    { href: "/driver/wallet", icon: "💳", label: "Wallet" },
    { href: "/driver/feedback", icon: "⭐", label: "Feedback" },
    { href: "/driver/settings", icon: "⚙️", label: "Settings" },
  ];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
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
      // Load existing bank details
      if (driverData.bank_bsb || driverData.bank_account_number || driverData.bank_account_name) {
        setBankDetails({
          bsb: driverData.bank_bsb || "",
          account_number: driverData.bank_account_number || "",
          account_name: driverData.bank_account_name || "",
        });
      }

      // Load hours log
      const { data: hoursData } = await supabase
        .from("driver_hours")
        .select("*")
        .eq("driver_id", driverData.id)
        .order("date", { ascending: false })
        .limit(30);

      if (hoursData) {
        setHoursLog(hoursData);
        
        // Calculate stats
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const totalHours = driverData.hours_worked || 0;
        const thisWeekHours = hoursData
          .filter(h => new Date(h.date) >= weekStart)
          .reduce((sum, h) => sum + (h.hours || 0), 0);
        const thisMonthHours = hoursData
          .filter(h => new Date(h.date) >= monthStart)
          .reduce((sum, h) => sum + (h.hours || 0), 0);

        setStats(prev => ({ ...prev, totalHours, thisWeekHours, thisMonthHours }));
      }

      // Load payout requests
      const { data: payoutData } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("driver_id", driverData.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (payoutData) {
        setPayoutRequests(payoutData);
        
        const pendingPayout = payoutData
          .filter(p => p.status === "pending")
          .reduce((sum, p) => sum + (p.amount || 0), 0);
        const approvedPayout = payoutData
          .filter(p => p.status === "approved" || p.status === "paid")
          .reduce((sum, p) => sum + (p.amount || 0), 0);

        setStats(prev => ({ ...prev, pendingPayout, approvedPayout }));

        // Check 2-week payout restriction
        if (payoutData.length > 0) {
          const lastRequest = new Date(payoutData[0].created_at);
          setLastPayoutDate(lastRequest);
          
          const twoWeeksMs = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds
          const now = new Date();
          const timeSinceLastRequest = now - lastRequest;
          
          if (timeSinceLastRequest < twoWeeksMs) {
            setCanRequestPayout(false);
            const daysRemaining = Math.ceil((twoWeeksMs - timeSinceLastRequest) / (24 * 60 * 60 * 1000));
            setDaysUntilNextPayout(daysRemaining);
          } else {
            setCanRequestPayout(true);
            setDaysUntilNextPayout(0);
          }
        } else {
          // No previous requests, can request immediately
          setCanRequestPayout(true);
          setDaysUntilNextPayout(0);
        }
      }

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/driver/login");
  }

  async function handlePayoutRequest(e) {
    e.preventDefault();
    
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    // Double-check 2-week restriction
    if (!canRequestPayout) {
      alert(`You can only request a payout every 2 weeks. Please wait ${daysUntilNextPayout} more day(s).`);
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("payout_requests")
        .insert([{
          driver_id: driver.id,
          driver_name: driver.name,
          amount: parseFloat(payoutAmount),
          hours_claimed: stats.thisWeekHours,
          notes: payoutNotes || null,
          status: "pending",
          
        }]);

      if (error) throw error;

      alert("✅ Payout request submitted successfully! Admin will review shortly.");
      setShowPayoutModal(false);
      setPayoutAmount("");
      setPayoutNotes("");
      loadData();
    } catch (error) {
      console.error("Payout request error:", error);
      alert("Failed to submit payout request: " + error.message);
    } finally {
      setSubmitting(false);
    }
  }
  async function handleSaveBankDetails(e) {
    e.preventDefault();
    if (!bankDetails.bsb || !bankDetails.account_number || !bankDetails.account_name) {
      alert("Please fill in all bank details");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("drivers")
        .update({
          bank_bsb: bankDetails.bsb,
          bank_account_number: bankDetails.account_number,
          bank_account_name: bankDetails.account_name,
        })
        .eq("id", driver.id);
      if (error) throw error;
      alert("✅ Bank details saved successfully!");
      setShowBankModal(false);
      loadData();
    } catch (error) {
      console.error("Bank details error:", error);
      alert("Failed to save bank details: " + error.message);
    } finally {
      setSubmitting(false);
    }
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
                <h1 className={`text-xl sm:text-2xl font-black ${theme.text}`}>MAC WITH A VAN</h1>
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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            Hours & Payouts ⏱️
          </h2>
          <p className="text-sm sm:text-base text-gray-600">Track your hours and request payouts</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg">
            <p className="text-xs sm:text-sm font-medium opacity-90 mb-1">Total Hours</p>
            <p className="text-3xl sm:text-4xl font-black">{stats.totalHours.toFixed(1)}</p>
            <p className="text-xs opacity-75 mt-1">All time</p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg">
            <p className="text-xs sm:text-sm font-medium opacity-90 mb-1">This Week</p>
            <p className="text-3xl sm:text-4xl font-black">{stats.thisWeekHours.toFixed(1)}</p>
            <p className="text-xs opacity-75 mt-1">Hours</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg">
            <p className="text-xs sm:text-sm font-medium opacity-90 mb-1">This Month</p>
            <p className="text-3xl sm:text-4xl font-black">{stats.thisMonthHours.toFixed(1)}</p>
            <p className="text-xs opacity-75 mt-1">Hours</p>
          </div>
        </div>

        {/* Request Payout Button */}
        <div className={`bg-gradient-to-r ${canRequestPayout ? 'from-green-500 to-green-600' : 'from-gray-400 to-gray-500'} rounded-2xl p-6 mb-6 shadow-xl`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-white">
              <h3 className="text-xl font-bold mb-1">💰 Ready to get paid?</h3>
              {canRequestPayout ? (
                <p className="text-sm opacity-90">Submit a payout request for your hours worked</p>
              ) : (
                <div>
                  <p className="text-sm opacity-90">You can request a payout every 2 weeks</p>
                  <p className="text-sm font-bold mt-1">⏳ Next request available in {daysUntilNextPayout} day{daysUntilNextPayout !== 1 ? 's' : ''}</p>
                  {lastPayoutDate && (
                    <p className="text-xs opacity-75 mt-1">
                      Last request: {lastPayoutDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowPayoutModal(true)}
              disabled={!canRequestPayout}
              className={`w-full sm:w-auto px-8 py-4 rounded-xl font-black text-lg transition shadow-lg ${
                canRequestPayout 
                  ? 'bg-white text-green-600 hover:bg-gray-100' 
                  : 'bg-white/50 text-gray-500 cursor-not-allowed'
              }`}
            >
              {canRequestPayout ? 'Request Payout' : '🔒 Locked'}
            </button>
          </div>
        </div>

        {/* Payout Status */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">⏳</span>
              <p className="text-sm font-bold text-gray-600">Pending Payouts</p>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-yellow-600">${stats.pendingPayout.toFixed(2)}</p>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">✅</span>
              <p className="text-sm font-bold text-gray-600">Total Paid</p>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-green-600">${stats.approvedPayout.toFixed(2)}</p>
          </div>
        </div>

        {/* Recent Hours Log */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-5">📅 Recent Hours</h3>
          
          {hoursLog.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">⏱️</div>
              <p className="text-gray-500 font-semibold">No hours logged yet</p>
              <p className="text-gray-400 text-sm mt-1">Hours are tracked when you complete deliveries</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hoursLog.map((log) => (
                <div 
                  key={log.id} 
                  className="flex justify-between items-center p-4 bg-gray-50 rounded-xl"
                >
                  <div>
                    <p className="font-bold text-gray-900">
                      {new Date(log.date).toLocaleDateString('en-AU', { 
                        weekday: 'short', 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </p>
                    {log.notes && (
                      <p className="text-xs text-gray-500 mt-1">{log.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-purple-600">{log.hours?.toFixed(1)}h</p>
                    {log.deliveries && (
                      <p className="text-xs text-gray-500">{log.deliveries} deliveries</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payout History */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-5">💳 Payout History</h3>
          
          {payoutRequests.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">💰</div>
              <p className="text-gray-500 font-semibold">No payout requests yet</p>
              <p className="text-gray-400 text-sm mt-1">Request a payout when you&apos;re ready</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payoutRequests.map((payout) => (
                <div 
                  key={payout.id} 
                  className="flex justify-between items-center p-4 bg-gray-50 rounded-xl"
                >
                  <div>
                    <p className="font-bold text-gray-900">
                      {new Date(payout.created_at).toLocaleDateString('en-AU', { 
                        day: 'numeric', 
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                    {payout.hours_claimed && (
                      <p className="text-xs text-gray-500 mt-1">{payout.hours_claimed}h claimed</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-green-600">${payout.amount?.toFixed(2)}</p>
                    <PayoutStatusBadge status={payout.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        {/* Bank Details Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900">🏦 Bank Details</h3>
            <button
              onClick={() => setShowBankModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition text-sm"
            >
              {bankDetails.bsb ? "Edit" : "Add"} Bank Details
            </button>
          </div>
          {bankDetails.bsb ? (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-semibold">BSB</p>
                  <p className="text-lg font-bold text-gray-900">{bankDetails.bsb}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Account Number</p>
                  <p className="text-lg font-bold text-gray-900">{bankDetails.account_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Account Name</p>
                  <p className="text-lg font-bold text-gray-900">{bankDetails.account_name}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-xl">
              <p className="text-gray-500">No bank details added yet</p>
              <p className="text-sm text-gray-400 mt-1">Add your bank details to receive payouts</p>
            </div>
          )}
        </div>
        </div>
      </main>

      {/* Payout Request Modal */}
      {showPayoutModal && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowPayoutModal(false)}
          />
          
          <div className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black mb-1">Request Payout</h3>
                  <p className="text-sm opacity-90">Submit your hours for payment</p>
                </div>
                <button
                  onClick={() => setShowPayoutModal(false)}
                  className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handlePayoutRequest} className="p-6 space-y-4">
              <div className="bg-purple-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-purple-700 font-semibold">Hours this week</p>
                <p className="text-3xl font-black text-purple-600">{stats.thisWeekHours.toFixed(1)} hours</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Amount Requested ($) *
                </label>
                <input
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="1"
                  step="0.01"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-bold"
                />
                <p className="text-xs text-gray-500 mt-1">Based on your hourly rate agreed with admin</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="Any additional notes for the admin..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                <p className="text-sm text-yellow-800">
                  <strong>💡 Payment Info:</strong> Payouts can be requested every 2 weeks. Processed by admin and sent to your registered bank account within 1-3 business days.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
      {/* Bank Details Modal */}
      {showBankModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowBankModal(false)} />
          <div className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black mb-1">Bank Details</h3>
                  <p className="text-sm opacity-90">Enter your bank account for payouts</p>
                </div>
                <button onClick={() => setShowBankModal(false)} className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center text-2xl font-bold">x</button>
              </div>
            </div>
            <form onSubmit={handleSaveBankDetails} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">BSB *</label>
                <input type="text" value={bankDetails.bsb} onChange={(e) => setBankDetails(prev => ({ ...prev, bsb: e.target.value }))} placeholder="000-000" required className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-bold" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Account Number *</label>
                <input type="text" value={bankDetails.account_number} onChange={(e) => setBankDetails(prev => ({ ...prev, account_number: e.target.value }))} placeholder="12345678" required className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-bold" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Account Name *</label>
                <input type="text" value={bankDetails.account_name} onChange={(e) => setBankDetails(prev => ({ ...prev, account_name: e.target.value }))} placeholder="John Smith" required className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-bold" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowBankModal(false)} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition disabled:opacity-50">{submitting ? "Saving..." : "Save Details"}</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

function PayoutStatusBadge({ status }) {
  const styles = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  const labels = {
    pending: "⏳ Pending",
    approved: "✅ Approved",
    paid: "💰 Paid",
    rejected: "❌ Rejected",
  };

  return (
    <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${styles[status] || "bg-gray-100 text-gray-600"}`}>
      {labels[status] || status}
    </span>
  );
}

export default function DriverHoursPage() {
  return (
    <ThemeProvider userType="driver">
      <DriverHoursContent />
    </ThemeProvider>
  );
}