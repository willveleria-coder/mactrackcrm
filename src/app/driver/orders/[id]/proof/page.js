"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";
import Link from "next/link";

export default function ProofOfDeliveryPage() {
  const [order, setOrder] = useState(null);
  const [driver, setDriver] = useState(null);
  const [proofImages, setProofImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [signature, setSignature] = useState(null);
  const [anyoneHome, setAnyoneHome] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    loadOrder();
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, []);

  async function loadOrder() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push("/driver/login");
        return;
      }

      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (driverError || !driverData) {
        router.push("/driver/login");
        return;
      }

      setDriver(driverData);

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", params.id)
        .single();

      if (orderError || !orderData) {
        setError("Order not found");
        return;
      }

      if (orderData.driver_id !== driverData.id) {
        setError("You are not assigned to this order");
        return;
      }

      setOrder(orderData);
    } catch (error) {
      console.error("Error loading order:", error);
      setError("Failed to load order");
    } finally {
      setLoading(false);
    }
  }

  function handleImageChange(e) {
    const files = Array.from(e.target.files);
    setProofImages(prev => [...prev, ...files]);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeImage(index) {
    setProofImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  }

  // Signature pad functions
  function startDrawing(e) {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e) {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    ctx.lineTo(x, y);
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const imageUrls = [];

      // Upload proof images
      for (const image of proofImages) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `proof-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("order-images")
          .upload(filePath, image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("order-images")
          .getPublicUrl(filePath);

        imageUrls.push(publicUrl);
      }

      // Upload signature if exists
      let signatureUrl = null;
      if (signature) {
        const base64Data = signature.split(',')[1];
        const blob = await fetch(signature).then(r => r.blob());
        const fileName = `signature-${Math.random()}.png`;
        const filePath = `signatures/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("order-images")
          .upload(filePath, blob);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("order-images")
          .getPublicUrl(filePath);

        signatureUrl = publicUrl;
      }

      // Update order with proof of delivery
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "delivered",
          proof_images: imageUrls,
          signature_url: signatureUrl,
          anyone_home: anyoneHome,
          delivery_notes: deliveryNotes,
          delivered_at: new Date().toISOString(),
        })
        .eq("id", params.id);

      if (updateError) throw updateError;

      alert("✅ Proof of delivery submitted successfully!");
      router.push("/driver/dashboard");
    } catch (err) {
      console.error("Error submitting proof:", err);
      setError(err.message || "Failed to submit proof");
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/driver/dashboard"
            className="inline-block px-6 py-3 bg-[#0072ab] text-white rounded-xl font-bold hover:bg-[#005d8c] transition"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-20">
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-black text-[#0072ab]">Proof of Delivery</h1>
            <Link
              href="/driver/dashboard"
              className="text-sm font-semibold text-gray-700 hover:text-[#0072ab]"
            >
              ← Back
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Details</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-semibold">#{order?.id.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pickup:</span>
              <span className="font-semibold text-right">{order?.pickup_address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Dropoff:</span>
              <span className="font-semibold text-right">{order?.dropoff_address}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit Proof of Delivery</h2>

          {/* Photo Upload */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              📸 Delivery Photos *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-[#0072ab] transition">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
                id="proof-upload"
                required={proofImages.length === 0}
              />
              <label htmlFor="proof-upload" className="cursor-pointer">
                <div className="text-5xl mb-3">📷</div>
                <p className="text-base font-semibold text-gray-700 mb-1">
                  Click to upload delivery photos
                </p>
                <p className="text-sm text-gray-500">Multiple images allowed</p>
              </label>
            </div>

            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg shadow"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Signature Pad */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              ✍️ Customer Signature *
            </label>
            <div className="border-2 border-gray-300 rounded-xl overflow-hidden">
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="w-full touch-none bg-gray-50"
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
              className="mt-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition text-sm font-semibold"
            >
              Clear Signature
            </button>
          </div>

          {/* Anyone Home? */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              🏠 Was Anyone Home? *
            </label>
            <select
              value={anyoneHome}
              onChange={(e) => setAnyoneHome(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0072ab] focus:border-transparent"
              required
            >
              <option value="">Select option</option>
              <option value="yes">✅ Yes - Delivered to recipient</option>
              <option value="no">❌ No - Left in safe location</option>
              <option value="neighbor">👨‍👩‍👧 Delivered to neighbor</option>
              <option value="office">🏢 Delivered to building office</option>
            </select>
          </div>

          {/* Delivery Notes */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              📝 Delivery Notes
            </label>
            <textarea
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="Add any additional delivery information..."
              rows="4"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0072ab] focus:border-transparent"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !signature}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-black text-lg hover:from-green-600 hover:to-green-700 transition shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "✅ Submit Proof of Delivery"}
          </button>
        </form>
      </main>
    </div>
  );
}