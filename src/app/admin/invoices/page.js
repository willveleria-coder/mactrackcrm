"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

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
      const invoiceCount = invoices.length + 1;
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount).padStart(4, '0')}`;

      // Calculate amounts (10% tax)
      const amount = Number(order.price);
      const taxAmount = amount * 0.10;
      const totalAmount = amount + taxAmount;

      // Get client_id from order
      const { data: clientData } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", order.user_id)
        .single();

      const { error } = await supabase
        .from("invoices")
        .insert([{
          invoice_number: invoiceNumber,
          order_id: orderId,
          client_id: clientData?.id,
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
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff]">
      
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-[#ba0606]">MAC TRACK</h1>
            <p className="text-xs text-gray-500">Admin Portal</p>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm text-gray-600">👨‍💼 {admin?.name}</span>
            <Link href="/admin/dashboard" className="text-sm font-semibold text-gray-700 hover:text-[#ba0606]">
              Dashboard
            </Link>
            <Link href="/admin/orders" className="text-sm font-semibold text-gray-700 hover:text-[#ba0606]">
              Orders
            </Link>
            <Link href="/admin/invoices" className="text-sm font-semibold text-[#ba0606] border-b-2 border-[#ba0606]">
              Invoices
            </Link>
            <Link href="/admin/clients" className="text-sm font-semibold text-gray-700 hover:text-[#ba0606]">
              Clients
            </Link>
            <Link href="/admin/drivers" className="text-sm font-semibold text-gray-700 hover:text-[#ba0606]">
              Drivers
            </Link>
            <Link href="/admin/tracking" className="text-sm font-semibold text-gray-700 hover:text-[#ba0606]">
              Live Tracking
            </Link>
            <button 
              onClick={handleLogout}
              className="text-sm font-semibold text-red-600 hover:text-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Customer Invoices</h2>
            <p className="text-gray-600">Generate and manage customer invoices</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-[#ba0606] text-white rounded-lg font-semibold hover:bg-[#8f0404] transition"
          >
            + Create Invoice
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Total Invoices</p>
            <p className="text-3xl font-bold text-gray-900">{invoices.length}</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Unpaid</p>
            <p className="text-3xl font-bold text-yellow-600">
              {invoices.filter(i => i.status === 'unpaid').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Paid</p>
            <p className="text-3xl font-bold text-green-600">
              {invoices.filter(i => i.status === 'paid').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900">
              ${invoices.reduce((sum, i) => sum + Number(i.total_amount), 0).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {invoices.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">📄 No invoices yet</p>
              <p className="text-gray-400 text-sm mt-2">Create your first invoice from a delivered order</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
          )}
        </div>
      </main>

      {/* CREATE INVOICE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create Invoice</h3>
            <p className="text-sm text-gray-600 mb-6">Select a delivered order to create an invoice</p>
            
            <div className="space-y-3 mb-6">
              {orders.filter(o => !invoices.find(inv => inv.order_id === o.id)).map((order) => (
                <button
                  key={order.id}
                  onClick={() => handleCreateInvoice(order.id)}
                  className="w-full text-left px-4 py-3 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-gray-500">
                        {order.pickup_address} → {order.dropoff_address}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">${Number(order.price).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">+ 10% tax</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCreateModal(false)}
              className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InvoiceStatusBadge({ status }) {
  const styles = {
    unpaid: "bg-yellow-100 text-yellow-700",
    paid: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-600",
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${styles[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}