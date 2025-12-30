"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import HamburgerMenu from "@/components/HamburgerMenu";
import { ThemeProvider, useTheme } from "../../../../context/ThemeContext";

function AdminCreateOrderContent() {
  const { theme } = useTheme();
  const [admin, setAdmin] = useState(null);
  const [clients, setClients] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [pricingSettings, setPricingSettings] = useState(null);
  const [formData, setFormData] = useState({
    client_id: "",
    pickup_address: "",
    dropoff_address: "",
    pickup_contact_name: "",
    pickup_contact_phone: "",
    dropoff_contact_name: "",
    dropoff_contact_phone: "",
    parcel_size: "small_box",
    quantity: "1",
    parcel_weight: "",
    length: "",
    width: "",
    height: "",
    service_type: "standard",
    scheduled_date: "",
    scheduled_time: "",
    notes: "",
    fragile: false,
    driver_id: "",
    custom_price: "",
    use_custom_price: false,
  });

  const [pricing, setPricing] = useState({
    basePrice: 0,
    distanceCharge: 0,
    chargeableDistance: 0,
    subtotal: 0,
    fuelLevy: 0,
    fuelLevyPercent: 10,
    gst: 0,
    total: 0,
    requiresQuote: false,
    distance: 0,
    duration: 0,
    perKmRate: 0
  });
  
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const distanceTimerRef = useRef(null);

  const router = useRouter();
  const supabase = createClient();

  const sizeReference = {
    "small_box": "📦 Envelope/Small Box (up to 25×20×10cm)",
    "medium_box": "📦 Medium Box (up to 50×40×30cm)",
    "large_box": "📦 Large Box (up to 80×60×50cm)",
    "pelican_case": "🧳 Pelican Case",
    "road_case_single": "🎸 Road Case Single",
    "road_case_double": "🎸 Road Case Double",
    "blue_tub": "🗑️ Blue Tub",
    "tube": "📜 Tube",
    "aga_kit": "🧰 AGA Kit",
    "custom": "📐 Custom Dimensions"
  };

  const serviceTypes = {
    "standard": "⏰ Standard (3-5 Hours)",
    "same_day": "⚡ Same Day (12 Hours)",
    "next_day": "📅 Next Day (Delivery Tomorrow)",
    "local_overnight": "🌙 Local/Overnight (Next Day)",
    "emergency": "🚨 Emergency (1-2 Hours)",
    "vip": "⭐ VIP (2-3 Hours)",
    "priority": "🔥 Priority (1-1.5 Hours)",
    "scheduled": "📆 Scheduled - Contact for Quote",
    "after_hours": "🌃 After Hours/Weekend - Contact for Quote",
  };

  const menuItems = [
    { href: "/admin/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/admin/orders", icon: "📦", label: "Orders" },
    { href: "/admin/orders/create", icon: "➕", label: "Create Order" },
    { href: "/admin/clients", icon: "👥", label: "Clients" },
    { href: "/admin/drivers", icon: "🚐", label: "Drivers" },
    { href: "/admin/invoices", icon: "💰", label: "Invoices" },
    { href: "/admin/settings", icon: "⚙️", label: "Settings" },
  ];

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (formData.pickup_address.length > 5 && formData.dropoff_address.length > 5) {
      if (distanceTimerRef.current) clearTimeout(distanceTimerRef.current);
      distanceTimerRef.current = setTimeout(() => { calculateDistanceFromAddresses(); }, 1500);
    }
    return () => { if (distanceTimerRef.current) clearTimeout(distanceTimerRef.current); };
  }, [formData.pickup_address, formData.dropoff_address]);

  useEffect(() => { calculatePrice(); }, [formData.service_type, formData.parcel_weight, formData.use_custom_price, formData.custom_price, pricing.distance, pricing.fuelLevyPercent, pricingSettings]);

  async function loadData() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { router.push("/admin/login"); return; }
      const { data: adminData, error: adminError } = await supabase.from("admins").select("*").eq("user_id", user.id).single();
      if (adminError || !adminData) { router.push("/admin/login"); return; }
      setAdmin(adminData);
      const { data: clientsData } = await supabase.from("clients").select("*").eq("is_active", true).order("name", { ascending: true });
      setClients(clientsData || []);
      const { data: driversData } = await supabase.from("drivers").select("*").eq("is_active", true).order("name", { ascending: true });
      setDrivers(driversData || []);
      const { data: settingsData } = await supabase.from("settings").select("*").eq("key", "pricing").single();
      if (settingsData?.value) { setPricingSettings(settingsData.value); }
    } catch (error) { console.error("Error loading data:", error); } finally { setLoading(false); }
  }

  async function calculateDistanceFromAddresses() {
    if (!formData.pickup_address || !formData.dropoff_address) return;
    setCalculatingDistance(true);
    try {
      const response = await fetch('/api/calculate-distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: formData.pickup_address, destination: formData.dropoff_address })
      });
      if (!response.ok) throw new Error('Failed to calculate distance');
      const data = await response.json();
      if (data.error) { setPricing(prev => ({ ...prev, distance: 0, duration: 0 })); }
      else { setPricing(prev => ({ ...prev, distance: data.distance || 0, duration: data.duration || 0 })); }
    } catch (error) { console.error('Distance calculation failed:', error); setPricing(prev => ({ ...prev, distance: 0, duration: 0 })); }
    finally { setCalculatingDistance(false); }
  }

  function calculatePrice() {
    const fuelLevyPercent = pricingSettings?.fuelLevy || pricing.fuelLevyPercent || 10;
    if (formData.use_custom_price && formData.custom_price) {
      const customBase = parseFloat(formData.custom_price) || 0;
      const fuelLevy = customBase * (fuelLevyPercent / 100);
      const beforeGst = customBase + fuelLevy;
      const gst = beforeGst * ((pricingSettings?.gst || 10) / 100);
      const total = beforeGst + gst;
      setPricing(prev => ({ ...prev, requiresQuote: false, basePrice: customBase, distanceCharge: 0, chargeableDistance: 0, subtotal: customBase, fuelLevy, gst, total, perKmRate: 0, fuelLevyPercent }));
      return;
    }
    const weight = parseFloat(formData.parcel_weight) || 0;
    const distance = pricing.distance || 0;
    const serviceType = formData.service_type;
    const serviceConfig = pricingSettings?.services || {
      priority: { multiplier: 1.70, minimum: 120, baseFee: 20 },
      after_hours: { multiplier: 1, minimum: 150, special: true, baseFee: 20 },
      emergency: { multiplier: 1.45, minimum: 100, baseFee: 10 },
      vip: { multiplier: 1.25, minimum: 85, baseFee: 10 },
      standard: { multiplier: 1.00, minimum: 65, baseFee: 10 },
      same_day: { multiplier: 1.00, minimum: 65, baseFee: 10 },
      local_overnight: { multiplier: 0.80, minimum: 50, baseFee: 10 },
      scheduled: { multiplier: 0.80, minimum: 50, baseFee: 10 },
      next_day: { multiplier: 0.80, minimum: 50, baseFee: 10 },
    };
    const config = serviceConfig[serviceType] || serviceConfig.standard;
    const distanceRate = pricingSettings?.distanceRate ?? 1.90;
    const weightRate = pricingSettings?.weightRate ?? 2.70;
    let basePrice = 0, distanceCost = 0, weightCost = 0;
    if (serviceType === "after_hours") {
      basePrice = distance <= 10 ? 150 : 150 + ((distance - 10) * 1.70);
    } else {
      distanceCost = distance * distanceRate;
      weightCost = weight > 10 ? (weight - 10) * weightRate : 0;
      basePrice = ((config.baseFee || 10) + distanceCost + weightCost) * config.multiplier;
    }
    const fuelLevy = basePrice * (fuelLevyPercent / 100);
    const beforeGst = basePrice + fuelLevy;
    const gst = beforeGst * ((pricingSettings?.gst || 10) / 100);
    const total = beforeGst + gst;
    setPricing(prev => ({ ...prev, requiresQuote: false, basePrice: parseFloat(basePrice.toFixed(2)), distanceCharge: parseFloat(distanceCost.toFixed(2)), chargeableDistance: distance, subtotal: parseFloat(basePrice.toFixed(2)), fuelLevy: parseFloat(fuelLevy.toFixed(2)), fuelLevyPercent, gst: parseFloat(gst.toFixed(2)), total: parseFloat(total.toFixed(2)), perKmRate: distanceRate }));
  }

  function handleInputChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleFuelLevyChange(e) {
    setPricing(prev => ({ ...prev, fuelLevyPercent: parseFloat(e.target.value) || 0 }));
  }

  async function handleLogout() { await supabase.auth.signOut(); router.push("/admin/login"); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!formData.client_id) { setError("Please select a client"); return; }
    if (!formData.pickup_address || !formData.dropoff_address) { setError("Pickup and dropoff addresses are required"); return; }
    if (!formData.pickup_contact_name || !formData.dropoff_contact_name) { setError("Contact names are required"); return; }
    if (!formData.pickup_contact_phone || !formData.dropoff_contact_phone) { setError("Contact phones are required"); return; }
    if (!formData.parcel_weight || parseFloat(formData.parcel_weight) <= 0) { setError("Please enter the parcel weight"); return; }

    setSubmitting(true);
    try {
      const orderData = {
        client_id: formData.client_id,
        pickup_address: formData.pickup_address,
        pickup_contact_name: formData.pickup_contact_name,
        pickup_contact_phone: formData.pickup_contact_phone,
        dropoff_address: formData.dropoff_address,
        dropoff_contact_name: formData.dropoff_contact_name,
        dropoff_contact_phone: formData.dropoff_contact_phone,
        parcel_size: formData.parcel_size,
        quantity: parseInt(formData.quantity) || 1,
        parcel_weight: parseFloat(formData.parcel_weight) || 0,
        length: parseFloat(formData.length) || null,
        width: parseFloat(formData.width) || null,
        height: parseFloat(formData.height) || null,
        service_type: formData.service_type,
        scheduled_date: formData.scheduled_date || null,
        scheduled_time: formData.scheduled_time || null,
        notes: formData.notes || null,
        fragile: formData.fragile || false,
        driver_id: formData.driver_id || null,
        distance_km: pricing.distance,
        base_price: pricing.basePrice,
        fuel_levy: pricing.fuelLevy,
        fuel_levy_percent: pricing.fuelLevyPercent,
        gst: pricing.gst,
        price: pricing.total,
        status: formData.driver_id ? "assigned" : "pending",
        created_by_admin: true,
      };

      const { data: order, error: orderError } = await supabase.from("orders").insert([orderData]).select().single();
      if (orderError) throw orderError;

      setSuccess(`✅ Order #${order.id.slice(0, 8)} created successfully!`);
      setFormData({ client_id: "", pickup_address: "", dropoff_address: "", pickup_contact_name: "", pickup_contact_phone: "", dropoff_contact_name: "", dropoff_contact_phone: "", parcel_size: "small_box", quantity: "1", parcel_weight: "", length: "", width: "", height: "", service_type: "standard", scheduled_date: "", scheduled_time: "", notes: "", fragile: false, driver_id: "", custom_price: "", use_custom_price: false });
      setPricing(prev => ({ ...prev, distance: 0, duration: 0, basePrice: 0, distanceCharge: 0, subtotal: 0, fuelLevy: 0, gst: 0, total: 0 }));
      setTimeout(() => { router.push("/admin/orders"); }, 2000);
    } catch (err) { console.error("Error creating order:", err); setError(err.message || "Failed to create order"); }
    finally { setSubmitting(false); }
  }

  if (loading) {
    return (<div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center"><div className="text-gray-600 text-lg">Loading...</div></div>);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff]">
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/bus-icon.png" alt="Mac Track" width={40} height={40} className="object-contain" />
              <div>
                <h1 className={`text-xl sm:text-2xl font-black ${theme.text}`}>Mac Track</h1>
                <p className="text-xs text-gray-500">Admin Portal</p>
              </div>
            </div>
            <HamburgerMenu items={menuItems} onLogout={handleLogout} userName={admin?.name} userRole="Admin" />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Create Client Order ➕</h2>
            <p className="text-sm sm:text-base text-gray-600">Create a delivery order on behalf of a client</p>
          </div>
          <Link href="/admin/orders" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-300 transition">← Back</Link>
        </div>

        {error && (<div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6"><p className="text-red-700 font-semibold">❌ {error}</p></div>)}
        {success && (<div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 mb-6"><p className="text-green-700 font-semibold">{success}</p></div>)}

        {/* Live Price Preview */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-4 mb-6 text-white shadow-lg sticky top-20 z-20">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs opacity-90 mb-1">Estimated Total</p>
              {pricing.requiresQuote && !formData.use_custom_price ? (<p className="text-lg font-bold">Set Custom Price</p>) : (<p className="text-3xl font-black">${pricing.total.toFixed(2)}</p>)}
              {pricing.distance > 0 && <p className="text-xs opacity-75 mt-1">{pricing.distance.toFixed(1)}km • ~{pricing.duration} mins</p>}
              {calculatingDistance && <p className="text-xs opacity-75 mt-1">Calculating distance...</p>}
            </div>
            <div className="text-5xl">💰</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Selection */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">👤 Select Client</h3>
            <select name="client_id" value={formData.client_id} onChange={handleInputChange} required className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent text-lg">
              <option value="">-- Select a Client --</option>
              {clients.map(client => (<option key={client.id} value={client.id}>{client.name} {client.company ? `(${client.company})` : ''} - {client.email}</option>))}
            </select>
            {clients.length === 0 && (<p className="text-sm text-gray-500 mt-2">No active clients. <Link href="/admin/clients" className="text-red-600 hover:underline">Add a client first</Link></p>)}
          </div>

          {/* Addresses */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📍 Pickup & Delivery</h3>
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 mb-3">Pickup Details</h4>
                <div className="space-y-4">
                  <input type="text" name="pickup_address" value={formData.pickup_address} onChange={handleInputChange} required placeholder="Pickup Address *" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="text" name="pickup_contact_name" value={formData.pickup_contact_name} onChange={handleInputChange} required placeholder="Contact Name *" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent" />
                    <input type="tel" name="pickup_contact_phone" value={formData.pickup_contact_phone} onChange={handleInputChange} required placeholder="Contact Phone *" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent" />
                  </div>
                </div>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <h4 className="font-bold text-green-900 mb-3">Delivery Details</h4>
                <div className="space-y-4">
                  <input type="text" name="dropoff_address" value={formData.dropoff_address} onChange={handleInputChange} required placeholder="Delivery Address *" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="text" name="dropoff_contact_name" value={formData.dropoff_contact_name} onChange={handleInputChange} required placeholder="Contact Name *" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent" />
                    <input type="tel" name="dropoff_contact_phone" value={formData.dropoff_contact_phone} onChange={handleInputChange} required placeholder="Contact Phone *" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent" />
                  </div>
                </div>
              </div>
              {pricing.distance > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-bold text-gray-700">📏 Distance</p><p className="text-lg font-black text-gray-900">{pricing.distance.toFixed(1)} km</p></div>
                    <div className="text-right"><p className="text-sm font-bold text-gray-700">⏱️ Drive Time</p><p className="text-lg font-black text-gray-900">~{pricing.duration} mins</p></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Parcel Details */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📦 Parcel Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Quantity</label>
                  <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} min="1" required className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Weight (kg) * <span className="text-xs text-gray-500">(affects price)</span></label>
                  <input type="number" name="parcel_weight" value={formData.parcel_weight} onChange={handleInputChange} min="0.1" step="0.1" placeholder="e.g. 5" required className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent" />
                  <p className="text-xs text-gray-500 mt-1">{parseFloat(formData.parcel_weight || 0) <= 10 ? '✓ Under 10kg rate' : '⚠️ Over 10kg rate'}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Parcel Size</label>
                <select name="parcel_size" value={formData.parcel_size} onChange={handleInputChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent">
                  {Object.entries(sizeReference).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                </select>
              </div>
              {formData.parcel_size === 'custom' && (
                <div className="grid grid-cols-3 gap-3 bg-yellow-50 p-4 rounded-xl">
                  <div><label className="block text-xs font-bold text-gray-700 mb-1">Length (cm)</label><input type="number" name="length" value={formData.length} onChange={handleInputChange} placeholder="0" className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg" /></div>
                  <div><label className="block text-xs font-bold text-gray-700 mb-1">Width (cm)</label><input type="number" name="width" value={formData.width} onChange={handleInputChange} placeholder="0" className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg" /></div>
                  <div><label className="block text-xs font-bold text-gray-700 mb-1">Height (cm)</label><input type="number" name="height" value={formData.height} onChange={handleInputChange} placeholder="0" className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg" /></div>
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Service Type * <span className="text-xs text-gray-500">(affects price)</span></label>
                <select name="service_type" value={formData.service_type} onChange={handleInputChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent">
                  {Object.entries(serviceTypes).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                </select>
                {pricing.requiresQuote && (<div className="mt-3 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl"><p className="text-sm font-bold text-yellow-900">📞 Custom Quote Required</p><p className="text-xs text-yellow-800 mt-1">Use custom price below.</p></div>)}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Scheduled Date</label><input type="date" name="scheduled_date" value={formData.scheduled_date} onChange={handleInputChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Scheduled Time</label><input type="time" name="scheduled_time" value={formData.scheduled_time} onChange={handleInputChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" /></div>
              </div>
              <label className="flex items-center p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                <input type="checkbox" name="fragile" checked={formData.fragile} onChange={handleInputChange} className="mr-3" />
                <div><span className="font-bold text-gray-900">⚠️ Fragile Item</span><p className="text-xs text-gray-600">Handle with extra care</p></div>
              </label>
            </div>
          </div>

          {/* Assign Driver */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🚐 Assign Driver (Optional)</h3>
            <select name="driver_id" value={formData.driver_id} onChange={handleInputChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent">
              <option value="">-- Leave Unassigned --</option>
              {drivers.map(driver => (<option key={driver.id} value={driver.id}>{driver.name} {driver.is_on_duty ? '🟢' : '⚪'}</option>))}
            </select>
          </div>

          {/* Notes */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📝 Notes</h3>
            <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={4} placeholder="Delivery instructions, special requirements, etc..." className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl resize-none" />
          </div>

          {/* Pricing */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">💰 Pricing</h3>
            <label className="flex items-center p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 mb-4">
              <input type="checkbox" name="use_custom_price" checked={formData.use_custom_price} onChange={handleInputChange} className="mr-3" />
              <div><span className="font-bold text-gray-900">Use Custom Base Price</span><p className="text-xs text-gray-600">Override the calculated price</p></div>
            </label>
            {formData.use_custom_price && (
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Custom Base Price ($)</label>
                <input type="number" name="custom_price" value={formData.custom_price} onChange={handleInputChange} min="0" step="0.01" placeholder="0.00" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-lg font-bold" />
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">Fuel Levy: {pricing.fuelLevyPercent}%</label>
              <input type="range" min="0" max="25" step="1" value={pricing.fuelLevyPercent} onChange={handleFuelLevyChange} className="w-full" />
              <div className="flex justify-between text-xs text-gray-500"><span>0%</span><span>10%</span><span>25%</span></div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-600">Base ({formData.parcel_weight || 0}kg, {formData.service_type.replace(/_/g, ' ')}):</span><span className="font-semibold">${pricing.basePrice.toFixed(2)}</span></div>
              {pricing.distanceCharge > 0 && (<div className="flex justify-between text-sm"><span className="text-gray-600">Distance ({pricing.chargeableDistance.toFixed(1)}km × ${pricing.perKmRate.toFixed(2)}):</span><span className="font-semibold">${pricing.distanceCharge.toFixed(2)}</span></div>)}
              <div className="flex justify-between text-sm border-t pt-2"><span className="text-gray-600">Subtotal:</span><span className="font-semibold">${pricing.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Fuel Levy ({pricing.fuelLevyPercent}%):</span><span className="font-semibold">${pricing.fuelLevy.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">GST (10%):</span><span className="font-semibold">${pricing.gst.toFixed(2)}</span></div>
              <div className="flex justify-between text-lg border-t pt-2"><span className="font-bold text-gray-900">Total (inc. GST):</span><span className="font-black text-green-600">${pricing.total.toFixed(2)}</span></div>
            </div>
          </div>

          <button type="submit" disabled={submitting || (pricing.requiresQuote && !formData.use_custom_price)} className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-black text-lg hover:from-red-600 hover:to-red-700 transition shadow-xl disabled:opacity-50">
            {submitting ? "Creating Order..." : pricing.requiresQuote && !formData.use_custom_price ? "Set Custom Price to Continue" : "Create Order ✓"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function AdminCreateOrderPage() {
  return (<ThemeProvider userType="admin"><AdminCreateOrderContent /></ThemeProvider>);
}