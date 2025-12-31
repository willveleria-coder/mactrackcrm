"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { APIProvider, Map, Marker, InfoWindow } from "@vis.gl/react-google-maps";

export default function AdminDriverMap() {
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: -37.8136, lng: 144.9631 }); // Melbourne
  const supabase = createClient();

  useEffect(() => {
    loadDrivers();

    // Subscribe to real-time driver updates
    const channel = supabase
      .channel('admin-driver-tracking')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drivers'
        },
        (payload) => {
          if (payload.new) {
            setDrivers(prev => prev.map(driver => 
              driver.id === payload.new.id ? payload.new : driver
            ));
          }
        }
      )
      .subscribe();

    // Refresh every 30 seconds as backup
    const interval = setInterval(loadDrivers, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  async function loadDrivers() {
    try {
      const { data: driversData, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("is_active", true);

      if (error) {
        console.error("Error loading drivers:", error);
        return;
      }

      setDrivers(driversData || []);

      // Center map on first driver with location
      const driverWithLocation = (driversData || []).find(d => d.current_lat && d.current_lng);
      if (driverWithLocation) {
        setMapCenter({
          lat: parseFloat(driverWithLocation.current_lat),
          lng: parseFloat(driverWithLocation.current_lng)
        });
      }
    } catch (error) {
      console.error("Error loading drivers:", error);
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

  const onDutyDrivers = drivers.filter(d => d.is_on_duty);
  const driversWithLocation = drivers.filter(d => d.current_lat && d.current_lng);

  return (
    <div className="w-full rounded-lg overflow-hidden border border-gray-300">
      <div className="h-[600px]">
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={mapCenter}
            defaultZoom={12}
            mapId="admin-driver-map"
            gestureHandling="greedy"
            disableDefaultUI={false}
            zoomControl={true}
            mapTypeControl={false}
            streetViewControl={false}
            fullscreenControl={true}
          >
            {drivers.map(driver => {
              if (!driver.current_lat || !driver.current_lng) return null;

              const location = {
                lat: parseFloat(driver.current_lat),
                lng: parseFloat(driver.current_lng)
              };

              return (
                <div key={driver.id}>
                  <Marker
                    position={location}
                    onClick={() => setSelectedDriver(driver)}
                    icon={{
                      path: window.google?.maps?.SymbolPath?.FORWARD_CLOSED_ARROW || 0,
                      fillColor: driver.is_on_duty ? '#22c55e' : '#9ca3af',
                      fillOpacity: 1,
                      strokeColor: '#ffffff',
                      strokeWeight: 2,
                      scale: 7,
                      rotation: 0
                    }}
                  />
                  {selectedDriver?.id === driver.id && (
                    <InfoWindow
                      position={location}
                      onCloseClick={() => setSelectedDriver(null)}
                    >
                      <div className="p-2 min-w-[200px]">
                        <p className="font-bold text-sm mb-1">{driver.name}</p>
                        <p className="text-xs text-gray-600 mb-1">
                          {driver.vehicle_type} - {driver.vehicle_plate}
                        </p>
                        <p className="text-xs text-gray-600 mb-1">
                          📞 {driver.phone}
                        </p>
                        <p className={`text-xs font-semibold ${driver.is_on_duty ? 'text-green-600' : 'text-gray-500'}`}>
                          {driver.is_on_duty ? '🟢 On Duty' : '⚪ Off Duty'}
                        </p>
                        {driver.last_location_update && (
                          <p className="text-xs text-gray-400 mt-1">
                            Updated: {new Date(driver.last_location_update).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </InfoWindow>
                  )}
                </div>
              );
            })}
          </Map>
        </APIProvider>
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-gray-300 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-semibold text-gray-700">
                On Duty: {onDutyDrivers.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="text-sm font-semibold text-gray-700">
                Off Duty: {drivers.length - onDutyDrivers.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-gray-700">
                Live Tracking: {driversWithLocation.length}
              </span>
            </div>
          </div>
          <button
            onClick={loadDrivers}
            className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    </div>
  );
}