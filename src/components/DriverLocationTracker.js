"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "../lib/supabase/client";

export default function DriverLocationTracker({ driverId }) {
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeOrders, setActiveOrders] = useState(0);
  const [etaUpdates, setEtaUpdates] = useState([]);
  const watchIdRef = useRef(null);
  const lastPositionRef = useRef(null);
  const supabase = createClient();

  // Minimum distance (meters) before sending update - saves battery & API calls
  const MIN_DISTANCE_THRESHOLD = 50; // 50 meters

  useEffect(() => {
    if (!driverId) return;

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    async function startTracking() {
      try {
        setIsTracking(true);
        setError(null);

        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        
        if (permissionStatus.state === 'denied') {
          setError("Location permission denied. Please enable location in your browser settings.");
          setIsTracking(false);
          return;
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
          async (position) => {
            try {
              const { latitude, longitude, heading, speed, accuracy } = position.coords;

              // Check if we've moved enough to warrant an update
              if (lastPositionRef.current) {
                const distance = calculateDistance(
                  lastPositionRef.current.latitude,
                  lastPositionRef.current.longitude,
                  latitude,
                  longitude
                );
                
                // Skip update if we haven't moved much (saves battery & API calls)
                if (distance < MIN_DISTANCE_THRESHOLD) {
                  return;
                }
              }

              // Update last position
              lastPositionRef.current = { latitude, longitude };

              // Send to our new API (which also calculates ETAs)
              const response = await fetch('/api/driver/update-location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  driver_id: driverId,
                  latitude,
                  longitude,
                  heading: heading || null,
                  speed: speed || null,
                  accuracy: accuracy || null,
                }),
              });

              const data = await response.json();

              if (data.success) {
                setLastUpdate(new Date());
                setError(null);
                setActiveOrders(data.eta_updates?.length || 0);
                setEtaUpdates(data.eta_updates || []);
              } else {
                console.error("Location update failed:", data.error);
              }

              // Also update drivers table for backward compatibility
              await supabase
                .from("drivers")
                .update({
                  current_lat: latitude,
                  current_lng: longitude,
                  last_location_update: new Date().toISOString(),
                })
                .eq("id", driverId);

            } catch (err) {
              console.error("Error in position callback:", err);
            }
          },
          (err) => {
            let errorMessage = "Unable to track location";
            
            switch(err.code) {
              case err.PERMISSION_DENIED:
                errorMessage = "Location permission denied. Please enable location access.";
                break;
              case err.POSITION_UNAVAILABLE:
                errorMessage = "Location information unavailable. Check your device settings.";
                break;
              case err.TIMEOUT:
                errorMessage = "Location request timed out. Retrying...";
                break;
              default:
                errorMessage = "Unknown location error occurred.";
            }
            
            console.warn("Geolocation error:", errorMessage, err);
            setError(errorMessage);
            
            if (err.code !== err.TIMEOUT) {
              setIsTracking(false);
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 15000, // 15 seconds
            maximumAge: 10000, // 10 seconds - allow slightly cached positions
          }
        );
      } catch (err) {
        console.error("Error starting tracking:", err);
        setError("Failed to start location tracking");
        setIsTracking(false);
      }
    }

    startTracking();

    // Also do periodic updates every 30 seconds even if not moving
    // This ensures ETAs stay fresh
    const intervalId = setInterval(async () => {
      if (lastPositionRef.current && isTracking) {
        try {
          await fetch('/api/driver/update-location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              driver_id: driverId,
              latitude: lastPositionRef.current.latitude,
              longitude: lastPositionRef.current.longitude,
            }),
          });
        } catch (e) {
          console.log("Periodic update failed:", e);
        }
      }
    }, 30000); // Every 30 seconds

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      clearInterval(intervalId);
    };
  }, [driverId]);

  // Calculate distance between two points in meters (Haversine formula)
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Show error state
  if (error && !isTracking) {
    return (
      <div className="fixed bottom-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg max-w-sm z-50">
        <p className="text-sm text-yellow-800">
          ⚠️ {error}
        </p>
        <p className="text-xs text-yellow-600 mt-2">
          Location tracking is paused. Enable location to continue.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 text-xs bg-yellow-200 hover:bg-yellow-300 px-3 py-1 rounded-lg font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  // Show tracking indicator with ETA info
  if (isTracking) {
    return (
      <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 shadow-lg z-50 max-w-xs">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <p className="text-xs text-green-700 font-bold">
            📍 Live Tracking Active
          </p>
        </div>
        
        {activeOrders > 0 && (
          <p className="text-xs text-green-600">
            🚚 Updating ETAs for {activeOrders} order{activeOrders > 1 ? 's' : ''}
          </p>
        )}
        
        {lastUpdate && (
          <p className="text-xs text-green-500 mt-1">
            Last: {lastUpdate.toLocaleTimeString()}
          </p>
        )}

        {/* Show current ETAs */}
        {etaUpdates.length > 0 && (
          <div className="mt-2 pt-2 border-t border-green-200">
            {etaUpdates.slice(0, 2).map((eta, i) => (
              <p key={i} className="text-xs text-green-700">
                #{eta.order_id?.slice(0, 6)}: {eta.eta_minutes} mins ({eta.distance_km?.toFixed(1)}km)
              </p>
            ))}
            {etaUpdates.length > 2 && (
              <p className="text-xs text-green-500">+{etaUpdates.length - 2} more</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}