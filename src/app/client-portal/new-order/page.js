"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Image from "next/image";
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
  });
  const [parcelImages, setParcelImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [signature, setSignature] = useState(null);
  
  // Pricing state
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
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Debounce timer ref
  const distanceTimerRef = useRef(null);

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
  }, [formData.service_type, formData.parcel_weight, pricing.distance]);

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
      
      if (data.error) {
        console.warn('Distance calculation error:', data.error);
        setPricing(prev => ({ ...prev, distance: 0, duration: 0 }));
      } else {
        setPricing(prev => ({
          ...prev,
          distance: data.distance || 0,
          duration: data.duration || 0
        }));
      }
    } catch (error) {
      console.error('Distance calculation failed:', error);
      setPricing(prev => ({ ...prev, distance: 0, duration: 0 }));
    } finally {
      setCalculatingDistance(false);
    }
  }

  function calculatePrice() {
    const weight = parseFloat(formData.parcel_weight) || 0;
    const distance = pricing.distance || 0;
    const serviceType = formData.service_type;
    const fuelLevyPercent = 10;

    let basePrice = 0;
    let perKmRate = 0;
    const perKmStartsAt = 10;
    let requiresQuote = false;

    // Mac's pricing logic from MWAV_Pricing_Dec_25
    switch (serviceType) {
      case 'standard':
        // Same-day Delivery (3-5 hours)
        if (weight <= 10) {
          basePrice = 39.50;
          perKmRate = distance > 10 ? 1.70 : 0;
        } else {
          basePrice = 45.00;
          perKmRate = distance > 10 ? 1.70 : 0;
        }
        break;

      case 'same_day':
        // Same-day Flexible (may be >5 hours)
        if (weight <= 10) {
          basePrice = 35.00;
          perKmRate = distance > 10 ? 1.25 : 0;
        } else {
          basePrice = 40.00;
          perKmRate = distance > 10 ? 1.70 : 0;
        }
        break;

      case 'local_overnight':
      case 'next_day':
        // Local overnight - pick up today deliver tomorrow
        basePrice = 32.00;
        perKmRate = distance > 10 ? 1.70 : 0;
        break;

      case 'emergency':
        // Express (2 hours from pickup)
        if (weight <= 10) {
          basePrice = 60.00;
          perKmRate = 0;
        } else {
          basePrice = 67.00;
          if (distance > 10 && distance <= 30) {
            perKmRate = 1.70;
          }
        }
        break;

      case 'priority':
      case 'vip':
        // Priority (within 1hr)
        if (weight <= 10) {
          basePrice = 120.00;
          perKmRate = 0;
        } else {
          basePrice = 150.00;
          perKmRate = distance > 10 ? 1.70 : 0;
        }
        break;

      case 'scheduled':
      case 'after_hours':
        requiresQuote = true;
        basePrice = 0;
        perKmRate = 0;
        break;

      default:
        if (weight <= 10) {
          basePrice = 39.50;
          perKmRate = distance > 10 ? 1.70 : 0;
        } else {
          basePrice = 45.00;
          perKmRate = distance > 10 ? 1.70 : 0;
        }
    }

    if (requiresQuote) {
      setPricing(prev => ({
        ...prev,
        requiresQuote: true,
        basePrice: 0,
        distanceCharge: 0,
        subtotal: 0,
        fuelLevy: 0,
        gst: 0,
        total: 0,
        perKmRate: 0
      }));
      return;
    }

    // Calculate distance charge
    const chargeableDistance = Math.max(0, distance - perKmStartsAt);
    const distanceCharge = perKmRate > 0 ? chargeableDistance * perKmRate : 0;

    // Subtotal
    const subtotal = basePrice + distanceCharge;

    // Fuel levy
    const fuelLevy = subtotal * (fuelLevyPercent / 100);

    // GST (10% of subtotal + fuel levy)
    const beforeGst = subtotal + fuelLevy;
    const gst = beforeGst * 0.10;

    // Total
    const total = beforeGst + gst;

    setPricing(prev => ({
      ...prev,
      requiresQuote: false,
      basePrice: parseFloat(basePrice.toFixed(2)),
      perKmRate,
      distanceCharge: parseFloat(distanceCharge.toFixed(2)),
      chargeableDistance: parseFloat(chargeableDistance.toFixed(2)),
      subtotal: parseFloat(subtotal.toFixed(2)),
      fuelLevy: parseFloat(fuelLevy.toFixed(2)),
      fuelLevyPercent,
      gst: parseFloat(gst.toFixed(2)),
      total: parseFloat(total.toFixed(2))
    }));
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
      setError("Pickup and dropoff addresses are required.");
      return;
    }

    if (!formData.pickup_contact_name || !formData.dropoff_contact_name) {
      setError("Contact names are required for both pickup and dropoff.");
      return;
    }

    if (!formData.pickup_contact_phone || !formData.dropoff_contact_phone) {
      setError("Contact phone numbers are required for both pickup and dropoff.");
      return;
    }

    if (!formData.parcel_weight || parseFloat(formData.parcel_weight) <= 0) {
      setError("Please enter the parcel weight.");
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

      const orderData = {
        client_id: client.id,
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
        distance_km: pricing.distance,
        base_price: pricing.basePrice,
        fuel_levy: pricing.fuelLevy,
        fuel_levy_percent: pricing.fuelLevyPercent,
        gst: pricing.gst,
        price: pricing.total,
        status: "pending_payment",
        signature_data: signature || null,
        parcel_images: uploadedImageUrls.length > 0 ? uploadedImageUrls : null,
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
            <span className="text-left">Addresses</span>
            <span className="text-center">Parcel</span>
            <span className="text-center">Photos</span>
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
              {pricing.distance > 0 && <p className="text-xs opacity-75 mt-1">{pricing.distance.toFixed(1)}km • ~{pricing.duration} mins</p>}
              {calculatingDistance && <p className="text-xs opacity-75 mt-1">Calculating distance...</p>}
            </div>
            <div className="text-5xl">💰</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Addresses */}
          {currentStep === 1 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">📍 Pickup & Delivery Addresses</h3>
              
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

                {pricing.distance > 0 && (
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
              </div>

              <button type="button" onClick={() => setCurrentStep(2)} className="w-full mt-6 py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition">
                Next: Parcel Details →
              </button>
            </div>
          )}

          {/* Step 2: Parcel Details */}
          {currentStep === 2 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">📦 Parcel Information</h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Quantity *</label>
                    <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} required min="1" max="99" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Weight (kg) * <span className="text-xs text-gray-500">(affects price)</span></label>
                    <input type="number" name="parcel_weight" value={formData.parcel_weight} onChange={handleInputChange} required min="0.1" step="0.1" placeholder="e.g. 5" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent" />
                    <p className="text-xs text-gray-500 mt-1">{parseFloat(formData.parcel_weight || 0) <= 10 ? '✓ Under 10kg rate' : '⚠️ Over 10kg rate'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Parcel Size *</label>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {Object.entries(sizeReference).map(([value, description]) => (
                      <label key={value} className={`flex items-start p-3 border-2 rounded-xl cursor-pointer transition ${formData.parcel_size === value ? 'border-red-600 bg-red-50' : 'border-gray-300 hover:border-red-300'}`}>
                        <input type="radio" name="parcel_size" value={value} checked={formData.parcel_size === value} onChange={handleInputChange} className="mt-1 mr-3" />
                        <span className="text-sm font-semibold text-gray-900">{description}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {formData.parcel_size === 'custom' && (
                  <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200">
                    <p className="text-sm font-bold text-yellow-900 mb-3">📏 Enter Dimensions</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Length (cm)</label>
                        <input type="number" name="length" value={formData.length} onChange={handleInputChange} min="1" placeholder="50" className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Width (cm)</label>
                        <input type="number" name="width" value={formData.width} onChange={handleInputChange} min="1" placeholder="30" className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Height (cm)</label>
                        <input type="number" name="height" value={formData.height} onChange={handleInputChange} min="1" placeholder="20" className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm" />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Service Type * <span className="text-xs text-gray-500">(affects price)</span></label>
                  <select name="service_type" value={formData.service_type} onChange={handleInputChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent">
                    <option value="standard">⏰ Standard (3-5 Hours)</option>
                    <option value="same_day">⚡ Same Day (12 Hours)</option>
                    <option value="next_day">📅 Next Day (Delivery Tomorrow)</option>
                    <option value="local_overnight">🌙 Local/Overnight (Next Day)</option>
                    <option value="emergency">🚨 Emergency (1-2 Hours)</option>
                    <option value="vip">⭐ VIP (2-3 Hours)</option>
                    <option value="priority">🔥 Priority (1-1.5 Hours)</option>
                    <option value="scheduled">📆 Scheduled - Contact for Quote</option>
                    <option value="after_hours">🌃 After Hours/Weekend - Contact for Quote</option>
                  </select>
                  
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

                <label className="flex items-center p-4 border-2 border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" name="fragile" checked={formData.fragile} onChange={handleInputChange} className="mr-3" />
                  <div>
                    <span className="font-bold text-gray-900">⚠️ Fragile Item</span>
                    <p className="text-xs text-gray-600">Handle with extra care</p>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setCurrentStep(1)} className="flex-1 py-4 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition">← Back</button>
                <button type="button" onClick={() => setCurrentStep(3)} className="flex-1 py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition">Next: Photos →</button>
              </div>
            </div>
          )}

          {/* Step 3: Photos & Notes */}
          {currentStep === 3 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">📸 Photos & Notes</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">📷 Parcel Photos (Max 5)</label>
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

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">✍️ Signature (Optional)</label>
                  <div className="border-2 border-gray-300 rounded-xl overflow-hidden bg-white">
                    <canvas ref={canvasRef} width={400} height={150} className="w-full touch-none" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
                  </div>
                  <button type="button" onClick={clearSignature} className="mt-2 text-sm text-red-600 hover:underline font-semibold">Clear Signature</button>
                </div>

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
                  <p className="text-sm opacity-90 mb-3">Price Breakdown</p>
                  
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span>Base ({formData.parcel_weight || 0}kg, {formData.service_type.replace(/_/g, ' ')})</span>
                      <span className="font-bold">${pricing.basePrice.toFixed(2)}</span>
                    </div>
                    {pricing.distanceCharge > 0 && (
                      <div className="flex justify-between">
                        <span>Distance ({pricing.chargeableDistance.toFixed(1)}km × ${pricing.perKmRate.toFixed(2)})</span>
                        <span className="font-bold">${pricing.distanceCharge.toFixed(2)}</span>
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
                    <p className="font-bold text-gray-700 mb-1">📦 Parcel:</p>
                    <p className="text-gray-900">{formData.quantity} × {formData.parcel_size.replace(/_/g, ' ')} • {formData.parcel_weight}kg {formData.fragile && '• ⚠️ Fragile'}</p>
                  </div>
                  <div className="pb-3 border-b">
                    <p className="font-bold text-gray-700 mb-1">🚚 Service:</p>
                    <p className="text-gray-900 capitalize">{formData.service_type.replace(/_/g, ' ')}</p>
                  </div>
                  {pricing.distance > 0 && (
                    <div>
                      <p className="font-bold text-gray-700 mb-1">📏 Distance:</p>
                      <p className="text-gray-900">{pricing.distance.toFixed(1)} km</p>
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