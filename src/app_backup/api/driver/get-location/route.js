import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const order_id = searchParams.get("order_id");
    const driver_id = searchParams.get("driver_id");

    if (!order_id && !driver_id) {
      return NextResponse.json({ error: "order_id or driver_id required" }, { status: 400 });
    }

    let driverId = driver_id;

    if (order_id && !driver_id) {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("driver_id, live_eta, live_eta_minutes, driver_distance_km, eta_updated_at")
        .eq("id", order_id)
        .single();

      if (orderError || !order?.driver_id) {
        return NextResponse.json({ error: "Order not found or no driver assigned" }, { status: 404 });
      }

      driverId = order.driver_id;

      const { data: location, error: locationError } = await supabase
        .from("driver_locations")
        .select("*")
        .eq("driver_id", driverId)
        .single();

      if (locationError) {
        return NextResponse.json({
          driver_id: driverId,
          location: null,
          eta: order.live_eta,
          eta_minutes: order.live_eta_minutes,
          distance_km: order.driver_distance_km,
          eta_updated_at: order.eta_updated_at,
          message: "Driver location not available"
        });
      }

      return NextResponse.json({
        driver_id: driverId,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          heading: location.heading,
          speed: location.speed,
          updated_at: location.updated_at,
        },
        eta: order.live_eta,
        eta_minutes: order.live_eta_minutes,
        distance_km: order.driver_distance_km,
        eta_updated_at: order.eta_updated_at,
      });
    }

    const { data: location, error: locationError } = await supabase
      .from("driver_locations")
      .select("*")
      .eq("driver_id", driverId)
      .single();

    if (locationError) {
      return NextResponse.json({ error: "Driver location not found" }, { status: 404 });
    }

    return NextResponse.json({
      driver_id: driverId,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        heading: location.heading,
        speed: location.speed,
        updated_at: location.updated_at,
      },
    });
  } catch (error) {
    console.error("Get location error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}