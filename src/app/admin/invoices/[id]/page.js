"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

export default function InvoiceDetailPage() {
  const [invoice, setInvoice] = useState(null);
  const [order, setOrder] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();

  // Company Details
  const companyInfo = {
    name: "Mac With A Van",
    abn: "18 616 164 875",
    email: "macwithavan@mail.com",
    phone: "0430 233 811",
    address: "Melbourne, VIC",
    bankName: "NAB",
    bankAccountName: "Mahmoud Hamidan",
    bankBSB: "083-614",
    bankAccountNumber: "110881275"
  };

  useEffect(() => {
    loadInvoice();
  }, [params.id]);

  async function loadInvoice() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push("/admin/login");
        return;
      }

      // Load invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", params.id)
        .single();

      if (invoiceError || !invoiceData) {
        console.error("Invoice not found:", invoiceError);
        router.push("/admin/invoices");
        return;
      }

      setInvoice(invoiceData);

      // Load order
      if (invoiceData.order_id) {
        const { data: orderData } = await supabase
          .from("orders")
          .select("*")
          .eq("id", invoiceData.order_id)
          .single();

        setOrder(orderData);
      }

      // Load client
      if (invoiceData.client_id) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("*")
          .eq("id", invoiceData.client_id)
          .single();

        setClient(clientData);
      }

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
        <div className="text-gray-600 text-lg">Loading invoice...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Invoice not found</p>
          <Link href="/admin/invoices" className="text-red-600 font-semibold hover:underline">
            ← Back to Invoices
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
      {/* Action Bar - Hidden on Print */}
      <div className="max-w-4xl mx-auto px-4 mb-6 print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Link 
            href="/admin/invoices"
            className="text-gray-600 hover:text-gray-900 font-semibold flex items-center gap-2"
          >
            ← Back to Invoices
          </Link>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              🖨️ Print / Save PDF
            </button>
            {invoice.status === 'unpaid' && (
              <span className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-bold border-2 border-yellow-300">
                ⏳ Awaiting Payment
              </span>
            )}
            {invoice.status === 'paid' && (
              <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-bold border-2 border-green-300">
                ✅ Paid
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="max-w-4xl mx-auto px-4 print:px-0 print:max-w-none">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none print:rounded-none">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-8 print:bg-red-600">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center print:hidden">
                  <Image
                    src="/bus-icon.png"
                    alt="Mac Track"
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-3xl font-black">{companyInfo.name}</h1>
                  <p className="text-sm opacity-90">ABN: {companyInfo.abn}</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-4xl font-black mb-2">TAX INVOICE</h2>
                <p className="text-xl font-bold">{invoice.invoice_number}</p>
              </div>
            </div>
          </div>

          {/* Company & Client Details */}
          <div className="p-8 border-b border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {/* From */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">From</h3>
                <p className="font-bold text-gray-900">{companyInfo.name}</p>
                <p className="text-gray-600">{companyInfo.address}</p>
                <p className="text-gray-600">{companyInfo.phone}</p>
                <p className="text-gray-600">{companyInfo.email}</p>
                <p className="text-gray-600 mt-1">ABN: {companyInfo.abn}</p>
              </div>

              {/* Bill To */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Bill To</h3>
                {client ? (
                  <>
                    <p className="font-bold text-gray-900">{client.name}</p>
                    {client.company && <p className="text-gray-600">{client.company}</p>}
                    <p className="text-gray-600">{client.email}</p>
                    <p className="text-gray-600">{client.phone}</p>
                    {client.address && <p className="text-gray-600">{client.address}</p>}
                  </>
                ) : (
                  <p className="text-gray-400">Client details not available</p>
                )}
              </div>
            </div>
          </div>

          {/* Invoice Meta */}
          <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Invoice Date</p>
                <p className="font-semibold text-gray-900">
                  {new Date(invoice.created_at).toLocaleDateString('en-AU')}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Due Date</p>
                <p className="font-semibold text-gray-900">
                  {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-AU') : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Order Ref</p>
                <p className="font-semibold text-gray-900 font-mono">
                  #{invoice.order_id?.slice(0, 8) || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Status</p>
                <p className={`font-bold ${invoice.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {invoice.status === 'paid' ? '✅ PAID' : '⏳ UNPAID'}
                </p>
              </div>
            </div>
          </div>

          {/* Order Details */}
          {order && (
            <div className="p-8 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Delivery Details</h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-blue-600">📍</span>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold">Pickup</p>
                    <p className="text-gray-900">{order.pickup_address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-600">🎯</span>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold">Delivery</p>
                    <p className="text-gray-900">{order.dropoff_address}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500">Service</p>
                    <p className="font-semibold text-gray-900 capitalize">{order.service_type?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Parcel Size</p>
                    <p className="font-semibold text-gray-900 capitalize">{order.parcel_size?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Weight</p>
                    <p className="font-semibold text-gray-900">{order.parcel_weight || '—'} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Delivered</p>
                    <p className="font-semibold text-gray-900">
                      {order.delivered_at ? new Date(order.delivered_at).toLocaleDateString('en-AU') : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pricing Breakdown */}
          <div className="p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Charges</h3>
            
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 text-xs font-bold text-gray-500 uppercase">Description</th>
                  <th className="text-right py-3 text-xs font-bold text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-4">
                    <p className="font-semibold text-gray-900">Delivery Service</p>
                    <p className="text-sm text-gray-500">
                      {order?.service_type?.replace('_', ' ')} - {order?.parcel_size?.replace('_', ' ')}
                    </p>
                  </td>
                  <td className="py-4 text-right font-semibold text-gray-900">
                    ${(order?.base_price || invoice.amount)?.toFixed(2)}
                  </td>
                </tr>

                {order?.fuel_levy > 0 && (
                  <tr>
                    <td className="py-4">
                      <p className="font-semibold text-gray-900">Fuel Levy ({order.fuel_levy_percent || 10}%)</p>
                    </td>
                    <td className="py-4 text-right font-semibold text-gray-900">
                      ${order.fuel_levy?.toFixed(2)}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="border-t-2 border-gray-200">
                <tr>
                  <td className="py-3 font-semibold text-gray-600">Subtotal</td>
                  <td className="py-3 text-right font-semibold text-gray-900">
                    ${((order?.base_price || invoice.amount) + (order?.fuel_levy || 0)).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold text-gray-600">GST (10%)</td>
                  <td className="py-3 text-right font-semibold text-gray-900">
                    ${(order?.gst || invoice.tax_amount)?.toFixed(2)}
                  </td>
                </tr>
                <tr className="border-t-2 border-gray-900">
                  <td className="py-4 text-xl font-black text-gray-900">TOTAL (AUD)</td>
                  <td className="py-4 text-right text-2xl font-black text-gray-900">
                    ${Number(invoice.total_amount).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment Details */}
          {invoice.status !== 'paid' && (
            <div className="px-8 pb-8">
              <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
                <h3 className="text-lg font-bold text-blue-900 mb-4">💳 Payment Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-blue-700 uppercase mb-1">Account Name</p>
                    <p className="font-semibold text-gray-900">{companyInfo.bankAccountName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-700 uppercase mb-1">Bank</p>
                    <p className="font-semibold text-gray-900">{companyInfo.bankName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-700 uppercase mb-1">BSB</p>
                    <p className="font-semibold text-gray-900 font-mono">{companyInfo.bankBSB}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-700 uppercase mb-1">Account Number</p>
                    <p className="font-semibold text-gray-900 font-mono">{companyInfo.bankAccountNumber}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Reference:</strong> {invoice.invoice_number}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Please use the invoice number as your payment reference.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Paid Stamp */}
          {invoice.status === 'paid' && (
            <div className="px-8 pb-8">
              <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200 text-center">
                <div className="inline-block px-8 py-3 border-4 border-green-600 rounded-lg transform -rotate-3">
                  <p className="text-3xl font-black text-green-600">PAID</p>
                  {invoice.paid_at && (
                    <p className="text-sm text-green-700 font-semibold">
                      {new Date(invoice.paid_at).toLocaleDateString('en-AU')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
            <div className="text-center text-sm text-gray-500">
              <p className="font-semibold">{companyInfo.name}</p>
              <p>{companyInfo.phone} | {companyInfo.email}</p>
              <p className="mt-2">Thank you for your business!</p>
            </div>
          </div>

        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:bg-white {
            background-color: white !important;
          }
          .print\\:py-0 {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          .print\\:px-0 {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .print\\:max-w-none {
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  );
}