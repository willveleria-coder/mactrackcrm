"use client";
import { useEffect, useRef, useState } from "react";

export default function AddressAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Enter address",
  className = "",
  required = false,
  name = ""
}) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if Google Maps script is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      initAutocomplete();
      return;
    }

    // Load Google Maps script if not loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', initAutocomplete);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = initAutocomplete;
    document.head.appendChild(script);

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  function initAutocomplete() {
    if (!inputRef.current || !window.google?.maps?.places) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "au" },
      fields: ["formatted_address", "geometry", "address_components"],
      types: ["address"]
    });

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current.getPlace();
      if (place && place.formatted_address) {
        onChange({
          target: {
            name: name,
            value: place.formatted_address
          }
        });
      }
    });

    setIsLoaded(true);
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={onChange}
      name={name}
      placeholder={placeholder}
      required={required}
      className={className}
      autoComplete="off"
    />
  );
}
