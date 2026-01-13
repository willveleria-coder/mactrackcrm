"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import Image from "next/image";
import HamburgerMenu from "@/components/HamburgerMenu";
import AddressAutocomplete from "@/components/AddressAutocomplete";

export default function AdminCreateOrderPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [clients, setClients] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [pricingSettings, setPricingSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    client_id: "",
    pickup_address: "",
    pickup_contact_name: "",
    pickup_contact_phone: "",
    dropoff_address: "",
    dropoff_contact_name: "",
    dropoff_contact_phone: "",
    service_type: "standard",
    scheduled_date: "",
    scheduled_time: "",
    notes: "",
    driver_id: "",
    custom_price: "",
    use_custom_price: false,
  });

  const [items, setItems] = useState([
    {
      id: 1,
      item_type: "small_box",
      quantity: 1,
      weight_per_unit: "",
      is_under_10kg: false,
      length: "",
      width: "",
      height: "",
      fragile: false,
      description: "",
    }
  ]);

  const [pricing, setPricing] = useState({
    basePrice: 0,
    distanceCost: 0,
    weightCost: 0,
    subtotal: 0,
    fuelLevy: 0,
    fuelLevyPercent: 10,
    gst: 0,
    total: 0,
    distance: 0,
    duration: 0,
    totalWeight: 0,
    totalVolumetricWeight: 0,
    chargeableWeight: 0,
  });

  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [manualDistance, setManualDistance] = useState("");
  const [distanceError, setDistanceError] = useState(false);
  const distanceTimerRef = useRef(null);
  const supabase = createClient();

  const itemTypeOptions = [
    { value: "envelope", label: "📄 Envelope" },
    { value: "small_box", label: "📦 Small Box (up to 25×20×10cm)" },
    { value: "medium_box", label: "📦 Medium Box (up to 50×40×30cm)" },
    { value: "large_box", label: "📦 Large Box (up to 80×60×50cm)" },
    { value: "pelican_case", label: "🧳 Pelican Case" },
    { value: "road_case_single", label: "🎸 Road Case Single" },
    { value: "road_case_double", label: "🎸 Road Case Double" },
    { value: "blue_tub", label: "🗑️ Blue Tub" },
    { value: "tube", label: "📜 Tube (Posters, Blueprints)" },
    { value: "aga_kit", label: "🧰 AGA Kit" },
    { value: "pallet", label: "📦 Pallet" },
    { value: "custom", label: "📐 Custom (Enter Dimensions)" },
  ];

  const menuItems = [
    { href: "/admin/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/admin/orders", icon: "📦", label: "Orders" },
    { href: "/admin/orders/create", icon: "➕", label: "Create Order" },
    { href: "/admin/clients", icon: "👥", label: "Clients" },
    { href: "/admin/drivers", icon: "🚐", label: "Drivers" },
    { href: "/admin/pricing", icon: "💲", label: "Pricing" },
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

  useEffect(() => { calculatePrice(); }, [formData.service_type, formData.use_custom_price, formData.custom_price, items, pricing.distance, manualDistance, pricingSettings]);

  async function loadData() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { router.push("/admin/login"); return; }
      const { data: adminData } = await supabase.from("admins").select("*").eq("user_id", user.id).single();
      if (!adminData) { router.push("/admin/login"); return; }
      setAdmin(adminData);
      const { data: clientsData } = await supabase.from("clients").select("*").eq("is_active", true).order("name");
      setClients(clientsData || []);
      const { data: driversData } = await supabase.from("drivers").select("*").eq("is_active", true).order("name");
      setDrivers(driversData || []);
      const { data: settingsData } = await supabase.from("settings").select("*").eq("key", "pricing").single();
      if (settingsData?.value) setPricingSettings(settingsData.value);
    } catch (error) { console.error("Error loading data:", error); }
    finally { setLoading(false); }
  }

  async function calculateDistanceFromAddresses() {
    if (!formData.pickup_address || !formData.dropoff_address) return;
    setCalculatingDistance(true);
    setDistanceError(false);
    try {
      const response = await fetch('/api/calculate-distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: formData.pickup_address, destination: formData.dropoff_address })
      });
      const data = await response.json();
      if (data.error || data.distance === 0) {
        setDistanceError(true);
        setPricing(prev => ({ ...prev, distance: 0, duration: 0 }));
      } else {
        setDistanceError(false);
        setPricing(prev => ({ ...prev, distance: data.distance || 0, duration: data.duration || 0 }));
      }
    } catch (error) {
      setDistanceError(true);
      setPricing(prev => ({ ...prev, distance: 0, duration: 0 }));
    } finally { setCalculatingDistance(false); }
  }

  function calculatePrice() {
    if (formData.use_custom_price && formData.custom_price) {
      const customBase = parseFloat(formData.custom_price) || 0;
      const fuelLevyPercent = pricingSettings?.fuelLevy || 10;
      const fuelLevy = customBase * (fuelLevyPercent / 100);
      const beforeGst = customBase + fuelLevy;
      const gst = beforeGst * ((pricingSettings?.gst || 10) / 100);
      const total = beforeGst + gst;
      setPricing(prev => ({ ...prev, basePrice: customBase, distanceCost: 0, weightCost: 0, subtotal: customBase, fuelLevy, fuelLevyPercent, gst, total }));
      return;
    }

    const dist = manualDistance ? parseFloat(manualDistance) : (pricing.distance || 0);
    
    let totalActualWeight = 0;
    let totalVolumetricWeight = 0;
    items.forEach(item => {
      const qty = parseInt(item.quantity) || 1;
      if (item.is_under_10kg) {
        totalActualWeight += qty * 5;
      } else {
        totalActualWeight += qty * (parseFloat(item.weight_per_unit) || 0);
      }
      const l = parseFloat(item.length) || 0;
      const w = parseFloat(item.width) || 0;
      const h = parseFloat(item.height) || 0;
      if (l > 0 && w > 0 && h > 0) {
        totalVolumetricWeight += qty * ((l * w * h) / 6000);
      }
    });
    const chargeableWeight = Math.max(totalActualWeight, totalVolumetricWeight);

    if (dist === 0) {
      setPricing(prev => ({ ...prev, basePrice: 0, distanceCost: 0, weightCost: 0, subtotal: 0, fuelLevy: 0, gst: 0, total: 0, totalWeight: totalActualWeight, totalVolumetricWeight, chargeableWeight }));
      return;
    }

    const distance = dist;
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

    let basePrice = 0, distanceCost = 0, weightCost = 0;

    if (serviceType === 'after_hours') {
      basePrice = distance <= 10 ? 150 : 150 + ((distance - 10) * 1.70);
    } else {
      distanceCost = distance * (pricingSettings?.distanceRate ?? 1.90);
      weightCost = chargeableWeight > 10 ? (chargeableWeight - 10) * (pricingSettings?.weightRate ?? 2.70) : 0;
      basePrice = ((config.baseFee || 10) + distanceCost + weightCost) * config.multiplier;
    }

    const fuelLevyPercent = pricingSettings?.fuelLevy || 10;
    const fuelLevy = basePrice * (fuelLevyPercent / 100);
    const beforeGst = basePrice + fuelLevy;
    const gst = beforeGst * ((pricingSettings?.gst || 10) / 100);
    const total = beforeGst + gst;

    setPricing(prev => ({
      ...prev,
      basePrice: parseFloat(basePrice.toFixed(2)),
      distanceCost: parseFloat(distanceCost.toFixed(2)),
      weightCost: parseFloat(weightCost.toFixed(2)),
      subtotal: parseFloat(basePrice.toFixed(2)),
      fuelLevy: parseFloat(fuelLevy.toFixed(2)),
      fuelLevyPercent,
      gst: parseFloat(gst.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      totalWeight: totalActualWeight,
      totalVolumetricWeight,
      chargeableWeight,
    }));
  }

  function handleInputChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleItemChange(itemId, field, value) {
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  }

  function addItem() {
    const newId = Math.max(...items.map(i => i.id)) + 1;
    setItems(prev => [...prev, { id: newId, item_type: "small_box", quantity: 1, weight_per_unit: "", is_under_10kg: false, length: "", width: "", height: "", fragile: false, description: "" }]);
  }

  function removeItem(itemId) {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(item => item.id !== itemId));
  }

  function getTotalWeight(item) {
    if (item.is_under_10kg) return (parseInt(item.quantity) || 1) * 5;
    return (parseInt(item.quantity) || 1) * (parseFloat(item.weight_per_unit) || 0);
  }

  async function handleLogout() { await supabase.auth.signOut(); router.push("/admin/login"); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!formData.client_id) { setError("Please select a client"); return; }
    if (!formData.pickup_address || !formData.dropoff_address) { setError("Addresses required"); return; }
    if (!formData.pickup_contact_name || !formData.dropoff_contact_name) { setError("Contact names required"); return; }
    if (!formData.pickup_contact_phone || !formData.dropoff_contact_phone) { setError("Contact phones required"); return; }

    const finalDistance = manualDistance ? parseFloat(manualDistance) : pricing.distance;
    if (!finalDistance || finalDistance <= 0) { setError("Please enter delivery distance"); return; }

    for (const item of items) {
      if (!item.is_under_10kg && (!item.weight_per_unit || parseFloat(item.weight_per_unit) <= 0)) {
        setError("Please enter weight for all items or check 'Under 10kg'");
        return;
      }
    }

    setSubmitting(true);
    try {
      const itemsSummary = items.map(item => ({
        type: item.item_type,
        quantity: parseInt(item.quantity) || 1,
        weight_per_unit: item.is_under_10kg ? 5 : parseFloat(item.weight_per_unit) || 0,
        total_weight: getTotalWeight(item),
        dimensions: item.length && item.width && item.height ? `${item.length}×${item.width}×${item.height}cm` : null,
        fragile: item.fragile,
        description: item.description,
      }));

      const totalQuantity = items.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);
      const primaryItem = items[0];

      const orderData = {
        client_id: formData.client_id,
        pickup_address: formData.pickup_address,
        pickup_contact_name: formData.pickup_contact_name,
        pickup_contact_phone: formData.pickup_contact_phone,
        dropoff_address: formData.dropoff_address,
        dropoff_contact_name: formData.dropoff_contact_name,
        dropoff_contact_phone: formData.dropoff_contact_phone,
        parcel_size: primaryItem.item_type,
        quantity: totalQuantity,
        parcel_weight: pricing.totalWeight,
        length: parseFloat(primaryItem.length) || null,
        width: parseFloat(primaryItem.width) || null,
        height: parseFloat(primaryItem.height) || null,
        service_type: formData.service_type,
        scheduled_date: formData.scheduled_date || null,
        scheduled_time: formData.scheduled_time || null,
        notes: formData.notes || null,
        fragile: items.some(item => item.fragile),
        driver_id: formData.driver_id || null,
        distance_km: finalDistance,
        base_price: pricing.basePrice,
        distance_charge: pricing.distanceCost,
        weight_charge: pricing.weightCost,
        fuel_levy: pricing.fuelLevy,
        fuel_levy_percent: pricing.fuelLevyPercent,
        gst: pricing.gst,
        price: pricing.total,
        status: formData.driver_id ? "assigned" : "pending",
        created_by_admin: admin.id,
        items_detail: itemsSummary,
      };

      const { data: order, error: orderError } = await supabase.from("orders").insert([orderData]).select().single();
      if (orderError) throw orderError;

      setSuccess(`✅ Order #${order.id.slice(0, 8)} created!`);
      setFormData({ client_id: "", pickup_address: "", dropoff_address: "", pickup_contact_name: "", pickup_contact_phone: "", dropoff_contact_name: "", dropoff_contact_phone: "", service_type: "standard", scheduled_date: "", scheduled_time: "", notes: "", driver_id: "", custom_price: "", use_custom_price: false });
      setItems([{ id: 1, item_type: "small_box", quantity: 1, weight_per_unit: "", is_under_10kg: false, length: "", width: "", height: "", fragile: false, description: "" }]);
      setManualDistance("");
      setPricing(prev => ({ ...prev, distance: 0, duration: 0, basePrice: 0, distanceCost: 0, weightCost: 0, subtotal: 0, fuelLevy: 0, gst: 0, total: 0 }));
      setTimeout(() => router.push("/admin/orders"), 2000);
    } catch (err) { setError(err.message || "Failed to create order"); }
    finally { setSubmitting(false); }
  }

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center"><div className="text-gray-600 text-lg">Loading...</div></div>;
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
            <HamburgerMenu items={menuItems} onLogout={handleLogout} userName={admin?.name} userRole="Admin" />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Create Order ➕</h2>
          <p className="text-sm text-gray-600">Create a delivery order on behalf of a client</p>
        </div>

        {error && <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6"><p className="text-red-700 font-semibold">❌ {error}</p></div>}
        {success && <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 mb-6"><p className="text-green-700 font-semibold">{success}</p></div>}

        {/* Live Price Preview */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-4 mb-6 text-white shadow-lg sticky top-20 z-20">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs opacity-90 mb-1">Estimated Total</p>
              <p className="text-3xl font-black">${pricing.total.toFixed(2)}</p>
              <div className="flex flex-wrap gap-2 mt-1 text-xs opacity-75">
                {(pricing.distance > 0 || manualDistance) && <span>{manualDistance ? parseFloat(manualDistance).toFixed(1) : pricing.distance.toFixed(1)}km</span>}
                {pricing.chargeableWeight > 0 && <span>• {pricing.chargeableWeight.toFixed(1)}kg</span>}
                {pricing.duration > 0 && !manualDistance && <span>• ~{pricing.duration} mins</span>}
              </div>
              {calculatingDistance && <p className="text-xs opacity-75 mt-1">Calculating distance...</p>}
            </div>
            <div className="text-5xl">💰</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Selection */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">👤 Select Client</h3>
            <select name="client_id" value={formData.client_id} onChange={handleInputChange} required className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl">
              <option value="">-- Select a Client --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''} - {c.email}</option>)}
            </select>
          </div>

          {/* Addresses */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📍 Pickup & Delivery</h3>
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 mb-3">Pickup Details</h4>
                <AddressAutocomplete value={formData.pickup_address} onChange={(val) => setFormData(prev => ({ ...prev, pickup_address: val }))} placeholder="Pickup Address *" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl mb-3" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input type="text" name="pickup_contact_name" value={formData.pickup_contact_name} onChange={handleInputChange} required placeholder="Contact Name *" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                  <input type="tel" name="pickup_contact_phone" value={formData.pickup_contact_phone} onChange={handleInputChange} required placeholder="Contact Phone *" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                </div>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <h4 className="font-bold text-green-900 mb-3">Delivery Details</h4>
                <AddressAutocomplete value={formData.dropoff_address} onChange={(val) => setFormData(prev => ({ ...prev, dropoff_address: val }))} placeholder="Delivery Address *" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl mb-3" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input type="text" name="dropoff_contact_name" value={formData.dropoff_contact_name} onChange={handleInputChange} required placeholder="Contact Name *" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                  <input type="tel" name="dropoff_contact_phone" value={formData.dropoff_contact_phone} onChange={handleInputChange} required placeholder="Contact Phone *" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                </div>
              </div>

              {/* Distance Section - Always Visible */}
              <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                <p className="text-sm font-bold text-gray-700 mb-3">📏 Distance & Pricing</p>
                {calculatingDistance && <p className="text-xs text-blue-600 mb-2">Calculating distance...</p>}
                {pricing.distance > 0 && !manualDistance && (
                  <div className="flex items-center justify-between mb-3 p-3 bg-green-50 rounded-lg">
                    <div><p className="text-xs text-gray-600">Auto-calculated</p><p className="text-lg font-black text-gray-900">{pricing.distance.toFixed(1)} km</p></div>
                    <div className="text-right"><p className="text-xs text-gray-600">Drive Time</p><p className="text-lg font-black text-gray-900">~{pricing.duration} mins</p></div>
                  </div>
                )}
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Enter/Override Distance (km) *</label>
                    <input type="number" value={manualDistance} onChange={(e) => setManualDistance(e.target.value)} min="0.1" step="0.1" placeholder={pricing.distance > 0 ? `Auto: ${pricing.distance.toFixed(1)}km` : "e.g. 15"} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-lg font-bold" />
                  </div>
                  <a href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(formData.pickup_address)}&destination=${encodeURIComponent(formData.dropoff_address)}`} target="_blank" rel="noopener noreferrer" className="px-4 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 text-sm whitespace-nowrap">🗺️ Check Maps</a>
                </div>
                {manualDistance && <p className="text-sm text-green-700 mt-2 font-semibold">✓ Using {manualDistance}km for pricing</p>}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">📦 Item/s Information</h3>
              <button type="button" onClick={addItem} className="px-4 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 text-sm">➕ Add Item</button>
            </div>

            <div className="space-y-6">
              {items.map((item, index) => (
                <div key={item.id} className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200 relative">
                  {items.length > 1 && <button type="button" onClick={() => removeItem(item.id)} className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full font-bold hover:bg-red-600">×</button>}
                  <h4 className="font-bold text-gray-900 mb-4">Item {index + 1}</h4>

                  <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Item Type *</label>
                    <select value={item.item_type} onChange={(e) => handleItemChange(item.id, 'item_type', e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl">
                      {itemTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="flex items-center p-3 border-2 border-gray-300 rounded-xl cursor-pointer hover:bg-gray-100">
                      <input type="checkbox" checked={item.is_under_10kg} onChange={(e) => handleItemChange(item.id, 'is_under_10kg', e.target.checked)} className="mr-3 w-5 h-5" />
                      <div><span className="font-bold text-gray-900">Item is under 10kg</span><p className="text-xs text-gray-600">Check if each item weighs less than 10kg</p></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Quantity *</label>
                      <input type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} min="1" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                    </div>
                    {!item.is_under_10kg && (
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Weight per Unit (kg) *</label>
                        <input type="number" value={item.weight_per_unit} onChange={(e) => handleItemChange(item.id, 'weight_per_unit', e.target.value)} min="0.1" step="0.1" placeholder="e.g. 5" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Total Weight</label>
                      <div className="w-full px-4 py-3 bg-gray-200 rounded-xl font-bold text-gray-900">{getTotalWeight(item).toFixed(1)} kg</div>
                    </div>
                  </div>

                  {(item.item_type === 'custom' || item.item_type === 'large_box' || item.item_type === 'pallet') && (
                    <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200 mb-4">
                      <p className="text-sm font-bold text-yellow-900 mb-3">📏 Dimensions</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div><label className="block text-xs font-bold text-gray-700 mb-1">Length (cm)</label><input type="number" value={item.length} onChange={(e) => handleItemChange(item.id, 'length', e.target.value)} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg" /></div>
                        <div><label className="block text-xs font-bold text-gray-700 mb-1">Width (cm)</label><input type="number" value={item.width} onChange={(e) => handleItemChange(item.id, 'width', e.target.value)} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg" /></div>
                        <div><label className="block text-xs font-bold text-gray-700 mb-1">Height (cm)</label><input type="number" value={item.height} onChange={(e) => handleItemChange(item.id, 'height', e.target.value)} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg" /></div>
                      </div>
                    </div>
                  )}

                  <label className="flex items-center p-3 border-2 border-gray-300 rounded-xl cursor-pointer hover:bg-gray-100">
                    <input type="checkbox" checked={item.fragile} onChange={(e) => handleItemChange(item.id, 'fragile', e.target.checked)} className="mr-3 w-5 h-5" />
                    <div><span className="font-bold text-gray-900">⚠️ Fragile Item</span></div>
                  </label>
                </div>
              ))}

              {/* Weight Summary */}
              <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                <h4 className="font-bold text-blue-900 mb-3">📊 Weight Summary</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-gray-600">Total Items</p><p className="font-bold">{items.reduce((sum, i) => sum + (parseInt(i.quantity) || 1), 0)}</p></div>
                  <div><p className="text-gray-600">Actual Weight</p><p className="font-bold">{pricing.totalWeight?.toFixed(1) || 0} kg</p></div>
                  <div><p className="text-gray-600">Volumetric</p><p className="font-bold">{pricing.totalVolumetricWeight?.toFixed(1) || 0} kg</p></div>
                  <div><p className="text-gray-600">Chargeable</p><p className="font-bold text-green-600">{pricing.chargeableWeight?.toFixed(1) || 0} kg</p></div>
                </div>
              </div>
            </div>
          </div>

          {/* Service Type */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🚚 Service Type</h3>
            <select name="service_type" value={formData.service_type} onChange={handleInputChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl mb-4">
              <option value="standard">⏰ Standard (3-5 Hours)</option>
              <option value="same_day">⚡ Same Day (12 Hours)</option>
              <option value="next_day">📅 Next Day</option>
              <option value="local_overnight">🌙 Local/Overnight</option>
              <option value="emergency">🚨 Emergency (1-2 Hours)</option>
              <option value="vip">⭐ VIP (2-3 Hours)</option>
              <option value="priority">🔥 Priority (1-1.5 Hours)</option>
              <option value="scheduled">📆 Scheduled</option>
              <option value="after_hours">🌃 After Hours/Weekend</option>
            </select>

            {(formData.service_type === 'scheduled') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Date</label><input type="date" name="scheduled_date" value={formData.scheduled_date} onChange={handleInputChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Time</label><input type="time" name="scheduled_time" value={formData.scheduled_time} onChange={handleInputChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" /></div>
              </div>
            )}
          </div>

          {/* Assign Driver */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🚐 Assign Driver (Optional)</h3>
            <select name="driver_id" value={formData.driver_id} onChange={handleInputChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl">
              <option value="">-- Leave Unassigned --</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name} {d.is_on_duty ? '🟢' : '⚪'}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📝 Notes</h3>
            <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={4} placeholder="Delivery instructions..." className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl resize-none" />
          </div>

          {/* Pricing */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">💰 Pricing</h3>

            <label className="flex items-center p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 mb-4">
              <input type="checkbox" name="use_custom_price" checked={formData.use_custom_price} onChange={handleInputChange} className="mr-3" />
              <div><span className="font-bold text-gray-900">Use Custom Price</span><p className="text-xs text-gray-600">Override calculated price</p></div>
            </label>

            {formData.use_custom_price && (
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Custom Base Price ($)</label>
                <input type="number" name="custom_price" value={formData.custom_price} onChange={handleInputChange} min="0" step="0.01" placeholder="0.00" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-lg font-bold" />
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-600">Base Price:</span><span className="font-semibold">${pricing.basePrice.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Fuel Levy ({pricing.fuelLevyPercent}%):</span><span className="font-semibold">${pricing.fuelLevy.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">GST (10%):</span><span className="font-semibold">${pricing.gst.toFixed(2)}</span></div>
              <div className="flex justify-between text-lg border-t pt-2"><span className="font-bold text-gray-900">Total (inc. GST):</span><span className="font-black text-green-600">${pricing.total.toFixed(2)}</span></div>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-black text-lg hover:from-red-600 hover:to-red-700 transition shadow-xl disabled:opacity-50">
            {submitting ? "Creating Order..." : "Create Order ✓"}
          </button>
        </form>
      </main>
    </div>
  );
}