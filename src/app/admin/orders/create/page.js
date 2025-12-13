"use client";
import { useState, useEffect } from "react";
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

  const [priceBreakdown, setPriceBreakdown] = useState({
    basePrice: 0,
    fuelLevy: 0,
    fuelLevyPercent: 10,
    subtotal: 0,
    gst: 0,
    total: 0,
  });

  const router = useRouter();
  const supabase = createClient();

  const sizeReference = {
    "small_box": "📦 Envelope/Small Box (up to 25×20×10cm) - Documents, phone, small items",
    "medium_box": "📦 Medium Box (up to 50×40×30cm) - Electronics, clothing boxes, medium items",
    "large_box": "📦 Large Box (up to 80×60×50cm) - Large electronics, multiple items, bulky goods",
    "pelican_case": "🧳 Pelican Case - Heavy-duty protective case",
    "road_case_single": "🎸 Road Case Single - Single equipment road case",
    "road_case_double": "🎸 Road Case Double - Double/large equipment road case",
    "blue_tub": "🗑️ Blue Tub - Standard blue storage tub",
    "tube": "📜 Tube - Posters, blueprints, rolled items",
    "aga_kit": "🧰 AGA Kit - AGA equipment kit",
    "custom": "📐 Custom Dimensions - Enter your exact measurements"
  };

  const serviceTypes = {
    "standard": "⏰ Standard (3-5 Hours)",
    "next_day": "📅 Next Day (Delivery Tomorrow)",
    "local_overnight": "🌙 Local/Overnight (Next Day)",
    "emergency": "🚨 Emergency (1-2 Hours)",
    "scheduled": "📆 Scheduled (Schedule A Delivery Day)",
    "vip": "⭐ VIP (2-3 Hours)",
    "same_day": "⚡ Same Day (12 Hours)",
    "priority": "🔥 Priority (1-1.5 Hours)",
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

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    calculatePrice();
  }, [
    formData.parcel_size,
    formData.quantity,
    formData.parcel_weight,
    formData.service_type,
    formData.length,
    formData.width,
    formData.height,
    formData.use_custom_price,
    formData.custom_price,
    priceBreakdown.fuelLevyPercent,
  ]);

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

      // Load clients
      const { data: clientsData } = await supabase
        .from("clients")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      setClients(clientsData || []);

      // Load drivers
      const { data: driversData } = await supabase
        .from("drivers")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      setDrivers(driversData || []);

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  function calculatePrice() {
    if (formData.use_custom_price && formData.custom_price) {
      const customBase = parseFloat(formData.custom_price) || 0;
      const fuelLevy = customBase * (priceBreakdown.fuelLevyPercent / 100);
      const subtotal = customBase + fuelLevy;
      const gst = subtotal * 0.10; // 10% GST for Australia
      const total = subtotal + gst;

      setPriceBreakdown(prev => ({
        ...prev,
        basePrice: customBase,
        fuelLevy,
        subtotal,
        gst,
        total,
      }));
      return;
    }

    let basePrice = 20;
    const quantity = parseInt(formData.quantity) || 1;

    // Size pricing
    const sizePricing = {
      "small_box": 15,
      "medium_box": 35,
      "large_box": 55,
      "pelican_case": 45,
      "road_case_single": 60,
      "road_case_double": 85,
      "blue_tub": 30,
      "tube": 20,
      "aga_kit": 50,
      "custom": 20
    };

    basePrice = sizePricing[formData.parcel_size] || 20;

    // Custom size calculation
    if (formData.parcel_size === 'custom') {
      const length = parseFloat(formData.length) || 0;
      const width = parseFloat(formData.width) || 0;
      const height = parseFloat(formData.height) || 0;
      const volume = (length * width * height) / 1000000;
      basePrice = Math.max(volume * 100, 20);
    }

    // Weight multiplier
    const weight = parseFloat(formData.parcel_weight) || 0;
    if (weight > 5) basePrice += (weight - 5) * 3;
    if (weight > 20) basePrice += (weight - 20) * 5;

    // Service type multiplier
    const serviceMultipliers = {
      standard: 1,
      next_day: 1.5,
      local_overnight: 1.8,
      emergency: 2.5,
      scheduled: 1.3,
      vip: 2.2,
      same_day: 2.0,
      priority: 2.8
    };
    basePrice *= serviceMultipliers[formData.service_type] || 1;

    // Quantity
    basePrice = basePrice * quantity;
    basePrice = Math.max(basePrice, 15);

    // Calculate fuel levy, GST and total
    const fuelLevy = basePrice * (priceBreakdown.fuelLevyPercent / 100);
    const subtotal = basePrice + fuelLevy;
    const gst = subtotal * 0.10; // 10% GST for Australia
    const total = subtotal + gst;

    setPriceBreakdown(prev => ({
      ...prev,
      basePrice,
      fuelLevy,
      subtotal,
      gst,
      total,
    }));
  }

  function handleInputChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  function handleFuelLevyChange(e) {
    const value = parseFloat(e.target.value) || 0;
    setPriceBreakdown(prev => ({
      ...prev,
      fuelLevyPercent: value,
    }));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (!formData.client_id) {
      setError("Please select a client");
      return;
    }

    if (!formData.pickup_address || !formData.dropoff_address) {
      setError("Pickup and dropoff addresses are required");
      return;
    }

    if (!formData.pickup_contact_name || !formData.dropoff_contact_name) {
      setError("Contact names are required for both pickup and dropoff");
      return;
    }

    if (!formData.pickup_contact_phone || !formData.dropoff_contact_phone) {
      setError("Contact phone numbers are required for both pickup and dropoff");
      return;
    }

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
        price: priceBreakdown.total,
        base_price: priceBreakdown.basePrice,
        fuel_levy: priceBreakdown.fuelLevy,
        fuel_levy_percent: priceBreakdown.fuelLevyPercent,
        gst: priceBreakdown.gst,
        status: formData.driver_id ? "pending" : "pending",
        created_by_admin: true,
      };

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([orderData])
        .select()
        .single();

      if (orderError) throw orderError;

      setSuccess(`✅ Order #${order.id.slice(0, 8)} created successfully!`);
      
      // Reset form
      setFormData({
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

      // Redirect to orders page after 2 seconds
      setTimeout(() => {
        router.push("/admin/orders");
      }, 2000);

    } catch (err) {
      console.error("Error creating order:", err);
      setError(err.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
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
                <h1 className={`text-xl sm:text-2xl font-black ${theme.text}`}>Mac Track</h1>
                <p className="text-xs text-gray-500">Admin Portal</p>
              </div>
            </div>
            <HamburgerMenu 
              items={menuItems}
              onLogout={handleLogout}
              userName={admin?.name}
              userRole="Admin"
            />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
              Create Client Order ➕
            </h2>
            <p className="text-sm sm:text-base text-gray-600">Create a delivery order on behalf of a client</p>
          </div>
          <Link
            href="/admin/orders"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-300 transition"
          >
            ← Back
          </Link>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6">
            <p className="text-red-700 font-semibold">❌ {error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 mb-6">
            <p className="text-green-700 font-semibold">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Client Selection */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">👤 Select Client</h3>
            
            <select
              name="client_id"
              value={formData.client_id}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent text-lg"
            >
              <option value="">-- Select a Client --</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name} {client.company ? `(${client.company})` : ''} - {client.email}
                </option>
              ))}
            </select>

            {clients.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">No active clients found. <Link href="/admin/clients" className="text-red-600 hover:underline">Add a client first</Link></p>
            )}
          </div>

          {/* Addresses */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📍 Pickup & Delivery</h3>
            
            <div className="space-y-6">
              {/* Pickup */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 mb-3">Pickup Details</h4>
                <div className="space-y-4">
                  <input
                    type="text"
                    name="pickup_address"
                    value={formData.pickup_address}
                    onChange={handleInputChange}
                    required
                    placeholder="Pickup Address *"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="pickup_contact_name"
                      value={formData.pickup_contact_name}
                      onChange={handleInputChange}
                      required
                      placeholder="Contact Name *"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                    <input
                      type="tel"
                      name="pickup_contact_phone"
                      value={formData.pickup_contact_phone}
                      onChange={handleInputChange}
                      required
                      placeholder="Contact Phone *"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Dropoff */}
              <div className="bg-green-50 rounded-xl p-4">
                <h4 className="font-bold text-green-900 mb-3">Delivery Details</h4>
                <div className="space-y-4">
                  <input
                    type="text"
                    name="dropoff_address"
                    value={formData.dropoff_address}
                    onChange={handleInputChange}
                    required
                    placeholder="Delivery Address *"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="dropoff_contact_name"
                      value={formData.dropoff_contact_name}
                      onChange={handleInputChange}
                      required
                      placeholder="Contact Name *"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                    <input
                      type="tel"
                      name="dropoff_contact_phone"
                      value={formData.dropoff_contact_phone}
                      onChange={handleInputChange}
                      required
                      placeholder="Contact Phone *"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Parcel Details */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📦 Parcel Details</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="1"
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    name="parcel_weight"
                    value={formData.parcel_weight}
                    onChange={handleInputChange}
                    min="0.1"
                    step="0.1"
                    placeholder="0.0"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Parcel Size</label>
                <select
                  name="parcel_size"
                  value={formData.parcel_size}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                >
                  {Object.entries(sizeReference).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {formData.parcel_size === 'custom' && (
                <div className="grid grid-cols-3 gap-3 bg-yellow-50 p-4 rounded-xl">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Length (cm)</label>
                    <input
                      type="number"
                      name="length"
                      value={formData.length}
                      onChange={handleInputChange}
                      placeholder="0"
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Width (cm)</label>
                    <input
                      type="number"
                      name="width"
                      value={formData.width}
                      onChange={handleInputChange}
                      placeholder="0"
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Height (cm)</label>
                    <input
                      type="number"
                      name="height"
                      value={formData.height}
                      onChange={handleInputChange}
                      placeholder="0"
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Service Type</label>
                <select
                  name="service_type"
                  value={formData.service_type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                >
                  {Object.entries(serviceTypes).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Scheduled Date</label>
                  <input
                    type="date"
                    name="scheduled_date"
                    value={formData.scheduled_date}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Scheduled Time</label>
                  <input
                    type="time"
                    name="scheduled_time"
                    value={formData.scheduled_time}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  />
                </div>
              </div>

              <label className="flex items-center p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  name="fragile"
                  checked={formData.fragile}
                  onChange={handleInputChange}
                  className="mr-3"
                />
                <div>
                  <span className="font-bold text-gray-900">⚠️ Fragile Item</span>
                  <p className="text-xs text-gray-600">Handle with extra care</p>
                </div>
              </label>
            </div>
          </div>

          {/* Assign Driver (Optional) */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🚐 Assign Driver (Optional)</h3>
            
            <select
              name="driver_id"
              value={formData.driver_id}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
            >
              <option value="">-- Leave Unassigned --</option>
              {drivers.map(driver => (
                <option key={driver.id} value={driver.id}>
                  {driver.name} {driver.is_on_duty ? '🟢' : '⚪'} - {driver.vehicle_type || 'No vehicle'}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📝 Notes</h3>
            
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={4}
              placeholder="Delivery instructions, special requirements, etc..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none"
            />
          </div>

          {/* Pricing */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">💰 Pricing</h3>
            
            {/* Custom Price Toggle */}
            <label className="flex items-center p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 mb-4">
              <input
                type="checkbox"
                name="use_custom_price"
                checked={formData.use_custom_price}
                onChange={handleInputChange}
                className="mr-3"
              />
              <div>
                <span className="font-bold text-gray-900">Use Custom Base Price</span>
                <p className="text-xs text-gray-600">Override the calculated price</p>
              </div>
            </label>

            {formData.use_custom_price && (
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Custom Base Price ($)</label>
                <input
                  type="number"
                  name="custom_price"
                  value={formData.custom_price}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent text-lg font-bold"
                />
              </div>
            )}

            {/* Fuel Levy Adjustment */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Fuel Levy Percentage: {priceBreakdown.fuelLevyPercent}%
              </label>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={priceBreakdown.fuelLevyPercent}
                onChange={handleFuelLevyChange}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>10% (Default)</span>
                <span>25%</span>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Base Price:</span>
                <span className="font-semibold">${priceBreakdown.basePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Fuel Levy ({priceBreakdown.fuelLevyPercent}%):</span>
                <span className="font-semibold">${priceBreakdown.fuelLevy.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">${priceBreakdown.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST (10%):</span>
                <span className="font-semibold">${priceBreakdown.gst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg border-t pt-2">
                <span className="font-bold text-gray-900">Total (inc. GST):</span>
                <span className="font-black text-green-600">${priceBreakdown.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-black text-lg hover:from-red-600 hover:to-red-700 transition shadow-xl disabled:opacity-50"
          >
            {submitting ? "Creating Order..." : "Create Order ✓"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function AdminCreateOrderPage() {
  return (
    <ThemeProvider userType="admin">
      <AdminCreateOrderContent />
    </ThemeProvider>
  );
}