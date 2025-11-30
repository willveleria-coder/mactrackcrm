"use client";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";

export default function DriverLocationTracker({ driverId }) {
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    if (!driverId) return;

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    let watchId = null;

    async function startTracking() {
      try {
        setIsTracking(true);
        setError(null);

        // Request permission first
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        
        if (permissionStatus.state === 'denied') {
          setError("Location permission denied. Please enable location in your browser settings.");
          setIsTracking(false);
          return;
        }

        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;

              // Update location in database
              const { error: updateError } = await supabase
                .from("drivers")
                .update({
                  current_lat: latitude,
                  current_lng: longitude,
                  last_location_update: new Date().toISOString(),
                })
                .eq("id", driverId);

              if (updateError) {
                console.error("Error updating location:", updateError);
              } else {
                setLastUpdate(new Date());
                setError(null);
              }
            } catch (err) {
              console.error("Error in position callback:", err);
            }
          },
          (err) => {
            // Handle specific geolocation errors
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
            
            // Don't stop tracking on timeout - it might work next time
            if (err.code !== err.TIMEOUT) {
              setIsTracking(false);
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000, // 10 seconds
            maximumAge: 30000, // 30 seconds
          }
        );
      } catch (err) {
        console.error("Error starting tracking:", err);
        setError("Failed to start location tracking");
        setIsTracking(false);
      }
    }

    startTracking();

    // Cleanup
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [driverId]);

  // Don't show anything to driver - silent tracking
  // Only show if there's a persistent error
  if (error && !isTracking) {
    return (
      <div className="fixed bottom-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg max-w-sm">
        <p className="text-sm text-yellow-800">
          ⚠️ {error}
        </p>
        <p className="text-xs text-yellow-600 mt-2">
          Location tracking is paused. Enable location to continue.
        </p>
      </div>
    );
  }

  // Show subtle tracking indicator when active
  if (isTracking) {
    return (
      <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-lg px-4 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <p className="text-xs text-green-700 font-medium">
            Location tracking active
          </p>
        </div>
        {lastUpdate && (
          <p className="text-xs text-green-600 mt-1">
            Last update: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </div>
    );
  }

  return null;
}