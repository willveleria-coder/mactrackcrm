// Mac With A Van - Pricing Calculator
// Based on MWAV_Pricing_Dec_25 document

/**
 * Calculate delivery price based on Mac's pricing structure
 * 
 * @param {Object} params
 * @param {string} params.serviceType - Service type
 * @param {number} params.weight - Weight in kg
 * @param {number} params.distance - Distance in km
 * @param {number} params.fuelLevyPercent - Fuel levy percentage (default 10%)
 * @returns {Object} - Pricing breakdown
 */
export function calculateDeliveryPrice(params) {
  const {
    serviceType,
    weight = 0,
    distance = 0,
    fuelLevyPercent = 10
  } = params;

  let basePrice = 0;
  let perKmRate = 0;
  let perKmStartsAt = 10; // Most services charge per km after 10km
  let requiresQuote = false;

  // Determine base price and per-km rate based on service type and weight
  switch (serviceType) {
    case 'standard':
    case 'same_day_standard':
      // Same-day Delivery (3-5 hours)
      if (weight <= 10) {
        basePrice = 39.50;
        perKmRate = distance > 10 ? 1.70 : 0;
      } else {
        basePrice = 45.00;
        perKmRate = distance > 10 ? 1.70 : 0;
      }
      break;

    case 'same_day':
    case 'same_day_flexible':
      // Same-day Flexible (may be >5 hours)
      if (weight <= 10) {
        basePrice = 35.00;
        perKmRate = distance > 10 ? 1.25 : 0;
      } else {
        basePrice = 40.00;
        perKmRate = distance > 10 ? 1.70 : 0;
      }
      break;

    case 'local_overnight':
    case 'next_day':
      // Local overnight - pick up today deliver tomorrow
      basePrice = 32.00;
      perKmRate = distance > 10 ? 1.70 : 0;
      break;

    case 'express':
    case 'emergency':
      // Express (2 hours from pickup)
      if (weight <= 10) {
        basePrice = 60.00;
        perKmRate = 0; // Within 10km included
      } else {
        basePrice = 67.00;
        // Only charges between 10-30km
        if (distance > 10 && distance <= 30) {
          perKmRate = 1.70;
        }
      }
      break;

    case 'priority':
    case 'vip':
      // Priority (within 1hr)
      if (weight <= 10) {
        basePrice = 120.00;
        perKmRate = 0; // Within 10km included
      } else {
        basePrice = 150.00;
        perKmRate = distance > 10 ? 1.70 : 0;
      }
      break;

    case 'after_hours':
    case 'weekend':
      // After hours/weekends - requires quote
      requiresQuote = true;
      basePrice = 0;
      perKmRate = 0;
      break;

    case 'scheduled':
      // Scheduled delivery - requires quote
      requiresQuote = true;
      basePrice = 0;
      perKmRate = 0;
      break;

    default:
      // Default to standard pricing
      if (weight <= 10) {
        basePrice = 39.50;
        perKmRate = distance > 10 ? 1.70 : 0;
      } else {
        basePrice = 45.00;
        perKmRate = distance > 10 ? 1.70 : 0;
      }
  }

  // If requires quote, return early
  if (requiresQuote) {
    return {
      requiresQuote: true,
      message: "Contact Mac With A Van for a quote",
      basePrice: 0,
      distanceCharge: 0,
      subtotal: 0,
      fuelLevy: 0,
      fuelLevyPercent,
      gst: 0,
      total: 0
    };
  }

  // Calculate distance charge (only applies beyond 10km for most services)
  const chargeableDistance = Math.max(0, distance - perKmStartsAt);
  const distanceCharge = perKmRate > 0 ? chargeableDistance * perKmRate : 0;

  // Calculate subtotal (before fuel levy and GST)
  const subtotal = basePrice + distanceCharge;

  // Calculate fuel levy (percentage of subtotal)
  const fuelLevy = subtotal * (fuelLevyPercent / 100);

  // Calculate GST (10% of subtotal + fuel levy)
  const beforeGst = subtotal + fuelLevy;
  const gst = beforeGst * 0.10;

  // Calculate final total
  const total = beforeGst + gst;

  return {
    requiresQuote: false,
    basePrice: parseFloat(basePrice.toFixed(2)),
    perKmRate: perKmRate,
    distanceCharge: parseFloat(distanceCharge.toFixed(2)),
    chargeableDistance: parseFloat(chargeableDistance.toFixed(2)),
    subtotal: parseFloat(subtotal.toFixed(2)),
    fuelLevy: parseFloat(fuelLevy.toFixed(2)),
    fuelLevyPercent,
    gst: parseFloat(gst.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    breakdown: {
      base: `$${basePrice.toFixed(2)}`,
      distance: distanceCharge > 0 ? `$${distanceCharge.toFixed(2)} (${chargeableDistance.toFixed(1)}km × $${perKmRate.toFixed(2)})` : '$0.00',
      subtotal: `$${subtotal.toFixed(2)}`,
      fuelLevy: `$${fuelLevy.toFixed(2)} (${fuelLevyPercent}%)`,
      gst: `$${gst.toFixed(2)} (10%)`,
      total: `$${total.toFixed(2)}`
    }
  };
}

/**
 * Get distance between two addresses using Google Maps API
 * 
 * @param {string} origin - Pickup address
 * @param {string} destination - Delivery address
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise<Object>} - { distance (km), duration (mins), error }
 */
export async function calculateDistance(origin, destination, apiKey) {
  if (!origin || !destination) {
    return { distance: 0, duration: 0, error: "Missing addresses" };
  }

  if (!apiKey) {
    return { distance: 0, duration: 0, error: "Missing API key" };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&units=metric&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      return { distance: 0, duration: 0, error: data.status };
    }

    const element = data.rows[0]?.elements[0];
    
    if (element?.status !== "OK") {
      return { distance: 0, duration: 0, error: element?.status || "Route not found" };
    }

    // Convert meters to kilometers
    const distanceKm = element.distance.value / 1000;
    // Convert seconds to minutes
    const durationMins = element.duration.value / 60;

    return {
      distance: parseFloat(distanceKm.toFixed(2)),
      duration: Math.round(durationMins),
      distanceText: element.distance.text,
      durationText: element.duration.text,
      error: null
    };
  } catch (error) {
    console.error("Distance calculation error:", error);
    return { distance: 0, duration: 0, error: error.message };
  }
}

