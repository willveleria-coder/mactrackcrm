"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { APIProvider, Map, Marker, InfoWindow } from "@vis.gl/react-google-maps";

export default function AdminDriverMap() {
  const [drivers, setDrivers] = useState([]);
  const [driverLocations, setDriverLocations] = useState({});
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: -37.8136, lng: 144.9631 }); // Melbourne
  const supabase = createClient();

  useEffect(() => {
    loadDriversAndLocations();

    // Subscribe to real-time location updates
    const channel = supabase
      .channel('admin-driver-locations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_locations'
        },
        (payload) => {
          if (payload.new) {
            setDriverLocations(prev => ({
              ...prev,
              [payload.new.driver_id]: {
                lat: parseFloat(payload.new.latitude),
                lng: parseFloat(payload.new.longitude),
                heading: payload.new.heading,
                speed: payload.new.speed,
                updated_at: payload.new.updated_at
              }
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadDriversAndLocations() {
    try {
      // Load all active drivers
      const { data: driversData } = await supabase
        .from("drivers")
        .select("*")
        .eq("is_active", true);

      setDrivers(driversData || []);

      // Load all driver locations
      const { data: locationsData } = await supabase
        .from("driver_locations")
        .select("*");

      const locationsMap = {};
      (locationsData || []).forEach(loc => {
        locationsMap[loc.driver_id] = {
          lat: parseFloat(loc.latitude),
          lng: parseFloat(loc.longitude),
          heading: loc.heading,
          speed: loc.speed,
          updated_at: loc.updated_at
        };
      });

      setDriverLocations(locationsMap);

      // Center map on first driver with location
      if (Object.keys(locationsMap).length > 0) {
        const firstLocation = Object.values(locationsMap)[0];
        setMapCenter(firstLocation);
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
  const driversWithLocation = drivers.filter(d => driverLocations[d.id]);

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
              const location = driverLocations[driver.id];
              if (!location) return null;

              return (
                <div key={driver.id}>
                  <Marker
                    position={location}
                    onClick={() => setSelectedDriver(driver)}
                    icon={{
                      path: window.google?.maps?.SymbolPath?.FORWARD_CLOSED_ARROW || 0,
                      fillColor: driver.is_on_duty ? '#0072ab' : '#9ca3af',
                      fillOpacity: 1,
                      strokeColor: '#ffffff',
                      strokeWeight: 2,
                      scale: 7,
                      rotation: location.heading || 0
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
                          Speed: {(location.speed * 3.6).toFixed(0)} km/h
                        </p>
                        <p className={`text-xs font-semibold ${driver.is_on_duty ? 'text-green-600' : 'text-gray-500'}`}>
                          {driver.is_on_duty ? '● On Duty' : '○ Off Duty'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Updated: {new Date(location.updated_at).toLocaleTimeString()}
                        </p>
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
              <div className="w-3 h-3 bg-[#0072ab] rounded-full"></div>
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
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-gray-700">
                Tracking: {driversWithLocation.length}
              </span>
            </div>
          </div>
          <button
            onClick={loadDriversAndLocations}
            className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    </div>
  );
}