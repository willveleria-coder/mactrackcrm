"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Image from "next/image";
import Link from "next/link";

export default function PublicTrackingPage() {
  const params = useParams();
  const orderId = params.id;
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [liveEta, setLiveEta] = useState(null);
  const [lastEtaUpdate, setLastEtaUpdate] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const supabase = createClient();

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  // Poll for live ETA updates every 15 seconds - ONLY FOR PRIORITY SERVICE
  useEffect(() => {
    if (!orderId || !order || order.status === 'delivered' || order.status === 'cancelled') return;
    
    // Only poll for live location if Priority service
    if (order.service_type !== 'priority') return;

    const fetchLiveEta = async () => {
      try {
        const response = await fetch(`/api/driver/get-location?order_id=${orderId}`);
        const data = await response.json();
        
        if (data.location) {
          setDriverLocation(data.location);
        }
        if (data.eta_minutes) {
          setLiveEta(data.eta_minutes);
          setLastEtaUpdate(new Date());
        }
      } catch (e) {
        console.log("ETA fetch error:", e);
      }
    };

    // Initial fetch
    fetchLiveEta();

    // Poll every 15 seconds
    const intervalId = setInterval(fetchLiveEta, 15000);

    return () => clearInterval(intervalId);
  }, [orderId, order?.status, order?.service_type]);

  // Initialize map when driver location is available - ONLY FOR PRIORITY SERVICE
  useEffect(() => {
    if (!driverLocation || !mapRef.current || !order) return;
    if (order.service_type !== 'priority') return;
    
    // Load Google Maps script if not already loaded
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
      script.async = true;
      script.onload = () => initMap();
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, [driverLocation, order]);

  function initMap() {
    if (!mapRef.current || !driverLocation || !window.google) return;

    const driverPos = {
      lat: parseFloat(driverLocation.latitude),
      lng: parseFloat(driverLocation.longitude)
    };

    // Create or update map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 14,
        center: driverPos,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] }
        ]
      });

      // Add delivery destination marker
      if (order?.dropoff_address) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: order.dropoff_address }, (results, status) => {
          if (status === 'OK' && results[0]) {
            new window.google.maps.Marker({
              position: results[0].geometry.location,
              map: mapInstanceRef.current,
              icon: {
                url: 'data:image/svg+xml,' + encodeURIComponent(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#22c55e">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(40, 40),
                anchor: new window.google.maps.Point(20, 40)
              },
              title: 'Delivery Location'
            });

            // Fit bounds to show both markers
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend(driverPos);
            bounds.extend(results[0].geometry.location);
            mapInstanceRef.current.fitBounds(bounds, { padding: 50 });
          }
        });
      }
    }

    // Update or create driver marker
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setPosition(driverPos);
    } else {
      driverMarkerRef.current = new window.google.maps.Marker({
        position: driverPos,
        map: mapInstanceRef.current,
        icon: {
          url: 'data:image/svg+xml,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="#dc2626">
              <circle cx="12" cy="12" r="10" fill="#dc2626"/>
              <text x="12" y="16" text-anchor="middle" fill="white" font-size="12">🚚</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(50, 50),
          anchor: new window.google.maps.Point(25, 25)
        },
        title: 'Driver Location'
      });
    }

    // Center on driver with smooth pan
    mapInstanceRef.current.panTo(driverPos);
  }

  async function loadOrder() {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("id, order_number, status, pickup_address, dropoff_address, service_type, parcel_size, parcel_weight, created_at, delivered_at, scheduled_date, scheduled_time, driver_status, driver_id, live_eta, live_eta_minutes, driver_distance_km, eta_updated_at, custom_eta")
        .eq("id", orderId)
        .single();

      if (orderError || !orderData) {
        setError("Order not found");
        return;
      }

      setOrder(orderData);
      
      // Set initial ETA from database - ONLY FOR PRIORITY SERVICE
      if (orderData.live_eta_minutes && orderData.service_type === 'priority') {
        setLiveEta(orderData.live_eta_minutes);
        setLastEtaUpdate(orderData.eta_updated_at ? new Date(orderData.eta_updated_at) : null);
      }
    } catch (err) {
      console.error("Error loading order:", err);
      setError("Failed to load order");
    } finally {
      setLoading(false);
    }
  }

  // Subscribe to real-time order updates
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          setOrder(payload.new);
          // Only update live ETA for Priority service
          if (payload.new.live_eta_minutes && payload.new.service_type === 'priority') {
            setLiveEta(payload.new.live_eta_minutes);
            setLastEtaUpdate(new Date());
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  function getStatusInfo(status) {
    const statuses = {
      pending: {
        label: "Pending",
        description: "Order received and awaiting pickup",
        color: "bg-yellow-100 text-yellow-800 border-yellow-300",
        icon: "⏳",
        step: 1
      },
      assigned: {
        label: "Driver Assigned",
        description: "A driver has been assigned to your order",
        color: "bg-purple-100 text-purple-800 border-purple-300",
        icon: "👤",
        step: 1
      },
      picked_up: {
        label: "Picked Up",
        description: "Your parcel has been picked up",
        color: "bg-indigo-100 text-indigo-800 border-indigo-300",
        icon: "📦",
        step: 2
      },
      active: {
        label: "In Transit",
        description: "Your parcel is on its way",
        color: "bg-blue-100 text-blue-800 border-blue-300",
        icon: "🚚",
        step: 2
      },
      in_transit: {
        label: "In Transit",
        description: "Your parcel is on its way",
        color: "bg-blue-100 text-blue-800 border-blue-300",
        icon: "🚚",
        step: 2
      },
      delivered: {
        label: "Delivered",
        description: "Your parcel has been delivered",
        color: "bg-green-100 text-green-800 border-green-300",
        icon: "✅",
        step: 3
      },
      cancelled: {
        label: "Cancelled",
        description: "This order has been cancelled",
        color: "bg-red-100 text-red-800 border-red-300",
        icon: "❌",
        step: 0
      }
    };
    return statuses[status] || statuses.pending;
  }

  function formatEta(minutes) {
    if (minutes < 60) {
      return `${minutes} min${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} hr${hours !== 1 ? 's' : ''}`;
    }
    return `${hours} hr${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tracking info...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff] flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-6xl mb-4">📦</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h1>
          <p className="text-gray-600 mb-6">
            We couldn't find an order with this tracking ID. Please check the QR code or tracking number.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(order.status);
  
  // Live tracking only available for Priority service
  const isPriorityService = order.service_type === 'priority';
  const showLiveTracking = isPriorityService && ['assigned', 'active', 'picked_up', 'in_transit'].includes(order.status) && order.driver_id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#ffffff] to-[#e8f4ff]">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-3">
            <Image
              src="/bus-icon.png"
              alt="Mac Track"
              width={40}
              height={40}
              className="object-contain"
            />
            <div className="text-center">
              <h1 className="text-xl sm:text-2xl font-black text-red-600">Mac Track</h1>
              <p className="text-xs text-gray-500">Live Order Tracking</p>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Order ID */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500 mb-1">Tracking Order</p>
          <p className="text-2xl font-black font-mono text-gray-900">
            {order.order_number ? `#${order.order_number}` : `#${order.id.slice(0, 8).toUpperCase()}`}
          </p>
        </div>

        {/* ETA Banner - Shows for all orders */}
        {order.status !== 'delivered' && order.status !== 'cancelled' && (
          <div className={`rounded-2xl p-5 mb-6 text-white shadow-lg ${(liveEta && isPriorityService) ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90 mb-1">{(liveEta && isPriorityService) ? 'Live Estimated Arrival' : 'Estimated Arrival'}</p>
                {(liveEta && isPriorityService) ? (
                  <>
                    <p className="text-4xl font-black">{formatEta(liveEta)}</p>
                    {order.driver_distance_km && (
                      <p className="text-sm opacity-80 mt-1">
                        📍 Driver is {order.driver_distance_km.toFixed(1)} km away
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-4xl font-black">
                    {order.custom_eta 
                      ? new Date(order.custom_eta).toLocaleString("en-AU", { hour: "numeric", minute: "2-digit" })
                      : (() => {
                          const etaHours = { standard: 5, same_day: 12, next_day: 24, local_overnight: 24, emergency: 2, vip: 3, priority: 1.5, scheduled: 0, after_hours: 24 };
                          const hours = etaHours[order.service_type] || 5;
                          if (hours === 0 && order.scheduled_date) {
                            return new Date(order.scheduled_date + (order.scheduled_time ? ' ' + order.scheduled_time : '')).toLocaleString("en-AU", { hour: "numeric", minute: "2-digit" });
                          }
                          const eta = new Date(order.created_at);
                          eta.setHours(eta.getHours() + hours);
                          return eta.toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
                        })()
                    }
                  </p>
                )}
              </div>
              <div className="text-6xl">{(liveEta && isPriorityService) ? <span className="animate-bounce inline-block">🚚</span> : '📦'}</div>
            </div>
            {(liveEta && isPriorityService) && lastEtaUpdate && (
              <div className="flex items-center gap-2 mt-3">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <p className="text-xs opacity-70">Live tracking · Updated {lastEtaUpdate.toLocaleTimeString()}</p>
              </div>
            )}
            {!(liveEta && isPriorityService) && (
              <p className="text-xs opacity-70 mt-3">
                {isPriorityService 
                  ? "ETA updates automatically when driver is on the way!" 
                  : "Estimated delivery based on service type"}
              </p>
            )}
          </div>
        )}

        {/* Live Map - ONLY FOR PRIORITY SERVICE */}
        {showLiveTracking && driverLocation && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
            <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-bold">Live Driver Location</span>
              </div>
              <span className="text-xs opacity-70">
                Updated: {new Date(driverLocation.updated_at).toLocaleTimeString()}
              </span>
            </div>
            <div 
              ref={mapRef} 
              className="w-full h-64 sm:h-80 bg-gray-100"
            >
              {/* Map loads here */}
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-sm">Loading map...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Non-Priority Service Banner - Show when driver is active but not priority */}
        {!isPriorityService && ['assigned', 'active', 'picked_up', 'in_transit'].includes(order.status) && order.driver_id && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-6 text-center">
            <p className="text-sm font-bold text-blue-800">📍 Live GPS tracking is available with Priority service</p>
            <p className="text-xs text-blue-600 mt-1">Your order is being processed and will be delivered within the estimated timeframe</p>
          </div>
        )}

        {/* Status Card */}
        <div className={`rounded-2xl p-6 mb-6 border-2 ${statusInfo.color}`}>
          <div className="flex items-center gap-4">
            <span className="text-5xl">{statusInfo.icon}</span>
            <div>
              <h2 className="text-2xl font-black">{statusInfo.label}</h2>
              <p className="text-sm opacity-80">{statusInfo.description}</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        {order.status !== 'cancelled' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Delivery Progress</h3>
            <div className="flex items-center justify-between">
              {/* Step 1: Pending */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${statusInfo.step >= 1 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {statusInfo.step >= 1 ? '✓' : '1'}
                </div>
                <p className="text-xs mt-2 text-center font-semibold">Order<br/>Received</p>
              </div>
              
              {/* Line */}
              <div className={`flex-1 h-1 mx-2 ${statusInfo.step >= 2 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
              
              {/* Step 2: In Transit */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${statusInfo.step >= 2 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {statusInfo.step >= 2 ? '✓' : '2'}
                </div>
                <p className="text-xs mt-2 text-center font-semibold">In<br/>Transit</p>
              </div>
              
              {/* Line */}
              <div className={`flex-1 h-1 mx-2 ${statusInfo.step >= 3 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
              
              {/* Step 3: Delivered */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${statusInfo.step >= 3 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {statusInfo.step >= 3 ? '✓' : '3'}
                </div>
                <p className="text-xs mt-2 text-center font-semibold">Delivered</p>
              </div>
            </div>
          </div>
        )}

        {/* Route Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Route Details</h3>
          
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs font-bold text-blue-700 mb-1">📍 PICKUP</p>
              <p className="text-sm font-semibold text-gray-900">{order.pickup_address}</p>
            </div>
            
            <div className="flex justify-center">
              <div className="text-2xl">↓</div>
            </div>
            
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-xs font-bold text-green-700 mb-1">🎯 DELIVERY</p>
              <p className="text-sm font-semibold text-gray-900">{order.dropoff_address}</p>
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Order Details</h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Service Type</p>
              <p className="font-semibold capitalize">
                {order.service_type?.replace(/_/g, ' ')}
                {isPriorityService && <span className="ml-1 text-orange-600">🔥</span>}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Parcel Size</p>
              <p className="font-semibold capitalize">{order.parcel_size?.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-gray-500">Weight</p>
              <p className="font-semibold">{order.parcel_weight} kg</p>
            </div>
            <div>
              <p className="text-gray-500">Order Date</p>
              <p className="font-semibold">{new Date(order.created_at).toLocaleDateString()}</p>
            </div>
            {order.scheduled_date && (
              <div className="col-span-2">
                <p className="text-gray-500">Scheduled Delivery</p>
                <p className="font-semibold">{order.scheduled_date} {order.scheduled_time || ''}</p>
              </div>
            )}
            {order.delivered_at && (
              <div className="col-span-2">
                <p className="text-gray-500">Delivered At</p>
                <p className="font-semibold text-green-600">{new Date(order.delivered_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Need Help?</h3>
          <p className="text-sm text-gray-600 mb-4">Contact Mac With A Van for any questions</p>
          <div className="space-y-2">
            <a href="tel:1300170718" className="block px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition">
              📞 Call 1300 170 718
            </a>
            <a href="mailto:macwithavan@mail.com" className="block px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition">
              ✉️ macwithavan@mail.com
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Mac With A Van | ABN: 18 616 164 875</p>
          <p className="mt-1">Courier Service</p>
        </div>
      </main>
    </div>
  );
}