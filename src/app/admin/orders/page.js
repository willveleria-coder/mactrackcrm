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
  const [filter, setFilter] = useState("today");
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDriver, setFilterDriver] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  // Bulk Selection States
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [viewOrderDetails, setViewOrderDetails] = useState(null);
  const [viewDriverDetails, setViewDriverDetails] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignOrder, setAssignOrder] = useState(null);

  // Pricing Lock States (Feature 4)
  const [showPrices, setShowPrices] = useState(false);
  const [showPricingPasswordModal, setShowPricingPasswordModal] = useState(false);
  const [pricingPassword, setPricingPassword] = useState("");
  const [savedPricingPassword, setSavedPricingPassword] = useState("pricing");
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPricingPassword, setNewPricingPassword] = useState("");

  // Label printing states
const [showLabelModal, setShowLabelModal] = useState(false);
const [labelOrder, setLabelOrder] = useState(null);
const [labelCount, setLabelCount] = useState(1);

  // Order Details Lock
  const [orderDetailsUnlocked, setOrderDetailsUnlocked] = useState(false);
  const [showOrderDetailsPasswordModal, setShowOrderDetailsPasswordModal] = useState(false);
  const [orderDetailsPassword, setOrderDetailsPassword] = useState("");
  const [pendingEditOrder, setPendingEditOrder] = useState(null);

  const [orderViewUnlocked, setOrderViewUnlocked] = useState(false);
