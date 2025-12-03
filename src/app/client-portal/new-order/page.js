"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import HamburgerMenu from "@/components/HamburgerMenu";

export default function NewOrderPage() {
  const [client, setClient] = useState(null);
  const [formData, setFormData] = useState({
    pickup_address: "",
    dropoff_address: "",
    pickup_contact_name: "",
    pickup_contact_phone: "",
    dropoff_contact_name: "",
    dropoff_contact_phone: "",
    parcel_size: "small",
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
    insurance_required: false,
  });
  const [parcelImages, setParcelImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [signature, setSignature] = useState(null);
  const [price, setPrice] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const signatureRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const sizeReference = {
    "extra-small": "📦 Envelope/Small Box (up to 25×20×10cm) - Documents, phone, small items",
    "small": "📦 Shoebox (up to 35×25×15cm) - Shoes, books, toys",
    "medium": "📦 Microwave Size (up to 50×40×30cm) - Electronics, clothing boxes",
    "large": "📦 TV/Monitor Box (up to 80×60×50cm) - Large electronics, multiple items",
    "extra-large": "📦 Furniture Item (up to 120×80×60cm) - Chair, small furniture",
    "custom": "📐 Custom Dimensions - Enter your exact measurements"
  };

  const menuItems = [
    { href: "/client-portal/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/client-portal/orders", icon: "📦", label: "My Orders" },
    { href: "/client-portal/new-order", icon: "➕", label: "New Order" },
  ];

  useEffect(() => {
    loadClient();
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
    formData.insurance_required
  ]);

  async function loadClient() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push("/client-portal/login");
        return;
      }

      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (clientError || !clientData) {
        router.push("/client-portal/login");
        return;
      }

      setClient(clientData);
    } catch (error) {
      console.error("Error loading client:", error);
      router.push("/client-portal/login");
    } finally {
      setLoading(false);
    }
  }

  function calculatePrice() {
    let basePrice = 20;
    const quantity = parseInt(formData.quantity) || 1;

    // Size pricing
    const sizePricing = {
      "extra-small": 15,
      "small": 20,
      "medium": 35,
      "large": 55,
      "extra-large": 80,
      "custom": 20
    };

    basePrice = sizePricing[formData.parcel_size] || 20;

    // Custom size calculation
    if (formData.parcel_size === 'custom') {
      const length = parseFloat(formData.length) || 0;
      const width = parseFloat(formData.width) || 0;
      const height = parseFloat(formData.height) || 0;
      const volume = (length * width * height) / 1000000; // cubic meters
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
      express: 1.8,
      same_day: 2.5,
      overnight: 2.2,
      scheduled: 1.3,
      recurring: 0.85,
      white_glove: 3.0
    };
    basePrice *= serviceMultipliers[formData.service_type] || 1;

    // Insurance
    if (formData.insurance_required) basePrice += 10;

    // Quantity
    const totalPrice = basePrice * quantity;

    setPrice(Math.max(totalPrice, 15));
  }

  function handleInputChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  function handleImageChange(e) {
    const files = Array.from(e.target.files);
    if (files.length + parcelImages.length > 5) {
      alert("Maximum 5 images allowed");
      return;
    }

    setParcelImages(prev => [...prev, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeImage(index) {
    setParcelImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  }

  // Signature pad functions
  function startDrawing(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  }

  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    setSignature(canvas.toDataURL());
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature(null);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/client-portal/login");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!client) {
      setError("Client data not loaded. Please refresh and try again.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const orderData = {
        client_id: client.id,
        pickup_address: formData.pickup_address,
        pickup_contact_name: formData.pickup_contact_name,
        pickup_contact_phone: formData.pickup_contact_phone,
        dropoff_address: formData.dropoff_address,
        dropoff_contact_name: formData.dropoff_contact_name,
        dropoff_contact_phone: formData.dropoff_contact_phone,
        parcel_size: formData.parcel_size,
        quantity: parseInt(formData.quantity),
        parcel_weight: parseFloat(formData.parcel_weight) || 0,
        length: parseFloat(formData.length) || null,
        width: parseFloat(formData.width) || null,
        height: parseFloat(formData.height) || null,
        service_type: formData.service_type,
        scheduled_date: formData.scheduled_date || null,
        scheduled_time: formData.scheduled_time || null,
        notes: formData.notes || null,
        fragile: formData.fragile,
        insurance_required: formData.insurance_required,
        price: price,
        status: "pending",
        signature_data: signature,
      };

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([orderData])
        .select();

      if (orderError) throw orderError;

      alert("✅ Order created successfully!");
      router.push("/client-portal/dashboard");
    } catch (err) {
      console.error("Error:", err);
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
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-red-600">Mac Track</h1>
              <p className="text-xs text-gray-500">Client Portal</p>
            </div>
            
            <HamburgerMenu 
              items={menuItems}
              onLogout={handleLogout}
              userName={client?.name}
              userRole="Client"
            />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Create New Order 📦
          </h2>
          <p className="text-sm sm:text-base text-gray-600">Fill in the delivery details</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center">
            {[1, 2, 3, 4].map((step, index) => (
              <div key={step} className="flex items-center" style={{ flex: index === 3 ? '0 0 auto' : '1 1 0%' }}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  currentStep >= step ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`h-1 mx-2 ${
                    currentStep > step ? 'bg-red-600' : 'bg-gray-200'
                  }`} style={{ flex: '1 1 0%' }} />
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 mt-2 text-xs sm:text-sm font-semibold text-gray-600">
            <span className="text-left">Addresses</span>
            <span className="text-center">Parcel Details</span>
            <span className="text-center">Photos & Notes</span>
            <span className="text-right">Review</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6">
            <p className="text-red-700 font-semibold">❌ {error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Step 1: Addresses */}
          {currentStep === 1 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">📍 Pickup & Delivery Addresses</h3>
              
              <div className="space-y-6">
                {/* Pickup Section */}
                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="font-bold text-blue-900 mb-4">Pickup Details</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Pickup Address *
                      </label>
                      <input
                        type="text"
                        name="pickup_address"
                        value={formData.pickup_address}
                        onChange={handleInputChange}
                        required
                        placeholder="123 Main St, Melbourne VIC 3000"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Contact Name *
                        </label>
                        <input
                          type="text"
                          name="pickup_contact_name"
                          value={formData.pickup_contact_name}
                          onChange={handleInputChange}
                          required
                          placeholder="John Doe"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Contact Phone *
                        </label>
                        <input
                          type="tel"
                          name="pickup_contact_phone"
                          value={formData.pickup_contact_phone}
                          onChange={handleInputChange}
                          required
                          placeholder="0412 345 678"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dropoff Section */}
                <div className="bg-green-50 rounded-xl p-4">
                  <h4 className="font-bold text-green-900 mb-4">Delivery Details</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Delivery Address *
                      </label>
                      <input
                        type="text"
                        name="dropoff_address"
                        value={formData.dropoff_address}
                        onChange={handleInputChange}
                        required
                        placeholder="456 High St, Sydney NSW 2000"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Contact Name *
                        </label>
                        <input
                          type="text"
                          name="dropoff_contact_name"
                          value={formData.dropoff_contact_name}
                          onChange={handleInputChange}
                          required
                          placeholder="Jane Smith"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Contact Phone *
                        </label>
                        <input
                          type="tel"
                          name="dropoff_contact_phone"
                          value={formData.dropoff_contact_phone}
                          onChange={handleInputChange}
                          required
                          placeholder="0498 765 432"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="w-full mt-6 py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
              >
                Next: Parcel Details →
              </button>
            </div>
          )}

          {/* Step 2: Parcel Details */}
          {currentStep === 2 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">📦 Parcel Information</h3>
              
              <div className="space-y-6">
                {/* Quantity and Weight */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      required
                      min="1"
                      max="99"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Total Weight (kg) *
                    </label>
                    <input
                      type="number"
                      name="parcel_weight"
                      value={formData.parcel_weight}
                      onChange={handleInputChange}
                      required
                      min="0.1"
                      step="0.1"
                      placeholder="5.0"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Size Selection */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Parcel Size *
                  </label>
                  <div className="space-y-3">
                    {Object.entries(sizeReference).map(([value, description]) => (
                      <label
                        key={value}
                        className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition ${
                          formData.parcel_size === value
                            ? 'border-red-600 bg-red-50'
                            : 'border-gray-300 hover:border-red-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="parcel_size"
                          value={value}
                          checked={formData.parcel_size === value}
                          onChange={handleInputChange}
                          className="mt-1 mr-3"
                        />
                        <span className="text-sm font-semibold text-gray-900">{description}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Custom Dimensions */}
                {formData.parcel_size === 'custom' && (
                  <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200">
                    <p className="text-sm font-bold text-yellow-900 mb-3">📏 Enter Exact Dimensions</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">
                          Length (cm) *
                        </label>
                        <input
                          type="number"
                          name="length"
                          value={formData.length}
                          onChange={handleInputChange}
                          required={formData.parcel_size === 'custom'}
                          min="1"
                          placeholder="50"
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">
                          Width (cm) *
                        </label>
                        <input
                          type="number"
                          name="width"
                          value={formData.width}
                          onChange={handleInputChange}
                          required={formData.parcel_size === 'custom'}
                          min="1"
                          placeholder="30"
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">
                          Height (cm) *
                        </label>
                        <input
                          type="number"
                          name="height"
                          value={formData.height}
                          onChange={handleInputChange}
                          required={formData.parcel_size === 'custom'}
                          min="1"
                          placeholder="20"
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Service Type */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Service Type *
                  </label>
                  <select
                    name="service_type"
                    value={formData.service_type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  >
                    <option value="standard">⏰ Standard (3-5 business days)</option>
                    <option value="next_day">📅 Next Day (delivered tomorrow)</option>
                    <option value="express">🚀 Express (1-2 business days)</option>
                    <option value="same_day">⚡ Same Day (within 12 hours)</option>
                    <option value="overnight">🌙 Overnight (next morning)</option>
                    <option value="scheduled">📅 Scheduled (pick specific date/time)</option>
                    <option value="recurring">🔄 Recurring (weekly/monthly)</option>
                    <option value="white_glove">🎁 White Glove (premium handling + insurance)</option>
                  </select>
                  
                  {/* Service Type Info */}
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-900">
                      {formData.service_type === 'standard' && '⏰ Standard: Economical delivery in 3-5 business days'}
                      {formData.service_type === 'next_day' && '📅 Next Day: Guaranteed delivery by tomorrow (1.5x base price)'}
                      {formData.service_type === 'express' && '🚀 Express: Fast delivery in 1-2 business days (1.8x base price)'}
                      {formData.service_type === 'same_day' && '⚡ Same Day: Delivered within 12 hours (2.5x base price)'}
                      {formData.service_type === 'overnight' && '🌙 Overnight: Delivered next morning before 9am (2.2x base price)'}
                      {formData.service_type === 'scheduled' && '📅 Scheduled: Choose exact date and time for delivery (1.3x base price)'}
                      {formData.service_type === 'recurring' && '🔄 Recurring: Set up weekly or monthly deliveries (15% discount)'}
                      {formData.service_type === 'white_glove' && '🎁 White Glove: Premium handling with extra care, insurance included (3x base price)'}
                    </p>
                  </div>
                </div>

                {/* Recurring Delivery Options */}
                {formData.service_type === 'recurring' && (
                  <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
                    <label className="block text-sm font-bold text-purple-900 mb-3">
                      🔄 Recurring Delivery Schedule
                    </label>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">
                          Frequency *
                        </label>
                        <select
                          name="recurring_frequency"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                        >
                          <option value="weekly">Weekly</option>
                          <option value="biweekly">Bi-Weekly (Every 2 weeks)</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">
                          Start Date *
                        </label>
                        <input
                          type="date"
                          name="recurring_start_date"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">
                          Number of Deliveries
                        </label>
                        <input
                          type="number"
                          name="recurring_count"
                          min="2"
                          max="52"
                          placeholder="12"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Scheduling */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    📅 Schedule Pickup (Optional)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      type="date"
                      name="scheduled_date"
                      value={formData.scheduled_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                    <input
                      type="time"
                      name="scheduled_time"
                      value={formData.scheduled_time}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Special Options */}
                <div className="space-y-3">
                  <label className="flex items-center p-4 border-2 border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50">
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
                  <label className="flex items-center p-4 border-2 border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      name="insurance_required"
                      checked={formData.insurance_required}
                      onChange={handleInputChange}
                      className="mr-3"
                    />
                    <div>
                      <span className="font-bold text-gray-900">🛡️ Add Insurance (+$10)</span>
                      <p className="text-xs text-gray-600">Protect your parcel up to $1000</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 py-4 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="flex-1 py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
                >
                  Next: Photos & Notes →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Photos, Signature & Notes */}
          {currentStep === 3 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">📸 Photos, Signature & Notes</h3>
              
              <div className="space-y-6">
                {/* Photo Upload */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    📷 Upload Parcel Photos (Max 5)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition"
                  >
                    <p className="text-4xl mb-2">📸</p>
                    <p className="text-sm font-semibold text-gray-600">Click to upload photos</p>
                  </label>
                  
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full text-xs font-bold"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Signature Pad */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    ✍️ Your Signature (Optional)
                  </label>
                  <div className="border-2 border-gray-300 rounded-xl overflow-hidden bg-white">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={200}
                      className="w-full touch-none"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="mt-2 text-sm text-red-600 hover:underline font-semibold"
                  >
                    Clear Signature
                  </button>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    📝 Delivery Instructions (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={5}
                    placeholder="Leave at front door, call on arrival, gate code, etc..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 py-4 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="flex-1 py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
                >
                  Review Order →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Price Card */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm opacity-90 mb-1">Total Price</p>
                    <p className="text-5xl font-black">${price.toFixed(2)}</p>
                    <p className="text-xs opacity-75 mt-2">{formData.quantity} {formData.quantity > 1 ? 'parcels' : 'parcel'} • {formData.service_type}</p>
                  </div>
                  <div className="text-7xl">💰</div>
                </div>
              </div>

              {/* Review Summary */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">📋 Order Summary</h3>
                <div className="space-y-4 text-sm">
                  <div className="pb-3 border-b">
                    <p className="font-bold text-gray-700 mb-1">From:</p>
                    <p className="text-gray-900">{formData.pickup_address}</p>
                    <p className="text-gray-600">{formData.pickup_contact_name} • {formData.pickup_contact_phone}</p>
                  </div>
                  <div className="pb-3 border-b">
                    <p className="font-bold text-gray-700 mb-1">To:</p>
                    <p className="text-gray-900">{formData.dropoff_address}</p>
                    <p className="text-gray-600">{formData.dropoff_contact_name} • {formData.dropoff_contact_phone}</p>
                  </div>
                  <div className="pb-3 border-b">
                    <p className="font-bold text-gray-700 mb-1">Parcel:</p>
                    <p className="text-gray-900">{formData.quantity} × {formData.parcel_size} • {formData.parcel_weight}kg</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-700 mb-1">Service:</p>
                    <p className="text-gray-900">{formData.service_type}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="flex-1 py-4 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-50 text-lg"
                >
                  {submitting ? "Creating Order..." : "Create Order ✓"}
                </button>
              </div>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}