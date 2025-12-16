import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET - Fetch customers or specific customer
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const email = searchParams.get('email');

    // Get specific customer by ID
    if (customerId) {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Customer not found' },
            { status: 404 }
          );
        }
        throw error;
      }

      return NextResponse.json({ customer });
    }

    // Get customer by email
    if (email) {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Customer not found' },
            { status: 404 }
          );
        }
        throw error;
      }

      return NextResponse.json({ customer });
    }

    // Get all customers with stats
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .order('loyalty_points', { ascending: false });

    if (error) throw error;

    const stats = {
      totalCustomers: customers.length,
      totalPoints: customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0),
      avgPoints: customers.length > 0
        ? Math.round(customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0) / customers.length)
        : 0,
      tierDistribution: {
        Bronze: customers.filter(c => c.loyalty_tier === 'Bronze').length,
        Silver: customers.filter(c => c.loyalty_tier === 'Silver').length,
        Gold: customers.filter(c => c.loyalty_tier === 'Gold').length,
        Platinum: customers.filter(c => c.loyalty_tier === 'Platinum').length,
      },
    };

    return NextResponse.json({ customers, stats });
  } catch (error) {
    console.error('Error fetching loyalty data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loyalty data', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new customer or add points for order
export async function POST(request) {
  try {
    const body = await request.json();
    const { customerId, customerName, customerEmail, customerPhone, orderId, orderTotal } = body;

    // If creating new customer
    if (!customerId && customerEmail) {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('email', customerEmail)
        .single();

      if (existingCustomer) {
        return NextResponse.json(
          { error: 'Customer already exists', customer: existingCustomer },
          { status: 409 }
        );
      }

      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert({
          name: customerName || 'Guest',
          email: customerEmail,
          phone: customerPhone || '',
          loyalty_points: 0,
          loyalty_tier: 'Bronze',
          redemptions: 0,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ New loyalty customer created:', newCustomer.id);

      return NextResponse.json({
        success: true,
        customer: newCustomer,
        message: 'Customer enrolled in loyalty program',
      }, { status: 201 });
    }

    // If adding points for an order
    if (customerId && orderTotal) {
      // Calculate points (1 point per dollar)
      const pointsEarned = Math.floor(orderTotal);

      const { data: customer, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Customer not found' },
            { status: 404 }
          );
        }
        throw fetchError;
      }

      const newPoints = (customer.loyalty_points || 0) + pointsEarned;

      const { data: updatedCustomer, error: updateError } = await supabase
        .from('customers')
        .update({ loyalty_points: newPoints })
        .eq('id', customerId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Log transaction (if loyalty_transactions table exists)
      await supabase
        .from('loyalty_transactions')
        .insert({
          customer_id: customerId,
          order_id: orderId,
          points_change: pointsEarned,
          transaction_type: 'earned',
          description: `Points earned from order ${orderId}`,
        })
        .catch(err => console.log('Transaction log failed (optional):', err.message));

      console.log(`✅ Added ${pointsEarned} points to customer ${customerId}`);

      return NextResponse.json({
        success: true,
        customer: updatedCustomer,
        pointsEarned,
        message: `Earned ${pointsEarned} points`,
      });
    }

    return NextResponse.json(
      { error: 'Invalid request parameters' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing loyalty request:', error);
    return NextResponse.json(
      { error: 'Failed to process loyalty request', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update customer points or redeem rewards
export async function PUT(request) {
  try {
    const body = await request.json();
    const { customerId, points, action } = body; // action: 'add', 'subtract', 'redeem'

    if (!customerId || points === undefined || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId, points, action' },
        { status: 400 }
      );
    }

    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }
      throw fetchError;
    }

    const pointsValue = parseInt(points);
    let newPoints = customer.loyalty_points || 0;
    let newRedemptions = customer.redemptions || 0;
    let transactionType = '';

    switch (action) {
      case 'add':
        newPoints += pointsValue;
        transactionType = 'manual_add';
        break;
      case 'subtract':
        newPoints = Math.max(0, newPoints - pointsValue);
        transactionType = 'manual_subtract';
        break;
      case 'redeem':
        if (newPoints < pointsValue) {
          return NextResponse.json(
            { error: 'Insufficient points' },
            { status: 400 }
          );
        }
        newPoints -= pointsValue;
        newRedemptions += 1;
        transactionType = 'redeemed';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: add, subtract, or redeem' },
          { status: 400 }
        );
    }

    const { data: updatedCustomer, error: updateError } = await supabase
      .from('customers')
      .update({
        loyalty_points: newPoints,
        redemptions: newRedemptions,
      })
      .eq('id', customerId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log transaction (if loyalty_transactions table exists)
    await supabase
      .from('loyalty_transactions')
      .insert({
        customer_id: customerId,
        points_change: action === 'add' ? pointsValue : -pointsValue,
        transaction_type: transactionType,
        description: `Manual ${action}: ${pointsValue} points`,
      })
      .catch(err => console.log('Transaction log failed (optional):', err.message));

    console.log(`✅ ${action} ${pointsValue} points for customer ${customerId}`);

    return NextResponse.json({
      success: true,
      customer: updatedCustomer,
      message: `Points ${action}ed successfully`,
    });
  } catch (error) {
    console.error('Error updating loyalty points:', error);
    return NextResponse.json(
      { error: 'Failed to update loyalty points', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove customer from loyalty program
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Customer removed from loyalty program',
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: 'Failed to delete customer', details: error.message },
      { status: 500 }
    );
  }
}