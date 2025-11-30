"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { APIProvider, Map, Marker, InfoWindow } from "@vis.gl/react-google-maps";

export default function LiveOrderMap({ orderId, pickupAddress, dropoffAddress }) {
  const [driverLocation, setDriverLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: -37.8136, lng: 144.9631 }); // Melbourne default
  const [selectedMarker, setSelectedMarker] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    loadDriverLocation();

    // Subscribe to real-time location updates
    const channel = supabase
      .channel('driver-location-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_locations'
        },
        (payload) => {
          if (payload.new) {
            setDriverLocation({
              lat: parseFloat(payload.new.latitude),
              lng: parseFloat(payload.new.longitude),
              heading: payload.new.heading,
              speed: payload.new.speed,
              updated_at: payload.new.updated_at
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  async function loadDriverLocation() {
    try {
      // Get order details to find driver
      const { data: order } = await supabase
        .from("orders")
        .select("driver_id")
        .eq("id", orderId)
        .single();

      if (!order?.driver_id) return;

      // Get driver's current location
      const { data: location } = await supabase
        .from("driver_locations")
        .select("*")
        .eq("driver_id", order.driver_id)
        .single();

      if (location) {
        const driverPos = {
          lat: parseFloat(location.latitude),
          lng: parseFloat(location.longitude),
          heading: location.heading,
          speed: location.speed,
          updated_at: location.updated_at
        };
        setDriverLocation(driverPos);
        setMapCenter(driverPos);
      }
    } catch (error) {
      console.error("Error loading driver location:", error);
    }
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-red-600">Google Maps API key not configured</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg overflow-hidden border border-gray-300">
      <div className="h-96">
        <APIProvider apiKey={apiKey}>
          <Map
  defaultCenter={mapCenter}
  defaultZoom={13}
  mapId="order-tracking-map"
  gestureHandling="greedy"
  disableDefaultUI={false}
  zoomControl={true}
  mapTypeControl={false}
  streetViewControl={false}
  fullscreenControl={true}
          >
            {/* Driver Location Marker */}
            {driverLocation && (
              <>
                <Marker
                  position={driverLocation}
                  onClick={() => setSelectedMarker('driver')}
                  icon={{
                    path: window.google?.maps?.SymbolPath?.FORWARD_CLOSED_ARROW || 0,
                    fillColor: '#0072ab',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                    scale: 6,
                    rotation: driverLocation.heading || 0
                  }}
                />
                {selectedMarker === 'driver' && (
                  <InfoWindow
                    position={driverLocation}
                    onCloseClick={() => setSelectedMarker(null)}
                  >
                    <div className="p-2">
                      <p className="font-bold text-sm">Driver Location</p>
                      <p className="text-xs text-gray-600">
                        Speed: {(driverLocation.speed * 3.6).toFixed(0)} km/h
                      </p>
                      <p className="text-xs text-gray-400">
                        Updated: {new Date(driverLocation.updated_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </InfoWindow>
                )}
              </>
            )}
          </Map>
        </APIProvider>
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-gray-300 p-3">
        {driverLocation ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-gray-900">Driver location updating live</span>
            <span className="text-xs text-gray-500 ml-auto">
              Last updated: {new Date(driverLocation.updated_at).toLocaleTimeString()}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-sm text-gray-600">Waiting for driver location...</span>
          </div>
        )}
      </div>
    </div>
  );
}