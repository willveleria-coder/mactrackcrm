"use client";
import { useEffect, useRef, useState } from "react";

// Google Maps Address Autocomplete Component
export default function AddressAutocomplete({ 
  value, 
  onChange, 
  onSelect,
  placeholder = "Enter address...",
  className = "",
  disabled = false,
  restrictToAustralia = true 
}) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load Google Maps script if not already loaded
    if (!window.google) {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        setError("Google Maps API key not configured");
        return;
      }

      // Check if script is already being loaded
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        // Wait for it to load
        const checkGoogle = setInterval(() => {
          if (window.google && window.google.maps && window.google.maps.places) {
            setIsLoaded(true);
            clearInterval(checkGoogle);
          }
        }, 100);
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        setIsLoaded(true);
      };
      
      script.onerror = () => {
        setError("Failed to load Google Maps");
      };
      
      document.head.appendChild(script);
    } else {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    try {
      const options = {
        fields: ["formatted_address", "geometry", "address_components", "place_id"],
        types: ["address"],
      };

      // Restrict to Australia if enabled
      if (restrictToAustralia) {
        options.componentRestrictions = { country: "au" };
      }

      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        options
      );

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current.getPlace();
        
        if (place && place.formatted_address) {
          // Extract address components
          const addressData = {
            fullAddress: place.formatted_address,
            placeId: place.place_id,
            lat: place.geometry?.location?.lat(),
            lng: place.geometry?.location?.lng(),
            components: {}
          };

          // Parse address components
          if (place.address_components) {
            place.address_components.forEach(component => {
              const type = component.types[0];
              addressData.components[type] = {
                long: component.long_name,
                short: component.short_name
              };
            });
          }

          // Call onChange with the formatted address string
          if (onChange) {
            onChange(place.formatted_address);
          }

          // Call onSelect with full address data
          if (onSelect) {
            onSelect(addressData);
          }
        }
      });
    } catch (err) {
      console.error("Error initializing autocomplete:", err);
      setError("Failed to initialize address autocomplete");
    }

    // Cleanup
    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, onChange, onSelect, restrictToAustralia]);

  // Handle manual input changes
  const handleInputChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${className} ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      />
      
      {/* Loading indicator */}
      {!isLoaded && !error && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Google attribution */}
      {isLoaded && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 opacity-50">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
            <circle cx="12" cy="9" r="2.5" fill="white"/>
          </svg>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}

// Hook for using Google Maps autocomplete programmatically
export function useGoogleMapsAutocomplete() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true);
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);
  }, []);

  return { isLoaded };
}