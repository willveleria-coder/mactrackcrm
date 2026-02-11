import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateDistance, geocodeAddress } from '@/lib/geoUtils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // We'll add this to .env.local
);

export async function POST(request) {
  try {
    const { orderId } = await request.json();

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if already assigned
    if (order.driver_id) {
      return NextResponse.json({ error: 'Order already assigned' }, { status: 400 });
    }

    // Geocode pickup address to get coordinates
    const pickupCoords = await geocodeAddress(order.pickup_address);
    
    if (!pickupCoords) {
      return NextResponse.json({ error: 'Could not geocode pickup address' }, { status: 400 });
    }

    // Get all available drivers (on duty, active, with recent location)
    const { data: drivers, error: driversError } = await supabase
      .from('drivers')
      .select(`
        id,
        name,
        is_on_duty,
        is_active
      `)
      .eq('is_on_duty', true)
      .eq('is_active', true);

    if (driversError || !drivers || drivers.length === 0) {
      return NextResponse.json({ error: 'No available drivers' }, { status: 404 });
    }

    // Get driver locations
    const { data: locations, error: locationsError } = await supabase
      .from('driver_locations')
      .select('*')
      .in('driver_id', drivers.map(d => d.id));

    if (locationsError || !locations || locations.length === 0) {
      return NextResponse.json({ error: 'No drivers with location data' }, { status: 404 });
    }

    // Calculate distances and find nearest driver
    let nearestDriver = null;
    let shortestDistance = Infinity;

    for (const location of locations) {
      // Only consider locations updated in last 5 minutes
      const locationAge = Date.now() - new Date(location.updated_at).getTime();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (locationAge > fiveMinutes) continue;

      const distance = calculateDistance(
        pickupCoords.lat,
        pickupCoords.lng,
        parseFloat(location.latitude),
        parseFloat(location.longitude)
      );

      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestDriver = {
          id: location.driver_id,
          distance: distance,
          name: drivers.find(d => d.id === location.driver_id)?.name
        };
      }
    }

    if (!nearestDriver) {
      return NextResponse.json({ error: 'No suitable driver found' }, { status: 404 });
    }

    // Assign order to nearest driver
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        driver_id: nearestDriver.id,
        driver_status: 'assigned',
        status: 'pending'
      })
      .eq('id', orderId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to assign driver' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      driver: nearestDriver.name,
      driverId: nearestDriver.id,
      distance: nearestDriver.distance.toFixed(2)
    });

  } catch (error) {
    console.error('Auto-assign error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}