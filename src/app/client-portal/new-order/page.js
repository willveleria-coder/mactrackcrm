"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Image from "next/image";

export default function NewOrderPage() {
  const [client, setClient] = useState(null);
  const [formData, setFormData] = useState({
    pickup_address: "",
    dropoff_address: "",
    parcel_size: "small",
    parcel_weight: "",
    length: "",
    width: "",
    height: "",
    service_type: "standard",
    scheduled_date: "",
    scheduled_time: "",
    notes: "",
  });
  const [parcelImage, setParcelImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [price, setPrice] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadClient();
  }, []);

  useEffect(() => {
    calculatePrice();
  }, [formData.parcel_size, formData.parcel_weight, formData.service_type, formData.length, formData.width, formData.height]);

  async function loadClient() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error("User error:", userError);
        router.push("/client-portal/login");
        return;
      }

      console.log("Authenticated user:", user.id);

      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (clientError) {
        console.error("Client fetch error:", clientError);
        router.push("/client-portal/login");
        return;
      }

      if (!clientData) {
        console.error("No client data found for user");
        router.push("/client-portal/login");
        return;
      }

      console.log("Client loaded:", clientData.id);
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

    // Custom size calculation
    if (formData.parcel_size === 'custom') {
      const length = parseFloat(formData.length) || 0;
      const width = parseFloat(formData.width) || 0;
      const height = parseFloat(formData.height) || 0;
      
      // Calculate volume in cubic meters
      const volume = (length * width * height) / 1000000;
      
      // Price per cubic meter
      basePrice = Math.max(volume * 50, 20);
    } else {
      // Size multiplier for standard sizes
      const sizeMultipliers = {
        small: 1,
        medium: 1.5,
        large: 2,
        extra_large: 3,
      };
      basePrice *= sizeMultipliers[formData.parcel_size] || 1;
    }

    // Weight multiplier
    const weight = parseFloat(formData.parcel_weight) || 0;
    if (weight > 10) basePrice += (weight - 10) * 2;

    // Service type multiplier
    const serviceMultipliers = {
      standard: 1,
      express: 1.5,
      same_day: 2,
    };
    basePrice *= serviceMultipliers[formData.service_type] || 1;

    setPrice(Math.max(basePrice, 20));
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (file) {
      setParcelImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
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
      console.log("Creating order for client:", client.id);

      // Create order WITHOUT image for now
      const orderData = {
        client_id: client.id,
        pickup_address: formData.pickup_address,
        dropoff_address: formData.dropoff_address,
        parcel_size: formData.parcel_size,
        parcel_weight: parseFloat(formData.parcel_weight) || 0,
        length: parseFloat(formData.length) || null,
        width: parseFloat(formData.width) || null,
        height: parseFloat(formData.height) || null,
        service_type: formData.service_type,
        scheduled_date: formData.scheduled_date || null,
        scheduled_time: formData.scheduled_time || null,
        notes: formData.notes || null,
        price: price,
        status: "pending",
        image_url: null, // Skip image for now
      };

      console.log("Inserting order:", orderData);

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([orderData])
        .select();

      if (orderError) {
        console.error("Order error:", orderError);
        throw orderError;
      }

      if (!order || order.length === 0) {
        throw new Error("Order created but no data returned");
      }

      console.log("SUCCESS! Order created:", order[0]);

      // Redirect to dashboard
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-red-600 text-lg">Unable to load client data. Please try logging in again.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
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
                <h1 className="text-xl sm:text-2xl font-black text-red-600">Mac Track</h1>
                <p className="text-xs text-gray-500">New Order</p>
              </div>
            </div>
            <button
              onClick={() => router.push("/client-portal/dashboard")}
              className="text-sm font-semibold text-gray-700 hover:text-red-600"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            Create New Order
          </h2>
          <p className="text-sm sm:text-base text-gray-600">Fill in the details for your delivery</p>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700 font-semibold">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
          {/* Addresses */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📍 Addresses</h3>
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

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Dropoff Address *
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
            </div>
          </div>

          {/* Parcel Details */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📦 Parcel Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Size *
                </label>
                <select
                  name="parcel_size"
                  value={formData.parcel_size}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                >
                  <option value="small">Small (Shoebox) - up to 30×20×15cm</option>
                  <option value="medium">Medium (Microwave) - up to 60×40×40cm</option>
                  <option value="large">Large (TV Box) - up to 100×60×60cm</option>
                  <option value="extra_large">Extra Large (Fridge) - up to 180×80×80cm</option>
                  <option value="custom">Custom Size - Enter exact dimensions</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Weight (kg) *
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

            {/* Custom Dimensions - Only show when Custom is selected */}
            {formData.parcel_size === 'custom' && (
              <div className="mt-4 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                <p className="text-sm font-bold text-blue-900 mb-3">📏 Enter Custom Dimensions</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Length (cm) *
                    </label>
                    <input
                      type="number"
                      name="length"
                      value={formData.length}
                      onChange={handleInputChange}
                      required={formData.parcel_size === 'custom'}
                      min="1"
                      placeholder="30"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Width (cm) *
                    </label>
                    <input
                      type="number"
                      name="width"
                      value={formData.width}
                      onChange={handleInputChange}
                      required={formData.parcel_size === 'custom'}
                      min="1"
                      placeholder="20"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Height (cm) *
                    </label>
                    <input
                      type="number"
                      name="height"
                      value={formData.height}
                      onChange={handleInputChange}
                      required={formData.parcel_size === 'custom'}
                      min="1"
                      placeholder="15"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  💡 Custom pricing will be calculated based on dimensions and weight
                </p>
              </div>
            )}

            {/* Optional Dimensions for standard sizes */}
            {formData.parcel_size !== 'custom' && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-3">📏 Optional: Add exact dimensions for better accuracy</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">
                      Length (cm)
                    </label>
                    <input
                      type="number"
                      name="length"
                      value={formData.length}
                      onChange={handleInputChange}
                      min="0"
                      placeholder="Optional"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">
                      Width (cm)
                    </label>
                    <input
                      type="number"
                      name="width"
                      value={formData.width}
                      onChange={handleInputChange}
                      min="0"
                      placeholder="Optional"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      name="height"
                      value={formData.height}
                      onChange={handleInputChange}
                      min="0"
                      placeholder="Optional"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📝 Delivery Notes (Optional)</h3>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={4}
              placeholder="Any special instructions for the driver..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none"
            />
          </div>

          {/* Price */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 mb-6 text-white">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm opacity-90 mb-1">Estimated Price</p>
                <p className="text-4xl font-black">${price.toFixed(2)}</p>
              </div>
              <div className="text-6xl">💰</div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating Order..." : "Create Order"}
          </button>
        </form>
      </main>
    </div>
  );
}