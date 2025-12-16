"use client";
import { QRCodeSVG } from "qrcode.react";

export default function ShippingLabel({ order, client, showPrintButton = true }) {
  const baseUrl = 'https://mactrackcrm-xatn.vercel.app';
  const trackingUrl = `${baseUrl}/track/${order?.id}`;

  if (!order) return null;

  return (
    <div className="label-page">
      {showPrintButton && (
        <div className="no-print flex justify-center mb-6">
          <button onClick={() => window.print()} className="px-10 py-4 bg-red-600 text-white rounded-2xl font-bold text-lg hover:bg-red-700 transition shadow-xl">
            🖨️ Print Label
          </button>
        </div>
      )}

      <div id="printable-label" style={{ width: '210mm', height: '297mm', margin: '0 auto', backgroundColor: 'white', border: '3px solid black', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>
        
        <div style={{ backgroundColor: '#dc2626', color: 'white', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '70px', height: '70px', backgroundColor: 'white', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🚐</div>
            <div>
              <h1 style={{ fontSize: '42px', fontWeight: '900', margin: 0 }}>MAC TRACK</h1>
              <p style={{ fontSize: '18px', margin: 0, opacity: 0.9 }}>Courier Service</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '14px', margin: 0, opacity: 0.8 }}>ORDER ID</p>

