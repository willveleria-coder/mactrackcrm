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
  const router = useRouter();
  const supabase = createClient();

  const sizeOptions = {
    "small_box": "Envelope/Small Box (up to 25×20×10cm)",
    "medium_box": "Medium Box (up to 50×40×30cm)",
    "large_box": "Large Box (up to 80×60×50cm)",
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
    "next_day": "Next Day (Delivery Tomorrow)",
    "local_overnight": "Local/Overnight (Next Day)",
    "emergency": "Emergency (1-2 Hours)",
    "scheduled": "Scheduled (Schedule A Delivery Day)",
    "vip": "VIP (2-3 Hours)",
    "same_day": "Same Day (12 Hours)",
    "priority": "Priority (1-1.5 Hours)",
  };

  const statusOptions = ["pending", "active", "delivered", "cancelled"];

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

      const { data: adminData, error: adminError } = await supabase
        .from("admins")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (adminError || !adminData) {
        router.push("/admin/login");
        return;
      }

      setAdmin(adminData);

      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (ordersError) {
        setOrders([]);
      } else {
        const { data: clientsData } = await supabase
          .from("clients")
          .select("id, name, email, phone");

        setClients(clientsData || []);

        const { data: driversDataFull } = await supabase
          .from("drivers")
          .select("*");

        setDrivers(driversDataFull || []);

        const ordersWithDetails = ordersData.map(order => ({
          ...order,
          client: clientsData?.find(c => c.id === order.client_id) || null,
          driver: driversDataFull?.find(d => d.id === order.driver_id) || null
        }));

        setOrders(ordersWithDetails);
      }

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
      const matchesId = order.id.toLowerCase().includes(search);
      const matchesPickup = order.pickup_address?.toLowerCase().includes(search);
      const matchesDropoff = order.dropoff_address?.toLowerCase().includes(search);
      const matchesClient = order.client?.name?.toLowerCase().includes(search);
      if (!matchesId && !matchesPickup && !matchesDropoff && !matchesClient) return false;
    }
    
    if (filterStatus !== 'all' && order.status !== filterStatus) return false;
    if (filterDriver !== 'all' && order.driver_id !== filterDriver) return false;
    if (dateFrom && new Date(order.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(order.created_at) > new Date(dateTo + 'T23:59:59')) return false;
    
    return true;
  }).sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    if (sortBy === 'created_at' || sortBy === 'delivered_at') {
      aVal = new Date(aVal || 0);
      bVal = new Date(bVal || 0);
    }
    return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  async function handleAssignDriver(orderId) {
    if (!selectedDriver) {
      alert("Please select a driver first");
      return;
    }
    try {
      const { error } = await supabase
        .from("orders")
        .update({ driver_id: selectedDriver, status: "pending", driver_status: null })
        .eq("id", orderId);
      if (error) throw error;
      alert("✅ Driver assigned successfully!");
      setSelectedOrder(null);
      setSelectedDriver(null);
      await loadData();
    } catch (error) {
      alert("Failed to assign driver: " + error.message);
    }
  }

  function handleEditOrder(order) {
    setEditFormData({
      pickup_address: order.pickup_address || '',
      pickup_contact_name: order.pickup_contact_name || '',
      pickup_contact_phone: order.pickup_contact_phone || '',
      dropoff_address: order.dropoff_address || '',
      dropoff_contact_name: order.dropoff_contact_name || '',
      dropoff_contact_phone: order.dropoff_contact_phone || '',
      parcel_size: order.parcel_size || 'small_box',
      quantity: order.quantity || 1,
      parcel_weight: order.parcel_weight || '',
      length: order.length || '',
      width: order.width || '',
      height: order.height || '',
      service_type: order.service_type || 'standard',
      scheduled_date: order.scheduled_date || '',
      scheduled_time: order.scheduled_time || '',
      notes: order.notes || '',
      fragile: order.fragile || false,
      driver_id: order.driver_id || '',
      status: order.status || 'pending',
      price: order.price || 0,
      base_price: order.base_price || order.price || 0,
      fuel_levy: order.fuel_levy || 0,
      fuel_levy_percent: order.fuel_levy_percent || 10,
      gst: order.gst || 0,
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
        pickup_address: editFormData.pickup_address,
        pickup_contact_name: editFormData.pickup_contact_name,
        pickup_contact_phone: editFormData.pickup_contact_phone,
        dropoff_address: editFormData.dropoff_address,
        dropoff_contact_name: editFormData.dropoff_contact_name,
        dropoff_contact_phone: editFormData.dropoff_contact_phone,
        parcel_size: editFormData.parcel_size,
        quantity: parseInt(editFormData.quantity) || 1,
        parcel_weight: parseFloat(editFormData.parcel_weight) || 0,
        length: parseFloat(editFormData.length) || null,
        width: parseFloat(editFormData.width) || null,
        height: parseFloat(editFormData.height) || null,
        service_type: editFormData.service_type,
        scheduled_date: editFormData.scheduled_date || null,
        scheduled_time: editFormData.scheduled_time || null,
        notes: editFormData.notes || null,
        fragile: editFormData.fragile,
        driver_id: editFormData.driver_id || null,
        status: editFormData.status,
        price: parseFloat(editFormData.price) || 0,
        base_price: parseFloat(editFormData.base_price) || 0,
        fuel_levy: parseFloat(editFormData.fuel_levy) || 0,
        fuel_levy_percent: parseFloat(editFormData.fuel_levy_percent) || 10,
        gst: parseFloat(editFormData.gst) || 0,
      };
      const { error } = await supabase.from("orders").update(updateData).eq("id", editOrder.id);
      if (error) throw error;
      alert("✅ Order updated successfully!");
      setEditOrder(null);
      setEditFormData({});
      await loadData();
    } catch (error) {
      alert("Failed to update order: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteOrder(orderId) {
    if (!confirm("Are you sure you want to delete this order? This action cannot be undone.")) return;
    try {
      const { error } = await supabase.from("orders").delete().eq("id", orderId);
      if (error) throw error;
      alert("✅ Order deleted successfully!");
      setEditOrder(null);
      await loadData();
    } catch (error) {
      alert("Failed to delete order: " + error.message);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  async function handleViewDriver(driverId) {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;
    const driverOrders = orders.filter(o => o.driver_id === driverId);
    const completedOrders = driverOrders.filter(o => o.status === "delivered").length;
    const activeOrders = driverOrders.filter(o => o.status === "pending" || o.status === "active").length;
    setViewDriverDetails({ ...driver, completedOrders, activeOrders });
  }

  function handlePrintOrder(order) {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order #${order.id.slice(0, 8)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { color: #dc2626; margin: 0; }
          .header p { color: #6b7280; margin: 5px 0 0; }
          .section { margin-bottom: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; }
          .section h3 { margin: 0 0 10px; color: #374151; font-size: 14px; text-transform: uppercase; }
          .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e5e7eb; }
          .row:last-child { border-bottom: none; }
          .label { color: #6b7280; }
          .value { font-weight: bold; color: #111827; }
          .total { font-size: 24px; color: #16a34a; }
          .status { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; text-transform: capitalize; }
          .status-pending { background: #fef3c7; color: #b45309; }
          .status-active { background: #dbeafe; color: #1d4ed8; }
          .status-delivered { background: #dcfce7; color: #15803d; }
          .status-cancelled { background: #fee2e2; color: #dc2626; }
          .company-info { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Mac With A Van</h1>
          <p>ABN: 18 616 164 875</p>
          <p>Order #${order.id.slice(0, 8)}</p>
        </div>
        <div class="section">
          <h3>Order Status</h3>
          <span class="status status-${order.status}">${order.status}</span>
        </div>
        <div class="section">
          <h3>📍 Pickup Details</h3>
          <div class="row"><span class="label">Address:</span><span class="value">${order.pickup_address}</span></div>
          ${order.pickup_contact_name ? `<div class="row"><span class="label">Contact:</span><span class="value">${order.pickup_contact_name} - ${order.pickup_contact_phone || ''}</span></div>` : ''}
        </div>
        <div class="section">
          <h3>🎯 Delivery Details</h3>
          <div class="row"><span class="label">Address:</span><span class="value">${order.dropoff_address}</span></div>
          ${order.dropoff_contact_name ? `<div class="row"><span class="label">Contact:</span><span class="value">${order.dropoff_contact_name} - ${order.dropoff_contact_phone || ''}</span></div>` : ''}
        </div>
        <div class="section">
          <h3>📦 Parcel Details</h3>
          <div class="row"><span class="label">Size:</span><span class="value">${order.parcel_size?.replace('_', ' ') || 'N/A'}</span></div>
          <div class="row"><span class="label">Weight:</span><span class="value">${order.parcel_weight || 0} kg</span></div>
          <div class="row"><span class="label">Service:</span><span class="value">${order.service_type?.replace('_', ' ') || 'Standard'}</span></div>
          ${order.fragile ? `<div class="row"><span class="label">Fragile:</span><span class="value" style="color: #dc2626;">⚠️ Yes</span></div>` : ''}
        </div>
        <div class="section">
          <h3>👥 Client</h3>
          <div class="row"><span class="label">Name:</span><span class="value">${order.client?.name || 'N/A'}</span></div>
          <div class="row"><span class="label">Email:</span><span class="value">${order.client?.email || 'N/A'}</span></div>
          <div class="row"><span class="label">Phone:</span><span class="value">${order.client?.phone || 'N/A'}</span></div>
        </div>
        <div class="section">
          <h3>🚐 Driver</h3>
          <div class="row"><span class="label">Name:</span><span class="value">${order.driver?.name || 'Not Assigned'}</span></div>
          ${order.driver ? `<div class="row"><span class="label">Phone:</span><span class="value">${order.driver?.phone || 'N/A'}</span></div>` : ''}
        </div>
        <div class="section">
          <h3>💰 Pricing</h3>
          ${order.base_price ? `<div class="row"><span class="label">Base Price:</span><span class="value">$${order.base_price?.toFixed(2)}</span></div>` : ''}
          ${order.distance_charge ? `<div class="row"><span class="label">Distance Charge:</span><span class="value">$${order.distance_charge?.toFixed(2)}</span></div>` : ''}
          ${order.fuel_levy ? `<div class="row"><span class="label">Fuel Levy (${order.fuel_levy_percent || 10}%):</span><span class="value">$${order.fuel_levy?.toFixed(2)}</span></div>` : ''}
          ${order.gst ? `<div class="row"><span class="label">GST (10%):</span><span class="value">$${order.gst?.toFixed(2)}</span></div>` : ''}
          <div class="row" style="margin-top: 10px; padding-top: 10px; border-top: 2px solid #e5e7eb;">
            <span class="label" style="font-weight: bold; font-size: 16px;">Total (inc. GST):</span>
            <span class="value total">$${order.price?.toFixed(2)}</span>
          </div>
        </div>
        ${order.notes ? `<div class="section"><h3>📝 Notes</h3><p>${order.notes}</p></div>` : ''}
        <div class="section">
          <h3>📅 Timeline</h3>
          <div class="row"><span class="label">Created:</span><span class="value">${new Date(order.created_at).toLocaleString()}</span></div>
          ${order.scheduled_date ? `<div class="row"><span class="label">Scheduled:</span><span class="value">${order.scheduled_date} ${order.scheduled_time || ''}</span></div>` : ''}
          ${order.delivered_at ? `<div class="row"><span class="label">Delivered:</span><span class="value">${new Date(order.delivered_at).toLocaleString()}</span></div>` : ''}
        </div>
        <div class="company-info">
          <p><strong>Mac With A Van</strong></p>
          <p>ABN: 18 616 164 875 | Phone: 0430 233 811 | Email: macwithavan@mail.com</p>
          <p>Bank: NAB | Account: Mahmoud Hamidan Pty Ltd | BSB: 083-614 | Acc: 110881275</p>
        </div>
      </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  }

  const menuItems = [
    { href: "/admin/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/admin/orders", icon: "📦", label: "Orders" },
    { href: "/admin/orders/create", icon: "➕", label: "Create Order" },
    { href: "/admin/clients", icon: "👥", label: "Clients" },
    { href: "/admin/drivers", icon: "🚐", label: "Drivers" },
    { href: "/admin/analytics", icon: "📊", label: "Analytics" },
    { href: "/admin/invoices", icon: "💰", label: "Invoices" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff]">
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/bus-icon.png" alt="Mac Track" width={40} height={40} className="object-contain" />
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-red-600">Mac Track</h1>
                <p className="text-xs text-gray-500">Admin Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:inline">👋 {admin?.name || 'Admin'}</span>
              <HamburgerMenu items={menuItems} onLogout={handleLogout} userName={admin?.name || 'Admin'} userRole="Admin" />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Order Management</h2>
            <p className="text-gray-600">View and manage all delivery orders</p>
          </div>
          <Link href="/admin/orders/create" className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition shadow-lg">
            ➕ Create Order
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 mb-6">
          <button onClick={() => setFilter("all")} className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition ${filter === "all" ? "bg-red-600 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-200 hover:border-red-600"}`}>
            📋 All ({orders.length})
          </button>
          <button onClick={() => setFilter("in_progress")} className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition ${filter === "in_progress" ? "bg-blue-500 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-500"}`}>
            🔄 In Progress ({orders.filter(o => o.status === "pending" || o.status === "active").length})
          </button>
          <button onClick={() => setFilter("completed")} className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition ${filter === "completed" ? "bg-green-500 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-200 hover:border-green-500"}`}>
            ✅ Completed ({orders.filter(o => o.status === "delivered").length})
          </button>
          <button onClick={() => setFilter("cancelled")} className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition ${filter === "cancelled" ? "bg-red-500 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-200 hover:border-red-500"}`}>
            ❌ Cancelled ({orders.filter(o => o.status === "cancelled").length})
          </button>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">🔍 Search & Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input type="text" placeholder="Search by ID, address, client..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent">
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select value={filterDriver} onChange={(e) => setFilterDriver(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent">
              <option value="all">All Drivers</option>
              {drivers.map(driver => (<option key={driver.id} value={driver.id}>{driver.name}</option>))}
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent">
              <option value="created_at">Sort by Date</option>
              <option value="price">Sort by Price</option>
              <option value="status">Sort by Status</option>
            </select>
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600">Showing {filteredOrders.length} of {orders.length} orders</p>
            <button onClick={() => { setSearchTerm(''); setFilterStatus('all'); setFilterDriver('all'); setDateFrom(''); setDateTo(''); setSortBy('created_at'); setSortOrder('desc'); }} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-400 transition text-sm">Clear Filters</button>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-gray-500 text-lg font-semibold">No orders found</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Order ID</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Client</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase hidden lg:table-cell">Pickup</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase hidden lg:table-cell">Dropoff</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Driver</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase hidden sm:table-cell">Price</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 sm:px-6 py-4">
                        <button onClick={() => setViewOrderDetails(order)} className="text-sm font-mono text-red-600 hover:underline font-bold">#{order.id.slice(0, 8)}</button>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-sm">
                          <p className="font-semibold text-gray-900">{order.client?.name || 'N/A'}</p>
                          <p className="text-gray-500 text-xs">{order.client?.email}</p>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 max-w-xs truncate hidden lg:table-cell">{order.pickup_address}</td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 max-w-xs truncate hidden lg:table-cell">{order.dropoff_address}</td>
                      <td className="px-4 sm:px-6 py-4">
                        {order.driver ? (
                          <button onClick={() => handleViewDriver(order.driver_id)} className="text-sm font-semibold text-red-600 hover:underline">{order.driver.name}</button>
                        ) : (
                          <span className="text-sm text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4"><StatusBadge status={order.status} /></td>
                      <td className="px-4 sm:px-6 py-4 text-sm font-bold text-gray-900 hidden sm:table-cell">${order.price?.toFixed(2)}</td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => setViewOrderDetails(order)} className="px-2 py-1 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition">👁️</button>
                          <button onClick={() => handleEditOrder(order)} className="px-2 py-1 bg-yellow-500 text-white rounded-lg text-xs font-semibold hover:bg-yellow-600 transition">✏️</button>
                          <button onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)} className="px-2 py-1 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 transition">🚐</button>
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

      {selectedOrder && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setSelectedOrder(null)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 sm:p-8 z-50 w-11/12 max-w-md">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Assign Driver</h3>
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-3">Select Driver</label>
              <select value={selectedDriver || ""} onChange={(e) => setSelectedDriver(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent">
                <option value="">Choose a driver...</option>
                {drivers.filter(d => d.is_active !== false).map((driver) => (
                  <option key={driver.id} value={driver.id}>{driver.name} - {driver.vehicle_type} {driver.is_on_duty ? '🟢' : '⚪'}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => handleAssignDriver(selectedOrder)} disabled={!selectedDriver} className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed">Assign Driver</button>
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
              <div>
                <h3 className="text-2xl font-black">Edit Order</h3>
                <p className="text-sm opacity-90">#{editOrder.id.slice(0, 8)}</p>
              </div>
              <button onClick={() => setEditOrder(null)} className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center text-2xl font-bold">×</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
                  <select name="status" value={editFormData.status} onChange={handleEditInputChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent">
                    {statusOptions.map(status => (<option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Driver</label>
                  <select name="driver_id" value={editFormData.driver_id} onChange={handleEditInputChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent">
                    <option value="">Unassigned</option>
                    {drivers.filter(d => d.is_active !== false).map(driver => (<option key={driver.id} value={driver.id}>{driver.name}</option>))}
                  </select>
                </div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 mb-3">📍 Pickup Details</h4>
                <div className="space-y-3">
                  <input type="text" name="pickup_address" value={editFormData.pickup_address} onChange={handleEditInputChange} placeholder="Pickup Address" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="text" name="pickup_contact_name" value={editFormData.pickup_contact_name} onChange={handleEditInputChange} placeholder="Contact Name" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                    <input type="tel" name="pickup_contact_phone" value={editFormData.pickup_contact_phone} onChange={handleEditInputChange} placeholder="Contact Phone" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                  </div>
                </div>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <h4 className="font-bold text-green-900 mb-3">🎯 Delivery Details</h4>
                <div className="space-y-3">
                  <input type="text" name="dropoff_address" value={editFormData.dropoff_address} onChange={handleEditInputChange} placeholder="Delivery Address" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="text" name="dropoff_contact_name" value={editFormData.dropoff_contact_name} onChange={handleEditInputChange} placeholder="Contact Name" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                    <input type="tel" name="dropoff_contact_phone" value={editFormData.dropoff_contact_phone} onChange={handleEditInputChange} placeholder="Contact Phone" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-bold text-gray-900 mb-3">📦 Parcel Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Size</label>
                    <select name="parcel_size" value={editFormData.parcel_size} onChange={handleEditInputChange} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm">
                      {Object.entries(sizeOptions).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Quantity</label>
                    <input type="number" name="quantity" value={editFormData.quantity} onChange={handleEditInputChange} min="1" className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Weight (kg)</label>
                    <input type="number" name="parcel_weight" value={editFormData.parcel_weight} onChange={handleEditInputChange} step="0.1" className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Length (cm)</label>
                    <input type="number" name="length" value={editFormData.length} onChange={handleEditInputChange} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Width (cm)</label>
                    <input type="number" name="width" value={editFormData.width} onChange={handleEditInputChange} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Height (cm)</label>
                    <input type="number" name="height" value={editFormData.height} onChange={handleEditInputChange} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-bold text-gray-600 mb-1">Service Type</label>
                  <select name="service_type" value={editFormData.service_type} onChange={handleEditInputChange} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm">
                    {Object.entries(serviceOptions).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                  </select>
                </div>
                <div className="mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="fragile" checked={editFormData.fragile} onChange={handleEditInputChange} className="w-4 h-4" />
                    <span className="text-sm font-semibold">⚠️ Fragile Item</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Scheduled Date</label>
                  <input type="date" name="scheduled_date" value={editFormData.scheduled_date} onChange={handleEditInputChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Scheduled Time</label>
                  <input type="time" name="scheduled_time" value={editFormData.scheduled_time} onChange={handleEditInputChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Notes</label>
                <textarea name="notes" value={editFormData.notes} onChange={handleEditInputChange} rows={3} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl resize-none" />
              </div>
              <div className="bg-yellow-50 rounded-xl p-4">
                <h4 className="font-bold text-yellow-900 mb-3">💰 Pricing</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Base Price ($)</label>
                    <input type="number" name="base_price" value={editFormData.base_price} onChange={(e) => { handleEditInputChange(e); setTimeout(recalculatePrice, 0); }} step="0.01" className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Fuel Levy %</label>
                    <input type="number" name="fuel_levy_percent" value={editFormData.fuel_levy_percent} onChange={(e) => { handleEditInputChange(e); setTimeout(recalculatePrice, 0); }} step="1" className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Fuel Levy ($)</label>
                    <input type="number" name="fuel_levy" value={editFormData.fuel_levy?.toFixed?.(2) || editFormData.fuel_levy} readOnly className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg bg-gray-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">GST ($)</label>
                    <input type="number" name="gst" value={editFormData.gst?.toFixed?.(2) || editFormData.gst} readOnly className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg bg-gray-100" />
                  </div>
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <button type="button" onClick={recalculatePrice} className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-bold hover:bg-yellow-600">Recalculate</button>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Total (inc. GST)</p>
                    <p className="text-2xl font-black text-green-600">${parseFloat(editFormData.price || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-3 sticky bottom-0">
              <button onClick={handleSaveEdit} disabled={saving} className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition disabled:opacity-50">{saving ? "Saving..." : "💾 Save Changes"}</button>
              <button onClick={() => handleDeleteOrder(editOrder.id)} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition">🗑️ Delete Order</button>
              <button onClick={() => setEditOrder(null)} className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition">Cancel</button>
            </div>
          </div>
        </>
      )}

      {viewOrderDetails && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto" onClick={() => setViewOrderDetails(null)} />
          <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-6 sm:p-8 z-50 w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">Order Details</h3>
                <p className="text-sm text-gray-500 mt-1">#{viewOrderDetails.id.slice(0, 8)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handlePrintOrder(viewOrderDetails)} className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition">🖨️ Print</button>
                <button onClick={() => { handleEditOrder(viewOrderDetails); setViewOrderDetails(null); }} className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-bold hover:bg-yellow-600 transition">✏️ Edit</button>
                <button onClick={() => setViewOrderDetails(null)} className="text-gray-500 hover:text-gray-700 text-3xl font-bold leading-none">×</button>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-2">Status</h4>
                  <StatusBadge status={viewOrderDetails.status} />
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">Created:</span><span className="font-semibold">{new Date(viewOrderDetails.created_at).toLocaleString()}</span></div>
                    {viewOrderDetails.scheduled_date && (<div className="flex justify-between"><span className="text-gray-600">Scheduled:</span><span className="font-semibold">{viewOrderDetails.scheduled_date} {viewOrderDetails.scheduled_time || ''}</span></div>)}
                    {viewOrderDetails.delivered_at && (<div className="flex justify-between"><span className="text-gray-600">Delivered:</span><span className="font-semibold">{new Date(viewOrderDetails.delivered_at).toLocaleString()}</span></div>)}
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-blue-700 mb-2">📍 Pickup Address</h4>
                  <p className="text-sm text-gray-900">{viewOrderDetails.pickup_address}</p>
                  {viewOrderDetails.pickup_contact_name && (<p className="text-xs text-gray-600 mt-1">{viewOrderDetails.pickup_contact_name} - {viewOrderDetails.pickup_contact_phone}</p>)}
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-green-700 mb-2">🎯 Dropoff Address</h4>
                  <p className="text-sm text-gray-900">{viewOrderDetails.dropoff_address}</p>
                  {viewOrderDetails.dropoff_contact_name && (<p className="text-xs text-gray-600 mt-1">{viewOrderDetails.dropoff_contact_name} - {viewOrderDetails.dropoff_contact_phone}</p>)}
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">🗺️ Route Map</h4>
                  <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(viewOrderDetails.pickup_address)}&destination=${encodeURIComponent(viewOrderDetails.dropoff_address)}`, '_blank')} className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition">Open in Google Maps</button>
                </div>
              </div>
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">👥 People</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Client</p>
                      <p className="font-semibold text-gray-900">{viewOrderDetails.client?.name || 'N/A'}</p>
                      <p className="text-sm text-gray-600">{viewOrderDetails.client?.email}</p>
                      <p className="text-sm text-gray-600">{viewOrderDetails.client?.phone}</p>
                    </div>
                    <div className="border-t border-gray-200 pt-3">
                      <p className="text-xs text-gray-500 mb-1">Driver</p>
                      {viewOrderDetails.driver ? (
                        <>
                          <button onClick={() => { setViewOrderDetails(null); handleViewDriver(viewOrderDetails.driver_id); }} className="font-semibold text-red-600 hover:underline">{viewOrderDetails.driver.name}</button>
                          <p className="text-sm text-gray-600">{viewOrderDetails.driver.email}</p>
                          <p className="text-sm text-gray-600">{viewOrderDetails.driver.phone}</p>
                        </>
                      ) : (<p className="text-sm text-gray-400">Not assigned</p>)}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">📦 Parcel Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">Size:</span><span className="font-semibold capitalize">{viewOrderDetails.parcel_size?.replace('_', ' ')}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Weight:</span><span className="font-semibold">{viewOrderDetails.parcel_weight} kg</span></div>
                    {(viewOrderDetails.length || viewOrderDetails.width || viewOrderDetails.height) && (<div className="flex justify-between"><span className="text-gray-600">Dimensions:</span><span className="font-semibold">{viewOrderDetails.length || 0} × {viewOrderDetails.width || 0} × {viewOrderDetails.height || 0} cm</span></div>)}
                    <div className="flex justify-between"><span className="text-gray-600">Service:</span><span className="font-semibold capitalize">{viewOrderDetails.service_type?.replace('_', ' ')}</span></div>
                    {viewOrderDetails.fragile && (<div className="flex justify-between"><span className="text-gray-600">Fragile:</span><span className="font-semibold text-red-600">⚠️ Yes</span></div>)}
                  </div>
                </div>
                <div className="bg-yellow-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-yellow-700 mb-3">💰 Pricing</h4>
                  <div className="space-y-2 text-sm">
                    {viewOrderDetails.base_price && (<div className="flex justify-between"><span className="text-gray-600">Base Price:</span><span className="font-semibold">${viewOrderDetails.base_price?.toFixed(2)}</span></div>)}
                    {viewOrderDetails.fuel_levy && (<div className="flex justify-between"><span className="text-gray-600">Fuel Levy ({viewOrderDetails.fuel_levy_percent || 10}%):</span><span className="font-semibold">${viewOrderDetails.fuel_levy?.toFixed(2)}</span></div>)}
                    {viewOrderDetails.gst && (<div className="flex justify-between"><span className="text-gray-600">GST (10%):</span><span className="font-semibold">${viewOrderDetails.gst?.toFixed(2)}</span></div>)}
                    <div className="flex justify-between border-t pt-2"><span className="text-gray-900 font-bold">Total:</span><span className="font-bold text-green-600 text-lg">${viewOrderDetails.price?.toFixed(2)}</span></div>
                  </div>
                </div>
                {viewOrderDetails.notes && (<div className="bg-yellow-50 rounded-xl p-4"><h4 className="text-sm font-bold text-gray-700 mb-2">📝 Notes</h4><p className="text-sm text-gray-900 whitespace-pre-wrap">{viewOrderDetails.notes}</p></div>)}
                {viewOrderDetails.status === 'delivered' && (
                  <div className="bg-green-50 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-green-700 mb-3">✅ Proof of Delivery</h4>
                    {viewOrderDetails.anyone_home && (<div className="mb-3"><p className="text-xs text-gray-600 mb-1">Anyone Home?</p><p className="text-sm font-semibold capitalize">{viewOrderDetails.anyone_home}</p></div>)}
                    {viewOrderDetails.delivery_notes && (<div className="mb-3"><p className="text-xs text-gray-600 mb-1">Delivery Notes</p><p className="text-sm">{viewOrderDetails.delivery_notes}</p></div>)}
                    {viewOrderDetails.signature_url && (<div className="mb-3"><p className="text-xs text-gray-600 mb-2">Signature</p><img src={viewOrderDetails.signature_url} alt="Signature" className="border-2 border-gray-300 rounded-lg bg-white" /></div>)}
                    {viewOrderDetails.proof_images && viewOrderDetails.proof_images.length > 0 && (<div><p className="text-xs text-gray-600 mb-2">Proof Photos</p><div className="grid grid-cols-2 gap-2">{viewOrderDetails.proof_images.map((img, idx) => (<img key={idx} src={img} alt={`Proof ${idx + 1}`} className="w-full rounded-lg shadow" />))}</div></div>)}
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => setViewOrderDetails(null)} className="mt-6 w-full py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition">Close</button>
          </div>
        </>
      )}

      {viewDriverDetails && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto" onClick={() => setViewDriverDetails(null)} />
          <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-6 sm:p-8 z-50 w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">Driver Details</h3>
                <p className="text-sm text-gray-500 mt-1">{viewDriverDetails.name}</p>
              </div>
              <button onClick={() => setViewDriverDetails(null)} className="text-gray-500 hover:text-gray-700 text-3xl font-bold leading-none">×</button>
            </div>
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-gray-700 mb-3">📞 Contact Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Email:</span><span className="font-semibold">{viewDriverDetails.email}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Phone:</span><span className="font-semibold">{viewDriverDetails.phone}</span></div>
                </div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-blue-700 mb-3">🚐 Vehicle Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Vehicle Type:</span><span className="font-semibold capitalize">{viewDriverDetails.vehicle_type}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Registration:</span><span className="font-semibold">{viewDriverDetails.vehicle_registration || 'N/A'}</span></div>
                </div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-purple-700 mb-3">📊 Performance</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-gray-600 mb-1">Completed Orders</p><p className="text-2xl font-black text-gray-900">{viewDriverDetails.completedOrders}</p></div>
                  <div><p className="text-xs text-gray-600 mb-1">Active Orders</p><p className="text-2xl font-black text-gray-900">{viewDriverDetails.activeOrders}</p></div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-gray-700 mb-3">⏰ Current Status</h4>
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${viewDriverDetails.is_on_duty ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="font-semibold">{viewDriverDetails.is_on_duty ? 'On Duty' : 'Off Duty'}</span>
                </div>
              </div>
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
    active: "bg-blue-100 text-blue-700 border-blue-300",
    delivered: "bg-green-100 text-green-700 border-green-300",
    cancelled: "bg-red-100 text-red-700 border-red-300",
  };
  return (
    <span className={`inline-block px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold capitalize border-2 ${styles[status] || "bg-gray-100 text-gray-600 border-gray-300"}`}>
      {status}
    </span>
  );
}