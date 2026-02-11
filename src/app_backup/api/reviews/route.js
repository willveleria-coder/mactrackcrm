import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for API routes
);

// GET - Fetch all reviews or specific review
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const rating = searchParams.get('rating');

    let query = supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by orderId if provided
    if (orderId) {
      query = query.eq('order_id', orderId);
    }

    // Filter by rating if provided
    if (rating) {
      query = query.eq('rating', parseInt(rating));
    }

    const { data: reviews, error } = await query;

    if (error) throw error;

    // Calculate statistics
    const stats = {
      total: reviews.length,
      avgRating: reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : 0,
      ratingDistribution: {
        5: reviews.filter(r => r.rating === 5).length,
        4: reviews.filter(r => r.rating === 4).length,
        3: reviews.filter(r => r.rating === 3).length,
        2: reviews.filter(r => r.rating === 2).length,
        1: reviews.filter(r => r.rating === 1).length,
      },
    };

    return NextResponse.json({ reviews, stats });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new review
export async function POST(request) {
  try {
    const body = await request.json();
    const { orderId, rating, comment, customerName, customerEmail } = body;

    // Validation
    if (!orderId || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, rating' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Check if review already exists for this order
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('order_id', orderId)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: 'Review already exists for this order' },
        { status: 409 }
      );
    }

    // Insert new review
    const { data: newReview, error } = await supabase
      .from('reviews')
      .insert({
        order_id: orderId,
        rating: parseInt(rating),
        comment: comment || '',
        customer_name: customerName || 'Anonymous',
        customer_email: customerEmail || '',
        status: rating >= 4 ? 'approved' : 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Review created:', {
      id: newReview.id,
      orderId,
      rating,
      timestamp: newReview.created_at,
    });

    return NextResponse.json({
      success: true,
      review: newReview,
      message: 'Review submitted successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update a review
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, rating, comment, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }

    const updates = {};

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: 'Rating must be between 1 and 5' },
          { status: 400 }
        );
      }
      updates.rating = parseInt(rating);
      updates.status = rating >= 4 ? 'approved' : 'pending';
    }

    if (comment !== undefined) {
      updates.comment = comment;
    }

    if (status !== undefined) {
      updates.status = status;
    }

    const { data: updatedReview, error } = await supabase
      .from('reviews')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Review not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      review: updatedReview,
      message: 'Review updated successfully',
    });
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json(
      { error: 'Failed to update review', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a review
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Review not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json(
      { error: 'Failed to delete review', details: error.message },
      { status: 500 }
    );
  }
}