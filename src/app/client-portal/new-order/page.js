"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Image from "next/image";
import HamburgerMenu from "@/components/HamburgerMenu";

export default function NewOrderPage() {
  const router = useRouter();
  
  // Check booking hours on page load
  useEffect(() => {
    // Check for bypass parameter
    const urlParams = new URLSearchParams(window.location.search);
    const bypass = urlParams.get("bypass");
    if (bypass === "mac123") {
      return;
    }
    
    const now = new Date();
    const hour = now.getHours();
    if (hour < 7 || hour >= 17) {
      router.push("/client-portal/orders-closed");
    }
  }, [router]);
  
  const [client, setClient] = useState(null);
  const [formData, setFormData] = useState({
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
  });

  // Multiple items support
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

  const [parcelImages, setParcelImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [signature, setSignature] = useState(null);
  
  // Pricing state
  const [pricing, setPricing] = useState({
    basePrice: 0,
    distanceCost: 0,
    weightCost: 0,
    urgentMultiplier: 1,
    waitingFee: 0,
    subtotal: 0,
    fuelLevy: 0,
    fuelLevyPercent: 10,
    gst: 0,
    total: 0,
    requiresQuote: false,
    distance: 0,
    duration: 0,
    totalWeight: 0,
    totalVolumetricWeight: 0,
    chargeableWeight: 0,
    effectiveDistance: 0,
  });
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [waitingTime, setWaitingTime] = useState(0);
  const [manualDistance, setManualDistance] = useState("");
  const [distanceError, setDistanceError] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const supabase = createClient();

  const distanceTimerRef = useRef(null);

  // Item type options (dropdown)
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
    { href: "/client-portal/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/client-portal/orders", icon: "📦", label: "My Orders" },
    { href: "/client-portal/new-order", icon: "➕", label: "New Order" },
  ];

  useEffect(() => {
    loadClient();
  }, []);

  // Calculate distance when addresses change (debounced)
  useEffect(() => {
    if (formData.pickup_address.length > 5 && formData.dropoff_address.length > 5) {
      if (distanceTimerRef.current) {
        clearTimeout(distanceTimerRef.current);
      }
      
      distanceTimerRef.current = setTimeout(() => {
        calculateDistanceFromAddresses();
      }, 1500);
    }
    
    return () => {
      if (distanceTimerRef.current) {
        clearTimeout(distanceTimerRef.current);
      }
    };
  }, [formData.pickup_address, formData.dropoff_address]);

  // Recalculate price when relevant fields change
  useEffect(() => {
    calculatePrice();
  }, [formData.service_type, items, pricing.distance, waitingTime, manualDistance]);

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

  async function calculateDistanceFromAddresses() {
    if (!formData.pickup_address || !formData.dropoff_address) return;
    
    setCalculatingDistance(true);
    setDistanceError(false);
    
    try {
      const response = await fetch('/api/calculate-distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: formData.pickup_address,
          destination: formData.dropoff_address
        })
      });

      if (!response.ok) {
        throw new Error('Failed to calculate distance');
      }

      const data = await response.json();
      
      if (data.error || data.distance === 0) {
        console.warn('Distance calculation error:', data.error);
        setDistanceError(true);
        setPricing(prev => ({ ...prev, distance: 0, duration: 0 }));
      } else {
        setDistanceError(false);
        setPricing(prev => ({
          ...prev,
          distance: data.distance || 0,
          duration: data.duration || 0
        }));
      }
    } catch (error) {
      console.error('Distance calculation failed:', error);
      setDistanceError(true);
      setPricing(prev => ({ ...prev, distance: 0, duration: 0 }));
    } finally {
      setCalculatingDistance(false);
    }
  }

  function calculatePrice() {
    const distance = manualDistance ? parseFloat(manualDistance) : (pricing.distance || 0);
    const serviceType = formData.service_type;
    
    // Calculate total actual weight and volumetric weight from all items
    let totalActualWeight = 0;
    let totalVolumetricWeight = 0;
    
    items.forEach(item => {
      const qty = parseInt(item.quantity) || 1;
      if (item.is_under_10kg) {
        totalActualWeight += qty * 5;
      } else {
        const weightPerUnit = parseFloat(item.weight_per_unit) || 0;
        totalActualWeight += qty * weightPerUnit;
      }
      const length = parseFloat(item.length) || 0;
      const width = parseFloat(item.width) || 0;
      const height = parseFloat(item.height) || 0;
      if (length > 0 && width > 0 && height > 0) {
        const volumetric = (length * width * height) / 6000;
        totalVolumetricWeight += qty * volumetric;
      }
    });
    
    // Chargeable Weight = MAX(Actual Weight, Volumetric Weight)
    const chargeableWeight = Math.max(totalActualWeight, totalVolumetricWeight);
    
    // Service multipliers and minimums from Mac's formula
    const serviceConfig = {
      priority: { multiplier: 1.70, minimum: 170 },
      after_hours: { multiplier: 1, minimum: 150, special: true },
      emergency: { multiplier: 1.45, minimum: 140 },
      vip: { multiplier: 1.25, minimum: 120 },
      standard: { multiplier: 1.00, minimum: 100 },
      same_day: { multiplier: 1.00, minimum: 100 },
      local_overnight: { multiplier: 0.80, minimum: 80 },
      scheduled: { multiplier: 0.80, minimum: 80 },
      next_day: { multiplier: 0.80, minimum: 80 },
    };
    
    const config = serviceConfig[serviceType] || serviceConfig.standard;
    
    let finalPrice = 0;
    let basePrice = 0;
    let distanceCost = 0;
    let weightCost = 0;
    
    // SPECIAL AFTER HOURS PRICING
    if (serviceType === 'after_hours') {
      if (distance <= 10) {
        finalPrice = 150;
      } else {
        finalPrice = 150 + ((distance - 10) * 1.70);
      }
      basePrice = finalPrice;
    } else {
      // STANDARD BASE PRICE FORMULA
      // BasePrice = 45 + (Distance_km × 1.90) + (ChargeableWeight × 2.70)
      distanceCost = distance * 1.90;
      weightCost = chargeableWeight * 2.70;
      basePrice = 45 + distanceCost + weightCost;
      
      // Apply service multiplier
      let multipliedPrice = basePrice * config.multiplier;
      
      // Apply minimum
      finalPrice = Math.max(multipliedPrice, config.minimum);
    }
    
    // Fuel levy (10%)
    const FUEL_LEVY_PERCENT = 10;
    const fuelLevy = finalPrice * (FUEL_LEVY_PERCENT / 100);
    
    // GST (10% of subtotal + fuel levy)
    const beforeGst = finalPrice + fuelLevy;
    const gst = beforeGst * 0.10;
    
    // Total
    const total = beforeGst + gst;
    
    setPricing(prev => ({
      ...prev,
      requiresQuote: false,
      basePrice: parseFloat(basePrice.toFixed(2)),
      distanceCost: parseFloat(distanceCost.toFixed(2)),
      weightCost: parseFloat(weightCost.toFixed(2)),
      urgentMultiplier: config.multiplier,
      minimum: config.minimum,
      waitingFee: 0,
      subtotal: parseFloat(finalPrice.toFixed(2)),
      fuelLevy: parseFloat(fuelLevy.toFixed(2)),
      fuelLevyPercent: FUEL_LEVY_PERCENT,
      gst: parseFloat(gst.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      totalWeight: totalActualWeight,
      totalVolumetricWeight,
      chargeableWeight,
      effectiveDistance: distance,
    }));
  }

  function handleInputChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  function handleItemChange(itemId, field, value) {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  }

  function addItem() {
    const newId = Math.max(...items.map(i => i.id)) + 1;
    setItems(prev => [...prev, {
      id: newId,
      item_type: "small_box",
      quantity: 1,
      weight_per_unit: "",
      is_under_10kg: false,
      length: "",
      width: "",
      height: "",
      fragile: false,
      description: "",
    }]);
  }

  function removeItem(itemId) {
    if (items.length <= 1) {
      alert("You must have at least one item");
      return;
    }
    setItems(prev => prev.filter(item => item.id !== itemId));
  }

  function getTotalWeight(item) {
    if (item.is_under_10kg) {
      return (parseInt(item.quantity) || 1) * 5;
    }
    return (parseInt(item.quantity) || 1) * (parseFloat(item.weight_per_unit) || 0);
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
    if (canvas) {
      setSignature(canvas.toDataURL());
    }
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignature(null);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/client-portal/login");
  }

  async function handleSubmit(e) {
    // Check booking hours (7am - 5pm)
    const now = new Date();
    const hour = now.getHours();
    if (hour < 7 || hour >= 17) {
      setError("Online bookings are available between 7:00 AM and 5:00 PM. For after-hours bookings, please call 0430 233 811.");
      return;
    }
    e.preventDefault();
    
    if (!client) {
      setError("Client data not loaded. Please refresh and try again.");
      return;
    }

    if (pricing.requiresQuote) {
      setError("This service requires a custom quote. Please contact Mac With A Van at 0430 233 811 or macwithavan@mail.com");
      return;
    }

    if (!formData.pickup_address || !formData.dropoff_address) {
      setError("Pickup and delivery addresses are required.");
      return;
    }

    if (!formData.pickup_contact_name || !formData.dropoff_contact_name) {
      setError("Contact names are required for both pickup and delivery.");
      return;
    }

    if (!formData.pickup_contact_phone || !formData.dropoff_contact_phone) {
      setError("Contact phone numbers are required for both pickup and delivery.");
      return;
    }

    // Validate items
    for (const item of items) {
      if (!item.is_under_10kg && (!item.weight_per_unit || parseFloat(item.weight_per_unit) <= 0)) {
        setError("Please enter weight for all items or check 'Under 10kg'.");
        return;
      }
    }

    // Validate distance
    const finalDistance = manualDistance ? parseFloat(manualDistance) : pricing.distance;
    if (!finalDistance || finalDistance <= 0) {
      setError("Please enter the delivery distance.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      let uploadedImageUrls = [];
      
      if (parcelImages.length > 0) {
        for (const image of parcelImages) {
          const fileName = `${Date.now()}-${image.name}`;
          const { error: uploadError } = await supabase.storage
            .from('parcel-images')
            .upload(fileName, image);

          if (uploadError) {
            console.warn('Image upload failed:', uploadError);
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('parcel-images')
              .getPublicUrl(fileName);
            uploadedImageUrls.push(publicUrl);
          }
        }
      }

      // Combine items info for storage
      const itemsSummary = items.map(item => ({
        type: item.item_type,
        quantity: parseInt(item.quantity) || 1,
        weight_per_unit: item.is_under_10kg ? 5 : parseFloat(item.weight_per_unit) || 0,
        total_weight: getTotalWeight(item),
        dimensions: item.length && item.width && item.height 
          ? `${item.length}×${item.width}×${item.height}cm` 
          : null,
        fragile: item.fragile,
        description: item.description,
      }));

      const totalQuantity = items.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);
      const primaryItem = items[0];
      const finalDistance = manualDistance ? parseFloat(manualDistance) : pricing.distance;

      const orderData = {
        client_id: client.id,
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
        distance_km: finalDistance,
        base_price: pricing.basePrice,
        distance_charge: pricing.distanceCost,
        weight_charge: pricing.weightCost,
        waiting_fee: pricing.waitingFee,
        fuel_levy: pricing.fuelLevy,
        fuel_levy_percent: pricing.fuelLevyPercent,
        gst: pricing.gst,
        price: pricing.total,
        status: "pending_payment",
        signature_data: signature || null,
        parcel_images: uploadedImageUrls.length > 0 ? uploadedImageUrls : null,
        items_detail: itemsSummary,
      };

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([orderData])
        .select();

      if (orderError) {
        console.error("Order creation error:", orderError);
        throw new Error(orderError.message || "Failed to create order");
      }

      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order[0].id,
          amount: pricing.total,
          customerEmail: client.email,
          customerName: client.name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;

    } catch (err) {
      console.error("Error creating order:", err);
      setError(err.message || "Failed to create order. Please try again.");
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
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/bus-icon.png" alt="Mac Track" width={40} height={40} className="object-contain" />
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-red-600">Mac Track</h1>
                <p className="text-xs text-gray-500">Client Portal</p>
              </div>
            </div>
            <HamburgerMenu items={menuItems} onLogout={handleLogout} userName={client?.name} userRole="Client" />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Create New Order 📦</h2>
          <p className="text-sm sm:text-base text-gray-600">Fill in the delivery details</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center">
            {[1, 2, 3, 4].map((step, index) => (
              <div key={step} className="flex items-center" style={{ flex: index === 3 ? '0 0 auto' : '1 1 0%' }}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${currentStep >= step ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {step}
                </div>
                {step < 4 && <div className={`h-1 mx-2 ${currentStep > step ? 'bg-red-600' : 'bg-gray-200'}`} style={{ flex: '1 1 0%' }} />}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 mt-2 text-xs sm:text-sm font-semibold text-gray-600">
            <span className="text-left">Pickup</span>
            <span className="text-center">Items</span>
            <span className="text-center">Service</span>
            <span className="text-right">Review</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6">
            <p className="text-red-700 font-semibold">❌ {error}</p>
          </div>
        )}

        {/* Live Price Preview */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-4 mb-6 text-white shadow-lg sticky top-20 z-20">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs opacity-90 mb-1">Estimated Total</p>
              {pricing.requiresQuote ? (
                <p className="text-lg font-bold">Contact for Quote</p>
              ) : (
                <p className="text-3xl font-black">${pricing.total.toFixed(2)}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-1 text-xs opacity-75">
                {(pricing.distance > 0 || manualDistance) && <span>{manualDistance ? parseFloat(manualDistance).toFixed(1) : pricing.distance.toFixed(1)}km</span>}
                {pricing.chargeableWeight > 0 && <span>• {pricing.chargeableWeight.toFixed(1)}kg chargeable</span>}
                {pricing.duration > 0 && !manualDistance && <span>• ~{pricing.duration} mins</span>}
              </div>
              {calculatingDistance && <p className="text-xs opacity-75 mt-1">Calculating distance...</p>}
            </div>
            <div className="text-5xl">💰</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Pickup Location */}
          {currentStep === 1 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">📍 Pickup & Delivery Location</h3>
              
              <div className="space-y-6">
                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="font-bold text-blue-900 mb-4">Pickup Details</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Pickup Address *</label>
                      <input type="text" name="pickup_address" value={formData.pickup_address} onChange={handleInputChange} required placeholder="123 Main St, Melbourne VIC 3000" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Contact Name *</label>
                        <input type="text" name="pickup_contact_name" value={formData.pickup_contact_name} onChange={handleInputChange} required placeholder="John Doe" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Contact Phone *</label>
                        <input type="tel" name="pickup_contact_phone" value={formData.pickup_contact_phone} onChange={handleInputChange} required placeholder="0412 345 678" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-xl p-4">
                  <h4 className="font-bold text-green-900 mb-4">Delivery Details</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Delivery Address *</label>
                      <input type="text" name="dropoff_address" value={formData.dropoff_address} onChange={handleInputChange} required placeholder="456 High St, Melbourne VIC 3000" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Contact Name *</label>
                        <input type="text" name="dropoff_contact_name" value={formData.dropoff_contact_name} onChange={handleInputChange} required placeholder="Jane Smith" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Contact Phone *</label>
                        <input type="tel" name="dropoff_contact_phone" value={formData.dropoff_contact_phone} onChange={handleInputChange} required placeholder="0498 765 432" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent" />
                      </div>
                    </div>
                  </div>
                </div>

                {pricing.distance > 0 && !distanceError && (
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-700">📏 Distance</p>
                        <p className="text-lg font-black text-gray-900">{pricing.distance.toFixed(1)} km</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-700">⏱️ Drive Time</p>
                        <p className="text-lg font-black text-gray-900">~{pricing.duration} mins</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual Distance Entry - shown when API fails or distance is 0 */}
                {(distanceError || (formData.pickup_address.length > 5 && formData.dropoff_address.length > 5 && pricing.distance === 0 && !calculatingDistance)) && (
                  <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-300">
                    <p className="text-sm font-bold text-yellow-900 mb-2">⚠️ Auto-distance unavailable</p>
                    <p className="text-xs text-yellow-800 mb-3">Please enter the approximate distance manually, or use Google Maps to check.</p>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Distance (km) *</label>
                        <input
                          type="number"
                          value={manualDistance}
                          onChange={(e) => setManualDistance(e.target.value)}
                          min="0.1"
                          step="0.1"
                          placeholder="e.g. 15"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                        />
                      </div>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(formData.pickup_address)}&destination=${encodeURIComponent(formData.dropoff_address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition text-sm"
                      >
                        🗺️ Check Maps
                      </a>
                    </div>
                    {manualDistance && (
                      <p className="text-sm text-green-700 mt-2 font-semibold">✓ Using {manualDistance}km for pricing</p>
                    )}
                  </div>
                )}
              </div>

              <button type="button" onClick={() => setCurrentStep(2)} className="w-full mt-6 py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition">
                Next: Item/s Information →
              </button>
            </div>
          )}

          {/* Step 2: Item/s Information */}
          {currentStep === 2 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 mb-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">📦 Item/s Information</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="px-4 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition text-sm"
                >
                  ➕ Add Item
                </button>
              </div>
              
              <div className="space-y-6">
                {items.map((item, index) => (
                  <div key={item.id} className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200 relative">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full font-bold hover:bg-red-600"
                      >
                        ×
                      </button>
                    )}
                    
                    <h4 className="font-bold text-gray-900 mb-4">Item {index + 1}</h4>
                    
                    {/* Item Type Dropdown */}
                    <div className="mb-4">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Item/s Details *</label>
                      <select
                        value={item.item_type}
                        onChange={(e) => handleItemChange(item.id, 'item_type', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      >
                        {itemTypeOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Under 10kg checkbox */}
                    <div className="mb-4">
                      <label className="flex items-center p-3 border-2 border-gray-300 rounded-xl cursor-pointer hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={item.is_under_10kg}
                          onChange={(e) => handleItemChange(item.id, 'is_under_10kg', e.target.checked)}
                          className="mr-3 w-5 h-5"
                        />
                        <div>
                          <span className="font-bold text-gray-900">Item is under 10kg</span>
                          <p className="text-xs text-gray-600">Check this if each item weighs less than 10kg</p>
                        </div>
                      </label>
                    </div>

                    {/* Quantity and Weight */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Quantity *</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                          min="1"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                        />
                      </div>
                      
                      {!item.is_under_10kg && (
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Weight per Unit (kg) *</label>
                          <input
                            type="number"
                            value={item.weight_per_unit}
                            onChange={(e) => handleItemChange(item.id, 'weight_per_unit', e.target.value)}
                            min="0.1"
                            step="0.1"
                            placeholder="e.g. 5"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                          />
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Total Weight</label>
                        <div className="w-full px-4 py-3 bg-gray-200 rounded-xl font-bold text-gray-900">
                          {getTotalWeight(item).toFixed(1)} kg
                        </div>
                      </div>
                    </div>

                    {/* Dimensions (for custom or if they want to provide) */}
                    {(item.item_type === 'custom' || item.item_type === 'large_box' || item.item_type === 'pallet') && (
                      <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200 mb-4">
                        <p className="text-sm font-bold text-yellow-900 mb-3">📏 Dimensions (for volumetric weight calculation)</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Length (cm)</label>
                            <input
                              type="number"
                              value={item.length}
                              onChange={(e) => handleItemChange(item.id, 'length', e.target.value)}
                              min="1"
                              placeholder="50"
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Width (cm)</label>
                            <input
                              type="number"
                              value={item.width}
                              onChange={(e) => handleItemChange(item.id, 'width', e.target.value)}
                              min="1"
                              placeholder="30"
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Height (cm)</label>
                            <input
                              type="number"
                              value={item.height}
                              onChange={(e) => handleItemChange(item.id, 'height', e.target.value)}
                              min="1"
                              placeholder="20"
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                        {item.length && item.width && item.height && (
                          <p className="text-xs text-yellow-800 mt-2">
                            Volumetric: {((parseFloat(item.length) * parseFloat(item.width) * parseFloat(item.height)) / 6000).toFixed(2)} kg
                          </p>
                        )}
                      </div>
                    )}

                    {/* Fragile checkbox */}
                    <label className="flex items-center p-3 border-2 border-gray-300 rounded-xl cursor-pointer hover:bg-gray-100 mb-4">
                      <input
                        type="checkbox"
                        checked={item.fragile}
                        onChange={(e) => handleItemChange(item.id, 'fragile', e.target.checked)}
                        className="mr-3 w-5 h-5"
                      />
                      <div>
                        <span className="font-bold text-gray-900">⚠️ Fragile Item</span>
                        <p className="text-xs text-gray-600">Handle with extra care</p>
                      </div>
                    </label>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Item Description (Optional)</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        placeholder="e.g. Electronic equipment, documents, etc."
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      />
                    </div>
                  </div>
                ))}

                {/* Weight Summary */}
                <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                  <h4 className="font-bold text-blue-900 mb-3">📊 Weight Summary</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Items</p>
                      <p className="font-bold text-gray-900">{items.reduce((sum, i) => sum + (parseInt(i.quantity) || 1), 0)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Actual Weight</p>
                      <p className="font-bold text-gray-900">{pricing.totalWeight.toFixed(1)} kg</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Volumetric Weight</p>
                      <p className="font-bold text-gray-900">{pricing.totalVolumetricWeight.toFixed(1)} kg</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Chargeable Weight</p>
                      <p className="font-bold text-green-600">{pricing.chargeableWeight.toFixed(1)} kg</p>
                    </div>
                  </div>
                  <p className="text-xs text-blue-800 mt-2">
                    * Chargeable weight = whichever is higher: actual or volumetric
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setCurrentStep(1)} className="flex-1 py-4 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition">← Back</button>
                <button type="button" onClick={() => setCurrentStep(3)} className="flex-1 py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition">Next: Service Type →</button>
              </div>
            </div>
          )}

          {/* Step 3: Service Type & Notes */}
          {currentStep === 3 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">🚚 Service Type</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Select Service *</label>
                  <select name="service_type" value={formData.service_type} onChange={handleInputChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent">
                    <option value="standard">⏰ Standard (3-5 Hours)</option>
                    <option value="same_day">⚡ Same Day (12 Hours)</option>
                    <option value="next_day">📅 Next Day (Delivery Tomorrow)</option>
                    <option value="local_overnight">🌙 Local/Overnight (Next Day)</option>
                    <option value="emergency">🚨 Emergency (1-2 Hours) +25%</option>
                    <option value="vip">⭐ VIP (2-3 Hours) +25%</option>
                    <option value="priority">🔥 Priority (1-1.5 Hours) +25%</option>
                    <option value="scheduled">📆 Scheduled - Contact for Quote</option>
                    <option value="after_hours">🌃 After Hours/Weekend - Contact for Quote</option>
                  </select>
                  
                  {pricing.urgentMultiplier > 1 && (
                    <p className="text-sm text-orange-600 font-semibold mt-2">⚡ Urgent service: +25% applied</p>
                  )}
                  
                  {pricing.requiresQuote && (
                    <div className="mt-3 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
                      <p className="text-sm font-bold text-yellow-900">📞 Contact Required</p>
                      <p className="text-xs text-yellow-800 mt-1">This service requires a custom quote.</p>
                      <p className="text-sm font-bold text-yellow-900 mt-2">📱 0430 233 811 | ✉️ macwithavan@mail.com</p>
                    </div>
                  )}
                </div>

                {formData.service_type === 'scheduled' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Preferred Date</label>
                      <input type="date" name="scheduled_date" value={formData.scheduled_date} onChange={handleInputChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Preferred Time</label>
                      <input type="time" name="scheduled_time" value={formData.scheduled_time} onChange={handleInputChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                    </div>
                  </div>
                )}

                {/* Waiting Time */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Expected Waiting Time (minutes)</label>
                  <p className="text-xs text-gray-500 mb-2">If the driver needs to wait at pickup/delivery ($1 per minute)</p>
                  <input
                    type="number"
                    value={waitingTime}
                    onChange={(e) => setWaitingTime(parseInt(e.target.value) || 0)}
                    min="0"
                    placeholder="0"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  />
                  {waitingTime > 0 && (
                    <p className="text-sm text-gray-600 mt-1">Waiting fee: ${waitingTime.toFixed(2)}</p>
                  )}
                </div>

                {/* Photos */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">📷 Item Photos (Max 5)</label>
                  <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" id="image-upload" />
                  <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                    <p className="text-4xl mb-2">📸</p>
                    <p className="text-sm font-semibold text-gray-600">Click to upload</p>
                  </label>
                  
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                          <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full text-xs font-bold">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Signature */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">✍️ Signature (Optional)</label>
                  <div className="border-2 border-gray-300 rounded-xl overflow-hidden bg-white">
                    <canvas ref={canvasRef} width={400} height={150} className="w-full touch-none" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
                  </div>
                  <button type="button" onClick={clearSignature} className="mt-2 text-sm text-red-600 hover:underline font-semibold">Clear Signature</button>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">📝 Delivery Instructions</label>
                  <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={4} placeholder="Leave at front door, call on arrival, gate code, etc..." className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none" />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setCurrentStep(2)} className="flex-1 py-4 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition">← Back</button>
                <button type="button" onClick={() => setCurrentStep(4)} className="flex-1 py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition">Review Order →</button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {pricing.requiresQuote ? (
                <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-2xl p-6 text-white shadow-xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-lg font-bold mb-2">📞 Contact for Quote</p>
                      <p className="text-sm opacity-90">This service requires a custom quote.</p>
                      <p className="text-lg font-bold mt-3">0430 233 811</p>
                      <p className="text-sm">macwithavan@mail.com</p>
                    </div>
                    <div className="text-6xl">📱</div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl">
                  <p className="text-sm opacity-90 mb-3">Price Breakdown (Mac's Formula)</p>
                  
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span>Base Fee</span>
                      <span className="font-bold">${pricing.basePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Distance ({manualDistance ? parseFloat(manualDistance).toFixed(1) : pricing.distance.toFixed(1)}km × $1.70)</span>
                      <span className="font-bold">${pricing.distanceCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Weight ({pricing.chargeableWeight.toFixed(1)}kg × $2.50)</span>
                      <span className="font-bold">${pricing.weightCost.toFixed(2)}</span>
                    </div>
                    {pricing.waitingFee > 0 && (
                      <div className="flex justify-between">
                        <span>Waiting Time ({waitingTime} mins × $1)</span>
                        <span className="font-bold">${pricing.waitingFee.toFixed(2)}</span>
                      </div>
                    )}
                    {pricing.urgentMultiplier > 1 && (
                      <div className="flex justify-between text-yellow-200">
                        <span>⚡ Urgent Service (+25%)</span>
                        <span className="font-bold">Applied</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-white/30 pt-2">
                      <span>Subtotal</span>
                      <span className="font-bold">${pricing.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fuel Levy (10%)</span>
                      <span className="font-bold">${pricing.fuelLevy.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST (10%)</span>
                      <span className="font-bold">${pricing.gst.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t-2 border-white/50 pt-4">
                    <span className="text-lg font-bold">Total (inc. GST)</span>
                    <span className="text-4xl font-black">${pricing.total.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">📋 Order Summary</h3>
                <div className="space-y-4 text-sm">
                  <div className="pb-3 border-b">
                    <p className="font-bold text-gray-700 mb-1">📍 From:</p>
                    <p className="text-gray-900">{formData.pickup_address}</p>
                    <p className="text-gray-600">{formData.pickup_contact_name} • {formData.pickup_contact_phone}</p>
                  </div>
                  <div className="pb-3 border-b">
                    <p className="font-bold text-gray-700 mb-1">🎯 To:</p>
                    <p className="text-gray-900">{formData.dropoff_address}</p>
                    <p className="text-gray-600">{formData.dropoff_contact_name} • {formData.dropoff_contact_phone}</p>
                  </div>
                  <div className="pb-3 border-b">
                    <p className="font-bold text-gray-700 mb-1">📦 Items ({items.length}):</p>
                    {items.map((item, idx) => (
                      <p key={item.id} className="text-gray-900">
                        {item.quantity}× {itemTypeOptions.find(o => o.value === item.item_type)?.label || item.item_type} 
                        {' '}• {getTotalWeight(item).toFixed(1)}kg
                        {item.fragile && ' • ⚠️ Fragile'}
                      </p>
                    ))}
                    <p className="text-gray-600 mt-1">Total: {pricing.chargeableWeight.toFixed(1)}kg chargeable weight</p>
                  </div>
                  <div className="pb-3 border-b">
                    <p className="font-bold text-gray-700 mb-1">🚚 Service:</p>
                    <p className="text-gray-900 capitalize">{formData.service_type.replace(/_/g, ' ')}</p>
                  </div>
                  {(pricing.distance > 0 || manualDistance) && (
                    <div>
                      <p className="font-bold text-gray-700 mb-1">📏 Distance:</p>
                      <p className="text-gray-900">{manualDistance ? parseFloat(manualDistance).toFixed(1) : pricing.distance.toFixed(1)} km {pricing.duration > 0 && !manualDistance && `• ~${pricing.duration} mins`}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setCurrentStep(3)} className="flex-1 py-4 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition">← Back</button>
                <button type="submit" disabled={submitting || pricing.requiresQuote} className="flex-1 py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-50 text-lg">
                  {submitting ? "Processing..." : pricing.requiresQuote ? "Contact for Quote" : "Pay & Create ✓"}
                </button>
              </div>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}