/**
 * Service types with display names
 */
export const SERVICE_TYPES = [
  { value: 'standard', label: 'Standard (3-5 Hours)', description: 'Same-day delivery within 3-5 hours' },
  { value: 'same_day', label: 'Same Day (12 Hours)', description: 'Flexible same-day delivery' },
  { value: 'next_day', label: 'Next Day (Delivery Tomorrow)', description: 'Pick up today, deliver by 10am tomorrow' },
  { value: 'local_overnight', label: 'Local/Overnight (Next Day)', description: 'Pick up after 12pm, deliver by 11am next day' },
  { value: 'emergency', label: 'Emergency (1-2 Hours)', description: 'Urgent 2-hour delivery' },
  { value: 'vip', label: 'VIP (2-3 Hours)', description: 'Priority VIP service' },
  { value: 'priority', label: 'Priority (1-1.5 Hours)', description: 'Fastest delivery option' },
  { value: 'scheduled', label: 'Scheduled (Schedule A Delivery Day)', description: 'Contact for quote' },
  { value: 'after_hours', label: 'After Hours/Weekend', description: 'Contact for quote' },
];

/**
 * Parcel sizes
 */
export const PARCEL_SIZES = [
  { value: 'small_box', label: 'Envelope/Small Box (up to 25×20×10cm)', description: 'Documents, phone, small items' },
  { value: 'medium_box', label: 'Medium Box (up to 50×40×30cm)', description: 'Medium sized items' },
  { value: 'large_box', label: 'Large Box (up to 80×60×50cm)', description: 'Large bulky items' },
  { value: 'pelican_case', label: 'Pelican Case', description: 'Protective hard case' },
  { value: 'road_case_single', label: 'Road Case Single', description: 'Single road case for equipment' },
  { value: 'road_case_double', label: 'Road Case Double', description: 'Double road case' },
  { value: 'blue_tub', label: 'Blue Tub', description: 'Standard blue storage tub' },
  { value: 'tube', label: 'Tube', description: 'Cylindrical tube for documents/posters' },
  { value: 'aga_kit', label: 'AGA Kit', description: 'AGA equipment kit' },
  { value: 'custom', label: 'Custom/Other', description: 'Specify dimensions' },
];

export default {
  calculateDeliveryPrice,
  calculateDistance,
  SERVICE_TYPES,
  PARCEL_SIZES
};