import { createClient as supabaseCreateClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = supabaseCreateClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { driver_id, latitude, longitude, heading, speed, accuracy } = await request.json();

    if (!driver_id || !latitude || !longitude) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Upsert driver location
    const { data: location, error: locationError } = await supabase
      .from("driver_locations")
      .upsert({
        driver_id,
        latitude,
        longitude,
        heading: heading || null,
        speed: speed || null,
        accuracy: accuracy || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'driver_id'
      })
      .select()
      .single();

    if (locationError) throw locationError;

    // Get active orders for this driver
    const { data: activeOrders, error: ordersError } = await supabase
      .from("orders")
      .select("id, dropoff_address, status")
      .eq("driver_id", driver_id)
      .in("status", ["assigned", "active", "picked_up", "in_transit"]);

    if (ordersError) throw ordersError;

    // Calculate ETA for each active order
    const etaUpdates = [];
    for (const order of activeOrders || []) {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${latitude},${longitude}&destinations=${encodeURIComponent(order.dropoff_address)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();

        if (data.rows?.[0]?.elements?.[0]?.status === "OK") {
          const element = data.rows[0].elements[0];
          const distanceKm = element.distance.value / 1000;
          const durationMinutes = Math.ceil(element.duration.value / 60);
          const liveEta = new Date(Date.now() + element.duration.value * 1000);

          await supabase
            .from("orders")
            .update({
              live_eta: liveEta.toISOString(),
              live_eta_minutes: durationMinutes,
              driver_distance_km: distanceKm,
              eta_updated_at: new Date().toISOString(),
            })
            .eq("id", order.id);

          etaUpdates.push({
            order_id: order.id,
            distance_km: distanceKm,
            eta_minutes: durationMinutes,
            live_eta: liveEta,
          });
        }
      } catch (e) {
        console.error("ETA calculation error for order", order.id, e);
      }
    }

    return NextResponse.json({
      success: true,
      location,
      eta_updates: etaUpdates,
    });
  } catch (error) {
    console.error("Location update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}