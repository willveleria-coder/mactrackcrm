// src/lib/pricing.js
export function calculatePrice(serviceType, parcel_size, parcel_weight, distance = 0) {
  let base = 5;

  // 🧾 Adjust base by service type
  switch (serviceType) {
    case "VIP":
      base += 15;
      break;
    case "Overnight":
      base += 10;
      break;
    case "Emergency":
      base += 20;
      break;
    case "Priority":
      base += 12;
      break;
    default:
      base += 0;
  }

  // ⚖️ Adjust by parcel weight and size
  const weightFactor = parcel_weight ? parseFloat(parcel_weight) * 0.5 : 0;
  const sizeFactor = parcel_size === "Large" ? 10 : parcel_size === "Medium" ? 5 : 0;

  // 📍 Optional distance factor
  const distanceFactor = distance ? distance * 0.8 : 0;

  return Number((base + weightFactor + sizeFactor + distanceFactor).toFixed(2));
}