const [showOrderViewPasswordModal, setShowOrderViewPasswordModal] = useState(false);
const [orderViewPassword, setOrderViewPassword] = useState("");
const [pendingViewOrder, setPendingViewOrder] = useState(null);

  const [visibleColumns, setVisibleColumns] = useState({
    orderId: true,
    client: true,
    department: true,
    pickup: true,
    dropoff: true,
    service: true,
    eta: true,
    booked: true,
    driver: true,
    status: true,
    price: true,
    payment: true,
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
    department: "Department",
    pickup: "Pickup",
    dropoff: "Dropoff",
    service: "Service",
    eta: "ETA",
    booked: "Booked",
    driver: "Driver",
    status: "Status",
    price: "Price",
    payment: "Payment",
    actions: "Actions",
  };

  useEffect(() => { loadData(); }, []);

  // Poll for live ETA updates every 15 seconds
  useEffect(() => {
    if (orders.length === 0) return;

    const activeOrders = orders.filter(o => 
  o.driver_id && ['assigned', 'active', 'picked_up', 'in_transit'].includes(o.status) && o.service_type === 'priority'
);
    if (activeOrders.length === 0) return;

    const fetchLiveEtas = async () => {
      try {
        const { data: freshOrders } = await supabase
          .from("orders")
          .select("id, live_eta, live_eta_minutes, driver_distance_km, eta_updated_at")
          .in("id", activeOrders.map(o => o.id));

        if (freshOrders) {
          setOrders(prev => prev.map(order => {
            const fresh = freshOrders.find(f => f.id === order.id);
            if (fresh) {
              return { ...order, ...fresh };
            }
            return order;
          }));
        }
      } catch (e) {
        console.log("Live ETA poll error:", e);
      }
    };

    const intervalId = setInterval(fetchLiveEtas, 15000);
    return () => clearInterval(intervalId);
  }, [orders.length]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');
    if (orderId && orders.length > 0) {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        setViewOrderDetails(order);
      }
    }
  }, [orders]);

  async function loadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!session) { router.push("/admin/login"); return; }

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
    // Today filter - only show active (non-completed) orders from today
    if (filter === "today") {
      const today = new Date();
      const orderDate = new Date(order.created_at);
      if (orderDate.toDateString() !== today.toDateString()) return false;
      if (order.status === "delivered" || order.status === "cancelled") return false;
    }
    if (filter === "in_progress" && !["pending", "active", "assigned", "picked_up", "in_transit"].includes(order.status)) return false;
    if (filter === "completed" && order.status !== "delivered") return false;
    if (filter === "cancelled" && order.status !== "cancelled") return false;
    if (filter === "pending_payment" && order.payment_status !== "pending") return false;
    if (filter === "pending_walkin" && !(order.payment_status !== "paid" && !order.client_id)) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!order.id.toLowerCase().includes(search) && 
          !order.pickup_address?.toLowerCase().includes(search) && 
          !order.dropoff_address?.toLowerCase().includes(search) && 
          !order.client?.name?.toLowerCase().includes(search)) return false;
    }
    if (filterStatus !== 'all' && order.status !== filterStatus) return false;
    if (filterDriver !== 'all' && order.driver_id !== filterDriver) return false;
    if (filterPayment !== 'all') {
      if (filterPayment === 'paid' && order.payment_status !== 'paid') return false;
      if (filterPayment === 'pending' && order.payment_status !== 'pending') return false;
      if (filterPayment === 'unpaid' && (order.payment_status === 'paid' || order.payment_status === 'pending')) return false;
    }
    if (dateFrom && new Date(order.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(order.created_at) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  }).sort((a, b) => {
    let aVal = a[sortBy], bVal = b[sortBy];
    if (sortBy === 'created_at' || sortBy === 'delivered_at') { aVal = new Date(aVal || 0); bVal = new Date(bVal || 0); }
    return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  async function handleAssignDriver() {
  if (!selectedDriver) { 
    alert("Please select a driver"); 
    return; 
  }
  
  try {
    // Get driver details
    const driver = drivers.find(d => d.id === selectedDriver);
    
    const { error } = await supabase
      .from("orders")
      .update({ 
        driver_id: selectedDriver, 
        status: "assigned", 
        driver_status: null 
      })
      .eq("id", assignOrder.id);

    if (error) throw error;

    // Send notification
    try {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          type: "driver_assigned", 
          orderId: assignOrder.id, 
          userId: selectedDriver, 
          userType: "driver" 
        })
      });
    } catch (e) { 
      console.log("Notification error:", e); 
    }

    const orderNumber = assignOrder.order_number || assignOrder.id.slice(0, 8).toUpperCase();
    const trackingLink = `https://mactrackcrm.vercel.app/track/${assignOrder.id}`;

    // Send SMS to driver
    if (driver?.phone) {
      try {
        await fetch("/api/send-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: driver.phone,
            message: `🚚 New delivery assigned!

Order #${orderNumber}
Pickup: ${assignOrder.pickup_address}
Dropoff: ${assignOrder.dropoff_address}
Service: ${assignOrder.service_type?.replace(/_/g, ' ')}

Open driver app to start delivery.`
          })
        });
      } catch (e) {
        console.log("Driver SMS error:", e);
      }
    }

    // Send SMS to customer (walk-in or client)
    const customerPhone = assignOrder.walkin_customer_phone || assignOrder.client?.phone || assignOrder.dropoff_contact_phone;
    const customerName = assignOrder.walkin_customer_name || assignOrder.client?.name || '';
    
    if (customerPhone) {
      try {
        await fetch("/api/send-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: customerPhone,
            message: `Hi${customerName ? ' ' + customerName : ''}! Your delivery #${orderNumber} has been assigned to ${driver?.name || 'a driver'}.

Track your delivery here:
${trackingLink}

- Mac With A Van 🚐`
          })
        });
      } catch (e) {
        console.log("Customer SMS error:", e);
      }
    }

    alert("✅ Driver assigned successfully!");
    setShowAssignModal(false);
    setAssignOrder(null); 
    setSelectedDriver(null);
    await loadData();
  } catch (error) { 
    alert("Failed to assign driver: " + error.message); 
  }
}

  function handleEditOrder(order) {
    // Check if order details are locked
    if (!orderDetailsUnlocked) {
      setPendingEditOrder(order);
      setShowOrderDetailsPasswordModal(true);
      return;
    }

    openEditModal(order);
  }

  function handleViewOrder(order) {
  if (!orderViewUnlocked) {
    setPendingViewOrder(order);
    setShowOrderViewPasswordModal(true);
    return;
  }
  setViewOrderDetails(order);
}

  function openEditModal(order) {
    // Parse custom_eta if exists
    let custom_eta_date = '';
    let custom_eta_time = '';
    if (order.custom_eta) {
      const etaDate = new Date(order.custom_eta);
      custom_eta_date = etaDate.toISOString().split('T')[0];
      custom_eta_time = etaDate.toTimeString().slice(0, 5);
    }
    
    function handleViewOrder(order) {
  if (!orderViewUnlocked) {
    setPendingViewOrder(order);
    setShowOrderViewPasswordModal(true);
    return;
  }
  setViewOrderDetails(order);
}
    setEditFormData({
      custom_eta_date,
      custom_eta_time,
      department: order.department || '',
      dropoff_department: order.dropoff_department || '',
      pickup_address: order.pickup_address || '', pickup_contact_name: order.pickup_contact_name || '', pickup_contact_phone: order.pickup_contact_phone || '',
      dropoff_address: order.dropoff_address || '', dropoff_contact_name: order.dropoff_contact_name || '', dropoff_contact_phone: order.dropoff_contact_phone || '',
      parcel_size: order.parcel_size || 'small_box', quantity: order.quantity || 1, parcel_weight: order.parcel_weight || '',
      length: order.length || '', width: order.width || '', height: order.height || '',
      service_type: order.service_type || 'standard', scheduled_date: order.scheduled_date || '', scheduled_time: order.scheduled_time || '',
      notes: order.notes || '', fragile: order.fragile || false, driver_id: order.driver_id || '', status: order.status || 'pending',
      price: order.price || 0, base_price: order.base_price || order.price || 0, fuel_levy: order.fuel_levy || 0, fuel_levy_percent: order.fuel_levy_percent || 10, gst: order.gst || 0,
      wait_time: order.wait_time || 0,
    });
    setEditOrder(order);
  }

  function handleEditInputChange(e) {
    const { name, value, type, checked } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function recalculatePrice() {
    const basePrice = parseFloat(editFormData.base_price) || 0;
    const waitTime = parseFloat(editFormData.wait_time) || 0;
    const waitTimeFee = waitTime * 1;
    const fuelLevyPercent = parseFloat(editFormData.fuel_levy_percent) || 10;
    const subtotalBeforeFuel = basePrice + waitTimeFee;
    const fuelLevy = subtotalBeforeFuel * (fuelLevyPercent / 100);
    const subtotal = subtotalBeforeFuel + fuelLevy;
    const gst = subtotal * 0.10;
    const total = subtotal + gst;
    setEditFormData(prev => ({ 
      ...prev, 
      fuel_levy: fuelLevy, 
      gst: gst, 
      price: total 
    }));
  }

  async function handleSaveEdit() {
    if (!editOrder) return;
    setSaving(true);
    try {
      const updateData = {
        custom_eta: (editFormData.custom_eta_date && editFormData.custom_eta_time) 
          ? new Date(`${editFormData.custom_eta_date}T${editFormData.custom_eta_time}`).toISOString() 
          : null,
        department: editFormData.department || null,
dropoff_department: editFormData.dropoff_department || null,
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

  // Bulk Selection Functions
  function toggleSelectOrder(orderId) {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  }

  function toggleSelectAll() {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(o => o.id));
    }
  }

  async function handleBulkAssign() {
    if (!selectedDriver) {
      alert("Please select a driver");
      return;
    }
    if (selectedOrders.length === 0) {
      alert("No orders selected");
      return;
    }

    try {
      const { error } = await supabase
        .from("orders")
        .update({ 
          driver_id: selectedDriver, 
          status: "assigned",
          driver_status: null 
        })
        .in("id", selectedOrders);

      if (error) throw error;

      alert(`✅ ${selectedOrders.length} orders assigned successfully!`);
      setShowBulkAssignModal(false);
      setSelectedOrders([]);
      setSelectedDriver(null);
      await loadData();
    } catch (error) {
      alert("Failed to assign orders: " + error.message);
    }
  }

  async function handleBulkDelete() {
    if (selectedOrders.length === 0) {
      alert("No orders selected");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedOrders.length} orders? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .in("id", selectedOrders);

      if (error) throw error;

      alert(`✅ ${selectedOrders.length} orders deleted!`);
      setSelectedOrders([]);
      await loadData();
    } catch (error) {
      alert("Failed to delete orders: " + error.message);
    }
  }

  async function handleBulkStatusUpdate() {
    if (!bulkStatus) {
      alert("Please select a status");
      return;
    }
    if (selectedOrders.length === 0) {
      alert("No orders selected");
      return;
    }

    try {
      const updateData = { status: bulkStatus };
      
      // If marking as delivered, add delivered_at timestamp
      if (bulkStatus === "delivered") {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .in("id", selectedOrders);

      if (error) throw error;

      alert(`✅ ${selectedOrders.length} orders updated to "${bulkStatus}"!`);
      setShowBulkStatusModal(false);
      setSelectedOrders([]);
      setBulkStatus("");
      await loadData();
    } catch (error) {
      alert("Failed to update orders: " + error.message);
    }
  }

  async function handleLogout() { await supabase.auth.signOut(); router.push("/admin/login"); }

  async function handleViewDriver(driverId) {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;
    const driverOrders = orders.filter(o => o.driver_id === driverId);
    setViewDriverDetails({ ...driver, completedOrders: driverOrders.filter(o => o.status === "delivered").length, activeOrders: driverOrders.filter(o => o.status === "pending" || o.status === "active").length });
  }

  function handlePrintLabel(order) {
    setLabelOrder(order);
    setLabelCount(order.quantity || 1);
    setShowLabelModal(true);
  }

  function printLabels() {
    const order = labelOrder;
    if (!order) return;

    let etaString = '';
    
    if (order.custom_eta) {
      const customDate = new Date(order.custom_eta);
      etaString = customDate.toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
    } else {
      const etaHours = { standard: 5, same_day: 12, next_day: 24, local_overnight: 24, emergency: 2, vip: 3, priority: 1.5, scheduled: 0, after_hours: 24 };
      const hours = etaHours[order.service_type] || 5;
      
      if (hours === 0 && order.scheduled_date) {
        const scheduledDateTime = new Date(order.scheduled_date + (order.scheduled_time ? ' ' + order.scheduled_time : ''));
        etaString = scheduledDateTime.toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
      } else {
        const etaDate = new Date(order.created_at || Date.now());
        etaDate.setHours(etaDate.getHours() + hours);
        etaString = etaDate.toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
      }
    }

    const orderNumber = order.order_number ? `#${order.order_number}` : `#${order.id?.slice(0, 8).toUpperCase()}`;
    const trackingUrl = `https://mactrackcrm.vercel.app/track/${order.id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(trackingUrl)}`;
    const totalLabels = labelCount;

    let labelsHtml = '';
    for (let i = 1; i <= totalLabels; i++) {
      const labelBadgeHtml = totalLabels > 1 ? `<div style="margin-top:4px;background:rgba(255,255,255,0.25);border-radius:4px;padding:2px 8px;font-size:12px;font-weight:900;font-family:monospace;">${i}/${totalLabels}</div>` : '';
      const serviceLabelBadgeHtml = totalLabels > 1 ? `<div style="background:#dbeafe;border:2px solid #3b82f6;border-radius:4px;padding:3px 10px;font-size:12px;font-weight:900;color:#1d4ed8;font-family:monospace;">📦 ${i}/${totalLabels}</div>` : '';
      const parcelLabelHtml = totalLabels > 1 ? `<div class="parcel-divider"></div><div class="parcel-item"><div class="parcel-label">Label</div><div class="parcel-value" style="color:#1d4ed8;font-weight:900;">${i}/${totalLabels}</div></div>` : '';

      labelsHtml += `
        <div class="label" style="margin-bottom: 30px; page-break-after: ${i < totalLabels ? 'always' : 'auto'};">
          <div class="header">
            <div class="header-left">
              <img src="https://mactrackcrm.vercel.app/bus-icon.png" style="width:40px;height:40px;border-radius:8px;object-fit:contain;" />
              <div><div class="brand-name">MAC WITH A VAN</div><div class="brand-sub">Courier Service</div></div>
            </div>
            <div style="text-align:right">
              <div class="order-id-label">ORDER</div>
              <div class="order-id-value">${orderNumber}</div>
              ${labelBadgeHtml}
            </div>
          </div>
          <div class="qr-row">
            <div class="qr-section"><img src="${qrUrl}" alt="QR" /><div class="qr-text">SCAN TO TRACK</div></div>
            <div class="service-section">
              <div class="service-header">
                <div><div class="service-label">SERVICE TYPE</div><div class="service-value">${order.service_type?.replace(/_/g, ' ') || 'Standard'}</div></div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">
                  ${order.fragile ? '<div class="fragile-badge">⚠️ FRAGILE</div>' : ''}
                  ${serviceLabelBadgeHtml}
                </div>
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
              ${parcelLabelHtml}
            </div>
            <div class="parcel-icon">📦</div>
          </div>
          ${order.notes ? `<div class="notes-section"><div class="notes-title">📝 Delivery Instructions</div><div class="notes-text">${order.notes}</div></div>` : ''}
          <div class="customer-row">
            <div><div class="customer-label">CUSTOMER</div><div class="customer-value">${order.client?.name || order.walkin_customer_name || 'N/A'}</div></div>
            <div><div class="date-label">DATE</div><div class="date-value">${order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}</div></div>
            <div style="text-align:right"><div class="date-label">ETA</div><div class="date-value">${etaString}</div></div>
          </div>
          <div class="footer">
            <div class="footer-contact">📞 1300 170 718 &nbsp;|&nbsp; ✉️ macwithavan@mail.com</div>
            <div class="footer-note">Keep this label visible during transit</div>
          </div>
        </div>
      `;
    }

    const labelContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Labels ${orderNumber} (${totalLabels})</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; padding: 20px; display: flex; flex-direction: column; align-items: center; }
  .label-wrapper { width: 100%; max-width: 420px; }
  .print-btn { display: block; width: 100%; padding: 14px; background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; margin-bottom: 16px; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4); }
  .print-btn:hover { transform: translateY(-2px); }
  .label-info { background: #dbeafe; border: 2px solid #3b82f6; border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; text-align: center; }
  .label-info-text { font-size: 14px; font-weight: 700; color: #1d4ed8; }
  .label { background: white; border: 3px solid #000; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.15); }
  .header { background: #dc2626; color: white; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; }
  .header-left { display: flex; align-items: center; gap: 10px; }
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
    .print-btn, .label-info { display: none !important; }
    .label-wrapper { max-width: 100% !important; }
    .label { box-shadow: none !important; border-width: 2px !important; margin-bottom: 0 !important; }
    .header { background: #dc2626 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .pickup { background: #eff6ff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .delivery { background: #f0fdf4 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .parcel-row { background: #f3f4f6 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .notes-section { background: #fefce8 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .footer { background: #111827 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .service-section { background: #f9fafb !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
</style>
</head>
<body>
<div class="label-wrapper">
  <button class="print-btn" onclick="window.print()">🖨️ Print ${totalLabels} Label${totalLabels > 1 ? 's' : ''}</button>
  ${totalLabels > 1 ? `<div class="label-info"><div class="label-info-text">📦 Printing ${totalLabels} labels for ${orderNumber}</div></div>` : ''}
  ${labelsHtml}
</div>
</body>
</html>`;

    const w = window.open('', '_blank');
    w.document.write(labelContent);
    w.document.close();
    w.onload = function() { setTimeout(() => w.print(), 500); };
    
    setShowLabelModal(false);
    setLabelOrder(null);
  }

  async function handleSendPaymentLink(order) {
    // Check client email first, then fall back to walk-in email
    const customerEmail = order.client?.email || order.walkin_customer_email;
    const customerName = order.client?.name || order.walkin_customer_name;
    
    if (!customerEmail) {
      // Prompt for email if not available
      const enteredEmail = prompt("No email on file. Enter customer email to send payment link:");
      if (!enteredEmail || !enteredEmail.includes('@')) {
        alert("❌ Valid email required to send payment link");
        return;
      }
      // Use entered email
      await sendPaymentLinkWithEmail(order, enteredEmail, customerName);
      return;
    }

    if (!confirm(`Send payment link ($${order.price?.toFixed(2)}) to ${customerEmail}?`)) {
      return;
    }

    await sendPaymentLinkWithEmail(order, customerEmail, customerName);
  }

  async function sendPaymentLinkWithEmail(order, email, name) {
    try {
      const response = await fetch("/api/send-payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          customerEmail: email,
          customerName: name,
          amount: order.price,
          orderNumber: order.order_number || order.id.slice(0, 8).toUpperCase(),
          pickupAddress: order.pickup_address,
          dropoffAddress: order.dropoff_address,
          serviceType: order.service_type,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Payment link sent to ${email}!`);
        // Update order with email if it was a walk-in without email
        if (!order.walkin_customer_email && !order.client_id) {
          await supabase
            .from("orders")
            .update({ walkin_customer_email: email })
            .eq("id", order.id);
        }
        await loadData();
      } else {
        alert("❌ Failed to send payment link: " + data.error);
      }
    } catch (error) {
      alert("❌ Error: " + error.message);
    }
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

        {/* Today / History Toggle */}
        <div className="flex gap-2 mb-4">
          <button 
            onClick={() => setFilter("today")} 
            className={`px-6 py-3 rounded-xl font-bold text-sm transition ${filter === "today" ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-200 hover:border-orange-500"}`}
          >
            📅 Today ({orders.filter(o => {
              const today = new Date();
              const orderDate = new Date(o.created_at);
              return orderDate.toDateString() === today.toDateString() && o.status !== "delivered" && o.status !== "cancelled";
            }).length})
          </button>
          <button 
            onClick={() => setFilter("all")} 
            className={`px-6 py-3 rounded-xl font-bold text-sm transition ${filter === "all" ? "bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-500"}`}
          >
            📚 All History ({orders.length})
          </button>
        </div>

        {/* Status Filters */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 mb-6">
          <button onClick={() => setFilter("in_progress")} className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition ${filter === "in_progress" ? "bg-blue-500 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-500"}`}>🔄 In Progress ({orders.filter(o => ["pending", "active", "assigned", "picked_up", "in_transit"].includes(o.status)).length})</button>
          <button onClick={() => setFilter("completed")} className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition ${filter === "completed" ? "bg-green-500 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-200 hover:border-green-500"}`}>✅ Completed ({orders.filter(o => o.status === "delivered").length})</button>
          <button onClick={() => setFilter("cancelled")} className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition ${filter === "cancelled" ? "bg-red-500 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-200 hover:border-red-500"}`}>❌ Cancelled ({orders.filter(o => o.status === "cancelled").length})</button>
          <button onClick={() => setFilter("pending_payment")} className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition ${filter === "pending_payment" ? "bg-yellow-500 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-200 hover:border-yellow-500"}`}>💳 Pending Payment ({orders.filter(o => o.payment_status === "pending").length})</button>
          <button onClick={() => setFilter("pending_walkin")} className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition ${filter === "pending_walkin" ? "bg-pink-500 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-200 hover:border-pink-500"}`}>🚶 Walk-in Unpaid ({orders.filter(o => o.payment_status !== "paid" && !o.client_id).length})</button>
        </div>

        {/* Bulk Actions Bar */}
        {selectedOrders.length > 0 && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-4 mb-6 text-white shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">☑️</span>
                <div>
                  <p className="font-bold text-lg">{selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} selected</p>
                  <p className="text-sm text-blue-200">Choose an action below</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowBulkAssignModal(true)}
                  className="px-4 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition text-sm"
                >
                  👤 Assign Driver
                </button>
                <button
                  onClick={() => setShowBulkStatusModal(true)}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 transition text-sm"
                >
                  🔄 Change Status
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition text-sm"
                >
                  🗑️ Delete
                </button>
                <button
                  onClick={() => setSelectedOrders([])}
                  className="px-4 py-2 bg-white/20 text-white rounded-xl font-bold hover:bg-white/30 transition text-sm"
                >
                  ✕ Clear
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">🔍 Search & Filters</h3>
            <div className="flex gap-2">
              {/* Pricing Lock Button */}
              {!showPrices ? (
                <button 
                  onClick={() => setShowPricingPasswordModal(true)} 
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition text-sm flex items-center gap-2"
                >
                  🔒 Show Prices
                </button>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowPrices(false)} 
                    className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition text-sm flex items-center gap-2"
                  >
                    🔓 Prices Visible
                  </button>
                  <button 
                    onClick={() => setShowChangePasswordModal(true)} 
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition text-sm"
                    title="Change Password"
                  >
                    🔑
                  </button>
                </div>
              )}

              {!orderViewUnlocked ? (
  <button 
    onClick={() => setShowOrderViewPasswordModal(true)} 
    className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition text-sm flex items-center gap-2"
  >
    🔒 View Lock
  </button>
) : (
  <button 
    onClick={() => setOrderViewUnlocked(false)} 
    className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition text-sm flex items-center gap-2"
  >
    🔓 View Unlocked
  </button>
)}


              {/* Order Details Lock Button */}
              {!orderDetailsUnlocked ? (
                <button 
                  onClick={() => setShowOrderDetailsPasswordModal(true)} 
                  className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition text-sm flex items-center gap-2"
                >
                  🔒 Edit Lock
                </button>
              ) : (
                <button 
                  onClick={() => setOrderDetailsUnlocked(false)} 
                  className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition text-sm flex items-center gap-2"
                >
                  🔓 Edit Unlocked
                </button>
              )}
              <button onClick={() => setShowColumnSettings(!showColumnSettings)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition text-sm flex items-center gap-2">⚙️ Columns</button>
            </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <input type="text" placeholder="Search by ID, address, client..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-xl">
              <option value="all">All Statuses</option>
              {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <select value={filterDriver} onChange={(e) => setFilterDriver(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-xl">
              <option value="all">All Drivers</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-xl">
              <option value="all">All Payments</option>
              <option value="paid">✅ Paid</option>
              <option value="pending">⏳ Pending</option>
              <option value="unpaid">💳 Unpaid</option>
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
            <button onClick={() => { setSearchTerm(''); setFilterStatus('all'); setFilterDriver('all'); setFilterPayment('all'); setDateFrom(''); setDateTo(''); setSortBy('created_at'); setFilter('today'); }} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-400 transition text-sm">Clear Filters</button>
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
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-600 uppercase w-12">
                      <input
                        type="checkbox"
                        checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                        onChange={toggleSelectAll}
                        className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                      />
                    </th>
                    {visibleColumns.orderId && <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Order ID</th>}
                    {visibleColumns.client && <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Client</th>}
                    {visibleColumns.department && <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Department</th>}
                    {visibleColumns.pickup && <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase hidden lg:table-cell max-w-[200px]">Pickup</th>}
                    {visibleColumns.dropoff && <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase hidden lg:table-cell max-w-[200px]">Dropoff</th>}
                    {visibleColumns.service && <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Service</th>}
                    {visibleColumns.eta && <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">ETA</th>}
                    {visibleColumns.booked && <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Booked</th>}
                    {visibleColumns.driver && <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Driver</th>}
                    {visibleColumns.status && <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Status</th>}
                    {visibleColumns.price && showPrices && <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase hidden sm:table-cell">Price</th>}
                    {visibleColumns.payment && <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase">Payment</th>}
                    {visibleColumns.actions && <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase" style={{minWidth: '340px'}}>Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrders.map((order) => {
                    let etaString = '';
                    let isCustomEta = false;
                    let isLiveEta = false;

                    // Priority 1: Live ETA from driver location (ONLY for priority service)
if (order.live_eta_minutes && order.driver_id && ['assigned', 'active', 'picked_up', 'in_transit'].includes(order.status) && order.service_type === 'priority') {
                      etaString = `${order.live_eta_minutes} min${order.live_eta_minutes !== 1 ? 's' : ''}`;
                      if (order.live_eta_minutes >= 60) {
                        const hrs = Math.floor(order.live_eta_minutes / 60);
                        const mins = order.live_eta_minutes % 60;
                        etaString = mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
                      }
                      if (order.driver_distance_km) {
                        etaString += ` (${order.driver_distance_km.toFixed(1)}km)`;
                      }
                      isLiveEta = true;
                    // Priority 2: Delivered — show delivered time
                    } else if (order.status === 'delivered' && order.delivered_at) {
                      etaString = `✅ ${new Date(order.delivered_at).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`;
                    // Priority 3: Custom ETA override
                    } else if (order.custom_eta) {
                      const customDate = new Date(order.custom_eta);
                      etaString = customDate.toLocaleString("en-AU", { 
                        day: "numeric", month: "short", hour: "numeric", minute: "2-digit" 
                      });
                      isCustomEta = true;
                    // Priority 4: Calculated from service type
                    } else {
                      const etaHours = {
                        standard: 5, same_day: 12, next_day: 24, local_overnight: 24,
                        emergency: 2, vip: 3, priority: 1.5, scheduled: 0, after_hours: 24
                      };
                      const hours = etaHours[order.service_type] || 5;

                      if (hours === 0 && order.scheduled_date) {
                        const scheduledDateTime = new Date(order.scheduled_date + (order.scheduled_time ? ' ' + order.scheduled_time : ''));
                        etaString = scheduledDateTime.toLocaleString("en-AU", { 
                          day: "numeric", month: "short", hour: "numeric", minute: "2-digit" 
                        });
                      } else {
                        const etaDate = new Date(order.created_at || Date.now());
                        etaDate.setHours(etaDate.getHours() + hours);
                        etaString = etaDate.toLocaleString("en-AU", { 
                          day: "numeric", month: "short", hour: "numeric", minute: "2-digit" 
                        });
                      }
                    }

                    return (
                      <tr key={order.id} className={`hover:bg-gray-50 transition ${selectedOrders.includes(order.id) ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(order.id)}
                            onChange={() => toggleSelectOrder(order.id)}
                            className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                          />
                        </td>
                        {visibleColumns.orderId && (
                          <td className="px-6 py-4">
                            <button onClick={() => handleViewOrder(order)} className="text-sm font-mono text-red-600 hover:underline font-bold">
                              {order.order_number ? `Order #${order.order_number}` : `#${order.id.slice(0, 8)}`}
                            </button>
                          </td>
                        )}
                        
                        {visibleColumns.client && (
  <td className="px-6 py-4">
    <div className="text-sm">
      <p className="font-semibold text-gray-900">
        {order.client?.name || order.walkin_customer_name || 'N/A'}
        {order.is_walkin && <span className="ml-1 text-xs text-orange-600">(Walk-in)</span>}
      </p>
      <p className="text-gray-500 text-xs">{order.client?.email || order.walkin_customer_email}</p>
    </div>
  </td>
)}

                        {visibleColumns.department && (
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {order.department || '—'}
                          </td>
                        )}

                        {visibleColumns.pickup && (
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate hidden lg:table-cell" title={order.pickup_address}>
                            {order.pickup_address}
                          </td>
                        )}
                        
                        {visibleColumns.dropoff && (
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate hidden lg:table-cell" title={order.dropoff_address}>
                            {order.dropoff_address}
                          </td>
                        )}
                        
                        {visibleColumns.service && (
                          <td className="px-6 py-4">
                            <span className="inline-block bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold capitalize">
                              {order.service_type?.replace(/_/g, ' ') || 'Standard'}
                            </span>
                          </td>
                        )}
                        
                        {visibleColumns.eta && (
                          <td className="px-6 py-4">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              isLiveEta ? 'bg-green-100 text-green-700 animate-pulse' :
                              order.status === 'delivered' && order.delivered_at ? 'bg-green-100 text-green-700' :
                              isCustomEta ? 'bg-orange-100 text-orange-700' : 
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {isLiveEta && '📍 '}{isCustomEta && '✏️ '}{etaString}
                            </span>
                          </td>
                        )}

                        {visibleColumns.booked && (
                          <td className="px-6 py-4">
                            <span className="text-xs text-gray-600">
                              {new Date(order.created_at).toLocaleString("en-AU", { 
                                day: "numeric", 
                                month: "short",
                                hour: "numeric", 
                                minute: "2-digit" 
                              })}
                            </span>
                          </td>
                        )}
                        
                        {visibleColumns.driver && (
                          <td className="px-6 py-4">
                            {order.driver ? (
                              <button onClick={() => handleViewDriver(order.driver_id)} className="text-sm font-semibold text-red-600 hover:underline">
                                {order.driver.name}
                              </button>
                            ) : (
                              <span className="text-sm text-gray-400">Unassigned</span>
                            )}
                          </td>
                        )}
                        
                        {visibleColumns.status && (
                          <td className="px-6 py-4">
                            <StatusBadge status={order.status} />
                          </td>
                        )}
                        
                        {visibleColumns.price && showPrices && (
                          <td className="px-6 py-4 text-sm font-bold text-gray-900 hidden sm:table-cell">
                            ${order.price?.toFixed(2)}
                          </td>
                        )}

                        {visibleColumns.payment && (
                          <td className="px-6 py-4">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              order.payment_status === 'paid' 
                                ? 'bg-green-100 text-green-700' 
                                : order.payment_status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {order.payment_status === 'paid' ? '✅ Paid' : order.payment_status === 'pending' ? '⏳ Pending' : '💳 Unpaid'}
                            </span>
                          </td>
                        )}
                        
                        {visibleColumns.actions && (
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => handleViewOrder(order)} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition">
  {orderViewUnlocked ? '👁️ View' : '🔒 View'}
</button>
                              <button onClick={() => handleEditOrder(order)} className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-bold hover:bg-yellow-600 transition">
                                {orderDetailsUnlocked ? '✏️ Edit' : '🔒 Edit'}
                              </button>
                              <button 
                                onClick={() => { 
                                  setAssignOrder(order); 
                                  setShowAssignModal(true); 
                                }} 
                                className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 transition"
                              >
                                👤 Assign
                              </button>
                              <button onClick={() => handlePrintLabel(order)} className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs font-bold hover:bg-purple-600 transition">
                                🏷️ Print Label
                              </button>
                              <button 
  onClick={() => handleSendPaymentLink(order)} 
  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
    order.payment_status === 'paid' 
      ? 'bg-green-100 text-green-700 cursor-default' 
      : order.is_walkin && order.payment_status !== 'paid'
      ? 'bg-orange-500 text-white hover:bg-orange-600'
      : 'bg-pink-500 text-white hover:bg-pink-600'
  }`}
  disabled={order.payment_status === 'paid'}
>
  {order.payment_status === 'paid' ? '✅ Paid' : order.is_walkin ? '📧 Resend Link' : '💳 Send Payment'}
</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
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
              <div><h3 className="text-2xl font-black">Edit Order</h3><p className="text-sm opacity-90">{editOrder.order_number ? `Order #${editOrder.order_number}` : `#${editOrder.id.slice(0, 8)}`}</p></div>
              <button onClick={() => setEditOrder(null)} className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center text-2xl font-bold">×</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Status</label><select name="status" value={editFormData.status} onChange={handleEditInputChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl">{statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')}</option>)}</select></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Driver</label><select name="driver_id" value={editFormData.driver_id} onChange={handleEditInputChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl"><option value="">Unassigned</option>{drivers.filter(d => d.is_active !== false).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
              </div>

              <div className="bg-purple-50 rounded-xl p-4">
                <h4 className="font-bold text-purple-900 mb-3">🏢 Department / Reference</h4>
                <input
                  type="text"
                  name="department"
                  value={editFormData.department || ""}
                  onChange={handleEditInputChange}
                  placeholder="Company name, department, or reference"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl"
                />
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
                <div className="grid grid-cols-2 gap-3 mt-3"><div><label className="block text-xs font-bold text-gray-600 mb-1">Scheduled Date</label><input type="date" name="scheduled_date" value={editFormData.scheduled_date} onChange={handleEditInputChange} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg" /></div><div><label className="block text-xs font-bold text-gray-600 mb-1">Scheduled Time</label><input type="time" name="scheduled_time" value={editFormData.scheduled_time} onChange={handleEditInputChange} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg" /></div></div>
                <div className="mt-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <label className="block text-sm font-bold text-blue-900 mb-2">🕐 Custom ETA Override</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">ETA Date</label>
                      <input type="date" name="custom_eta_date" value={editFormData.custom_eta_date || ''} onChange={handleEditInputChange} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">ETA Time</label>
                      <input type="time" name="custom_eta_time" value={editFormData.custom_eta_time || ''} onChange={handleEditInputChange} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg" />
                    </div>
                  </div>
                  <p className="text-xs text-blue-700 mt-2">Leave blank to use auto-calculated ETA based on service type</p>
                  {(editFormData.custom_eta_date || editFormData.custom_eta_time) && (
                    <button 
                      type="button"
                      onClick={() => setEditFormData(prev => ({ ...prev, custom_eta_date: '', custom_eta_time: '' }))}
                      className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200"
                    >
                      ✕ Clear Custom ETA
                    </button>
                  )}
                </div>
                <div className="mt-3"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="fragile" checked={editFormData.fragile} onChange={handleEditInputChange} className="w-4 h-4" /><span className="text-sm font-semibold">⚠️ Fragile Item</span></label></div>
              </div>
              <div><label className="block text-sm font-bold text-gray-700 mb-2">Notes</label><textarea name="notes" value={editFormData.notes} onChange={handleEditInputChange} rows={3} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl resize-none" /></div>
              <div className="bg-yellow-50 rounded-xl p-4">
                <h4 className="font-bold text-yellow-900 mb-3">💰 Pricing</h4>
                <div className="mb-4 p-3 bg-orange-50 border-2 border-orange-200 rounded-xl">
                  <label className="block text-sm font-bold text-orange-900 mb-2">⏱️ Wait Time (minutes) - $1 per minute</label>
                  <input type="number" name="wait_time" value={editFormData.wait_time || 0} onChange={(e) => { handleEditInputChange(e); setTimeout(recalculatePrice, 0); }} min="0" step="1" placeholder="0" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500" />
                  {editFormData.wait_time > 0 && (<p className="text-xs text-orange-700 mt-2">Wait time fee: ${(parseFloat(editFormData.wait_time) * 1).toFixed(2)}</p>)}
                </div>
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
             <div><h3 className="text-2xl sm:text-3xl font-bold text-gray-900">Order Details</h3><p className="text-sm text-gray-500 mt-1">{viewOrderDetails.order_number ? `Order #${viewOrderDetails.order_number}` : `#${viewOrderDetails.id.slice(0, 8)}`}</p></div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handlePrintLabel(viewOrderDetails)} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition">🏷️ Print Label</button>
                <button onClick={() => { handleEditOrder(viewOrderDetails); setViewOrderDetails(null); }} className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-bold hover:bg-yellow-600 transition">{orderDetailsUnlocked ? '✏️ Edit' : '🔒 Edit'}</button>
                <button onClick={() => setViewOrderDetails(null)} className="text-gray-500 hover:text-gray-700 text-3xl font-bold leading-none">×</button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4"><h4 className="text-sm font-bold text-gray-700 mb-2">Status</h4><StatusBadge status={viewOrderDetails.status} />
                  {viewOrderDetails.status === 'delivered' && viewOrderDetails.delivered_at && (
                    <p className="text-sm text-green-600 font-semibold mt-2">✅ Delivered at {new Date(viewOrderDetails.delivered_at).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" })}</p>
                  )}
                </div>
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

      {/* Assign Driver Modal */}
      {showAssignModal && assignOrder && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowAssignModal(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 z-50 w-11/12 max-w-md">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Assign Driver</h3>
                <p className="text-sm text-gray-500 mt-1">{assignOrder.order_number ? `Order #${assignOrder.order_number}` : `#${assignOrder.id.slice(0, 8)}`}</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-500 hover:text-gray-700 text-3xl font-bold leading-none">×</button>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-3">Select Driver</label>
              <select value={selectedDriver || ""} onChange={(e) => setSelectedDriver(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-base font-semibold">
                <option value="">-- Select Driver --</option>
                {drivers.filter(d => d.is_approved).map((driver) => (
                  <option key={driver.id} value={driver.id}>{driver.name} {driver.is_on_duty ? "✅" : "⏸️"}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">✅ = On Duty | ⏸️ = Off Duty</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAssignModal(false)} className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition">Cancel</button>
              <button onClick={handleAssignDriver} className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition">✅ Assign Driver</button>
            </div>
          </div>
        </>
      )}

      {/* Pricing Password Modal */}
      {showPricingPasswordModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowPricingPasswordModal(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 z-50 w-11/12 max-w-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🔒 Enter Password</h3>
            <p className="text-sm text-gray-600 mb-4">Enter password to view pricing information</p>
            <input
              type="password"
              value={pricingPassword}
              onChange={(e) => setPricingPassword(e.target.value)}
              placeholder="Enter password..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl mb-4 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (pricingPassword === savedPricingPassword) {
                    setShowPrices(true);
                    setShowPricingPasswordModal(false);
                    setPricingPassword("");
                  } else {
                    alert("❌ Incorrect password");
                  }
                }
              }}
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowPricingPasswordModal(false); setPricingPassword(""); }} className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition">Cancel</button>
              <button
                onClick={() => {
                  if (pricingPassword === savedPricingPassword) {
                    setShowPrices(true);
                    setShowPricingPasswordModal(false);
                    setPricingPassword("");
                  } else {
                    alert("❌ Incorrect password");
                  }
                }}
                className="flex-1 py-3 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 transition"
              >
                Unlock
              </button>
            </div>
          </div>
        </>
      )}

      {/* Order Details Lock Password Modal */}
      {showOrderDetailsPasswordModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => { setShowOrderDetailsPasswordModal(false); setPendingEditOrder(null); }} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 z-50 w-11/12 max-w-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🔒 Edit Locked</h3>
            <p className="text-sm text-gray-600 mb-4">Enter password to unlock order editing</p>
            <input
              type="password"
              value={orderDetailsPassword}
              onChange={(e) => setOrderDetailsPassword(e.target.value)}
              placeholder="Enter password..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (orderDetailsPassword === savedPricingPassword) {
                    setOrderDetailsUnlocked(true);
                    setShowOrderDetailsPasswordModal(false);
                    setOrderDetailsPassword("");
                    if (pendingEditOrder) {
                      openEditModal(pendingEditOrder);
                      setPendingEditOrder(null);
                    }
                  } else {
                    alert("❌ Incorrect password");
                  }
                }
              }}
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowOrderDetailsPasswordModal(false); setOrderDetailsPassword(""); setPendingEditOrder(null); }} className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition">Cancel</button>
              <button
                onClick={() => {
                  if (orderDetailsPassword === savedPricingPassword) {
                    setOrderDetailsUnlocked(true);
                    setShowOrderDetailsPasswordModal(false);
                    setOrderDetailsPassword("");
                    if (pendingEditOrder) {
                      openEditModal(pendingEditOrder);
                      setPendingEditOrder(null);
                    }
                  } else {
                    alert("❌ Incorrect password");
                  }
                }}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition"
              >
                Unlock
              </button>
            </div>
          </div>
        </>
      )}

      {showOrderViewPasswordModal && (
  <>
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => { setShowOrderViewPasswordModal(false); setPendingViewOrder(null); }} />
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 z-50 w-11/12 max-w-sm">
      <h3 className="text-xl font-bold text-gray-900 mb-4">🔒 View Locked</h3>
      <p className="text-sm text-gray-600 mb-4">Enter password to view order details</p>
      <input
        type="password"
        value={orderViewPassword}
        onChange={(e) => setOrderViewPassword(e.target.value)}
        placeholder="Enter password..."
        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (orderViewPassword === savedPricingPassword) {
              setOrderViewUnlocked(true);
              setShowOrderViewPasswordModal(false);
              setOrderViewPassword("");
              if (pendingViewOrder) {
                setViewOrderDetails(pendingViewOrder);
                setPendingViewOrder(null);
              }
            } else {
              alert("❌ Incorrect password");
            }
          }
        }}
      />
      <div className="flex gap-3">
        <button onClick={() => { setShowOrderViewPasswordModal(false); setOrderViewPassword(""); setPendingViewOrder(null); }} className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition">Cancel</button>
        <button
          onClick={() => {
            if (orderViewPassword === savedPricingPassword) {
              setOrderViewUnlocked(true);
              setShowOrderViewPasswordModal(false);
              setOrderViewPassword("");
              if (pendingViewOrder) {
                setViewOrderDetails(pendingViewOrder);
                setPendingViewOrder(null);
              }
            } else {
              alert("❌ Incorrect password");
            }
          }}
          className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition"
        >
          Unlock
        </button>
      </div>
    </div>
  </>
)}

      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowBulkAssignModal(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 z-50 w-11/12 max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-2">👤 Bulk Assign Driver</h3>
            <p className="text-sm text-gray-600 mb-4">Assign {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} to a driver</p>
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-3">Select Driver</label>
              <select
                value={selectedDriver || ""}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-base font-semibold"
              >
                <option value="">-- Select Driver --</option>
                {drivers.filter(d => d.is_approved).map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name} {driver.is_on_duty ? "✅" : "⏸️"}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-blue-50 rounded-xl p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Orders to assign:</strong> {selectedOrders.length}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowBulkAssignModal(false); setSelectedDriver(null); }}
                className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAssign}
                className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition"
              >
                ✅ Assign All
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bulk Status Modal */}
      {showBulkStatusModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowBulkStatusModal(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 z-50 w-11/12 max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-2">🔄 Bulk Update Status</h3>
            <p className="text-sm text-gray-600 mb-4">Update status for {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''}</p>
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-3">Select New Status</label>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-base font-semibold"
              >
                <option value="">-- Select Status --</option>
                <option value="pending">⏳ Pending</option>
                <option value="assigned">👤 Assigned</option>
                <option value="active">🚚 Active</option>
                <option value="picked_up">📦 Picked Up</option>
                <option value="in_transit">🚚 In Transit</option>
                <option value="delivered">✅ Delivered</option>
                <option value="cancelled">❌ Cancelled</option>
              </select>
            </div>

            <div className="bg-yellow-50 rounded-xl p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Orders to update:</strong> {selectedOrders.length}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowBulkStatusModal(false); setBulkStatus(""); }}
                className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkStatusUpdate}
                className="flex-1 py-3 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 transition"
              >
                ✅ Update All
              </button>
            </div>
          </div>
        </>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowChangePasswordModal(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 z-50 w-11/12 max-w-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🔑 Change Password</h3>
            <p className="text-sm text-gray-600 mb-4">Enter your old password and set a new one</p>
            
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">Old Password</label>
              <input
                type="password"
                value={pricingPassword}
                onChange={(e) => setPricingPassword(e.target.value)}
                placeholder="Enter old password..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                autoFocus
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">New Password</label>
              <input
                type="password"
                value={newPricingPassword}
                onChange={(e) => setNewPricingPassword(e.target.value)}
                placeholder="Enter new password..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => { 
                  setShowChangePasswordModal(false); 
                  setNewPricingPassword(""); 
                  setPricingPassword("");
                }}
                className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pricingPassword !== savedPricingPassword) {
                    alert("❌ Old password is incorrect");
                    return;
                  }
                  if (newPricingPassword.length < 3) {
                    alert("❌ New password must be at least 3 characters");
                    return;
                  }
                  setSavedPricingPassword(newPricingPassword);
                  setShowChangePasswordModal(false);
                  setNewPricingPassword("");
                  setPricingPassword("");
                  alert("✅ Password changed successfully!");
                }}
                className="flex-1 py-3 bg-gray-700 text-white rounded-xl font-bold hover:bg-gray-800 transition"
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}

          {/* Label Count Modal */}
      {showLabelModal && labelOrder && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowLabelModal(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 z-50 w-11/12 max-w-md">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">🏷️ Print Labels</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {labelOrder.order_number ? `Order #${labelOrder.order_number}` : `#${labelOrder.id.slice(0, 8)}`}
                </p>
              </div>
              <button 
                onClick={() => setShowLabelModal(false)} 
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-3">
                How many labels do you need?
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setLabelCount(Math.max(1, labelCount - 1))}
                  className="w-12 h-12 bg-gray-200 text-gray-700 rounded-xl font-bold text-2xl hover:bg-gray-300 transition"
                >
                  -
                </button>
                <input
                  type="number"
                  value={labelCount}
                  onChange={(e) => setLabelCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  min="1"
                  max="50"
                  className="w-24 h-12 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  onClick={() => setLabelCount(Math.min(50, labelCount + 1))}
                  className="w-12 h-12 bg-gray-200 text-gray-700 rounded-xl font-bold text-2xl hover:bg-gray-300 transition"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Order quantity: {labelOrder.quantity || 1} item{(labelOrder.quantity || 1) > 1 ? 's' : ''}
              </p>
            </div>

            {/* Quick select buttons */}
            <div className="mb-6">
              <p className="text-xs font-bold text-gray-600 mb-2">Quick select:</p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 5, 10].map(num => (
                  <button
                    key={num}
                    onClick={() => setLabelCount(num)}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                      labelCount === num 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
                {labelOrder.quantity > 1 && (
                  <button
                    onClick={() => setLabelCount(labelOrder.quantity)}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                      labelCount === labelOrder.quantity 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    Qty ({labelOrder.quantity})
                  </button>
                )}
              </div>
            </div>

            {labelCount > 1 && (
              <div className="bg-blue-50 rounded-xl p-4 mb-6 border-2 border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>📦 Labels will show:</strong> 1/{labelCount}, 2/{labelCount}, 3/{labelCount}... etc.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowLabelModal(false)}
                className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={printLabels}
                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-bold hover:from-purple-600 hover:to-purple-700 transition shadow-lg"
              >
                🖨️ Print {labelCount} Label{labelCount > 1 ? 's' : ''}
              </button>
            </div>
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