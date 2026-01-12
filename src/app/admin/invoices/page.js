"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import HamburgerMenu from "@/components/HamburgerMenu";

export default function AdminInvoicesPage() {
  const [admin, setAdmin] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const menuItems = [
    { href: "/admin/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/admin/orders", icon: "📦", label: "Orders" },
    { href: "/admin/clients", icon: "👥", label: "Clients" },
    { href: "/admin/drivers", icon: "🚐", label: "Drivers" },
    { href: "/admin/analytics", icon: "📊", label: "Analytics" },
    { href: "/admin/invoices", icon: "💰", label: "Invoices" },
  ];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
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

      // Load invoices
      const { data: invoicesData } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      setInvoices(invoicesData || []);

      // Load orders (delivered, without invoice)
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("status", "delivered")
        .order("created_at", { ascending: false });

      setOrders(ordersData || []);

      // Load clients
      const { data: clientsData } = await supabase
        .from("clients")
        .select("*");

      setClients(clientsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateInvoice(orderId) {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      // Generate invoice number
      const timestamp = Date.now();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${timestamp.toString().slice(-6)}`;

      // Calculate amounts (10% tax)
      const amount = Number(order.price);
      const taxAmount = amount * 0.10;
      const totalAmount = amount + taxAmount;

      const { error } = await supabase
        .from("invoices")
        .insert([{
          invoice_number: invoiceNumber,
          order_id: orderId,
          client_id: order.client_id,
          amount: amount,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          status: "unpaid",
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days
        }]);

      if (error) throw error;

      alert(`✅ Invoice ${invoiceNumber} created successfully!`);
      setShowCreateModal(false);
      loadData();
    } catch (error) {
      alert("Failed to create invoice: " + error.message);
    }
  }

  async function handleMarkAsPaid(invoiceId) {
    const confirm = window.confirm("Mark this invoice as paid?");
    if (!confirm) return;

    try {
      const { error } = await supabase
        .from("invoices")
        .update({ 
          status: "paid",
          paid_at: new Date().toISOString()
        })
        .eq("id", invoiceId);

      if (error) throw error;

      alert("✅ Invoice marked as paid!");
      loadData();
    } catch (error) {
      alert("Failed to update invoice: " + error.message);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
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
                <h1 className="text-xl sm:text-2xl font-black text-red-600">Mac Track</h1>
                <p className="text-xs text-gray-500">Admin Portal</p>
              </div>
            </div>
            
            <HamburgerMenu 
              items={menuItems}
              onLogout={handleLogout}
              userName={admin?.name || 'Admin'}
              userRole="Admin"
            />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">💰 Customer Invoices</h2>
            <p className="text-sm sm:text-base text-gray-600">Generate and manage customer invoices</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition shadow-lg"
          >
            + Create Invoice
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-lg hover:shadow-xl transition">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Invoices</p>
            <p className="text-2xl sm:text-3xl font-black text-gray-900">{invoices.length}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-lg hover:shadow-xl transition">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Unpaid</p>
            <p className="text-2xl sm:text-3xl font-black text-yellow-600">
              {invoices.filter(i => i.status === 'unpaid').length}
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-lg hover:shadow-xl transition">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Paid</p>
            <p className="text-2xl sm:text-3xl font-black text-green-600">
              {invoices.filter(i => i.status === 'paid').length}
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-lg hover:shadow-xl transition">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Revenue</p>
            <p className="text-xl sm:text-2xl font-black text-gray-900">
              ${invoices.reduce((sum, i) => sum + Number(i.total_amount), 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Invoices List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {invoices.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-gray-500 text-lg font-semibold mb-2">No invoices yet</p>
              <p className="text-gray-400 text-sm">Create your first invoice from a delivered order</p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="block lg:hidden divide-y divide-gray-100">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-sm font-mono font-bold text-gray-900">{invoice.invoice_number}</p>
                        <p className="text-xs text-gray-500">{new Date(invoice.created_at).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-600 mt-1">Order #{invoice.order_id?.slice(0, 8)}</p>
                      </div>
                      <InvoiceStatusBadge status={invoice.status} />
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-semibold">${Number(invoice.amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Tax:</span>
                        <span className="font-semibold">${Number(invoice.tax_amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                        <span className="text-gray-900 font-bold">Total:</span>
                        <span className="font-black text-gray-900">${Number(invoice.total_amount).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/admin/invoices/${invoice.id}`}
                        className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 text-center"
                      >
                        View
                      </Link>
                      {invoice.status === 'unpaid' && (
                        <button
                          onClick={() => handleMarkAsPaid(invoice.id)}
                          className="flex-1 py-2 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600"
                        >
                          Mark Paid
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Invoice #</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Date</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Order ID</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Amount</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Tax</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Total</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Status</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Due Date</th>
                      <th className="text-center py-4 px-6 text-xs font-bold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50 transition">
                        <td className="py-4 px-6 text-sm font-mono font-bold text-gray-900">
                          {invoice.invoice_number}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600">
                          {new Date(invoice.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6 text-sm font-mono text-gray-600">
                          #{invoice.order_id?.slice(0, 8)}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-900">
                          ${Number(invoice.amount).toFixed(2)}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600">
                          ${Number(invoice.tax_amount).toFixed(2)}
                        </td>
                        <td className="py-4 px-6 text-sm font-bold text-gray-900">
                          ${Number(invoice.total_amount).toFixed(2)}
                        </td>
                        <td className="py-4 px-6">
                          <InvoiceStatusBadge status={invoice.status} />
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600">
                          {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2 justify-center">
                            <Link
                              href={`/admin/invoices/${invoice.id}`}
                              className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
                            >
                              View
                            </Link>
                            {invoice.status === 'unpaid' && (
                              <button
                                onClick={() => handleMarkAsPaid(invoice.id)}
                                className="text-green-600 hover:text-green-700 font-semibold text-sm"
                              >
                                Mark Paid
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>

      {/* CREATE INVOICE MODAL */}
      {showCreateModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="fixed inset-4 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:inset-auto bg-white rounded-2xl shadow-2xl z-50 sm:w-full sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black mb-1">Create Invoice</h3>
                <p className="text-sm opacity-90">Select a delivered order</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-3 mb-6">
                {orders.filter(o => !invoices.find(inv => inv.order_id === o.id)).length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-5xl mb-3">📦</div>
                    <p className="text-gray-500 font-semibold">No delivered orders without invoices</p>
                  </div>
                ) : (
                  orders.filter(o => !invoices.find(inv => inv.order_id === o.id)).map((order) => (
                    <button
                      key={order.id}
                      onClick={() => handleCreateInvoice(order.id)}
                      className="w-full text-left px-4 py-3 border-2 border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-500 transition"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-gray-900">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-xs text-gray-500 truncate max-w-xs">
                            {order.pickup_address} → {order.dropoff_address}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-gray-900">${Number(order.price).toFixed(2)}</p>
                          <p className="text-xs text-gray-500">+ 10% tax</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <button
                onClick={() => setShowCreateModal(false)}
                className="w-full py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InvoiceStatusBadge({ status }) {
  const styles = {
    unpaid: "bg-yellow-100 text-yellow-700 border-yellow-300",
    paid: "bg-green-100 text-green-700 border-green-300",
    overdue: "bg-red-100 text-red-700 border-red-300",
    cancelled: "bg-gray-100 text-gray-600 border-gray-300",
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold capitalize border ${styles[status] || "bg-gray-100 text-gray-600 border-gray-300"}`}>
      {status}
    </span>
  );
}