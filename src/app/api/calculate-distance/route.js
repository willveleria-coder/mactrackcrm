import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { origin, destination } = await request.json();

    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Missing origin or destination' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || "AIzaSyDfUuYmjPmDBrP3ABmdAgHva8gaWmSvRmg";

    if (!apiKey) {
      console.error('Google Maps API key not configured');
      return NextResponse.json(
        { error: 'Distance calculation not available', distance: 0, duration: 0 },
        { status: 200 }
      );
    }

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&units=metric&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Maps API error:', data.status);
      return NextResponse.json(
        { error: data.status, distance: 0, duration: 0 },
        { status: 200 }
      );
    }

    const element = data.rows?.[0]?.elements?.[0];

    if (!element || element.status !== 'OK') {
      console.error('Route not found:', element?.status);
      return NextResponse.json(
        { error: element?.status || 'Route not found', distance: 0, duration: 0 },
        { status: 200 }
      );
    }

    // Convert meters to kilometers
    const distanceKm = element.distance.value / 1000;
    // Convert seconds to minutes
    const durationMins = Math.round(element.duration.value / 60);

    return NextResponse.json({
      distance: parseFloat(distanceKm.toFixed(2)),
      duration: durationMins,
      distanceText: element.distance.text,
      durationText: element.duration.text,
      error: null
    });

  } catch (error) {
    console.error('Distance calculation error:', error);
    return NextResponse.json(
      { error: error.message, distance: 0, duration: 0 },
      { status: 200 }
    );
  }
}