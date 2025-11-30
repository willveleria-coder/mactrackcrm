"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function InvoiceDetailPage() {
  const [invoice, setInvoice] = useState(null);
  const [order, setOrder] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();

  useEffect(() => {
    loadInvoice();
  }, []);

  async function loadInvoice() {
    try {
      const { data: invoiceData } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", params.id)
        .single();

      if (!invoiceData) {
        router.push("/admin/invoices");
        return;
      }

      setInvoice(invoiceData);

      // Load order
      const { data: orderData } = await supabase
        .from("orders")
        .select("*")
        .eq("id", invoiceData.order_id)
        .single();

      setOrder(orderData);

      // Load client
      const { data: clientData } = await supabase
        .from("clients")
        .select("*")
        .eq("id", invoiceData.client_id)
        .single();

      setClient(clientData);
    } catch (error) {
      console.error("Error loading invoice:", error);
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading invoice...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      
      {/* PRINT HEADER - Hidden on screen, visible on print */}
      <div className="hidden print:block">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-[#ba0606]">MAC TRACK</h1>
          <p className="text-gray-600">Professional Courier Services</p>
        </div>
      </div>

      {/* SCREEN NAVIGATION - Hidden on print */}
      <nav className="bg-white border-b border-gray-200 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/admin/invoices" className="text-[#ba0606] hover:underline font-semibold">
            ← Back to Invoices
          </Link>
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-[#ba0606] text-white rounded-lg font-semibold hover:bg-[#8f0404] transition"
          >
            🖨️ Print Invoice
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        
        <div className="bg-white rounded-xl shadow-lg p-12 print:shadow-none">
          
          {/* INVOICE HEADER */}
          <div className="flex justify-between items-start mb-12">
            <div>
              <h1 className="text-4xl font-black text-[#ba0606] mb-2 print:block hidden">MAC TRACK</h1>
              <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
              <p className="text-gray-600 mt-2">Invoice #: {invoice?.invoice_number}</p>
              <p className="text-gray-600">Date: {new Date(invoice?.created_at).toLocaleDateString()}</p>
              {invoice?.due_date && (
                <p className="text-gray-600">Due Date: {new Date(invoice.due_date).toLocaleDateString()}</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900">Mac Track Pty Ltd</p>
              <p className="text-sm text-gray-600">123 Business St</p>
              <p className="text-sm text-gray-600">Melbourne VIC 3000</p>
              <p className="text-sm text-gray-600">ABN: 12 345 678 901</p>
            </div>
          </div>

          {/* BILL TO */}
          <div className="mb-12">
            <p className="text-sm font-bold text-gray-600 uppercase mb-2">Bill To:</p>
            <p className="font-bold text-gray-900">{client?.company_name || client?.name}</p>
            <p className="text-sm text-gray-600">{client?.email}</p>
            <p className="text-sm text-gray-600">{client?.phone}</p>
          </div>

          {/* ORDER DETAILS */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Order Details</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Description</th>
                    <th className="text-right py-3 px-4 text-xs font-bold text-gray-600 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-4 px-4">
                      <p className="font-semibold text-gray-900">{order?.service_type} Delivery Service</p>
                      <p className="text-sm text-gray-600 mt-1">
                        📍 From: {order?.pickup_address}
                      </p>
                      <p className="text-sm text-gray-600">
                        🎯 To: {order?.dropoff_address}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Order ID: #{order?.id.slice(0, 8)} • {order?.parcel_size} / {order?.parcel_weight}kg
                      </p>
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-gray-900">
                      ${Number(invoice?.amount).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* TOTALS */}
          <div className="border-t-2 border-gray-200 pt-6">
            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold text-gray-900">${Number(invoice?.amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Tax (10% GST):</span>
                  <span className="font-semibold text-gray-900">${Number(invoice?.tax_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-4 border-t-2 border-gray-300">
                  <span className="text-lg font-bold text-gray-900">Total Amount:</span>
                  <span className="text-2xl font-black text-[#ba0606]">${Number(invoice?.total_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* PAYMENT STATUS */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900">Payment Status:</span>
              <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                invoice?.status === 'paid' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {invoice?.status?.toUpperCase()}
              </span>
            </div>
            {invoice?.paid_at && (
              <p className="text-sm text-gray-600 mt-2">
                Paid on: {new Date(invoice.paid_at).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* PAYMENT INSTRUCTIONS */}
          {invoice?.status === 'unpaid' && (
            <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-bold text-gray-900 mb-2">Payment Instructions</h4>
              <p className="text-sm text-gray-700 mb-2">Please make payment to:</p>
              <p className="text-sm text-gray-700">Bank: ANZ Bank</p>
              <p className="text-sm text-gray-700">BSB: 123-456</p>
              <p className="text-sm text-gray-700">Account: 12345678</p>
              <p className="text-sm text-gray-700 font-semibold mt-2">
                Reference: {invoice?.invoice_number}
              </p>
            </div>
          )}

          {/* FOOTER */}
          <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>Thank you for your business!</p>
            <p className="mt-2">For inquiries, contact: info@mactrack.com.au | (03) 1234 5678</p>
          </div>
        </div>
      </main>

      {/* PRINT STYLES */}
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}