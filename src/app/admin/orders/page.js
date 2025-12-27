"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import HamburgerMenu from "@/components/HamburgerMenu";

export default function AdminOrdersPage() {
  const [admin, setAdmin] = useState(null);
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [filter, setFilter] = useState("all");
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDriver, setFilterDriver] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [viewOrderDetails, setViewOrderDetails] = useState(null);
  const [viewDriverDetails, setViewDriverDetails] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [visibleColumns, setVisibleColumns] = useState({
    orderId: true,
    client: true,
    pickup: true,
    dropoff: true,
    driver: true,
    status: true,
    price: true,
    actions: true,
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const sizeOptions = {
    "small_box": "Envelope/Small Box",
    "medium_box": "Medium Box",
    "large_box": "Large Box",
    "pelican_case": "Pelican Case",
    "road_case_single": "Road Case Single",
    "road_case_double": "Road Case Double",
    "blue_tub": "Blue Tub",
    "tube": "Tube",
    "aga_kit": "AGA Kit",
    "custom": "Custom Dimensions"
  };

  const serviceOptions = {
    "standard": "Standard (3-5 Hours)",
    "next_day": "Next Day",
    "local_overnight": "Local/Overnight",
    "emergency": "Emergency (1-2 Hours)",
    "scheduled": "Scheduled",
    "vip": "VIP (2-3 Hours)",
    "same_day": "Same Day (12 Hours)",
    "priority": "Priority (1-1.5 Hours)",
  };

  const statusOptions = ["pending", "active", "delivered", "cancelled"];

  const columnLabels = {
    orderId: "Order ID",
    client: "Client",
    pickup: "Pickup",
    dropoff: "Dropoff",
    driver: "Driver",
    status: "Status",
    price: "Price",
    actions: "Actions",
  };

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { router.push("/admin/login"); return; }

      const { data: adminData, error: adminError } = await supabase.from("admins").select("*").eq("user_id", user.id).single();
      if (adminError || !adminData) { router.push("/admin/login"); return; }
      setAdmin(adminData);

      const { data: ordersData } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      const { data: clientsData } = await supabase.from("clients").select("id, name, email, phone");
      const { data: driversDataFull } = await supabase.from("drivers").select("*");

      setClients(clientsData || []);
      setDrivers(driversDataFull || []);

      const ordersWithDetails = (ordersData || []).map(order => ({
        ...order,
        client: clientsData?.find(c => c.id === order.client_id) || null,
        driver: driversDataFull?.find(d => d.id === order.driver_id) || null
      }));
      setOrders(ordersWithDetails);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = orders.filter(order => {
    if (filter === "in_progress" && order.status !== "pending" && order.status !== "active") return false;
    if (filter === "completed" && order.status !== "delivered") return false;
    if (filter === "cancelled" && order.status !== "cancelled") return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!order.id.toLowerCase().includes(search) && 
          !order.pickup_address?.toLowerCase().includes(search) && 
          !order.dropoff_address?.toLowerCase().includes(search) && 
          !order.client?.name?.toLowerCase().includes(search)) return false;
    }
    if (filterStatus !== 'all' && order.status !== filterStatus) return false;
    if (filterDriver !== 'all' && order.driver_id !== filterDriver) return false;
    if (dateFrom && new Date(order.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(order.created_at) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  }).sort((a, b) => {
    let aVal = a[sortBy], bVal = b[sortBy];
    if (sortBy === 'created_at' || sortBy === 'delivered_at') { aVal = new Date(aVal || 0); bVal = new Date(bVal || 0); }
    return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  async function handleAssignDriver(orderId) {
    if (!selectedDriver) { alert("Please select a driver first"); return; }
    try {
      const { error } = await supabase.from("orders").update({ driver_id: selectedDriver, status: "pending", driver_status: null }).eq("id", orderId);
      if (!error) {
        try {
          await fetch("/api/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "driver_assigned", orderId, userId: selectedDriver, userType: "driver" })
          });
        } catch (e) { console.log("Notification error:", e); }
      }
      if (error) throw error;
      alert("✅ Driver assigned successfully!");
      setSelectedOrder(null); setSelectedDriver(null);
      await loadData();
    } catch (error) { alert("Failed to assign driver: " + error.message); }
  }

  function handleEditOrder(order) {
    setEditFormData({
      pickup_address: order.pickup_address || '', pickup_contact_name: order.pickup_contact_name || '', pickup_contact_phone: order.pickup_contact_phone || '',
      dropoff_address: order.dropoff_address || '', dropoff_contact_name: order.dropoff_contact_name || '', dropoff_contact_phone: order.dropoff_contact_phone || '',
      parcel_size: order.parcel_size || 'small_box', quantity: order.quantity || 1, parcel_weight: order.parcel_weight || '',
      length: order.length || '', width: order.width || '', height: order.height || '',
      service_type: order.service_type || 'standard', scheduled_date: order.scheduled_date || '', scheduled_time: order.scheduled_time || '',
      notes: order.notes || '', fragile: order.fragile || false, driver_id: order.driver_id || '', status: order.status || 'pending',
      price: order.price || 0, base_price: order.base_price || order.price || 0, fuel_levy: order.fuel_levy || 0, fuel_levy_percent: order.fuel_levy_percent || 10, gst: order.gst || 0,
    });
    setEditOrder(order);
  }

  function handleEditInputChange(e) {
    const { name, value, type, checked } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function recalculatePrice() {
    const basePrice = parseFloat(editFormData.base_price) || 0;
    const fuelLevyPercent = parseFloat(editFormData.fuel_levy_percent) || 10;
    const fuelLevy = basePrice * (fuelLevyPercent / 100);
    const subtotal = basePrice + fuelLevy;
    const gst = subtotal * 0.10;
    const total = subtotal + gst;
    setEditFormData(prev => ({ ...prev, fuel_levy: fuelLevy, gst: gst, price: total }));
  }

  async function handleSaveEdit() {
    if (!editOrder) return;
    setSaving(true);
    try {
      const updateData = {
        pickup_address: editFormData.pickup_address, pickup_contact_name: editFormData.pickup_contact_name, pickup_contact_phone: editFormData.pickup_contact_phone,
        dropoff_address: editFormData.dropoff_address, dropoff_contact_name: editFormData.dropoff_contact_name, dropoff_contact_phone: editFormData.dropoff_contact_phone,
        parcel_size: editFormData.parcel_size, quantity: parseInt(editFormData.quantity) || 1, parcel_weight: parseFloat(editFormData.parcel_weight) || 0,
        length: parseFloat(editFormData.length) || null, width: parseFloat(editFormData.width) || null, height: parseFloat(editFormData.height) || null,
        service_type: editFormData.service_type, scheduled_date: editFormData.scheduled_date || null, scheduled_time: editFormData.scheduled_time || null,
        notes: editFormData.notes || null, fragile: editFormData.fragile, driver_id: editFormData.driver_id || null, status: editFormData.status,
        price: parseFloat(editFormData.price) || 0, base_price: parseFloat(editFormData.base_price) || 0,
        fuel_levy: parseFloat(editFormData.fuel_levy) || 0, fuel_levy_percent: parseFloat(editFormData.fuel_levy_percent) || 10, gst: parseFloat(editFormData.gst) || 0,
      };
      const { error } = await supabase.from("orders").update(updateData).eq("id", editOrder.id);
      if (error) throw error;
      alert("✅ Order updated successfully!");
      setEditOrder(null); setEditFormData({});
      await loadData();
    } catch (error) { alert("Failed to update order: " + error.message); }
    finally { setSaving(false); }
  }

  async function handleDeleteOrder(orderId) {
    if (!confirm("Are you sure you want to delete this order?")) return;
    try {
      const { error } = await supabase.from("orders").delete().eq("id", orderId);
      if (error) throw error;
      alert("✅ Order deleted!"); setEditOrder(null);
      await loadData();
    } catch (error) { alert("Failed to delete: " + error.message); }
  }

  async function handleLogout() { await supabase.auth.signOut(); router.push("/admin/login"); }

  async function handleViewDriver(driverId) {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;
    const driverOrders = orders.filter(o => o.driver_id === driverId);
    setViewDriverDetails({ ...driver, completedOrders: driverOrders.filter(o => o.status === "delivered").length, activeOrders: driverOrders.filter(o => o.status === "pending" || o.status === "active").length });
  }

  function handlePrintLabel(order) {
    const trackingUrl = `https://mactrackcrm.vercel.app/track/${order.id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(trackingUrl)}`;
    
    const labelContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Label #${order.id?.slice(0, 8).toUpperCase()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; padding: 20px; display: flex; justify-content: center; }
    .label-wrapper { width: 100%; max-width: 420px; }
    .print-btn { display: block; width: 100%; padding: 14px; background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; margin-bottom: 16px; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4); }
    .print-btn:hover { transform: translateY(-2px); }
    .label { background: white; border: 3px solid #000; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.15); }
    .header { background: #dc2626; color: white; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; }
    .header-left { display: flex; align-items: center; gap: 10px; }
    .logo-circle { width: 32px; height: 32px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; }
    .brand-name { font-size: 18px; font-weight: 900; }
    .brand-sub { font-size: 9px; opacity: 0.85; margin-top: -2px; }
    .order-id-label { font-size: 9px; opacity: 0.75; text-align: right; }
    .order-id-value { font-size: 14px; font-weight: 900; font-family: monospace; }
    .qr-row { display: flex; border-bottom: 2px solid #000; }
    .qr-section { padding: 12px; border-right: 2px solid #000; background: white; display: flex; flex-direction: column; align-items: center; }
    .qr-section img { width: 70px; height: 70px; }
    .qr-text { font-size: 8px; color: #6b7280; margin-top: 4px; font-weight: 600; }
    .service-section { flex: 1; padding: 12px; background: #f9fafb; }
    .service-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .service-label { font-size: 9px; color: #6b7280; font-weight: 600; }
    .service-value { font-size: 13px; font-weight: 900; color: #111; text-transform: uppercase; }
    .fragile-badge { background: #fee2e2; border: 2px solid #f87171; border-radius: 4px; padding: 3px 8px; font-size: 10px; font-weight: 900; color: #dc2626; }
    .scheduled-info { margin-top: 10px; }
    .scheduled-value { font-size: 12px; font-weight: 700; color: #111; }
    .addresses { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 2px solid #000; }
    .address-box { padding: 12px; }
    .pickup { background: #eff6ff; border-right: 2px solid #000; }
    .delivery { background: #f0fdf4; }
    .address-header { display: flex; align-items: center; gap: 4px; margin-bottom: 6px; }
    .address-icon { font-size: 14px; }
    .address-title { font-size: 10px; font-weight: 900; text-transform: uppercase; }
    .pickup .address-title { color: #1e40af; }
    .delivery .address-title { color: #166534; }
    .address-text { font-size: 11px; font-weight: 600; color: #111; line-height: 1.3; }
    .contact-info { margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.1); }
    .contact-name { font-size: 10px; font-weight: 700; color: #374151; }
    .contact-phone { font-size: 9px; color: #6b7280; }
    .parcel-row { padding: 10px 12px; background: #f3f4f6; border-bottom: 2px solid #000; display: flex; justify-content: space-between; align-items: center; }
    .parcel-details { display: flex; gap: 16px; align-items: center; }
    .parcel-item { text-align: left; }
    .parcel-label { font-size: 8px; color: #6b7280; font-weight: 600; text-transform: uppercase; }
    .parcel-value { font-size: 11px; font-weight: 700; color: #111; }
    .parcel-divider { width: 1px; height: 24px; background: #d1d5db; }
    .parcel-icon { font-size: 20px; }
    .notes-section { padding: 10px 12px; background: #fefce8; border-bottom: 2px solid #000; }
    .notes-title { font-size: 9px; font-weight: 900; color: #a16207; text-transform: uppercase; margin-bottom: 4px; }
    .notes-text { font-size: 11px; color: #111; line-height: 1.4; }
    .customer-row { padding: 8px 12px; background: white; border-bottom: 2px solid #000; display: flex; justify-content: space-between; }
    .customer-label, .date-label { font-size: 8px; color: #6b7280; font-weight: 600; }
    .customer-value, .date-value { font-size: 11px; font-weight: 700; color: #111; }
    .footer { background: #111827; color: white; padding: 10px 12px; text-align: center; }
    .footer-contact { font-size: 10px; font-weight: 600; }
    .footer-note { font-size: 8px; opacity: 0.7; margin-top: 2px; }
    @media print {
      @page { size: A4 portrait; margin: 15mm; }
      body { background: white !important; padding: 0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .print-btn { display: none !important; }
      .label-wrapper { max-width: 100% !important; }
      .label { box-shadow: none !important; border-width: 2px !important; }
      .header { background: #dc2626 !important; }
      .pickup { background: #eff6ff !important; }
      .delivery { background: #f0fdf4 !important; }
      .parcel-row { background: #f3f4f6 !important; }
      .notes-section { background: #fefce8 !important; }
      .footer { background: #111827 !important; }
    }
  </style>
</head>
<body>
  <div class="label-wrapper">
    <button class="print-btn" onclick="window.print()">🖨️ Print Label</button>
    <div class="label">
      <div class="header">
        <div class="header-left">
          <img src="https://mactrackcrm.vercel.app/bus-icon.png" style="width:40px;height:40px;border-radius:8px;object-fit:contain;" />
          <div><div class="brand-name">MAC WITH A VAN</div><div class="brand-sub">Courier Service</div></div>
        </div>
        <div><div class="order-id-label">ORDER</div><div class="order-id-value">#${order.id?.slice(0, 8).toUpperCase()}</div></div>
      </div>
      <div class="qr-row">
        <div class="qr-section"><img src="${qrUrl}" alt="QR" /><div class="qr-text">SCAN TO TRACK</div></div>
        <div class="service-section">
          <div class="service-header">
            <div><div class="service-label">SERVICE TYPE</div><div class="service-value">${order.service_type?.replace(/_/g, ' ') || 'Standard'}</div></div>
            ${order.fragile ? '<div class="fragile-badge">⚠️ FRAGILE</div>' : ''}
          </div>
          ${order.scheduled_date ? `<div class="scheduled-info"><div class="service-label">SCHEDULED</div><div class="scheduled-value">${order.scheduled_date} ${order.scheduled_time || ''}</div></div>` : ''}
        </div>
      </div>
      <div class="addresses">
        <div class="address-box pickup">
          <div class="address-header"><span class="address-icon">📍</span><span class="address-title">Pickup From</span></div>
          <div class="address-text">${order.pickup_address || 'N/A'}</div>
          ${order.pickup_contact_name ? `<div class="contact-info"><div class="contact-name">${order.pickup_contact_name}</div>${order.pickup_contact_phone ? `<div class="contact-phone">📞 ${order.pickup_contact_phone}</div>` : ''}</div>` : ''}
        </div>
        <div class="address-box delivery">
          <div class="address-header"><span class="address-icon">🎯</span><span class="address-title">Deliver To</span></div>
          <div class="address-text">${order.dropoff_address || 'N/A'}</div>
          ${order.dropoff_contact_name ? `<div class="contact-info"><div class="contact-name">${order.dropoff_contact_name}</div>${order.dropoff_contact_phone ? `<div class="contact-phone">📞 ${order.dropoff_contact_phone}</div>` : ''}</div>` : ''}
        </div>
      </div>
      <div class="parcel-row">
        <div class="parcel-details">
          <div class="parcel-item"><div class="parcel-label">Size</div><div class="parcel-value">${order.parcel_size?.replace(/_/g, ' ') || 'N/A'}</div></div>
          <div class="parcel-divider"></div>
          <div class="parcel-item"><div class="parcel-label">Weight</div><div class="parcel-value">${order.parcel_weight || 0} kg</div></div>
          <div class="parcel-divider"></div>
          <div class="parcel-item"><div class="parcel-label">Qty</div><div class="parcel-value">${order.quantity || 1}</div></div>
        </div>
        <div class="parcel-icon">📦</div>
      </div>
      ${order.notes ? `<div class="notes-section"><div class="notes-title">📝 Delivery Instructions</div><div class="notes-text">${order.notes}</div></div>` : ''}
      <div class="customer-row">
        <div><div class="customer-label">CUSTOMER</div><div class="customer-value">${order.client?.name || 'N/A'}</div></div>
        <div style="text-align:right"><div class="date-label">DATE</div><div class="date-value">${order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}</div></div>
      </div>
      <div class="footer">
        <div class="footer-contact">📞 0430 233 811 &nbsp;|&nbsp; ✉️ macwithavan@mail.com</div>
        <div class="footer-note">Keep this label visible during transit</div>
      </div>
    </div>
  </div>
</body>
</html>`;
    const w = window.open('', '_blank'); w.document.write(labelContent); w.document.close(); w.onload = function() { setTimeout(() => w.print(), 500); };
  }

  function toggleColumn(col) { setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] })); }

  const menuItems = [
    { href: "/admin/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/admin/orders", icon: "📦", label: "Orders" },
    { href: "/admin/orders/create", icon: "➕", label: "Create Order" },
    { href: "/admin/clients", icon: "👥", label: "Clients" },
    { href: "/admin/drivers", icon: "🚐", label: "Drivers" },
    { href: "/admin/analytics", icon: "📊", label: "Analytics" },
    { href: "/admin/invoices", icon: "💰", label: "Invoices" },
  ];

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center"><div className="text-gray-600 text-lg">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff]">
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/bus-icon.png" alt="Mac Track" width={40} height={40} className="object-contain" />
              <div><h1 className="text-xl sm:text-2xl font-black text-red-600">Mac Track</h1><p className="text-xs text-gray-500">Admin Portal</p></div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:inline">👋 {admin?.name || 'Admin'}</span>
              <HamburgerMenu items={menuItems} onLogout={handleLogout} userName={admin?.name || 'Admin'} userRole="Admin" />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div><h2 className="text-3xl font-bold text-gray-900 mb-2">Order Management</h2><p className="text-gray-600">View and manage all delivery orders</p></div>
          <Link href="/admin/orders/create" className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition shadow-lg">➕ Create Order</Link>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 mb-6">
          <button onClick={() => setFilter("all")} className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition ${filter === "all" ? "bg-red-600 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-200 hover:border-red-600"}`}>📋 All ({orders.length})</button>
          <button onClick={() => setFilter("in_progress")} className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition ${filter === "in_progress" ? "bg-blue-500 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-500"}`}>🔄 In Progress ({orders.filter(o => o.status === "pending" || o.status === "active").length})</button>
          <button onClick={() => setFilter("completed")} className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition ${filter === "completed" ? "bg-green-500 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-200 hover:border-green-500"}`}>✅ Completed ({orders.filter(o => o.status === "delivered").length})</button>
          <button onClick={() => setFilter("cancelled")} className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition ${filter === "cancelled" ? "bg-red-500 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-200 hover:border-red-500"}`}>❌ Cancelled ({orders.filter(o => o.status === "cancelled").length})</button>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">🔍 Search & Filters</h3>
            <button onClick={() => setShowColumnSettings(!showColumnSettings)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition text-sm flex items-center gap-2">⚙️ Columns</button>
          </div>

          {showColumnSettings && (
            <div className="mb-4 p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
              <p className="text-sm font-bold text-gray-700 mb-3">Show/Hide Columns:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(columnLabels).map(([key, label]) => (
                  <button key={key} onClick={() => toggleColumn(key)} className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${visibleColumns[key] ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {visibleColumns[key] ? '✓' : '○'} {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input type="text" placeholder="Search by ID, address, client..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-xl">
              <option value="all">All Statuses</option>
              {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <select value={filterDriver} onChange={(e) => setFilterDriver(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-xl">
              <option value="all">All Drivers</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-xl" placeholder="From" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-xl" placeholder="To" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-xl">
              <option value="created_at">Sort by Date</option>
              <option value="price">Sort by Price</option>
              <option value="status">Sort by Status</option>
            </select>
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600">Showing {filteredOrders.length} of {orders.length} orders</p>
            <button onClick={() => { setSearchTerm(''); setFilterStatus('all'); setFilterDriver('all'); setDateFrom(''); setDateTo(''); setSortBy('created_at'); }} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-400 transition text-sm">Clear Filters</button>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12"><div className="text-6xl mb-4">📦</div><p className="text-gray-500 text-lg font-semibold">No orders found</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {visibleColumns.orderId && <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase">Order ID</th>}
                    {visibleColumns.client && <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase">Client</th>}
                    {visibleColumns.pickup && <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase hidden lg:table-cell max-w-[200px]">Pickup</th>}
                    {visibleColumns.dropoff && <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase hidden lg:table-cell max-w-[200px]">Dropoff</th>}
                    {visibleColumns.driver && <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase">Driver</th>}
                    {visibleColumns.status && <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase">Status</th>}
                    {visibleColumns.price && <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase hidden sm:table-cell">Price</th>}
                    {visibleColumns.actions && <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase" style={{minWidth: '340px'}}>Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition">
                      {visibleColumns.orderId && <td className="px-4 py-4"><button onClick={() => setViewOrderDetails(order)} className="text-sm font-mono text-red-600 hover:underline font-bold">#{order.id.slice(0, 8)}</button></td>}
                      {visibleColumns.client && <td className="px-4 py-4"><div className="text-sm"><p className="font-semibold text-gray-900">{order.client?.name || 'N/A'}</p><p className="text-gray-500 text-xs">{order.client?.email}</p></div></td>}
                      {visibleColumns.pickup && <td className="px-4 py-4 text-sm text-gray-600 max-w-[200px] truncate hidden lg:table-cell" title={order.pickup_address}>{order.pickup_address}</td>}
                      {visibleColumns.dropoff && <td className="px-4 py-4 text-sm text-gray-600 max-w-[200px] truncate hidden lg:table-cell" title={order.dropoff_address}>{order.dropoff_address}</td>}
                      {visibleColumns.driver && <td className="px-4 py-4">{order.driver ? <button onClick={() => handleViewDriver(order.driver_id)} className="text-sm font-semibold text-red-600 hover:underline">{order.driver.name}</button> : <span className="text-sm text-gray-400">Unassigned</span>}</td>}
                      {visibleColumns.status && <td className="px-4 py-4"><StatusBadge status={order.status} /></td>}
                      {visibleColumns.price && <td className="px-4 py-4 text-sm font-bold text-gray-900 hidden sm:table-cell">${order.price?.toFixed(2)}</td>}
                      {visibleColumns.actions && (
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => setViewOrderDetails(order)} className="px-3 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition whitespace-nowrap">👁️ View</button>
                            <button onClick={() => handleEditOrder(order)} className="px-3 py-2 bg-yellow-500 text-white rounded-lg text-xs font-bold hover:bg-yellow-600 transition whitespace-nowrap">✏️ Edit</button>
                            <button onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)} className="px-3 py-2 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 transition whitespace-nowrap">🚐 Assign</button>
                            <button onClick={() => handlePrintLabel(order)} className="px-3 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition whitespace-nowrap">🏷️ Print Label</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {selectedOrder && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setSelectedOrder(null)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 sm:p-8 z-50 w-11/12 max-w-md">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Assign Driver</h3>
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-3">Select Driver</label>
              <select value={selectedDriver || ""} onChange={(e) => setSelectedDriver(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl">
                <option value="">Choose a driver...</option>
                {drivers.filter(d => d.is_active !== false).map(d => <option key={d.id} value={d.id}>{d.name} - {d.vehicle_type} {d.is_on_duty ? '🟢' : '⚪'}</option>)}
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => handleAssignDriver(selectedOrder)} disabled={!selectedDriver} className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition disabled:opacity-50">Assign Driver</button>
              <button onClick={() => { setSelectedOrder(null); setSelectedDriver(null); }} className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition">Cancel</button>
            </div>
          </div>
        </>
      )}

      {editOrder && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setEditOrder(null)} />
          <div className="fixed inset-4 sm:top-8 sm:left-1/2 sm:-translate-x-1/2 sm:inset-auto bg-white rounded-2xl shadow-2xl z-50 sm:w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-6 flex justify-between items-start sticky top-0 z-10">
              <div><h3 className="text-2xl font-black">Edit Order</h3><p className="text-sm opacity-90">#{editOrder.id.slice(0, 8)}</p></div>
              <button onClick={() => setEditOrder(null)} className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center text-2xl font-bold">×</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Status</label><select name="status" value={editFormData.status} onChange={handleEditInputChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl">{statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}</select></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Driver</label><select name="driver_id" value={editFormData.driver_id} onChange={handleEditInputChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl"><option value="">Unassigned</option>{drivers.filter(d => d.is_active !== false).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 mb-3">📍 Pickup Details</h4>
                <input type="text" name="pickup_address" value={editFormData.pickup_address} onChange={handleEditInputChange} placeholder="Pickup Address" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl mb-3" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" name="pickup_contact_name" value={editFormData.pickup_contact_name} onChange={handleEditInputChange} placeholder="Contact Name" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                  <input type="tel" name="pickup_contact_phone" value={editFormData.pickup_contact_phone} onChange={handleEditInputChange} placeholder="Contact Phone" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                </div>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <h4 className="font-bold text-green-900 mb-3">🎯 Delivery Details</h4>
                <input type="text" name="dropoff_address" value={editFormData.dropoff_address} onChange={handleEditInputChange} placeholder="Delivery Address" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl mb-3" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" name="dropoff_contact_name" value={editFormData.dropoff_contact_name} onChange={handleEditInputChange} placeholder="Contact Name" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                  <input type="tel" name="dropoff_contact_phone" value={editFormData.dropoff_contact_phone} onChange={handleEditInputChange} placeholder="Contact Phone" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-bold text-gray-900 mb-3">📦 Parcel Details</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Size</label><select name="parcel_size" value={editFormData.parcel_size} onChange={handleEditInputChange} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm">{Object.entries(sizeOptions).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Qty</label><input type="number" name="quantity" value={editFormData.quantity} onChange={handleEditInputChange} min="1" className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg" /></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Weight (kg)</label><input type="number" name="parcel_weight" value={editFormData.parcel_weight} onChange={handleEditInputChange} step="0.1" className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg" /></div>
                </div>
                <div className="mt-3"><label className="block text-xs font-bold text-gray-600 mb-1">Service Type</label><select name="service_type" value={editFormData.service_type} onChange={handleEditInputChange} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm">{Object.entries(serviceOptions).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                <div className="mt-3"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="fragile" checked={editFormData.fragile} onChange={handleEditInputChange} className="w-4 h-4" /><span className="text-sm font-semibold">⚠️ Fragile Item</span></label></div>
              </div>
              <div><label className="block text-sm font-bold text-gray-700 mb-2">Notes</label><textarea name="notes" value={editFormData.notes} onChange={handleEditInputChange} rows={3} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl resize-none" /></div>
              <div className="bg-yellow-50 rounded-xl p-4">
                <h4 className="font-bold text-yellow-900 mb-3">💰 Pricing</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Base ($)</label><input type="number" name="base_price" value={editFormData.base_price} onChange={(e) => { handleEditInputChange(e); setTimeout(recalculatePrice, 0); }} step="0.01" className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg" /></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Fuel %</label><input type="number" name="fuel_levy_percent" value={editFormData.fuel_levy_percent} onChange={(e) => { handleEditInputChange(e); setTimeout(recalculatePrice, 0); }} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg" /></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Fuel ($)</label><input type="number" value={editFormData.fuel_levy?.toFixed?.(2) || 0} readOnly className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg bg-gray-100" /></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">GST ($)</label><input type="number" value={editFormData.gst?.toFixed?.(2) || 0} readOnly className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg bg-gray-100" /></div>
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <button type="button" onClick={recalculatePrice} className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-bold hover:bg-yellow-600">Recalculate</button>
                  <div className="text-right"><p className="text-xs text-gray-600">Total (inc. GST)</p><p className="text-2xl font-black text-green-600">${parseFloat(editFormData.price || 0).toFixed(2)}</p></div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-3 sticky bottom-0">
              <button onClick={handleSaveEdit} disabled={saving} className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition disabled:opacity-50">{saving ? "Saving..." : "💾 Save Changes"}</button>
              <button onClick={() => handleDeleteOrder(editOrder.id)} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition">🗑️ Delete</button>
              <button onClick={() => setEditOrder(null)} className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition">Cancel</button>
            </div>
          </div>
        </>
      )}

      {viewOrderDetails && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setViewOrderDetails(null)} />
          <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-6 sm:p-8 z-50 w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div><h3 className="text-2xl sm:text-3xl font-bold text-gray-900">Order Details</h3><p className="text-sm text-gray-500 mt-1">#{viewOrderDetails.id.slice(0, 8)}</p></div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handlePrintLabel(viewOrderDetails)} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition">🏷️ Print Label</button>
                <button onClick={() => { handleEditOrder(viewOrderDetails); setViewOrderDetails(null); }} className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-bold hover:bg-yellow-600 transition">✏️ Edit</button>
                <button onClick={() => setViewOrderDetails(null)} className="text-gray-500 hover:text-gray-700 text-3xl font-bold leading-none">×</button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4"><h4 className="text-sm font-bold text-gray-700 mb-2">Status</h4><StatusBadge status={viewOrderDetails.status} /></div>
                <div className="bg-blue-50 rounded-xl p-4"><h4 className="text-sm font-bold text-blue-700 mb-2">📍 Pickup</h4><p className="text-sm text-gray-900">{viewOrderDetails.pickup_address}</p>{viewOrderDetails.pickup_contact_name && <p className="text-xs text-gray-600 mt-1">{viewOrderDetails.pickup_contact_name} - {viewOrderDetails.pickup_contact_phone}</p>}</div>
                <div className="bg-green-50 rounded-xl p-4"><h4 className="text-sm font-bold text-green-700 mb-2">🎯 Delivery</h4><p className="text-sm text-gray-900">{viewOrderDetails.dropoff_address}</p>{viewOrderDetails.dropoff_contact_name && <p className="text-xs text-gray-600 mt-1">{viewOrderDetails.dropoff_contact_name} - {viewOrderDetails.dropoff_contact_phone}</p>}</div>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4"><h4 className="text-sm font-bold text-gray-700 mb-3">📦 Parcel</h4><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-gray-600">Size:</span><span className="font-semibold capitalize">{viewOrderDetails.parcel_size?.replace('_', ' ')}</span></div><div className="flex justify-between"><span className="text-gray-600">Weight:</span><span className="font-semibold">{viewOrderDetails.parcel_weight} kg</span></div><div className="flex justify-between"><span className="text-gray-600">Service:</span><span className="font-semibold capitalize">{viewOrderDetails.service_type?.replace('_', ' ')}</span></div>{viewOrderDetails.fragile && <div className="flex justify-between"><span className="text-gray-600">Fragile:</span><span className="font-semibold text-red-600">⚠️ Yes</span></div>}</div></div>
                <div className="bg-yellow-50 rounded-xl p-4"><h4 className="text-sm font-bold text-yellow-700 mb-3">💰 Pricing</h4><div className="space-y-2 text-sm">{viewOrderDetails.base_price && <div className="flex justify-between"><span className="text-gray-600">Base:</span><span className="font-semibold">${viewOrderDetails.base_price?.toFixed(2)}</span></div>}{viewOrderDetails.fuel_levy && <div className="flex justify-between"><span className="text-gray-600">Fuel Levy:</span><span className="font-semibold">${viewOrderDetails.fuel_levy?.toFixed(2)}</span></div>}{viewOrderDetails.gst && <div className="flex justify-between"><span className="text-gray-600">GST:</span><span className="font-semibold">${viewOrderDetails.gst?.toFixed(2)}</span></div>}<div className="flex justify-between border-t pt-2"><span className="text-gray-900 font-bold">Total:</span><span className="font-bold text-green-600 text-lg">${viewOrderDetails.price?.toFixed(2)}</span></div></div></div>
                <div className="bg-gray-50 rounded-xl p-4"><h4 className="text-sm font-bold text-gray-700 mb-3">👥 People</h4><div className="space-y-2 text-sm"><p><span className="text-gray-600">Client:</span> <span className="font-semibold">{viewOrderDetails.client?.name || 'N/A'}</span></p><p><span className="text-gray-600">Driver:</span> {viewOrderDetails.driver ? <button onClick={() => { setViewOrderDetails(null); handleViewDriver(viewOrderDetails.driver_id); }} className="font-semibold text-red-600 hover:underline">{viewOrderDetails.driver.name}</button> : <span className="text-gray-400">Not assigned</span>}</p></div></div>
              </div>
            </div>
            <button onClick={() => setViewOrderDetails(null)} className="mt-6 w-full py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition">Close</button>
          </div>
        </>
      )}

      {viewDriverDetails && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setViewDriverDetails(null)} />
          <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-6 sm:p-8 z-50 w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div><h3 className="text-2xl font-bold text-gray-900">Driver Details</h3><p className="text-sm text-gray-500 mt-1">{viewDriverDetails.name}</p></div>
              <button onClick={() => setViewDriverDetails(null)} className="text-gray-500 hover:text-gray-700 text-3xl font-bold">×</button>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4"><h4 className="text-sm font-bold text-gray-700 mb-3">📞 Contact</h4><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-gray-600">Email:</span><span className="font-semibold">{viewDriverDetails.email}</span></div><div className="flex justify-between"><span className="text-gray-600">Phone:</span><span className="font-semibold">{viewDriverDetails.phone}</span></div></div></div>
              <div className="bg-blue-50 rounded-xl p-4"><h4 className="text-sm font-bold text-blue-700 mb-3">🚐 Vehicle</h4><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-gray-600">Type:</span><span className="font-semibold capitalize">{viewDriverDetails.vehicle_type}</span></div><div className="flex justify-between"><span className="text-gray-600">Rego:</span><span className="font-semibold">{viewDriverDetails.vehicle_registration || 'N/A'}</span></div></div></div>
              <div className="bg-purple-50 rounded-xl p-4"><h4 className="text-sm font-bold text-purple-700 mb-3">📊 Performance</h4><div className="grid grid-cols-2 gap-4"><div><p className="text-xs text-gray-600 mb-1">Completed</p><p className="text-2xl font-black text-gray-900">{viewDriverDetails.completedOrders}</p></div><div><p className="text-xs text-gray-600 mb-1">Active</p><p className="text-2xl font-black text-gray-900">{viewDriverDetails.activeOrders}</p></div></div></div>
              <div className="bg-gray-50 rounded-xl p-4"><h4 className="text-sm font-bold text-gray-700 mb-3">⏰ Status</h4><div className="flex items-center gap-3"><div className={`w-4 h-4 rounded-full ${viewDriverDetails.is_on_duty ? 'bg-green-500' : 'bg-gray-400'}`}></div><span className="font-semibold">{viewDriverDetails.is_on_duty ? 'On Duty' : 'Off Duty'}</span></div></div>
            </div>
            <button onClick={() => setViewDriverDetails(null)} className="mt-6 w-full py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition">Close</button>
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
    pending_payment: "bg-orange-100 text-orange-700 border-orange-300",
    confirmed: "bg-blue-100 text-blue-700 border-blue-300",
    assigned: "bg-purple-100 text-purple-700 border-purple-300",
    active: "bg-blue-100 text-blue-700 border-blue-300",
    picked_up: "bg-indigo-100 text-indigo-700 border-indigo-300",
    in_transit: "bg-blue-100 text-blue-700 border-blue-300",
    delivered: "bg-green-100 text-green-700 border-green-300",
    cancelled: "bg-red-100 text-red-700 border-red-300",
    failed: "bg-red-100 text-red-700 border-red-300",
  };
  const labels = {
    pending: "⏳ Pending",
    pending_payment: "💳 Pending Payment",
    confirmed: "✅ Confirmed",
    assigned: "👤 Assigned",
    active: "🚚 Active",
    picked_up: "📦 Picked Up",
    in_transit: "🚚 In Transit",
    delivered: "✅ Delivered",
    cancelled: "❌ Cancelled",
    failed: "❌ Failed",
  };
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || "bg-gray-100 text-gray-600 border-gray-300"}`}>
      {labels[status] || status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || "Unknown"}
    </span>
  );
}