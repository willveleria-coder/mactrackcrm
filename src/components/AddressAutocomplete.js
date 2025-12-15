import React, { useEffect, useRef, useState } from 'react';

const AddressAutocomplete = ({ 
  onAddressSelect,
  placeholder = "Start typing address...",
  label = "Address",
}) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // PUT IT HERE
  useEffect(() => {
    console.log('API Key:', process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY);
  }, []);

  // rest of component...

  const initAutocomplete = () => {
    if (!inputRef.current || !window.google) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ['address'],
        componentRestrictions: { country: 'au' }, // Change to your country code
      }
    );

    autocompleteRef.current.addListener('place_changed', handlePlaceSelect);
  };

  const handlePlaceSelect = () => {
    const place = autocompleteRef.current.getPlace();
    
    if (!place.geometry) {
      console.log("No details available for input: '" + place.name + "'");
      return;
    }

    const addressComponents = place.address_components;
    const addressData = {
      fullAddress: place.formatted_address,
      street: '',
      city: '',
      state: '',
      postcode: '',
      country: '',
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };

    // Parse address components
    addressComponents.forEach(component => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        addressData.street = component.long_name + ' ';
      }
      if (types.includes('route')) {
        addressData.street += component.long_name;
      }
      if (types.includes('locality')) {
        addressData.city = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        addressData.state = component.short_name;
      }
      if (types.includes('postal_code')) {
        addressData.postcode = component.long_name;
      }
      if (types.includes('country')) {
        addressData.country = component.long_name;
      }
    });

    setAddress(place.formatted_address);
    
    // Send data back to parent component
    if (onAddressSelect) {
      onAddressSelect(addressData);
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
      />
    </div>
  );
};

export default AddressAutocomplete;

// ============================================
// EXAMPLE USAGE IN YOUR ORDER FORM:
// ============================================

/*
import AddressAutocomplete from '@/components/AddressAutocomplete';

function OrderForm() {
  const [pickupAddress, setPickupAddress] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState(null);

  const handlePickupSelect = (addressData) => {
    console.log('Pickup Address:', addressData);
    setPickupAddress(addressData);
  };

  const handleDeliverySelect = (addressData) => {
    console.log('Delivery Address:', addressData);
    setDeliveryAddress(addressData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Save to Supabase
    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          pickup_address: pickupAddress.fullAddress,
          pickup_lat: pickupAddress.lat,
          pickup_lng: pickupAddress.lng,
          delivery_address: deliveryAddress.fullAddress,
          delivery_lat: deliveryAddress.lat,
          delivery_lng: deliveryAddress.lng,
          // ... other fields
        }
      ]);
  };

  return (
    <div>
      <AddressAutocomplete
        label="Pickup Address"
        placeholder="Enter pickup address"
        onAddressSelect={handlePickupSelect}
      />

      <AddressAutocomplete
        label="Delivery Address"
        placeholder="Enter delivery address"
        onAddressSelect={handleDeliverySelect}
      />

      <button onClick={handleSubmit}>Create Order</button>
    </div>
  );
}
*/